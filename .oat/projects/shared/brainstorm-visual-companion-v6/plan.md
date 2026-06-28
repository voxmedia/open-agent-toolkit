---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-06-28
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: []
oat_plan_parallel_groups: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: brainstorm-visual-companion-v6

> Execute this plan using `oat-project-implement`.

**Goal:** Bring OAT's `oat-brainstorm` visual companion to parity with Superpowers v6.0.3 security, resilience, and lifecycle behavior while preserving OAT persistence paths and conditional-offer skill semantics.

**Architecture:** Replace the v5.0.7 Node/bash bundle under `.agents/skills/oat-brainstorm/scripts/` with an adapted Superpowers v6.0.3 port (session-key auth, sandboxed static serving, port/token persistence, resilient client UI, safe stop-server). Update skill/reference prose and integration smoke tests; bump bundled-asset version metadata and run release validation.

**Tech Stack:** Node.js (server.cjs), bash (start/stop scripts), HTML/JS (frame + helper), Vitest integration smoke test, OAT skill frontmatter, lockstep npm packages.

**Commit Convention:** `feat(pNN-tNN): {description}` for functional port tasks; `chore(pNN-tNN): {description}` for bookkeeping/docs/version tasks.

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user (none — quick mode, empty `oat_plan_hill_phases`)
- [x] Set `oat_plan_hill_phases` in frontmatter
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter (sequential — shared skill directory)

---

## Parallelism

All phases modify the same skill bundle or its tests/docs. Phases run **sequentially** (`oat_plan_parallel_groups: []`). Phase 1 must land before smoke tests in Phase 3 can assert v6 behavior.

---

## Phase 1: Port Superpowers v6 visual bundle

### Task p01-t01: Import and adapt server.cjs

**Files:**

- Modify: `.agents/skills/oat-brainstorm/scripts/server.cjs`

