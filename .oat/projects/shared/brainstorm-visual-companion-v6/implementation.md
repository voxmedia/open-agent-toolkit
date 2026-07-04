---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-02
oat_current_task_id: null
oat_generated: false
---

# Implementation: brainstorm-visual-companion-v6

**Started:** 2026-07-02
**Last Updated:** 2026-07-02

> Resume pointer: all tasks complete — awaiting final review.

## Progress Overview

| Phase   | Status   | Tasks | Completed |
| ------- | -------- | ----- | --------- |
| Phase 1 | complete | 4     | 4/4       |
| Phase 2 | complete | 2     | 2/2       |
| Phase 3 | complete | 2     | 2/2       |
| Phase 4 | complete | 1     | 1/1       |

**Total:** 9/9 tasks resolved (p04-t01 intentionally skipped — no user-facing doc delta)

---

## Phase 1: Port Superpowers v6 visual bundle

**Status:** complete

### Task p01-t01: Import and adapt server.cjs

**Status:** completed (`feat(p01-t01)` — e7500d71)

Ported v6.0.3 `server.cjs`: session-key auth (HTTP + WebSocket, `?key=`/cookie bootstrap), sandboxed `/files/` serving (traversal/symlink/dotfile rejection), security headers (`Cache-Control: no-store`, `X-Frame-Options: DENY`, plus additive `Referrer-Policy` / `CSP frame-ancestors 'none'` / `Cross-Origin-Resource-Policy`), WebSocket max-frame guard, `BRAINSTORM_PORT_FILE` reuse, `BRAINSTORM_IDLE_TIMEOUT_MS` (default 4h), `--open`. Stripped Superpowers telemetry/branding. Verify: `node --check` pass.

### Task p01-t02: Port helper.js and frame-template.html

**Status:** completed (`feat(p01-t02)` — a06beecc)

Ported v6 client resilience (exponential-backoff reconnect, status pill states, paused/tombstone overlay, keyed reload-after-recovery). Rebranded frame `<title>`/header to "OAT Brainstorm". Retained OAT `.indicator-bar`/`#indicator-text` UI (see Deviations). Verify: `.status`/`setStatus` presence confirmed.

### Task p01-t03: Adapt start-server.sh for OAT persistence + v6 flags

**Status:** completed (`feat(p01-t03)` — 5ed75687)

Merged v6 launcher into OAT 3-tier persistence (`--project-dir` → repo walk-up → `~/.oat/brainstorm/`); `.last-port`/`.last-token` under `.oat/brainstorm/`. Added `--idle-timeout-minutes` (min→ms, exports `BRAINSTORM_IDLE_TIMEOUT_MS`), `--open`, `umask 077`, `server-instance-id` + `--brainstorm-server-id`, Windows shell handling + OWNER_PID clearing. Verify: `bash -n` pass.

### Task p01-t04: Port stop-server.sh instance-ID guard

**Status:** completed (`feat(p01-t04)` — ef7b1b9f)

Ported v6 instance-ID guard: verifies PID cmdline carries matching `--brainstorm-server-id` before signaling; writes `server-stopped` marker; retains persistent (non-`/tmp`) session dirs. Verify: `bash -n` pass; stale-PID guard confirmed to fail closed.

### Phase 1 Summary

- **Outcome:** OAT brainstorm visual companion bundle brought to Superpowers v6.0.3 security/resilience parity — session-key auth on HTTP+WS, sandboxed static file serving, security headers, resilient reconnecting client, OAT-native port/token persistence, and a safe instance-verified stop path.
- **Key files:** `.agents/skills/oat-brainstorm/scripts/{server.cjs,helper.js,frame-template.html,start-server.sh,stop-server.sh}`
- **Verification:** per-task static checks (`node --check`, `bash -n`, selector grep) + implementer end-to-end smoke (403 unauth / keyed 200 with headers / traversal+dotfile 404 / restart port reuse / stale-PID guard) + reviewer empirical re-verification (auth HTTP+WS, sandbox, instance guard fail-closed). Pre-existing `visual-companion-smoke.test.ts` (5 tests) still passes unmodified.
- **Notable decisions/deviations:** retained OAT indicator-bar UI alongside v6 status pill (see Deviations); added defensive security headers beyond the two named in plan (additive).

---

## Phase 2: Update skill and reference docs

**Status:** complete

### Task p02-t01: Update visual-companion.md

**Status:** completed (`docs(p02-t01)` — 5ea69291)

