---
oat_status: complete
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

**Budgets** get a six-level precedence chain, first match wins: CLI `--timeout-ms` → per-exec-target `timeoutMs` → `workflow.gateTimeouts.{code,artifact}` config → `OAT_GATE_EXEC_TIMEOUT_MS` env (existing, unchanged position above built-in defaults) → built-in **type-and-scope** defaults (code reviews at implementation/final/phase/range scope 30 min; bounded task-scoped code reviews 15 min; artifact reviews 15 min) → legacy 15-minute constant when type/scope is unknown. Bounds validated; no migration required — the only behavior change without explicit configuration is the implementation/final code-review default doubling, which is the incident's direct fix.

**Liveness** gains a bounded per-runtime activity probe: does the runtime's project-scoped transcript directory show filesystem-metadata changes since spawn — directory-level for v1, deliberately not session-precise, because liveness answers "is something progressing," not "which session." Probes read mtime/size only, never content; they fail soft to today's stdout-only behavior. Snapshots distinguish stdout-idle / process-alive / transcript-active, and timeout/failure envelopes carry the latest observed evidence as "observable activity," never a health verdict. A correlated run-marker file written at spawn (adopted secondary item) improves post-mortem diagnostics without affecting pass/fail.

## Architecture

### System Context

Everything lands in the existing gate execution pipeline (`packages/cli/src/commands/gate/index.ts`) and its two config surfaces, plus one canonical skill:

**Key Components:**

- **Headless invocation context** (gate CLI + prompt assembly): env injection at spawn; `oat_gate_headless` in `gateInvocationPromptContext`.
- **Headless dispatch rule + pre-plan inherit rule** (`.agents/skills/oat-project-review-provide/SKILL.md`): the child-side half of the headless contract, plus the artifact-review inherit rule for pre-plan scopes.
- **Resolver envelope distinction** (`packages/cli/src/commands/project/dispatch-ceiling/`): `unresolvedReason` field separating missing-policy from missing-ladder.
- **Budget resolver** (gate CLI + `packages/cli/src/config/oat-config.ts` + `config/resolve.ts`): replaces the single `resolveGateExecTimeoutMs` with a precedence chain; new `ExecTarget.timeoutMs` field, `--timeout-ms` flag, `workflow.gateTimeouts` config key.
- **Activity probe registry** (new module `packages/cli/src/commands/gate/activity-probes.ts`): per-runtime transcript-directory probes behind one capability interface.
- **Run marker** (gate CLI): transient `{os.tmpdir()}/oat-gate-runs/<runId>.json` in system temp.

### Component Diagram

```
 oat gate review ──resolve target──▶ resolve budget (6-level precedence)
        │                                   │
        ▼                                   ▼
 assemble prompt (+ oat_gate_headless) ─▶ spawn child
        │                                   │  env += OAT_GATE_HEADLESS=1,
        ▼                                   │         OAT_NON_INTERACTIVE=1,
 write run marker                           │         OAT_GATE_RUN_ID=<uuid>
 (tmpdir/oat-gate-runs/<id>.json)          ▼
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

**Refusal detection is exit-code independent (plan-review C1).** Skill prose cannot force a provider CLI to propagate a nonzero exit — an agent can print a refusal but its host may still exit 0. The gate therefore scans captured output for the strict line-start pattern `^OAT_GATE_REFUSAL: ` on **every** terminal outcome, with this precedence: (1) a validated run-correlated artifact wins — the review completed, any refusal text is treated as incidental and ignored; (2) no correlated artifact + refusal line present → classified refusal failure (`status: review_failed`, `refusal` field populated, never receive-eligible) regardless of the child's exit code; (3) no artifact, no refusal → existing failure paths. The strict line-start match plus the artifact-wins rule protects against incidentally echoed text. The skill still exits nonzero after refusing when its host permits — best effort, not load-bearing.

**Identity checking and routing are executable, not prose (plan-review I1/I4).** A new child-side helper, `oat gate route --json`, owns the inline/delegate/refuse decision so it is unit-testable across every evidence combination and the skill merely follows its answer (same philosophy as the run-log project's rollup helper). Inputs: the gate invocation metadata the prompt already carries (`--expect-runtime <runtime> --expect-model <model>`, copied by the skill from the injected frontmatter) plus the process environment the helper shares with the child (provider markers such as `CLAUDECODE`, `CURSOR_AGENT`, `CODEX_THREAD_ID`; `OAT_GATE_HEADLESS`; `OAT_GATE_RUN_ID`). Decision algorithm: (a) exactly one provider marker set and it maps to `--expect-runtime` → runtime matches; (b) model evidence, where the runtime exposes it to its own session (env/config), must equal `--expect-model`; runtime match + model match or model-unknowable-but-runtime-unambiguous → `route: 'inline'`; (c) runtime mismatch, or multiple/zero provider markers (ambiguous parent-vs-child inheritance) → `route: 'delegate-sync'` when the host offers an awaited child mechanism (the skill declares this via `--can-await true|false`), else `route: 'refuse'`; (d) inconclusive is never inline. Output: `{ route: 'inline' | 'delegate-sync' | 'refuse', reason: string }` — the `reason` feeds the refusal line verbatim.

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
  reviewScope?: string; // 'final' | 'pNN' | 'pNN-pMM' | 'pNN-tNN' | artifact scopes
  workflowGateTimeouts?: { code?: number; artifact?: number };
  env: NodeJS.ProcessEnv;
}): {
  timeoutMs: number;
  source: 'cli' | 'target' | 'config' | 'env' | 'scope-default' | 'default';
};

// Built-in type-and-scope defaults (gate-review remediation — discovery requires
// scope-aware defaults, not type-only):
//   code + final / pNN / pNN-pMM (implementation, phase, range) → 1_800_000 (30 min)
//   code + pNN-tNN (bounded task scope)                          → 900_000 (15 min)
//   artifact (any scope — bounded reads)                         → 900_000 (15 min)
//   unknown type/scope (gate exec, untyped runs)                 → 900_000 legacy constant
```