**Step 1: Baseline check (GREEN baseline)**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/integration/visual-companion-smoke.test.ts`
Expected: Current tests pass on v5.0.7 baseline (establishes green before port).

**Step 2: Port v6 server (GREEN)**

Copy `skills/brainstorming/scripts/server.cjs` from `obra/superpowers` tag `v6.0.3` and adapt:

- Session-key auth on HTTP + WebSocket (`?key=`, cookie bootstrap)
- Sandboxed `/files/` serving (no symlinks, dotfiles, traversal)
- Security headers (`Cache-Control: no-store`, `X-Frame-Options: DENY`)
- Configurable idle timeout via `BRAINSTORM_IDLE_TIMEOUT_MS` (default 4h)
- Port reuse via `BRAINSTORM_PORT_FILE`
- WebSocket max frame size guard
- Omit Superpowers telemetry/branding hooks

Preserve OAT `CONTENT_DIR` / `STATE_DIR` layout and existing JSON log events consumed by agents.

**Step 3: Verify**

Run: `node --check .agents/skills/oat-brainstorm/scripts/server.cjs`
Expected: Syntax OK.

**Step 4: Commit**

```bash
git add .agents/skills/oat-brainstorm/scripts/server.cjs
git commit -m "feat(p01-t01): port v6 visual companion server with session auth"
```

---

### Task p01-t02: Port helper.js and frame-template.html

**Files:**

- Modify: `.agents/skills/oat-brainstorm/scripts/helper.js`
- Modify: `.agents/skills/oat-brainstorm/scripts/frame-template.html`

**Step 1: Port client resilience (GREEN)**

From v6.0.3:

- Session key in WebSocket URL from `sessionStorage`
- Status pill states (connecting/connected/reconnecting/disconnected)
- Exponential backoff reconnect + paused overlay after disconnect
- Keyed reload after server recovery

Update frame template header branding to **OAT Brainstorm** (remove Superpowers title); ensure `.status` element matches helper expectations.

**Step 2: Verify**

Manual: grep frame for `.status` and helper for `setStatus` — both present.

Note: reconnect/status-pill/paused-overlay runtime behavior (SC#4) is verified manually in a browser and is intentionally outside automated smoke scope (the smoke harness cannot drive a browser).

**Step 3: Commit**

```bash
git add .agents/skills/oat-brainstorm/scripts/helper.js .agents/skills/oat-brainstorm/scripts/frame-template.html
git commit -m "feat(p01-t02): port v6 companion client UI and OAT frame branding"
```

---

### Task p01-t03: Adapt start-server.sh for OAT persistence + v6 flags

**Files:**

- Modify: `.agents/skills/oat-brainstorm/scripts/start-server.sh`

**Step 1: Port v6 launcher behaviors (GREEN)**

Merge v6.0.3 `start-server.sh` capabilities with OAT persistence resolution:

1. `--project-dir` → `<path>/.oat/brainstorm/<session>/` and `<path>/.oat/brainstorm/.last-port` + `.last-token`
2. Repo walk-up → `<repo>/.oat/brainstorm/...`
3. Fallback → `~/.oat/brainstorm/...` with token files at `~/.oat/brainstorm/.last-port` / `.last-token`

Add v6 flags: `--open`, `--idle-timeout-minutes`, `umask 077`, `server-instance-id`, Windows `is_windows_like_shell` + clear `OWNER_PID`, pass `--brainstorm-server-id` to node.

`--idle-timeout-minutes` must be converted to milliseconds and exported as `BRAINSTORM_IDLE_TIMEOUT_MS` so the launcher and `server.cjs` agree on units (server reads ms; default 4h).

**Step 2: Verify**

Run: `bash -n .agents/skills/oat-brainstorm/scripts/start-server.sh`
Expected: No syntax errors.

**Step 3: Commit**

```bash
git add .agents/skills/oat-brainstorm/scripts/start-server.sh
git commit -m "feat(p01-t03): adapt v6 start-server for OAT paths and restart reuse"
```

---

### Task p01-t04: Port stop-server.sh instance-ID guard

**Files:**

- Modify: `.agents/skills/oat-brainstorm/scripts/stop-server.sh`

**Step 1: Port safe shutdown (GREEN)**

From v6.0.3: verify PID carries matching `--brainstorm-server-id` before signaling; write `server-stopped` marker; keep OAT behavior of retaining persistent session dirs (not only `/tmp`).

**Step 2: Verify**

Run: `bash -n .agents/skills/oat-brainstorm/scripts/stop-server.sh`
Expected: No syntax errors.

**Step 3: Commit**

```bash
git add .agents/skills/oat-brainstorm/scripts/stop-server.sh
git commit -m "feat(p01-t04): port v6 stop-server instance verification"
```

---

## Phase 2: Update skill and reference docs

### Task p02-t01: Update visual-companion.md

**Files:**

- Modify: `.agents/skills/oat-brainstorm/references/visual-companion.md`

**Step 1: Align reference with v6 behavior (GREEN)**

Document:

- Session key in URL and cookie auth requirement
- `--open` after user accepts companion
- Restart with same `--project-dir`/repo context reuses port/key (no new URL)
- 4h idle default and `--idle-timeout-minutes`
- Paused overlay / reconnect behavior
- Pre-flight alive check before pushing screens

Keep OAT persistence path examples (`.oat/brainstorm/`, user-scope fallback).

**Step 2: Verify**

Run: `pnpm oat:validate-skills` (or repo equivalent skill validation)
Expected: Skill pack validates.

**Step 3: Commit**

```bash
git add .agents/skills/oat-brainstorm/references/visual-companion.md
git commit -m "docs(p02-t01): document v6 visual companion behavior in reference"
```

---

### Task p02-t02: Update oat-brainstorm SKILL.md step 3

**Files:**

- Modify: `.agents/skills/oat-brainstorm/SKILL.md`

**Step 1: Update activation/handoff prose (GREEN)**

In Step 3 (visual companion offer/accept):

- On accept, pass `--open` when starting server (after user approval)
- Instruct agent to preserve keyed URL from JSON; restart with same path resolution
- Note 4h idle / restart semantics
- Bump skill frontmatter `version:` here — this task is the sole owner of the skill version bump (required for the skill change; not repeated in p03-t02)

Do **not** change Activation Contract or destination logic.

**Step 2: Verify**

Run: `pnpm oat:validate-skills`
Expected: Pass including version/frontmatter checks.

**Step 3: Commit**

```bash
git add .agents/skills/oat-brainstorm/SKILL.md
git commit -m "docs(p02-t02): align brainstorm skill with v6 companion startup"
```

---

## Phase 3: Tests and release validation

### Task p03-t01: Extend visual-companion smoke tests

**Files:**

- Modify: `packages/cli/src/integration/visual-companion-smoke.test.ts`

**Step 1: Add failing assertions (RED)**

Add cases for:

- `server-started` JSON includes keyed URL (`?key=`)
- Unauthenticated GET `/` returns 401/403 (per server behavior)
- Security headers present on responses: `Cache-Control: no-store` and `X-Frame-Options: DENY` (SC#1)
- Sandboxed `/files/` rejects traversal/dotfile payloads: an authenticated `GET /files/../server.cjs?key=<key>` (or a dotfile path) returns 4xx (SC#1)
- Restart with same `--project-dir` reuses port (read `.last-port`)
- `stop-server.sh` refuses stale/wrong instance (mock or integration-safe check)

**Step 2: Implement until green (GREEN)**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/integration/visual-companion-smoke.test.ts`
Expected: All tests pass.

