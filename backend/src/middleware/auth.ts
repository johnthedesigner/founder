import type { Request, Response, NextFunction } from 'express'
import { verifyJwt } from '../services/auth'
import { findSessionByJti, updateSessionLastActive } from '../db/queries/sessions'

// Populates req.user from the session cookie when present and valid, but never
// returns 401 — call next() regardless so routes can handle anonymous callers.
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.session as string | undefined
  if (token) {
    try {
      const payload = verifyJwt(token)
      const session = await findSessionByJti(payload.jti)
      if (session) {
        await updateSessionLastActive(payload.jti)
        req.user = { id: payload.sub, jti: payload.jti }
      }
    } catch {
      // Invalid token — proceed as anonymous
    }
  }
  next()
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.session as string | undefined
  if (!token) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  let payload: { sub: string; jti: string }
  try {
    payload = verifyJwt(token)
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' })
    return
  }

  const session = await findSessionByJti(payload.jti)
  if (!session) {
    res.status(401).json({ error: 'Session revoked' })
    return
  }

  await updateSessionLastActive(payload.jti)
  req.user = { id: payload.sub, jti: payload.jti }
  next()
}
