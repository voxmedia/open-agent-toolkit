---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-15
oat_phase: plan
oat_phase_status: in_progress
oat_plan_hill_phases: ['p03'] # workflow.hillCheckpointDefault=final → pause after last phase
oat_plan_parallel_groups: [] # sequential; see ## Parallelism
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: true
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
- [ ] Phase gate review: pending Step 3.55 user choice

---

## Parallelism

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

Pin the three gap combinations against a fixture config: policy missing + ladder resolved → `unresolvedReason: 'policy'` AND ladder/matrix fields report their actual resolved values (regression for the 2026-07-15 conflation, where `matrix: null` masked a healthy user-config ladder); policy resolved + ladder missing/incomplete → `unresolvedReason: 'ladder'`; both missing → `'both'`. Resolved envelopes carry no `unresolvedReason`. `--preflight` human-readable output names the actual gap with the actual fix (policy: "set `oat_dispatch_policy` in project state (normally at plan time) or select Inherit Host Defaults"; ladder: "adopt a dispatch matrix"). **Ladder inspection (second-incident regression):** `oat config get workflow.dispatchCeiling.providers` (and per-provider children) returns effective layered values instead of `Unknown config key` when configured, and a clear absent indication when not.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch-ceiling/index.test.ts`
Expected: New tests fail (RED)

**Step 2: Implement (GREEN)**

The resolver already computes both facts independently; this task surfaces them without changing resolution behavior. Update the plan-writing adoption contract prose to route on `unresolvedReason` (adoption prompt fires only on `'ladder' | 'both'`) and bump that skill's version.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch-ceiling/ src/commands/config/`
Expected: Tests pass (GREEN), existing resolution tests unchanged

**Step 3: Refactor**

None expected; keep the envelope shape change additive.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check && pnpm oat:validate-skills`
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

`ExecTarget.timeoutMs` accepts integers in `[1_000, 14_400_000]`, rejects out-of-bounds/non-integer at write/parse time; `gate target set --timeout-ms` round-trips; `workflow.gateTimeouts.{code,artifact}` validated to the same bounds, layered local > shared > user, registered for `oat config get/set`; malformed persisted values are ignored-with-warning at read time (fail soft).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/config/resolve.test.ts src/commands/config/`
Expected: New tests fail (RED)

**Step 2: Implement (GREEN)**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/ src/commands/config/`
Expected: Tests pass (GREEN)

**Step 3: Refactor**

Share the bounds validator between the target field and the workflow keys.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
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

Precedence, each level shadowing the next: CLI `--timeout-ms` → `target.timeoutMs` → `workflow.gateTimeouts[reviewType]` → `OAT_GATE_EXEC_TIMEOUT_MS` → built-in type default (code `1_800_000`, artifact `900_000`) → legacy `GATE_EXEC_TIMEOUT_MS` when review type is unknown (`gate exec` and untyped runs). Resolved `{ timeoutMs, source }` appears in the startup diagnostic (`timeout=…ms (source=…)`) and in timeout envelopes. Env var above type defaults is deliberate (existing explicit user action outranks new built-ins) — pin it. Invalid CLI value rejected at parse; invalid config value skipped-with-warning to the next level.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts -t 'timeout'`
Expected: New tests fail (RED)

**Step 2: Implement (GREEN)**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/`
Expected: Tests pass (GREEN) — including #151's late-recovery and telemetry tests, unchanged

**Step 3: Refactor**

None expected.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
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

Run: `pnpm lint && pnpm type-check`
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

Marker written before spawn to `{os.tmpdir()}/oat-gate-runs/<runId>.json` (system temp, outside the repo tree — design-review I1) with `{ runId, targetId, runtime, reviewType, reviewScope, project, startedAt, budgetMs, budgetSource }`; marker path printed in the startup diagnostic; deleted on every terminal path (completed, timeout, child failure, validation failure); marker I/O failures are warn-and-continue in both directions and never alter the envelope; marker is never read by validation/correlation (assert correlation results identical with marker present/absent/corrupted); **regression: no marker path is ever inside the repository tree, and an orphaned marker never appears in `git status` for the project** (subprocess fixture kills the gate process mid-run and asserts a clean tree).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts -t 'run marker'`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/`
Expected: Tests pass (GREEN)

**Step 3: Refactor**

None expected.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/gate/
git commit -m "feat(p02-t02): write transient gate run markers for post-mortem diagnostics"
```

