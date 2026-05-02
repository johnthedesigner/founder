import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app'
import { pool } from '../../src/db/connection'
import { DEFAULT_CONFIG } from '../../src/pipeline/palette/defaults'
import type { ProjectConfig } from '@ds-gen/types'

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

// ---- project helper ----

async function createProject(
  cookie: string,
  config: ProjectConfig = DEFAULT_CONFIG,
  name = 'My Design System',
) {
  return request(app).post('/projects').set('Cookie', cookie).send({ name, config })
}

// ---- POST /projects ----

describe('POST /projects', () => {
  it('valid config → project created with generated slug, returns 201', async () => {
    const cookie = await createSessionCookie('user@example.com')
    const res = await createProject(cookie)
    expect(res.status).toBe(201)
    expect(res.body.project).toMatchObject({
      name: 'My Design System',
      slug: 'my-design-system',
    })
    expect(res.body.project.config).toMatchObject({ projectType: DEFAULT_CONFIG.projectType })
  })

  it('config missing color.primaryHex returns 400 with Zod error details', async () => {
    const cookie = await createSessionCookie('user@example.com')
    const badConfig = { ...DEFAULT_CONFIG, color: { ...DEFAULT_CONFIG.color, primaryHex: undefined } }
    const res = await request(app).post('/projects').set('Cookie', cookie).send({ config: badConfig })
    expect(res.status).toBe(400)
    expect(res.body.issues).toBeDefined()
  })

  it('invalid projectType returns 400', async () => {
    const cookie = await createSessionCookie('user@example.com')
    const badConfig = { ...DEFAULT_CONFIG, projectType: 'invalid-type' }
    const res = await request(app).post('/projects').set('Cookie', cookie).send({ config: badConfig })
    expect(res.status).toBe(400)
  })

  it('unauthenticated returns 401', async () => {
    const res = await request(app).post('/projects').send({ config: DEFAULT_CONFIG })
    expect(res.status).toBe(401)
  })
})

// ---- GET /projects ----

describe('GET /projects', () => {
  it('returns empty array when user has no projects', async () => {
    const cookie = await createSessionCookie('user@example.com')
    const res = await request(app).get('/projects').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.projects).toEqual([])
  })

  it("returns array of the authenticated user's projects", async () => {
    const cookie = await createSessionCookie('user@example.com')
    await createProject(cookie, DEFAULT_CONFIG, 'Project A')
    await createProject(cookie, DEFAULT_CONFIG, 'Project B')
    const res = await request(app).get('/projects').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.projects).toHaveLength(2)
  })

  it('unauthenticated returns 401', async () => {
    const res = await request(app).get('/projects')
    expect(res.status).toBe(401)
  })
})

// ---- GET /projects/:id ----

describe('GET /projects/:id', () => {
  it('own project returns full project object including stored config', async () => {
    const cookie = await createSessionCookie('user@example.com')
    const created = await createProject(cookie)
    const { id } = created.body.project as { id: string }

    const res = await request(app).get(`/projects/${id}`).set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.project.id).toBe(id)
    expect(res.body.project.config).toMatchObject({ projectType: DEFAULT_CONFIG.projectType })
  })

  it("another user's project returns 403", async () => {
    const cookie1 = await createSessionCookie('user1@example.com')
    const cookie2 = await createSessionCookie('user2@example.com')
    const created = await createProject(cookie1)
    const { id } = created.body.project as { id: string }

    const res = await request(app).get(`/projects/${id}`).set('Cookie', cookie2)
    expect(res.status).toBe(403)
  })

  it('non-existent id returns 404', async () => {
    const cookie = await createSessionCookie('user@example.com')
    const res = await request(app)
      .get('/projects/00000000-0000-0000-0000-000000000000')
      .set('Cookie', cookie)
    expect(res.status).toBe(404)
  })
})

// ---- PATCH /projects/:id ----

describe('PATCH /projects/:id', () => {
  it('partial config update deep-merges with existing config and returns updated project', async () => {
    const cookie = await createSessionCookie('user@example.com')
    const created = await createProject(cookie)
    const { id } = created.body.project as { id: string }

    const patch = { config: { shape: { density: 'compact' } } }
    const res = await request(app).patch(`/projects/${id}`).set('Cookie', cookie).send(patch)
    expect(res.status).toBe(200)
    expect(res.body.project.config.shape.density).toBe('compact')
    // Other shape fields should still be present from original config
    expect(res.body.project.config.shape.personality).toBe(DEFAULT_CONFIG.shape.personality)
  })

  it('invalid merge result returns 400', async () => {
    const cookie = await createSessionCookie('user@example.com')
    const created = await createProject(cookie)
    const { id } = created.body.project as { id: string }

    const patch = { config: { projectType: 'not-a-valid-type' } }
    const res = await request(app).patch(`/projects/${id}`).set('Cookie', cookie).send(patch)
    expect(res.status).toBe(400)
  })

  it("another user's project returns 403", async () => {
    const cookie1 = await createSessionCookie('user1@example.com')
    const cookie2 = await createSessionCookie('user2@example.com')
    const created = await createProject(cookie1)
    const { id } = created.body.project as { id: string }

    const res = await request(app)
      .patch(`/projects/${id}`)
      .set('Cookie', cookie2)
      .send({ config: { shape: { density: 'compact' } } })
    expect(res.status).toBe(403)
  })
})

// ---- DELETE /projects/:id ----

describe('DELETE /projects/:id', () => {
  it('own project deleted, returns 204', async () => {
    const cookie = await createSessionCookie('user@example.com')
    const created = await createProject(cookie)
    const { id } = created.body.project as { id: string }

    const res = await request(app).delete(`/projects/${id}`).set('Cookie', cookie)
    expect(res.status).toBe(204)

    const check = await request(app).get(`/projects/${id}`).set('Cookie', cookie)
    expect(check.status).toBe(404)
  })

  it("another user's project returns 403", async () => {
    const cookie1 = await createSessionCookie('user1@example.com')
    const cookie2 = await createSessionCookie('user2@example.com')
    const created = await createProject(cookie1)
    const { id } = created.body.project as { id: string }

    const res = await request(app).delete(`/projects/${id}`).set('Cookie', cookie2)
    expect(res.status).toBe(403)
  })
})

// ---- slug uniqueness ----

describe('slug uniqueness', () => {
  it('two projects with the same name for the same user get different slugs', async () => {
    const cookie = await createSessionCookie('user@example.com')
    const res1 = await createProject(cookie, DEFAULT_CONFIG, 'My Project')
    const res2 = await createProject(cookie, DEFAULT_CONFIG, 'My Project')
    expect(res1.status).toBe(201)
    expect(res2.status).toBe(201)
    expect(res1.body.project.slug).not.toBe(res2.body.project.slug)
  })
})
