import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app'
import { pool } from '../../src/db/connection'
import { DEFAULT_CONFIG } from '../../src/pipeline/palette/defaults'
import { clearSpecCache, specRateLimiter } from '../../src/api/generate'
import * as pipeline from '../../src/pipeline'

const app = createApp()

// Supertest sends from loopback; express-rate-limit sees this IP
const LOOPBACK_IP = '::ffff:127.0.0.1'

beforeEach(async () => {
  await pool.query(
    'TRUNCATE users, email_verification_tokens, password_reset_tokens, user_sessions, projects CASCADE',
  )
  // Reset rate limiter state so tests don't bleed into each other
  await specRateLimiter.resetKey(LOOPBACK_IP)
  // Clear all cache entries
  clearSpecCache()
  vi.restoreAllMocks()
})

afterAll(async () => {
  await pool.end()
})

// ---- helpers ----

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

async function createProject(cookie: string): Promise<string> {
  const res = await request(app)
    .post('/projects')
    .set('Cookie', cookie)
    .send({ name: 'Agent Test', config: DEFAULT_CONFIG })
  return (res.body.project as { id: string }).id
}

// ---- cache tests ----

describe('spec response cache', () => {
  it('serves the same response on second call without re-running generate()', async () => {
    const cookie = await createSessionCookie('cache1@example.com')
    const projectId = await createProject(cookie)

    const spy = vi.spyOn(pipeline, 'generate')

    const res1 = await request(app).get(`/api/v1/systems/${projectId}/spec`)
    expect(res1.status).toBe(200)
    expect(spy).toHaveBeenCalledTimes(1)

    const res2 = await request(app).get(`/api/v1/systems/${projectId}/spec`)
    expect(res2.status).toBe(200)
    expect(spy).toHaveBeenCalledTimes(1) // cached — generate() not called again

    expect(res1.body).toEqual(res2.body)
  })

  it('re-runs generate() after PATCH invalidates the cache', async () => {
    const cookie = await createSessionCookie('cache2@example.com')
    const projectId = await createProject(cookie)

    const spy = vi.spyOn(pipeline, 'generate')

    // Prime cache
    await request(app).get(`/api/v1/systems/${projectId}/spec`)
    expect(spy).toHaveBeenCalledTimes(1)

    // PATCH should invalidate cache
    await request(app)
      .patch(`/projects/${projectId}`)
      .set('Cookie', cookie)
      .send({ name: 'Renamed' })

    // Next spec request regenerates
    await request(app).get(`/api/v1/systems/${projectId}/spec`)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('returns 404 for unknown project and does not cache the miss', async () => {
    const res = await request(app).get('/api/v1/systems/00000000-0000-0000-0000-000000000000/spec')
    expect(res.status).toBe(404)
  })
})

// ---- rate limit tests ----

describe('spec rate limit', () => {
  it('returns 429 after 60 requests from the same IP within one minute', async () => {
    const cookie = await createSessionCookie('rl1@example.com')
    const projectId = await createProject(cookie)

    // First 60 requests should succeed (cache makes these fast after #1)
    for (let i = 0; i < 60; i++) {
      const res = await request(app).get(`/api/v1/systems/${projectId}/spec`)
      expect(res.status).toBe(200)
    }

    // 61st request should be rate limited
    const limited = await request(app).get(`/api/v1/systems/${projectId}/spec`)
    expect(limited.status).toBe(429)
  })

  it('authenticated users bypass the rate limit', async () => {
    const cookie = await createSessionCookie('rl2@example.com')
    const projectId = await createProject(cookie)

    // Exhaust the rate limit as an anonymous caller
    for (let i = 0; i < 60; i++) {
      await request(app).get(`/api/v1/systems/${projectId}/spec`)
    }

    // Authenticated request should still succeed even after limit exhausted
    const res = await request(app)
      .get(`/api/v1/systems/${projectId}/spec`)
      .set('Cookie', cookie)
    expect(res.status).toBe(200)
  })
})
