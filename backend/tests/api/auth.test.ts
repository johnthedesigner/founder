import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app'
import { pool, query } from '../../src/db/connection'

const app = createApp()

// ---- test DB lifecycle ----

beforeEach(async () => {
  await pool.query(
    'TRUNCATE users, email_verification_tokens, password_reset_tokens, user_sessions CASCADE',
  )
})

afterAll(async () => {
  await pool.end()
})

// ---- helpers ----

const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = 'securepassword123'
const TEST_NAME = 'Test User'

async function registerUser(
  email = TEST_EMAIL,
  password = TEST_PASSWORD,
  displayName = TEST_NAME,
) {
  return request(app).post('/auth/register').send({ email, password, displayName })
}

async function getVerificationToken(email = TEST_EMAIL): Promise<string> {
  const rows = await query<{ token: string }>(
    `SELECT evt.token FROM email_verification_tokens evt
     JOIN users u ON u.id = evt.user_id
     WHERE u.email = $1 LIMIT 1`,
    [email],
  )
  return rows[0]!.token
}

async function registerAndVerify(email = TEST_EMAIL, password = TEST_PASSWORD) {
  await registerUser(email, password)
  const token = await getVerificationToken(email)
  return request(app).post('/auth/verify-email').send({ token })
}

async function getSessionCookie(email = TEST_EMAIL, password = TEST_PASSWORD): Promise<string> {
  const res = await registerAndVerify(email, password)
  const cookie = res.headers['set-cookie'] as string[] | string
  return Array.isArray(cookie) ? cookie[0]! : cookie!
}

// ---- POST /auth/register ----

describe('POST /auth/register', () => {
  it('creates user with email_verified = false, returns 201', async () => {
    const res = await registerUser()
    expect(res.status).toBe(201)
    const rows = await query<{ email_verified: boolean }>('SELECT email_verified FROM users WHERE email = $1', [TEST_EMAIL])
    expect(rows[0]!.email_verified).toBe(false)
  })

  it('duplicate email returns 409', async () => {
    await registerUser()
    const res = await registerUser()
    expect(res.status).toBe(409)
  })

  it('password shorter than 12 chars returns 400', async () => {
    const res = await registerUser(TEST_EMAIL, 'short')
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('12')
  })

  it('invalid email format returns 400', async () => {
    const res = await registerUser('notanemail', TEST_PASSWORD)
    expect(res.status).toBe(400)
  })

  it('sets X-Verification-Token header in test mode', async () => {
    const res = await registerUser()
    expect(res.headers['x-verification-token']).toBeTruthy()
    expect(res.headers['x-verification-token']).toHaveLength(64)
  })
})

// ---- POST /auth/verify-email ----

describe('POST /auth/verify-email', () => {
  it('valid token → user verified, session issued, JWT cookie set, returns 200', async () => {
    await registerUser()
    const token = await getVerificationToken()
    const res = await request(app).post('/auth/verify-email').send({ token })
    expect(res.status).toBe(200)
    const rows = await query<{ email_verified: boolean }>('SELECT email_verified FROM users WHERE email = $1', [TEST_EMAIL])
    expect(rows[0]!.email_verified).toBe(true)
    const cookie = res.headers['set-cookie'] as string[]
    expect(cookie.some((c) => c.startsWith('session='))).toBe(true)
  })

  it('expired token returns 400', async () => {
    await registerUser()
    await pool.query('UPDATE email_verification_tokens SET expires_at = now() - interval \'1 hour\'')
    const token = await getVerificationToken()
    const res = await request(app).post('/auth/verify-email').send({ token })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/expired/i)
  })

  it('already-used token returns 400', async () => {
    await registerUser()
    const token = await getVerificationToken()
    await request(app).post('/auth/verify-email').send({ token })
    const res = await request(app).post('/auth/verify-email').send({ token })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/used/i)
  })

  it('non-existent token returns 400', async () => {
    const res = await request(app).post('/auth/verify-email').send({ token: 'doesnotexist' })
    expect(res.status).toBe(400)
  })
})

