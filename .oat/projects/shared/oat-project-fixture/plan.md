---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-13
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

**Architecture:** Version-controlled fixture (`tools/smoke/fixture/`, 3 phases / 5 log-append tasks, p01∥p02 + fan-in p03, two state presets) + runner script (preflight → provision → drive → collect → cleanup, manifest-based and interrupt-safe) + evidence report asserting the three-layer provenance model. See `design.md`.

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

_Operational sequence: finish every autonomous Codex, Claude, and Cursor CLI
run plus the unavailable-target negative control first. After those runs have
stabilized one source HEAD/build, prepare all distinct operator harness/scenario
worktrees from that commit; the operator may drive them concurrently in
separate terminals, subject to provider rate limits. Cursor IDE joins this
operator batch because it has no automated path. Complete collection and the
p05-t06 cross-harness summary only after every operator worktree has returned.
The affected p05 tasks remain open while their operator evidence is deferred.
Before any further live-provider run, complete defect-recovery tasks p05-t07
through p05-t10 and establish one stable source HEAD._

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

### Task p05-t02: Codex three-tier baseline smoke evidence

**Files:**

- Create: `tools/smoke/reports/codex/plan-review/`
- Create: `tools/smoke/reports/codex/legacy-three-tier/implement/`

**Step 1: Preconditions** — preflight passes for Codex; `agents.max_depth >= 2` effective; scoped writable roots per protocol doc.

**Step 2: Execute** — preserve the passing automated `plan-review` and
three-tier `implement` reports. Label the latter historical baseline evidence;
it passed all nine assertions in 38m22s (`2,302,342 ms`) while exercising three
phase coordinators, five task workers, and three phase reviewers.

**Step 3: Verify** — both reports pass their original assertion profiles:

```bash
node tools/smoke/evidence/report.mjs --check tools/smoke/reports/codex/plan-review/report.json --expect-profile plan-review
```

The historical implement packet is not rechecked with the revised profile after
p05-t12; its immutable report records the old contract and remains the timing
comparison source.

**Step 4: Commit** — `git add tools/smoke/reports/codex && git commit -m "test(p05-t02): preserve codex three-tier baseline"`

---

### Task p05-t03: Claude live smoke runs

**Status:** Deferred to post-ship operator verification.

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

**Status:** Deferred to post-ship operator verification.

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

**Status:** Deferred to post-ship operator verification.

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

**Status:** Partially complete and otherwise deferred. The unavailable-target
Codex control is committed. Cross-harness synthesis and all remaining live
controls move to post-ship operator verification and are not a project ship
gate.

**Files:**

- Create: `tools/smoke/reports/negative-controls/` (live unavailable-target preflight evidence)
- Create: `tools/smoke/reports/SUMMARY.md` (per-harness topology matrix, selection-contract observations, divergences, deferrals, defects observed)

_This task is report-only outside `tools/smoke/reports/`. If live runs surface another fixture/runner defect, record it in SUMMARY.md and `implementation.md` and add the next monotonic p05 task (e.g. `p05-t11`) with enumerated files, verification, and its own commit — do not bundle fixes into evidence commits._

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

### Task p05-t07: Bound implementation context and live fixture cost

_Monotonic defect-recovery task discovered during p05-t02. Depends on p05-t01
and must complete before retrying live implementation scenarios._

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Create: `.agents/skills/oat-project-implement/references/{dispatch-and-dry-run.md,plan-and-resume.md,phase-execution.md,completion-and-closeout.md}`
- Modify: `packages/cli/src/validation/skills.test.ts`, `packages/cli/src/commands/init/tools/shared/{post-implement-sequence-contracts.test.ts,review-skill-contracts.test.ts}`
- Modify: `tools/smoke/{CONTRACT.md,fixture/project/plan.md,evidence/assertions.mjs,evidence/assertions.test.mjs,evidence/collect.test.mjs,runner/drive.mjs,runner/drive.test.mjs,runner/preflight.mjs,runner/preflight.test.mjs,fixture/fixture-format-contract.test.mjs,fixture/fixture-integrity.test.mjs}`
- Modify: `tools/smoke/protocols/{codex.md,claude.md,cursor-ide.md,cursor-cli.md}`
- Modify: lockstep public package versions and `.oat/sync/manifest.json`

