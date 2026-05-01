# Design System Generator — Development Plan

**Version:** 1.0
**Stack:** Node.js + TypeScript · Express · Postgres · node-pg-migrate · React + TypeScript · Vite · Tailwind CSS · Zustand · React Router · shadcn/ui (builder UI only) · cva · Base UI · Playwright
**Context:** Solo developer using AI-assisted development. This document is the primary engineering context for all development sessions. The product specification (`design-system-spec.md`) should be read alongside this plan for full behavioral detail.

> **Summary doc:** [`design-system-plan-summary.md`](./design-system-plan-summary.md) contains a concise one-paragraph summary and status for each phase. When phase goals, scope, or status change in this document, update the summary doc to match.

---

## Principles

- **Pipeline first, UI second.** The generation pipeline is the core of the product. It must be fully functional and tested before any UI is built around it.
- **Every phase ends with something runnable.** No phase produces only infrastructure.
- **The pipeline is a pure function.** `generate(config: ProjectConfig): GeneratedSystem` has no side effects, no DB reads, no network calls. It is deterministic: the same config always produces the same output. This makes it trivially testable and trivially cacheable.
- **The output is the product.** Generated files must be production-quality. Test the output files directly, not just that generation didn't throw.
- **Accessibility is enforced at the pipeline level.** Contrast validation runs inside the pipeline, not in the UI. The UI cannot produce an inaccessible system.
- **Complexity lives on the server.** The CLI, the Figma token file, the agent API — all are thin renderings of the server-side `GeneratedSystem`. Nothing generation-related lives client-side.

---

## Repository Structure

```
/
├── AGENTS.md
├── SESSION_LOG.md
├── packages/
│   └── types/
│       ├── src/
│       │   ├── config.ts        # ProjectConfig and all sub-types
│       │   ├── output.ts        # GeneratedSystem, GeneratedFile, TokenSet, ComponentSpec
│       │   └── api.ts           # Request/response shapes for all API routes
│       └── package.json
├── backend/
│   ├── src/
│   │   ├── api/                 # Express route handlers (thin — delegate to services)
│   │   │   ├── projects.ts
│   │   │   ├── generate.ts      # Export and agent API endpoints
│   │   │   ├── auth.ts
│   │   │   └── health.ts
│   │   ├── pipeline/            # The generation pipeline — pure functions only
│   │   │   ├── index.ts         # generate(config): GeneratedSystem — entry point
│   │   │   ├── tokens/
│   │   │   │   ├── primitives.ts   # Color scale generation, spacing, type, radius, shadow
│   │   │   │   ├── semantic.ts     # Role mapping, dark mode pairs
│   │   │   │   ├── component.ts    # Per-component token assignments
│   │   │   │   └── accessibility.ts # WCAG contrast validation and auto-correction
│   │   │   ├── components/
│   │   │   │   ├── index.ts        # Dispatches to per-component generators
│   │   │   │   ├── button.ts
│   │   │   │   ├── input.ts
│   │   │   │   ├── select.ts
│   │   │   │   └── ...             # One file per component
│   │   │   ├── docs/
│   │   │   │   ├── readme.ts       # README.md generator
│   │   │   │   ├── tokens-doc.ts   # tokens.md generator
│   │   │   │   ├── components-doc.ts # components.md generator
│   │   │   │   ├── decisions.ts    # decisions.md — rationale templates
│   │   │   │   └── agent-spec.ts   # agent-spec.json generator
│   │   │   ├── export/
│   │   │   │   ├── w3c.ts          # Serializes token sets to W3C DTCG JSON
│   │   │   │   ├── css.ts          # Serializes tokens to CSS custom properties
│   │   │   │   ├── tailwind.ts     # Generates tailwind.config.ts content
│   │   │   │   └── zip.ts          # Assembles GeneratedSystem into a ZIP buffer
│   │   │   └── palette/
│   │   │       ├── generator.ts    # Generates full color scales from a seed color
│   │   │       ├── personalities.ts # Default token values per personality combination
│   │   │       └── defaults.ts     # System-wide default config values
│   │   ├── db/
│   │   │   ├── migrations/
│   │   │   └── queries/
│   │   │       ├── users.ts
│   │   │       └── projects.ts
│   │   ├── services/
│   │   │   ├── auth.ts
│   │   │   └── project.ts
│   │   └── middleware/
│   │       └── auth.ts
│   ├── tests/
│   │   ├── pipeline/            # Unit tests — generation pipeline only
│   │   │   ├── tokens/
│   │   │   ├── components/
│   │   │   └── output/          # Tests that validate generated file content
│   │   └── api/                 # Integration tests — routes + DB
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── flow/            # The creation flow stages
│   │   │   │   ├── Stage1Foundation.tsx
│   │   │   │   ├── Stage2Style.tsx
│   │   │   │   ├── Stage3Review.tsx
│   │   │   │   └── Stage4Export.tsx
│   │   │   ├── preview/         # System Preview iframe + postMessage bridge
│   │   │   │   └── SystemPreview.tsx
│   │   │   ├── home/
│   │   │   └── shared/
│   │   ├── store/
│   │   │   ├── configStore.ts   # The live ProjectConfig being built — single source of truth
│   │   │   └── uiStore.ts       # Stage index, panel state, etc.
│   │   └── hooks/
│   ├── tests/
│   │   ├── unit/
│   │   └── e2e/                 # Playwright
│   └── vite.config.ts
├── preview-sandbox/             # Separate Vite build — the iframe preview app
│   ├── src/
│   │   ├── main.tsx             # Listens for postMessage, re-renders on config change
│   │   ├── TokenApplicator.tsx  # Writes CSS custom properties to :root
│   │   └── SystemPreviewLayout.tsx  # The curated preview display
│   └── vite.config.ts
└── cli/                         # The npx CLI package
    ├── src/
    │   └── index.ts             # Thin file writer — reads manifest, writes files
    └── package.json             # Published as @ds-gen/cli
```

