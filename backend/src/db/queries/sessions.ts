import { query } from '../connection'
import type { UserSessionRow, EmailVerificationTokenRow, PasswordResetTokenRow } from '../types'

// ---- User sessions ----

export async function insertSession(data: {
  userId: string
  jti: string
  deviceHint?: string
  ipAddress?: string
}): Promise<void> {
  await query(
    'INSERT INTO user_sessions (user_id, jti, device_hint, ip_address) VALUES ($1, $2, $3, $4)',
    [data.userId, data.jti, data.deviceHint ?? null, data.ipAddress ?? null],
  )
}

export async function findSessionByJti(jti: string): Promise<UserSessionRow | null> {
  const rows = await query<UserSessionRow>('SELECT * FROM user_sessions WHERE jti = $1', [jti])
  return rows[0] ?? null
}

export async function deleteSessionByJti(jti: string): Promise<void> {
  await query('DELETE FROM user_sessions WHERE jti = $1', [jti])
}

export async function updateSessionLastActive(jti: string): Promise<void> {
  await query('UPDATE user_sessions SET last_active_at = now() WHERE jti = $1', [jti])
}

export async function findCliSessionByUserId(userId: string): Promise<UserSessionRow | null> {
  const rows = await query<UserSessionRow>(
    "SELECT * FROM user_sessions WHERE user_id = $1 AND device_hint = 'cli' ORDER BY created_at DESC LIMIT 1",
    [userId],
  )
  return rows[0] ?? null
}

export async function deleteCliSessionByUserId(userId: string): Promise<void> {
  await query("DELETE FROM user_sessions WHERE user_id = $1 AND device_hint = 'cli'", [userId])
}

// ---- Email verification tokens ----

export async function insertEmailVerificationToken(data: {
  userId: string
  token: string
  expiresAt: Date
}): Promise<void> {
  await query(
    'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [data.userId, data.token, data.expiresAt],
  )
}

export async function findEmailVerificationToken(
  token: string,
): Promise<EmailVerificationTokenRow | null> {
  const rows = await query<EmailVerificationTokenRow>(
    'SELECT * FROM email_verification_tokens WHERE token = $1',
    [token],
  )
  return rows[0] ?? null
}

export async function markEmailVerificationTokenUsed(id: string): Promise<void> {
  await query('UPDATE email_verification_tokens SET used_at = now() WHERE id = $1', [id])
}

// ---- Password reset tokens ----

export async function insertPasswordResetToken(data: {
  userId: string
  token: string
  expiresAt: Date
}): Promise<void> {
  await query(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [data.userId, data.token, data.expiresAt],
  )
}

export async function findPasswordResetToken(
  token: string,
): Promise<PasswordResetTokenRow | null> {
  const rows = await query<PasswordResetTokenRow>(
    'SELECT * FROM password_reset_tokens WHERE token = $1',
    [token],
  )
  return rows[0] ?? null
}

export async function markPasswordResetTokenUsed(id: string): Promise<void> {
  await query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [id])
}
