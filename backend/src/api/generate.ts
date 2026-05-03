import { Router } from 'express'
import type { Request, Response } from 'express'
import type { ProjectConfig } from '@ds-gen/types'
import { optionalAuth } from '../middleware/auth'
import { cliAuth } from '../middleware/cliAuth'
import { getProject, findProjectById } from '../services/project'
import { generate } from '../pipeline'
import { assembleZip } from '../pipeline/export/zip'
import { updateProject } from '../db/queries/projects'

export const projectExportRouter = Router()
export const agentRouter = Router()

projectExportRouter.use(optionalAuth)

function resolveEditAuth(req: Request): { userId?: string; ownerToken?: string } | null {
  const userId = req.user?.id
  const tokenHeader = req.headers['x-owner-token']
  const ownerToken = typeof tokenHeader === 'string' ? tokenHeader : undefined
  if (!userId && !ownerToken) return null
  return { userId, ownerToken }
}

// POST /projects/:id/export
projectExportRouter.post('/:id/export', async (req: Request, res: Response) => {
  const auth = resolveEditAuth(req)
  if (!auth) { res.status(401).json({ error: 'Authentication required' }); return }
  const result = await getProject(req.params.id!, auth)
  if (result === null) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  if (!result.canEdit) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const system = generate(result.config)
  await updateProject(result.id, { lastExportedAt: new Date() })
  res.json({ files: system.files })
})

// GET /projects/:id/export.zip
projectExportRouter.get('/:id/export.zip', async (req: Request, res: Response) => {
  const auth = resolveEditAuth(req)
  if (!auth) { res.status(401).json({ error: 'Authentication required' }); return }
  const result = await getProject(req.params.id!, auth)
  if (result === null) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  if (!result.canEdit) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const system = generate(result.config)
  const buffer = await assembleZip(system.files)
  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', `attachment; filename="${result.slug}.zip"`)
  res.send(buffer)
})

// GET /api/v1/systems/:projectId/spec (no auth)
agentRouter.get('/:projectId/spec', async (req: Request, res: Response) => {
  const project = await findProjectById(req.params.projectId!)
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }

  const system = generate(project.config as unknown as ProjectConfig)
  const specFile = system.files.find((f) => f.path === 'docs/agent-spec.json')
  if (!specFile) {
    res.status(500).json({ error: 'Agent spec not generated' })
    return
  }
  res.json(JSON.parse(specFile.content))
})

// GET /api/v1/systems/:projectId/manifest (CLI auth)
agentRouter.get('/:projectId/manifest', cliAuth, async (req: Request, res: Response) => {
  const project = await findProjectById(req.params.projectId!)
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }

  const system = generate(project.config as unknown as ProjectConfig)
  res.json({ files: system.files })
})
