import { randomBytes, randomUUID } from 'crypto'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import {
  findUserByEmail,
  findUserById,
  insertUser,
  setEmailVerified,
  updatePasswordHash,
} from '../db/queries/users'
import {
  insertSession,
  findSessionByJti,
  deleteSessionByJti,
  findCliSessionByUserId,
  deleteCliSessionByUserId,
  insertEmailVerificationToken,
  findEmailVerificationToken,
  markEmailVerificationTokenUsed,
  insertPasswordResetToken,
  findPasswordResetToken,
  markPasswordResetTokenUsed,
} from '../db/queries/sessions'
import { sendVerificationEmail, sendPasswordResetEmail } from './email'

const BCRYPT_ROUNDS = 12
const VERIFICATION_TOKEN_TTL_HOURS = 24
const RESET_TOKEN_TTL_HOURS = 1

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not set')
  return secret
}

function jwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN ?? '7d'
}

export function signJwt(payload: { sub: string; jti: string }, expiresIn?: string): string {
  return jwt.sign(payload, jwtSecret(), { expiresIn: expiresIn ?? jwtExpiresIn() } as jwt.SignOptions)
}

export function verifyJwt(token: string): { sub: string; jti: string } {
  const decoded = jwt.verify(token, jwtSecret()) as { sub: string; jti: string }
  return decoded
}

// ---- register ----

export async function register(data: {
  email: string
  password: string
  displayName: string
}): Promise<{ userId: string; verificationToken: string }> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(data.email)) {
    const err = new Error('Invalid email format')
    ;(err as NodeJS.ErrnoException).code = 'INVALID_EMAIL'
    throw err
  }
  if (data.password.length < 12) {
    const err = new Error('Password must be at least 12 characters')
    ;(err as NodeJS.ErrnoException).code = 'PASSWORD_TOO_SHORT'
    throw err
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS)

  let user
  try {
    user = await insertUser({ email: data.email, passwordHash, displayName: data.displayName })
  } catch (err: unknown) {
    const pg = err as { code?: string }
    if (pg.code === '23505') {
      const conflict = new Error('Email already registered')
      ;(conflict as NodeJS.ErrnoException).code = 'EMAIL_CONFLICT'
      throw conflict
    }
    throw err
  }

  const verificationToken = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000)
  await insertEmailVerificationToken({ userId: user.id, token: verificationToken, expiresAt })

  await sendVerificationEmail(data.email, verificationToken)

  return { userId: user.id, verificationToken }
}

// ---- verifyEmail ----

export async function verifyEmail(token: string): Promise<{ jti: string; cookie: string }> {
  const row = await findEmailVerificationToken(token)
  if (!row) {
    const err = new Error('Invalid verification token')
    ;(err as NodeJS.ErrnoException).code = 'TOKEN_INVALID'
    throw err
  }
  if (row.used_at) {
    const err = new Error('Verification token already used')
    ;(err as NodeJS.ErrnoException).code = 'TOKEN_USED'
    throw err
  }
  if (new Date(row.expires_at) < new Date()) {
    const err = new Error('Verification token expired')
    ;(err as NodeJS.ErrnoException).code = 'TOKEN_EXPIRED'
    throw err
  }

  await markEmailVerificationTokenUsed(row.id)
  await setEmailVerified(row.user_id)

  const { jti, cookie } = await issueSession(row.user_id)
  return { jti, cookie }
}

// ---- login ----

export async function login(
  email: string,
  password: string,
): Promise<{ jti: string; cookie: string; user: { id: string; email: string; displayName: string } }> {
  const user = await findUserByEmail(email)

  // Use a dummy hash to prevent timing attacks on non-existent users
  const dummyHash = '$2b$12$dummyhashfortimingnulluser000000000000000000000000000'
  const hashToCompare = user?.password_hash ?? dummyHash

  const passwordMatch = await bcrypt.compare(password, hashToCompare)

  if (!user || !passwordMatch) {
    const err = new Error('Invalid credentials')
    ;(err as NodeJS.ErrnoException).code = 'INVALID_CREDENTIALS'
    throw err
  }
  if (!user.email_verified) {
    const err = new Error('Email not verified')
    ;(err as NodeJS.ErrnoException).code = 'EMAIL_NOT_VERIFIED'
    throw err
  }

  const { jti, cookie } = await issueSession(user.id)
  return { jti, cookie, user: { id: user.id, email: user.email, displayName: user.display_name } }
}

// ---- issueSession ----

export async function issueSession(
  userId: string,
  deviceHint?: string,
  ipAddress?: string,
  expiresIn?: string,
): Promise<{ jti: string; cookie: string }> {
  const jti = randomUUID()
  await insertSession({ userId, jti, deviceHint, ipAddress })
  const token = signJwt({ sub: userId, jti }, expiresIn)
  return { jti, cookie: token }
}

// ---- issueCliToken ----

export async function issueCliToken(userId: string): Promise<string> {
  const { cookie } = await issueSession(userId, 'cli', undefined, '30d')
  return cookie
}

// ---- getCliToken ----
// Returns the token for the user's existing CLI session, or issues a new one.
// Since the raw JWT isn't stored, we re-sign with the stored JTI on each call.
// cliAuth validates by JTI lookup, so the re-signed token is fully valid.
export async function getCliToken(userId: string): Promise<string> {
  const session = await findCliSessionByUserId(userId)
  if (session) {
    return signJwt({ sub: userId, jti: session.jti }, '30d')
  }
  return issueCliToken(userId)
}

// ---- revokeCliToken ----

export async function revokeCliToken(userId: string): Promise<void> {
  await deleteCliSessionByUserId(userId)
}

// ---- logout ----

export async function logout(jti: string): Promise<void> {
  await deleteSessionByJti(jti)
}

// ---- getMe ----

export async function getMe(
  jti: string,
): Promise<{ id: string; email: string; displayName: string } | null> {
  const session = await findSessionByJti(jti)
  if (!session) return null
  const user = await findUserById(session.user_id)
  if (!user) return null
  return { id: user.id, email: user.email, displayName: user.display_name }
}

// ---- forgotPassword ----

export async function forgotPassword(email: string): Promise<void> {
  const user = await findUserByEmail(email)
  if (!user) return

  const resetToken = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000)
  await insertPasswordResetToken({ userId: user.id, token: resetToken, expiresAt })
  await sendPasswordResetEmail(email, resetToken)
}

// ---- resetPassword ----

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  if (newPassword.length < 12) {
    const err = new Error('Password must be at least 12 characters')
    ;(err as NodeJS.ErrnoException).code = 'PASSWORD_TOO_SHORT'
    throw err
  }

  const row = await findPasswordResetToken(token)
  if (!row) {
    const err = new Error('Invalid reset token')
    ;(err as NodeJS.ErrnoException).code = 'TOKEN_INVALID'
    throw err
  }
  if (row.used_at) {
    const err = new Error('Reset token already used')
    ;(err as NodeJS.ErrnoException).code = 'TOKEN_USED'
    throw err
  }
  if (new Date(row.expires_at) < new Date()) {
    const err = new Error('Reset token expired')
    ;(err as NodeJS.ErrnoException).code = 'TOKEN_EXPIRED'
    throw err
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  await updatePasswordHash(row.user_id, passwordHash)
  await markPasswordResetTokenUsed(row.id)
}
