---
oat_generated: true
oat_generated_at: 2026-07-02
oat_review_scope: final
oat_review_type: code
oat_review_invocation: auto
oat_project: .oat/projects/shared/brainstorm-visual-companion-v6
---

# Code Review: final (whole implementation)

**Reviewed:** 2026-07-02
**Scope:** Final holistic review of the entire `brainstorm-visual-companion-v6` project — Superpowers v6.0.3 visual-companion security/resilience/lifecycle parity port into `.agents/skills/oat-brainstorm/`, plus doc updates, smoke tests, and release provenance/versioning.
**Files reviewed:** 16 (5 server/client bundle files, `SKILL.md`, `references/visual-companion.md`, 1 smoke-test file, `NOTICES.md`, 5 public `package.json`, `public-package-versions.json`, `.oat/sync/manifest.json`)
**Commits:** `5d9bf2d9..d5b44d86` (18 commits spanning p01–p04 bookkeeping)

## Summary

This final pass independently re-verified every discovery Success Criterion against the shipped code (both by static reading and live server exercise — auth, headers, traversal/dotfile sandbox, and clean stop-server all reproduced exactly as the phase reviews reported), re-ran the two required verification commands (10/10 smoke tests pass; `pnpm release:validate` passes for 5 packages at 0.1.34), and confirmed the diff surface exactly matches the declared code-files-in-scope list with no undeclared drift (docs-index, provider views, and `tool-packs.md` are all correctly untouched). All three carried-forward Minor findings from the phase reviews are still present in the code exactly as described and remain genuinely Minor — none blocks merge. One new Minor observation is added here (an unused test seam), also non-blocking. No Critical or Important findings.

## Findings

### Critical

None.

### Important

None.

### Minor

- **(Carried forward, p01-m1) WebSocket auth hardcodes plaintext-HTTP scheme, narrowing an anticipated deployment mode** (`.agents/skills/oat-brainstorm/scripts/server.cjs:311-317`, `.agents/skills/oat-brainstorm/scripts/helper.js:32-35`)
  - Issue: `isAllowedWebSocketOrigin()` only accepts `origin === 'http://' + host`, and the client's `websocketUrl()` hardcodes `'ws://' + window.location.host`. If the companion were fronted by an HTTPS-terminating tunnel/reverse proxy, the browser's real Origin would be `https://...` and the browser would block a mixed-content `ws://` attempt from an `https:` page — the WS leg would fail even with a valid session key. Confirmed unchanged from the p01 review; still present verbatim at the cited lines. Fails closed (no auth bypass); HTTPS-tunnel support is not a discovery.md Success Criterion.
  - **Disposition: accept-defer.** Not a regression against any stated SC (SC#1 only requires session-key auth on plaintext loopback/tunnel/remote HTTP binds, which this satisfies), and it fails closed rather than open. Fixing it (deriving scheme from `window.location.protocol` and accepting both `http://`/`https://` origins) is a reasonable follow-up if/when HTTPS-tunnel deployment becomes a real use case, but there is no evidence that mode is used today. No plan task needed for this project; worth a one-line backlog note if HTTPS-tunnel support is ever requested.

- **(Carried forward, p01-m2) Vestigial dead-code block carried through the rewrite** (`.agents/skills/oat-brainstorm/scripts/start-server.sh:185-190`)
  - Issue: The "Kill any existing server" block guards on `[[ -f "$PID_FILE" ]]`, but `PID_FILE` lives under a `SESSION_DIR` that is always freshly generated (`SESSION_ID="$$-$(date +%s)"`) and `mkdir -p`'d immediately beforehand, so the file can never exist at this point — the block is dead code. Confirmed unchanged and still present verbatim at lines 185-190. This dead block predates the v6 port (present in the pre-port baseline at `cff2146f`); p01-t03 rewrote the surrounding launcher without removing it. Restart/port-reuse safety is correctly handled elsewhere (`server.cjs`'s `EADDRINUSE` fallback logic).
  - **Disposition: accept-defer.** Purely cosmetic/misleading-to-future-readers; zero functional or security impact (confirmed dead by construction, not just empirically). Not worth a dedicated fix-now task for this project; fine to clean up opportunistically the next time `start-server.sh` is touched.

