import { randomBytes } from 'crypto'
import { ProjectConfigSchema } from '@ds-gen/types'
import type { ProjectConfig } from '@ds-gen/types'
import {
  insertProject,
  findProjectsByUserId,
  findProjectById,
  findProjectByUserIdAndSlug,
  updateProject,
  deleteProject,
} from '../db/queries/projects'
import type { ProjectRow } from '../db/types'

export type EditAuth =
  | { type: 'user'; userId: string }
  | { type: 'token'; ownerToken: string }

export interface ProjectResponse {
  id: string
  userId: string | null
  canEdit: boolean
  name: string
  slug: string
  config: ProjectConfig
  lastExportedAt: string | null
  createdAt: string
  updatedAt: string
}

function rowToResponse(row: ProjectRow, canEdit: boolean): ProjectResponse {
  return {
    id: row.id,
    userId: row.user_id,
    canEdit,
    name: row.name,
    slug: row.slug,
    config: row.config as unknown as ProjectConfig,
    lastExportedAt: row.last_exported_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

function computeCanEdit(
  row: ProjectRow,
  auth?: { userId?: string; ownerToken?: string },
): boolean {
  if (!auth) return false
  if (auth.userId && row.user_id === auth.userId) return true
  if (auth.ownerToken && row.owner_token !== null && auth.ownerToken === row.owner_token) return true
  return false
}

function toKebabCase(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s-]+/g, '-')
      .replace(/^-|-$/g, '') || 'project'
  )
}

async function generateUniqueSlug(userId: string | null, name: string): Promise<string> {
  const base = toKebabCase(name)
  // Anonymous projects have no slug uniqueness constraint — skip collision check.
  if (userId === null) return base
  let slug = base
  for (let i = 0; i < 10; i++) {
    const existing = await findProjectByUserIdAndSlug(userId, slug)
    if (!existing) return slug
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`
  }
  return `${base}-${Date.now().toString(36)}`
}

function deepMerge(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base }
  for (const key of Object.keys(patch)) {
    const patchVal = patch[key]
    const baseVal = base[key]
    if (
      patchVal !== null &&
      typeof patchVal === 'object' &&
      !Array.isArray(patchVal) &&
      baseVal !== null &&
      typeof baseVal === 'object' &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        patchVal as Record<string, unknown>,
      )
    } else {
      result[key] = patchVal
    }
  }
  return result
}

// ---- create ----

export async function createProject(
  userId: string | null,
  data: { name?: string; config: unknown },
): Promise<{ project: ProjectResponse; ownerToken: string | null }> {
  const parsed = ProjectConfigSchema.safeParse(data.config)
  if (!parsed.success) {
    const err = new Error('Invalid config')
    ;(err as NodeJS.ErrnoException).code = 'INVALID_CONFIG'
    ;(err as unknown as { issues: unknown[] }).issues = parsed.error.issues
    throw err
  }

  const name = data.name?.trim() || 'My Design System'
  const slug = await generateUniqueSlug(userId, name)
  const ownerToken = userId === null ? randomBytes(32).toString('hex') : null
  const row = await insertProject({
    userId,
    name,
    slug,
    config: parsed.data as unknown as Record<string, unknown>,
    ownerToken: ownerToken ?? undefined,
  })
  return { project: rowToResponse(row, true), ownerToken }
}

// ---- list ----

export async function listProjects(userId: string): Promise<ProjectResponse[]> {
  const rows = await findProjectsByUserId(userId)
  return rows.map((row) => rowToResponse(row, true))
}

function hasEditAccess(row: ProjectRow, auth: EditAuth): boolean {
  if (auth.type === 'user') return row.user_id === auth.userId
  return row.owner_token !== null && row.owner_token === auth.ownerToken
}

// ---- get ----

export async function getProject(
  projectId: string,
  auth?: { userId?: string; ownerToken?: string },
): Promise<ProjectResponse | null> {
  const row = await findProjectById(projectId)
  if (!row) return null
  return rowToResponse(row, computeCanEdit(row, auth))
}

// ---- update ----

export async function updateProjectById(
  projectId: string,
  auth: EditAuth,
  data: { name?: string; config?: unknown },
): Promise<ProjectResponse | null | 'forbidden' | 'invalid'> {
  const row = await findProjectById(projectId)
  if (!row) return null
  if (!hasEditAccess(row, auth)) return 'forbidden'

  let mergedConfig: Record<string, unknown> | undefined
  if (data.config !== undefined) {
    const merged = deepMerge(
      row.config,
      data.config as Record<string, unknown>,
    )
    const parsed = ProjectConfigSchema.safeParse(merged)
    if (!parsed.success) return 'invalid'
    mergedConfig = parsed.data as unknown as Record<string, unknown>
  }

  const updated = await updateProject(projectId, {
    name: data.name?.trim(),
    config: mergedConfig,
  })
  if (!updated) return null
  return rowToResponse(updated, true)
}

// ---- delete ----

export async function deleteProjectById(
  projectId: string,
  auth: EditAuth,
): Promise<'ok' | null | 'forbidden'> {
  const row = await findProjectById(projectId)
  if (!row) return null
  if (!hasEditAccess(row, auth)) return 'forbidden'
  await deleteProject(projectId)
  return 'ok'
}

// ---- claim ----

export async function claimProject(
  projectId: string,
  ownerToken: string,
  newUserId: string,
): Promise<ProjectResponse | 'already-claimed' | 'forbidden'> {
  const row = await findProjectById(projectId)
  if (!row) return 'forbidden'
  if (row.user_id !== null) return 'already-claimed'
  if (!row.owner_token || row.owner_token !== ownerToken) return 'forbidden'
  const updated = await updateProject(projectId, { userId: newUserId, ownerToken: null })
  if (!updated) return 'forbidden'
  return rowToResponse(updated, true)
}

// Re-export findProjectById for use by generate routes
export { findProjectById }
