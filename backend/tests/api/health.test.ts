import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app'

describe('GET /health', () => {
  const app = createApp()

  it('returns 200 with valid status and db fields', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('status')
    expect(res.body).toHaveProperty('db')
    expect(['ok', 'degraded']).toContain(res.body.status)
    expect(['ok', 'error']).toContain(res.body.db)
  })
})