**Design decisions:** the resolved `source` is reported in the startup diagnostic (`Running gate target …; timeout=…ms (source=target)`) and in timeout envelopes — operators debugging budget issues see where the number came from. `gate target set` gains `--timeout-ms`; `gate review`/`gate exec` gain `--timeout-ms`. Out-of-bounds values are rejected at config-write and CLI-parse time, and ignored-with-warning when found in existing config (fail soft, use next precedence level).

### Activity probe registry (`activity-probes.ts`)

**Interfaces:**

```typescript
export interface GateActivityEvidence {
  source: 'transcript-dir';
  runtime: string;
  scope: 'project-dir' | 'ambient-runtime'; // attribution confidence (design-review M1)
  observedPath: string; // the directory probed (not individual session files)
  lastChangeAt: number | null; // epoch ms of newest mtime under the dir, null if dir absent
  totalSizeBytes: number | null; // sum of entry sizes under the dir (plan-review I3)
  changedSinceBaseline: boolean; // mtime OR size delta vs the spawn-time baseline snapshot
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

**Responsibilities & constraints:** stat/readdir + mtime/size comparison only — never open or parse file content; the probe captures a **baseline snapshot at spawn** (newest mtime + total size) and computes `changedSinceBaseline` from either axis, so size-only growth (e.g. same-second appends) counts as activity and truncation is observable; directory-level fidelity is deliberate v1 scope (session-precise correlation recorded as a future upgrade path, not built); every error path returns `null` and logs at debug level (fail soft to stdout-only liveness); output is labeled "observable activity evidence" and must never be used to extend budgets or alter pass/fail — reporting only.

**Attribution scoping (design-review M1):** Claude and Cursor probe _project-scoped_ directories (`scope: 'project-dir'`) — activity there is attributable to work in this cwd, though still not session-precise. Codex's daily sessions directory is _global_, so an unrelated Codex session produces evidence; Codex evidence is therefore labeled `scope: 'ambient-runtime'`, envelopes carry the scope field, and human-readable diagnostics render ambient evidence as "ambient runtime activity (not attributable to this gate child)". Ambient evidence is still worth reporting (it distinguishes "machine doing Codex work" from "nothing happening") but must never be presented as gate-child progress.

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

Prose changes only, in the gate-mode section: detect `oat_gate_headless` (prompt) or `OAT_GATE_HEADLESS=1` (env); **the skill does not make the identity judgment itself — it calls `oat gate route --json` and follows the returned route** (the child-side state machine above is implemented by the helper); the Tier-1 "run in background if supported" guidance is explicitly overridden in this mode ("headless gate mode NEVER uses fire-and-forget background dispatch"); completion verification for the awaited-delegation route re-states the existing artifact/runId check before return. Skill version bump; `review-skill-contracts.test.ts` pins updated in the same commit.

### Reviewer-resolution fixes (scope addition, 2026-07-15)

**Resolver envelope distinction (`oat project dispatch-ceiling resolve`):** the unresolved envelope gains an `unresolvedReason: 'policy' | 'ladder' | 'both'` field, computed from facts the resolver already holds (did the effective ladder resolve; did a policy resolve). When only the policy is missing, `matrix`/ladder fields report their actual resolved values instead of `null`, so consumers can no longer conflate the two gaps. `--preflight` output and any human-readable rendering name the actual gap: "project has no dispatch policy — set `oat_dispatch_policy` in project state (normally at plan time) or select Inherit Host Defaults" vs. "no candidate ladder configured — adopt a dispatch matrix."

**Ladder inspection fixes (Item A addendum):** `oat config get` gains read support for the ladder paths (`workflow.dispatchCeiling`, `.providers`, and per-provider children) returning effective layered values — today they error `Unknown config key` even when configured, which is the second independent path to a false "no ladder" conclusion. The Complete Dispatch Ladder Adoption Contract in `oat-project-plan-writing` is updated to route on the resolver instead of hand-inspecting config keys — but the adoption contract requires **whole-ladder completeness** (every supported provider, every tier through the ceiling), which single-provider resolution does not establish (plan-review I2). The resolver envelope therefore also gains `ladderCompleteness: { complete: boolean; missingCells: string[] }`, evaluated across all supported providers/tiers — the same check the contract prose describes, computed in one tested place. The adoption prompt fires on `unresolvedReason: 'ladder' | 'both'` OR `ladderCompleteness.complete === false`, with `missingCells` shown so the operator sees exactly what adoption would fill.

**Pre-plan inherit rule (`oat-project-review-provide` prose):** in the Managed Dispatch Readiness preflight, when the resolver returns `unresolvedReason: 'policy'` AND the review is `type: artifact` with scope in `{discovery, design, spec}`: do not block and do not prompt — review by deliberate inheritance in the current context (the existing inherit route), recording `selection_reason: inherit (pre-plan; no project policy)` in the dispatch audit. Guards: an explicitly set project policy is always honored (even pre-plan); `type: code` reviews and plan-scope artifact reviews continue to hard-require resolution; gate exec-target selection is untouched (gates resolve their targets independently of this preflight).

**Design decision:** inheritance is the degenerate case of the existing "inherit unless the parent is below the resolved ceiling" contract — with no ceiling, the comparison is undefined and inheritance is the only coherent default. The policy remains a plan-time, complexity-informed decision; pre-plan reviews are early cursory reads that cost what the session already costs (operator rationale, 2026-07-15).

### Run marker

Written before spawn to a **system temp location outside the repository tree**: `{os.tmpdir()}/oat-gate-runs/<runId>.json` with `{ runId, targetId, runtime, reviewType, reviewScope, project, startedAt, budgetMs, budgetSource }`. The marker path is printed in the gate startup diagnostic so post-mortem tooling can find it. Deleted on every terminal path **through a single `try/finally` lifecycle boundary wrapping the gate run — not per-return cleanup calls** (plan-review M4): `runReviewGate` has many early returns, and the parked orchestration-run-log project will later add its once-only structural-append finalizer near envelope finalization; the marker's `finally` boundary stays independent of that future hook to keep the collision region cohesive. An orphaned marker ⇒ the gate process itself died. Never read by validation, never affects pass/fail; marker I/O failures are warn-and-continue. **Location rationale (design-review I1):** an in-repo marker (even dot-prefixed under `reviews/`) is visible to Git and can be swept into directory-scoped review bookkeeping commits if a crash orphans it; the system temp dir eliminates the entire ignore/staging-exclusion contract. Regression test: no marker path is ever inside the repository tree, and an orphaned marker cannot appear in `git status` output for the project.

## Error Handling

- **Probe failures:** always fail soft (`null` evidence, debug log); liveness degrades to current behavior.
- **Refusal detection:** strict line-start scan (`^OAT_GATE_REFUSAL: `) of captured output on every terminal outcome, exit-code independent; a validated run-correlated artifact wins over any refusal text; absence changes nothing.
- **Invalid budget config:** reject at write/parse time; ignore-with-warning at resolve time (use next level). Never fail a gate run because of a bad timeout value.
- **Marker I/O:** warn-and-continue in both directions (write and delete).
- **Identity check inconclusive (child side):** treat as "does not hold reviewer identity" → awaited delegation or refusal; never guess inline.

## Testing Strategy

### Requirement-to-Test Mapping (design-review M2)

| Requirement (discovery)                 | Verification                             | Named checks                                                                                                                                                                                                               |
| --------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Headless completion safety           | unit + fixture + skill-contract + manual | `route.test.ts` unit suite (match/mismatch/inconclusive/no-route — primary child-side verification); matrix #1 (inline pass), #2 (refusal fail-closed); `review-skill-contracts` headless pins; manual Claude headless run |
| 2. Configurable budgets                 | unit + fixture                           | budget precedence suite (all six levels, bounds, source reporting); matrix #3 (type-default budget)                                                                                                                        |
| 3. Liveness evidence                    | unit + fixture + manual                  | probe suite (paths, mtime, fail-soft, scope attribution); snapshot/envelope suite; matrix #4 (silent-but-active timeout); manual Cursor run                                                                                |
| 4a. Run marker (secondary, adopted)     | unit + subprocess                        | marker lifecycle suite; orphan-survives-crash subprocess fixture; no-repo-tree-write regression                                                                                                                            |
| 4b. Fixture matrix (secondary, adopted) | integration                              | matrix #1–#7 named tests incl. #5 (`noOutputProduced` regression), #6 (provenance mismatch pin), #7 (receive eligibility)                                                                                                  |
| A. Resolver envelope distinction        | unit                                     | `unresolvedReason` suite (three gap combinations; ladder fields accurate under missing policy — the 2026-07-15 conflation regression)                                                                                      |
| B. Pre-plan inherit rule                | skill-contract                           | inherit-rule pins (rule present, all three guards stated)                                                                                                                                                                  |

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
- Probes: per-runtime path derivation (incl. encoded-cwd cases ported from prior art tests), absent-dir → null, mtime advance detection, size-only growth, truncation (size decrease counts as change), unchanged metadata → no change, error → null.
- Route helper: `oat gate route` decision suite — runtime marker match/mismatch, model evidence equal/contradicting/unknowable, ambiguous markers never inline, `--can-await` gating delegate vs refuse, `reason` output shape.
- Snapshot/envelope: new fields present and correctly populated; existing #151 fields untouched (regression).
- Marker: write/delete lifecycle on every terminal path; orphan survives gate-process kill (subprocess fixture).
- Skill contract (`review-skill-contracts.test.ts`): headless-mode section present, background-dispatch override stated, refusal format pinned; pre-plan inherit rule present with its guards (explicit policy honored, code reviews still require resolution).
- Resolver envelope: `unresolvedReason` correct for all three gap combinations; ladder fields report resolved values when only the policy is missing (regression: the 2026-07-15 conflation).

### Manual verification

One real headless Claude run and one real Cursor run against a small fixture project (both paths the incident exercised), confirming inline completion and budget/liveness reporting.

## Open Questions

- None blocking for planning. Deferred to implementation judgment: exact debug-log channel for probe failures; whether `gate exec` (non-review) shares the full precedence chain or only CLI/env/constant levels.

## Implementation Phases

### Phase 1: Budget resolver + reviewer-resolution fixes (config/CLI surface)

**Goal:** timeout precedence chain, `ExecTarget.timeoutMs`, `workflow.gateTimeouts`, `--timeout-ms` flags, `source` reporting; resolver `unresolvedReason` envelope distinction with accurate ladder reporting — fully tested.
**Verification:** budget + resolver unit suites; `pnpm release:validate`.

### Phase 2: Headless contract + pre-plan inherit rule

**Goal:** env/frontmatter injection, refusal detection, review-provide dispatch rule (headless) + pre-plan inherit rule + contract tests, run marker.
**Verification:** contract/skill suites; fake-runtime refusal fixture; resolver-driven inherit-path test.

### Phase 3: Liveness probes + envelopes + fixture matrix

**Goal:** probe registry, snapshot/envelope extensions, deterministic fake runtime, full seven-case matrix, docs (gate docs + config reference), lockstep version bumps.
**Verification:** full matrix green; `pnpm build:docs`; manual Claude/Cursor headless passes.

## References

- Discovery: `discovery.md` (evidence, current-source findings, prior art, baseline)
- Incident evidence: consumer-app `consumer-app-v1` p11 artifacts + four verified transcripts (paths in discovery)
- Prior art: operator's session-observer (`~/Code/skills`) and orc session-log (`~/Code/orc`) — reference implementations for transcript paths/encodings
- Baseline PRs: #151 (late recovery + telemetry), #149 (stdin), #150 (artifact parsing contract), #133/#150 (autonomy contract env signals)
