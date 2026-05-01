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
│   │   │   ├── flow/
│   │   │   ├── preview/
│   │   │   ├── home/
│   │   │   └── shared/
│   │   ├── store/
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

*(This section is empty at project start. Add patterns here as they are discovered during development. Each pattern entry should include: what the pattern is, why it was established, and an example of correct usage.)*

---

*This file is version-controlled. Changes to it require a commit with a clear message explaining why the rule changed.*
