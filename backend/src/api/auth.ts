import { Router } from 'express'
import type { Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import {
  register,
  verifyEmail,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  issueCliToken,
} from '../services/auth'

export const authRouter = Router()

const COOKIE_NAME = 'session'
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
}

function setSessionCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS)
}

function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS)
}

// POST /auth/register
authRouter.post('/register', async (req: Request, res: Response) => {
  const { email, password, displayName } = req.body as {
    email?: string
    password?: string
    displayName?: string
  }

  if (!email || !password || !displayName) {
    res.status(400).json({ error: 'email, password, and displayName are required' })
    return
  }

  try {
    const { verificationToken } = await register({ email, password, displayName })
    if (process.env.NODE_ENV === 'test') {
      res.setHeader('X-Verification-Token', verificationToken)
    }
    res.status(201).json({ message: 'Registration successful. Please check your email to verify your account.' })
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException
    if (e.code === 'INVALID_EMAIL') {
      res.status(400).json({ error: 'Invalid email format' })
    } else if (e.code === 'PASSWORD_TOO_SHORT') {
      res.status(400).json({ error: 'Password must be at least 12 characters' })
    } else if (e.code === 'EMAIL_CONFLICT') {
      res.status(409).json({ error: 'Email already registered' })
    } else {
      res.status(500).json({ error: 'Registration failed' })
    }
  }
})

// POST /auth/verify-email
authRouter.post('/verify-email', async (req: Request, res: Response) => {
  const { token } = req.body as { token?: string }
  if (!token) {
    res.status(400).json({ error: 'token is required' })
    return
  }

  try {
    const { cookie } = await verifyEmail(token)
    setSessionCookie(res, cookie)
    res.json({ message: 'Email verified successfully' })
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException
    if (e.code === 'TOKEN_EXPIRED') {
      res.status(400).json({ error: 'Verification token has expired' })
    } else if (e.code === 'TOKEN_USED') {
      res.status(400).json({ error: 'Verification token already used' })
    } else {
      res.status(400).json({ error: 'Invalid verification token' })
    }
  }
})

// POST /auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string }
  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' })
    return
  }

  try {
    const { cookie, user } = await login(email, password)
    setSessionCookie(res, cookie)
    res.json({ user })
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException
    if (e.code === 'EMAIL_NOT_VERIFIED') {
      res.status(403).json({ error: 'Please verify your email before logging in' })
    } else if (e.code === 'INVALID_CREDENTIALS') {
      res.status(401).json({ error: 'Invalid credentials' })
    } else {
      res.status(500).json({ error: 'Login failed' })
    }
  }
})

// POST /auth/logout
authRouter.post('/logout', requireAuth, async (req: Request, res: Response) => {
  await logout(req.user!.jti)
  clearSessionCookie(res)
  res.json({ message: 'Logged out' })
})

// GET /auth/me
authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  const user = await getMe(req.user!.jti)
  if (!user) {
    res.status(401).json({ error: 'Session invalid' })
    return
  }
  res.json({ user })
})

// POST /auth/forgot-password
authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string }
  if (email) {
    await forgotPassword(email).catch(() => {})
  }
  res.json({ message: 'If that email exists, a reset link has been sent' })
})

// POST /auth/cli-token
authRouter.post('/cli-token', requireAuth, async (req: Request, res: Response) => {
  const token = await issueCliToken(req.user!.id)
  res.json({ token })
})

// POST /auth/reset-password
authRouter.post('/reset-password', async (req: Request, res: Response) => {
  const { token, newPassword } = req.body as { token?: string; newPassword?: string }
  if (!token || !newPassword) {
    res.status(400).json({ error: 'token and newPassword are required' })
    return
  }

  try {
    await resetPassword(token, newPassword)
    res.json({ message: 'Password reset successfully' })
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException
    if (e.code === 'PASSWORD_TOO_SHORT') {
      res.status(400).json({ error: 'Password must be at least 12 characters' })
    } else if (e.code === 'TOKEN_EXPIRED') {
      res.status(400).json({ error: 'Reset token has expired' })
    } else if (e.code === 'TOKEN_USED') {
      res.status(400).json({ error: 'Reset token already used' })
    } else {
      res.status(400).json({ error: 'Invalid reset token' })
    }
  }
})