Documented v6 session-key URL/cookie auth (403 on unauth), `--open`, restart port/key reuse, 4h idle default + `--idle-timeout-minutes`, status-pill/paused-overlay/backoff-reconnect behavior. Fixed a stale "30 minutes" idle claim to the actual 4h default. OAT persistence-path examples preserved. Verify: `pnpm oat:validate-skills` → OK (53 skills).

### Task p02-t02: Update oat-brainstorm SKILL.md step 3

**Status:** completed (`docs(p02-t02)` — 60740f71)

Updated Step 3 accept branch (pass `--open`, preserve keyed `url`, restart reuse, 4h idle note). Activation Contract + destination logic untouched (diff-verified). Bumped frontmatter `version: 1.1.0 → 1.2.0` (sole owner of the skill version bump per plan). Verify: `pnpm oat:validate-skills` → OK.

### Phase 2 Summary

- **Outcome:** Skill reference + activation prose now describe the v6 companion (keyed URL, `--open`, restart reuse, idle) accurately against shipped code; canonical skill version bumped for the release guardrail.
- **Key files:** `.agents/skills/oat-brainstorm/references/visual-companion.md`, `.agents/skills/oat-brainstorm/SKILL.md`
- **Verification:** `pnpm oat:validate-skills` (OK); docs fact-checked against `server.cjs`/`start-server.sh`/`helper.js`; Activation Contract preserved.
- **Notable decisions/deviations:** none.

---

## Phase 3: Tests and release validation

**Status:** complete

### Task p03-t01: Extend visual-companion smoke tests

**Status:** completed (`test(p03-t01)` — e1ea29bd; hardened in fix 1f1e623f)

Added 5 v6-hardening smoke tests (keyed URL, unauth 403 + security headers, `/files/` traversal+dotfile 4xx, `/files/` symlink-escape 4xx, restart port+key reuse, stop-server stale-instance guard). Review found the traversal/dotfile assertions were initially vacuous (payloads hit nonexistent files); fix `1f1e623f` replaced them with real fixtures (sentinel above `CONTENT_DIR`, real `.hidden.html`) asserting 4xx + no content leak, and added the restart key-reuse assertion. RED/GREEN verified by removing the server guard (test fails) and restoring (test passes). Verify: 10/10 tests pass.

### Task p03-t02: NOTICES, lockstep versions, release validate, provider sync

**Status:** completed (`chore(p03-t02)` — 4f993aa8)

`NOTICES.md` updated to v6.0.3 adapted-port provenance (per-file adaptation notes, no longer byte-for-byte v5.0.7). Lockstep bump of all 5 public packages to `0.1.34` (branch already carried 0.1.33) + `public-package-versions.json`. Ran `pnpm run cli -- sync --scope all` (provider views: "No changes required"; only `.oat/sync/manifest.json` `oatVersion` changed). Verify: `pnpm release:validate` PASSED (5 packages).

### Phase 3 Summary

- **Outcome:** Automated regression coverage for the v6 security/resilience/lifecycle guarantees (auth, headers, traversal/dotfile/symlink sandbox, restart port+key reuse, stop-server instance guard) — now genuinely load-bearing after the fix — plus release provenance and a validated lockstep version bump.
- **Key files:** `packages/cli/src/integration/visual-companion-smoke.test.ts`, `NOTICES.md`, 5 `package.json`, `packages/cli/assets/public-package-versions.json`, `.oat/sync/manifest.json`
- **Verification:** 10/10 smoke tests pass; `pnpm release:validate` passes (5 packages @ 0.1.34); traversal/dotfile/symlink tests RED/GREEN-proven; lint + format clean.
- **Notable decisions/deviations:** version landed on 0.1.34 (branch pre-carried 0.1.33); 1 fix iteration to make traversal/dotfile tests real.

---

## Phase 4: Optional docs touchpoint

**Status:** complete (skipped — no delta)

### Task p04-t01: Update tool-packs docs if companion behavior changed materially

**Status:** skipped — no user-facing doc delta

Assessed `apps/oat-docs/docs/cli-utilities/tool-packs.md` (Brainstorm pack "Visual companion" bullet). It is a high-level pack-lifecycle description that already defers operational/security details (session-key auth, `--open`, restart reuse, idle) to `.agents/skills/oat-brainstorm/references/visual-companion.md` (updated in p02-t01) and its persistence-path claims remain accurate under v6. No stale or missing user-facing content, so per the plan's explicit conditional-skip path no edit was made. No commit.

### Phase 4 Summary