---

### Task p02-t03: Structured refusal detection

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts` (scan captured output for the `OAT_GATE_REFUSAL:` prefix on nonzero exits; `refusal` field in failure envelopes)
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Step 1: Write test (RED)**

Nonzero exit + refusal line → envelope `refusal: '<reason text>'` alongside existing failure fields; zero exit with a refusal line → ignored (success path unchanged); nonzero without the line → no `refusal` field; multiple lines → first wins; refusal never flips fail-closed semantics (still `review_failed`, still not receive-eligible).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts -t 'refusal'`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/`
Expected: Tests pass (GREEN)

**Step 3: Refactor**

None expected.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/gate/
git commit -m "feat(p02-t03): classify structured reviewer refusals in gate failure envelopes"
```

---

### Task p02-t04: `oat-project-review-provide` headless dispatch rule + pre-plan inherit rule

**Files:**

- Modify: `.agents/skills/oat-project-review-provide/SKILL.md` (headless-mode dispatch rule; pre-plan inherit rule; version bump)
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts` (contract pins)

**Step 1: Implement**

Headless rule (per design's child-side state machine): on `oat_gate_headless`/`OAT_GATE_HEADLESS=1` — identity check via existing host-detection/runtime-identity machinery; match → review inline; no match → synchronous/awaited delegation only, with completion verified (artifact + matching `oat_gate_run_id`) before returning; neither → print `OAT_GATE_REFUSAL: no headless-safe review route (<reason>)` and exit nonzero. Tier-1 "run in background if supported" is explicitly overridden in this mode. Inconclusive identity = no match (never guess inline).

Pre-plan inherit rule: when the resolver returns `unresolvedReason: 'policy'` AND the review is `type: artifact` with scope in `{discovery, design, spec}` — do not block, do not prompt; review by deliberate inheritance in the current context; record `selection_reason: inherit (pre-plan; no project policy)`. Guards stated explicitly: an explicitly set project policy is always honored; `type: code` and plan-scope artifact reviews still hard-require resolution; gate exec-target selection unaffected.

Bump the skill's frontmatter version.

**Step 2: Verify**

Run: `pnpm oat:validate-skills && pnpm format && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: Skill validates; format passes; contract pins assert: headless section present, background-dispatch override stated, refusal line format pinned, inherit rule present with all three guards.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-review-provide/ packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "feat(p02-t04): add headless dispatch and pre-plan inherit rules to review-provide"
```

---

## Phase 3: Liveness probes, envelopes, fixture matrix, docs

### Task p03-t01: Activity probe registry

**Files:**

- Create: `packages/cli/src/commands/gate/activity-probes.ts`
- Create: `packages/cli/src/commands/gate/activity-probes.test.ts`

**Step 1: Write test (RED)**

Per-runtime path derivation: claude `~/.claude/projects/<encoded-cwd>/` (encoding cases ported from the session-observer prior art, including special characters in cwd), codex `~/.codex/sessions/YYYY/MM/DD/` (spawn date; midnight rollover probes both days), cursor `~/.cursor/projects/<encoded-project>/agent-transcripts/`. Probe semantics: absent directory → `null`; newest mtime under the dir; evidence newer than `spawnedAt` counts as activity; stat/readdir errors → `null` (never throws); unknown runtime → no probe. Evidence shape matches `GateActivityEvidence` (mtime/size metadata only — assert no file contents are read, e.g. via unreadable-file fixtures). **Attribution scoping (design-review M1):** claude/cursor evidence carries `scope: 'project-dir'`; codex carries `scope: 'ambient-runtime'` — pinned per runtime.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/activity-probes.test.ts`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/`
Expected: Tests pass (GREEN)

**Step 3: Refactor**

Keep path-encoding helpers exported for reuse and independently testable.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
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

Run: `pnpm lint && pnpm type-check`
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

| #   | Case                                       | Asserts                                                          |
| --- | ------------------------------------------ | ---------------------------------------------------------------- |
| 1   | headless → inline reviewer → artifact      | pass; `receiveEligible: true`                                    |
| 2   | async-ceiling class (refusal emitted)      | `refusal` populated; fail-closed                                 |
| 3   | large review under new type-default budget | completes; `source: 'type-default'`                              |
| 4   | timeout with advancing transcript activity | evidence recent while `idleMs == elapsedMs`; envelope carries it |
| 5   | timeout/failure with no artifact           | fail-closed; `noOutputProduced` (#151 regression)                |
| 6   | provenance mismatch (wrong runId)          | correlation rejects (regression pin)                             |
| 7   | pass → receive eligibility                 | `handoff` + `receiveEligible` contract intact                    |

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/gate-hardening.integration.test.ts`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Fixture-only task plus whatever composition defects the matrix surfaces.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/`
Expected: Full gate suite green

**Step 3: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/cli/src/commands/gate/
git commit -m "test(p03-t03): add fake-runtime gate hardening fixture matrix"
```