**Step 1: Contract tests (RED)** — require the implementation entry skill to
remain at most 220 lines, route into four phase-specific references, preserve
the composed behavioral contract, reduce the fixture to five tasks
(`p01:2`, `p02:2`, `p03:1`), and require exactly one final implementation gate.

**Step 2: Mechanical extraction and fixture reduction (GREEN)** — move existing
implementation workflow prose verbatim into route references; do not rewrite
behavior. Keep a small entry router that forbids preloading later routes and
limits coordinator/worker/reviewer context. Remove redundant fixture tasks
while preserving root → phase coordinator → serial task-worker nesting,
parallel p01∥p02 isolation, p03 fan-in, one self-review per phase, and one
external final code gate.

**Step 3: Verify** — `node --test tools/smoke/fixture/*.test.mjs tools/smoke/runner/*.test.mjs tools/smoke/evidence/*.test.mjs`; focused CLI skill-contract tests; workspace lint, format, type-check, and `pnpm release:validate`.

**Step 4: Commit** — `git add .agents/skills/oat-project-implement packages/cli tools/smoke .oat/sync/manifest.json && git commit -m "refactor(p05-t07): bound implementation context and smoke cost"`

---

### Task p05-t08: Deterministic orchestration contract tier

_Defect-recovery task from live-run economics feedback. Depends on p05-t07 and
blocks every further live-provider run._

**Files:**

- Create: `tools/smoke/deterministic/` (fake provider and fake gate adapters)
- Modify: `tools/smoke/runner/` and `tools/smoke/evidence/` only where needed to
  expose production journaling/evidence seams without duplicating them
- Modify: `tools/smoke/CONTRACT.md`

**Step 1: Contract tests (RED)** — one seconds-scale deterministic run must use
real provisioning ownership, locked journal updates, immutable dispatch/state
records, evidence collection, assertions, and cleanup while replacing only the
provider and gate processes. Failure injections must cover transition ordering,
child-bootstrap failure, post-acceptance failure terminality, and concurrent
manifest updates.

**Step 2: Implement (GREEN)** — add a first-class deterministic tier that drives
the five-task fixture through fake provider/coordinator/worker/gate adapters.
It must produce the same normalized evidence profile as a live `implement`
scenario and must never require provider credentials or network access.

**Step 3: Verify** — deterministic happy path and all failure injections finish
in seconds; the full smoke suite remains green.

**Step 4: Commit** — `git add tools/smoke && git commit -m "feat(p05-t08): add deterministic orchestration contract tier"`

---

### Task p05-t09: Fail-fast child execution and observable gates

_Defect-recovery task from invalid-run continuation and gate black-box
feedback. Depends on p05-t08 and blocks every further live-provider run._

**Files:**

- Modify: `.agents/skills/oat-worktree-bootstrap-auto/SKILL.md`
- Modify: `.agents/skills/oat-project-implement/references/phase-execution.md`
- Modify: `packages/cli/src/commands/gate/{index.ts,index.test.ts}`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `tools/smoke/protocols/{codex.md,claude.md,cursor-ide.md,cursor-cli.md}`
- Modify: `tools/smoke/CONTRACT.md`
- Modify: lockstep public package versions and `.oat/sync/manifest.json`

**Step 1: Contract tests (RED)** — prove that smoke child bootstrap,
registration, or fixture-readiness failure is immediately run-fatal and cannot
be downgraded; no later worker, self-review, or gate may launch. Prove that an
already accepted child/gate may be terminated only as part of invalid-run
abort, never replaced. Gate execution must emit periodic elapsed, idle, and
hard-budget telemetry.

**Step 2: Implement (GREEN)** — source preflight owns repository build/test
readiness once. Smoke child worktrees perform only containment, ownership
registration, base verification, and fixture-scoped task checks; they do not
install dependencies, build the repository, or run repository-wide tests.
Add gate heartbeat/liveness reporting without weakening the hard timeout.

**Step 3: Verify** — deterministic failure injection proves immediate abort,
zero post-failure launches, terminal no-replacement behavior, and observable
gate liveness.

**Step 4: Commit** — `git add .agents packages/cli tools/smoke .oat/sync/manifest.json && git commit -m "fix(p05-t09): fail fast and expose gate liveness"`

---

