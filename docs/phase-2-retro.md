# Phase 2 Retrospective — Creation Flow

> Written: 2026-05-03

---

## What went well

**The pipeline-as-browser-library pattern held up.** The decision to keep `backend/src/pipeline/` free of Node.js-only imports paid off immediately in Phase 2: both the preview sandbox and `Stage3TokenSummary` imported `generate()` and the palette functions directly, with no duplication and no bundling gymnastics. The Vite `@pipeline` alias made this transparent.

**`configStore` as the single source of truth was clean.** Every stage component reads from and writes to `configStore.setConfig`. The `SystemPreview` subscription and debounced `postMessage` just worked. At no point did a stage component need to manage its own copy of config state.

**postMessage protocol was simple and resilient.** Two message types (`READY`, `CONFIG_UPDATE`), both with `targetOrigin: '*'`, handled the entire preview bridge. The `window.__previewReady` flag on the parent window gave Playwright a reliable synchronization point without any polling hacks.

**`anonymousStore` + owner token was the right abstraction.** Because Phase 1b established the owner token model, Phase 2 could build on it cleanly: `createProject` stores the token automatically, and the download fetch passes it as a header. No new auth concepts introduced.

---

## What was challenging

**Vite dev proxy + iframe incompatibility.** The initial plan was to proxy `/preview` to the sandbox dev server with a path rewrite. This fails in Vite dev mode because the dev server generates root-relative asset paths (`/@vite/client`, `/src/main.tsx`) that the browser requests at the main origin without the `/preview` prefix — they never go through the proxy. The fix (use a direct cross-origin `http://localhost:5180` src) was simple once the cause was understood, but it took time to diagnose.

**Port conflicts in local dev.** Two other Vite apps on the machine (one on 5174, one that silently moved the frontend from 5173 to 5175) caused `reuseExistingServer: true` to pick up the wrong server. `strictPort: true` in the sandbox vite config prevents silent port fallback; the real fix is picking a less-common port (5180) that's unlikely to collide.

**Playwright CSS variable checks in cross-origin iframes.** `getComputedStyle(el).fontFamily` on an element with `font-family: var(--font-display)` looks like it should work — and does — but `querySelector('[style*="font-family"]')` returned the root `<div>` (which uses `--font-body`) instead of a type-scale span (which uses `--font-display`). Checking the CSS variable on `:root` directly via `getPropertyValue('--font-display')` is simpler and more reliable.

**`requireAuth` on the export route.** The export ZIP endpoint was built in Phase 1 with `requireAuth`, which was correct at the time (no anonymous users). Phase 2 introduced anonymous download as a first-class feature, requiring `optionalAuth` + `X-Owner-Token` support on the route. The fix was straightforward but needed to propagate to both backend and frontend (`downloadZip` needed to pass the token).

**`@ds-gen/types` Vite resolution.** The types package `package.json` had `"require"` as the export condition. This worked for `import type` (erased at compile time) but failed when `configStore.ts` imported a runtime value for the first time. The fix (`"require"` → `"default"`) is one line, but the error only surfaces at Vite startup with a confusing resolution error.

---

## Key technical decisions

| Decision | Rationale |
|---|---|
| Direct port (5180) for preview sandbox iframe | Proxy + Vite dev server path rewriting is incompatible. Direct cross-origin iframe is simpler and more explicit about the boundary. |
| `strictPort: true` in preview sandbox vite config | Prevents silent port fallback that causes `reuseExistingServer` to adopt the wrong server in test environments. |
| `generate()` runs client-side in Stage 3 | The pipeline is pure TypeScript with no Node.js APIs. Running it in the browser avoids a round-trip, keeps Stage 3 responsive offline, and confirms the pipeline's browser-safety invariant. |
| `setTimeout(..., 0)` for `generate()` in Stage 3 | Macrotask deferral ensures the skeleton is painted before the synchronous (but slow) generation begins — even with React's batched updates. |
| `resolveEditAuth()` inline in generate.ts | The auth resolution logic for the export route is small enough to inline. Avoids creating a shared utility just to move two lines. |
| CSS custom properties on `:root` for preview tokens | All preview layout elements use `var(--token-name)`. No hardcoded values in `SystemPreviewLayout`. Token changes propagate without re-rendering. |
| `configStore.resetConfig()` on project save | The project is on the server the moment `createProject` returns. Clearing the local draft at that point (not after download) is correct regardless of whether the download succeeds. |

---

## Lessons for Phase 3

1. **Test port assignment at the start of every phase.** Before writing any test, verify which ports are free and pin `strictPort: true` on every dev server that tests depend on.

2. **Auth on every "side effect" endpoint.** Any endpoint that performs an action (generate, export, send email) needs explicit auth thinking. `requireAuth` is correct for authenticated-only features; `optionalAuth` + manual check is correct for anonymous-capable features. Do not copy-paste `requireAuth` as a default.

3. **The `@pipeline` alias is the bridge between server and browser.** Any future browser-side feature that needs server-side computation (token preview, linting, validation) should check whether the relevant pipeline function is browser-safe first, then use the alias.

4. **Playwright cross-origin iframes need `page.frame({ url: /pattern/ })`, not `frameLocator`.** `frameLocator` works for same-origin. For cross-origin iframes, `page.frame()` is the right API and gives a `Frame` object that supports `waitForFunction`.
