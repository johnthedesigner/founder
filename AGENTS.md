# AGENTS.md — Standing Orders for Claude Code

**Read this file first. Every session. No exceptions.**

This file contains the invariants for this project — rules that do not change between sessions and must be respected regardless of what a task asks you to do. If a task instruction conflicts with a rule in this file, the rule wins. Stop and flag the conflict rather than resolving it silently.

---

## What to do at the start of every session

Read these three things, in this order, before writing any code:

**Step 1 — Read this file (`AGENTS.md`) in full.**

**Step 2 — Read `SESSION_LOG.md`.**
Start with the **Current State block** near the top — it tells you the current phase, the next task ID and name, what is already built, and any open questions. Read individual session entries only if you need the reasoning behind a specific past decision.

**Step 3 — Read the entry for the next task only from the current phase task file.**
The Current State block identifies the next task (e.g. "Task 1.4"). Read only that entry — do not read the full task file.

If any of the above are missing or the task is unclear, ask before proceeding.

---

## What to do at the end of every session

Before declaring a task complete:

1. Verify every acceptance criterion in the task is checked off
2. Run the relevant tests and confirm they pass:
   - Pipeline: `cd backend && npm test -- --testPathPattern=pipeline`
   - Backend (all): `cd backend && npm test`
   - Frontend: `cd frontend && npm test`
   - E2e: `cd frontend && npx playwright test`