**Step 3: Commit**

```bash
git add packages/cli/src/integration/visual-companion-smoke.test.ts
git commit -m "test(p03-t01): cover v6 visual companion auth and restart behavior"
```

---

### Task p03-t02: NOTICES, lockstep versions, release validate

**Files:**

- Modify: `NOTICES.md`
- Modify: `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json` (lockstep bump)

**Step 1: Update provenance (GREEN)**

`NOTICES.md`: change referenced Superpowers version to v6.0.3; note adapted port (no longer byte-for-byte v5.0.7 for all script files).

Bump all five public packages together per repo guardrail.

**Step 2: Verify**

Run: `pnpm release:validate`
Expected: Pass.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/integration/visual-companion-smoke.test.ts` (or full `pnpm --filter @open-agent-toolkit/cli test`)
Expected: Pass.

**Step 3: Commit**

```bash
git add NOTICES.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
git commit -m "chore(p03-t02): record v6 port provenance and bump public packages"
```

---

## Phase 4: Optional docs touchpoint

### Task p04-t01: Update tool-packs docs if companion behavior changed materially

**Files:**

- Modify: `apps/oat-docs/docs/cli-utilities/tool-packs.md` (only if step 3 / security semantics need user-facing mention)

**Step 1: Assess diff**

If brainstorm pack section still accurate after p02 changes, skip with note in implementation log.

**Step 2: Update if needed (GREEN)**

Add brief note: session-key URL, `--open`, restart reuse — only if missing.

Run: `pnpm build:docs` (if docs changed)
Expected: Build passes.

**Step 3: Commit (if changed)**

```bash
git add apps/oat-docs/docs/cli-utilities/tool-packs.md
git commit -m "docs(p04-t01): note v6 visual companion security and restart behavior"
```

If skipped: record "skipped — no user-facing doc delta" in `implementation.md`.

---

## Reviews

| Cycle | Scope | Status   | Date       | Notes                                                                                                                                       |
| ----- | ----- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| plan  | plan  | received | 2026-06-28 | artifact re-review 0C/1I/1M/0m - reviews/artifact-plan-review-2026-06-28-v2.md; prior fixed review remains archived under reviews/archived/ |

---

## Implementation Complete

**Summary:**

- Phase 1: 4 tasks — v6 server bundle port with OAT paths
- Phase 2: 2 tasks — skill/reference doc alignment
- Phase 3: 2 tasks — smoke tests + release validation
- Phase 4: 1 task — optional docs touchpoint

**Total: 9 tasks**

Ready for `oat-project-implement`.

---

## References

- Discovery: `discovery.md`
- Upstream: https://github.com/obra/superpowers/releases (v6.0.0 visual companion notes; v6.0.3 tag for file source)
- Prior OAT project: `.oat/repo/reference/project-summaries/20260507-independent-brainstorming.md`
- Live dogfood follow-up: `.oat/repo/reference/backlog/items/live-dogfood-oat-brainstorm.md` (`bl-7d5b`)
