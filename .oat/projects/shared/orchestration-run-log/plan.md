---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-13
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p03'] # phases to pause AFTER completing (workflow.hillCheckpointDefault=final → pause after last phase)
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: [] # sequential; see ## Parallelism
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: orchestration-run-log

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Ship a first-class, opt-in, append-only per-project log (`project-log.md`) written exclusively through a new `oat project log` CLI command group, with automatic structural appends at the v1 orchestration points (implement dispatches, gate review runs, completion) and a roll-up-before-archive contract so observations survive project sealing.

**Architecture:** A CLI append/check helper owns all artifact writes (create-on-first-append under `workflow.projectLog: auto`, taxonomy enforcement via flag validation, self-teaching `--help`); lifecycle skills call it via one-line prose instructions, `oat gate review` calls it internally from code, and `oat-project-summary`/`oat-project-complete` perform the roll-up and synthesis-warning at closeout. See `design.md` for full component design.

**Tech Stack:** TypeScript ESM (Node 22), commander CLI, vitest, bundled markdown templates, canonical skill prose under `.agents/`.

**Commit Convention:** `{type}({scope}): {description}` — e.g., `feat(p01-t01): add workflow.projectLog config keys`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user (`workflow.hillCheckpointDefault=final` → `oat_plan_hill_phases: ['p03']`)
- [x] Set `oat_plan_hill_phases` in frontmatter
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter
- [x] Phase gate review: disabled (user-selected). The `oat_phase_review_gate` key is deliberately absent — the preflight contract treats a missing key as disabled; `false` is a malformed shape.

---

## Parallelism

Sequential (`oat_plan_parallel_groups: []`). p02 and p03 both depend on p01 (the helper and template are the dependency for every integration). p02 (CLI code) and p03 (skill prose + docs + version bumps) are mostly file-disjoint, but both regenerate shared surfaces — provider sync views and `packages/cli/assets` bundling (concurrent CLI asset regeneration is a known race, tracked as `BL-260712-serialize-cli-asset-bundling`), and p03-t04 bumps `packages/cli/package.json` while p02 edits CLI source. A two-phase overlap buys little on a plan this size and risks exactly the shared-surface conflicts the wave-0 run documented; sequential is the deliberate choice, not a default.

---

## Phase 1: CLI foundation (`oat project log` + config + template)

### Task p01-t01: Add `workflow.projectLog` and `workflow.projectLogLedgerPath` config keys

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts` (schema/validation; alongside `workflow.autoArtifactReview` handling)
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/config/resolve.ts` (defaults + local > shared > user precedence live here)
- Modify: `packages/cli/src/config/resolve.test.ts`
- Modify: `packages/cli/src/commands/config/index.ts` (register both keys so `oat config get/set/list` support them)
- Modify: the config command test surface covering key registration (e.g. `packages/cli/src/commands/config/index.test.ts`)

**Step 1: Write test (RED)**

Add cases: `workflow.projectLog` accepts exactly `true | false | 'auto'` and rejects other values; default resolves to `'auto'` when unset (in `resolve.ts`, not just schema); layered precedence (local > shared > user) applies; `workflow.projectLogLedgerPath` accepts a string path and defaults to `.oat/repo/reference/project-observations.md`; `oat config get/set` round-trips both keys (registered-key catalog includes them).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/config/resolve.test.ts src/commands/config/`
Expected: New tests fail (RED)

**Step 2: Implement (GREEN)**

Add both keys to schema validation, default resolution, and the config command key registration.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/config/resolve.test.ts src/commands/config/`
Expected: Tests pass (GREEN)

**Step 3: Refactor**

Keep key validation adjacent to other `workflow.*` keys; no drive-by restructuring.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/config/ packages/cli/src/commands/config/
git commit -m "feat(p01-t01): add workflow.projectLog config keys"
```

---

### Task p01-t02: Add the bundled `project-log.md` template

**Files:**

- Create: `.oat/templates/project-log.md`
- Modify: `packages/cli/scripts/bundle-assets.sh` (explicit template copy list — new templates do not bundle automatically)
- Modify: the installer template manifest (`WORKFLOW_TEMPLATES` registration, e.g. `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`) so consuming repos receive the template
- Modify: `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts` and the workflow installer test surface (e.g. `install-workflows.test.ts`)

**Step 1: Author template**

Write the template per design (generalized from the operator's `03-run-log-template.md`): frontmatter (`oat_template_name: project-log`, `purpose: project-observations`), two-audience purpose statement, logging contract paragraph (append triggers, never-delete/strike-through convention, version-stamping, evidence-not-narrative, entries via `oat project log append` pointing at `--help`, reference-artifacts-by-path), both heading grammars, `## Entries` region, and the `## End-of-run synthesis (pending — do not skip at project completion)` section with the roll-up-before-archive note.

