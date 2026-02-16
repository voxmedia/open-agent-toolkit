# OAT Quick Workflow + Provider Plan Import (v1) Implementation Plan

## Summary
Add a lighter OAT lane that supports:
1. `quick` workflow: `discovery -> plan -> implement` (using existing `discovery.md` contract, skipping spec/design by default).
2. `import` workflow: ingest external provider markdown plan, store original as traceability artifact, normalize into OAT `plan.md`, then continue with existing execution/review/PR tooling.

This will be implemented with new entry skills plus targeted updates to existing downstream skills. Full workflow remains unchanged.

## Locked Product Decisions
- Imported plan becomes canonical OAT `plan.md` after normalization.
- Keep original imported markdown at `references/imported-plan.md`.
- Quick mode required artifacts: `discovery.md`, `plan.md`, `implementation.md` (spec/design optional).
- Import mode skips `discovery.md` by default.
- New entry skills (not flags on existing skills).
- v1 import supports local markdown file path input only.
- Quick/import defaults skip discovery/spec/design HiL gates; keep implementation phase checkpoints and final review behavior.
- Quick/import projects must still support review + PR generation even when spec/design are absent.
- Promote-in-place to full lifecycle is required.
- Delivery scope is skills + templates + docs (CLI command deferred).

## Public Interfaces And Contract Changes
- Add new workflow metadata fields:
- `/Users/thomas.stang/Code/open-agent-toolkit/.oat/templates/state.md`
- `oat_workflow_mode: full | quick | import`
- `oat_workflow_origin: native | quick_generated | provider_import`
- Add new plan metadata fields:
- `/Users/thomas.stang/Code/open-agent-toolkit/.oat/templates/plan.md`
- `oat_plan_source: native | quick_generated | imported`
- `oat_import_reference: string | null`
- `oat_import_source_path: string | null`
- Add new skills:
- `/Users/thomas.stang/Code/open-agent-toolkit/.agents/skills/oat-quick-start/SKILL.md`
- `/Users/thomas.stang/Code/open-agent-toolkit/.agents/skills/oat-import-plan/SKILL.md`
- `/Users/thomas.stang/Code/open-agent-toolkit/.agents/skills/oat-promote-full/SKILL.md`
- Update skill registry:
- `/Users/thomas.stang/Code/open-agent-toolkit/AGENTS.md`

## Implementation Plan

### 1. Extend Artifact Contracts
- Update `/Users/thomas.stang/Code/open-agent-toolkit/.oat/templates/state.md` with workflow mode/origin fields and comments.
- Update `/Users/thomas.stang/Code/open-agent-toolkit/.oat/templates/plan.md` with import metadata fields and `references/imported-plan.md` conventions.
- Keep full-mode defaults identical to current behavior (`oat_workflow_mode: full`).
- Document that `references/` is project-local traceability storage for imported artifacts.

### 2. Add New Entry Skills
- Implement `/Users/thomas.stang/Code/open-agent-toolkit/.agents/skills/oat-quick-start/SKILL.md`.
- Flow: resolve/new project -> run discovery conversation using existing discovery template expectations -> generate OAT-compatible `plan.md` directly -> set state to `plan complete` and ready for `oat-project-implement`.
- Ensure no spec/design hard dependency in this path.
- Implement `/Users/thomas.stang/Code/open-agent-toolkit/.agents/skills/oat-import-plan/SKILL.md`.
- Flow: create/open project -> validate local `.md` source path -> copy raw file to `references/imported-plan.md` -> normalize to OAT `plan.md` (`pNN-tNN` task IDs, verification + commit scaffolding) -> set state to `plan complete`.
- Implement `/Users/thomas.stang/Code/open-agent-toolkit/.agents/skills/oat-promote-full/SKILL.md`.
- Flow: detect quick/import project -> backfill missing `discovery/spec/design` in-place (without replacing `plan.md`) -> hand off to standard full lifecycle routing.

### 3. Make Existing Skills Mode-Aware (Minimal Changes)
- Update `/Users/thomas.stang/Code/open-agent-toolkit/.agents/skills/oat-project-review-provide/SKILL.md`.
- For `quick/import`, require `plan.md` (+ `implementation.md` when present), treat `spec/design` as optional inputs.
- Update `/Users/thomas.stang/Code/open-agent-toolkit/.agents/skills/oat-project-pr-progress/SKILL.md`.
- Update `/Users/thomas.stang/Code/open-agent-toolkit/.agents/skills/oat-project-pr-final/SKILL.md`.
- For `quick/import`, generate PR artifacts from available docs; include reduced-artifact note.
- Update `/Users/thomas.stang/Code/open-agent-toolkit/.agents/skills/oat-project-progress/SKILL.md` and `/Users/thomas.stang/Code/open-agent-toolkit/.oat/scripts/generate-oat-state.sh`.
- Respect `oat_workflow_mode` when recommending next skill and avoid suggesting skipped phases for quick/import projects.

### 4. Documentation Updates
- Update `/Users/thomas.stang/Code/open-agent-toolkit/README.md`.
- Add explicit “Quick Workflow” and “Import Provider Plan” paths under provider-agnostic/tooling + workflow sections.
- Update `/Users/thomas.stang/Code/open-agent-toolkit/docs/oat/quickstart.md`.
- Add command/skill-first examples for new entry skills and follow-on flow.
- Update `/Users/thomas.stang/Code/open-agent-toolkit/docs/oat/workflow/lifecycle.md` and `/Users/thomas.stang/Code/open-agent-toolkit/docs/oat/projects/artifacts.md`.
- Document optional spec/design in quick/import and promote-in-place path.
- Update internal references:
- `/Users/thomas.stang/Code/open-agent-toolkit/.oat/internal-project-reference/roadmap.md`
- `/Users/thomas.stang/Code/open-agent-toolkit/.oat/internal-project-reference/decision-record.md`

### 5. Validation And Guardrails
- Run `pnpm oat:validate-skills`.
- Run `pnpm lint` and `pnpm type-check` if any TS/script changes are introduced.
- Verify no regressions in existing full workflow instructions.

## Test Cases And Scenarios
1. Quick start happy path.
- Start with no active project.
- Run `oat-quick-start`.
- Confirm `discovery.md`, `plan.md`, `implementation.md` are usable and project routes to `oat-project-implement`.

2. Import happy path.
- Provide valid external markdown path.
- Run `oat-import-plan`.
- Confirm original copied to `references/imported-plan.md`.
- Confirm normalized `plan.md` contains stable task IDs and review table.

3. Import invalid path.
- Nonexistent file should hard-fail with actionable message and no partial state corruption.

4. Review/PR with missing spec/design.
- In quick/import project, run `oat-project-review-provide` and `oat-project-pr-progress`/`oat-project-pr-final`.
- Confirm success with optional artifact handling and explicit reduced-assurance note.

5. Full workflow non-regression.
- Existing `oat-project-discover -> oat-project-spec -> oat-project-design -> oat-project-plan -> oat-project-implement` behavior remains unchanged.

6. Promote-in-place.
- Start from import project, run `oat-promote-full`.
- Confirm missing artifacts are backfilled without replacing existing `plan.md` history and project remains routable.

## Assumptions And Defaults
- Default mode for `oat-project-new` remains `full`.
- Imported source format in v1 is markdown only, local path only.
- Provider-specific parsers are out of scope for v1.
- Clipboard/paste import is deferred.
- CLI command surface for quick/import bootstrap is deferred.
- Review and PR generation are allowed with fewer artifacts in quick/import mode by design.
