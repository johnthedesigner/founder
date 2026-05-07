import { Router } from 'express'
import type { Request, Response } from 'express'
import { requireAuth, optionalAuth } from '../middleware/auth'
import {
  createProject,
  listProjects,
  getProject,
  updateProjectById,
  deleteProjectById,
  claimProject,
} from '../services/project'
import type { EditAuth } from '../services/project'
import { invalidateSpecCache } from './generate'

export const projectsRouter = Router()

function extractEditAuth(req: Request): EditAuth | null {
  if (req.user) return { type: 'user', userId: req.user.id }
  const token = req.headers['x-owner-token']
  if (typeof token === 'string' && token.length > 0) return { type: 'token', ownerToken: token }
  return null
}

// POST /projects — optionalAuth so authenticated callers get user-owned projects;
// unauthenticated callers create anonymous projects with an ownerToken
projectsRouter.post('/', optionalAuth, async (req: Request, res: Response) => {
  const { name, config } = req.body as { name?: string; config?: unknown }
  if (config === undefined) {
    res.status(400).json({ error: 'config is required' })
    return
  }

  const userId = req.user?.id ?? null
  try {
    const { project, ownerToken } = await createProject(userId, { name, config })
    const body: Record<string, unknown> = { project }
    if (ownerToken !== null) body.ownerToken = ownerToken
    res.status(201).json(body)
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException & { issues?: unknown[] }
    if (e.code === 'INVALID_CONFIG') {
      res.status(400).json({ error: 'Invalid config', issues: e.issues })
    } else {
      res.status(500).json({ error: 'Failed to create project' })
    }
  }
})

// GET /projects — auth required; returns only the authenticated user's projects
projectsRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const projects = await listProjects(req.user!.id)
  res.json({ projects })
})

// GET /projects/:id — public; canEdit is true when requester owns or holds the token
projectsRouter.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  const auth = {
    userId: req.user?.id,
    ownerToken: req.headers['x-owner-token'] as string | undefined,
  }
  const result = await getProject(req.params.id!, auth)
  if (result === null) {
    res.status(404).json({ error: 'Project not found' })
  } else {
    res.json({ project: result })
  }
})

// POST /projects/:id/claim — auth required; transfers anonymous project to authenticated account
projectsRouter.post('/:id/claim', requireAuth, async (req: Request, res: Response) => {
  const ownerToken = req.headers['x-owner-token']
  if (typeof ownerToken !== 'string' || ownerToken.length === 0) {
    res.status(400).json({ error: 'X-Owner-Token header required' })
    return
  }
  const result = await claimProject(req.params.id!, ownerToken, req.user!.id)
  if (result === 'already-claimed') {
    res.status(409).json({ error: 'Project already claimed' })
  } else if (result === 'forbidden') {
    res.status(403).json({ error: 'Forbidden' })
  } else {
    res.json({ project: result })
  }
})

// PATCH /projects/:id — cookie auth OR X-Owner-Token header
projectsRouter.patch('/:id', optionalAuth, async (req: Request, res: Response) => {
  const auth = extractEditAuth(req)
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const { name, config } = req.body as { name?: string; config?: unknown }
  const result = await updateProjectById(req.params.id!, auth, { name, config })
  if (result === null) {
    res.status(404).json({ error: 'Project not found' })
  } else if (result === 'forbidden') {
    res.status(403).json({ error: 'Forbidden' })
  } else if (result === 'invalid') {
    res.status(400).json({ error: 'Invalid config after merge' })
  } else {
    invalidateSpecCache(req.params.id!)
    res.json({ project: result })
  }
})

// DELETE /projects/:id — cookie auth OR X-Owner-Token header
projectsRouter.delete('/:id', optionalAuth, async (req: Request, res: Response) => {
  const auth = extractEditAuth(req)
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const result = await deleteProjectById(req.params.id!, auth)
  if (result === null) {
    res.status(404).json({ error: 'Project not found' })
  } else if (result === 'forbidden') {
    res.status(403).json({ error: 'Forbidden' })
  } else {
    res.status(204).send()
  }
})