---

### Task p03-t04: Docs, provider sync, lockstep version bumps

**Files:**

- Modify: `apps/oat-docs/docs/cli-utilities/workflow-gates.md` (budget precedence, headless contract, liveness/envelope fields, refusal, run marker) and the config/CLI reference pages for the new keys/flags; link from the nearest authored `## Contents` map with `.md`-suffixed links; run `oat docs nav sync` + `oat docs generate-index`
- Modify: `packages/*/package.json` × 5 (lockstep bump)
- Modify: provider views via `oat sync --scope all`; regenerate bundled assets once after canonical sources are final; stage `packages/cli/assets/`

**Step 1: Implement**

Author docs (including the migration/example configuration the incident report requires: example `workflow.gateTimeouts`, per-target `timeoutMs`, `--timeout-ms`, and the failure→regression-test mapping table). Sync provider views. Bump all five public packages.

**Step 2: Verify**

Run: `oat docs nav sync && oat docs generate-index && pnpm release:validate && pnpm build:docs && git diff --quiet -- packages/cli/assets/`
Expected: Nav/index clean; release validation passes (package + skill version bumps recognized); docs build green; no unstaged regenerated assets

**Step 3: Manual verification (recorded in implementation.md)**

One real headless Claude run and one real Cursor run against a small fixture project: inline completion, budget source reporting, liveness evidence present.

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
| plan   | artifact | pending         | -          | -                                                             |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as **clean** (no residual findings at any severity; residual findings keep their actual non-passed status with a disposition note until resolved)

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks - Budget config/precedence + resolver envelope distinction
- Phase 2: 4 tasks - Headless context injection, run marker, refusal detection, review-provide dispatch + inherit rules
- Phase 3: 4 tasks - Activity probes, liveness/envelope extensions, fake-runtime fixture matrix, docs + version bumps

**Total: 11 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md` (lightweight design; includes 2026-07-15 reviewer-resolution scope addition)
- Discovery: `discovery.md` (verified incident evidence, current-source findings, prior art, baseline)
- Incident evidence: consumer-app `consumer-app-v1` p11 artifacts + four verified transcripts (paths in discovery)
- Baseline PRs: #151 (late recovery + telemetry), #149 (stdin), #150 (artifact parsing contract), #133/#150 (autonomy contract)
