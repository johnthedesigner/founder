import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import JSZip from 'jszip'
import { createApp } from '../../src/app'
import { pool } from '../../src/db/connection'
import { DEFAULT_CONFIG } from '../../src/pipeline/palette/defaults'

const app = createApp()

// ---- test DB lifecycle ----

beforeEach(async () => {
  await pool.query(
    'TRUNCATE users, email_verification_tokens, password_reset_tokens, user_sessions, projects CASCADE',
  )
})

afterAll(async () => {
  await pool.end()
})

// ---- auth helper ----

async function createSessionCookie(email: string, password = 'securepassword123'): Promise<string> {
  const regRes = await request(app)
    .post('/auth/register')
    .send({ email, password, displayName: 'Test User' })
  const verifyToken = regRes.headers['x-verification-token'] as string
  await request(app).post('/auth/verify-email').send({ token: verifyToken })
  const loginRes = await request(app).post('/auth/login').send({ email, password })
  const setCookie = loginRes.headers['set-cookie'] as string[] | string
  return Array.isArray(setCookie) ? setCookie[0]! : setCookie
}

async function createProject(cookie: string): Promise<{ id: string; slug: string }> {
  const res = await request(app)
    .post('/projects')
    .set('Cookie', cookie)
    .send({ name: 'Test System', config: DEFAULT_CONFIG })
  return res.body.project as { id: string; slug: string }
}

// ---- POST /projects/:id/export ----

describe('POST /projects/:id/export', () => {
  it('returns files array with all required paths', async () => {
    const cookie = await createSessionCookie('user@example.com')
    const project = await createProject(cookie)

    const res = await request(app)
      .post(`/projects/${project.id}/export`)
      .set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.files)).toBe(true)
    const paths = (res.body.files as { path: string }[]).map((f) => f.path)
    expect(paths).toContain('tokens/primitives.json')
    expect(paths).toContain('tokens/variables.css')
    expect(paths).toContain('components/index.ts')
    expect(paths).toContain('docs/agent-spec.json')
    expect(paths).toContain('docs/README.md')
    expect(paths.length).toBeGreaterThanOrEqual(12)
  })

  it('updates last_exported_at on the project record', async () => {
    const cookie = await createSessionCookie('user@example.com')
    const project = await createProject(cookie)

    const before = await request(app).get(`/projects/${project.id}`).set('Cookie', cookie)
    expect(before.body.project.lastExportedAt).toBeNull()

    await request(app).post(`/projects/${project.id}/export`).set('Cookie', cookie)

    const after = await request(app).get(`/projects/${project.id}`).set('Cookie', cookie)
    expect(after.body.project.lastExportedAt).not.toBeNull()
  })

  it("another user's project returns 403", async () => {
    const cookie1 = await createSessionCookie('user1@example.com')
    const cookie2 = await createSessionCookie('user2@example.com')
    const project = await createProject(cookie1)

    const res = await request(app)
      .post(`/projects/${project.id}/export`)
      .set('Cookie', cookie2)
    expect(res.status).toBe(403)
  })

  it('unauthenticated returns 401', async () => {
    const cookie = await createSessionCookie('user@example.com')
    const project = await createProject(cookie)

    const res = await request(app).post(`/projects/${project.id}/export`)
    expect(res.status).toBe(401)
  })
})

// ---- GET /projects/:id/export.zip ----

describe('GET /projects/:id/export.zip', () => {
  it('returns a valid ZIP containing all required file paths', async () => {
    const cookie = await createSessionCookie('user@example.com')
    const project = await createProject(cookie)

    const res = await request(app)
      .get(`/projects/${project.id}/export.zip`)
      .set('Cookie', cookie)
      .parse((raw, fn) => {
        const chunks: Buffer[] = []
        raw.on('data', (c: Buffer) => chunks.push(c))
        raw.on('end', () => fn(null, Buffer.concat(chunks)))
      })

    expect(res.status).toBe(200)
    const zip = await JSZip.loadAsync(res.body as unknown as Buffer)
    const zipPaths = Object.keys(zip.files)
    expect(zipPaths).toContain('tokens/primitives.json')
    expect(zipPaths).toContain('tokens/variables.css')
    expect(zipPaths).toContain('components/index.ts')
    expect(zipPaths).toContain('docs/agent-spec.json')
  })

  it('response has correct Content-Disposition with project slug', async () => {
    const cookie = await createSessionCookie('user@example.com')
    const project = await createProject(cookie)

    const res = await request(app)
      .get(`/projects/${project.id}/export.zip`)
      .set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.headers['content-disposition']).toBe(
      `attachment; filename="${project.slug}.zip"`,
    )
  })
})

// ---- GET /api/v1/systems/:projectId/spec ----

describe('GET /api/v1/systems/:projectId/spec', () => {
  it('no auth required; returns parsed agent-spec JSON with all required keys', async () => {
    const cookie = await createSessionCookie('user@example.com')
    const project = await createProject(cookie)

    const res = await request(app).get(`/api/v1/systems/${project.id}/spec`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('version')
    expect(res.body).toHaveProperty('projectId')
    expect(res.body).toHaveProperty('projectName')
    expect(res.body).toHaveProperty('generatedAt')
    expect(res.body).toHaveProperty('config')
    expect(res.body).toHaveProperty('tokens')
    expect(res.body).toHaveProperty('components')
    expect(res.body).toHaveProperty('rules')
  })

  it('non-existent project returns 404', async () => {
    const res = await request(app).get(
      '/api/v1/systems/00000000-0000-0000-0000-000000000000/spec',
    )
    expect(res.status).toBe(404)
  })
})

// ---- GET /api/v1/systems/:projectId/manifest ----

describe('GET /api/v1/systems/:projectId/manifest', () => {
  it('valid CLI token returns { files: GeneratedFile[] }', async () => {
    const cookie = await createSessionCookie('user@example.com')
    const project = await createProject(cookie)

    const tokenRes = await request(app).post('/auth/cli-token').set('Cookie', cookie)
    expect(tokenRes.status).toBe(200)
    const cliToken = tokenRes.body.token as string

    const res = await request(app)
      .get(`/api/v1/systems/${project.id}/manifest`)
      .set('Authorization', `Bearer ${cliToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.files)).toBe(true)
    expect(res.body.files.length).toBeGreaterThanOrEqual(12)
  })

  it('no token returns 401', async () => {
    const cookie = await createSessionCookie('user@example.com')
    const project = await createProject(cookie)

    const res = await request(app).get(`/api/v1/systems/${project.id}/manifest`)
    expect(res.status).toBe(401)
  })
})

// ---- POST /auth/cli-token ----

describe('POST /auth/cli-token', () => {
  it('authenticated user receives a long-lived JWT token', async () => {
    const cookie = await createSessionCookie('user@example.com')
    const res = await request(app).post('/auth/cli-token').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(typeof res.body.token).toBe('string')
    expect(res.body.token.split('.').length).toBe(3)
  })

  it('unauthenticated returns 401', async () => {
    const res = await request(app).post('/auth/cli-token')
    expect(res.status).toBe(401)
  })
})
