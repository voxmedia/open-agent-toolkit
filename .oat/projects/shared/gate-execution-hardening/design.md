---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-15
oat_generated: false
oat_template: false
oat_template_name: design
---

# Design: gate-execution-hardening

## Overview

This project hardens `oat gate review` for headless orchestration along the three axes the consumer-app p11 incident exposed, building directly on the #151 gate execution path (timeout falls through to late-artifact correlation; byte telemetry exists).

**Headless completion-safety** becomes a mechanical contract with two coordinated halves. The gate declares headless mode on every child it spawns through both channels at once: injected environment (`OAT_NON_INTERACTIVE=1` plus gate-specific `OAT_GATE_HEADLESS=1` and `OAT_GATE_RUN_ID`, reusing the autonomy contract's names where they exist) and a new `oat_gate_headless: true` field in the gate prompt's frontmatter context. Env covers machine detection; frontmatter covers skill-prose detection by runtimes that read the prompt but scrub env. `oat-project-review-provide` gains a headless-mode dispatch rule that overrides its Tier-1 background preference: when the current runtime holds the configured reviewer identity, review **inline**; otherwise delegate only through a synchronous/awaited route with verified completion; if neither route exists, fail closed with a structured refusal the gate can classify. We deliberately do **not** set `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0` as a backstop — background dispatch is forbidden in headless gate mode, and raising the ceiling would mask contract violations rather than surface them.

**Budgets** get a six-level precedence chain, first match wins: CLI `--timeout-ms` → per-exec-target `timeoutMs` → `workflow.gateTimeouts.{code,artifact}` config → `OAT_GATE_EXEC_TIMEOUT_MS` env (existing, unchanged position above built-in defaults) → built-in review-type default (code 30 min, artifact 15 min) → legacy 15-minute constant when the review type is unknown. Bounds validated; no migration required — the only behavior change without explicit configuration is the code-review default doubling, which is the incident's direct fix.

**Liveness** gains a bounded per-runtime activity probe: does the runtime's project-scoped transcript directory show filesystem-metadata changes since spawn — directory-level for v1, deliberately not session-precise, because liveness answers "is something progressing," not "which session." Probes read mtime/size only, never content; they fail soft to today's stdout-only behavior. Snapshots distinguish stdout-idle / process-alive / transcript-active, and timeout/failure envelopes carry the latest observed evidence as "observable activity," never a health verdict. A correlated run-marker file written at spawn (adopted secondary item) improves post-mortem diagnostics without affecting pass/fail.

## Architecture

### System Context

Everything lands in the existing gate execution pipeline (`packages/cli/src/commands/gate/index.ts`) and its two config surfaces, plus one canonical skill:

**Key Components:**

- **Headless invocation context** (gate CLI + prompt assembly): env injection at spawn; `oat_gate_headless` in `gateInvocationPromptContext`.
- **Headless dispatch rule** (`.agents/skills/oat-project-review-provide/SKILL.md`): the child-side half of the contract.
- **Budget resolver** (gate CLI + `packages/cli/src/config/oat-config.ts` + `config/resolve.ts`): replaces the single `resolveGateExecTimeoutMs` with a precedence chain; new `ExecTarget.timeoutMs` field, `--timeout-ms` flag, `workflow.gateTimeouts` config key.
- **Activity probe registry** (new module `packages/cli/src/commands/gate/activity-probes.ts`): per-runtime transcript-directory probes behind one capability interface.
- **Run marker** (gate CLI): transient `.pending-gate-<runId>.json` in the project `reviews/` directory.

### Component Diagram

```
 oat gate review ──resolve target──▶ resolve budget (6-level precedence)
        │                                   │
        ▼                                   ▼
 assemble prompt (+ oat_gate_headless) ─▶ spawn child
        │                                   │  env += OAT_GATE_HEADLESS=1,
        ▼                                   │         OAT_NON_INTERACTIVE=1,
 write run marker                           │         OAT_GATE_RUN_ID=<uuid>
 (reviews/.pending-gate-<id>.json)          ▼
                                    monitor loop (interval)
                                    ├─ stdout/stderr bytes → idleMs (existing)
                                    ├─ process alive check
                                    └─ activity probe (transcript dir mtime/size)
                                            │
        child side:                         ▼
 review-provide detects headless ──▶ terminal outcome
 ├─ runtime holds reviewer identity        ├─ completed → correlate/validate (#151 path)
 │      → review INLINE                    ├─ timeout   → late-artifact recovery (#151)
 ├─ else awaited sync delegation           ├─ child failure / launch defect (#151 telemetry)
 │      + verified completion              └─ envelope += activityEvidence
 └─ else FAIL CLOSED (structured refusal)          │
                                            delete run marker
```

### Headless Execution State Machine

Gate side (parent):

| State                            | Transition                                              | Notes                                                                                                  |
| -------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `resolve`                        | target + budget resolved → `spawn`                      | budget via precedence chain; refusal to resolve = existing failure paths                               |
| `spawn`                          | marker written, env injected, child started → `monitor` | marker write failure = warn-and-continue (diagnostics only)                                            |
| `monitor`                        | interval ticks emit liveness snapshots                  | stdout bytes, process-alive, probe evidence                                                            |
| `monitor` → `terminal:completed` | child exit 0                                            | proceed to #151 correlation/validation                                                                 |
| `monitor` → `terminal:timeout`   | budget exhausted → SIGTERM/SIGKILL                      | #151 late-artifact recovery; envelope carries `activityEvidence`                                       |
| `monitor` → `terminal:failed`    | child nonzero exit                                      | `noOutputProduced` telemetry (#151) + `activityEvidence`; **new:** classify structured refusal (below) |
| any terminal                     | marker deleted → envelope written                       | orphaned marker ⇒ crashed gate process (diagnostic)                                                    |

Child side (review-provide under `oat_gate_headless` / `OAT_GATE_HEADLESS=1`):

| State            | Transition                                                                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `detect`         | headless signal present → `identity-check`; absent → existing behavior unchanged                                                                                                                                         |
| `identity-check` | current runtime identity matches the resolved reviewer target → `inline`; else → `delegate-sync`                                                                                                                         |
| `inline`         | run the oat-reviewer role contract in the current context; write artifact; exit                                                                                                                                          |
| `delegate-sync`  | a synchronous/awaited child mechanism exists (foreground subagent, awaited handle) → dispatch, **verify completion** (artifact exists with matching `oat_gate_run_id`) before returning; no awaited mechanism → `refuse` |
| `refuse`         | print structured refusal line `OAT_GATE_REFUSAL: no headless-safe review route (<reason>)` and exit nonzero — fail closed, never fire-and-forget                                                                         |

The refusal line gives the gate a classifiable failure: `writeReviewGateExecutionFailure` gains a `refusal` field when the line is detected in captured output, so orchestrators can distinguish "no compliant route" from crashes. Identity checking reuses the existing host-detection/runtime-identity machinery (`hostDetectionCommand` results + resolver identity fields) — no new mechanism.

### Data Flow

1. Gate resolves target, then budget: `--timeout-ms` → `target.timeoutMs` → `workflow.gateTimeouts[reviewType]` → `OAT_GATE_EXEC_TIMEOUT_MS` → built-in type default (code 1_800_000, artifact 900_000) → `GATE_EXEC_TIMEOUT_MS`.
2. Prompt assembly appends `oat_gate_headless: true` to the invocation frontmatter block; spawn env is `{ ...processEnv, OAT_GATE_HEADLESS: '1', OAT_NON_INTERACTIVE: '1', OAT_GATE_RUN_ID: runId }`.
3. Run marker written; child spawned; monitor loop augments each liveness tick with process-alive and probe evidence; snapshots and the `gate-liveness` diagnostic gain the new fields.
4. Terminal outcome flows through the #151 path unchanged; failure/timeout envelopes additionally carry `activityEvidence` and (when detected) `refusal`.
5. Marker deleted on every terminal path.

## Component Design

### Budget resolver

**Interfaces:**

```typescript
// config/oat-config.ts
export interface ExecTarget {
  // ...existing fields...
  timeoutMs?: number; // validated: integer, 1_000 <= x <= 14_400_000 (4h)
}
// workflow config
// workflow.gateTimeouts?: { code?: number; artifact?: number }  — same bounds

// gate/index.ts
function resolveGateExecTimeoutMs(input: {
  cliTimeoutMs?: number;
  target: ExecTargetView;
  reviewType?: 'code' | 'artifact';
  workflowGateTimeouts?: { code?: number; artifact?: number };
  env: NodeJS.ProcessEnv;
}): {
  timeoutMs: number;
  source: 'cli' | 'target' | 'config' | 'env' | 'type-default' | 'default';
};
```

**Design decisions:** the resolved `source` is reported in the startup diagnostic (`Running gate target …; timeout=…ms (source=target)`) and in timeout envelopes — operators debugging budget issues see where the number came from. `gate target set` gains `--timeout-ms`; `gate review`/`gate exec` gain `--timeout-ms`. Out-of-bounds values are rejected at config-write and CLI-parse time, and ignored-with-warning when found in existing config (fail soft, use next precedence level).

### Activity probe registry (`activity-probes.ts`)

**Interfaces:**

```typescript
export interface GateActivityEvidence {
  source: 'transcript-dir';
  runtime: string;
  observedPath: string; // the directory probed (not individual session files)
  lastChangeAt: number | null; // epoch ms of newest mtime under the dir, null if dir absent
  observedAt: number;
}

export interface GateActivityProbe {
  runtime: string; // 'claude' | 'codex' | 'cursor'
  resolveObservedPath(context: {
    cwd: string;
    home: string;
    spawnedAt: number;
  }): string | null;
  probe(context): GateActivityEvidence | null; // null = probe unavailable; NEVER throws outward
}
```

**Path derivation (ported knowledge from the operator's session-observer/orc prior art — reference implementations only, no dependency):**

| Runtime | Observed directory                                                                         |
| ------- | ------------------------------------------------------------------------------------------ |
| claude  | `~/.claude/projects/<encoded-cwd>/` (encoding rules ported from `locate.ts`)               |
| codex   | `~/.codex/sessions/YYYY/MM/DD/` (spawn date; roll to next day when a run crosses midnight) |
| cursor  | `~/.cursor/projects/<encoded-project>/agent-transcripts/`                                  |

**Responsibilities & constraints:** stat/readdir + mtime comparison only — never open or parse file content; evidence newer than `spawnedAt` counts as activity; directory-level fidelity is deliberate v1 scope (session-precise correlation recorded as a future upgrade path, not built); every error path returns `null` and logs at debug level (fail soft to stdout-only liveness); output is labeled "observable activity evidence" and must never be used to extend budgets or alter pass/fail — reporting only.

### Liveness snapshot and envelope extensions

```typescript
interface GateLivenessSnapshot {
  elapsedMs: number;
  hardBudgetMs: number;
  idleMs: number; // stdout/stderr idle (existing semantics, unchanged)
  processAlive: boolean; // kill(pid, 0) style check
  lastActivityEvidence?: GateActivityEvidence; // newest across probes
}
```

Timeout/failure envelopes (`writeReviewGateExecutionFailure`) gain `activityEvidence` (latest snapshot's evidence, if any) and `refusal` (parsed `OAT_GATE_REFUSAL:` line, if present). Existing fields — including #151's `lateCompletion`, `noOutputProduced`, byte counts — are unchanged.

### Headless dispatch rule (`oat-project-review-provide`)

Prose changes only, in the gate-mode section: detect `oat_gate_headless` (prompt) or `OAT_GATE_HEADLESS=1` (env); apply the child-side state machine above; the Tier-1 "run in background if supported" guidance is explicitly overridden in this mode ("headless gate mode NEVER uses fire-and-forget background dispatch"); completion verification for the awaited-delegation route re-states the existing artifact/runId check before return. Skill version bump; `review-skill-contracts.test.ts` pins updated in the same commit.

### Run marker

Written before spawn to `{project}/reviews/.pending-gate-<runId>.json`: `{ runId, targetId, runtime, reviewType, reviewScope, startedAt, budgetMs, budgetSource }`. Deleted on every terminal path. Dotfile-prefixed and transient — never committed, never read by validation, never affects pass/fail; its only consumers are humans and post-mortem tooling ("a marker with no matching envelope ⇒ the gate process itself died"). Marker I/O failures are warn-and-continue.

## Error Handling

- **Probe failures:** always fail soft (`null` evidence, debug log); liveness degrades to current behavior.
- **Refusal detection:** substring scan of captured output for the `OAT_GATE_REFUSAL:` prefix on nonzero exits only; absence changes nothing.
- **Invalid budget config:** reject at write/parse time; ignore-with-warning at resolve time (use next level). Never fail a gate run because of a bad timeout value.
- **Marker I/O:** warn-and-continue in both directions (write and delete).
- **Identity check inconclusive (child side):** treat as "does not hold reviewer identity" → awaited delegation or refusal; never guess inline.

## Testing Strategy

### Deterministic fake runtime

A fixture exec target whose `baseCommand` is a bundled Node script (`packages/cli/src/commands/gate/__fixtures__/fake-runtime.mjs`) driven by env/args to deterministically: emit or withhold stdout; write transcript-like files into a probe-observed temp directory; write (or not) a correlated review artifact with a given `oat_gate_run_id`; exit with a given code after a given delay; emit an `OAT_GATE_REFUSAL:` line. This gives subprocess-level lifecycle coverage without mocking process completion.

### Fixture matrix (each observed failure → named regression test)

| #   | Case (from incident report)                        | Fixture behavior                                                                                   | Asserts                                                                                         |
| --- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | headless → inline reviewer → artifact + commit     | fake runtime writes correlated artifact, exits 0                                                   | full pass → `receiveEligible: true`                                                             |
| 2   | Claude async-child ceiling (would fire-and-forget) | fake runtime emits refusal line, exits nonzero                                                     | envelope `refusal` populated; fail-closed; no attempt debit ambiguity                           |
| 3   | Cursor > old 15-min boundary                       | budget resolved to type-default 30 min; slow fixture finishes at ~minute 16 equivalent (scaled ms) | completes under new default; `source: 'type-default'`                                           |
| 4   | timeout with advancing transcript activity         | fixture writes transcript files while silent on stdout, exceeds budget                             | `idleMs == elapsedMs` BUT `lastActivityEvidence.lastChangeAt` recent; envelope carries evidence |
| 5   | timeout/child failure, no artifact                 | fixture exits nonzero / sleeps past budget, no artifact                                            | fail-closed; `noOutputProduced` (#151) + `activityEvidence: null`                               |
| 6   | artifact/run-ID provenance mismatch                | fixture writes artifact with wrong `oat_gate_run_id`                                               | existing correlation rejects; unchanged by this project (regression pin)                        |
| 7   | passing artifact → receive eligibility             | as #1 + receive-eligibility fields                                                                 | `handoff` + `receiveEligible` contract intact                                                   |

### Unit tests

- Budget precedence: all six levels, each shadowing the next; bounds rejection at parse/write; ignore-with-warning at resolve; `source` reporting.
- Probes: per-runtime path derivation (incl. encoded-cwd cases ported from prior art tests), absent-dir → null, mtime advance detection, error → null.
- Snapshot/envelope: new fields present and correctly populated; existing #151 fields untouched (regression).
- Marker: write/delete lifecycle on every terminal path; orphan survives gate-process kill (subprocess fixture).
- Skill contract (`review-skill-contracts.test.ts`): headless-mode section present, background-dispatch override stated, refusal format pinned.

### Manual verification

One real headless Claude run and one real Cursor run against a small fixture project (both paths the incident exercised), confirming inline completion and budget/liveness reporting.

## Open Questions

- None blocking for planning. Deferred to implementation judgment: exact debug-log channel for probe failures; whether `gate exec` (non-review) shares the full precedence chain or only CLI/env/constant levels.

## Implementation Phases

### Phase 1: Budget resolver + config/CLI surface

**Goal:** precedence chain, `ExecTarget.timeoutMs`, `workflow.gateTimeouts`, `--timeout-ms` flags, `source` reporting — fully tested.
**Verification:** budget unit suite; `pnpm release:validate`.

### Phase 2: Headless contract

**Goal:** env/frontmatter injection, refusal detection, review-provide dispatch rule + contract tests, run marker.
**Verification:** contract/skill suites; fake-runtime refusal fixture.

### Phase 3: Liveness probes + envelopes + fixture matrix

**Goal:** probe registry, snapshot/envelope extensions, deterministic fake runtime, full seven-case matrix, docs (gate docs + config reference), lockstep version bumps.
**Verification:** full matrix green; `pnpm build:docs`; manual Claude/Cursor headless passes.

## References

- Discovery: `discovery.md` (evidence, current-source findings, prior art, baseline)
- Incident evidence: consumer-app `consumer-app-v1` p11 artifacts + four verified transcripts (paths in discovery)
- Prior art: operator's session-observer (`~/Code/skills`) and orc session-log (`~/Code/orc`) — reference implementations for transcript paths/encodings
- Baseline PRs: #151 (late recovery + telemetry), #149 (stdin), #150 (artifact parsing contract), #133/#150 (autonomy contract env signals)
