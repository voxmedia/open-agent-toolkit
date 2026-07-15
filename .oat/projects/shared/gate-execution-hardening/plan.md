---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-15
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p03'] # workflow.hillCheckpointDefault=final → pause after last phase
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: [] # sequential; see ## Parallelism
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: gate-execution-hardening

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Harden headless `oat gate review` execution against the three consumer-app p11 failure modes — uncompletable async reviewer delegation, a one-size 15-minute budget, and blind liveness — plus the two reviewer-resolution defects from the 2026-07-15 incident (policy/ladder envelope conflation; pre-plan artifact reviews hard-requiring a plan-time policy).

**Architecture:** Dual-channel headless contract (env + prompt frontmatter) with a child-side inline/awaited/fail-closed dispatch rule in `oat-project-review-provide`; a six-level budget precedence chain with source reporting; per-runtime transcript-directory activity probes (mtime/size only, fail-soft) feeding liveness snapshots and failure envelopes; transient run markers; resolver `unresolvedReason` distinction and the pre-plan inherit rule. All layered on the #151 gate execution path. See `design.md`.

**Tech Stack:** TypeScript ESM (Node 22), commander CLI, vitest (unit + subprocess fixtures), canonical skill prose under `.agents/`.

**Commit Convention:** `{type}({scope}): {description}` — e.g., `feat(p01-t01): distinguish unresolved policy from missing ladder`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user (`workflow.hillCheckpointDefault=final` → `oat_plan_hill_phases: ['p03']`)
- [x] Set `oat_plan_hill_phases` in frontmatter
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter
- [x] Phase gate review: **disabled** (user-selected 2026-07-15 via the shared setup contract after a qualifying-target probe found `cursor-gpt-5-6-sol-max` and `codex-5-6-sol-max`; the `oat_phase_review_gate` key is deliberately absent — the preflight contract treats a missing key as disabled)

---

## Parallelism

> **Task-ID disposition note (re-review M3):** p02-t04 (route helper) and p02-t05 (skill rules) were reordered pre-execution on 2026-07-15, before any commits, reviews, or implementation records bound to the old numbering — the first plan-review round's findings referenced "p02-t04" as the skill task. No further renumbering will occur.

Sequential (`oat_plan_parallel_groups: []`). All three phases modify `packages/cli/src/commands/gate/index.ts` (p01: budget resolution call site; p02: spawn-time injection, marker, refusal detection; p03: monitor loop and envelope extensions) — the same file, often adjacent regions. p02 and p03 additionally share the failure-envelope builder. Worktree parallelism here buys merge conflicts on the project's single hottest file for no schedule gain; sequential is the analysis result, not a default.

---

## Phase 1: Budget resolver + reviewer-resolution fixes (CLI/config surface)

### Task p01-t01: Resolver `unresolvedReason` envelope distinction + ladder inspection fixes

**Files:**

- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`
- Modify: `packages/cli/src/commands/config/index.ts` + its test surface (`oat config get` read support for `workflow.dispatchCeiling` paths)
- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md` (adoption contract routes on `unresolvedReason`; version bump) + `review-skill-contracts.test.ts` pins if applicable

**Step 1: Write test (RED)**

