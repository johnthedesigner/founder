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

  it('unauthenticated → anonymous project created, returns 201 with ownerToken', async () => {
    const res = await request(app).post('/projects').send({ config: DEFAULT_CONFIG })
    expect(res.status).toBe(201)
    expect(res.body.project).toMatchObject({ name: 'My Design System', userId: null })
    expect(typeof res.body.ownerToken).toBe('string')
    expect(res.body.ownerToken).toHaveLength(64)
  })

  it('anonymous project: ownerToken is 64 hex chars and stored in DB', async () => {
    const res = await request(app).post('/projects').send({ config: DEFAULT_CONFIG })
    expect(res.status).toBe(201)
    const { ownerToken } = res.body as { ownerToken: string }
    expect(/^[0-9a-f]{64}$/.test(ownerToken)).toBe(true)
    // Verify it's actually stored — PATCH with the token should succeed
    const patchRes = await request(app)
      .patch(`/projects/${res.body.project.id}`)
      .set('X-Owner-Token', ownerToken)
      .send({ name: 'Updated Name' })
    expect(patchRes.status).toBe(200)
  })

  it('authenticated project: response has no ownerToken field', async () => {
    const cookie = await createSessionCookie('user@example.com')
    const res = await createProject(cookie)
    expect(res.status).toBe(201)
    expect(res.body.ownerToken).toBeUndefined()
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
  it('own project returns full project object with canEdit: true', async () => {
    const cookie = await createSessionCookie('user@example.com')
    const created = await createProject(cookie)
    const { id } = created.body.project as { id: string }

    const res = await request(app).get(`/projects/${id}`).set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.project.id).toBe(id)
    expect(res.body.project.canEdit).toBe(true)
    expect(res.body.project.config).toMatchObject({ projectType: DEFAULT_CONFIG.projectType })
  })

  it('no auth returns 200 with canEdit: false (public read)', async () => {
    const cookie = await createSessionCookie('user@example.com')
    const created = await createProject(cookie)
    const { id } = created.body.project as { id: string }

    const res = await request(app).get(`/projects/${id}`)
    expect(res.status).toBe(200)
    expect(res.body.project.canEdit).toBe(false)
  })

  it("another user's project returns 200 with canEdit: false", async () => {
    const cookie1 = await createSessionCookie('user1@example.com')
    const cookie2 = await createSessionCookie('user2@example.com')
    const created = await createProject(cookie1)
    const { id } = created.body.project as { id: string }

    const res = await request(app).get(`/projects/${id}`).set('Cookie', cookie2)
    expect(res.status).toBe(200)
    expect(res.body.project.canEdit).toBe(false)
  })

  it('anonymous project with correct X-Owner-Token returns canEdit: true', async () => {
    const created = await request(app).post('/projects').send({ config: DEFAULT_CONFIG })
    const { project, ownerToken } = created.body as { project: { id: string }; ownerToken: string }

    const res = await request(app)
      .get(`/projects/${project.id}`)
      .set('X-Owner-Token', ownerToken)
    expect(res.status).toBe(200)
    expect(res.body.project.canEdit).toBe(true)
  })

  it('anonymous project with wrong X-Owner-Token returns canEdit: false', async () => {
    const created = await request(app).post('/projects').send({ config: DEFAULT_CONFIG })
    const { project } = created.body as { project: { id: string } }

    const res = await request(app)
      .get(`/projects/${project.id}`)
      .set('X-Owner-Token', 'a'.repeat(64))
    expect(res.status).toBe(200)
    expect(res.body.project.canEdit).toBe(false)
  })

  it('non-existent id returns 404', async () => {
    const res = await request(app).get('/projects/00000000-0000-0000-0000-000000000000')
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
  it('authenticated: two projects with the same name for the same user get different slugs', async () => {
    const cookie = await createSessionCookie('user@example.com')
    const res1 = await createProject(cookie, DEFAULT_CONFIG, 'My Project')
    const res2 = await createProject(cookie, DEFAULT_CONFIG, 'My Project')
    expect(res1.status).toBe(201)
    expect(res2.status).toBe(201)
    expect(res1.body.project.slug).not.toBe(res2.body.project.slug)
  })

  it('anonymous: two projects with the same name may share a slug (no constraint)', async () => {
    const res1 = await request(app).post('/projects').send({ name: 'My Project', config: DEFAULT_CONFIG })
    const res2 = await request(app).post('/projects').send({ name: 'My Project', config: DEFAULT_CONFIG })
    expect(res1.status).toBe(201)
    expect(res2.status).toBe(201)
    // Both should succeed — no uniqueness constraint on anonymous projects
    expect(res1.body.project.slug).toBe('my-project')
    expect(res2.body.project.slug).toBe('my-project')
  })
})

// ---- owner token auth (PATCH / DELETE) ----

describe('owner token auth', () => {
  async function createAnonymousProject() {
    const res = await request(app).post('/projects').send({ config: DEFAULT_CONFIG })
    return res.body as { project: { id: string }; ownerToken: string }
  }

  it('PATCH with correct X-Owner-Token returns 200', async () => {
    const { project, ownerToken } = await createAnonymousProject()
    const res = await request(app)
      .patch(`/projects/${project.id}`)
      .set('X-Owner-Token', ownerToken)
      .send({ name: 'Renamed' })
    expect(res.status).toBe(200)
    expect(res.body.project.name).toBe('Renamed')
  })

  it('PATCH with wrong token returns 403', async () => {
    const { project } = await createAnonymousProject()
    const res = await request(app)
      .patch(`/projects/${project.id}`)
      .set('X-Owner-Token', 'a'.repeat(64))
      .send({ name: 'Renamed' })
    expect(res.status).toBe(403)
  })

  it('PATCH with no auth and no token returns 401', async () => {
    const { project } = await createAnonymousProject()
    const res = await request(app)
      .patch(`/projects/${project.id}`)
      .send({ name: 'Renamed' })
    expect(res.status).toBe(401)
  })

  it('DELETE with correct X-Owner-Token returns 204', async () => {
    const { project, ownerToken } = await createAnonymousProject()
    const res = await request(app)
      .delete(`/projects/${project.id}`)
      .set('X-Owner-Token', ownerToken)
    expect(res.status).toBe(204)
  })

  it('DELETE with no auth and no token returns 401', async () => {
    const { project } = await createAnonymousProject()
    const res = await request(app).delete(`/projects/${project.id}`)
    expect(res.status).toBe(401)
  })

  it('authenticated user cannot use another user cookie to edit anonymous project', async () => {
    const { project } = await createAnonymousProject()
    const cookie = await createSessionCookie('interloper@example.com')
    const res = await request(app)
      .patch(`/projects/${project.id}`)
      .set('Cookie', cookie)
      .send({ name: 'Hijacked' })
    expect(res.status).toBe(403)
  })
})

// ---- POST /projects/:id/claim ----

describe('POST /projects/:id/claim', () => {
  async function createAnonymousProject() {
    const res = await request(app).post('/projects').send({ config: DEFAULT_CONFIG })
    return res.body as { project: { id: string }; ownerToken: string }
  }

  it('correct token + auth → 200; project userId set, ownerToken cleared', async () => {
    const { project, ownerToken } = await createAnonymousProject()
    const cookie = await createSessionCookie('claimer@example.com')

    const res = await request(app)
      .post(`/projects/${project.id}/claim`)
      .set('Cookie', cookie)
      .set('X-Owner-Token', ownerToken)
    expect(res.status).toBe(200)
    expect(res.body.project.userId).not.toBeNull()
    expect(res.body.project.canEdit).toBe(true)

    // Verify owner_token is cleared: old token should no longer grant canEdit
    const check = await request(app)
      .get(`/projects/${project.id}`)
      .set('X-Owner-Token', ownerToken)
    expect(check.body.project.canEdit).toBe(false)
  })

  it('wrong token + auth → 403', async () => {
    const { project } = await createAnonymousProject()
    const cookie = await createSessionCookie('claimer@example.com')

    const res = await request(app)
      .post(`/projects/${project.id}/claim`)
      .set('Cookie', cookie)
      .set('X-Owner-Token', 'a'.repeat(64))
    expect(res.status).toBe(403)
  })

  it('already-claimed project → 409', async () => {
    const { project, ownerToken } = await createAnonymousProject()
    const cookie = await createSessionCookie('claimer@example.com')

    await request(app)
      .post(`/projects/${project.id}/claim`)
      .set('Cookie', cookie)
      .set('X-Owner-Token', ownerToken)

    // Second claim attempt
    const res = await request(app)
      .post(`/projects/${project.id}/claim`)
      .set('Cookie', cookie)
      .set('X-Owner-Token', ownerToken)
    expect(res.status).toBe(409)
  })

  it('no auth → 401', async () => {
    const { project, ownerToken } = await createAnonymousProject()
    const res = await request(app)
      .post(`/projects/${project.id}/claim`)
      .set('X-Owner-Token', ownerToken)
    expect(res.status).toBe(401)
  })

  it('missing X-Owner-Token header → 400', async () => {
    const { project } = await createAnonymousProject()
    const cookie = await createSessionCookie('claimer@example.com')
    const res = await request(app)
      .post(`/projects/${project.id}/claim`)
      .set('Cookie', cookie)
    expect(res.status).toBe(400)
  })

  it('claimed project appears in the claimant\'s GET /projects list', async () => {
    const { project, ownerToken } = await createAnonymousProject()
    const cookie = await createSessionCookie('claimer@example.com')

    await request(app)
      .post(`/projects/${project.id}/claim`)
      .set('Cookie', cookie)
      .set('X-Owner-Token', ownerToken)

    const listRes = await request(app).get('/projects').set('Cookie', cookie)
    expect(listRes.body.projects).toHaveLength(1)
    expect(listRes.body.projects[0].id).toBe(project.id)
  })
})
