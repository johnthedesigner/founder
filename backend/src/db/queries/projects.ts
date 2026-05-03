import { query } from '../connection'
import type { ProjectRow } from '../types'

export async function insertProject(data: {
  userId: string | null
  name: string
  slug: string
  config: Record<string, unknown>
  ownerToken?: string
}): Promise<ProjectRow> {
  const rows = await query<ProjectRow>(
    `INSERT INTO projects (user_id, name, slug, config, owner_token)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.userId, data.name, data.slug, JSON.stringify(data.config), data.ownerToken ?? null],
  )
  return rows[0]!
}

export async function findProjectByOwnerToken(token: string): Promise<ProjectRow | null> {
  const rows = await query<ProjectRow>(
    'SELECT * FROM projects WHERE owner_token = $1',
    [token],
  )
  return rows[0] ?? null
}

export async function findProjectsByUserId(userId: string): Promise<ProjectRow[]> {
  return query<ProjectRow>(
    'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC',
    [userId],
  )
}

export async function findProjectById(id: string): Promise<ProjectRow | null> {
  const rows = await query<ProjectRow>('SELECT * FROM projects WHERE id = $1', [id])
  return rows[0] ?? null
}

export async function findProjectByUserIdAndSlug(
  userId: string,
  slug: string,
): Promise<ProjectRow | null> {
  const rows = await query<ProjectRow>(
    'SELECT * FROM projects WHERE user_id = $1 AND slug = $2',
    [userId, slug],
  )
  return rows[0] ?? null
}

export async function updateProject(
  id: string,
  data: {
    name?: string
    config?: Record<string, unknown>
    lastExportedAt?: Date
    userId?: string        // for claim: transfer ownership
    ownerToken?: string | null  // for claim: null clears the token
  },
): Promise<ProjectRow | null> {
  const sets: string[] = ['updated_at = now()']
  const values: unknown[] = []
  let idx = 1

  if (data.name !== undefined) {
    sets.push(`name = $${idx++}`)
    values.push(data.name)
  }
  if (data.config !== undefined) {
    sets.push(`config = $${idx++}`)
    values.push(JSON.stringify(data.config))
  }
  if (data.lastExportedAt !== undefined) {
    sets.push(`last_exported_at = $${idx++}`)
    values.push(data.lastExportedAt)
  }
  if (data.userId !== undefined) {
    sets.push(`user_id = $${idx++}`)
    values.push(data.userId)
  }
  if ('ownerToken' in data) {
    sets.push(`owner_token = $${idx++}`)
    values.push(data.ownerToken)
  }

  values.push(id)
  const rows = await query<ProjectRow>(
    `UPDATE projects SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    values,
  )
  return rows[0] ?? null
}

export async function deleteProject(id: string): Promise<void> {
  await query('DELETE FROM projects WHERE id = $1', [id])
}
