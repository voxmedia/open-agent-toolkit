---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-11
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p06'] # final phase only, from workflow.hillCheckpointDefault
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: [['p02', 'p03']] # runner core and evidence collector are file-disjoint
oat_phase_review_gate:
  enabled: true
  phases: []
  review_type: code
  exit_nonzero_on: important
oat_plan_source: quick # spec-driven | quick | imported
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
oat_template_name: plan
---

# Implementation Plan: oat-project-fixture

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Ship a live workflow smoke capability — deterministic fixture project, opt-in smoke runner, evidence collector/report — then use it to land and evidence a working native-first subagent orchestration model across four harness targets (Codex, Claude, Cursor IDE, Cursor CLI), with an OAT docs deliverable and Vault knowledge capture.

**Architecture:** Version-controlled fixture (`tools/smoke/fixture/`, 3 phases × 3 log-append tasks, p01∥p02 + fan-in p03, two state presets) + runner script (preflight → provision → drive → collect → cleanup, manifest-based and interrupt-safe) + evidence report asserting the three-layer provenance model. See `design.md`.

**Tech Stack:** Node ESM scripts under `tools/smoke/` (mirroring `tools/verification/` conventions), `node --test` for script tests, existing `oat` CLI (local build) as the executable under test, Fumadocs for the docs deliverable.

**Commit Convention:** `{type}({scope}): {description}` — e.g., `feat(p01-t01): scaffold smoke fixture project template`

## Planning Checklist

- [x] Confirmed HiLL checkpoints (final phase only, from workflow.hillCheckpointDefault)
- [x] Set `oat_plan_hill_phases` at implement start
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