**Step 2: Verify token hygiene and formatting**

The template must contain NO substitution tokens except those the append command fills at creation (project name, date). Cross-check against the scaffold substitution mechanism actually used — exact-match tokens, no space-padded variants (the `{ OAT_PHASE }` lesson from `cli-scaffold-and-ergonomics-fixes`).

**Correction contract wording:** the template and the append `--help` text must state unambiguously that prior entries are NEVER edited or struck through — corrections are appended as a new judgment entry referencing the original entry and explaining the correction. (The single-writer, byte-preserving contract supersedes the exemplar's hand-maintained strike-through convention.)

**Secret-redaction rule (coordination adoption, 2026-07-14):** template contract and append `--help` both state: never record secret values (tokens, keys, signed URLs, credentials) — the log rolls up into tracked surfaces; reference secrets by name/source, never by value.

**Optional structured judgment body (coordination adoption, 2026-07-14):** the entry-format block documents that judgment entries default to 1–3 sentences but MAY use an `Observation:` / `Impact:` / `Recommendation:` three-field body for high-value entries.

Run: `pnpm exec oxfmt --check .oat/templates/project-log.md`
Expected: Template is format-clean (note: the root `pnpm format` script does NOT cover `.oat/templates/`, so check the file directly)

**Step 3: Verify bundling and installation manifests**

Run: `bash packages/cli/scripts/bundle-assets.sh && test -f packages/cli/assets/templates/project-log.md && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts src/commands/init/tools/workflows/`
Expected: Template bundles; consistency and installer tests pass with `project-log.md` in their manifests

**Step 4: Commit**

```bash
git add .oat/templates/project-log.md packages/cli/scripts/bundle-assets.sh packages/cli/src/commands/init/ packages/cli/assets/
git commit -m "feat(p01-t02): add project-log artifact template"
```

---

### Task p01-t03: Implement `oat project log append`

**Files:**

- Create: `packages/cli/src/commands/project/log/index.ts` (command registration)
- Create: `packages/cli/src/commands/project/log/append.ts`
- Create: `packages/cli/src/commands/project/log/append.test.ts`
- Modify: `packages/cli/src/commands/project/index.ts` (register `log` subgroup)

**Step 1: Write test (RED)**

Cover, per design: create-on-first-append under `auto` (template instantiated with header contract, then entry appended); plain append when the artifact exists (any config value — artifact-presence-wins); silent no-op JSON (`status: "skipped"`) under `false` with no existing artifact; taxonomy rejection for invalid `--type`/`--scope` with the allowed set in the error; **boundary validation with actionable errors naming the accepted option contract:** `--area` containing a newline or exceeding the single-line length cap is rejected; missing required flags per entry class (judgment without `--type`/`--scope`/`--area`; structural without `--producer`/`--ref`) are rejected; incompatible mixed flag sets (`--structural` combined with `--type`/`--scope`, or judgment flags combined with `--producer`/`--ref`) are rejected; judgment heading composition (`### YYYY-MM-DD · <scope> · <type> · <area>`); structural heading composition (`### YYYY-MM-DD · structural · <producer> · <ref>`) via `--structural --producer --ref`; `--body -` stdin support; `--version-note` trailing clause; append-only (prior content byte-identical after append); deterministic formatting (append twice, `oxfmt --check` passes); explicit `--project` vs. active-project resolution; error when no project resolves.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log/append.test.ts`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Implement per design Component `oat project log append`, including the self-teaching `--help` text (entry contract, log-worthiness triggers, worked-well rationale, 1–3 sentence guidance with the optional `Observation:`/`Impact:`/`Recommendation:` body for high-value entries, path-not-inline rule, secret-redaction rule). Export the append routine as a plain function so p02-t02 can call it in-process.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log/append.test.ts`
Expected: Tests pass (GREEN)

**Step 3: Refactor**

Extract heading-grammar constants (regex + composer) into a shared module within `log/` for reuse by `check` (p01-t04).

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log/`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/
git commit -m "feat(p01-t03): add oat project log append command"
```

---

### Task p01-t04: Implement `oat project log check`

**Files:**

- Create: `packages/cli/src/commands/project/log/check.ts`
- Create: `packages/cli/src/commands/project/log/check.test.ts`
- Modify: `packages/cli/src/commands/project/log/index.ts` (register the `check` subcommand; tests invoke through the registered command group)

**Step 1: Write test (RED)**

Cover the `ProjectLogCheckResult` envelope from design: `absent` status when no log; entry counts by class/type/scope; `lastEntryDate`; `synthesisPending` detection keyed on the template's synthesis-section marker (pending marker present vs. replaced by content); `--require-synthesis` exits 1 on pending, 0 otherwise; `grammarViolations` lists hand-written headings failing the grammar while valid helper-written headings pass; exit 0 for all non-`--require-synthesis` cases; **sibling-artifact scoping:** a project directory containing `oat-execution-learnings.md` (different grammar, PR #133 mechanism) produces zero violations/warnings about that file — check reads strictly `project-log.md`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log/check.test.ts`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log/check.test.ts`
Expected: Tests pass (GREEN)

**Step 3: Refactor**

Reuse the shared heading-grammar module from p01-t03.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log/`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/log/
git commit -m "feat(p01-t04): add oat project log check command"
```

---

### Task p01-t05: Implement `oat project log synthesize`

**Files:**

- Create: `packages/cli/src/commands/project/log/synthesize.ts`
- Create: `packages/cli/src/commands/project/log/synthesize.test.ts`
- Modify: `packages/cli/src/commands/project/log/index.ts` (register the `synthesize` subcommand; tests invoke through the registered command group)

**Step 1: Write test (RED)**

Cover, per design: replaces the template's pending synthesis section with `--body` content (stdin via `--body -` supported); errors when no log exists; errors when synthesis is already written; `## Entries` content is byte-identical afterward; after synthesize, `check` reports `synthesisPending: false`; output stays format-stable (`oxfmt --check` passes).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log/synthesize.test.ts`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Preserves the single-writer contract: orchestrators complete the synthesis through the CLI, never by hand-editing the artifact.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log/`
Expected: Tests pass (GREEN)

**Step 3: Refactor**

Reuse the shared synthesis-section marker constants with `check`.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/log/
git commit -m "feat(p01-t05): add oat project log synthesize command"
```

---

### Task p01-t06: Implement `oat project log rollup`

**Files:**

- Create: `packages/cli/src/commands/project/log/rollup.ts`
- Create: `packages/cli/src/commands/project/log/rollup.test.ts`
- Modify: `packages/cli/src/commands/project/log/index.ts` (register the `rollup` subcommand)

**Step 1: Write test (RED)**

Cover the `ProjectLogRollupResult` contract from design: writes/updates the `## Workflow Observations` section in an existing summary.md (errors when summary.md is absent — summary authoring stays with the skill); ledger outcomes each tested — `appended` (reference layer present), `deduplicated` (same date+area re-run, no duplicates), `skipped_permitted` (reference layer absent AND `workflow.projectLogLedgerPath` unset; `status` stays `ok`), and `failed` (key explicitly set but path unwritable → `status: 'failed'`); idempotence (re-run updates the section in place, re-dedups the ledger); `entriesRolledUp` count; `--json` envelope shape; no-op error when no log exists; rollup ignores sibling artifacts (`oat-execution-learnings.md`) entirely. **Implementation note (extension point, don't build):** keep the artifact target parameterizable at module level (no CLI flag) — a future v2 may run the same roll-up-before-archive pattern over other append-only artifacts.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log/rollup.test.ts`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

This subcommand is the executable owner of the roll-up mechanics (gate escalation resolution, option (a)): skills call it and route on its structured outcome instead of hand-implementing the ordering-critical writes.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log/`
Expected: Tests pass (GREEN)

**Step 3: Refactor**

Share entry-parsing (heading grammar module) with `check`; share ledger path resolution with config helpers.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/log/
git commit -m "feat(p01-t06): add oat project log rollup command"
```

---

## Phase 2: Scaffold and gate integration

> Merge-coordination note (both tasks): in-flight work from the `cli-scaffold-and-ergonomics-fixes` project is changing `packages/cli/src/commands/project/new/scaffold.ts` (placeholder substitution) and `packages/cli/src/commands/gate/index.ts` (stdin `'ignore'` for noninteractive gate execution, task p06-t02). Before starting each task below: rebase onto the latest base, re-read the touched file, preserve those incoming behaviors explicitly, and re-run the complete scaffold/gate suites after any conflict resolution.

### Task p02-t01: `oat project new` project-log scaffold flags and config behavior

**Files:**

- Modify: `packages/cli/src/commands/project/new/index.ts` (flag registration — the command surface lives here, not in scaffold.ts)
- Modify: `packages/cli/src/commands/project/new/index.test.ts` (flag forwarding + `--help` coverage for both flags)
- Modify: `packages/cli/src/commands/project/new/scaffold.ts` (creation behavior)
- Modify: `packages/cli/src/commands/project/new/scaffold.test.ts`

**Step 1: Write test (RED)**

Cases: `--with-project-log` creates the log from the template regardless of config; `--no-project-log` suppresses creation regardless of config; config `true` creates by default; config `auto` (default) and `false` create nothing at scaffold time; flag registration and forwarding from the command surface (`index.test.ts`: both flags appear in `--help`, both forward to scaffold). Tests must scaffold **from the real repo template** (read `.oat/templates/project-log.md`, not a fixture copy) — the divergent-fixture masking lesson.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/scaffold.test.ts src/commands/project/new/index.test.ts`
Expected: New tests fail (RED)

**Step 2: Implement (GREEN)**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/scaffold.test.ts src/commands/project/new/index.test.ts`
Expected: Tests pass (GREEN)

**Step 3: Refactor**

Route creation through the same template-instantiation code path `append` uses (single implementation of "create log from template").

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/new/
git commit -m "feat(p02-t01): add project-log scaffold flags to oat project new"
```

---

### Task p02-t02: Gate review appends its structural line on every terminal outcome

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Step 1: Write test (RED)**

The gate has multiple terminal return paths (successful verdict, blocking verdict, child failure, timeout, targeting-correlation failure, artifact-validation failure). Cases: **exactly one structural entry is appended per gate run for each terminal outcome** (producer `oat gate review`, ref = review scope, one-liner with target, threshold, findings counts when available, exit code, status, artifact path when produced — path referenced, not inlined) — test success, blocking verdict, child failure, timeout, targeting-correlation failure, and validation failure explicitly (all six); config `false` **with no existing artifact** produces no append, while config `false` **with an existing log** still receives exactly one structural entry (artifact-presence-wins — the finalizer calls the shared append routine with no gate-only config pre-check); **append failure is swallowed to a warning and does not change the gate's exit code, envelope status, or handoff fields**; under `auto` with no prior log, the run creates the log (create-on-first-append via the shared routine).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts -t 'project log'`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Implement as a **once-only finalization hook** through which every terminal return path flows (not a call bolted onto the success path), invoking the exported append function directly (no subprocess), wrapped so failures degrade to warnings.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts`
Expected: All gate tests pass (GREEN) — including the existing status/exit pinning tests, unchanged

**Step 3: Refactor**

Keep the hook adjacent to envelope finalization so future terminal paths inherit it.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/gate/
git commit -m "feat(p02-t02): append gate review structural entries to project log"
```

---

## Phase 3: Skill integrations, docs, and release bookkeeping

> Non-test-first phase: tasks 1–3 are canonical-skill prose changes validated by skill validation, format gates, and focused vitest contract tests (`review-skill-contracts.test.ts`) — not RED/GREEN-first development. This deviation from the TDD task shape is deliberate; the invariants (stable IDs, per-task verification, atomic commits) hold.

### Task p03-t01: `oat-project-implement` append points

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md` and/or its `references/*.md` (wherever dispatch, STOP/park, phase-outcome, and merge-result steps live)

**Step 1: Implement**

Add one-line append instructions at: each subagent dispatch (structural stamp referencing the implementation.md run record by path+anchor — never mirroring it), STOP/park events (triggering condition), phase outcomes (verdict + fix-loop count), parallel-group merge results. Each instruction defers entry format to `oat project log append --help`. Instructions must note the helper no-ops when the feature is off (skills never pre-check config). Bump the skill's frontmatter `version:`.

**Files (additional):**

- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts` (targeted contract assertions)

**Step 2: Verify**

Run: `pnpm oat:validate-skills && pnpm format && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: Skill validates; format passes; contract assertions pin that each named append point references `oat project log append`.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-implement/ packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "feat(p03-t01): add project-log append points to oat-project-implement"
```

---

### Task p03-t02: `oat-project-summary` roll-up step

> **Same-file coordination (PR #133):** the autonomous-execution learnings-synthesis step (from the cursor-cloud-autonomous-projects team, summary skill ≥ 1.3.0 after #133 merges) will coexist in this SKILL.md. Rebase onto the merged base before starting. Contract: keep the two summary sections distinct (`## Workflow Observations` ours, `## Autonomous Execution Learnings` theirs); exclude content already synthesized into the learnings section (one-line cross-reference instead of duplication); sequence our step explicitly relative to theirs without rewriting the surrounding prose. If version-pin contract tests exist by then (e.g. `packages/cli/src/validation/skills.test.ts`), update pins in the same commit as the version bump.

**Files:**

- Modify: `.agents/skills/oat-project-summary/SKILL.md`

**Step 1: Implement**

Add a roll-up step per design: run `oat project log check --json`; when entries exist, offer ledger graduation **before roll-up** for reusable `project`-scoped observations by invoking `oat project log append --scope general` with a body that references the original entry heading — never mutate the original or add side metadata. After summary.md is authored, run `oat project log rollup --json`; the command writes the `## Workflow Observations` section and performs the ledger append/dedup mechanically. Route on the structured `ProjectLogRollupResult` (surface `status: 'failed'` to the user; `skipped_permitted` proceeds with a note). Separately offer backlog graduation for follow-up-marked entries via `oat-pjm-add-backlog-item`. The skill never hand-implements append or roll-up writes. Honor the same-file coordination contract above. Bump the skill version.

**Files (additional):**

- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts` (targeted contract assertions)

**Step 2: Verify**

Run: `pnpm oat:validate-skills && pnpm format && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: Skill validates; format passes; contract assertions pin append-based ledger graduation before roll-up, the roll-up step's presence, and its ledger warn-and-skip rule.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-summary/ packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "feat(p03-t02): add project-log roll-up to oat-project-summary"
```

---

### Task p03-t03: `oat-project-complete` roll-up enforcement, synthesis check, and seal entry

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md`

**Step 1: Implement**

Before archive: run `oat project log check --json`. On `synthesis_pending`, surface a completion **warning** (not a block) prompting the orchestrator to complete the synthesis via `oat project log synthesize`. **Roll-up is a hard ordering gate routed on a structured CLI outcome:** when entries exist and summary's step has not already rolled up, completion runs `oat project log rollup --json` itself; it must NOT seal/archive unless the result reports `status: 'ok'` (`ledgerOutcome: 'skipped_permitted'` is `ok` and does not block; `status: 'failed'` blocks) — the archive is gitignored, so an un-rolled-up log is permanently lost. This gate overrides the skill's existing tolerance for missing/skipped summary generation whenever a project log with entries exists. Append the seal entry (completion timestamp, roll-up performed) as the final structural append before archiving. Bump the skill version.

**Files (additional):**

- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts` (targeted contract assertions)

**Step 2: Verify**

Run: `pnpm oat:validate-skills && pnpm format && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: Skill validates; format passes; contract assertions pin: the check command is named, roll-up-before-seal ordering is stated, synthesis is warn-only, and unexpected roll-up failure blocks archive.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-complete/ packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "feat(p03-t03): add project-log synthesis check and seal to oat-project-complete"
```

---

### Task p03-t04: Docs, provider sync, and lockstep version bumps

**Files:**

- Create: docs page for `oat project log` under `apps/oat-docs/docs/` (placed per `apps/oat-docs/AGENTS.md` conventions; regenerate index via `oat docs generate-index`)
- Modify: `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json` (lockstep bump)
- Modify: provider sync views via `oat sync --scope all` (generated)

**Step 1: Implement**

Author the command-group docs (append/synthesize/check flags, config keys, entry grammar, roll-up contract) as a new page under the CLI-utilities docs area (target: `apps/oat-docs/docs/cli-utilities/project-log.md`, adjusted to the docs delta check's placement guidance), and **link it from the nearest authored `## Contents` map** (`apps/oat-docs/docs/cli-utilities/index.md`) with a `.md`-suffixed link per `apps/oat-docs/AGENTS.md`. Run `oat docs nav sync` and the canonical generated-index command (`oat docs generate-index`) and confirm the derived outputs are clean. Run `oat sync --scope all` to refresh provider views for the three changed skills. Bump all five public package versions in lockstep. Regenerate bundled assets **once, after all canonical sources are final** (`bash packages/cli/scripts/bundle-assets.sh`), and stage `packages/cli/assets/` so the generated skill/template/docs assets land in this commit.

**Step 2: Verify**

Run: `oat docs nav sync && oat docs generate-index && pnpm release:validate && pnpm build:docs && git diff --quiet -- packages/cli/assets/`
Expected: Nav sync and generated index clean (new page linked from the authored `## Contents`); release validation passes (version bumps + skill version bumps recognized); docs build green; the assets-scoped `git diff --quiet` exits 0 (no unstaged regenerated assets — other task files remain unstaged until Step 3 stages and commits them)

**Step 3: Commit**

```bash
git add apps/oat-docs/ packages/*/package.json packages/cli/assets/ .claude/ .cursor/ .codex/ .oat/sync/
git commit -m "feat(p03-t04): document oat project log and bump release versions"
```

---

### Task p03-t05: End-to-end lifecycle integration test

**Files:**

- Create: `packages/cli/src/commands/project/log/lifecycle.integration.test.ts`

**Step 1: Write test (RED)**

One integration test driving the complete lifecycle in a temp repo fixture, asserting the design's hard ordering boundary end-to-end **through the executable enforcement surface** (`rollup`'s structured outcome — the path `oat-project-complete` routes on):

1. Scaffold a quick project with config `auto` → no log exists.
2. First structural append (simulating the first dispatch) → log created from the real bundled template with header contract.
3. Gate-style structural append + judgment appends land under `## Entries`; append one `project` judgment, then promote it by appending a new `general` judgment whose body references the original heading.
4. `check` reports `synthesisPending: true` in its JSON envelope (the datum complete's warning routes on; v1 skills do not use `--require-synthesis`).
5. Roll-up via `oat project log rollup --json`: `## Workflow Observations` written to summary.md; the ledger contains the promoted `general` entry but not the original project-scoped entry; ledger outcomes covered as **four cases** — `appended` (reference layer present), `deduplicated` (same date+area re-run), the explicitly-permitted `skipped_permitted` (reference layer absent, key unset; `status: 'ok'`), and the **negative case**: key explicitly set to an unwritable path → `status: 'failed'` — asserting this is the signal on which completion must refuse to seal (the archival step below is only exercised on the `ok` paths, mirroring the enforcement contract).
6. `synthesize` completes the synthesis; `check` flips `synthesisPending: false`.
7. Seal entry appended last; after archival (move to archive dir) on the `ok` path, the summary section and ledger content remain durable in the tracked tree.

The prose half of the contract (complete routes seal/archive on `rollup`'s `status`) is pinned by the p03-t03 contract-test assertions; this task proves the CLI surface those assertions depend on behaves as specified, including the failure signal.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log/lifecycle.integration.test.ts`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

No new production code expected — this task verifies the composition of p01/p02/p03 pieces; fix whatever the integration surfaces.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log/`
Expected: Tests pass (GREEN)

**Step 3: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/log/
git commit -m "test(p03-t05): add project-log end-to-end lifecycle integration test"
```

---

### Task p03-t06: (review) Harden helper-written entry serialization boundaries

**Files:**

- Modify: `packages/cli/src/commands/project/log/append.ts`
- Modify: shared project-log grammar/parser modules as required
- Modify: `packages/cli/src/commands/project/log/append.test.ts`
- Modify: `packages/cli/src/commands/project/log/check.test.ts`
- Modify: `packages/cli/src/commands/project/log/rollup.test.ts`

**Step 1: Understand the issue**

Review finding I1: helper-accepted delimiter and body/version-note values can collide with the heading and section grammar, producing entries that check rejects or roll-up omits.

**Step 2: Implement fix**

Make validation and parsing share an unambiguous serialization boundary. Reject `·` in heading fields, require `versionNote` to be single-line, enforce structural bodies as one line, and prevent judgment body lines from colliding with command-owned level-two/level-three markers. Error messages must name the violated contract.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log/append.test.ts src/commands/project/log/check.test.ts src/commands/project/log/rollup.test.ts`
Expected: delimiter, newline, and markdown-marker collision tests pass; existing project-log behavior remains green.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/log/
git commit -m "fix(p03-t06): harden project-log serialization boundaries"
```

---

### Task p03-t07: (review) Stage every summary roll-up mutation

**Files:**

- Modify: `.agents/skills/oat-project-summary/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Modify: autonomy prompt-site inventory only if the skill edit changes stable keys

**Step 1: Understand the issue**

Review finding I2: summary roll-up can mutate the configured repository ledger and append a promoted project-log entry, but the summary commit step stages only `summary.md` and optional decision records.

**Step 2: Implement fix**

Track whether Step 2.5 appended a promotion and whether roll-up returned `ledgerOutcome: "appended"`. Resolve the effective `workflow.projectLogLedgerPath`; stage `project-log.md` after promotion and the resolved ledger after append. Preserve the permitted-skip behavior and do not hand-implement writes. The skill already received its required PR-scoped version bump; do not bump it again.

**Step 3: Verify**

Run: `pnpm oat:validate-skills && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts src/validation/autonomy-gate-inventory.test.ts`
Expected: contract tests pin all mutated surfaces in the commit step and inventory remains current.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-summary/ .agents/docs/autonomy-contract.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "fix(p03-t07): stage summary roll-up mutations"
```

---

### Task p03-t08: (review) Authorize implement project-log appends

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Modify: autonomy prompt-site inventory only if the frontmatter edit changes stable keys

**Step 1: Understand the issue**

Review finding I3: the implement skill requires `oat project log append` but its declared tool contract permits only `Bash(git:*)`, so enforcing hosts can deny the required structural appends.

**Step 2: Implement fix**

Add the repository-approved `Bash(oat project log:*)` permission and pin it alongside the append-point contract. The skill already received its required PR-scoped version bump; do not bump it again.

**Step 3: Verify**

Run: `pnpm oat:validate-skills && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts src/validation/autonomy-gate-inventory.test.ts`
Expected: permission and append-point assertions pass; inventory remains current.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-implement/ .agents/docs/autonomy-contract.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "fix(p03-t08): authorize implement project-log appends"
```

---

### Task p03-t09: (review) Deduplicate first-batch ledger candidates

**Files:**

- Modify: `packages/cli/src/commands/project/log/rollup.ts`
- Modify: `packages/cli/src/commands/project/log/rollup.test.ts`

**Step 1: Understand the issue**

Review finding M1: first roll-up filters candidates only against existing ledger keys, so duplicate same-date/same-area entries in one project log are both appended.

**Step 2: Implement fix**

Build additions while updating a working key set, preserving only the first candidate for each date-plus-area key.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log/rollup.test.ts`
Expected: two same-date/same-area general entries produce one ledger entry on the initial roll-up and remain deduplicated on rerun.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/log/rollup.ts packages/cli/src/commands/project/log/rollup.test.ts
git commit -m "fix(p03-t09): deduplicate first-batch ledger entries"
```

---

### Task p03-t10: (review) Prevent project-log section-marker spoofing

**Files:**

- Modify: `packages/cli/src/commands/project/log/append.ts`
- Modify: `packages/cli/src/commands/project/log/synthesize.ts`
- Modify: `packages/cli/src/commands/project/log/append.test.ts`
- Modify: `packages/cli/src/commands/project/log/synthesize.test.ts`
- Modify: shared project-log grammar/parser modules and tests as required

**Step 1: Understand the issue**

Review finding I1: structural bodies reject newlines but can still equal command-owned `##`/`###` markers. Those accepted values can terminate entry parsing early or cause synthesis to target the spoofed body rather than the canonical synthesis section, violating append-only and byte-preservation guarantees.

**Step 2: Implement fix**

Apply the command-owned marker boundary to structural bodies as well as judgment bodies. Make synthesis locate and validate the unique canonical top-level synthesis section structurally instead of using the first matching substring, and reject synthesis content that recreates the pending marker. Preserve all existing entry bytes during synthesis.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log/append.test.ts src/commands/project/log/synthesize.test.ts src/commands/project/log/check.test.ts src/commands/project/log/rollup.test.ts`
Expected: structural bodies equal to `## Entries` or the pending-synthesis heading are rejected; synthesis preserves entry bytes, rejects marker recreation, and updates only the canonical synthesis section.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/log/
git commit -m "fix(p03-t10): prevent project-log marker spoofing"
```

---

### Task p03-t11: (review) Correct the quick-mode spec reference

**Files:**

- Modify: `.oat/projects/shared/orchestration-run-log/implementation.md`

**Step 1: Understand the issue**

Review finding m1: the implementation References section links to `spec.md`, but this quick-mode project intentionally has no spec and state correctly records it as N/A.

**Step 2: Implement fix**

Replace the broken spec link with `N/A (quick mode)` while preserving the plan and design references.

**Step 3: Verify**

Run: `pnpm format`
Expected: formatting passes and the implementation References section no longer points to a nonexistent file.

**Step 4: Commit**

```bash
git add .oat/projects/shared/orchestration-run-log/implementation.md
git commit -m "docs(p03-t11): correct quick-mode spec reference"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows as needed, but do not delete `spec`/`design`.}

| Scope  | Type     | Status          | Date       | Artifact                                                    |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------------- |
| p01    | code     | pending         | -          | -                                                           |
| p02    | code     | pending         | -          | -                                                           |
| p03    | code     | pending         | -          | -                                                           |
| final  | code     | fixes_completed | 2026-07-18 | reviews/archived/final-review-2026-07-18T122856Z.md         |
| final  | code     | passed          | 2026-07-18 | reviews/archived/final-review-2026-07-18T125009Z.md         |
| final  | code     | fixes_completed | 2026-07-18 | reviews/archived/final-review-2026-07-18T141653Z.md         |
| spec   | artifact | pending         | -          | -                                                           |
| design | artifact | pending         | -          | -                                                           |
| plan   | artifact | received        | 2026-07-13 | reviews/archived/artifact-plan-review-2026-07-14T010828Z.md |

**Plan review disposition (2026-07-13):** two review layers. (1) In-session structured-mode artifact review, 3 rounds: 2C/6I/5M → 4I/4M/1m → 1M/1m; all findings fixed. (2) Cross-runtime gate review (codex-5-6-sol-max), 2 attempts per `onFailure: block`. Attempt 1 (run a7a501f4, `reviews/archived/artifact-plan-review-2026-07-14T005456Z.md`): 1 Important + 4 Medium — all remediated (added p03-t05; gate `false`-with-artifact case; docs nav-sync/Contents requirements; append boundary-validation tests; corrections-never-strike-through contract). Attempt 2 (run in `reviews/archived/artifact-plan-review-2026-07-14T010828Z.md`): 1 residual Important — p03-t05 could not exercise the skill-owned roll-up/seal enforcement from vitest. Attempts exhausted → escalated per gate contract; **human decision 2026-07-13: option (a)** — new `oat project log rollup` subcommand (p01-t06) makes the enforcement path an executable CLI surface with a structured outcome that skills route on and p03-t05 tests directly, including the failure signal. Remediation applied to design + plan; escalation closed.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as **clean** (no residual findings at any severity; residual Medium/Minor findings keep their actual non-passed status with a disposition note until resolved)

---

## Implementation Complete

**Summary:**

- Phase 1: 6 tasks - CLI foundation (config keys, template + bundling manifests, `append`, `check`, `synthesize`, `rollup`)
- Phase 2: 2 tasks - Scaffold flags and gate-internal structural append (all terminal outcomes)
- Phase 3: 11 tasks - Skill integrations (implement/summary/complete), docs + lockstep version bumps, end-to-end lifecycle integration test, and six final-review fixes

**Total: 19 tasks**

Ready to execute the queued final-review fixes.

---

## References

- Design: `design.md` (lightweight design, operator-validated decisions)
- Discovery: `discovery.md` (13 confirmed decisions)
- Fast-follow: `.oat/repo/pjm/backlog/items/BL-260713-root-agent-judgment-logging.md`
- Operator source material: `~/Downloads/Orchestration Feedback/02-run-log-feature-request.md`, `03-run-log-template.md`, `reference/wave-0-orchestration-log.md`