- **Outcome:** No docs change required — the tool-packs overview already points to the (now v6-accurate) reference doc; forcing a duplicate note would add redundancy, not coverage.
- **Key files:** none.
- **Verification:** read-only assessment of `tool-packs.md` vs the shipped v6 behavior and the updated reference doc.
- **Notable decisions/deviations:** intentional no-op skip per plan Phase 4 design.

---

## Orchestration Runs

<!-- orchestration-runs-start -->

### Run 1 — 2026-07-02

**Branch:** parity-check
**Tier:** 1 (subagents)
**Policy:** merge-strategy=sequential, retry-limit=2, dispatch-ceiling=sonnet
**Phases:** 4 executed, 4 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer | Review        | Fix Iterations | Disposition        |
| ----- | ----------- | ------------- | -------------- | ------------------ |
| p01   | DONE        | pass          | 0/2            | committed          |
| p02   | DONE        | pass          | 0/2            | committed          |
| p03   | DONE        | fail→pass     | 1/2            | committed          |
| p04   | DONE (skip) | n/a (no diff) | 0/2            | skipped (no delta) |

#### Parallel Groups

- None — all phases sequential (`oat_plan_parallel_groups: []`).

#### Dispatch Notes

- Dispatch: p01 implementation + review via Claude Code Task subagents, `model_axis=selected:sonnet`, `effort_axis=not-applicable`, ceiling sonnet (enforced — Task model arg). No escalation needed.
- Upstream v6.0.3 source staged locally (scratchpad clone of `obra/superpowers` @ `v6.0.3`) and provided to the implementer; no network fetch inside the subagent.
- Discovered an unprocessed plan re-review (`artifact-plan-review-2026-06-28-v2.md`, 0C/1I/1M/0m) that post-dated the first receive. Folded both findings into the plan before reaching p03: symlink `/files/` regression test → `p03-t01`; provider-view sync (`oat sync --scope all`) → `p03-t02`. v2 review archived; plan row → `fixes_completed`.

#### Outstanding Items

- All carried minors (p01×2, p02×1) plus 1 new final-review minor were dispositioned at final review as **accept-defer** with rationale — see `## Review Received: final` → Deferred Findings. None blocking; final review passed.

#### Artifact / Design Deltas

Run-scoped snapshot only. Durable record is `## Deviations` below.

| Task / Review | Source Artifact                              | Planned / Documented                                      | Actual / Accepted                                   | Reason                                                            | Source of Truth | Follow-up                                   |
| ------------- | -------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------- | --------------- | ------------------------------------------- |
| p01-t02       | plan.md p01-t02 / v6.0.3 frame-template.html | v6 upstream removes `.indicator-bar` selection-summary UI | OAT indicator-bar retained alongside v6 status pill | plan only asked to add v6 resilience + rebrand, not remove OAT UI | implementation  | none (deliberate; documented in Deviations) |

<!-- orchestration-runs-end -->

---

## Final Summary (for PR/docs)

**What shipped:** OAT's `oat-brainstorm` visual companion is now at Superpowers v6.0.3 security/resilience/lifecycle parity while preserving OAT's persistence paths and conditional-offer skill semantics:

- **Security:** session-key auth on HTTP + WebSocket (`?key=` + cookie bootstrap); sandboxed `/files/` serving that rejects path traversal, dotfiles, and symlink escape; security headers (`Cache-Control: no-store`, `X-Frame-Options: DENY`, plus additive `Referrer-Policy` / CSP `frame-ancestors 'none'` / `Cross-Origin-Resource-Policy`); WebSocket max-frame guard.
- **Resilience (client):** exponential-backoff reconnect, status-pill states, paused/tombstone overlay, keyed reload after server recovery; frame rebranded "OAT Brainstorm". OAT's existing selection-summary indicator bar retained alongside the v6 status pill.
- **Lifecycle:** OAT three-tier persistence (`--project-dir` → repo walk-up → `~/.oat/brainstorm/`) with `.last-port`/`.last-token`; restart with the same `--project-dir` reuses port + key; `--open`; configurable idle timeout (`--idle-timeout-minutes` → `BRAINSTORM_IDLE_TIMEOUT_MS`, 4h default); `umask 077`; instance-verified `stop-server` (matches `--brainstorm-server-id` before signaling, writes `server-stopped`).
- **Docs/provenance:** `references/visual-companion.md` + `SKILL.md` step 3 document the v6 behavior; SKILL.md `version` 1.1.0 → 1.2.0; `NOTICES.md` updated to v6.0.3 adapted-port provenance.
- **Release:** lockstep bump of all 5 public packages to 0.1.34; provider views synced (no drift); `pnpm release:validate` passes.