### Task p05-t10: Single-owner run metadata and report publication

_Defect-recovery task from manifest races, cleanup residue, and generated-file
policy feedback. Depends on p05-t09 and blocks every further live-provider run._

**Files:**

- Modify: `tools/smoke/runner/{journal.mjs,drive.mjs,cleanup.mjs}` and tests
- Modify: `tools/smoke/CONTRACT.md`
- Modify: repository ignore policy only where needed for `tools/smoke/.runs/`
  and `tools/smoke/reports/`

**Step 1: Contract tests (RED)** — all manifest mutations, including drive and
collection failure paths, must go through the locked journal API. Failed or
incomplete reports remain under ignored run-local staging. Only a passing,
fully bound report is atomically published to the version-controlled report
root. Cleanup must leave no unowned `.runs/` residue.

**Step 2: Implement (GREEN)** — consolidate metadata writes behind one owner,
stage evidence/report output beside the manifest, publish only after assertions
pass, and document tracked-versus-generated paths.

**Step 3: Verify** — deterministic concurrent-write, failed-collection,
interrupted-run, cleanup, and successful-publication cases all pass.

**Step 4: Commit** — `git add tools/smoke .gitignore && git commit -m "fix(p05-t10): centralize smoke metadata publication"`

---

### Task p05-t11: Restore root-owned phase-agent orchestration

_Recovery task prompted by the passing 38m22s three-tier Codex run. Depends on
p05-t10 and supersedes the mandatory coordinator → task-worker contract._

**Files:**

