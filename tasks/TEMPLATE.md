# Phase N — [Phase Name]

> **Status:** Not started
> **Depends on:** Phase N-1 complete (all tasks marked `[x]`, all tests passing)
> **Reference:** `docs/design-system-dev-plan.md` § Phase N — [Phase Name]

---

## Overview

[One paragraph describing the goal of this phase, what will be built, and what "done" means. Should match the corresponding entry in `design-system-plan-summary.md`.]

---

## Tasks

### Task N.1 — [Task name]

> **Status:** `[ ]` Not started / `[~]` In progress / `[x]` Complete
> **Session:** [Link to SESSION_LOG.md entry when complete, e.g. "2026-05-01 session"]
> **Depends on:** [Task N.0, or "none"]

**What this task implements:**
[One or two sentences. What exists after this task that didn't before.]

**Files to create or modify:**
- `path/to/file.ts` — [what changes]
- `path/to/file.test.ts` — [what is tested]

**Acceptance criteria:**
- [ ] [Specific, verifiable criterion. Not "it works" — "calling X with Y returns Z."]
- [ ] [Each criterion should be checkable without ambiguity.]
- [ ] [Tests pass: `npm test -- --testPathPattern=[pattern]`]
- [ ] `tsc --noEmit` passes
- [ ] `SESSION_LOG.md` updated with session entry and new Current State block

**Must not do:**
- [Scope boundary: what this task explicitly does not include, to prevent scope creep]
- [e.g. "Does not implement semantic token generation — that is Task N.2"]

---

### Task N.2 — [Task name]

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** Task N.1

**What this task implements:**
[Description]

**Files to create or modify:**
- `path/to/file.ts` — [what changes]

**Acceptance criteria:**
- [ ] [Criterion]
- [ ] [Criterion]
- [ ] Tests pass
- [ ] `tsc --noEmit` passes
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- [Scope boundary]

---

## Phase completion checklist

Run this checklist before marking the phase complete and starting the next one.

- [ ] All tasks above are marked `[x]`
- [ ] `npm test` passes in all relevant packages with zero failures
- [ ] `tsc --noEmit` passes in all packages
- [ ] `eslint .` passes with zero errors
- [ ] Playwright tests for this phase pass (if applicable)
- [ ] `SESSION_LOG.md` has a complete entry for every session in this phase
- [ ] `docs/design-system-plan-summary.md` updated to reflect this phase's completion
- [ ] `docs/user-journeys.md` reviewed — coverage table updated for any newly-enabled steps
- [ ] Phase retrospective written to `logs/phase-N-retro.md`
- [ ] Housekeeping session run (task compression, session log archival, patterns review)
- [ ] Phase N+1 task file generated, reviewed, and committed

---

## Completed task log

*(Tasks are compressed to this format once complete. Full details live in the session log.)*

<!--
### Task N.X — [Task name] ✓
**Output:** [One sentence: what was built.]
**Key decisions:** [Any non-obvious choices made.]
**Session:** [Date / SESSION_LOG pointer]
-->