3. Check that no architectural rules below have been violated
4. Update `SESSION_LOG.md`:
   - Add a full session entry (what was done, decisions made, what was not done)
   - Replace the **Current State block** with the new current state (next task, what's built, open questions)
5. If this task established a reusable implementation pattern, add it to the **Patterns established** section of this file
6. Do not start the next task — stop and wait for instruction

**At the end of a phase** (all tasks complete), additionally:

7. All tasks marked `[x]` in the phase task file
8. All tests pass: `cd backend && npm test` + `cd frontend && npm test` + Playwright. Paste output into session log. Do not proceed to the next phase with any red test.
9. TypeScript compiles with zero errors: `tsc --noEmit` in backend and frontend
10. ESLint passes with zero errors
11. `SESSION_LOG.md` Current State block updated to reflect phase completion
12. Write a phase retrospective in `docs/phase-N-retro.md`
13. Review and update `docs/user-journeys.md` — read the next phase's task file and check which journey steps it unlocks. Update the coverage table accordingly.
14. Wait for instruction before starting the next phase

If tests fail or an acceptance criterion cannot be met, document the blocker in `SESSION_LOG.md` and stop. Do not work around a failing test by weakening it or skipping it.

---

## Project reference documents

| Document | Purpose |
|---|---|
| `docs/design-system-spec.md` | Product specification — behavior, data model, UI interaction |
| `docs/design-system-dev-plan.md` | Development plan — phased implementation, schemas, API contracts, test strategy |
| `tasks/phase-N.md` | Task list for the current phase — always the primary instruction source |
| `SESSION_LOG.md` | Running record of completed work and decisions |

---

## Repository structure

```
/
├── AGENTS.md
├── SESSION_LOG.md
├── docs/
│   ├── design-system-spec.md
│   ├── design-system-dev-plan.md
│   └── user-journeys.md
├── tasks/
│   ├── TEMPLATE.md
│   └── phase-0.md
├── packages/
│   └── types/
│       ├── src/
│       │   ├── config.ts
│       │   ├── output.ts
│       │   └── api.ts
│       └── package.json
├── backend/
│   ├── src/
│   │   ├── api/
│   │   ├── pipeline/
│   │   │   ├── index.ts
│   │   │   ├── tokens/
│   │   │   ├── components/
│   │   │   ├── docs/
│   │   │   ├── export/
│   │   │   └── palette/
│   │   ├── db/
│   │   │   ├── migrations/
│   │   │   └── queries/
│   │   ├── services/
│   │   └── middleware/
│   ├── tests/
│   │   ├── pipeline/
│   │   └── api/
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   ├── flow/
│   │   │   ├── preview/
│   │   │   ├── home/
│   │   │   └── shared/
│   │   ├── store/
│   │   │   ├── anonymousStore.ts
│   │   │   ├── configStore.ts
│   │   │   ├── uiStore.ts
│   │   │   └── userStore.ts
│   │   └── hooks/
│   └── tests/
│       ├── unit/
│       └── e2e/
├── preview-sandbox/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── TokenApplicator.tsx
│   │   └── SystemPreviewLayout.tsx
│   └── vite.config.ts
└── cli/
    ├── src/
    │   └── index.ts
    └── package.json
```

---

## Architectural rules

### The pipeline is a pure function — no exceptions

`generate(config: ProjectConfig): GeneratedSystem` in `backend/src/pipeline/index.ts` must have no side effects: no DB reads, no network calls, no file system access, no logging to stdout. It takes a config object and returns a data object. Period.

If you find yourself adding a DB query or API call inside any file under `backend/src/pipeline/`, stop and flag it. The pipeline infrastructure (reading the config from the DB, writing exports to disk) lives in `backend/src/api/generate.ts` and `backend/src/services/`, not in the pipeline itself.

### Semantic tokens in generated component code — never primitives

Generated component code (files under `backend/src/pipeline/components/`) must reference only semantic tokens (`--color-action-primary`) or component tokens (`--button-border-radius`) via CSS custom properties. Primitive token names (`--color-blue-600`) must never appear in generated component code.

The test for this is enforced in `backend/tests/pipeline/output/` — do not disable or weaken this test.

### Accessibility validation runs in the pipeline — not the UI

WCAG contrast validation and auto-correction live in `backend/src/pipeline/tokens/accessibility.ts` and are called from `backend/src/pipeline/tokens/semantic.ts`. The generation pipeline never produces a semantic color pairing that fails WCAG AA. If you need to add a new semantic color pairing, it must go through `findAccessibleStep`.

Do not add contrast validation logic to the frontend. The frontend can display contrast ratios from the generated output (they are included in the `SemanticTokenSet` as metadata) but must not enforce or correct them.

### `configStore` is the single source of truth for the creation flow

The `configStore` in `frontend/src/store/configStore.ts` holds the `ProjectConfig` being built. All stage components read from and write to `configStore` only. No stage component stores a local copy of config state. No component derives config state from URL params, component props, or local `useState`.

### `uiStore` contains only UI state — never config or server data

`uiStore` contains: current stage index, loading states, panel visibility, animation state. It does not contain any part of the `ProjectConfig` and does not mirror any server response.

### The CLI contains no generation logic

`cli/src/index.ts` must not import from `backend/src/pipeline/`. It must not contain any token generation, component generation, or file structure knowledge. It reads a manifest from the API and writes files. If you find yourself adding generation logic to the CLI, stop — it belongs in the backend pipeline or the manifest API.

### All config changes in the frontend flow through `configStore.setConfig`

No component in the creation flow calls the API directly when a user makes a choice. The flow is: user makes choice → component calls `configStore.setConfig` → `configStore` updates → `SystemPreview` reacts via `postMessage` → (if authenticated) debounced `PATCH /projects/:id` fires.

The API call on config change is always debounced (500ms) and always originates from a single `useEffect` in a top-level layout component, not from individual stage components.

### Generated files contain no TODO comments or placeholder values

Every generated file (tokens, components, docs) must be complete and immediately usable. A generated file that contains `// TODO`, `/* placeholder */`, or any other deferred content is a pipeline bug, not an acceptable shortcut.

### DB migrations are the only way to change the schema

No manual schema edits. Every schema change is a migration file in `backend/src/db/migrations/`. Migrations must have both `up` and `down` functions. The `project_snapshots` table is created in the initial migration and must not be removed, even though it is not used in V1.

---

## Patterns established

### cva v1 API — single config object

cva v1.0.0-beta.4 uses a single config object, not the two-argument form from v0.x.

```typescript
// correct (v1)
const buttonVariants = cva({
  base: 'inline-flex items-center ...',
  variants: { variant: { primary: '...', secondary: '...' } },
  defaultVariants: { variant: 'primary' },
})

// wrong (v0 — will produce TypeScript error "Expected 1 argument, got 2")
const buttonVariants = cva('inline-flex items-center ...', { variants: ... })
```

Established because: the first attempt at the Button generator used the v0 form and failed `tsc --noEmit` on the generated output.

---

### Base UI className override — Omit + re-declare

Base UI's `className` prop is typed as `string | ((state: State) => string | undefined)`. Our `cn()` helper only accepts `string | undefined | null | false`. When a generated component wraps a Base UI primitive and calls `cn()` with `className`, use `Omit + intersection` to override:

```typescript
// In the .types.ts file for any component wrapping a Base UI primitive with className:
export interface CheckboxProps
  extends Omit<React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>, 'className'> {
  label?: string
  className?: string
}
```

Established because: without this, `tsc --noEmit` on generated output fails with "Type 'string | ((state: CheckboxRootState) => string | undefined) | undefined' is not assignable to type 'string | undefined'."

---

### Base UI ButtonProps — extend ButtonHTMLAttributes, not ComponentPropsWithoutRef

`@base-ui-components/react/button` exports `ButtonProps = ButtonNativeProps | ButtonNonNativeProps` — a discriminated union. TypeScript does not allow `interface Foo extends AUnionType`. Use `ButtonHTMLAttributes<HTMLButtonElement>` instead:

```typescript
// correct
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

// wrong — TypeScript error: "An interface can only extend an object type or intersection of object types with statically known members"
export interface ButtonProps extends ComponentPropsWithoutRef<typeof BaseButton> { ... }
```

---

### InterimSystem pattern — break the doc-generator chicken-and-egg

Doc generators (`generateReadme`, `generateTokensDoc`, etc.) take `GeneratedSystem` as input, but docs are files in `GeneratedSystem.files`. Break the cycle by building an interim system with `files: []`, using it for docs, then assembling the final system:

```typescript
const interimSystem: GeneratedSystem = {
  config, tokens, components,
  files: [],   // empty — doc generators don't need the files array
  metadata: { generatedAt, corrections: semantic.corrections },
}
const docFiles = [
  { path: 'docs/README.md', content: generateReadme(interimSystem, config) },
  ...
]
// then assemble final return value with all files included
```

Established in Task 0.10 to avoid any circular dependency between docs and the system they describe.

---

### W3C alias detection regex

Token path references (e.g. `'color.action.primary'`, `'space.component.sm'`) are detected with:

```typescript
const isAlias = (v: string) => /^[a-z][\w-]*(\.[a-z][\w-]+)+$/.test(v)
```

This matches `word.word` patterns but not CSS values (`4px`, `#3b82f6`, `Inter, sans-serif`). False positives are acceptable in the component token layer because all component token values are intentionally in this form.

---

### vi.setSystemTime for determinism tests

`generate()` calls `new Date().toISOString()` for `generatedAt`. Pin the clock in tests that need byte-for-byte output comparison:

```typescript
vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
const a = generate(DEFAULT_CONFIG)
const b = generate(DEFAULT_CONFIG)
vi.useRealTimers()
// now a and b are identical
```

Do not change the production code to accept an injected clock — use `vi.setSystemTime` in tests only.

---

### Two tsconfigs for output compilation tests

Component `.tsx` files require `jsx: react-jsx`; `tokens/tailwind.config.ts` does not (and mixing them causes errors). Write two separate tsconfig files to the output directory and run `tsc` twice:

```typescript
// tsconfig.json — for components
{ compilerOptions: { jsx: 'react-jsx', ... }, include: ['components/**/*.tsx'] }

// tsconfig.tailwind.json — for tailwind config
{ compilerOptions: { ... }, include: ['tokens/tailwind.config.ts'] }
```

Established in Task 0.10 integration test. This is the correct solution, not a workaround.

---

### Tier 2 components are pure HTML — no Base UI import

Card, Badge, Alert, and Avatar are purely structural. They use plain HTML elements and do not import `@base-ui-components/react`. Tests that check for Base UI imports in generated component files must exclude these four with an explicit allowlist:

```typescript
const PURE_HTML_COMPONENTS = ['card', 'badge', 'alert', 'avatar']
const interactiveFiles = allFiles().filter(
  (f) => f.path.endsWith('.tsx') &&
         !PURE_HTML_COMPONENTS.some((name) => f.path.includes(`/${name}/`))
)
```

---

### `optionalAuth` — serve both authenticated and anonymous callers on the same route

When a route should behave differently for authenticated vs. anonymous callers but must never block anonymous access, use `optionalAuth` instead of `requireAuth`:

```typescript
export async function optionalAuth(req, _res, next) {
  const token = req.cookies?.session
  if (token) {
    try {
      const payload = verifyJwt(token)
      const session = await findSessionByJti(payload.jti)
      if (session) {
        await updateSessionLastActive(payload.jti)
        req.user = { id: payload.sub, jti: payload.jti }
      }
    } catch { /* invalid token — proceed as anonymous */ }
  }
  next()
}
```

Route handler then inspects `req.user` to determine capability, not access. Established in Phase 1b for `POST /projects`, `PATCH /:id`, `DELETE /:id`.

---

### Ownership checks live in the service layer — routes pass raw auth context

The service (not the route handler) determines whether a caller can edit a resource. Routes extract a plain `EditAuth` object from the request and pass it through:

```typescript
// In the route:
function extractEditAuth(req): EditAuth | null {
  if (req.user) return { type: 'user', userId: req.user.id }
  const token = req.headers['x-owner-token']
  if (typeof token === 'string' && token.length > 0) return { type: 'token', ownerToken: token }
  return null
}

// In the service:
function computeCanEdit(row, auth?) {
  if (!auth) return false
  if (auth.userId && row.user_id === auth.userId) return true
  if (auth.ownerToken && row.owner_token !== null && auth.ownerToken === row.owner_token) return true
  return false
}
```

Routes never compare tokens directly against DB rows. The service owns the ownership model. Established in Phase 1b.

---

### `'key' in data` for nullable column updates — distinguish "don't touch" from "set to NULL"

When a DB update function needs to differentiate "caller didn't provide this field" from "caller explicitly wants to set it to NULL", use key-presence checking:

```typescript
function buildSetClause(data) {
  const sets = []
  if ('ownerToken' in data) {
    sets.push(data.ownerToken === null ? `owner_token = NULL` : `owner_token = $N`)
  }
  // vs.
  if (data.name !== undefined) sets.push(`name = $N`) // never null
}
```

Established in Phase 1b for the claim operation, which needs to explicitly clear `owner_token` to NULL while other `updateProject` callers leave it untouched.

---

### Vite proxy `bypass` for SPA routes that overlap proxied paths

If a Vite proxy path (e.g. `/projects`) also matches SPA routes rendered by React Router, browser page navigations will be forwarded to the backend and receive JSON instead of `index.html`. Add a `bypass` function:

```typescript
'/projects': {
  target: 'http://localhost:3001',
  bypass: (req) => {
    if (req.headers.accept?.includes('text/html')) return '/index.html'
  },
},
```

Browser navigations send `Accept: text/html`; fetch/XHR API calls do not. The bypass returns `/index.html` only for browser navigations, letting API calls proxy through normally. Established in Phase 1b when `page.goto('/projects/:id')` in Playwright returned raw JSON.

---

### Playwright localStorage seeding — `page.evaluate` not `page.addInitScript`

To seed `localStorage` for a Zustand `persist` store before a page navigation:

```typescript
// 1. Navigate to any app page to establish the origin
await page.goto('/login')
// 2. Write the Zustand persist format
await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
  key: 'ds-gen-anonymous',
  value: JSON.stringify({ state: { entries: [...] }, version: 0 }),
})
// 3. Navigate to the target page — store hydrates from localStorage on mount
await page.goto('/projects/' + id)
```

Do NOT use `page.addInitScript` for this — it re-runs the script on every subsequent navigation, which breaks tests that need to clear localStorage and reload (the script would re-seed after the clear). `page.evaluate` writes once; localStorage persists naturally across same-origin navigations. Established in Phase 1b.

---

*This file is version-controlled. Changes to it require a commit with a clear message explaining why the rule changed.*
