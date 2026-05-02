import type { Request, Response, NextFunction } from 'express'
import { verifyJwt } from '../services/auth'
import { findSessionByJti, updateSessionLastActive } from '../db/queries/sessions'

export async function cliAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const token = authHeader.slice(7)
  try {
    const { sub, jti } = verifyJwt(token)
    const session = await findSessionByJti(jti)
    if (!session || session.device_hint !== 'cli') {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    await updateSessionLastActive(jti)
    req.user = { id: sub, jti }
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}
