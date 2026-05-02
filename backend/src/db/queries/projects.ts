import { query } from '../connection'
import type { ProjectRow } from '../types'

export async function insertProject(data: {
  userId: string
  name: string
  slug: string
  config: Record<string, unknown>
}): Promise<ProjectRow> {
  const rows = await query<ProjectRow>(
    `INSERT INTO projects (user_id, name, slug, config)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.userId, data.name, data.slug, JSON.stringify(data.config)],
  )
  return rows[0]!
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
  data: { name?: string; config?: Record<string, unknown>; lastExportedAt?: Date },
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
