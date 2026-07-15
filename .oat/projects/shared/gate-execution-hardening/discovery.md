---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-07-15
oat_generated: false
oat_template: false
oat_template_name: discovery
---

# Discovery: gate-execution-hardening

> **Route note:** quick mode with **required lightweight design** — the originating request explicitly demands a design pass (root causes → configuration precedence → headless execution state machine → liveness adapter boundary → test strategy) before implementation. Do not go straight to plan.

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

## Initial Request

From an external orchestrator's handover (2026-07-14), grounded in a real consumer-app dogfood incident: investigate, design, and implement OAT hardening for headless `oat gate review` execution. Treat as an orchestration/runtime problem, not a consumer-app configuration fix. Three required outcomes:

1. **Make headless gate delegation completion-safe** — gate-originated `oat-project-review-provide` must not launch an asynchronous reviewer the headless parent cannot reliably await. Explicit contract, not prompt wording: headless/non-interactive invocation marker (env var or invocation context), inline review required in that mode when the runtime has the configured reviewer identity, child delegation only via synchronous/awaited mechanisms with verified completion, fail closed otherwise. Do not weaken reviewer identity, dispatch-ceiling, provenance, or cross-provider checks.
2. **Make gate budgets scope/target-aware** — the fixed 15-minute budget is insufficient for large implementation/final reviews. Configurable timeout surface with documented precedence (per-exec-target, per-gate/skill, CLI `--timeout-ms`, defaults by review type/scope). Direction: ~30 minutes for implementation/final code reviews, shorter default for bounded artifact reviews. Backward compatible; validated bounds; timeout remains fail-closed.
3. **Improve liveness reporting** — `gate-liveness` reports `idleMs == elapsedMs` whenever stdout is quiet, even while provider transcripts are actively growing. Distinguish stdout-idle vs process-alive vs observable provider transcript/session activity vs last observed progress stage. Timeout/failure envelopes report the latest trustworthy activity evidence. Use runtime adapters or a bounded capability interface; avoid hardcoding transient transcript schemas.