**Key files/modules:** `.agents/skills/oat-brainstorm/scripts/{server.cjs,helper.js,frame-template.html,start-server.sh,stop-server.sh}`, `.agents/skills/oat-brainstorm/{SKILL.md,references/visual-companion.md}`, `packages/cli/src/integration/visual-companion-smoke.test.ts`, `NOTICES.md`, 5 public `package.json` + `public-package-versions.json`.

**Verification performed:** 10/10 visual-companion smoke tests pass (auth/headers, traversal/dotfile/symlink sandbox — RED/GREEN-proven load-bearing, restart port+key reuse, stop-server instance guard); `pnpm release:validate` passes (5 packages @ 0.1.34); `pnpm oat:validate-skills` passes; lint + format clean; implementer + reviewer both ran live end-to-end server exercises.

**Design deltas:** OAT indicator-bar UI retained vs v6 upstream removal (see Deviations). Carried non-blocking minors for final-review disposition: p01 — plaintext-HTTP WS assumption for an unsupported HTTPS-tunnel mode (fails closed) + a pre-existing dead "kill existing server" block; p02 — WS-auth doc wording nit.

---

## Review Received: final

**Date:** 2026-07-02
**Review artifact:** reviews/final-review-2026-07-02.md
**Verdict:** passed (0 Critical, 0 Important, 4 Minor)

All 7 discovery Success Criteria (SC#1–SC#7) confirmed implemented via code reading + live spot-check (start-server → curl unauth/authed/traversal/dotfile → stop-server). Tests 10/10; `release:validate` passes (5 packages @ 0.1.34); `oat:validate-skills` OK. No Critical/Important findings; no fix tasks created.

### Deferred Findings (Minor — accept-defer, auto-disposition)

All four minors were dispositioned as **accept-defer** with rationale (not converted to fix tasks — converting would be scope creep on a passing implementation; several are explicitly outside declared success criteria):

- **p01-m1** — WebSocket Origin check + client `ws://` URL assume plaintext HTTP. Defer: fails closed, HTTPS-tunnel deployment is not a stated success criterion, no current use. Follow-up trigger: if an HTTPS/tunnel deployment mode is ever added.
- **p01-m2** — vestigial dead "kill any existing server" block in `start-server.sh`. Defer: unreachable by construction and pre-existing before this project (not introduced here); zero functional impact. Follow-up: opportunistic cleanup.
- **p02-m1** — WS-auth doc wording implies cookie-only reliance. Defer: doc-precision nit; does not misstate security behavior. Follow-up: tidy on next docs pass.
- **final-m (new)** — `nextReconnectDelay` exported "for unit tests" but has no test. Defer: SC#4 client runtime behavior is explicitly manual-scope per plan; low value. Follow-up: add if a client unit-test harness is introduced.

**Next:** implementation complete and final review passed → generate summary / open PR (`oat-project-summary` → `oat-project-pr-final`).

---

## Deviations

### Phase 1: indicator-bar UI retained alongside v6 status pill

**Source of truth:** discovery.md Key Decisions #3 ("do not regress ... only
update companion startup/usage prose and flags") and the general instruction
to preserve existing OAT behavior except where plan/discovery calls for a
change.

**What diverged:** Superpowers v6.0.3 upstream removed the `.indicator-bar` /
`#indicator-text` selection-summary UI entirely from `frame-template.html` and
`helper.js` in favor of the new status pill. Plan p01-t02 only asked to port
the v6 resilience features (status pill, backoff reconnect, paused overlay,
keyed reload) and to rebrand the header — it did not ask to remove the
existing indicator bar. A literal "replace the whole file with upstream"
port would have silently dropped that OAT UI behavior.

**Resolution:** Kept the pre-existing OAT indicator-bar markup/CSS in
`frame-template.html` (`#claude-content` id retained, not renamed to v6's
`#frame-content`) and re-added the original click-handler block in
`helper.js` that updates `#indicator-text`, merged alongside v6's new
`setStatus`/backoff/tombstone logic. Net effect: OAT gets the full v6
resilience/security UI plus the existing selection-summary bar, with no
functionality regression either direction.

**Follow-up disposition:** No further action expected; flagging for reviewer
awareness since it's a deliberate non-byte-for-byte deviation from the v6.0.3
source file (already anticipated by discovery.md: "Breaks byte-for-byte
parity with v5.0.7 (document in NOTICES.md)" — this is an additional,
smaller byte-for-byte divergence from v6.0.3 itself, on top of the OAT
persistence-path/branding differences already called out in plan.md).

---

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