- Modify: `.agents/agents/oat-phase-implementer.md`
- Modify: `.agents/skills/oat-project-implement/{SKILL.md,references/*.md}`
- Modify: `.agents/skills/oat-project-dispatch-subagents/SKILL.md`
- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md`
- Modify: focused skill, review, and post-implementation contract tests
- Modify: canonical skill/agent versions, synchronized provider views, lockstep
  package versions, and `.oat/sync/manifest.json`

**Step 1: Restore the proven baseline** — use
`git show 3c244937:.agents/agents/oat-phase-implementer.md` (v1.0.3) as the
phase-agent base. Preserve its direct sequential task implementation, one commit
per task, inline between-task self-checks, phase-wide self-review, fix mode, and
compact report.

**Step 2: Layer in the hardened substrate** — add only the two-skill dispatch
load, launcher-owned dispatch records/stamps, parallel-worktree/base-mismatch
awareness, accepted-launch terminality, invalid-run abort, and guarded optional
third-tier dispatch. Optional recon/fanout/specialist children must be bounded,
at or below the phase ceiling, and recorded; they are never mandatory per task.

**Step 3: Restore root review ownership** — the root dispatches one phase
reviewer at the review ceiling, parses findings, resumes the original phase
handle in fix mode when possible, and otherwise launches at most one fresh
same-target implementer linked to the original `request_id` through existing
`continuation_events`. Delete, rather than demote, coordinator-owned review and
the mandatory per-task worker protocol.

**Step 4: Verify** — focused skill validation,
`review-skill-contracts.test.ts`, and
`post-implement-sequence-contracts.test.ts` prove direct phase writes,
root-dispatched review, continuation semantics, task commit boundaries, and
optional nested dispatch.

**Step 5: Commit** — `git add .agents packages/cli .oat/sync/manifest.json && git commit -m "refactor(p05-t11): restore root-owned phase agents"`

---

### Task p05-t12: Realign deterministic smoke producers and assertions

_Depends on p05-t11. Keeps evidence schema, collector, worktrees, bootstrap,
gates, and report publication unchanged._

**Files:**

- Modify: `tools/smoke/{CONTRACT.md,protocols/*.md}`
- Modify: `tools/smoke/deterministic/{provider.mjs,deterministic.test.mjs}`
- Modify: `tools/smoke/evidence/{assertions.mjs,assertions.test.mjs}`
- Modify: `tools/smoke/runner/{drive.mjs,drive.test.mjs}`

**Step 1: Rewrite topology producers** — deterministic and live prompts record
one accepted phase implementer and one root-owned phase reviewer per phase.
They require zero task-worker launches by default. Optional nested records are
validated when present.

**Step 2: Rewrite the implement profile** — phase launch completeness and exact
phase targets replace mandatory per-task launch assertions. Continue proving
all five tasks through exact bounded commits and fixture markers. Preserve
parallel isolation, fan-in, final gate corroboration, runtime identity, and
accepted-launch terminality controls.

**Step 3: Verify** — deterministic happy path and every failure injection pass
in seconds; full fixture/runner/evidence suites remain green.

**Step 4: Commit** — `git add tools/smoke && git commit -m "refactor(p05-t12): align smoke evidence with phase agents"`

---

### Task p05-t13: Validate the restored topology with one live Codex run

_Depends on p05-t12. This is the only remaining automated live-provider ship
gate._

**Files:**

- Create: `tools/smoke/reports/codex/implement/`
- Modify: project implementation history with measured comparison

**Step 1: Execute** —
`node tools/smoke/runner/run-smoke.mjs --harness codex --scenario implement`.

**Step 2: Verify** — the revised implement profile passes; the report contains
three phase-implementer launches, three root-owned phase-reviewer launches, five
bounded task commits, p01∥p02 worktree isolation, p03 fan-in, and one final
gate. Record elapsed time and launch-count comparison against 38m22s.

**Step 3: Commit** — `git add tools/smoke/reports/codex .oat/projects/shared/oat-project-fixture/implementation.md && git commit -m "test(p05-t13): validate restored codex phase topology"`

---

### Task p05-t14: Harden local smoke build readiness

_Recovery task discovered when the first live retry could not execute the local
CLI build._

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `tools/smoke/runner/{preflight.mjs,preflight.test.mjs}`

**Step 1: Reproduce** — prove that a removed `dist/` plus a retained incremental
build cache can leave `dist/index.js` absent, and that a non-executable local
entrypoint fails smoke preflight.

**Step 2: Fix** — remove `tsconfig.tsbuildinfo` during clean, make the built
entrypoint executable, and surface the underlying local probe error in the
readiness report.

**Step 3: Verify** — run focused preflight tests and clean-build the CLI.

**Step 4: Commit** — `fix(p05-t14): harden local smoke build readiness`

---

### Task p05-t15: Normalize live review project paths

_Recovery task discovered after the first restored-topology provider workflow
completed but report collection rejected absolute review frontmatter._

**Files:**

- Modify: `tools/smoke/evidence/{collect.mjs,collect.test.mjs}`

**Step 1: Contract test** — accept an absolute `oat_project` only when it
resolves to the provisioned fixture project, normalize it relative to the
canonical worktree, and reject external absolute paths.

**Step 2: Implement and verify** — normalize every collected review before
gate corroboration; run focused collector tests.

**Step 3: Commit** — `fix(p05-t15): normalize live review project paths`

---

### Task p05-t16: Close live smoke follow-up gaps

_Recovery task discovered while starting the confirmation run._

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `tools/smoke/runner/{drive.mjs,drive.test.mjs}`

**Step 1: Keep builds fresh** — touch the executable entrypoint after every
successful direct CLI build so a non-CLI source commit can still be marked by a
fresh local build.

**Step 2: Remove stale topology wording** — generated scenario instructions
must say `root-owned phase review`, never `coordinator-owned self-review`.

**Step 3: Verify** — prove the entrypoint mtime advances, remains executable,
and the drive suite rejects stale wording.

**Step 4: Commit** — `fix(p05-t16): close live smoke follow-up gaps`

---

### Task p05-t17: Require terminal dispatch evidence

_Recovery task discovered when a confirmation gate correctly blocked immutable
p01/p02 records that had been published with `outcome: running`._

**Files:**

- Modify: `tools/smoke/CONTRACT.md`
- Modify: `tools/smoke/evidence/{record.mjs,record.test.mjs}`
- Modify: `tools/smoke/protocols/*.md`
- Modify: `tools/smoke/runner/drive.test.mjs`

**Step 1: Fail closed** — reject `running` as an immutable dispatch outcome.
Pre-start rejection is terminal; an accepted launch is published exactly once,
after its handle returns `completed` or `failed`.

**Step 2: Align every producer prompt** — retain launcher-owned selection and
acceptance facts before launch, but defer immutable publication until terminal
outcome is known.

**Step 3: Verify** — focused record/drive tests and the complete smoke suite
pass.

**Step 4: Commit** — `fix(p05-t17): require terminal dispatch evidence`

---

### Task p05-t18: Bind smoke-safe init to the child worktree

_Recovery task discovered when a fresh confirmation correctly aborted before
dispatch because the child init script was invoked from the outer worktree._

**Files:**

- Modify: `.agents/skills/oat-worktree-bootstrap-auto/SKILL.md`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `tools/smoke/{CONTRACT.md,protocols/codex.md}`
- Modify: `tools/smoke/runner/drive.test.mjs`

**Step 1: Make the containment boundary executable** — require the child
worktree itself as process cwd, using the equivalent of
`(cd "$CHILD_WORKTREE" && bash scripts/worktree/init.sh)`. An absolute child
script path from the outer cwd remains an invalid-run abort.

**Step 2: Synchronize and verify** — bump the canonical bootstrap skill, refresh
provider views, and require the exact cwd-bound launch shape in skill and drive
contract tests.

**Step 3: Commit** — `fix(p05-t18): bind smoke init to child worktree`

---

### Task p05-t19: Isolate disposable fixture commits from unavailable hooks

_Recovery task discovered when a valid smoke child reached its first task
commit without the dependency install intentionally excluded by smoke mode._

**Files:**

- Modify: `.agents/agents/oat-phase-implementer.md`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `tools/smoke/{CONTRACT.md,protocols/codex.md}`
- Modify: `tools/smoke/runner/drive.test.mjs`

**Step 1: Preserve the no-install boundary** — in a smoke child only, create
fixture task commits with
`git -c core.hooksPath=/dev/null commit ...`. Do not install dependencies,
mutate Git config, or use `--no-verify`.

**Step 2: Verify** — require the exact invocation-scoped commit shape in the
phase-agent and Codex drive contracts; run focused skill and drive tests.

**Step 3: Commit** — `fix(p05-t19): isolate smoke fixture commits`

---

### Task p05-t20: (review) Make canonical report binding formatter-stable

_Review finding C1. Depends on p05-t13._

**Files:**

- Modify: smoke collection/report publication code and focused tests
- Modify: tracked canonical `codex/{implement,plan-review}` report packets
- Modify: root verification enrollment when needed to check every canonical
  packet after formatting

**Step 1: Reproduce** — prove a formatter pass can change tracked
`bundle.json` bytes after `report.json` records its SHA-256. Keep the report
binding byte-exact; do not weaken it to semantic JSON equality.

**Step 2: Fix** — make staged publication format the bundle before report
generation, or otherwise guarantee the report hashes the exact bytes that are
published and committed. Rebind both positive canonical Codex packets.

**Step 3: Guard** — add a repository test that discovers every tracked
canonical packet and runs its exact `report.mjs --check` profile after normal
formatting.

**Step 4: Verify** — both Codex positive packet checks and the unavailable-target
control pass from the staged image.

**Step 5: Commit** — `fix(p05-t20): stabilize canonical smoke report binding`

---

### Task p05-t21: (review) Prove direct-root phase reviewer ownership

_Review finding I1. Depends on p05-t20._

**Files:**

- Modify: `tools/smoke/CONTRACT.md`
- Modify: dispatch record writer, collector, deterministic/live producers, and
  focused evidence tests
- Rebind: retained canonical Codex implement evidence with an explicit
  schema-v1 ownership limitation

**Step 1: Extend evidence** — preserve launcher/parent ownership in the
launcher-owned dispatch projection. Root-launched phase implementers and phase
reviewers must carry direct project-root parentage; optional nested launches
must identify their phase-agent parent.

**Step 2: Assert** — fail the implement profile when a phase reviewer is owned
by a phase agent, when ownership is missing, or when parent linkage conflicts
with scope. Add a negative test for phase-agent-owned review.

**Step 3: Produce** — update deterministic and live protocols to publish the
new immutable ownership field from the launcher, never infer it from child
self-report.

**Step 4: Verify** — deterministic happy/failure paths pass. The retained
schema-v1 packet may remain historical evidence, but it does not satisfy the
new direct-root ownership acceptance criterion; p05-t24 closes that live gap.

**Step 5: Commit** — `fix(p05-t21): prove root-owned phase reviews`

---

### Task p05-t22: (review) Align the normative smoke assertion contract

_Review finding I2. Depends on p05-t21._

**Files:**

- Modify: `tools/smoke/CONTRACT.md`
- Modify or create: focused static cross-contract test

**Step 1: Correct the contract** — replace the superseded nine-task,
task-worker assertion language with the five-task fixture, one phase
implementer and one direct-root reviewer per phase, and optional validated
nested launches.

**Step 2: Prevent recurrence** — statically bind task counts and topology
language to `EXPECTED_TASK_IDS` and executable assertion descriptions.

**Step 3: Verify** — focused contract tests and the complete smoke suite pass.

**Step 4: Commit** — `fix(p05-t22): align smoke assertion contract`

---

### Task p05-t23: (review) Format and enroll smoke coverage

_Review finding m1. Depends on p05-t22._

**Files:**

- Modify: `tools/smoke/evidence/collect.test.mjs`
- Modify: `package.json`

**Step 1: Format** — apply the repository formatter without changing behavior.

**Step 2: Enroll** — make the root `pnpm test` path run every smoke test,
including the nested preset test and canonical packet guard.

**Step 3: Verify** — `pnpm test:smoke`, `pnpm format`, and the root
`pnpm test` path all include the smoke surface.

**Step 4: Commit** — `test(p05-t23): enroll formatted smoke coverage`

---

### Task p05-t24: (review recovery) Publish schema-v2 live ownership evidence

_Closes the unfulfilled live portion of review finding I1._

**Files:**

- Modify: review-path normalization and focused collector tests
- Modify: canonical Codex implement packet and live-validation reference

**Step 1: Fix live collection** — accept absolute `oat_project` paths only when
they resolve to the fixture project in the canonical worktree or a
manifest-registered child worktree. Normalize either to the canonical
repo-relative project path and continue rejecting external paths.

**Step 2: Guard acceptance** — require the active canonical Codex implement
packet to use schema-v2 dispatches and report direct-root ownership as proven.
Historical schema-v1 packets remain readable but cannot satisfy this active
acceptance guard.

**Step 3: Execute** — run one fresh Codex implement scenario from a clean local
build with the repository smoke shim first on `PATH`.

**Step 4: Verify and publish** — require 9/9 assertions, six schema-v2 direct
root child records, five task commits, parallel isolation, fan-in, and one
passing final gate. Clean retained run resources after publication.

**Step 5: Commit** — `fix(p05-t24): publish schema-v2 ownership evidence`

---

## Phase 6: Documentation, Vault Capture & Release

_Sequential; depends on p05._

### Task p06-t01: OAT docs — orchestration/subagents/programmatic execution + smoke runbook

**Files:**

- Merge: documentation commit `fe29809c` from branch
  `oat-project-fixture-2`
- Revise: orchestration model, implementation execution, review flavors,
  dispatch/provider guidance, evidence layers, and smoke runbook for root-owned
  phase implementation and review
- Modify: `apps/oat-docs/AGENTS.md` — refine the project-docs rule from hard prohibition to guidance: `oat-project-document` is the default end-of-project documentation flow (its guidance is valuable and should be generally followed), but an explicit in-plan doc-authoring task is sanctioned when documentation is central to the project's scope, provided the skill's core guidance (delta analysis, user approval of substantive content, nav sync, generated-index regeneration) is honored
- Preserve: `programmatic-execution.md`, the AGENTS rule softening, and completed
  navigation entries unless topology alignment requires a focused correction
- Regenerate: `apps/oat-docs/index.md` via `oat docs generate-index`; never
  hand-edit it

**Step 1: Merge and align** — merge the validated sibling docs commit, then
replace mandatory coordinator → worker language with the restored default
topology. Document optional third-tier dispatch, root-owned review, unchanged
selection/evidence/gate substrate, and post-ship operator protocols.

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

### Task p06-t04: Revalidate release after Phase 5 review fixes

_Depends on p05-t20 through p05-t23._

**Files:**

- Modify: project tracking and canonical evidence references
- Conditional: lockstep public package versions and generated provider views
  when shipped sources changed after `0.1.58`

**Step 1: Reconcile** — update affected docs/evidence references and apply any
required lockstep public-package or skill version bumps for the review fixes.

**Step 2: Verify** — run canonical report checks, direct smoke
lint/format/tests, `pnpm build`, `pnpm build:docs`, `pnpm lint`, `pnpm format`,
`pnpm type-check`, `pnpm test`, and `pnpm release:validate`.

**Step 3: Record** — mark the Phase 5 re-review, Phase 6, and final review rows
passed only after independent re-review confirms no unresolved findings.

**Step 4: Commit** — `chore(p06-t04): revalidate release after review fixes`

---

### Task p06-t05: Final validation after schema-v2 evidence

_Depends on p05-t24._

**Step 1: Verify** — run canonical packet checks, smoke tests/format/lint,
workspace build/test/type checks, docs build, and `pnpm release:validate`.

**Step 2: Review** — independently review the p05-t24 fix range, then run the
final project review.

**Step 3: Record** — mark p05, p06, and final passed only after both reviews and
all validation succeed.

**Step 4: Commit** — `chore(p06-t05): finalize schema-v2 release evidence`

---

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------ | -------- | --------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| p01    | code     | passed          | 2026-07-11 | Gate passed 0C/0I/2M/0m (`reviews/archived/p01-review-2026-07-11T200543Z.md`): M1 addressed in `af996964`; M2 deferred to final until the complete smoke surface exists.                                                                                                                                                                                                                                                                     |
| p02    | code     | passed          | 2026-07-11 | External gate passed 0C/0I/0M/2m (`reviews/archived/p02-review-2026-07-12T000418Z.md`); waived fix `c8aebc68` independently verified. Sweep: parent-relative standalone-tool imports rejected as a pragmatic convention exception; entrypoint normalization addressed in `9ba2ab03`.                                                                                                                                                         |
| p03    | code     | passed          | 2026-07-11 | Final self-review passed with 0C/0I/0M/0m (`reviews/p03-review-2026-07-12T124433Z.md`). The native Task catalog rejected the exact High-ceiling `gpt-5.6-sol-xhigh` target before launch; deliberate pre-start Cursor CLI selection preserved that exact target and the review artifact records the launcher-observed invocation. Verification: 85/85 smoke/bootstrap tests plus targeted lint/format, diff, and plan validation.            |
| p04    | code     | passed          | 2026-07-12 | Final configured re-review passed 0C/0I/0M/0m (`reviews/p04-review-2026-07-12T140718Z.md`). All four prior review rounds are resolved. The reviewer verified immutable reviewer-envelope capture/comparison, coordinator-owned route selection, planning inheritance, native-first and accepted-handle constraints, ordered evidence and gate separation, provider sync/version policy, and PR #135/#137 regressions.                        |
| p05    | code     | fixes_added     | 2026-07-13 | The p05-t20–p05-t23 fix-range review passed, but its accepted schema-v1 limitation does not satisfy I1's requested live direct-root proof. p05-t24 adds registered-child review-path normalization and a fresh schema-v2 canonical packet.                                                                                                                                                                                                   |
| p06    | code     | pending         | 2026-07-13 | p06-t04 passed against the schema-v1 packet; p06-t05 revalidates the final schema-v2 image.                                                                                                                                                                                                                                                                                                                                                  |
| final  | code     | pending         | 2026-07-13 | Run after p05-t24 fix-range review and p06-t05 validation.                                                                                                                                                                                                                                                                                                                                                                                   |
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
- Phase 5: 24 tasks — Harness protocols, deterministic/fail-fast recovery,
  report publication, phase-agent restoration, terminal evidence hardening, and
  bounded live smoke evidence plus independent-review recovery
- Phase 6: 5 tasks — OAT docs + diagrams, Vault closing pass, release validation,
  and schema-v2 final revalidation

**Total: 43 tasks**

Schema-v2 live evidence and final validation remain.

---

## References

- Design: `design.md` (lightweight, collaborative)
- Discovery: `discovery.md`
- Recon: `references/recon-codex-subagent-max-depth.md`, `references/recon-dispatch-schema-matrix-infrastructure.md`, `references/recon-archived-dispatch-projects.md`, `references/subagent-catalog-and-selection-findings.md`
- Dispatch draft and concurrent verification: `references/dispatching-subagents-draft.md`, `references/dispatching-subagents-{cursor,codex,claude}-draft.md`, `references/dispatching-subagents-verification.md`
- Backlog: `.oat/repo/pjm/backlog/items/BL-260711-add-live-workflow-smoke.md`