Evidence, incident references, secondary improvements, and constraints: see the full handover prompt (recorded in this session's record 2026-07-14) and the Evidence section below.

## Evidence (verified 2026-07-14 by read-only recon against transcripts and artifacts)

Consumer-app dogfood run (`/Users/tstang/Code/consumer-app`, project `consumer-app-v1`, phase p11 review):

- **Cursor timeout (run `0c98b7de`, target `cursor-gpt-5-6-sol-max`) — confirmed.** 47 transcript records; authenticated and productively reviewing (diff inspection, schema sweeps, startup invariants) the whole run; killed at the fixed 900000ms budget with no artifact. Scope was large: 24 files + full project artifacts + a multi-commit range. A control probe (`gpt-5.6-luna-medium`, tiny fixture) completed inline review + artifact + commit in ~90–120s — Cursor headless skill execution works; the failure was scope/budget.
- **Claude async-child failure (run `9a598c1b`, target `claude-fable-skip-permissions`) — confirmed, with a root-cause refinement.** The headless parent launched `oat-reviewer` as a background agent and Claude print mode terminated background tasks at exactly 600.17s (`CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS` ceiling); the child was still productive (208 records, test suite passing at kill time); no finalized artifact; OAT correctly rejected for missing correlated provenance. **Refinement: the async dispatch was skill-directed, not parent improvisation** — the failed run's gate prompt had no inline instruction, and `oat-project-review-provide`'s Tier-1 dispatch guidance says "Run in background if supported (`run_in_background: true`)".
- **Successful inline Fable run (run `4f00f11e`) — confirmed.** Same target succeeded in ~7m24s when the prompt explicitly forbade async children — i.e., today's only working headless path is prompt wording, exactly what the request says not to rely on.
- **Neither failed run left a late artifact** — termination was mid-review. Late-artifact recovery (shipped by the sibling project, below) is complementary to, not a substitute for, these fixes.

## Current-Source Findings (verified 2026-07-14; re-verify line numbers, main moves fast)

- **Timeout surface:** single global knob — `GATE_EXEC_TIMEOUT_MS = 15 * 60 * 1000` + `OAT_GATE_EXEC_TIMEOUT_MS` env override (`resolveGateExecTimeoutMs`, `packages/cli/src/commands/gate/index.ts`). No `--timeout-ms` flag, no per-target field, no review-type defaults. Natural slots: `ExecTarget.timeoutMs?` beside `priority` (`packages/cli/src/config/oat-config.ts`, merge in `config/resolve.ts`, `gate target set --timeout-ms`), a `--timeout-ms` flag via existing `parsePositiveInteger`, and a small policy layer for review-type/scope defaults (the only genuinely new design). Precedence to design: CLI flag → target config → review-type default → env → constant.
- **Liveness:** `GateLivenessSnapshot { elapsedMs, hardBudgetMs, idleMs }`; `lastActivityAt` updates on stdout/stderr `data` only — `idleMs == elapsedMs` under silent work is confirmed at code level. The `onLiveness` callback/interval plumbing is already pluggable. Failure envelopes (`writeReviewGateExecutionFailure`) carry no activity evidence. Both failed runs' provider transcripts grew continuously — transcript mtime/size observation would have distinguished progress from hang in both cases.
- **Headless signals:** gate spawns children with `processEnv` unchanged — no `OAT_NON_INTERACTIVE`/`OAT_AUTONOMOUS` injection; the headless contract is prompt prose only (`REVIEW_GATE_CONTEXT_NOTE`). The autonomy contract (`.agents/docs/autonomy-contract.md`, merged #133/#150) already defines `OAT_AUTONOMOUS=1` + `OAT_NON_INTERACTIVE=1` session signals, child-propagation rules, and "accepted launch is terminal / recover only via the same handle" language — reusable for the gate contract.
- **Skill dispatch policy:** `oat-project-review-provide` gate mode skips confirmation and sets `oat_review_invocation: gate`, but Tier-1 dispatch still says "Run in background if supported" with post-hoc artifact verification — the direct cause of the Claude failure mode.
- **Correlation machinery:** `runId` UUID embedded in prompt frontmatter; unique-match correlation + corroboration + `receiveEligible` already exist. No pre-artifact run marker (only an in-memory before-snapshot of review candidates).

## Prior Art: transcript location and observation (operator recon, 2026-07-15)

The operator maintains two working implementations of cross-provider transcript observation plus vault documentation — use as **reference implementations** (OAT must not depend on these repos; port the path knowledge and edge-case handling):

- **Primary format/normalization references:** `/Users/tstang/Code/skills/skills/session-observer/references/transcript-formats.md` (provider paths + JSONL record shapes) and `/Users/tstang/Code/skills/src/transcript/core/runtimes.ts` (session-ID extraction, tolerant record parsing).
- **CLI/output contract prior art:** `/Users/tstang/Code/orc/docs/session-log.md` and `/Users/tstang/Code/orc/packages/core/src/session-log-types.ts` (transcript-only boundary, offsets, sanitization, versioned envelopes).
- **Discovery/watching prior art:** `.../session-observer/lib/locate.ts` (provider-specific lookup + fallback), `.../lib/watch.ts` (file-change detection + offsets); provider test suites in both repos cover malformed JSONL and path/lookup cases.

**Known transcript locations (current, per the recon):**

| Runtime | Path pattern                                                                             |
| ------- | ---------------------------------------------------------------------------------------- |
| Claude  | `~/.claude/projects/<encoded-cwd>/<session-id>.jsonl`                                    |
| Codex   | `~/.codex/sessions/YYYY/MM/DD/session-<id>.jsonl`                                        |
| Cursor  | `~/.cursor/projects/<encoded-project>/agent-transcripts/<session-id>/<session-id>.jsonl` |

**Limitations that directly shape the adapter boundary (from the operator's handoff):**

- Provider timestamps are not normalized; **recency relies on filesystem metadata** — which independently confirms this project's mtime/size-only capability boundary (no content parsing).
- Malformed/incomplete trailing JSONL records are routine (tolerant handling required if anything ever reads content; the gate adapter should not).
- Cursor SQLite chat history is out of scope for these readers.
- **Transcript observation is read-only and must not imply live-agent health or act capability** — adapter output is "observable activity evidence," never a health verdict. Envelope wording must preserve this distinction.

**Sharpened open question — child-session correlation:** the gate spawns a runtime child (e.g. `claude -p`) but does not know the session ID the child creates, so the adapter must correlate a transcript to _its_ child. Candidate approaches for design: newest-file-created-after-spawn within the cwd-derived provider directory (requires porting each provider's cwd/project encoding rules — see `locate.ts`); runtime-specific session-ID extraction where the child surfaces it; or accepting directory-level activity (any growth in the project-scoped transcript dir since spawn) as sufficient evidence at the fidelity liveness needs. The last is the cheapest and may be enough — liveness needs "something is progressing," not "exactly this session."

## Baseline: what already shipped (do NOT re-implement)

- **PR #151 (`review-bookkeeping-and-dispatch-doc-contracts`, merging now):** late artifact recovery by `oat_gate_run_id` on timeout (timeout falls through to correlation instead of failing early), `stdoutBytes`/`stderrBytes` telemetry, `lateCompletion`/`noOutputProduced` envelope fields, `OAT_GATE_EXEC_TIMEOUT_MS` documentation. **This project builds on that restructured timeout path — branch from a base that includes #151.**
- **PR #149:** gate stdin parameterized (`'ignore'` for noninteractive execution) — the stdin-hang class is fixed.
- **PR #150 (0.1.66):** reviewer artifact-parsing contract hardened (`Findings:` count line required); lifecycle exit gates before completion persistence; autonomy contract doc updated.

## Requirements

1. **Headless completion-safety contract** (outcome 1): mechanical headless signal from gate to child (env injection and/or invocation-context field in the gate prompt frontmatter), a gate-mode dispatch rule in `oat-project-review-provide` (inline when the current runtime holds the configured reviewer identity; otherwise synchronous/awaited delegation with verified completion; never fire-and-forget background dispatch), and fail-closed when no compliant route exists. Reuse the autonomy contract's signal names and accepted-handle language rather than inventing parallel ones. Reviewer identity, dispatch-ceiling, provenance, and cross-provider checks unchanged.
2. **Configurable budgets** (outcome 2): precedence surface per Current-Source Findings; ~30min default for implementation/final code reviews, shorter for artifact reviews (exact defaults are a design decision); bounds validation; existing env override keeps working (compatibility); docs/CLI help updated together.
3. **Liveness adapters** (outcome 3): bounded capability interface per runtime (e.g. "does a session/transcript artifact exist and when did it last change"), reported in liveness diagnostics and in timeout/failure envelopes as latest-trustworthy-activity evidence; stdout-idle vs process-alive vs transcript-activity distinguished; no hardcoded transient transcript schemas.
4. **Secondary items (triage at design):** correlated run marker before substantive review (cheap — runId/before-snapshot machinery exists; improves diagnostics; must not let partial artifacts pass) — lean adopt. Bounded review dossier (precomputed range/tasks/files/paths) — lean defer as a separable feature. Fixture matrix from the request (headless→inline→artifact→commit; async-ceiling case; >15min case; timeout-with-advancing-transcript; timeout-no-artifact; provenance mismatch; pass→receive) — in scope, aligned with the subprocess-level/deterministic-fake-runtime constraint.

## Key Decisions

1. **Contract over prompt wording:** the successful Fable run proves prompt pinning works and the request explicitly rejects it as the mechanism; the fix is invocation-context + skill contract + fail-closed.
2. **Build on #151's gate/index.ts:** its timeout path already falls through to correlation; budgets/liveness/headless layers on top.
3. **Sequencing inversion (operator-agreed 2026-07-15):** this project runs before `orchestration-run-log` implementation — run-log's own implementation gates will exercise these fixes, and both projects touch the same gate finalization region.
4. **Fail-closed is invariant** across all three outcomes: incomplete/uncorrelated artifacts never pass; timeout still fails when no validated late artifact exists.

## Constraints

- Lockstep five-package version bump + `pnpm release:validate`; canonical skill edits get frontmatter version bumps (note PR #150 added external-review contract tests — `review-skill-contracts.test.ts` pins may need updating with skill changes).
- Artifact hygiene contract (#147) applies to all written files.
- No weakening of reviewer identity/provenance/cross-provider checks; no disabling independent review; no consumer-app special-casing.
- Config compatibility: `OAT_GATE_EXEC_TIMEOUT_MS` keeps working with documented precedence, or an explicit migration is provided.
- At least one subprocess-level fixture or deterministic fake runtime exercising lifecycle + timeout behavior (not solely mocked completion).
- Verify both Cursor and Claude headless paths.
- Collision awareness: `orchestration-run-log` (planned, parked) adds a structural-append finalization hook to `gate/index.ts` later — keep this project's changes cohesive around envelope finalization to minimize its rebase.

## Success Criteria

- A headless gate run whose runtime holds the reviewer identity completes inline (or via verified-await delegation) without any prompt-level inline pinning; a run with no compliant route fails closed with an envelope naming the reason.
- The p11-class failure reproduces green: a large implementation/final review completes within the new default budget, or the budget is configurable at every documented precedence level with validated bounds.
- Liveness output and timeout/failure envelopes distinguish stdout-idle from process-alive from transcript-activity, with the latest trustworthy evidence included; the two incident transcripts, replayed against fixtures, would have shown "active" at kill time.
- Each observed failure maps to a named regression test (the request's explicit acceptance shape); migration/example configuration documented.

## Out of Scope

- Re-implementing #151's late-artifact recovery or byte telemetry.
- The review dossier precomputation (deferred unless design finds it load-bearing for budgets).
- Run-log structural appends (separate project).
- Consumer-app repository changes.

## Open Questions (for lightweight design)

- **Headless signal shape:** env injection (`OAT_NON_INTERACTIVE=1` + a gate-specific marker) vs. a frontmatter field in the gate prompt context vs. both; and how the skill detects it portably across runtimes.
- **"Runtime holds reviewer identity" check:** reuse of the existing host-detection/runtime-identity machinery vs. a simpler declaration.
- **Budget policy layer:** where review-type/scope defaults live (config schema shape) and their interaction with per-target `timeoutMs`.
- **Liveness adapter boundary:** per-runtime adapter modules vs. one capability interface with runtime-supplied probes. _Substantially answered by Prior Art (2026-07-15):_ known per-provider path patterns exist and are documented/tested in the operator's session-observer and orc implementations; fs-metadata-only recency is validated prior art. Remaining sub-question: child-session correlation (see Prior Art section) — session-precise vs. directory-level activity evidence.
- **Claude belt-and-suspenders:** should the gate set `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0` for claude-runtime children as defense in depth, or is that masking the contract violation?
- **Run marker mechanics:** file location/name, and how `check`-style tooling distinguishes marker-only (started, not finished) from finalized.

## Assumptions

- PR #151 lands before this project's implementation begins (its conflict resolution is in flight as of 2026-07-15).
- The autonomy contract's env signals are stable enough to reuse (merged and revised twice: #133, #150).

## Risks

- **Transcript-adapter fragility:** provider transcript locations/formats change without notice.
  - **Likelihood:** Medium / **Impact:** Medium
  - **Mitigation Ideas:** bounded capability interface (existence + mtime/size only, never content parsing); adapters fail soft to the current stdout-only behavior.
- **Three-way file contention on `gate/index.ts`** (this project, run-log later, any hotfixes).
  - **Likelihood:** Medium / **Impact:** Low
  - **Mitigation Ideas:** serial sequencing (decided); cohesive change regions.
- **Headless contract false negatives** (inline-capable runtime misdetected → fail closed unnecessarily).
  - **Likelihood:** Low / **Impact:** Medium
  - **Mitigation Ideas:** design the identity check on existing host-detection machinery; fixture coverage for both detection outcomes.

## Next Steps

Quick mode → **required lightweight design** (root causes, configuration precedence, headless execution state machine, liveness adapter boundary, test strategy — the five sections the originating request names) → plan → implement. Run `oat-project-quick-start` to continue. Sequencing: after PR #151 lands; before `orchestration-run-log` implementation.
