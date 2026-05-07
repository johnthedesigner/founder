# Deployment Guide

**Target:** As close to free as possible, with a path to paid-but-cheap when traffic grows.
**Last updated:** 2026-05-07

---

## Architecture overview

```
Browser
  └── Cloudflare Pages (free)
        ├── Serves: frontend React SPA + preview sandbox static files
        ├── Proxies /auth/*, /api/*, /projects/* → Render (backend)
        └── All other routes → index.html (SPA fallback)

Render.com (free web service — sleeps after 15 min inactivity)
  └── Express backend
        └── Neon.tech (free serverless PostgreSQL)

Resend.com (free up to 3,000 emails/month)
  └── Transactional email (verification, password reset)
```

**Why this stack:**
- Cloudflare Pages is free with no bandwidth limits and no cold starts for static assets.
- Render's free web service has a 30-second cold start after 15 minutes of inactivity. Acceptable for an early-stage product with a handful of users; upgrade to the $7/mo starter service when cold starts become a problem.
- Neon's free tier gives 0.5 GB storage with a serverless Postgres instance that never expires. No 90-day expiry unlike Render's free PostgreSQL.
- Resend's free tier is 3,000 emails/month with 100/day — more than enough for early user acquisition.

**Total monthly cost: $0** until you're ready to pay for Render's always-on tier.

---

## Pre-deployment code changes

Three changes are required before deploying. None are large.

### 1. Wire up Resend email

The email service currently `console.log`s verification links. Real users need real emails.