- **(Carried forward, p02-m1) WS-authentication doc wording implies cookie-only reliance** (`.agents/skills/oat-brainstorm/references/visual-companion.md:49`)
  - Issue: The doc states the WebSocket upgrade authenticates "via the cookie without repeating the key in the address bar." In the shipped client, `websocketUrl()` (`helper.js:32-35`) still appends `?key=<sessionKey>` to the `ws://` URL whenever a session key is present in `sessionStorage` — the WS handshake carries the key redundantly alongside the cookie; it does not rely on the cookie exclusively. The statement is only true of the visible address bar, not of the WS request itself. Confirmed the sentence is unchanged since the p02 review.
  - **Disposition: accept-defer.** Does not mislead an agent operationally (the URL to hand the user is unaffected either way) and does not describe incorrect security behavior — only imprecise mechanism wording for a future doc maintainer. Low priority; fine to tighten in a future doc pass touching this file, consistent with the p02 review's own suggested rewrite.

- **(New) `nextReconnectDelay` is exported "for unit tests" but has no unit test** (`.agents/skills/oat-brainstorm/scripts/helper.js:6-12`)
  - Issue: The comment above `nextReconnectDelay` explicitly says "Exported for unit tests," and the file has a `module.exports` branch specifically to support that (`typeof module !== 'undefined' && module.exports`). No test file (`helper.test.ts` or similar) exercises this export anywhere in the repo (checked `packages/cli/src` for any reference to `nextReconnectDelay` — none found beyond `helper.js` itself). The function is a small pure backoff-doubling calculation, so the risk of an undetected regression is low, and SC#4 (client status pill/paused overlay) is explicitly scoped as manual-verification-only per `plan.md` p01-t02 Step 2 — this is consistent with that decision, just noting the test seam the code deliberately built is currently unused.
  - Fix: Optional — add a small `helper.test.ts` asserting `nextReconnectDelay(500, 30000)` doubles and caps at `MAX_RECONNECT_MS`. Low priority; does not block this project's closeout since it's a pure, low-risk function and outside the declared automated-smoke scope for SC#4.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md` (Success Criteria — quick-mode requirement source), `plan.md` (task specs and Reviews table), `implementation.md` (Deviations, per-phase summaries), all three prior phase review artifacts (`p01-review-2026-07-02.md`, `p02-review-2026-07-02.md`, `p03-review-2026-07-02.md` + `-v2.md`), direct reads of all 7 code/doc files under `.agents/skills/oat-brainstorm/`, direct read of `packages/cli/src/integration/visual-companion-smoke.test.ts`, direct read of `NOTICES.md`/`package.json`×5/`public-package-versions.json`, live server exercise (start-server.sh → curl auth/headers/traversal/dotfile → stop-server.sh, full cycle reproduced and cleaned up), and direct execution of both required verification commands plus `pnpm oat:validate-skills`.

### Success Criteria Coverage (discovery.md SC#1–SC#7)

