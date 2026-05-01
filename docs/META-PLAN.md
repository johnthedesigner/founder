# Meta-Plan — Orchestrating AI-Assisted Development

**For:** The human developer (you)
**Purpose:** How to set up, sequence, and manage the AI-assisted development of this project from scratch

This document is for you, not for Claude Code. It describes your role as orchestrator — what to do before the first session, how to run each session, and how to maintain quality and momentum across phases.

---

## Before writing any code — one required validation

The color scale generator uses `chroma-js` for brightness adjustments. Before starting Phase 0, spend 30 minutes confirming the library installs and behaves correctly in your Node/TypeScript environment.

**Validation:** Install `chroma-js` and `@types/chroma-js` in a throwaway script. Parse a hex color, adjust its lightness up and down in small increments, read back the contrast ratio against white. Confirm you can iterate through a candidate pool and select by contrast value. This is the core mechanic of the generator — if anything is surprising about how `chroma-js` handles a particular color space operation, you want to know before the Phase 0 implementation begins.

The developer will also provide the reference script for the color scale generator during Phase 0. Review it before Task 0.2 begins. Decide at that point whether to integrate it directly or rewrite it — the output contract (cross-hue contrast consistency within ±0.3 of `TARGET_CONTRASTS`) is what matters, not the implementation.

After validation: record any constraints or observations in `SESSION_LOG.md` as the first entry.

---

## Repository initialization (Claude Code scaffold session)

The scaffold is a Claude Code task. Run it as a dedicated session before any Phase 0 development begins. The only thing you need to do manually first is create the git repository and place the docs inside it — everything else the agent handles.

**Before running the scaffold session:**
1. `git init` your repository
2. Place all planning documents in `docs/` and `AGENTS.md`, `SESSION_LOG.md` at the root
3. Create an empty `tasks/` directory with `TEMPLATE.md` and `phase-0.md` inside it

Then run this prompt in Claude Code:

```
Read AGENTS.md in full. Then read docs/design-system-dev-plan.md — specifically
the Repository Structure section and the Environment Variables section.

Your task is to initialize the monorepo scaffold. Do not write any application
code — only project structure, configuration files, and tooling setup.

1. Create the full directory structure from the Repository Structure section:
   packages/types/src/, backend/src/ with all subdirectories listed, frontend/src/
   with all subdirectories listed, preview-sandbox/src/, cli/src/

2. Create package.json files for each package:
   - Root: npm workspaces config pointing to packages/*, backend, frontend,
     preview-sandbox, cli. devDependencies: typescript, eslint, prettier.
   - packages/types: name "@ds-gen/types", no dependencies yet.
   - backend: name "@ds-gen/backend". Dependencies: express, chroma-js, jszip,
     node-pg-migrate, bcrypt, nodemailer, jsonwebtoken, zod, express-rate-limit.
     devDependencies: vitest, @types/* for all deps, tsx.
   - frontend: name "@ds-gen/frontend". Dependencies: react, react-dom,
     react-router-dom, zustand, @base-ui-components/react, cva.
     devDependencies: vite, @vitejs/plugin-react, tailwindcss, @tailwindcss/vite,
     @playwright/test, @testing-library/react.
   - preview-sandbox: name "@ds-gen/preview-sandbox". Same deps as frontend
     minus zustand and router.
   - cli: name "@ds-gen/cli", bin entry pointing to src/index.ts.

3. Configure TypeScript:
   - Root tsconfig.base.json: strict mode, target ESNext, moduleResolution bundler,
     no emit.
   - Each package extends the base with appropriate include paths.
   - packages/types tsconfig must emit declarations to dist/ so other packages
     can import from @ds-gen/types.

4. Configure ESLint at the root using @typescript-eslint. Single flat config
   (eslint.config.js) covering all packages.

5. Configure Prettier at the root with a .prettierrc: single quotes, no
   semicolons, 2-space indent.

6. Configure Vitest in backend/ with a vitest.config.ts. Test files match
   **/*.test.ts. Coverage provider: v8.

7. Configure Playwright in frontend/ with a playwright.config.ts. Base URL:
   http://localhost:5173. Test directory: tests/e2e/.

8. Create backend/.env.example with all variables from the Environment Variables
   section of the dev plan.

9. Create a root .gitignore covering: node_modules, dist, .env, coverage,
   playwright-report, .DS_Store.

10. Run npm install at the root. Then verify:
    - tsc --noEmit passes in packages/types and backend
    - eslint . passes with zero errors
    - vitest run in backend exits cleanly (zero tests, zero failures)
    - npx playwright install runs without error

11. Make a single commit: "Initial scaffold — no application code"

Report any decisions you made that were not specified above, and flag anything
that did not verify cleanly. Do not proceed to Phase 0 task work.
```

