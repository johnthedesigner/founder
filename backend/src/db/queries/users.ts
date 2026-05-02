import { query } from '../connection'
import type { UserRow } from '../types'

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const rows = await query<UserRow>('SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL', [
    email,
  ])
  return rows[0] ?? null
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const rows = await query<UserRow>('SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL', [
    id,
  ])
  return rows[0] ?? null
}

export async function insertUser(data: {
  email: string
  passwordHash: string
  displayName: string
}): Promise<UserRow> {
  const rows = await query<UserRow>(
    'INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING *',
    [data.email, data.passwordHash, data.displayName],
  )
  return rows[0]!
}

export async function setEmailVerified(userId: string): Promise<void> {
  await query('UPDATE users SET email_verified = true WHERE id = $1', [userId])
}

export async function updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId])
}