| Success Criterion                                                                                    | Status                                                            | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SC#1 — session-key auth (HTTP+WS) + `/files/` sandbox (traversal/symlink/dotfile) + security headers | **implemented**                                                   | Re-verified live: unauth `GET /` → `403`; authed `GET /?key=<key>` → `200` with `Cache-Control: no-store`, `X-Frame-Options: DENY` (plus additive `Referrer-Policy`, CSP `frame-ancestors 'none'`, `Cross-Origin-Resource-Policy`); `GET /files/../server.cjs?key=<key>` and `GET /files/.bashrc?key=<key>` both → `404`. Smoke suite independently covers traversal/dotfile/symlink with real leak-check fixtures (not vacuous — empirically red/green-proven per p03 re-review) and WS auth via `isAllowedWebSocketOrigin`/`isAuthorized`. WS Origin check narrows to plaintext-HTTP only (carried Minor, accept-defer — see Findings).                                        |
| SC#2 — restart reuses port/key                                                                       | **implemented**                                                   | `server.cjs` `preferredPort()`/`initialToken()` read `.last-port`/`.last-token` under the OAT-resolved root; only written back on non-fallback bind (avoids clobbering a live sibling session). Smoke test `reuses the recorded port on restart...` asserts both port reuse and, since the p03 fix, session-key reuse via `keyFromServerUrl` equality — genuinely closes the SC#2 coverage gap flagged in the original p03 review.                                                                                                                                                                                                                                               |
| SC#3 — idle 4h configurable + stop-server instance guard                                             | **implemented**                                                   | `IDLE_TIMEOUT_MS` defaults to `4*60*60*1000`, overridable via `BRAINSTORM_IDLE_TIMEOUT_MS` (`start-server.sh` converts `--idle-timeout-minutes` → ms). Live-verified `--idle-timeout-minutes 1` → `idle_timeout_ms:60000` in this review's spot-check. `stop-server.sh`'s `is_brainstorm_server()` requires a live PID **and** a matching `--brainstorm-server-id` argv before signaling; smoke test tampers the recorded instance id and asserts `{"status":"stale_pid"}` while the real process survives — matches fail-closed design.                                                                                                                                         |
| SC#4 — client status pill/paused overlay (manual-verified)                                           | **implemented (code-verified; runtime behavior manual per plan)** | `helper.js` implements `setStatus()` (connecting/connected/reconnecting/disconnected), `nextReconnectDelay()` exponential backoff (500ms→30s cap), `showTombstone()` after `TOMBSTONE_AFTER_MS` (15s), and `reloadAfterRecovery()`; `frame-template.html` has the matching `.status` element and CSS. `plan.md` p01-t02 explicitly scopes actual browser-rendered reconnect/status-pill/tombstone behavior as manual verification, outside automated smoke — consistent with the phase-1 review's disposition. This final review re-confirmed the code is present and internally consistent but did not re-run a live browser session (same manual-scope boundary the plan set). |
| SC#5 — SKILL.md + reference docs                                                                     | **implemented**                                                   | `SKILL.md` step 3 accept branch documents `--open`, keyed-URL preservation, restart semantics, 4h idle note; frontmatter `version: 1.1.0 → 1.2.0` bumped (sole owner per plan). `references/visual-companion.md` documents session-key/cookie auth, `403` on missing key, `--open`, restart/port/key reuse, 4h idle default + override, reconnect/paused-overlay behavior, and the pre-flight alive check. One doc-precision Minor carried forward (WS auth cookie-only wording) — accept-defer, does not misstate operational behavior.                                                                                                                                         |
| SC#6 — smoke tests + `release:validate` pass                                                         | **implemented**                                                   | Re-ran both in this review: `vitest run src/integration/visual-companion-smoke.test.ts` → **10/10 passed**; `pnpm release:validate` → **passed** for all 5 public packages at `0.1.34`. `pnpm oat:validate-skills` also re-run → `OK: validated 53 oat-* skills`.                                                                                                                                                                                                                                                                                                                                                                                                                |
| SC#7 — NOTICES v6.0.3                                                                                | **implemented**                                                   | `NOTICES.md` "brainstorming skill — visual companion" section correctly references v6.0.3, describes a per-file adapted port (not byte-for-byte), and lists all 5 adapted files plus `references/visual-companion.md`; the separate `brainstorming` skill section correctly retains its own 5.0.7 reference for the unrelated prose it documents. No longer claims byte-for-byte v5.0.7 parity for the visual-companion files.                                                                                                                                                                                                                                                   |

**All 7 Success Criteria: implemented.** No partial or missing criteria found in this final pass.

### Deferred Minor Findings Ledger — Dispositions

| ID     | Finding                                                              | Disposition      | Rationale                                                                                                                                                                                                                 |
| ------ | -------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| p01-m1 | WebSocket Origin check + client `ws://` assume plaintext HTTP        | **accept-defer** | Fails closed; not a stated SC; only affects an unsupported HTTPS-tunnel deployment mode with no evidence of current use. Fix is a small, well-scoped follow-up if that mode is ever requested.                            |
| p01-m2 | Vestigial dead "kill any existing server" block in `start-server.sh` | **accept-defer** | Confirmed genuinely unreachable by construction (not just empirically); zero functional/security impact; pre-existing before this project's rewrite. Cosmetic cleanup only, fine to defer to a future touch of this file. |
| p02-m1 | WS-auth doc wording implies cookie-only reliance                     | **accept-defer** | Doc-precision nit only; does not misstate security behavior or mislead an agent's operational handling of the URL. Low priority for a future doc pass.                                                                    |

