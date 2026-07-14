---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-13
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p03'] # phases to pause AFTER completing (workflow.hillCheckpointDefault=final → pause after last phase)
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

Cover, per design: create-on-first-append under `auto` (template instantiated with header contract, then entry appended); plain append when the artifact exists (any config value — artifact-presence-wins); silent no-op JSON (`status: "skipped"`) under `false`; taxonomy rejection for invalid `--type`/`--scope` with the allowed set in the error; judgment heading composition (`### YYYY-MM-DD · <scope> · <type> · <area>`); structural heading composition (`### YYYY-MM-DD · structural · <producer> · <ref>`) via `--structural --producer --ref`; `--body -` stdin support; `--version-note` trailing clause; append-only (prior content byte-identical after append); deterministic formatting (append twice, `oxfmt --check` passes); explicit `--project` vs. active-project resolution; error when no project resolves.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log/append.test.ts`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Implement per design Component `oat project log append`, including the self-teaching `--help` text (entry contract, log-worthiness triggers, worked-well rationale, 1–3 sentence guidance, path-not-inline rule). Export the append routine as a plain function so p02-t02 can call it in-process.

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

Cover the `ProjectLogCheckResult` envelope from design: `absent` status when no log; entry counts by class/type/scope; `lastEntryDate`; `synthesisPending` detection keyed on the template's synthesis-section marker (pending marker present vs. replaced by content); `--require-synthesis` exits 1 on pending, 0 otherwise; `grammarViolations` lists hand-written headings failing the grammar while valid helper-written headings pass; exit 0 for all non-`--require-synthesis` cases.

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

The gate has multiple terminal return paths (successful verdict, blocking verdict, child failure, timeout, targeting-correlation failure, artifact-validation failure). Cases: **exactly one structural entry is appended per gate run for each terminal outcome** (producer `oat gate review`, ref = review scope, one-liner with target, threshold, findings counts when available, exit code, status, artifact path when produced — path referenced, not inlined) — test success, blocking verdict, child failure, timeout, targeting-correlation failure, and validation failure explicitly (all six); config `false` produces no append; **append failure is swallowed to a warning and does not change the gate's exit code, envelope status, or handoff fields**; under `auto` with no prior log, the run creates the log (create-on-first-append via the shared routine).

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

**Files:**

- Modify: `.agents/skills/oat-project-summary/SKILL.md`

**Step 1: Implement**

Add a roll-up step per design: run `oat project log check --json`; when entries exist, write `## Workflow Observations` into summary.md (grouped by type; `general` entries flagged), append `general`/graduated entries to the ledger at `workflow.projectLogLedgerPath` (dedup by date+area; warn-and-skip when the reference layer is absent and the key unset), and offer backlog graduation for follow-up-marked entries via `oat-pjm-add-backlog-item`. Bump the skill version.

**Files (additional):**

- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts` (targeted contract assertions)

**Step 2: Verify**

Run: `pnpm oat:validate-skills && pnpm format && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: Skill validates; format passes; contract assertions pin the roll-up step's presence and its ledger warn-and-skip rule.

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

Before archive: run `oat project log check --json`. On `synthesis_pending`, surface a completion **warning** (not a block) prompting the orchestrator to complete the synthesis via `oat project log synthesize`. **Roll-up is a hard ordering gate, not a verification:** when entries exist and the roll-up has not already happened, completion runs it itself; if roll-up fails or cannot be confirmed, completion must NOT seal/archive — the archive is gitignored, so an un-rolled-up log is permanently lost. **Successful roll-up is defined as:** the summary `## Workflow Observations` section written, PLUS a ledger outcome that is any of appended / deduplicated / the explicitly permitted warn-and-skip (reference layer absent and `workflow.projectLogLedgerPath` unset). Only unexpected roll-up failures block archival — the permitted ledger skip does not. This gate overrides the skill's existing tolerance for missing/skipped summary generation whenever a project log with entries exists. Append the seal entry (completion timestamp, roll-up performed) as the final structural append before archiving. Bump the skill version.

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

Author the command-group docs (append/synthesize/check flags, config keys, entry grammar, roll-up contract). Run `oat sync --scope all` to refresh provider views for the three changed skills. Bump all five public package versions in lockstep. Regenerate bundled assets **once, after all canonical sources are final** (`bash packages/cli/scripts/bundle-assets.sh`), and stage `packages/cli/assets/` so the generated skill/template/docs assets land in this commit.

**Step 2: Verify**

Run: `pnpm release:validate && pnpm build:docs && git diff --quiet -- packages/cli/assets/`
Expected: Release validation passes (version bumps + skill version bumps recognized); docs build green; the assets-scoped `git diff --quiet` exits 0 (no unstaged regenerated assets — other task files remain unstaged until Step 3 stages and commits them)

**Step 3: Commit**

```bash
git add apps/oat-docs/ packages/*/package.json packages/cli/assets/ .claude/ .cursor/ .codex/ .oat/sync/
git commit -m "feat(p03-t04): document oat project log and bump release versions"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows as needed, but do not delete `spec`/`design`.}

| Scope  | Type     | Status          | Date       | Artifact                                       |
| ------ | -------- | --------------- | ---------- | ---------------------------------------------- |
| p01    | code     | pending         | -          | -                                              |
| p02    | code     | pending         | -          | -                                              |
| p03    | code     | pending         | -          | -                                              |
| final  | code     | pending         | -          | -                                              |
| spec   | artifact | pending         | -          | -                                              |
| design | artifact | pending         | -          | -                                              |
| plan   | artifact | fixes_completed | 2026-07-13 | structured (in-session oat-reviewer, 3 rounds) |

**Plan review disposition (2026-07-13):** structured-mode artifact review, 3 rounds (retry bound exhausted). Round 1: 2 Critical / 6 Important / 5 Medium — all fixed. Round 2: 4 Important / 4 Medium / 1 minor — all fixed. Round 3 (final): 1 Medium (assets-scoped unstaged check) + 1 minor (phase-note wording) — both fixed by applying the reviewer's fix guidance verbatim after the final round; no re-dispatch remained within the retry bound to confirm clean. No Critical/Important findings remain. The final code review at implementation covers residual confirmation.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as **clean** (no residual findings at any severity; residual Medium/Minor findings keep their actual non-passed status with a disposition note until resolved)

---

## Implementation Complete

**Summary:**

- Phase 1: 5 tasks - CLI foundation (config keys, template + bundling manifests, `append`, `check`, `synthesize`)
- Phase 2: 2 tasks - Scaffold flags and gate-internal structural append (all terminal outcomes)
- Phase 3: 4 tasks - Skill integrations (implement/summary/complete), docs, lockstep version bumps

**Total: 11 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md` (lightweight design, operator-validated decisions)
- Discovery: `discovery.md` (13 confirmed decisions)
- Fast-follow: `.oat/repo/pjm/backlog/items/BL-260713-root-agent-judgment-logging.md`
- Operator source material: `~/Downloads/Orchestration Feedback/02-run-log-feature-request.md`, `03-run-log-template.md`, `reference/wave-0-orchestration-log.md`