---

## Environment Variables

```bash
# Server
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
PREVIEW_SANDBOX_URL=http://localhost:5174

# Auth
JWT_SECRET=                        # Min 32 chars, random
JWT_EXPIRES_IN=7d

# Database
DATABASE_URL=                      # postgres://user:pass@host:port/dbname
TEST_DATABASE_URL=                 # separate DB for tests — never production

# Email (Phase 1 — account creation)
EMAIL_PROVIDER=resend              # resend | sendgrid
EMAIL_API_KEY=
EMAIL_FROM=noreply@yourapp.com
APP_URL=http://localhost:5173

# Monitoring (optional but recommended)
SENTRY_DSN=
```

No Redis. No worker threads. No Stripe in V1. The generation pipeline runs synchronously in the Express process — generation time for a typical config is well under 100ms, making async processing unnecessary.

---

## Database Schema

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_users_email ON users(email);

CREATE TABLE email_verification_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ
);
CREATE INDEX idx_email_tokens_user ON email_verification_tokens(user_id);

CREATE TABLE password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ
);

CREATE TABLE user_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  jti           TEXT UNIQUE NOT NULL,
  device_hint   TEXT,
  ip_address    INET,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_jti  ON user_sessions(jti);

CREATE TABLE projects (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL DEFAULT 'My Design System',
  slug           TEXT NOT NULL,              -- URL-safe, unique per user
  config         JSONB NOT NULL,             -- Full ProjectConfig object
  last_exported_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE UNIQUE INDEX idx_projects_slug ON projects(user_id, slug);

-- Created now, not used until a future version
CREATE TABLE project_snapshots (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  config     JSONB NOT NULL,
  label      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_snapshots_project ON project_snapshots(project_id);
```

---

## The `ProjectConfig` Type

This is the central type of the system. It is defined in `packages/types/src/config.ts` and must be updated before any implementation that changes the config shape.

```typescript
export type ProjectType = 'saas' | 'marketing' | 'mobile'

export type ComponentCategory =
  | 'forms'
  | 'navigation'
  | 'overlays'
  | 'feedback'
  | 'data-display'
  | 'layout'

export type ColorMode = 'light' | 'dark'

export type Density = 'compact' | 'balanced' | 'spacious'
export type Personality = 'professional' | 'approachable' | 'bold' | 'minimal'
export type TypeStyle = 'geometric' | 'humanist' | 'serif-accented' | 'monospace-accented'
export type Dimensionality = 'flat' | 'subtle' | 'dimensional'

export type ColorSource = 'provided' | 'generated'
export type ColorDirection =
  | 'cool-professional'
  | 'warm-approachable'
  | 'bold-high-contrast'
  | 'neutral-minimal'
  | 'earth-tones'

export interface ColorConfig {
  source: ColorSource
  // If source === 'provided', primaryHex is set by the user.
  // If source === 'generated', primaryHex is derived from colorDirection.
  primaryHex: string
  secondaryHex?: string
  accentHex?: string
  colorDirection?: ColorDirection      // Only set if source === 'generated'
  neutralFamily: 'gray' | 'slate' | 'zinc' | 'stone' | 'warm-gray'
}

export interface TypographyConfig {
  source: 'provided' | 'chosen'
  typeStyle: TypeStyle
  displayFace: string      // Google Fonts name
  bodyFace: string
  codeFace: string
  scaleRatio: 1.2 | 1.25 | 1.333
}

export interface ShapeConfig {
  density: Density
  personality: Personality
  dimensionality: Dimensionality
}

export interface ProjectConfig {
  projectType: ProjectType
  componentScope: ComponentCategory[]
  modes: ColorMode[]
  color: ColorConfig
  typography: TypographyConfig
  shape: ShapeConfig
}
```

### Default Config

The default config (used when no choices have been made) is defined in `backend/src/pipeline/palette/defaults.ts` and exported from `packages/types`:

```typescript
export const DEFAULT_CONFIG: ProjectConfig = {
  projectType: 'saas',
  componentScope: ['forms', 'navigation', 'overlays', 'feedback', 'data-display', 'layout'],
  modes: ['light'],
  color: {
    source: 'generated',
    primaryHex: '#3b82f6',   // blue-500 — one of 8 rotating safe defaults
    colorDirection: 'cool-professional',
    neutralFamily: 'slate',
  },
  typography: {
    source: 'chosen',
    typeStyle: 'geometric',
    displayFace: 'Inter',
    bodyFace: 'Inter',
    codeFace: 'JetBrains Mono',
    scaleRatio: 1.25,
  },
  shape: {
    density: 'balanced',
    personality: 'professional',
    dimensionality: 'subtle',
  },
}
```

---

## API Routes

```
# Auth
POST   /auth/register              # { email, password, displayName }
POST   /auth/verify-email          # { token }
POST   /auth/login                 # { email, password } → JWT in httpOnly cookie
POST   /auth/logout                # Revokes session
POST   /auth/forgot-password       # { email }
POST   /auth/reset-password        # { token, newPassword }
GET    /auth/me                    # → { user }

# Projects
GET    /projects                   # → { projects[] } — authenticated user's projects
POST   /projects                   # { name?, config } → { project }
GET    /projects/:id               # → { project }
PATCH  /projects/:id               # { name?, config } → { project }
DELETE /projects/:id               # 204

# Generation
POST   /projects/:id/export        # Runs pipeline, updates last_exported_at
                                   # → { files: GeneratedFile[] } or ZIP stream
GET    /projects/:id/export.zip    # ZIP download — runs pipeline, streams ZIP

# Agent API (public — no auth)
GET    /api/v1/systems/:projectId/spec    # → agent-spec.json from live config

# CLI manifest (requires CLI auth token)
GET    /api/v1/systems/:projectId/manifest  # → { files: [{path, content}] }

# Health
GET    /health                     # → { db: 'ok', status: 'ok' }
```

---

## Performance Targets

| Operation | Target | Test method |
|---|---|---|
| `generate(defaultConfig)` end-to-end | < 100ms | Pipeline unit test |
| `generate(fullConfig)` — all categories, dual mode | < 200ms | Pipeline unit test |
| ZIP assembly (all files, full config) | < 500ms | Pipeline unit test |
| `GET /api/v1/systems/:id/spec` response | < 200ms p95 | API integration test |
| `GET /projects/:id/export.zip` response | < 1000ms p95 | API integration test |
| System Preview re-render after config change | < 500ms | Playwright visual test |

---

## Phase 0 — Pipeline Foundation

**Goal:** The generation pipeline is fully functional and tested before any API or UI is built. At the end of this phase: `generate(config)` produces correct, accessible, well-formed output for any valid `ProjectConfig`. No server, no database, no frontend.

This phase is entirely TypeScript unit tests driving pure functions. Nothing is deployed. The pipeline is the hardest and most important part of the product — it must be solid before anything is built around it.

### Pipeline Implementation — Phase 0

**Step 0.1 — Types and defaults**

Implement `packages/types/src/config.ts` (full `ProjectConfig` type), `packages/types/src/output.ts` (`GeneratedSystem`, `GeneratedFile`, `TokenSet`), and `backend/src/pipeline/palette/defaults.ts`. Write no pipeline logic yet — just the types and the default config constant.

Tests:
- `DEFAULT_CONFIG` is a valid `ProjectConfig` (passes Zod schema validation)
- All required fields are present with correct types

**Step 0.2 — Color scale generation**

Implement `backend/src/pipeline/palette/generator.ts`. Given a seed hex color, produce a 19-step scale from shade 50 to 950 (in increments of 50) using the contrast-targeting algorithm described in the spec.

The developer will provide an existing script implementing this algorithm during Phase 0. The task is to integrate it into the pipeline as `generator.ts`, adapting it as needed to:
- Accept a seed hex string and return a `ColorScale` type (`Record<number, string>` with keys 50, 100, 150, ... 950)
- Export a `TARGET_CONTRASTS` constant: the fixed per-shade contrast target values against white (shades 50–450) and black (shades 500–950). These constants must be at the top of the file and clearly documented — they are the definition of the cross-hue consistency guarantee
- Handle gray/neutral seeds correctly (the algorithm works on brightness adjustments via `chroma-js`, so no special-casing is needed)
- Be a pure function with no side effects

**Library:** `chroma-js` (already used by the reference script). Install as a production dependency of `backend`.

**If the reference script is being rewritten** (acceptable and encouraged if a cleaner implementation achieves the same output): the requirement is that the output satisfies the same contrast consistency property — `TARGET_CONTRASTS[shade]` is the target contrast ratio for that shade, and the generated hex value for every hue at that shade hits within ±0.3 of the target when measured by `contrastRatio()`. The implementation approach is flexible; the output contract is not.

Tests:
- Given `#3b82f6` (blue) and `#e63946` (red), both produce 19-step scales
- Scale keys are exactly: 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950
- Shade 50 is visually near-white for any chromatic input; shade 950 is visually near-black
- **Cross-hue contrast consistency test:** for shades 50–450, the contrast ratio of each shade against white is within ±0.3 of `TARGET_CONTRASTS[shade]` for at least three distinct hues (blue, red, green). For shades 500–950, the contrast ratio against black meets the same tolerance.
- A gray seed (`#808080`) produces a valid grayscale with no errors
- Arbitrary hues (red, green, purple, orange) all produce valid scales
- The function is pure: identical inputs produce identical outputs

**Step 0.3 — WCAG contrast validation**

Implement `backend/src/pipeline/tokens/accessibility.ts`.

Functions:
- `contrastRatio(hex1: string, hex2: string): number` — WCAG relative luminance formula
- `meetsAA(foreground: string, background: string, largeText?: boolean): boolean`
- `meetsAAA(foreground: string, background: string, largeText?: boolean): boolean`
- `findAccessibleStep(scale: ColorScale, background: string, minRatio: number): string` — returns the nearest step that meets the ratio

Tests:
- `#ffffff` on `#ffffff`: ratio = 1.0 (fails all)
- `#000000` on `#ffffff`: ratio ≈ 21.0 (passes all)
- `#3b82f6` on `#ffffff`: known ratio computed and asserted
- `findAccessibleStep` finds a passing step for a known failing input
- `findAccessibleStep` returns the input step if it already passes

**Step 0.4 — Primitive token generation**

Implement `backend/src/pipeline/tokens/primitives.ts`. Given a `ProjectConfig`, produce the full primitive token set.

Output structure:
```typescript
interface PrimitiveTokenSet {
  colors: Record<string, ColorScale>    // { blue: { 50: '#...', 100: '#...', ... } }
  spacing: Record<string, string>       // { 'space-1': '4px', ... }
  typeSizes: Record<string, string>     // { 'text-xs': '0.75rem', ... }
  radii: Record<string, string>
  shadows: Record<string, string>
}
```

Color scales: one full scale per hue family present in the config (primary, optional secondary, optional accent, neutral). For provided hex values, the scale is generated by `palette/generator.ts` with the provided hex anchored.

Spacing: base unit from density mapping (compact=3, balanced=4, spacious=5), multiplied by the fixed step multipliers.

Type sizes: base 16px, ratio from `typography.scaleRatio`, 7 steps (xs through 5xl) as rem values rounded to 3 decimal places.

Radii: four steps derived from `shape.personality` mapping table.

Shadows: three steps derived from `shape.dimensionality` mapping table. Flat personality → all `none`.

Tests:
- Default config produces non-empty primitive set
- Primary scale has exactly 19 steps with keys 50, 100, 150 ... 950
- Spacing scale has the correct number of steps with correct px values for each density
- Type scale has correct rem values for each ratio
- Flat dimensionality produces all-`none` shadows
- Dual-mode config produces identical primitive set (primitives are mode-agnostic)

**Step 0.5 — Semantic token generation**

Implement `backend/src/pipeline/tokens/semantic.ts`. Given a `PrimitiveTokenSet` and the `ProjectConfig`, produce the semantic token set. For each semantic color pairing, validate WCAG AA and auto-correct if failing.

Auto-correction: if `color.action.primary` (foreground-on-white context) fails AA, call `findAccessibleStep` to find the nearest darker step that passes. Replace the token assignment with the corrected step. Record the correction in a `corrections` array on the `SemanticTokenSet` so it can be surfaced in the UI.

Tests:
- Default config produces semantic set with all required keys (see spec Section 6 for the full list)
- All foreground/background pairs in the output meet WCAG AA
- A deliberately undersaturated/light primary color triggers auto-correction
- Dual-mode config produces distinct light and dark values for every semantic color token
- Single-mode config produces only one value per token

**Step 0.6 — Component token generation**

Implement `backend/src/pipeline/tokens/component.ts`. Map shape config to per-component token values.

Tests:
- Default config produces component tokens for all Tier 1 components
- Compact density produces smaller padding values than spacious density
- Sharp personality produces smaller radius values than rounded personality

**Step 0.7 — Component code generation**

Implement `backend/src/pipeline/components/index.ts` and one file per component. Each generator is a function that takes the `ProjectConfig` and token sets and returns a string of valid TypeScript/TSX source code.

Implementation approach: template strings, not an AST. The generated code is simple enough that template strings are readable and maintainable. Templates live as TypeScript functions — each component generator is a function that returns a string.

Generated code requirements:
- Passes TypeScript type checking (`tsc --noEmit` on the generated content)
- Uses only CSS custom property references for all visual values
- Imports Base UI via `@base-ui-components/react/{component}`
- Exports a named function component and a separately exported types file
- No console.log, no TODO comments, no placeholder values

Tests:
- Each component generator returns a non-empty string
- The generated Button code contains all four variant strings
- The generated Button code contains all three size strings
- Generated code for a scope-excluded component is not in the output
- A script that writes generated component files and runs `tsc --noEmit` on them passes (this is a pipeline output validation test — see Step 0.10)

**Step 0.8 — Documentation generation**

Implement `backend/src/pipeline/docs/`. Each doc generator takes the `GeneratedSystem` intermediate object and returns a markdown or JSON string.

`decisions.ts` — the rationale template system. Each decision category (type scale, radius, color approach, etc.) maps to a template function that takes the relevant config values and returns a paragraph of design-literate explanation. Templates are written once and validated by review — they are not generated by an LLM.

Tests:
- `readme.ts` output contains the installation section
- `tokens-doc.ts` output contains every semantic token name
- `decisions.ts` output for default config contains at least one paragraph per decision category
- `agent-spec.ts` output is valid JSON that parses without error
- `agent-spec.ts` output contains all component names from the scope

**Step 0.9 — Export serialization**

Implement `backend/src/pipeline/export/`. Serializers convert the in-memory `GeneratedSystem` to file content strings.

`w3c.ts`: Converts `TokenSet` objects to W3C DTCG JSON format. The format uses `$value` and `$type` keys. Color values are hex strings. References use the `{path.to.token}` syntax.

`css.ts`: Converts semantic and component tokens to CSS custom property declarations. Flattens the nested token structure using hyphens: `color.action.primary` → `--color-action-primary`. Wraps light values in `:root {}` and dark values in `[data-theme="dark"] {}`.

`tailwind.ts`: Generates a `tailwind.config.ts` that extends the Tailwind theme. Color tokens map to the `colors` key. Spacing tokens map to `spacing`. Typography tokens map to `fontFamily` and `fontSize`.

`zip.ts`: Takes the full file manifest (path + content pairs) and assembles a ZIP buffer using the `jszip` package.

Tests:
- `w3c.ts` output parses as valid JSON and contains `$value` and `$type` keys
- `css.ts` output contains `:root {` and expected custom property names
- `css.ts` output with dual-mode config contains `[data-theme="dark"] {`
- `tailwind.ts` output is valid TypeScript (checked via `tsc --noEmit` on generated content)
- `zip.ts` output is a valid ZIP containing all expected file paths

**Step 0.10 — Full pipeline integration test**

Implement `backend/src/pipeline/index.ts` — the `generate` entry point that calls all sub-generators in sequence and assembles the `GeneratedSystem`.

Write a comprehensive integration test: call `generate(DEFAULT_CONFIG)` and validate the full output.

Tests:
- Output contains all expected file paths
- All three W3C JSON files parse without error and have the correct structure
- CSS file contains `:root` block with all semantic custom properties
- Tailwind config file is valid TypeScript
- All component files are non-empty strings
- All doc files are non-empty strings
- `agent-spec.json` is valid JSON with all required fields
- No generated file contains the string "TODO" or "placeholder"
- All WCAG contrast requirements are met in the semantic token output (validate programmatically)
- Generation completes in under 200ms for default config
- Generation completes in under 200ms for full config (all categories, dual mode, all personality combinations)

---

## Phase 1 — Backend and Auth

**Goal:** Working Express server with auth, project CRUD, and generation endpoints. The pipeline from Phase 0 is wired to real API routes. A user can register, save a project, and download a ZIP via API.

### Backend — Phase 1

**Auth implementation:**

Registration (`POST /auth/register`):
1. Validate email format and password minimum length (12 chars)
2. Hash password with `bcrypt` (cost factor 12)
3. Insert user with `email_verified = false`
4. Generate 32-byte random token, insert into `email_verification_tokens` (24-hour expiry)
5. Send verification email via configured provider
6. Return 201 — no session issued yet

Email verification (`POST /auth/verify-email`):
1. Look up token, check not used and not expired
2. Set `email_verified = true`, mark token used
3. Issue JWT — insert `user_sessions` record with `jti`
4. Return JWT in httpOnly cookie with `SameSite=Strict`

Login (`POST /auth/login`):
1. Find user by email, check email_verified
2. Compare password with bcrypt
3. Issue JWT session
4. Return JWT in httpOnly cookie

JWT middleware: on every authenticated request, verify the JWT, then check that `jti` exists in `user_sessions`. Revoked sessions (deleted rows) return 401. Update `last_active_at` on valid sessions.

**Project routes:**

All project routes require authentication. Project ownership is enforced: a user can only read, modify, or delete their own projects.

`POST /projects`: Validate the `config` field against the `ProjectConfig` Zod schema. Reject invalid configs with 400. Generate the `slug` from the project name (kebab-case, unique per user — append a short random suffix on collision).

`PATCH /projects/:id`: Accepts partial `config` updates. Deep-merges the provided partial config with the existing config. Validates the resulting merged config.

`POST /projects/:id/export`: Calls `generate(project.config)`, updates `last_exported_at`, returns the full file manifest as JSON.

`GET /projects/:id/export.zip`: Calls `generate(project.config)`, calls `zip.ts`, streams the ZIP. Sets `Content-Disposition: attachment; filename="{project-slug}.zip"`.

**Agent API:**

`GET /api/v1/systems/:projectId/spec`: No auth. Looks up the project by ID, calls `generate(project.config)`, returns the `agent-spec.json` content as JSON. Rate-limited to 60 requests/minute per IP.

**CLI manifest endpoint:**

`GET /api/v1/systems/:projectId/manifest`: Requires a CLI auth token (a separate long-lived token stored in the `user_sessions` table with `device_hint = 'cli'`). Returns the full file manifest.

Tests:
- Register: creates user with `email_verified = false`
- Verify email: valid token → user verified + session issued; expired → 400; already used → 400
- Login: correct credentials → session; wrong password → 401; unverified email → 403
- Session revocation: deleted `jti` → 401 on subsequent requests
- `POST /projects`: valid config → project created; invalid config → 400 with error details
- `POST /projects`: config without `color.primaryHex` → 400
- `GET /projects/:id`: another user's project → 403
- `POST /projects/:id/export`: returns file manifest with all expected paths
- `GET /projects/:id/export.zip`: returns a valid ZIP
- `GET /api/v1/systems/:projectId/spec`: no auth → 200; non-existent project → 404

### Frontend — Phase 1 (stub only)

The frontend in Phase 1 is a minimal stub: a login page and a home page that lists projects from the API. No creation flow yet. This establishes the frontend build, the Zustand store structure, and the auth/routing pattern before the flow is built.

**Zustand stores:**

```typescript
// configStore.ts — the live ProjectConfig under construction
interface ConfigStore {
  config: ProjectConfig           // Current state — initialized to DEFAULT_CONFIG
  setConfig: (partial: Partial<ProjectConfig>) => void
  resetConfig: () => void
}

// uiStore.ts — UI state only
interface UIStore {
  currentStage: 0 | 1 | 2 | 3    // Which creation flow stage is active
  setStage: (stage: number) => void
  isSaving: boolean
  lastSavedAt: Date | null
}

// userStore.ts — authenticated user
interface UserStore {
  user: { id: string; email: string; displayName: string } | null
  isLoading: boolean
  fetchUser: () => Promise<void>
}
```

**Routes:**
- `/` — Home page (project list or empty state)
- `/login` — Login page
- `/register` — Register page
- `/new` — Creation flow (stub in Phase 1 — just shows Stage 1 placeholder)
- `/projects/:id` — Creation flow for saved project

**Playwright — Phase 1:**
- Register → verify email (intercept via nodemailer test transport) → login → home page shows empty state
- Login with wrong password → error message shown

---

## Phase 2 — Creation Flow

**Goal:** The full four-stage creation flow is implemented. System Preview is live and responsive. Users can complete the flow and download a ZIP without an account. The experience of making a choice and seeing the System Preview update within 500ms is working end-to-end.

### Preview Sandbox — Phase 2

The `preview-sandbox/` is a separate Vite application. It:

1. On mount, posts `{ type: 'READY' }` to the parent window
2. Listens for `{ type: 'CONFIG_UPDATE', config: ProjectConfig }` messages
3. On receipt, calls a local `generatePreviewTokens(config)` function — a client-side subset of the pipeline that computes CSS custom properties without network round-trips
4. Writes the CSS custom properties to a `<style>` tag on `:root`
5. Re-renders the `SystemPreviewLayout` component

`generatePreviewTokens` is a simplified version of the server-side pipeline that runs in the browser. It produces only the CSS custom properties — not the full W3C JSON, not the component code. The server-side pipeline remains authoritative; this is only for live preview updates.

The `SystemPreview` component in the frontend wraps the iframe and the `postMessage` bridge:
- On `configStore` change, debounces 50ms, sends `CONFIG_UPDATE` message
- Shows a loading skeleton until `READY` is received
- If the iframe fails to load, shows a fallback static preview

### Stage Implementations — Phase 2

All four stages are implemented. Each stage reads from and writes to `configStore`. Config changes are persisted to `localStorage` for anonymous users so a page refresh doesn't lose progress.

**Stage 1 — Foundation:**
- Project type cards: styled selection cards with icon, label, description. One is pre-selected.
- Scope summary chips: row of chips, each showing a category name. "Customize" disclosure reveals a checklist.
- Brand assets toggle: two-option toggle revealing appropriate input fields.
- Color direction cards: five visual cards showing palette swatches.
- Mode selection: three-option selection.

**Stage 2 — Style:**
- Four axis sections, each showing a row of visual cards. Currently selected option has a distinct selected state.
- Each axis has a "Customize" disclosure showing fine-grained controls.
- The disclosure is a smooth animated expand/collapse.

**Stage 3 — Review:**
- Full System Preview in the primary content area.
- Token summary: collapsible sections for each token layer. Values shown as swatches or formatted text.
- Project name input.
- "Back to adjust" links for each major decision area navigate back to the relevant stage step.

**Stage 4 — Export:**
- Three CTAs: Download ZIP, CLI command, Figma setup guide.
- Account prompt for anonymous users (soft gate).

**Navigation:**
- Stage progress indicator at the top (four steps, current step highlighted).
- "Back" and "Continue" buttons. "Continue" is disabled until the current stage's required choices are complete.
- Stage 1 required: project type selection. Stage 2 required: all four axes selected (defaults count). Stage 3 required: project name entered. Stage 4: no required action.

### Playwright — Phase 2

- Complete flow from default state → download ZIP → verify ZIP contains expected files
- Change project type → scope chips update to reflect new defaults
- Change a personality axis → System Preview updates (assert iframe received postMessage within 500ms)
- Enter a brand color → System Preview updates with the new primary color
- Complete flow without account → ZIP downloads; no account required

---

## Phase 3 — Accounts and Persistence

**Goal:** Account creation, login, and project saving are fully integrated into the flow. Users can return to saved projects and re-export. Home page is complete.

### Frontend — Phase 3

**Account prompt integration:**
- At Stage 4, the account prompt is shown for anonymous users.
- "Save my project" → triggers account creation modal (email + password + display name). On success, the anonymous `ProjectConfig` from `configStore` is posted to `POST /projects`, and the user is shown their saved project.
- "Just download" → proceeds without saving. The `ProjectConfig` is retained in `localStorage` only.

**Saved project flow:**
- Navigating to `/projects/:id` loads the project config from the API and populates `configStore`.
- All stage UIs reflect the loaded config.
- Changes to the config auto-save to the API via debounced `PATCH /projects/:id` (500ms debounce, only if user is authenticated).
- A "Saved" / "Saving..." indicator is shown in the header.

**Home page:**
- Grid of project cards.
- Each card: project name, project type chip, mode chips, last exported timestamp, palette thumbnail (the first 5 steps of the primary color scale as colored dots).
- Card overflow menu: Rename (inline edit), Duplicate (`POST /projects` with the existing config and a new name), Delete (confirmation dialog).
- "New project" button → navigates to `/new` with fresh default config.

### Playwright — Phase 3

- Complete flow → create account via prompt → project saved → reload page → project listed on home page
- Return to saved project → config reflected in all stages
- Export saved project → ZIP downloads with project name in filename
- Home page: duplicate project → both appear in list; delete project → removed from list

---

## Phase 4 — CLI and Agent API

**Goal:** The CLI tool is published and functional. The agent API endpoint is live and returns correct output. Both are documented.

### CLI — Phase 4

The CLI package lives in `cli/src/index.ts` and is published to npm as `@ds-gen/cli`.

**`init` command flow:**
1. Check for `~/.ds-gen/config.json` — if missing, prompt for auth token (instructions for getting it from the platform settings page are shown inline)
2. Read `--project` flag for project ID
3. Fetch manifest from `GET /api/v1/systems/:projectId/manifest` with auth token
4. For each file in the manifest: create directories as needed, write file content
5. Write `.design-system-meta.json` with project ID, slug, and generation timestamp
6. Print a success summary: files written, directory used, next steps

**`sync` command flow:**
1. Read `.design-system-meta.json` from current directory (error if not found)
2. Fetch manifest using the stored project ID
3. Write all files (overwrite existing)
4. Update `.design-system-meta.json` timestamp

The CLI has no knowledge of file structure. Everything comes from the manifest. The manifest is generated by `export/zip.ts` — same source as the ZIP download.

**Settings page (frontend):** Add a "CLI" section to account settings showing: auth token (revealed on click with copy button), revoke token button, instructions for `init` and `sync` commands.

### Agent API — Phase 4

`GET /api/v1/systems/:projectId/spec` is live from Phase 1 (it was implemented as part of the backend). Phase 4 adds:
- Rate limiting: 60 requests/minute per IP via `express-rate-limit`
- Response caching: cache the generated spec in memory for 60 seconds per project ID (in-process cache, no Redis). Invalidated on `PATCH /projects/:id`.
- A link to the agent API endpoint is shown on the project home/export page: "Your agent API URL: `https://yourapp.com/api/v1/systems/{id}/spec`"

### Playwright — Phase 4

- CLI: `npx @ds-gen/cli init --project={id}` (run via `execSync` in test) writes expected files to a temp directory
- Agent API: `GET /api/v1/systems/:id/spec` → valid JSON with all required fields
- Agent API: non-existent ID → 404
- Agent API: rate limit exceeded → 429

---

## Dependency Map

| Dependency | Required by |
|---|---|
| `packages/types` — full `ProjectConfig` and output types | Phase 0 (before any pipeline code) |
| Color scale generator | Primitive token generation |
| Primitive token generation | Semantic token generation |
| Semantic token generation (with contrast validation) | Component token generation, component code generation |
| All token generators | Full pipeline integration test (Phase 0) |
| Full pipeline | Phase 1 API routes |
| Phase 1 API routes | Phase 2 frontend (fetches projects, posts config) |
| Phase 2 creation flow | Phase 3 account integration (flow must exist to prompt account creation within it) |
| Phase 1 export endpoints | Phase 4 CLI (calls manifest endpoint) |
| Phase 1 agent API endpoint | Phase 4 (adds rate limiting and caching) |

---

## Testing Strategy

### Pipeline Unit Tests (Phase 0 — before any other code)

The pipeline unit tests are the most important tests in the codebase. They verify that `generate(config)` produces correct, accessible, usable output.

- **Color scale:** Each generated scale has the correct number of steps. Steps are monotonically lighter from 950 to 50. Chroma tapers at extremes.
- **Accessibility:** Every semantic foreground/background pair in the output meets WCAG AA. This test runs for every personality combination and both color modes.
- **Token completeness:** Output contains all required semantic token keys. No required token is missing from any valid config.
- **Component code correctness:** Generated TypeScript compiles without errors. Generated code references only semantic/component tokens, never primitives.
- **Doc completeness:** Generated docs contain all token names. `agent-spec.json` contains all component names in scope.
- **Performance:** Generation completes under 200ms for worst-case config (full scope, dual mode).
- **Determinism:** `generate(config)` called twice with identical input produces byte-identical output.

### API Integration Tests (Phase 1)

- All auth flows: registration, verification, login, session revocation, password reset
- All project CRUD: ownership enforcement, config validation, slug generation
- Export endpoint: returns correct file manifest
- ZIP endpoint: returns valid ZIP with expected file paths
- Agent API: correct response shape, rate limiting, 404 for unknown project

### Frontend Component Tests (Phase 2–3)

- Stage 1: selecting project type updates scope chips
- Stage 2: selecting personality axis updates `configStore`
- Stage 2: "Customize" disclosure expands and shows fine-grained controls
- Stage 4: anonymous user sees account prompt; clicking "Just download" triggers download
- Home page: project cards show correct data; overflow menu actions work

### Playwright End-to-End

- Phase 1: register → verify → login → home page
- Phase 2: complete creation flow → download ZIP → verify ZIP contents
- Phase 2: config change → System Preview updates within 500ms
- Phase 3: complete flow → create account → project saved → return → config intact
- Phase 4: CLI init → files written to expected paths

### Output Validation Tests

A dedicated test suite in `backend/tests/pipeline/output/` validates the content of generated files by actually parsing them:
- W3C JSON files: parse and validate against the DTCG schema
- CSS file: parse CSS and verify all expected custom property names are present
- Tailwind config: run through TypeScript compiler (`tsc --noEmit`) and verify no errors
- Component TSX files: run through TypeScript compiler and verify no errors
- `agent-spec.json`: parse and validate against the expected schema

These tests run as part of the pipeline test suite and must pass before any API route or frontend code is merged.

---

*End of development plan. Version 1.0.*