None of the three carried-forward Minors block merge, and none has regressed or worsened since its originating phase review — all are confirmed present exactly as previously described, at the same locations, with the same (already-assessed) low impact.

### Extra Work (not in declared requirements)

- `BRAINSTORM_LIFECYCLE_CHECK_MS` test-speed seam (`server.cjs`) — already flagged and accepted as additive/non-scope-creep in the p01 review; re-confirmed harmless.
- Additive security headers beyond the two named in `plan.md` (`Referrer-Policy`, CSP `frame-ancestors 'none'`, `Cross-Origin-Resource-Policy`) — already flagged and accepted as additive/harmless in the p01 review.
- OAT indicator-bar UI retained alongside the v6 status pill (deliberate deviation, documented in `implementation.md` § Deviations and in `NOTICES.md`) — traced to discovery.md Key Decision #3 ("do not regress" existing behavior); correctly disclosed, not scope creep.

No other unrequested functionality found in the full diff (`git diff --stat 5d9bf2d9..d5b44d86` excluding `.oat/projects/**` bookkeeping returns exactly the 16 files declared in scope — no undeclared provider-view drift, no `tool-packs.md` change despite p04 being available to make one, matching the documented intentional no-op skip).

## Cross-Cutting Observations (holistic pass beyond phase-scoped reviews)

- **Diff-surface integrity:** Confirmed the full commit-range diff (`5d9bf2d9..d5b44d86`, excluding `.oat/projects/**`) touches exactly the 16 files enumerated in this review's scope block — no more, no less. Provider-linked views (`.claude/`, `.cursor/`, etc.) show zero diff in-range, consistent with `implementation.md`'s "No changes required" sync-run note.
- **Version consistency:** All 5 public packages and `public-package-versions.json` agree on `0.1.34`; `public-package-versions.json` intentionally omits `control-plane` — confirmed this is a pre-existing convention (unchanged from the pre-project baseline `5d9bf2d9`), not a gap introduced by this project.
- **Live reproduction:** Independently reproduced (outside the phase reviews) a full start → auth-check → traversal/dotfile-check → stop cycle against the shipped `start-server.sh`/`server.cjs`/`stop-server.sh`, with identical results to what the phase reviews reported. No drift between what was reviewed per-phase and what is on `d5b44d86` today.
- **No stray files:** `git status --porcelain` was clean before and after this review's spot-check and command runs; no experiment artifacts were left behind.

## Verification Commands

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/integration/visual-companion-smoke.test.ts
pnpm release:validate
pnpm oat:validate-skills
node --check .agents/skills/oat-brainstorm/scripts/server.cjs
bash -n .agents/skills/oat-brainstorm/scripts/start-server.sh
bash -n .agents/skills/oat-brainstorm/scripts/stop-server.sh
```

Manual end-to-end spot-check (reproduced in this review; already reverted/cleaned up):

```bash
bash .agents/skills/oat-brainstorm/scripts/start-server.sh --project-dir <tmp-dir> --idle-timeout-minutes 1
curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:<port>/"                       # expect 403
curl -s -D - -o /dev/null "http://127.0.0.1:<port>/?key=<key>"                            # expect 200 + security headers
curl -s -o /dev/null -w "%{http_code}\n" --path-as-is "http://127.0.0.1:<port>/files/../server.cjs?key=<key>"  # expect 404
curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:<port>/files/.bashrc?key=<key>"                       # expect 404
bash .agents/skills/oat-brainstorm/scripts/stop-server.sh <session_dir>
```

## Verdict

**VERDICT: pass** (0 Critical, 0 Important, 4 Minor — all either previously-assessed carried-forward items disposed as accept-defer, or a new low-priority optional test-coverage note)

## Recommended Next Step

Run the `oat-project-review-receive` skill to close out this project. No plan tasks are required for the deferred Minors (all dispositioned accept-defer above); optionally log the WebSocket HTTPS-tunnel gap (p01-m1) and the missing `nextReconnectDelay` unit test as standalone backlog notes if either becomes relevant later.