// ---- POST /auth/login ----

describe('POST /auth/login', () => {
  it('correct credentials + verified email → JWT cookie set, returns 200', async () => {
    await registerAndVerify()
    const res = await request(app).post('/auth/login').send({ email: TEST_EMAIL, password: TEST_PASSWORD })
    expect(res.status).toBe(200)
    expect(res.body.user).toMatchObject({ email: TEST_EMAIL })
    const cookie = res.headers['set-cookie'] as string[]
    expect(cookie.some((c) => c.startsWith('session='))).toBe(true)
  })

  it('wrong password returns 401', async () => {
    await registerAndVerify()
    const res = await request(app).post('/auth/login').send({ email: TEST_EMAIL, password: 'wrongpassword123' })
    expect(res.status).toBe(401)
  })

  it('unverified email returns 403', async () => {
    await registerUser()
    const res = await request(app).post('/auth/login').send({ email: TEST_EMAIL, password: TEST_PASSWORD })
    expect(res.status).toBe(403)
  })

  it('non-existent email returns 401 (no enumeration)', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'nobody@example.com', password: TEST_PASSWORD })
    expect(res.status).toBe(401)
  })
})

// ---- POST /auth/logout ----

describe('POST /auth/logout', () => {
  it('deletes session; subsequent GET /auth/me returns 401', async () => {
    const cookie = await getSessionCookie()
    const logoutRes = await request(app).post('/auth/logout').set('Cookie', cookie)
    expect(logoutRes.status).toBe(200)
    const meRes = await request(app).get('/auth/me').set('Cookie', cookie)
    expect(meRes.status).toBe(401)
  })
})

// ---- GET /auth/me ----

describe('GET /auth/me', () => {
  it('valid session returns user', async () => {
    const cookie = await getSessionCookie()
    const res = await request(app).get('/auth/me').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.user).toMatchObject({ email: TEST_EMAIL, displayName: TEST_NAME })
  })

  it('no cookie returns 401', async () => {
    const res = await request(app).get('/auth/me')
    expect(res.status).toBe(401)
  })

  it('deleted jti returns 401', async () => {
    const cookie = await getSessionCookie()
    await pool.query('DELETE FROM user_sessions')
    const res = await request(app).get('/auth/me').set('Cookie', cookie)
    expect(res.status).toBe(401)
  })
})

// ---- POST /auth/forgot-password ----

describe('POST /auth/forgot-password', () => {
  it('always returns 200 for existing email', async () => {
    await registerAndVerify()
    const res = await request(app).post('/auth/forgot-password').send({ email: TEST_EMAIL })
    expect(res.status).toBe(200)
  })

  it('always returns 200 for non-existent email (no enumeration)', async () => {
    const res = await request(app).post('/auth/forgot-password').send({ email: 'nobody@example.com' })
    expect(res.status).toBe(200)
  })
})

// ---- POST /auth/reset-password ----

describe('POST /auth/reset-password', () => {
  it('valid token → password updated, old token invalidated, returns 200', async () => {
    await registerAndVerify()
    await request(app).post('/auth/forgot-password').send({ email: TEST_EMAIL })

    const rows = await query<{ token: string }>('SELECT token FROM password_reset_tokens LIMIT 1')
    const resetToken = rows[0]!.token

    const res = await request(app).post('/auth/reset-password').send({
      token: resetToken,
      newPassword: 'newpassword456!',
    })
    expect(res.status).toBe(200)

    const usedRows = await query<{ used_at: Date | null }>('SELECT used_at FROM password_reset_tokens WHERE token = $1', [resetToken])
    expect(usedRows[0]!.used_at).not.toBeNull()

    const loginRes = await request(app).post('/auth/login').send({ email: TEST_EMAIL, password: 'newpassword456!' })
    expect(loginRes.status).toBe(200)
  })

  it('non-existent token returns 400', async () => {
    const res = await request(app).post('/auth/reset-password').send({ token: 'bogus', newPassword: 'newpassword456!' })
    expect(res.status).toBe(400)
  })
})