- **`[['p02','p03']]`** — the runner core (p02) and the evidence collector (p03) have disjoint write sets: `tools/smoke/runner/**` vs `tools/smoke/evidence/**`, with tests colocated per module. They integrate through a small file/CLI contract defined in p01 (`tools/smoke/CONTRACT.md`: provisioning-manifest shape, evidence output paths, collector invocation), so neither phase edits the other's files; the live wiring is exercised first in p04. Verification is independent (`node --test` per directory). Neither phase touches shared generated assets, package manifests, or docs builds, avoiding the operational write-set conflicts documented in the max-depth learnings.
- **p01 must precede the group** — both phases consume the fixture and the contract doc it ships.
- **p04, p05, and p06 are sequential** — p04 (orchestration contract in skills) writes `.agents/**` and skill contract tests and must reconcile against PR #137's merged language rather than race it; p05 (live harness runs) depends on all prior phases and produces evidence consumed by p06 (docs/Vault/release). p06 additionally touches lockstep package manifests and the docs app, which must not race anything.
- **Sibling sequencing (decided):** live smoke runs execute against this worktree's local binary now — main is already merged in (post-PR #136), so `dispatch-schema-matrix-infrastructure` behavior is under test. When PR #137 (`codex-subagent-max-depth`) merges, merge main again before or during p04 (contract reconciliation) and re-run the Codex `implement` scenario as re-verification (bounded step in p06-t03). No smoke work is blocked on sibling merges.
- Fixture-internal parallelism (the fixture's own p01∥p02 phases) is content of the fixture, not this plan's execution shape.

---

## Phase 1: Fixture Project Template

### Task p01-t01: Scaffold the fixture project template

**Files:**

- Create: `tools/smoke/fixture/project/{state.md,discovery.md,design.md,plan.md,implementation.md}`
- Create: `tools/smoke/fixture/workspace/logs/{p01.log,p02.log,p03.log}` (seed headers)
- Create: `tools/smoke/CONTRACT.md` (runner⇄evidence interface: provisioning-manifest shape incl. the applied scenario, evidence paths, collector invocation)

**Step 1: Write test (RED)** — `tools/smoke/fixture/fixture-integrity.test.mjs`: asserts fixture plan has stable `pNN-tNN` IDs (3 phases × 3 tasks), declares `oat_plan_parallel_groups: [['p01','p02']]`, includes `## Reviews`/`## Implementation Complete`/`## References` sections, and each task's write target is confined to its own phase log file.
Run: `node --test tools/smoke/fixture/fixture-integrity.test.mjs` — Expected: fails (fixture absent).

**Step 2: Implement (GREEN)** — author the fixture artifacts: plan in canonical format (deterministic log-append tasks with bounded verification), state.md with fixture dispatch policy (named ceiling `high`, sparse matrix override with lower exact candidates per provider incl. a Cursor opaque string), minimal discovery/design.
Run: same test — Expected: passes.

**Step 3: Refactor** — keep task bodies minimal and byte-stable.

**Step 4: Verify** — `pnpm lint && pnpm format`
Expected: no errors.

**Step 5: Commit** — `git add tools/smoke && git commit -m "feat(p01-t01): scaffold smoke fixture project template"`

---

### Task p01-t02: Fixture state presets

**Files:**

- Create: `tools/smoke/fixture/presets/pre-review.json` (canonical; matches shipped artifacts)
- Create: `tools/smoke/fixture/presets/implementation-ready.json` (frontmatter overlay: plan `oat_status: complete`, `oat_ready_for: oat-project-implement`, `oat_template: false`, plan review row `passed`; implementation `oat_current_task_id: p01-t01`)
- Create: `tools/smoke/fixture/presets/apply-preset.mjs` (pure function + tiny CLI to apply an overlay to a fixture copy)

**Step 1: Write test (RED)** — `tools/smoke/fixture/presets/apply-preset.test.mjs`: applying `implementation-ready` to a fixture copy yields implementation-ready frontmatter; applying `pre-review` restores the canonical shape (inverse property); unknown preset fails closed.
Run: `node --test tools/smoke/fixture/presets/apply-preset.test.mjs` — Expected: fails.

**Step 2: Implement (GREEN)** — same test passes.

**Step 3: Refactor** — none expected.

**Step 4: Verify** — `pnpm lint && pnpm format`

**Step 5: Commit** — `git add tools/smoke/fixture/presets && git commit -m "feat(p01-t02): add fixture state presets and applier"`

---

### Task p01-t03: Fixture format contract test

**Files:**

- Create: `tools/smoke/fixture/fixture-format-contract.test.mjs`

**Step 1: Write test (RED)** — contract test validating the fixture plan against the plan-writing invariants (frontmatter keys, review-table rows incl. artifact rows, task heading format) and validating the dispatch-policy shape in fixture `state.md` (named ceiling, no compiled provider targets copied in).
Run: `node --test tools/smoke/fixture/fixture-format-contract.test.mjs` — Expected: fails on first gap.

**Step 2: Implement (GREEN)** — fix fixture artifacts until the contract passes.

**Step 3: Refactor** — none.

**Step 4: Verify** — `node --test 'tools/smoke/fixture/**/*.test.mjs'` (all fixture tests green) and `pnpm lint`.

**Step 5: Commit** — `git add tools/smoke/fixture && git commit -m "test(p01-t03): add fixture format contract test"`

---

## Phase 2: Smoke Runner Core

### Task p02-t01: Runner skeleton and argument contract

**Files:**

- Create: `tools/smoke/runner/run-smoke.mjs` (entry: `--harness codex|claude|cursor-ide|cursor-cli`, `--scenario plan-review|implement|full`, `--stage prepare|drive|collect` — default runs all stages; `prepare`/`collect` support manual-session harnesses, `--dry-run`, `--keep`)
- Create: `tools/smoke/runner/args.mjs`

**Step 1: Write test (RED)** — `tools/smoke/runner/args.test.mjs`: argument parsing/validation (unknown harness/scenario fails closed with usage; defaults documented).
Run: `node --test tools/smoke/runner/args.test.mjs` — Expected: fails.

**Step 2: Implement (GREEN)** — same test passes.

**Step 3: Refactor** — none.

**Step 4: Verify** — `pnpm lint && pnpm format`

**Step 5: Commit** — `git add tools/smoke/runner && git commit -m "feat(p02-t01): add smoke runner skeleton and args contract"`

---

### Task p02-t02: Preflight module

**Files:**

- Create: `tools/smoke/runner/preflight.mjs`
- Modify: `tools/smoke/runner/run-smoke.mjs` (wire preflight)

**Step 1: Write test (RED)** — `tools/smoke/runner/preflight.test.mjs`: with injected probes, preflight (a) reports each provider runtime's availability, (b) fails closed when the harness under test is unavailable, (c) detects a stale global `oat` shadowing the local build (PATH resolution vs local dist), (d) validates fixture integrity before any provisioning, (e) never creates files on failure, (f) honors `OAT_SMOKE_FORCE_UNAVAILABLE=<harness>` — a scoped override that forces exactly that harness's availability probe to report unavailable, giving the live negative control a deterministic route that does not depend on any runtime actually being missing, (g) distinguishes **installed from authenticated**: a non-mutating auth-readiness probe per harness (e.g. `codex login status` / `claude auth status` / `cursor-agent status` equivalents), an installed-but-unauthenticated test case that fails closed, auth results included in both human and JSON readiness reports, and auth failure creating no manifest, branch, or worktree.
Run: `node --test tools/smoke/runner/preflight.test.mjs` — Expected: fails.

**Step 2: Implement (GREEN)** — probes: `command -v` + version/identity checks per provider CLI, local binary fingerprint, fixture test invocation. Readiness report to stdout (human) + JSON.

**Step 3: Refactor** — keep probes injectable for tests.

**Step 4: Verify** — `pnpm lint && pnpm format`

**Step 5: Commit** — `git add tools/smoke/runner && git commit -m "feat(p02-t02): add fail-closed smoke preflight"`

---

### Task p02-t03: Provisioning with manifest and isolated config

**Files:**

- Create: `tools/smoke/runner/provision.mjs`
- Modify: `tools/smoke/runner/run-smoke.mjs`

**Step 1: Write test (RED)** — `tools/smoke/runner/provision.test.mjs`: provisioning (a) creates a disposable worktree with a flat collision-resistant branch name, (b) copies the fixture into `.oat/projects/`, (c) writes isolated `config.local.json` (activeProject + smoke markers) without reading or writing the user's `~/.oat/config.json`, (d) applies the scenario's state preset, (e) records every created path/branch/worktree in a provisioning manifest per `CONTRACT.md`, (f) resolves and records the per-harness writable-root requirements (worktree content, shared Git metadata dir, `.agents`) in the manifest so drive protocols can provision Codex scoped writable roots before launch, (g) records the applied scenario in the manifest (the field p03's assertion-profile selection reads).
Run: `node --test tools/smoke/runner/provision.test.mjs` — Expected: fails.

**Step 2: Implement (GREEN)** — same test passes.

**Step 3: Refactor** — none.

**Step 4: Verify** — `pnpm lint && pnpm format`

**Step 5: Commit** — `git add tools/smoke/runner && git commit -m "feat(p02-t03): add manifest-based smoke provisioning"`

---

### Task p02-t04: Cleanup and dry-run isolation proof

**Files:**

- Create: `tools/smoke/runner/cleanup.mjs`
- Modify: `tools/smoke/runner/run-smoke.mjs` (wire `--dry-run` end-to-end: provision → no-op drive → collect stub → cleanup)

**Step 1: Write test (RED)** — `tools/smoke/runner/cleanup.test.mjs`: cleanup removes exactly the manifest's entries (idempotent; second run is a no-op), refuses paths outside the manifest, and survives a manifest from an interrupted run (partial entries). Dry-run integration test: full pass leaves `git status` clean, user config untouched (byte-compare), and no worktrees behind. Interrupt integration test: spawn the runner in dry-run mode, send SIGTERM mid-provision and mid-drive, then assert cleanup from the manifest leaves no orphans and touches nothing outside it (design Level 2 kill-and-recover).
Run: `node --test tools/smoke/runner/cleanup.test.mjs` — Expected: fails.

**Step 2: Implement (GREEN)** — same test passes.

**Step 3: Refactor** — none.

**Step 4: Verify** — `node --test 'tools/smoke/runner/**/*.test.mjs'` and `pnpm lint && pnpm format`

**Step 5: Commit** — `git add tools/smoke/runner && git commit -m "feat(p02-t04): add interrupt-safe cleanup and dry-run isolation proof"`

---

### Task p02-t05: (recovery) Isolate approval-aware closeout configuration

**Files:**

- Modify: `tools/smoke/runner/provision.mjs`
- Modify: `tools/smoke/runner/provision.test.mjs`
- Modify: `tools/smoke/CONTRACT.md`

**Step 1: Write test (RED)** — extend provisioning tests with a repository-level
`workflow.postImplementSequence` containing `summary`, `document`, and `pr`.
Assert the disposable worktree's local config atomically overrides it with
`{ preApproval: [], postApproval: [] }`, while preserving `activeProject` and
smoke markers. Resolve the effective local value through the repository CLI or
config resolver and assert that no inherited pre/post-approval child step can
run. The user config byte comparison remains unchanged.
Run: `node --test tools/smoke/runner/provision.test.mjs` — Expected: fails
before the local workflow override exists.

**Step 2: Implement (GREEN)** — write the empty structured sequence into the
isolated `config.local.json`. Record the effective closeout policy in the
provisioning manifest so later evidence can prove that full smoke runs exercise
final approval ordering without summary, documentation, PR, or other external
side effects.

**Step 3: Refactor** — keep the override as a named immutable safety constant;
do not copy the repository or user sequence into the disposable run.

**Step 4: Verify** —
`node --test 'tools/smoke/runner/**/*.test.mjs'`,
`pnpm exec oxlint tools/smoke/runner`, and
`pnpm exec oxfmt --check 'tools/smoke/runner/**/*.mjs'`.

**Step 5: Commit** —
`git add tools/smoke/runner tools/smoke/CONTRACT.md && git commit -m "fix(p02-t05): isolate smoke closeout sequence"`.

---

## Phase 3: Evidence Collector & Report

### Task p03-t01: Evidence collection module

**Files:**

- Create: `tools/smoke/evidence/collect.mjs` (+ CLI per `CONTRACT.md`: `node tools/smoke/evidence/collect.mjs --worktree <path> --manifest <path> --out <dir>`)
- Create: `tools/smoke/evidence/golden/` (golden inputs: dispatch records, review artifact frontmatter, immutable launcher-owned orchestration events, Git-history shapes)

**Step 1: Write test (RED)** — `tools/smoke/evidence/collect.test.mjs`: from golden inputs, collector extracts dispatch records (target/model/effort per launch), review/gate artifact frontmatter (gate target, run ID, corroboration fields), fixture log lines, immutable orchestration-event records written by p05 adapters, and branch/commit topology into one normalized evidence bundle (JSON).
Run: `node --test tools/smoke/evidence/collect.test.mjs` — Expected: fails.

**Step 2: Implement (GREEN)** — same test passes.

**Step 3: Refactor** — none.

**Step 4: Verify** — `pnpm lint && pnpm format`

**Step 5: Commit** — `git add tools/smoke/evidence && git commit -m "feat(p03-t01): add smoke evidence collection module"`

---

### Task p03-t02: Assertion engine and report emitters

**Files:**

- Create: `tools/smoke/evidence/assertions.mjs`
- Create: `tools/smoke/evidence/report.mjs` (markdown + JSON emitters; also a check mode — `node tools/smoke/evidence/report.mjs --check <report.json> --expect-profile <scenario-or-control>` exits 0 iff the digest-bound bundle recomputes the explicitly expected profile with every assertion passed — used as the copy-paste verification command by p05 live tasks)

**Step 1: Write test (RED)** — `tools/smoke/evidence/assertions.test.mjs`: **scenario-aware assertion profiles** per design §Scenario / Entry-Point Model, selected by the scenario recorded in the bundle's provisioning manifest:

- `plan-review` profile: substantive plan unchanged on resume (task IDs, parallel groups, content hash), review row disposition durable + corroborated, pre-review → reviewed → implementation-ready state transitions atomic and ordered.
- `implement` profile: phase/task dispatch completeness, exact selected target at-or-below ceiling, parallel isolation (disjoint writes, separate worktrees, flat branch names), fan-in reconciliation, review/gate rows durable + corroborated, runtime identity recorded or `not-reported`.
- `full` profile: union of both.

Report emitters produce deterministic output for a fixed bundle. Golden fixtures cover each profile.
Run: `node --test tools/smoke/evidence/assertions.test.mjs` — Expected: fails.

**Step 2: Implement (GREEN)** — same test passes.

**Step 3: Refactor** — none.

**Step 4: Verify** — `pnpm lint && pnpm format`

**Step 5: Commit** — `git add tools/smoke/evidence && git commit -m "feat(p03-t02): add evidence assertions and report emitters"`

---

### Task p03-t03: Negative-control assertions

**Files:**

- Modify: `tools/smoke/evidence/assertions.mjs`
- Create: `tools/smoke/evidence/golden/negative/` (unavailable-target preflight report; post-acceptance-failure dispatch record)

**Step 1: Write test (RED)** — extend `assertions.test.mjs`: (a) an unavailable-target preflight report asserts "exited without provisioning" (manifest absent); (b) a bundle containing an accepted child that later failed must assert **no second pinned launch for the same task** (no-fallback-after-acceptance), flagging violation as Critical.
Run: `node --test tools/smoke/evidence/assertions.test.mjs` — Expected: fails.

**Step 2: Implement (GREEN)** — same test passes.

**Step 3: Refactor** — none.

**Step 4: Verify** — `node --test 'tools/smoke/evidence/**/*.test.mjs'` and `pnpm lint && pnpm format`

**Step 5: Commit** — `git add tools/smoke/evidence && git commit -m "feat(p03-t03): add negative-control evidence assertions"`

---

## Phase 4: Orchestration Contract (Cross-Harness Native-First Selection)

_Sequential; depends on p01–p03 conceptually only through plan order — its write set is skills/agents, disjoint from `tools/smoke/`. PRs #135–#137 are merged. This phase must preserve PR #135's approval-aware final-closeout state machine and PR #137's native depth/fallback discipline while extracting only subagent target selection into the shared skill._

_Skill version-bump policy: one frontmatter `version:` bump per changed canonical skill in the final PR diff. Bump each skill on its first p04 edit (p04-t01); p04-t02 and p04-t03 do not bump again unless they touch a skill not already bumped in this phase._

_Draft-first validation: the provider-neutral contract, Cursor/Codex/Claude harness drafts, and concurrent verification prompts were committed under `references/` during p01. Concurrent harness sessions may return verification reports before p04. These files are inputs, not active runtime contracts. Phase p04 refines confirmed claims and promotes them into a canonical internal skill with one-level provider references._

_Managed-view policy: after every p04 canonical skill or agent edit, run
`oat sync --scope all` and include changed provider-linked views plus
`.oat/sync/manifest.json` in that task's commit. The shared dispatch skill must
be available explicitly to every supported harness._

### Task p04-t01: Promote the validated coordinator selection contract

**Files:**

- Create: `.agents/skills/oat-dispatch-subagents/SKILL.md`
- Modify: `.agents/skills/oat-project-implement/SKILL.md` (version bump)
- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md` (version bump)
- Modify: `.agents/agents/oat-phase-implementer.md`

**Step 1: Reconcile evidence** — use the verified synthesis in `references/dispatching-subagents/{contract.md,providers/*.md,verification/summary.md}` and retain the flat drafts/run packets as immutable evidence. Reconcile it against merged PR #135 and #137 language. Do not promote unverified provider behavior as universal, move final-closeout sequencing into task workers, or weaken exact target selection.

**Step 2: Write test (RED)** — extend the skill contract tests in `packages/cli/src/validation/skills.test.ts` asserting: the canonical internal dispatch skill exists; implementation, phase-coordinator, and plan-writing consumers explicitly load it; the core contract includes per-dispatch catalog snapshots, full-information selection (ladder ∩ ceiling ∩ current dispatcher native catalog), task workers never silently inheriting the root model, recorded pre-start CLI selection with reason + candidates considered, accepted-launch terminality, and **phase-scoped review dispatch semantics** (discovery Decision #11, invariant "reviewer at or above ceiling"): planning-phase artifact self-reviews inherit the parent model by default; implementation-phase self-reviews target the ceiling, allowing inheritance only when the review-owning dispatcher is known at or above it; a below-ceiling Cursor phase coordinator whose nested catalog lacks the ceiling reviewer makes a recorded pre-start CLI reviewer selection; gates pin independent cross-family CLI exec targets. Also preserve the merged post-implementation sequence contract tests so dispatch refactoring cannot remove or reorder final-closeout behavior.
Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts` — Expected: fails.

**Step 3: Implement (GREEN)** — promote the verified provider-neutral contract from `references/dispatching-subagents-draft.md` into a concise, non-user-facing `oat-dispatch-subagents` skill. Keep only non-negotiable safety invariants in consumer skills and require explicit loading before dispatch; do not rely on ambient skill discovery. Keep Codex-specific language consistent with the current merged state.

**Step 4: Refactor** — run the cross-skill drift check **report-only**: verify review-provide skills do not contradict the updated contract. If drift is found, do not edit those skills in this task — record the finding in `implementation.md` and add a new monotonic p04 task (continuing the sequence, e.g. `p04-t04`) with enumerated files, its own verification, version-bump obligations, and commit message.

**Step 5: Verify** — run `oat sync --scope all`, then
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts && pnpm lint && pnpm format`.

**Step 6: Commit** — `git add .agents .claude .codex .oat/sync/manifest.json packages/cli && git commit -m "feat(p04-t01): promote shared subagent dispatch contract"`

---

### Task p04-t02: Cursor and Claude native topology guidance

**Files:**

- Create: `.agents/skills/oat-dispatch-subagents/references/{cursor,codex,claude}.md`
- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.agents/agents/oat-phase-implementer.md`

**Step 1: Write test (RED)** — extend the same contract tests: the shared skill links directly to one-level harness references; consumers read exactly the active-provider reference; per-harness guidance preserves confirmed mechanics and explicit inconclusive findings. Cursor guidance covers native Task, omit-model inheritance, per-dispatch volatile root/nested catalogs, opaque strings, deliberate pre-start CLI leaf selection, coordinator-owned CLI review when the nested catalog cannot satisfy the ceiling, and the **native-catalog mismatch advisory** from discovery Decision #12. Codex guidance covers materialized roles, native depth, scoped writable roots, and configured-invocation evidence. Claude guidance records the verified native and CLI surfaces without conflating capability evidence with p05 production workflow evidence.
Run: scoped vitest as in p04-t01 — Expected: fails.

**Step 2: Implement (GREEN)** — promote the verified provider references from `references/dispatching-subagents/providers/`; use the flat drafts and immutable run packets only for provenance and contradiction checks.

**Step 3: Refactor** — none.

**Step 4: Verify** — run `oat sync --scope all`, scoped skill-contract vitest,
the post-implementation sequence contract test, and
`pnpm lint && pnpm format`.

**Step 5: Commit** — `git add .agents .claude .codex .oat/sync/manifest.json packages/cli && git commit -m "feat(p04-t02): add cursor and claude native topology guidance"`

---

### Task p04-t03: Selection-record fields for dispatch evidence

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md` (dispatch-notes record shape)
- Modify: `.agents/skills/oat-dispatch-subagents/SKILL.md`
- Modify: `tools/smoke/CONTRACT.md` (evidence contract references the same field names)

**Step 1: Write test (RED)** — contract test asserting the dispatch-record shape documents `selection_reason` (e.g. `native-catalog`, `native-catalog-unsatisfying`, `pre-start-rejection`, `inherit`) and `candidates_considered`; smoke evidence assertions (p03) reference identical field names (cross-file consistency check).
Run: scoped vitest + `node --test 'tools/smoke/evidence/**/*.test.mjs'` — Expected: fails.

**Step 2: Implement (GREEN)** — document the fields; update evidence golden fixtures if field names shift.

**Step 3: Refactor** — none.

**Step 4: Verify** — run `oat sync --scope all`, scoped skill-contract vitest,
the post-implementation sequence contract test,
`node --test 'tools/smoke/**/*.test.mjs'`, and
`pnpm lint && pnpm format`.

**Step 5: Commit** — `git add .agents .claude .codex .oat/sync/manifest.json tools/smoke packages/cli && git commit -m "feat(p04-t03): define selection-record fields for dispatch evidence"`

---

## Phase 5: Harness Protocols & Live Smoke Evidence

_Sequential; depends on p01–p04. Live tasks execute from this worktree against real providers and may pause for operator-driven sessions — these pauses are task steps, not blockers. Codex, Claude, and Cursor CLI run both the canonical automated/noninteractive path and a separately labeled operator-interactive path so TTY-dependent differences remain visible; Cursor IDE is operator-driven only. Live tasks (p05-t02 through p05-t06) intentionally use evidence-assertion step structures (Preconditions/Execute/Verify/Commit) instead of the RED/GREEN pattern: their verification surface is the committed evidence report, not a unit test. Each Verify step applies the assertion profile matching the scenario run (`plan-review` / `implement` / `full`) per design §Scenario Model and p03-t02._

### Task p05-t01: Per-harness drive protocols and runner wiring

**Files:**

- Create: `tools/smoke/protocols/{codex.md,claude.md,cursor-ide.md,cursor-cli.md}` (topology expectations, canned root prompts, automated invocation shape, operator-interactive handoff commands)
- Modify: `tools/smoke/runner/{args.mjs,args.test.mjs,run-smoke.mjs}` (add `--drive-mode automated|operator`, default automated; operator mode uses prepare/collect with a separately labeled run/report path; drive step prints/executes the selected protocol; wire evidence collector per `CONTRACT.md`)

**Step 1: Write test (RED)** — `tools/smoke/runner/drive.test.mjs`: drive step selects the right protocol per harness, refuses harnesses failing preflight, and (dry-run) records a drive stub in the manifest. Argument/drive tests prove automated and operator modes allocate distinct run identities/report roots, and operator mode cannot execute the noninteractive drive accidentally.
Run: `node --test tools/smoke/runner/drive.test.mjs` — Expected: fails.

**Step 2: Implement (GREEN)** — same test passes; protocol docs authored from `design.md` §Per-harness drive protocols and the recon references.

**Step 3: Refactor** — none.

**Step 4: Verify** — `node --test 'tools/smoke/**/*.test.mjs'` (full suite) and `pnpm lint && pnpm format`

**Step 5: Commit** — `git add tools/smoke && git commit -m "feat(p05-t01): add per-harness drive protocols and wire evidence collection"`

---

### Task p05-t02: Codex live smoke runs

**Files:**

- Create: `tools/smoke/reports/codex/` (canonical automated evidence: plan-review, implement, full; supplementary operator-interactive evidence under `operator/`)

**Step 1: Preconditions** — preflight passes for Codex; `agents.max_depth >= 2` effective; scoped writable roots per protocol doc.

**Step 2: Execute** — run `plan-review`, then `implement`, then one `full` scenario via `node tools/smoke/runner/run-smoke.mjs --harness codex --scenario <s>`. Then, for each scenario, run `--drive-mode operator --stage prepare`; the operator executes the printed interactive Codex command and canned prompt in the disposable worktree; finish with the matching `--drive-mode operator --stage collect`. Operator reports write to `tools/smoke/reports/codex/operator/<scenario>/` and never replace canonical automated reports.

**Step 3: Verify** — exactly, each expecting exit 0, all three required before the task commit:

```bash
node tools/smoke/evidence/report.mjs --check tools/smoke/reports/codex/plan-review/report.json --expect-profile plan-review
node tools/smoke/evidence/report.mjs --check tools/smoke/reports/codex/implement/report.json --expect-profile implement
node tools/smoke/evidence/report.mjs --check tools/smoke/reports/codex/full/report.json --expect-profile full
node tools/smoke/evidence/report.mjs --check tools/smoke/reports/codex/operator/plan-review/report.json --expect-profile plan-review
node tools/smoke/evidence/report.mjs --check tools/smoke/reports/codex/operator/implement/report.json --expect-profile implement
node tools/smoke/evidence/report.mjs --check tools/smoke/reports/codex/operator/full/report.json --expect-profile full
```

The assertion profile matching each scenario applies: `plan-review` → plan-review profile (resume discipline, review disposition, state transitions); `implement` → implement profile (native coordinator→worker topology recorded, exact below-ceiling role selection, parallel p01∥p02 isolation, fan-in reconciliation, review/gate corroboration); `full` → union. Automated and operator reports are compared for TTY-dependent differences. `node --test 'tools/smoke/evidence/**/*.test.mjs'` still green.

**Step 4: Commit** — `git add tools/smoke/reports/codex && git commit -m "feat(p05-t02): record codex live smoke evidence"`

---

### Task p05-t03: Claude live smoke runs

**Files:**

- Create: `tools/smoke/reports/claude/` (canonical automated evidence plus separately labeled operator-interactive evidence)
- Modify: `tools/smoke/protocols/claude.md` (record the observed sanctioned topology — answers the nesting open question)

**Step 1: Preconditions** — preflight passes for Claude.

**Step 2: Execute** — exactly:

```bash
node tools/smoke/runner/run-smoke.mjs --harness claude --scenario plan-review
node tools/smoke/runner/run-smoke.mjs --harness claude --scenario implement
```

(Full-workflow run deferred for Claude per design Level 3 to bound live-provider cost; deferral recorded in the evidence summary.)

Repeat both scenarios through `--drive-mode operator --stage prepare`, the printed interactive Claude command/prompt in the disposable worktree, and `--drive-mode operator --stage collect`. Operator reports write to `tools/smoke/reports/claude/operator/<scenario>/`.

**Step 3: Verify** — exactly, each expecting exit 0:

```bash
node tools/smoke/evidence/report.mjs --check tools/smoke/reports/claude/plan-review/report.json --expect-profile plan-review
node tools/smoke/evidence/report.mjs --check tools/smoke/reports/claude/implement/report.json --expect-profile implement
node tools/smoke/evidence/report.mjs --check tools/smoke/reports/claude/operator/plan-review/report.json --expect-profile plan-review
node tools/smoke/evidence/report.mjs --check tools/smoke/reports/claude/operator/implement/report.json --expect-profile implement
```

The nesting answer (native coordinator→worker supported or the sanctioned alternative topology) and any automated-vs-interactive TTY divergence are recorded in both the report and the protocol doc.

**Step 4: Commit** — `git add tools/smoke/reports/claude tools/smoke/protocols/claude.md && git commit -m "feat(p05-t03): record claude live smoke evidence and topology"`

---

### Task p05-t04: Cursor IDE live smoke runs

**Files:**

- Create: `tools/smoke/reports/cursor-ide/`

**Step 1: Preconditions** — preflight passes for Cursor IDE tooling.

**Step 2: Execute** — for each scenario `s` in `plan-review`, `implement`, `full` (full required on Cursor IDE per design Level 3), the prepare/collect stages are exact commands and the drive stage is an explicitly manual session:

```bash
node tools/smoke/runner/run-smoke.mjs --harness cursor-ide --scenario "$s" --stage prepare
# MANUAL: open the disposable worktree in a Cursor IDE session and paste the
# canned root prompt printed by the prepare stage; let the session run to completion.
node tools/smoke/runner/run-smoke.mjs --harness cursor-ide --scenario "$s" --stage collect
```

**Step 3: Verify** — exactly, each expecting exit 0:

```bash
node tools/smoke/evidence/report.mjs --check tools/smoke/reports/cursor-ide/plan-review/report.json --expect-profile plan-review
node tools/smoke/evidence/report.mjs --check tools/smoke/reports/cursor-ide/implement/report.json --expect-profile implement
node tools/smoke/evidence/report.mjs --check tools/smoke/reports/cursor-ide/full/report.json --expect-profile full
```

Profile assertions include: coordinator full-information selection recorded (native catalog considered, choice + reason), any CLI task dispatch present only as recorded pre-start selection, task workers never inheriting the root model silently.

**Step 4: Commit** — `git add tools/smoke/reports/cursor-ide && git commit -m "feat(p05-t04): record cursor IDE live smoke evidence"`

---

### Task p05-t05: Cursor CLI live smoke runs

**Files:**

- Create: `tools/smoke/reports/cursor-cli/` (canonical automated evidence plus separately labeled operator-interactive evidence)
- Modify: `tools/smoke/protocols/cursor-cli.md` (record observed behavior)

**Step 1: Preconditions** — preflight passes for `cursor-agent`.

**Step 2: Execute** — exactly:

```bash
node tools/smoke/runner/run-smoke.mjs --harness cursor-cli --scenario plan-review
node tools/smoke/evidence/report.mjs --check tools/smoke/reports/cursor-cli/plan-review/report.json --expect-profile plan-review
# Machine-checkable gating condition for the implement run — proceed only if
# an accepted structured Task selection was observed in this flavor:
if rg -q '"taskSelection": *"accepted"' tools/smoke/reports/cursor-cli/plan-review/report.json; then
  node tools/smoke/runner/run-smoke.mjs --harness cursor-cli --scenario implement
else
  echo "cursor-cli: no accepted Task selection observed — implement skipped, recording inconclusive"
fi
```

(Full-workflow run deferred for Cursor CLI per design Level 3; deferral recorded in the evidence summary.)

Repeat `plan-review` through `--drive-mode operator --stage prepare`, the printed interactive `cursor-agent` command/prompt in the disposable worktree, and `--drive-mode operator --stage collect`; conditionally repeat `implement` only when that operator plan-review report observes accepted structured Task selection. Operator reports write to `tools/smoke/reports/cursor-cli/operator/<scenario>/`.

**Step 3: Verify** — `node tools/smoke/evidence/report.mjs --check tools/smoke/reports/cursor-cli/plan-review/report.json --expect-profile plan-review` and `node tools/smoke/evidence/report.mjs --check tools/smoke/reports/cursor-cli/operator/plan-review/report.json --expect-profile plan-review` (exit 0), plus the corresponding automated/operator checks with `--expect-profile implement` when each gated implement run executed. Either positive evidence (first structured Task events recorded for that CLI drive mode) or a structured inconclusive capture consistent with the prior verification tooling is a valid recorded outcome; the protocol doc states which one and why and compares TTY-dependent differences.

**Step 4: Commit** — `git add tools/smoke/reports/cursor-cli tools/smoke/protocols/cursor-cli.md && git commit -m "feat(p05-t05): record cursor CLI live smoke evidence"`

---

### Task p05-t06: Live negative controls and cross-harness evidence summary

**Files:**

- Create: `tools/smoke/reports/negative-controls/` (live unavailable-target preflight evidence)
- Create: `tools/smoke/reports/SUMMARY.md` (per-harness topology matrix, selection-contract observations, divergences, deferrals, defects observed)

_This task is report-only outside `tools/smoke/reports/`. If live runs surfaced fixture/runner defects, record them in SUMMARY.md and `implementation.md` and add a new monotonic p05 task (e.g. `p05-t07`) with enumerated files, verification, and its own commit — do not bundle fixes into evidence commits._

**Step 1: Live negative control (unavailable target)** — run exactly:

```bash
cp ~/.oat/config.json /tmp/oat-config-before.json
OAT_SMOKE_FORCE_UNAVAILABLE=codex node tools/smoke/runner/run-smoke.mjs --harness codex --scenario plan-review
test $? -ne 0 && test ! -d tools/smoke/.runs && diff -q ~/.oat/config.json /tmp/oat-config-before.json
```

Assert: nonzero exit, unavailability named in the preflight report, **no provisioning occurred** (no manifest, no branch, no worktree), and the user's persisted config is byte-identical. Commit the preflight report as evidence. Zero provider cost, deterministic via the `OAT_SMOKE_FORCE_UNAVAILABLE` probe override from p02-t02.

**Step 2: Failure-path control (opportunistic)** — if any p05 live run naturally produced a post-acceptance child failure, assert no-fallback-after-acceptance on its bundle (p03-t03 assertion); otherwise record `not-observed` in SUMMARY.md rather than forcing a failure.

**Step 3: Synthesize** — comparative matrix across the four targets and, for each CLI harness, automated/noninteractive versus operator-interactive drive modes; explicit statement of the landed orchestration model per harness; record any TTY-dependent differences plus the Claude and Cursor CLI full-workflow deferrals.

**Step 4: Verify** — `node --test 'tools/smoke/**/*.test.mjs'` green; every claim in SUMMARY.md links a committed evidence report.

**Step 5: Commit** — `git add tools/smoke && git commit -m "docs(p05-t06): add negative controls and cross-harness smoke evidence summary"`

---

## Phase 6: Documentation, Vault Capture & Release

_Sequential; depends on p05._

### Task p06-t01: OAT docs — orchestration/subagents/programmatic execution + smoke runbook

**Files:**

- Create: docs pages under `apps/oat-docs/docs/` — (a) orchestration model, subagent dispatch & selection contract, and evidence layers, with the required mermaid diagram set from discovery Decision #9: per-harness coordinator/worker topology; dispatch selection flow (ladder ∩ ceiling ∩ native catalog, incl. the mismatch advisory); the four review flavors and their target resolution (planning self-review = inherit, implementation self-review = at-ceiling pin, phase review gate = gate target, lifecycle gate = cross-runtime CLI exec target with possible nested managed reviewer); three-layer evidence model; smoke runner data flow; **(b) a dedicated smoke-testing runbook**: per-harness prerequisites and auth readiness, scenario selection (`plan-review`/`implement`/`full`), exact commands including the manual Cursor IDE prepare/collect flow and the negative control, evidence-report interpretation, cleanup/recovery after interrupted runs, and **when and how to update the fixture as workflows change** — the runbook's operational purpose is that future workflow adjustments have an unambiguous testing process
- Modify: `apps/oat-docs/AGENTS.md` — refine the project-docs rule from hard prohibition to guidance: `oat-project-document` is the default end-of-project documentation flow (its guidance is valuable and should be generally followed), but an explicit in-plan doc-authoring task is sanctioned when documentation is central to the project's scope, provided the skill's core guidance (delta analysis, user approval of substantive content, nav sync, generated-index regeneration) is honored
- Modify: docs nav per `apps/oat-docs/AGENTS.md` conventions; regenerate `apps/oat-docs/index.md` via `oat docs generate-index`

**Step 1: Author** — pages draw on `design.md`, `tools/smoke/reports/SUMMARY.md`, and the project references; diagrams authored in mermaid. Follow `oat-project-document` guidance generally: present the page/nav delta for user approval before finalizing. (Disposition of gate finding I3: doc authoring is deliberately an explicit phase here because documentation is a core project requirement per discovery Decision #9 — user-sanctioned 2026-07-11.)

**Step 2: Verify** — `pnpm build:docs` green; generated index regenerated (not hand-edited); `pnpm lint && pnpm format`.

**Step 3: Commit** — `git add apps/oat-docs && git commit -m "docs(p06-t01): add orchestration docs and smoke runbook"`

---

### Task p06-t02: Vault closing capture pass

**Files (outside repo, per discovery decision #10):**

- Modify: `/Users/Shared/Vault/04 - Resources/Programmatic Agent Execution/Harnesses/{Codex,Cursor,Claude}.md` (smoke evidence outcomes, topology answers, selected mermaid diagrams)
- Modify: `/Users/Shared/Vault/02 - Projects/Programmatic Cursor/Change Log.md` (dated entry: IDE vs CLI smoke results)

**Step 1: Capture** — mirror per-harness outcomes + diagrams; respect each vault area's conventions (Change Log first for Programmatic Cursor).

**Step 2: Verify** — links resolve; entries dated; no repo changes in this task.

**Step 3: Record completion (machine-checkable)** — append a completion entry to `implementation.md` under this task using this template, so resume tooling can detect completion without git artifacts:

```markdown
- Vault capture complete: {ISO date}
  - Paths touched: {list of vault file paths}
  - Diagrams mirrored: {list or "none"}
  - Link spot-check: {pass|fail + notes}
```

**Step 4: Commit** — commit the `implementation.md` bookkeeping entry: `git add .oat/projects/shared/oat-project-fixture/implementation.md && git commit -m "chore(p06-t02): record vault capture completion"`

---

### Task p06-t03: Release validation

**Files:**

- Modify: five lockstep public package manifests (version bump — docs under `apps/oat-docs/docs` count as shipped functionality per repo policy)
- Modify: root `package.json` (enroll smoke unit/static tests and direct
  smoke lint/format in normal repository verification; live-provider smoke
  remains manual)
- Modify: `tools/smoke/README.md` (documents the runner as a manual/release-validation smoke, not default CI; links the docs runbook as the authoritative operating guide)
- Conditional: affected `tools/smoke/reports/<harness>/<scenario>/` packets
  when Step 2's condition fires

**Step 1: Bump, enroll, and document** — merged main establishes public package
baseline `0.1.52`; unless main advances again, bump all five lockstep packages
to `0.1.53`. Enroll the completed smoke unit/static suite and direct smoke
lint/format in the normal root commands, resolving deferred finding `p01-M2`.
Keep authenticated live-provider scenarios opt-in/manual. Author the README.

**Step 2: Post-evidence re-verification (conditional)** — PRs #135–#137 were
merged before p05 and are part of its baseline. If main later changes dispatch,
review, gate, or final-closeout behavior after p05 evidence completes, merge
main and re-run only the affected harness/scenario packets. Validate each with
`report.mjs --check` and commit refreshed evidence explicitly before release
validation.

**Step 3: Verify** — `pnpm build && pnpm test && pnpm release:validate`
Expected: all green.

**Step 4: Commit** — `git add packages tools/smoke/README.md pnpm-lock.yaml && git commit -m "chore(p06-t03): bump lockstep packages and validate release"`

---

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------ | -------- | --------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| p01    | code     | passed          | 2026-07-11 | Gate passed 0C/0I/2M/0m (`reviews/archived/p01-review-2026-07-11T200543Z.md`): M1 addressed in `af996964`; M2 deferred to final until the complete smoke surface exists.                                                                                                                                                                                                                                                                     |
| p02    | code     | passed          | 2026-07-11 | External gate passed 0C/0I/0M/2m (`reviews/archived/p02-review-2026-07-12T000418Z.md`); waived fix `c8aebc68` independently verified. Sweep: parent-relative standalone-tool imports rejected as a pragmatic convention exception; entrypoint normalization addressed in `9ba2ab03`.                                                                                                                                                         |
| p03    | code     | passed          | 2026-07-11 | Final self-review passed with 0C/0I/0M/0m (`reviews/p03-review-2026-07-12T124433Z.md`). The native Task catalog rejected the exact High-ceiling `gpt-5.6-sol-xhigh` target before launch; deliberate pre-start Cursor CLI selection preserved that exact target and the review artifact records the launcher-observed invocation. Verification: 85/85 smoke/bootstrap tests plus targeted lint/format, diff, and plan validation.            |
| p04    | code     | pending         | -          | -                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| p05    | code     | pending         | -          | -                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| p06    | code     | pending         | -          | -                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| final  | code     | pending         | -          | -                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| spec   | artifact | pending         | -          | -                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| design | artifact | pending         | -          | -                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| plan   | artifact | fixes_completed | 2026-07-11 | Round 1: reviews/artifact-plan-review-2026-07-11T165003Z.md (2I+2M, fixed; verified clean in round 2). Round 2: reviews/artifact-plan-review-2026-07-11T170953Z.md (3I+1M, all fixed: auth-readiness preflight, Codex report checks, explicit doc-authoring task w/ runbook + AGENTS.md nuance, p06-t03 conditional evidence scope). Gate maxAttempts exhausted; user decision 2026-07-11: accept with fixes recorded, no further gate runs. |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks — Fixture project template, state presets, format contract
- Phase 2: 5 tasks — Runner skeleton, preflight, provisioning, cleanup/dry-run,
  isolated closeout policy
- Phase 3: 3 tasks — Evidence collection, assertions/report, negative controls
- Phase 4: 3 tasks — Cross-harness coordinator selection contract in workflow skills
- Phase 5: 6 tasks — Harness protocols + live smoke evidence (Codex, Claude, Cursor IDE, Cursor CLI) + summary
- Phase 6: 3 tasks — OAT docs + diagrams, Vault closing pass, release validation

**Total: 23 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md` (lightweight, collaborative)
- Discovery: `discovery.md`
- Recon: `references/recon-codex-subagent-max-depth.md`, `references/recon-dispatch-schema-matrix-infrastructure.md`, `references/recon-archived-dispatch-projects.md`, `references/subagent-catalog-and-selection-findings.md`
- Dispatch draft and concurrent verification: `references/dispatching-subagents-draft.md`, `references/dispatching-subagents-{cursor,codex,claude}-draft.md`, `references/dispatching-subagents-verification.md`
- Backlog: `.oat/repo/pjm/backlog/items/BL-260711-add-live-workflow-smoke.md`