Review the agent's report before starting task 0.1. If anything didn't verify cleanly, fix it in a follow-up scaffold session rather than carrying broken tooling into Phase 0.

---

## Generating task files before each phase

Before starting development on any phase, generate its task file. Use this prompt in a separate Claude chat session (not Claude Code):

> "Read `docs/design-system-dev-plan.md` (specifically Phase N) and `tasks/TEMPLATE.md`. Generate `tasks/phase-N.md` — a complete, sequenced task list for Phase N using the format in the template. Every task must have specific, verifiable acceptance criteria. Do not write any application code."

Review the generated task file carefully before committing it. Ask yourself:
- Are tasks in the right order? Can each be implemented without depending on something not yet built?
- Are acceptance criteria specific enough to verify without ambiguity?
- Does every task update `SESSION_LOG.md`?
- For pipeline tasks: does every task have a test that validates the generated *output*, not just that generation ran?

Commit the task file, then start the phase.

**Generate task files one phase ahead** — have Phase 1's task file ready before you finish Phase 0.

---

## Running a development session

Each session follows the same pattern.

**Starting the session** — give Claude Code this instruction:

```
Read AGENTS.md in full. Then read SESSION_LOG.md — start with the Current State block.
Then read only the entry for task [TASK_ID] in tasks/phase-[N].md (not the full file).

Before writing any code, summarize:
1. What this task implements
2. Which files you will create or modify
3. Any dependencies on prior tasks and whether they are complete per the Current State block
4. Any potential conflicts with the architectural rules in AGENTS.md

Wait for my confirmation before proceeding.
```

Wait for the summary before the agent writes code. If the summary is wrong, correct it now.

**During the session:**
- Let the agent work. Intervene if it starts working outside task scope.
- If it gets stuck, ask it to describe the blocker — don't just ask it to try again.
- Phase 0 tasks are pure TypeScript + tests. There is no server to run, no UI to look at. The feedback loop is: write function → write test → run test → see result. This is normal.

**Ending the session** — use this closing prompt:

```
Before we finish:
1. Run all tests and report results
2. Run tsc --noEmit and report any errors
3. Run eslint on all modified files and report any errors
4. Verify every acceptance criterion in the task is checked off
5. Update SESSION_LOG.md:
   a. Add a full session entry (what was done, decisions made, what was not done)
   b. Replace the Current State block with the updated state
6. Mark the task complete in the phase task file
7. If this task established a new pattern, add it to the Patterns established section of AGENTS.md

Do not start the next task.
```

---

## Reviewing agent output

You are the quality gate.

**Always:**
- Does `tsc --noEmit` pass?
- Does `eslint .` pass?
- Do all tests pass?
- Is `SESSION_LOG.md` updated?

**For pipeline tasks (Phase 0):**
- Do the tests validate the *output content*, not just that no exception was thrown? A test that calls `generate()` and asserts `result !== undefined` is not a useful test.
- Does the generated TypeScript actually compile? (The pipeline test suite should verify this via `tsc --noEmit` on generated content.)
- Are the generated color scales visually sensible? Spot-check the hex values — you can paste them into any color tool.
- Does the accessibility validation actually correct a failing color? Test this manually: pass a very light primary color and verify the output uses a darker step.

**For backend tasks (Phase 1):**
- Is every new route covered by at least one integration test that asserts DB state?
- Are route handlers thin — no SQL, no business logic inline?

**For frontend tasks (Phase 2–3):**
- Does `configStore` contain any UI state? Does `uiStore` contain any config data?
- Do all stage components read config from `configStore`, not local state?
- Does the `postMessage` bridge fire within 500ms of a config change? (Check the Playwright timing assertion.)

**For any task:**
- No `console.log` in production code paths
- No `// TODO` or `// FIXME` in code (these belong in `SESSION_LOG.md`)
- No generated files contain placeholder text

---

## Phase 0 requires special attention

Phase 0 is unlike any other phase. There is no running server, no UI, no visual feedback. The entire phase is unit tests against pure functions. This can feel less tangible than writing API routes or building UI components, but it is the most important phase in the project.

**What to verify during Phase 0 that cannot be automated:**
- Paste three or four generated hex color scales into a color picker tool (e.g. Coolors or Tints.dev) and visually verify they look like real design system color scales — not arbitrary colors.
- Read the output of `decisions.md` generation for the default config. Does it read as design-literate and useful, or generic and unhelpful? If the latter, revise the templates before moving on.
- Read a generated component file (e.g. `button.tsx`). Would a skilled engineer have written it this way? Does it look production-ready?

