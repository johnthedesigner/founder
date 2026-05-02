import { Router } from 'express'
import type { Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import {
  createProject,
  listProjects,
  getProject,
  updateProjectById,
  deleteProjectById,
} from '../services/project'

export const projectsRouter = Router()

projectsRouter.use(requireAuth)

// POST /projects
projectsRouter.post('/', async (req: Request, res: Response) => {
  const { name, config } = req.body as { name?: string; config?: unknown }
  if (config === undefined) {
    res.status(400).json({ error: 'config is required' })
    return
  }

  try {
    const project = await createProject(req.user!.id, { name, config })
    res.status(201).json({ project })
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException & { issues?: unknown[] }
    if (e.code === 'INVALID_CONFIG') {
      res.status(400).json({ error: 'Invalid config', issues: e.issues })
    } else {
      res.status(500).json({ error: 'Failed to create project' })
    }
  }
})

// GET /projects
projectsRouter.get('/', async (req: Request, res: Response) => {
  const projects = await listProjects(req.user!.id)
  res.json({ projects })
})

// GET /projects/:id
projectsRouter.get('/:id', async (req: Request, res: Response) => {
  const result = await getProject(req.params.id!, req.user!.id)
  if (result === null) {
    res.status(404).json({ error: 'Project not found' })
  } else if (result === 'forbidden') {
    res.status(403).json({ error: 'Forbidden' })
  } else {
    res.json({ project: result })
  }
})

// PATCH /projects/:id
projectsRouter.patch('/:id', async (req: Request, res: Response) => {
  const { name, config } = req.body as { name?: string; config?: unknown }
  const result = await updateProjectById(req.params.id!, req.user!.id, { name, config })
  if (result === null) {
    res.status(404).json({ error: 'Project not found' })
  } else if (result === 'forbidden') {
    res.status(403).json({ error: 'Forbidden' })
  } else if (result === 'invalid') {
    res.status(400).json({ error: 'Invalid config after merge' })
  } else {
    res.json({ project: result })
  }
})

// DELETE /projects/:id
projectsRouter.delete('/:id', async (req: Request, res: Response) => {
  const result = await deleteProjectById(req.params.id!, req.user!.id)
  if (result === null) {
    res.status(404).json({ error: 'Project not found' })
  } else if (result === 'forbidden') {
    res.status(403).json({ error: 'Forbidden' })
  } else {
    res.status(204).send()
  }
})