Sign up at [resend.com](https://resend.com), create an API key, and verify your sender domain. Then update `backend/src/services/email.ts`:

```typescript
// backend/src/services/email.ts

const RESEND_API_URL = 'https://api.resend.com/emails'

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (process.env.NODE_ENV === 'test') return
  if (!process.env.EMAIL_API_KEY) {
    console.log(`[email] no EMAIL_API_KEY set — would send "${subject}" to ${to}`)
    return
  }
  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.EMAIL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend error ${res.status}: ${body}`)
  }
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const verifyUrl = `${process.env.APP_URL}/verify-email?token=${token}`
  await sendEmail(
    to,
    'Verify your email — DS-Gen',
    `<p>Click the link below to verify your email address:</p>
     <p><a href="${verifyUrl}">${verifyUrl}</a></p>
     <p>This link expires in 24 hours.</p>`,
  )
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`
  await sendEmail(
    to,
    'Reset your password — DS-Gen',
    `<p>Click the link below to reset your password:</p>
     <p><a href="${resetUrl}">${resetUrl}</a></p>
     <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
  )
}
```

The `NODE_ENV === 'test'` guard keeps all existing tests passing. The missing-key fallback means a misconfigured deployment logs rather than crashing.

### 2. Add Cloudflare Pages proxy rules

Create `frontend/public/_redirects` (Vite copies `public/` to `dist/` at build time):

```
/auth/*     https://YOUR-BACKEND.onrender.com/auth/:splat     200
/api/*      https://YOUR-BACKEND.onrender.com/api/:splat      200
/projects/* https://YOUR-BACKEND.onrender.com/projects/:splat 200
/*          /index.html                                        200
```

Replace `YOUR-BACKEND` with your actual Render service subdomain (you'll know it after Step 4 below). The `200` status code tells Cloudflare to proxy the request transparently — the browser sees all requests as same-origin, so cookies and `credentials: 'include'` work correctly.

The last line is the SPA fallback: any URL not matched by a static file is served `index.html` so React Router handles routing.

### 3. Update backend CORS

In `backend/src/app.ts`, replace the single-origin CORS config with one that accepts your Cloudflare Pages domain alongside localhost:

```typescript
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = [
        process.env.FRONTEND_URL,
        'http://localhost:5173',
        'http://localhost:5299',
      ].filter(Boolean)
      if (!origin || allowed.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error(`CORS: origin not allowed: ${origin}`))
      }
    },
    credentials: true,
  }),
)
```

Set `FRONTEND_URL=https://your-site.pages.dev` in Render's environment variables. Add your custom domain if you have one.

---

## Service setup

### Step 1 — Neon PostgreSQL

1. Create a free account at [neon.tech](https://neon.tech).
2. Create a new project. Name it `ds-gen-prod`.
3. From the Neon dashboard, copy the connection string: `postgresql://user:pass@host.neon.tech/neondb?sslmode=require`
4. Save it — you'll use it as `DATABASE_URL` in Render.

You do **not** need to run migrations yet. That happens during the Render deploy (Step 4).

### Step 2 — Resend email

1. Create a free account at [resend.com](https://resend.com).
2. Add and verify your sender domain (follow their DNS instructions). If you don't have a domain yet, you can use `onboarding@resend.dev` for testing — it's Resend's shared sender domain.
3. Create an API key. Copy it.

### Step 3 — Generate a JWT secret

Run this locally to generate a secure random secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Save the output. You'll use it as `JWT_SECRET` in Render.

### Step 4 — Render backend

1. Create a free account at [render.com](https://render.com).
2. Click **New → Web Service**.
3. Connect your GitHub repo.
4. Configure:

   | Setting | Value |
   |---|---|
   | **Name** | `ds-gen-backend` (or similar) |
   | **Root directory** | *(leave empty — monorepo root)* |
   | **Runtime** | Node |
   | **Build command** | `npm install && npm run build --workspace=backend && npm run migrate:up --workspace=backend` |
   | **Start command** | `node backend/dist/server.js` |
   | **Instance type** | Free |

   > **Note on the build command:** `npm run migrate:up --workspace=backend` runs `tsx migrate.ts up`. Since `tsx` is a devDependency that gets installed with `npm install`, this works during the build step. In production, migrations run at deploy time, before the new server binary starts.

5. Set environment variables:

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `3001` |
   | `DATABASE_URL` | *(from Neon — include `?sslmode=require`)* |
   | `JWT_SECRET` | *(generated in Step 3)* |
   | `JWT_EXPIRES_IN` | `7d` |
   | `FRONTEND_URL` | `https://your-site.pages.dev` *(update after Step 5)* |
   | `APP_URL` | `https://your-site.pages.dev` |
   | `EMAIL_API_KEY` | *(from Resend)* |
   | `EMAIL_FROM` | `hello@yourdomain.com` *(or `onboarding@resend.dev` for testing)* |

6. Deploy. Watch the build log — it should end with migration output and then `Server listening on port 3001`.

7. Copy your backend URL: `https://ds-gen-backend.onrender.com` (or whatever Render assigns).

8. **Update `frontend/public/_redirects`** with your actual backend URL, commit, and push.

### Step 5 — Cloudflare Pages (frontend + preview sandbox)

The build process bundles the preview sandbox into the frontend's dist directory so both are served from one Pages deployment.

1. Create a free account at [pages.cloudflare.com](https://pages.cloudflare.com).
2. Click **Create application → Pages → Connect to Git**.
3. Connect your GitHub repo.
4. Configure the build:

   | Setting | Value |
   |---|---|
   | **Project name** | `ds-gen` (becomes `ds-gen.pages.dev`) |
   | **Production branch** | `main` |
   | **Build command** | `npm install && npm run build --workspace=frontend && npm run build --workspace=preview-sandbox && mkdir -p frontend/dist/preview && cp -r preview-sandbox/dist/. frontend/dist/preview/` |
   | **Build output directory** | `frontend/dist` |

5. Set environment variables (under **Settings → Environment variables**):

   | Key | Value |
   |---|---|
   | `VITE_PREVIEW_SANDBOX_URL` | `https://ds-gen.pages.dev/preview` |

   > The preview sandbox is bundled into `frontend/dist/preview/` with `base: '/preview/'` in its Vite config, so its assets are at `/preview/assets/...`. The iframe src in `SystemPreview.tsx` points to `VITE_PREVIEW_SANDBOX_URL`, which resolves to the bundled sandbox on the same Cloudflare Pages deployment.

6. Deploy. The first deploy may take 2–3 minutes.

7. Visit `https://ds-gen.pages.dev`. You should see the landing page.

---

## Verify the deployment

**Basic smoke test:**
```bash
# Backend health
curl https://ds-gen-backend.onrender.com/health

# Register a user (through Cloudflare proxy)
curl -c cookies.txt -X POST https://ds-gen.pages.dev/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"displayName":"Test","email":"you@example.com","password":"securepassword123"}'
# Should return 201 with { message: "Registration successful..." }
```

**Check email:** After registering, the verification email should arrive. If it doesn't, check Render's logs for email errors and verify your Resend API key and sender domain.

**CLI smoke test:**
```bash
# 1. Register + verify + login via the UI, then go to /settings and copy your CLI token

# 2. Get your project ID from a project URL: /projects/<uuid>

# 3. Run the CLI
DS_GEN_TOKEN=<your-token> DS_GEN_API_URL=https://ds-gen-backend.onrender.com \
  node /path/to/cli/dist/index.js init --project=<your-project-id>
```

---

## Custom domain (optional)

Once deployed to Cloudflare Pages, you can add a custom domain at no extra cost:

1. In Cloudflare Pages → your project → **Custom domains → Add a custom domain**.
2. Enter your domain (e.g., `app.yourdomain.com`).
3. Add the CNAME record Cloudflare specifies.
4. Update `FRONTEND_URL` and `APP_URL` in Render to your custom domain.
5. Update `VITE_PREVIEW_SANDBOX_URL` in Cloudflare Pages to `https://app.yourdomain.com/preview`.
6. Redeploy both services.

If you use Cloudflare for DNS (recommended — it's free), the CNAME propagates instantly.

---

## Upgrading when you're ready

| When this happens | Upgrade |
|---|---|
| Users complain about slow first loads (30s cold start) | Upgrade Render to Starter ($7/mo) — no spindown |
| Database approaches 0.5 GB | Upgrade Neon to Launch ($19/mo) — 10 GB |
| Email volume exceeds 100/day | Upgrade Resend to Pro ($20/mo) — 50K/month |
| You need zero-downtime deploys | Add a Render deploy hook, enable health checks |
| Backend needs to scale horizontally | The in-process spec cache and rate limiter need Redis at this point (module-level state doesn't share across instances) |

---

## Environment variable reference

### Backend (Render)

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | Yes | Set to `production` |
| `PORT` | Yes | `3001` — Render uses this to route traffic |
| `DATABASE_URL` | Yes | Full Neon connection string with `?sslmode=require` |
| `JWT_SECRET` | Yes | Min 32 chars, random hex. Never rotate without invalidating all sessions. |
| `JWT_EXPIRES_IN` | No | Default `7d`. |
| `FRONTEND_URL` | Yes | Your Cloudflare Pages URL. Used for CORS and cookies. |
| `APP_URL` | Yes | Same as FRONTEND_URL. Used in email verification/reset links. |
| `EMAIL_API_KEY` | Yes | Resend API key. Without it, email logs to console but doesn't send. |
| `EMAIL_FROM` | Yes | Sender address. Must match a verified Resend sender domain. |
| `SENTRY_DSN` | No | Optional. Add for production error tracking. |

### Frontend (Cloudflare Pages)

| Variable | Required | Notes |
|---|---|---|
| `VITE_PREVIEW_SANDBOX_URL` | Yes | URL of the preview sandbox. If bundled with frontend: `https://your-site.pages.dev/preview` |

---

## What is NOT deployed

- **CLI (`@ds-gen/cli`):** Not published to npm. Users run it directly via `node dist/index.js` or install from a local path. Publish to npm when the product is ready for broader distribution: `cd cli && npm publish --access public`.
- **Test database:** `TEST_DATABASE_URL` is only needed for local development and CI. Do not configure it on Render production.
- **`packages/types`:** This is a local workspace dependency, not a published npm package. It's imported directly by other packages via the TypeScript path aliases.