Pin the three gap combinations against a fixture config: policy missing + ladder resolved → `unresolvedReason: 'policy'` AND ladder/matrix fields report their actual resolved values (regression for the 2026-07-15 conflation, where `matrix: null` masked a healthy user-config ladder); policy resolved + ladder missing/incomplete → `unresolvedReason: 'ladder'`; both missing → `'both'`. Resolved envelopes carry no `unresolvedReason`. **Whole-ladder completeness (plan-review I2):** the envelope carries `ladderCompleteness: { complete, missingCells }` evaluated across ALL supported providers and tiers (not just the active provider's cell) — partial-ladder fixtures pin: one provider missing a tier → `complete: false` with that cell named even when the active provider resolves; fully complete ladder → `complete: true`. `--preflight` human-readable output names the actual gap with the actual fix (policy: "set `oat_dispatch_policy` in project state (normally at plan time) or select Inherit Host Defaults"; ladder: "adopt a dispatch matrix", listing `missingCells`). **Ladder inspection (second-incident regression):** `oat config get workflow.dispatchCeiling.providers` (and per-provider children) returns effective layered values instead of `Unknown config key` when configured, and a clear absent indication when not.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch-ceiling/index.test.ts`
Expected: New tests fail (RED)

**Step 2: Implement (GREEN)**

The resolver already computes the policy/cell facts independently; this task surfaces them plus the whole-ladder completeness sweep. Update the plan-writing adoption contract prose to route on the resolver envelope (adoption prompt fires on `unresolvedReason: 'ladder' | 'both'` OR `ladderCompleteness.complete === false`, showing `missingCells`) and bump that skill's version.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch-ceiling/ src/commands/config/`
Expected: Tests pass (GREEN), existing resolution tests unchanged

**Step 3: Refactor**

None expected; keep the envelope shape change additive.

**Step 4: Verify**

Run: `pnpm format:fix && pnpm lint && pnpm type-check && pnpm oat:validate-skills`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/dispatch-ceiling/ packages/cli/src/commands/config/ .agents/skills/oat-project-plan-writing/ packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "feat(p01-t01): distinguish unresolved policy from missing ladder and fix ladder inspection"
```

---

### Task p01-t02: Budget config surface (`ExecTarget.timeoutMs`, `workflow.gateTimeouts`)

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts` (ExecTarget field + `workflow.gateTimeouts` schema/validation)
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/config/resolve.ts` + `resolve.test.ts` (layer merging for both surfaces)
- Modify: `packages/cli/src/commands/config/index.ts` + its test surface (register `workflow.gateTimeouts.*` keys)
- Modify: `packages/cli/src/commands/gate/index.ts` + `index.test.ts` (`gate target set --timeout-ms`, parse/persist via `parseExecTargetConfig`)

**Step 1: Write test (RED)**

`ExecTarget.timeoutMs` accepts integers in `[1_000, 14_400_000]`, rejects out-of-bounds/non-integer at write/parse time; `gate target set --timeout-ms` round-trips (Commander option registered, help text present, parse/persist through `parseExecTargetConfig`, bounds rejection at the CLI); `workflow.gateTimeouts.{code,artifact}` validated to the same bounds, layered local > shared > user, registered for `oat config get/set`. **This task delivers schema/write/parse-time validation only** — resolve-time behavior for malformed persisted values (warn-once-per-source through the gate command's `CommandContext` logger, then fall to the next precedence level; needed because `normalizeExecTarget` silently drops invalid fields with no logger) is owned by p01-t03, where the precedence chain those values feed actually exists (re-review M2 sequencing fix).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/config/resolve.test.ts src/commands/config/ src/commands/gate/index.test.ts`
Expected: New tests fail (RED)

**Step 2: Implement (GREEN)**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/ src/commands/config/ src/commands/gate/index.test.ts`
Expected: Tests pass (GREEN)

**Step 3: Refactor**

Share the bounds validator between the target field and the workflow keys.

**Step 4: Verify**

Run: `pnpm format:fix && pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/config/ packages/cli/src/commands/config/ packages/cli/src/commands/gate/
git commit -m "feat(p01-t02): add gate timeout config surfaces"
```

---

### Task p01-t03: Budget precedence chain + `--timeout-ms` flags + source reporting

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts` (replace `resolveGateExecTimeoutMs` with the precedence resolver; `--timeout-ms` on `gate review` and `gate exec`; source in startup diagnostic and timeout envelopes)
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Step 1: Write test (RED)**

Precedence, each level shadowing the next: CLI `--timeout-ms` → `target.timeoutMs` → `workflow.gateTimeouts[reviewType]` → `OAT_GATE_EXEC_TIMEOUT_MS` → built-in **type-and-scope** defaults (gate-review remediation — `reviewScope` is a resolver input): code + `final`/`pNN`/`pNN-pMM` → `1_800_000`; code + `pNN-tNN` (bounded task) → `900_000`; artifact (any scope) → `900_000` → legacy `GATE_EXEC_TIMEOUT_MS` when type/scope is unknown (`gate exec` and untyped runs). Test each scope bucket explicitly, including scope-default vs env precedence interaction. Resolved `{ timeoutMs, source }` appears in the startup diagnostic (`timeout=…ms (source=…)`) and in timeout envelopes. Env var above scope defaults is deliberate (existing explicit user action outranks new built-ins) — pin it. Invalid CLI value rejected at parse. **Resolve-time malformed-value diagnostics (owned here per re-review M2):** each malformed persisted source (`target.timeoutMs`, `workflow.gateTimeouts.*`, env var) warns exactly once through the command logger, then falls to the next precedence level — test warn-once per source.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts -t 'timeout'`
Expected: New tests fail (RED)

**Step 2: Implement (GREEN)**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/`
Expected: Tests pass (GREEN) — including #151's late-recovery and telemetry tests, unchanged

**Step 3: Refactor**

None expected.

**Step 4: Verify**

Run: `pnpm format:fix && pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/gate/
git commit -m "feat(p01-t03): resolve gate budgets through documented precedence chain"
```

---

## Phase 2: Headless contract + pre-plan inherit rule

### Task p02-t01: Headless invocation context injection

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts` (spawn env: `OAT_GATE_HEADLESS=1`, `OAT_NON_INTERACTIVE=1`, `OAT_GATE_RUN_ID=<runId>`; `oat_gate_headless: true` in `gateInvocationPromptContext`)
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Step 1: Write test (RED)**

Spawned gate children receive all three env vars merged over `processEnv` (existing entries preserved); the assembled prompt's invocation frontmatter block includes `oat_gate_headless: true`; non-gate paths (`gate check` host detection, availability probes) are NOT marked headless.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts -t 'headless'`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/`
Expected: Tests pass (GREEN)

**Step 3: Refactor**

None expected.

**Step 4: Verify**

Run: `pnpm format:fix && pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/gate/
git commit -m "feat(p02-t01): inject headless invocation context into gate children"
```

---

### Task p02-t02: Run marker lifecycle

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Step 1: Write test (RED)**

Marker written before spawn to `{os.tmpdir()}/oat-gate-runs/<runId>.json` (system temp, outside the repo tree — design-review I1) with `{ runId, targetId, runtime, reviewType, reviewScope, project, startedAt, budgetMs, budgetSource }`; marker path printed in the startup diagnostic; **deleted through a single `try/finally` boundary wrapping the gate run — not per-return cleanup calls (plan-review M4)**: test every early-return/terminal path (completed, timeout, child failure, targeting failure, validation failure, AND a thrown launch error) deletes exactly once; marker I/O failures are warn-and-continue in both directions and never alter the envelope; marker is never read by validation/correlation (assert correlation results identical with marker present/absent/corrupted); **regression: no marker path is ever inside the repository tree, and an orphaned marker never appears in `git status` for the project** (subprocess fixture kills the gate process mid-run and asserts a clean tree). The `finally` boundary stays independent of the parked run-log project's future structural-append finalizer (documented in the task body to keep the collision region cohesive).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts -t 'run marker'`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/`
Expected: Tests pass (GREEN)

**Step 3: Refactor**

None expected.

**Step 4: Verify**

Run: `pnpm format:fix && pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/gate/
git commit -m "feat(p02-t02): write transient gate run markers for post-mortem diagnostics"
```

---

### Task p02-t03: Structured refusal detection (exit-code independent)

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts` (scan captured output for the strict line-start pattern `^OAT_GATE_REFUSAL: ` on every terminal outcome; `refusal` field; precedence rules)
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Step 1: Write test (RED)**

Precedence, per design (plan-review C1 — skill prose cannot force a provider CLI to exit nonzero): (1) validated run-correlated artifact present → refusal text ignored, review outcome stands (artifact-wins); (2) no correlated artifact + refusal line → classified refusal failure (`status: review_failed`, `refusal: '<reason>'`, never receive-eligible) **for both zero-exit and nonzero-exit children** — test both explicitly; (3) no artifact, no refusal → existing failure paths unchanged. Strict matching: mid-line occurrences of the token do not match (line-start only); multiple refusal lines → first wins; refusal never flips fail-closed semantics.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts -t 'refusal'`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/`
Expected: Tests pass (GREEN)

**Step 3: Refactor**

None expected.

**Step 4: Verify**

Run: `pnpm format:fix && pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/gate/
git commit -m "feat(p02-t03): classify structured reviewer refusals in gate failure envelopes"
```

---

### Task p02-t04: `oat gate route` decision helper

**Files:**

- Create: `packages/cli/src/commands/gate/route.ts`
- Create: `packages/cli/src/commands/gate/route.test.ts`
- Modify: `packages/cli/src/commands/gate/index.ts` (register subcommand)

**Step 1: Write test (RED)**

The executable inline/delegate/refuse decision (plan-review I1/I4 — the identity check must be testable code, not prose). Inputs: `--expect-runtime`, `--expect-model`, `--can-await true|false`, process env. Cases: exactly one provider marker (`CLAUDECODE` / `CURSOR_AGENT` / `CODEX_THREAD_ID`) matching `--expect-runtime` + model evidence matching or unknowable → `route: 'inline'`; runtime marker mismatch → `'delegate-sync'` when `--can-await true`, `'refuse'` when false; zero or multiple provider markers (ambiguous parent-vs-child inheritance) → never inline — delegate or refuse per `--can-await`; model evidence present and contradicting `--expect-model` → never inline; every output carries `reason` text suitable for the refusal line verbatim; `--json` envelope shape pinned.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/route.test.ts`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/`
Expected: Tests pass (GREEN)

**Step 3: Format + Verify**

Run: `pnpm format:fix && pnpm lint && pnpm type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/cli/src/commands/gate/
git commit -m "feat(p02-t04): add oat gate route headless decision helper"
```

---

### Task p02-t05: `oat-project-review-provide` headless dispatch rule + pre-plan inherit rule

**Files:**

- Modify: `.agents/skills/oat-project-review-provide/SKILL.md` (headless-mode dispatch rule; pre-plan inherit rule; version bump)
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts` (contract pins)

**Step 1: Implement**

Headless rule: on `oat_gate_headless`/`OAT_GATE_HEADLESS=1`, the skill calls `oat gate route --json` with the expected runtime/model copied from the injected gate frontmatter and `--can-await` per the host's awaited-child capability, then follows the returned route: `inline` → run the oat-reviewer role contract in the current context; `delegate-sync` → awaited dispatch with completion verified (artifact + matching `oat_gate_run_id`) before returning; `refuse` → print `OAT_GATE_REFUSAL: <reason from route output>` on its own line and exit nonzero where the host permits (the gate detects the line regardless of exit code). Tier-1 "run in background if supported" is explicitly overridden in this mode; the skill never makes the identity judgment itself.

Pre-plan inherit rule: when the resolver returns `unresolvedReason: 'policy'` AND the review is `type: artifact` with scope in `{discovery, design, spec}` — do not block, do not prompt; review by deliberate inheritance in the current context; record `selection_reason: inherit (pre-plan; no project policy)`. Guards stated explicitly: an explicitly set project policy is always honored; `type: code` and plan-scope artifact reviews still hard-require resolution; gate exec-target selection unaffected.

Bump the skill's frontmatter version.

**Step 2: Format + Verify**

Run: `pnpm format:fix && pnpm oat:validate-skills && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: Skill validates; format passes; contract pins assert: headless section present, `oat gate route` invocation named, background-dispatch override stated, refusal line format pinned, inherit rule present with all three guards.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-review-provide/ packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "feat(p02-t05): add headless dispatch and pre-plan inherit rules to review-provide"
```

---

### Task p02-t06: Dispatch-mode guidance in `oat-dispatch-subagents`

**Files:**

- Modify: `.agents/skills/oat-dispatch-subagents/SKILL.md` (universal dispatch-mode norm; version bump)
- Modify: `.agents/skills/oat-dispatch-subagents/references/provider-cursor.md` (foreground-interruption hazard + background preference)
- Modify: `.agents/skills/oat-dispatch-subagents/references/provider-claude.md` (print-mode-ONLY background-ceiling note — see Step 1 scoping)

**Step 1: Implement**

Scope addition (operator, 2026-07-15 — recurring interactive-session incidents: multi-minute foreground subagents cancelled by user messages; silent background children with no liveness signal). Universal norm in SKILL.md: dispatch mode is chosen deliberately by expected duration and interaction model — multi-minute dispatches (implementers, fix loops, reviewers) must survive session interaction and run background where the host supports it; foreground is reserved for short checks; fire-and-forget background dispatch remains forbidden in headless gate contexts (this project's contract — the hazards point in opposite directions per context, which is why the norm names both). Monitoring note: a silent background child's provider transcript fs-metadata (mtime/size at the documented per-runtime paths) is observable liveness evidence; never treat it as a health verdict.

Provider-note scoping (operator correction, 2026-07-15): the Claude background-ceiling hazard is **print mode (`claude -p`) only** — interactive Claude Code sessions are unaffected and the note must say so explicitly. Print-mode sessions still consume this skill's prose (the p11 mechanism: gate exec target → `claude -p` parent → skill-guided background dispatch → 600s ceiling kill), and print mode is also reachable outside gates (autonomous/headless invocations per the autonomy contract). The note names the trigger (`CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS`, 600s default), states interactive sessions are unaffected, and defers gate contexts to the headless route contract rather than duplicating it. The Cursor note stays as drafted (foreground interruption is the interactive-session hazard there). Bump the skill version.

Verified child-transcript locations (operator-verified 2026-07-15; belongs in the provider references, not just the gate docs): `provider-cursor.md` — a background subagent's transcript is directly addressable by the agent ID the dispatch returned: `~/.cursor/projects/<encoded-cwd>/agent-transcripts/<agentId>/<agentId>.jsonl`, a sibling of the main thread's directory (verified on two machines, including live mid-run reads); a silent child's liveness check is therefore a stat of that specific file, not a directory heuristic. `provider-claude.md` — nested subagent transcripts live under the parent session: `~/.claude/projects/<encoded-cwd>/<parent-session-id>/subagents/agent-<id>.jsonl` (verified from the p11 parent/child transcript pair). `provider-codex.md` — verified (operator, 2026-07-15): each native subagent gets its own rollout at `~/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-<start-timestamp>-<child-thread-id>.jsonl`, separate from the root session's rollout; the child's `session_meta` record carries `parent_thread_id` (bidirectional linkage — the root log holds the `collabAgentToolCall`/steering/result records); the dispatcher knows the child thread ID at dispatch time, so children are directly addressable. Date-sharding caveat: rollouts shard by **session start date**, so a long-lived root and its fresh child live in different date directories — resolve child paths by the child's spawn date, never the parent's. All reads are fs-metadata-first, observable-evidence-not-health-verdict, consistent with the SKILL.md monitoring note.

**Step 2: Format + Verify**

Run: `pnpm format:fix && pnpm oat:validate-skills`
Expected: Skill validates; format passes

**Step 3: Commit**

```bash
git add .agents/skills/oat-dispatch-subagents/
git commit -m "feat(p02-t06): add dispatch-mode guidance to oat-dispatch-subagents"
```

---

## Phase 3: Liveness probes, envelopes, fixture matrix, docs

### Task p03-t01: Activity probe registry

**Files:**

- Create: `packages/cli/src/commands/gate/activity-probes.ts`
- Create: `packages/cli/src/commands/gate/activity-probes.test.ts`

**Step 1: Write test (RED)**

Per-runtime path derivation: claude `~/.claude/projects/<encoded-cwd>/` (encoding cases ported from the session-observer prior art, including special characters in cwd), codex `~/.codex/sessions/YYYY/MM/DD/` (spawn date; midnight rollover probes both days), cursor `~/.cursor/projects/<encoded-project>/agent-transcripts/` — **with bounded recursive traversal (gate-review remediation): Cursor's real layout nests one level deeper (`<session-id>/<session-id>.jsonl`), so the probe traverses to a bounded depth (2 levels suffices for all three runtimes) and a Cursor-realistic fixture appends to an existing nested `<session-id>/<session-id>.jsonl` (parent dir entry unchanged) and asserts `changedSinceBaseline: true`; traversal errors fail soft**. Probe semantics: absent directory → `null`; **baseline snapshot at spawn (newest mtime + total size across the bounded traversal), `changedSinceBaseline` computed from EITHER axis (plan-review I3)** — test mtime-only advance, size-only growth (same-second append), truncation (size decrease counts as change), and unchanged metadata → `changedSinceBaseline: false`; stat/readdir errors → `null` (never throws); unknown runtime → no probe. Evidence shape matches `GateActivityEvidence` including `totalSizeBytes` (metadata only — assert no file contents are read, e.g. via unreadable-file fixtures). **Attribution scoping (design-review M1):** claude/cursor evidence carries `scope: 'project-dir'`; codex carries `scope: 'ambient-runtime'` — pinned per runtime.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/activity-probes.test.ts`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/`
Expected: Tests pass (GREEN)

**Step 3: Refactor**

Keep path-encoding helpers exported for reuse and independently testable.

**Step 4: Verify**

Run: `pnpm format:fix && pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/gate/activity-probes*
git commit -m "feat(p03-t01): add per-runtime transcript activity probes"
```

---

### Task p03-t02: Liveness snapshot + envelope extensions

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts` (monitor loop: `processAlive` check + probe call per tick; snapshot fields; `activityEvidence` in timeout/failure envelopes; `gate-liveness` diagnostic fields)
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Step 1: Write test (RED)**

Snapshot carries `processAlive` and `lastActivityEvidence`; a silent-but-writing child (stub probe returns advancing evidence) shows `idleMs == elapsedMs` with recent `lastActivityEvidence` — the incident signature, now distinguishable; probe returning `null` degrades to exactly today's snapshot semantics (regression); timeout and failure envelopes include the latest evidence **with its `scope` field, and human-readable diagnostics render `ambient-runtime` evidence as "ambient runtime activity (not attributable to this gate child)" (design-review M1)**; evidence never alters exit codes, budgets, or receive eligibility (assert envelopes differ only by the new fields).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts -t 'liveness'`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/`
Expected: Tests pass (GREEN)

**Step 3: Refactor**

None expected.

**Step 4: Verify**

Run: `pnpm format:fix && pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/gate/
git commit -m "feat(p03-t02): report process and transcript activity in gate liveness and envelopes"
```

---

### Task p03-t03: Deterministic fake runtime + seven-case fixture matrix

**Files:**

- Create: `packages/cli/src/commands/gate/__fixtures__/fake-runtime.mjs`
- Create: `packages/cli/src/commands/gate/gate-hardening.integration.test.ts`

**Step 1: Write test (RED)**

The fake runtime (bundled Node script as an exec target `baseCommand`, driven by env/args) deterministically: emits/withholds stdout; writes transcript-like files into a probe-observed temp dir; writes (or not) an artifact with a given `oat_gate_run_id`; exits with a given code after a given delay; emits a refusal line. Subprocess-level matrix (scaled-ms budgets), each case a named test mapped to its observed failure:

| #   | Case                                                               | Asserts                                                          |
| --- | ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| 1   | headless → inline reviewer → artifact                              | pass; `receiveEligible: true`                                    |
| 2   | async-ceiling class (refusal emitted)                              | `refusal` populated; fail-closed                                 |
| 3   | large final/phase-scope code review under new scope-default budget | completes; `source: 'scope-default'`                             |
| 4   | timeout with advancing transcript activity                         | evidence recent while `idleMs == elapsedMs`; envelope carries it |
| 5   | timeout/failure with no artifact                                   | fail-closed; `noOutputProduced` (#151 regression)                |
| 6   | provenance mismatch (wrong runId)                                  | correlation rejects (regression pin)                             |
| 7   | pass → receive eligibility                                         | `handoff` + `receiveEligible` contract intact                    |

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/gate-hardening.integration.test.ts`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Fixture-only task — file scope is constrained to the two created files (plan-review M5). If the matrix surfaces production defects, fix trivial ones inside the already-modified gate files with an explicit note in the task commit body; anything larger becomes a follow-up `(review)`-style task appended to this phase rather than silent scope growth. Note (plan-review I4): the matrix exercises the **gate side** of every terminal outcome; the child-side inline/delegate/refuse decision is exercised at the unit level via `oat gate route` (p02-t04) — case 2 here verifies the gate classifies an emitted refusal, not that the skill chose to refuse.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/`
Expected: Full gate suite green

**Step 3: Verify**

Run: `pnpm format:fix && pnpm lint && pnpm type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/cli/src/commands/gate/
git commit -m "test(p03-t03): add fake-runtime gate hardening fixture matrix"
```

---

### Task p03-t04: Docs, provider sync, lockstep version bumps

**Files:**

- Modify: `apps/oat-docs/docs/cli-utilities/workflow-gates.md` (budget precedence, headless contract + `oat gate route`, liveness/envelope fields, refusal, run marker), `apps/oat-docs/docs/cli-utilities/configuration.md` + `apps/oat-docs/docs/reference/cli-reference.md` (new keys/flags), linked from `apps/oat-docs/docs/cli-utilities/index.md` `## Contents` with `.md`-suffixed links (plan-review M5 — exact pages named); run `oat docs nav sync` + `oat docs generate-index`
- Modify: `packages/*/package.json` × 5 (lockstep bump)
- Modify: provider views via `oat sync --scope all`; regenerate bundled assets after canonical sources are final; stage `packages/cli/assets/`

**Step 1: Implement**

Author docs (including the migration/example configuration the incident report requires: example `workflow.gateTimeouts`, per-target `timeoutMs`, `--timeout-ms`, and the failure→regression-test mapping table). Sync provider views. Bump all five public packages. **Asset regeneration ordering (gate-review remediation — regenerating after canonical edits necessarily dirties `packages/cli/assets/`, so a pre-staging quiet check would always fail):** (1) regenerate (`bash packages/cli/scripts/bundle-assets.sh`), (2) stage the intended asset changes (`git add packages/cli/assets/`), (3) regenerate again, (4) only then run the assets-scoped quiet check as an idempotence assertion. Use the repo-source CLI (`pnpm run cli -- docs nav sync`, `pnpm run cli -- docs generate-index`) so branch-local behavior is exercised, not the installed binary.

**Step 2: Format + Verify**

Run: `pnpm format:fix && pnpm run cli -- docs nav sync && pnpm run cli -- docs generate-index && bash packages/cli/scripts/bundle-assets.sh && git add packages/cli/assets/ && bash packages/cli/scripts/bundle-assets.sh && git diff --quiet -- packages/cli/assets/ && pnpm release:validate && pnpm build:docs`
Expected: Nav/index clean; regeneration idempotent after staging (quiet check exits 0); release validation passes (package + skill version bumps recognized); docs build green

**Step 3: End-to-end completion-safety verification (recorded in implementation.md — gate-review remediation: the matrix's fake runtime cannot exercise the real review-provide lifecycle)**

Create a disposable fixture project in a temp checkout with **committed** baseline artifacts — review-provide's baseline contract stops before review when core project artifacts are untracked, so the scaffold commit is load-bearing:

```bash
FIXTURE_ROOT=$(mktemp -d)/gate-hardening-smoke   # temp git checkout of this branch
git worktree add "$FIXTURE_ROOT" HEAD
cd "$FIXTURE_ROOT" && pnpm run worktree:init
pnpm run cli -- project new gate-hardening-smoke --mode quick --no-set-active
# (default scaffold commit retained; seed discovery.md with a trivial paragraph, then:)
git add .oat/projects/shared/gate-hardening-smoke/ && git commit -m "chore: seed smoke fixture"
FIXTURE_PROJECT=".oat/projects/shared/gate-hardening-smoke"
```

Then run BOTH lanes with the **repository-source CLI** (`pnpm run cli --`), so the branch-local hardening is what executes — not the installed binary:

```bash
# Lane 1: Claude
pnpm run cli -- gate review --json --project "$FIXTURE_PROJECT" \
  --review-type artifact --review-scope discovery \
  --target claude-fable-skip-permissions \
  "Use oat-project-review-provide artifact discovery to review the fixture discovery. Return blocking findings clearly, or say no blocking findings."

# Lane 2: Cursor
pnpm run cli -- gate review --json --project "$FIXTURE_PROJECT" \
  --review-type artifact --review-scope discovery \
  --target cursor-gpt-5-6-sol-max \
  "Use oat-project-review-provide artifact discovery to review the fixture discovery. Return blocking findings clearly, or say no blocking findings."
```

Assertions per lane (all four required, recorded with output excerpts in implementation.md):

1. Terminal envelope `status: ok|blocked` with `receiveEligible: true` — the headless parent completed without prompt-level inline pinning (the contract did the work).
2. Artifact frontmatter `oat_gate_run_id` equals the envelope `runId` (run-correlated artifact).
3. The fixture project's Reviews table row was updated AND the bookkeeping commit exists in the fixture checkout **before the parent exited** (`git -C "$FIXTURE_ROOT" log --oneline -1` shows the review commit landing after the seed commit).
4. Startup diagnostic shows the resolved budget with `source`, and at least one liveness tick carries `processAlive`/activity-evidence fields.

Explicit target pinning is acceptable here (manual/debug exception in the gate contract). If a lane cannot complete for environmental reasons, record the exact failure and do not mark this step complete.

**Step 4: Commit**

```bash
git add apps/oat-docs/ packages/*/package.json packages/cli/assets/ .claude/ .cursor/ .codex/ .oat/sync/
git commit -m "feat(p03-t04): document gate hardening and bump release versions"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows as needed, but do not delete `spec`/`design`.}

| Scope  | Type     | Status          | Date       | Artifact                                                      |
| ------ | -------- | --------------- | ---------- | ------------------------------------------------------------- |
| p01    | code     | pending         | -          | -                                                             |
| p02    | code     | pending         | -          | -                                                             |
| p03    | code     | pending         | -          | -                                                             |
| final  | code     | pending         | -          | -                                                             |
| spec   | artifact | pending         | -          | -                                                             |
| design | artifact | fixes_completed | 2026-07-15 | reviews/archived/artifact-design-review-2026-07-15T212105Z.md |
| plan   | artifact | passed          | 2026-07-15 | structured (in-session oat-reviewer, 3 rounds)                |
| plan   | artifact | fixes_completed | 2026-07-15 | reviews/archived/artifact-plan-review-2026-07-15T215828Z.md   |
| plan   | artifact | fixes_completed | 2026-07-15 | reviews/archived/artifact-plan-review-2026-07-15T221501Z.md   |

**Plan review disposition (2026-07-15):** two review layers. (1) In-session structured-mode artifact review, 3 rounds within the retry bound: 1C/4I/5M → 1I/3M/1m → **clean** (one cosmetic minor fixed inline). Architectural additions from round 1: `oat gate route` helper (p02-t04); `ladderCompleteness` in the resolver envelope. (2) Cross-runtime gate review (`reviews/artifact-plan-review-2026-07-15T215828Z.md`): blocked with 3 Important + 2 Medium — all remediated same day: scope-aware budget defaults (`reviewScope` resolver input; task-scoped code reviews stay 15 min); phase-gate checklist item corrected to record the actual user decision (disabled, 2026-07-15 — the "pending" checkbox was stale, not the decision); end-to-end completion-safety verification lane with exact commands and four required assertions (p03-t04 Step 3); asset regeneration ordering fixed (regenerate → stage → regenerate → idempotence check, repo-source CLI); Cursor nested-layout bounded traversal + realistic fixture (p03-t01). Attempt 2 (`reviews/archived/artifact-plan-review-2026-07-15T221501Z.md`): 2 Important residuals (stale `type-default` labels; completion-safety lane defects) — remediated in `554ad580`. Attempts exhausted → escalated per gate contract; **operator disposition 2026-07-15: accepted as implementation-ready, no further review** (acceptance also ratifies the post-gate p02-t06 dispatch-mode addition). Both gate artifacts received in auto-disposition mode (all findings pre-remediated; none converted to tasks) and archived.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as **clean** (no residual findings at any severity; residual findings keep their actual non-passed status with a disposition note until resolved)

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks - Budget config/precedence + resolver envelope distinction + ladder completeness/inspection
- Phase 2: 6 tasks - Headless context injection, run marker, refusal detection, `oat gate route` helper, review-provide dispatch + inherit rules, dispatch-mode guidance
- Phase 3: 4 tasks - Activity probes, liveness/envelope extensions, fake-runtime fixture matrix, docs + version bumps

**Total: 13 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md` (lightweight design; includes 2026-07-15 reviewer-resolution scope addition)
- Discovery: `discovery.md` (verified incident evidence, current-source findings, prior art, baseline)
- Incident evidence: consumer-app `consumer-app-v1` p11 artifacts + four verified transcripts (paths in discovery)
- Baseline PRs: #151 (late recovery + telemetry), #149 (stdin), #150 (artifact parsing contract), #133/#150 (autonomy contract)