Do not move to Phase 1 until you're satisfied with the quality of the pipeline output, not just that the tests pass.

---

## Managing context loss between sessions

Each session starts fresh. `AGENTS.md` and `SESSION_LOG.md` are your primary tools.

**Keep tasks small and complete.** An 80%-done task is harder to resume than a 100%-done one.

**Name things consistently.** Use the exact file paths from `AGENTS.md` everywhere — in the session log, in task files, in commit messages.

**Commit after every task.** The git log should read like a table of contents: "Phase 0, Task 0.4 — Semantic token generation."

**Don't skip `SESSION_LOG.md` updates.** When a session is going well it's tempting to skip the log and keep moving. Don't.

---

## Phase transition checklist

Before starting a new phase:

- [ ] All tasks in the phase file are marked complete
- [ ] `npm test` passes across all packages
- [ ] `tsc --noEmit` passes
- [ ] `eslint .` passes
- [ ] Playwright tests for this phase pass
- [ ] `SESSION_LOG.md` has entries for all sessions in this phase
- [ ] Phase retrospective written to `docs/phase-N-retro.md`
- [ ] `docs/user-journeys.md` reviewed and updated
- [ ] Next phase's task file generated and reviewed
- [ ] **Housekeeping session run** (see below)

Do not start a new phase with a failing test.

---

## When things go wrong

**Tests fail after a session:**
Open a focused session: "Read `AGENTS.md` and `SESSION_LOG.md`. The following tests are failing: [paste output]. Do not write any new features. Diagnose and fix the failing tests only."

**A generated file isn't production-quality:**
This is a pipeline bug, not an acceptable state. Fix the generator before moving on — the output quality is the product.

**An architectural rule was violated:**
Do not work around it. Revert and re-implement correctly. A violation that is "good enough for now" will cause a harder problem in a later phase.

**The spec and dev plan conflict or have a gap:**
Stop development on the affected task. Resolve the ambiguity in a Claude chat session (not Claude Code), update the relevant documents, then resume.

---

## Phase-end housekeeping session

Run this at the end of every phase before starting the next one. Produces no code — only documentation maintenance.

**Prompt:**

```
This is a housekeeping session. Do not write any application code.

1. Compress any completed task entries in tasks/phase-[N].md that still have their full body.
   Each completed task: status line, one-sentence output summary, key decisions, session log pointer.

2. Move all session entries for Phase [N] from SESSION_LOG.md to logs/phase-[N].md.
   Keep the project status header and Current State block in SESSION_LOG.md.
   Add a one-line pointer: "Phase [N] session entries archived to logs/phase-[N].md"

3. Review AGENTS.md Patterns established section. Add any patterns from Phase [N] that are missing.

4. Read tasks/phase-[N+1].md. Flag any entries that look wrong or depend on something not yet built.
   Do not edit them — just report what you find.

5. Report what you did and what (if anything) needs human attention.
```

---

## Quick reference — session opening prompt

```
Read AGENTS.md in full. Then read SESSION_LOG.md — start with the Current State block.
Then read only the entry for task [TASK_ID] in tasks/phase-[N].md (not the full file).

Before writing any code, summarize:
1. What this task implements
2. Which files you will create or modify
3. Any dependencies on prior tasks and whether they are complete per the Current State block
4. Any potential conflicts with the architectural rules in AGENTS.md

Wait for my confirmation before proceeding.
```

## Quick reference — session closing prompt

```
Before we finish:
1. Run all tests and report results
2. Run tsc --noEmit and report any errors
3. Run eslint on all modified files and report any errors
4. Verify every acceptance criterion in the task is checked off
5. Update SESSION_LOG.md:
   a. Add a full session entry (what was done, decisions made, what was not done)
   b. Replace the Current State block with the updated state
6. Mark the task complete in the phase task file
7. If this task established a new pattern, add it to the Patterns section of AGENTS.md

Do not start the next task.
```

---

## A note on V1 scope and the commercial path

V1 is a fast-start generator. It is not a design system management platform. The generation pipeline, the creation flow, the export artifacts, and the agent API are the product. Features that belong to a hypothetical v2 management platform — version history, change tracking, team collaboration, governance tooling — are explicitly out of scope and should not creep in.

The cost model for V1 is intentionally minimal: Render starter tier + Postgres + Vercel free tier, approximately $15–20/month. There are no LLM API calls, no Redis, no worker threads, no Stripe integration. This is achievable and should be kept this way. If a proposed task would add variable or unpredictable cost to V1, stop and question whether it belongs in V1 at all.

If the product grows into a maintenance platform in a future version, that decision will be made deliberately, with a new planning document, not by accumulation of scope creep.