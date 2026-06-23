---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-06-23
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p04']
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: []
oat_plan_source: spec-driven
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: pjm-refresh

**Goal:** Restructure OAT's PJM repo-reference layer into `pjm/` plus durable
`reference/`, with date+slug IDs, file-per-record decisions, deterministic
indexes, migration tooling, and updated shipped assets.

**Architecture:** CLI commands own mechanics; skills own agent workflow
guidance; templates and bundled assets seed consumer repos.

**Tech Stack:** TypeScript ESM, Commander, YAML, Vitest, pnpm, Turborepo.

**Commit Convention:** `{type}({task-id}): {description}`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user: pause after the final
      implementation phase (`p04`) only.
- [x] Set `oat_plan_hill_phases` in frontmatter.
- [x] Enabled auto-review at HiLL checkpoints.
- [x] Evaluated phases for parallelism opportunities.
- [x] Set `oat_plan_parallel_groups` in frontmatter; fully sequential due
      overlapping CLI, asset, and test surfaces.

## Execution Controls

- Dispatch ceiling: maximum (`codex: xhigh`, `claude: opus`).
- Subagent execution: Tier 1 is authorized for phase implementer and reviewer
  dispatches.
- Plan HiLL checkpoints: pause after `p04` only.
- Auto-review at HiLL checkpoints: enabled.

## Parallelism

No parallel groups. The phases intentionally overlap shared command registry,
templates, bundled assets, skill pack manifests, and release validation.

## Phase 1: Additive Core

### Task p01-t01: Add Shared ID and Template Helpers

**Files:**

- Create: `packages/cli/src/commands/shared/slug.ts`
- Create: `packages/cli/src/commands/shared/slug.test.ts`
- Create: `packages/cli/src/commands/shared/date-id.ts`
- Create: `packages/cli/src/commands/shared/date-id.test.ts`
- Create: `packages/cli/src/commands/shared/strip-template-frontmatter.ts`
- Modify: `packages/cli/src/commands/pjm/init.ts`

**Step 1: Write test (RED)**

- Add slug tests for Unicode normalization, punctuation collapse,
  truncation, idempotent clean slugs, and empty-to-`untitled`.
- Add date tests for UTC `YYMMDD` formatting from strings and Date values.
- Add or adjust PJM init test coverage proving shared
  `stripTemplateFrontmatter` preserves non-template frontmatter and strips
  template markers.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/shared/slug.test.ts packages/cli/src/commands/shared/date-id.test.ts packages/cli/src/commands/pjm/init.test.ts`
Expected: New tests fail before helper implementation.

**Step 2: Implement (GREEN)**

- Implement pure helper modules.
- Move `stripTemplateFrontmatter` out of `pjm/init.ts` and import it from the
  shared module.

**Step 3: Refactor**

- Keep imports alias-based for cross-directory usage.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/shared/slug.test.ts packages/cli/src/commands/shared/date-id.test.ts packages/cli/src/commands/pjm/init.test.ts`
Expected: Tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/shared packages/cli/src/commands/pjm/init.ts packages/cli/src/commands/pjm/init.test.ts
git commit -m "feat(p01-t01): add deterministic PJM id helpers"
```

---

### Task p01-t02: Rewrite Backlog IDs and Harden Index Determinism

**Files:**

- Modify: `packages/cli/src/commands/backlog/shared/generate-id.ts`
- Modify: `packages/cli/src/commands/backlog/shared/generate-id.test.ts`
- Modify: `packages/cli/src/commands/backlog/index.ts`
- Modify: `packages/cli/src/commands/backlog/index.test.ts`
- Modify: `packages/cli/src/commands/backlog/regenerate-index.ts`
- Modify: `packages/cli/src/commands/backlog/regenerate-index.test.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Write test (RED)**

- Replace hash/nonce/readExisting tests with `bl-YYMMDD-slug` assertions.
- Add command tests for JSON and text output using date+slug IDs.
- Add collision tests for existing `items/<id>.md` and `archived/<id>.md`.
- Add determinism tests for two runs, shuffled readdir order, and equal
  priority/title tie-break by ID.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/backlog`
Expected: Tests fail against current hash/localeCompare behavior.

**Step 2: Implement (GREEN)**

- Replace scan/hash generation with `generateBacklogId(title, createdAt)`.
- Keep `backlog generate-id`, but update argument/help text.
- Add candidate path collision checks without full scans.
- Sort entries before reading and compare priority, title, then ID with
  locale-independent comparison.

**Step 3: Refactor**

- Remove unused YAML/frontmatter imports from ID generation.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/backlog packages/cli/src/commands/help-snapshots.test.ts`
Expected: Backlog and help tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/backlog packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(p01-t02): switch backlog ids to date slug"
```

---

### Task p01-t03: Add Decision Command Init/New/Regenerate

**Files:**

- Create: `packages/cli/src/commands/decision/shared/generate-id.ts`
- Create: `packages/cli/src/commands/decision/shared/generate-id.test.ts`
- Create: `packages/cli/src/commands/decision/init.ts`
- Create: `packages/cli/src/commands/decision/init.test.ts`
- Create: `packages/cli/src/commands/decision/regenerate-index.ts`
- Create: `packages/cli/src/commands/decision/regenerate-index.test.ts`
- Create: `packages/cli/src/commands/decision/new.ts`
- Create: `packages/cli/src/commands/decision/new.test.ts`
- Create: `packages/cli/src/commands/decision/index.ts`
- Create: `packages/cli/src/commands/decision/index.test.ts`
- Modify: `packages/cli/src/commands/index.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Write test (RED)**

- Test `dr-YYMMDD-slug` generation.
- Test decision init shell and marker pair.
- Test regenerate columns `ID | Date | Status | Title | Legacy`, empty row,
  date-desc/id tie-break sort, shuffled readdir determinism, and marker errors.
- Test `decision new` writes a record, strips template frontmatter, fails on
  collision, and regenerates the index.
- Test command registration and help snapshots.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/decision packages/cli/src/commands/help-snapshots.test.ts`
Expected: Tests fail until command group exists.

**Step 2: Implement (GREEN)**

- Add command modules with dependency injection matching existing command style.
- Default decisions root to `.oat/repo/reference/decisions`.
- Register `createDecisionCommand()`.

**Step 3: Refactor**

- Share codepoint compare helper locally or in shared module if duplication
  grows.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/decision packages/cli/src/commands/help-snapshots.test.ts`
Expected: Tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/decision packages/cli/src/commands/index.ts packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(p01-t03): add decision record command group"
```

---

### Task p01-t04: Add Decision Migration

**Files:**

- Create: `packages/cli/src/commands/decision/migrate.ts`
- Create: `packages/cli/src/commands/decision/migrate.test.ts`
- Modify: `packages/cli/src/commands/decision/index.ts`
- Modify: `packages/cli/src/commands/decision/index.test.ts`

**Step 1: Write test (RED)**

- Fixture legacy `decision-record.md` files with ADR and DR headings.
- Test dry-run writes nothing and prints mappings.
- Test apply preserves body text, writes `legacy_id`, regenerates the index,
  and refuses to delete legacy source when counts mismatch.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/decision`
Expected: Migration tests fail until implemented.

**Step 2: Implement (GREEN)**

- Parse index rows and decision sections.
- Generate IDs from each record's original date and title.
- Preserve old IDs as `legacy_id`.
- Support `--dry-run` and `--delete-legacy`.

**Step 3: Refactor**

- Keep parser helpers small and unit-testable.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/decision`
Expected: Decision tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/decision
git commit -m "feat(p01-t04): migrate legacy decision records"
```

---

### Task p01-t05: Add Templates, AGENTS Docs, PJM Init, and Doctor Core

**Files:**

- Create: `.oat/templates/decision.md`
- Create: `.oat/templates/repo-agents.md`
- Create: `.oat/templates/pjm-agents.md`
- Create: `.oat/templates/reference-agents.md`
- Modify: `.oat/templates/backlog-item.md`
- Delete: `.oat/templates/decision-record.md`
- Modify: `packages/cli/src/commands/pjm/init.ts`
- Modify: `packages/cli/src/commands/pjm/init.test.ts`
- Create: `packages/cli/src/commands/pjm/doctor.ts`
- Create: `packages/cli/src/commands/pjm/doctor.test.ts`
- Modify: `packages/cli/src/commands/pjm/index.ts`
- Modify: `packages/cli/src/commands/pjm/index.test.ts`
- Modify: `packages/cli/src/commands/doctor/index.ts`
- Modify: `packages/cli/src/commands/doctor/index.test.ts`

**Step 1: Write test (RED)**

- PJM init test expects two-layer canonical set plus three AGENTS docs.
- Doctor tests cover pass, missing canonical file fail, template frontmatter
  fail, and legacy/loose/second-roadmap warnings.
- Command tests cover `oat pjm doctor --json`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/pjm packages/cli/src/commands/doctor`
Expected: Tests fail until init/doctor are updated.

**Step 2: Implement (GREEN)**

- Update templates and PJM init.
- Add `runPjmDoctorChecks` and wire it to both `oat pjm doctor` and project
  scope `oat doctor`.

**Step 3: Refactor**

- Keep canonical path list centralized in PJM doctor/init helpers where useful.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/pjm packages/cli/src/commands/doctor`
Expected: PJM and doctor tests pass.

**Step 5: Commit**

```bash
git add .oat/templates packages/cli/src/commands/pjm packages/cli/src/commands/doctor
git commit -m "feat(p01-t05): scaffold two layer PJM reference"
```

## Phase 2: Path Move and Migration

### Task p02-t01: Move Live Backlog Defaults and Cleanup Guards to `pjm/`

**Files:**

- Modify: `packages/cli/src/commands/backlog/index.ts`
- Modify: `packages/cli/src/commands/backlog/index.test.ts`
- Modify: `packages/cli/src/commands/backlog/init.ts`
- Modify: `packages/cli/src/commands/backlog/init.test.ts`
- Modify: `packages/cli/src/commands/pjm/index.ts`
- Modify: `packages/cli/src/commands/pjm/init.ts`
- Modify: `packages/cli/src/commands/cleanup/artifacts/artifacts.ts`
- Modify: cleanup tests that encode reference-root protections.

**Step 1: Write test (RED)**

- Update default backlog root expectations to `.oat/repo/pjm/backlog`.
- Add cleanup guard tests preserving `reference/external-plans/` but moving
  active PJM guards to `pjm/`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/backlog packages/cli/src/commands/pjm packages/cli/src/commands/cleanup`
Expected: Old path expectations fail.

**Step 2: Implement (GREEN)**

- Change default root resolution and help strings.
- Keep `reference/project-summaries` and `reference/external-plans` unchanged.

**Step 3: Refactor**

- Run an `rg` sweep for active old paths in CLI source.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/backlog packages/cli/src/commands/pjm packages/cli/src/commands/cleanup`
Expected: Tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/backlog packages/cli/src/commands/pjm packages/cli/src/commands/cleanup
git commit -m "feat(p02-t01): move PJM backlog defaults"
```

---

### Task p02-t02: Add `oat pjm migrate` and Migration Prompt Asset

**Files:**

- Create: `packages/cli/src/commands/pjm/migrate.ts`
- Create: `packages/cli/src/commands/pjm/migrate.test.ts`
- Modify: `packages/cli/src/commands/pjm/index.ts`
- Modify: `packages/cli/src/commands/pjm/index.test.ts`
- Create: `packages/cli/assets/migration/pjm-restructure.md`
- Source asset from: `/Users/tstang/code/oat-audit/migration-prompt.md`

**Step 1: Write test (RED)**

- Test PJM-disabled no-op.
- Test dry-run no writes.
- Test idempotency probe.
- Test mechanical move/re-ID/split on a fixture.
- Test `--print-prompt` emits the bundled prompt.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/pjm`
Expected: Migration tests fail until implemented.

**Step 2: Implement (GREEN)**

- Add migration orchestration that delegates decision splitting to decision
  helpers where possible.
- Keep judgment actions proposed unless explicit apply flags are provided.

**Step 3: Refactor**

- Keep file operations lossless and report old-to-new mappings.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/pjm`
Expected: PJM migration tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/pjm packages/cli/assets/migration
git commit -m "feat(p02-t02): add PJM repo migration tooling"
```

---

### Task p02-t03: Register Assets and Update Pack Manifests

**Files:**

- Modify: `packages/cli/scripts/bundle-assets.sh`
- Modify: `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`
- Modify: `packages/cli/src/commands/init/tools/project-management/install-project-management.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts` if needed.
- Modify: `packages/cli/src/release/public-package-contract.ts`
- Modify: `packages/cli/src/release/public-package-contract.test.ts`
- Run bundle script to mirror changed templates/skills/assets.

**Step 1: Write test (RED)**

- PM pack tests expect `decision.md`, repo AGENTS templates, and
  `oat-pjm-decision`.
- Public package contract expects migration asset and templates.
- Bundle consistency catches missing bundle-array entries.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/init/tools packages/cli/src/release`
Expected: Tests fail until assets are registered.

**Step 2: Implement (GREEN)**

- Update asset lists.
- Run `bash packages/cli/scripts/bundle-assets.sh`.

**Step 3: Refactor**

- Confirm generated bundled assets are mirrors, not hand-authored drift.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/init/tools packages/cli/src/release`
Expected: Asset and release contract tests pass.

**Step 5: Commit**

```bash
git add packages/cli/scripts/bundle-assets.sh packages/cli/src/commands/init/tools packages/cli/src/release packages/cli/assets
git commit -m "chore(p02-t03): ship PJM restructure assets"
```

## Phase 3: Skills and Lifecycle Destinations

### Task p03-t01: Rewrite PJM Skills and Add Decision Skill

**Files:**

- Create: `.agents/skills/oat-pjm-decision/SKILL.md`
- Modify: `.agents/skills/oat-pjm-add-backlog-item/SKILL.md`
- Modify: `.agents/skills/oat-pjm-update-repo-reference/SKILL.md`
- Modify: `.agents/skills/oat-pjm-review-backlog/SKILL.md`
- Modify bundled mirrors after running bundle script.

**Step 1: Write test (RED)**

- Use validation or grep tests where available to ensure changed skills are
  bundled and frontmatter versions are present.
- Add targeted grep verification in the task notes: live PJM skills must not
  reference old active paths except legacy/migration notes.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/validation packages/cli/src/commands/init/tools`
Expected: Missing new skill/asset tests fail until registered and bundled.

**Step 2: Implement (GREEN)**

- Version bump each changed skill once.
- Rewrite paths and canonical decision flow.

**Step 3: Refactor**

- Run bundle script.

**Step 4: Verify**

Run: `rg -n "reference/(backlog|roadmap|current-state)|decision-record\\.md" .agents/skills/oat-pjm-*`
Expected: Only legacy/migration context remains.

**Step 5: Commit**

```bash
git add .agents/skills/oat-pjm-* packages/cli/assets/skills/oat-pjm-* packages/cli/scripts/bundle-assets.sh packages/cli/src/commands/init/tools
git commit -m "docs(p03-t01): update PJM skills for new reference taxonomy"
```

---

### Task p03-t02: Repoint Lifecycle Decision and Reference Paths

**Files:**

- Modify: `.agents/skills/oat-project-document/SKILL.md`
- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Audit: `.agents/skills/oat-project-summary/SKILL.md`
- Audit: `.agents/skills/oat-project-pr-final/SKILL.md`
- Modify bundled mirrors after running bundle script.

**Step 1: Write test (RED)**

- Add or update validation/grep expectations for lifecycle skill path guidance
  if a suitable test exists.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/validation`
Expected: Fails only if validation fixtures require updates.

**Step 2: Implement (GREEN)**

- Repoint document/complete read/write references to `pjm/` and
  `reference/decisions/`.
- Record in comments or artifacts that summary and pr-final do not create
  decisions today; if implementation finds otherwise, route through
  `oat decision new`.

**Step 3: Refactor**

- Version bump changed skills once.
- Run bundle script.

**Step 4: Verify**

Run: `rg -n "reference/(backlog|roadmap|current-state)|decision-record\\.md" .agents/skills/oat-project-*`
Expected: No live old-path guidance remains outside legacy/reference notes.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-* packages/cli/assets/skills/oat-project-* packages/cli/assets/skills/oat-project-complete
git commit -m "docs(p03-t02): repoint lifecycle PJM references"
```

---

### Task p03-t03: Encode Content-Skill Destinations

**Files:**

- Modify: `.agents/skills/oat-brainstorm/SKILL.md`
- Modify: `.agents/skills/oat-brainstorm/references/destinations.md`
- Modify: `.agents/skills/oat-project-import-plan/SKILL.md`
- Modify: `.agents/skills/oat-project-import-plan/scripts/find-recent-provider-plans.sh` if needed.
- Modify: `.agents/skills/deep-research/SKILL.md`
- Modify bundled mirrors after running bundle script.

**Step 1: Write test (RED)**

- Add grep or validation coverage where practical for destination strings.
- Confirm import-plan still discovers `reference/external-plans/`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/validation`
Expected: Fails only if validation fixtures require updates.

**Step 2: Implement (GREEN)**

- Brainstorm saved docs default to `reference/brainstorms/`.
- Deep research project-level default becomes `reference/research/`.
- Import-plan remains `reference/external-plans/` and cites master AGENTS.

**Step 3: Refactor**

- Version bump changed skills once.
- Run bundle script.

**Step 4: Verify**

Run: `rg -n "repo/research|reference/brainstorms|reference/research|reference/external-plans" .agents/skills/oat-brainstorm .agents/skills/deep-research .agents/skills/oat-project-import-plan`
Expected: Destinations match design.

**Step 5: Commit**

```bash
git add .agents/skills/oat-brainstorm .agents/skills/deep-research .agents/skills/oat-project-import-plan packages/cli/assets/skills
git commit -m "docs(p03-t03): document durable reference destinations"
```

## Phase 4: Polish, Docs, Release, and Cleanup

### Task p04-t01: Update Docs, Templates, and Legacy Guidance

**Files:**

- Modify: `.oat/templates/current-state.md`
- Modify: `.oat/templates/roadmap.md`
- Modify: `apps/oat-docs/docs/**` pages that teach old active PJM paths.
- Modify: bundled docs under `packages/cli/assets/docs/**` via bundle script.
- Modify: deprecated `.agents/skills/update-repo-reference/SKILL.md` and
  `.agents/skills/review-backlog/SKILL.md` with redirect notes or retirement.

**Step 1: Write test (RED)**

- Update docs snapshots or markdown validation if present.
- Add final grep checklist for old active paths.

Run: `pnpm build:docs`
Expected: Docs build catches broken links/frontmatter.

**Step 2: Implement (GREEN)**

- Update docs and templates for anti-conflict conventions and new paths.
- Keep legacy/migration mentions explicit.

**Step 3: Refactor**

- Run bundle script so asset docs match app docs.

**Step 4: Verify**

Run: `pnpm build:docs`
Expected: Docs build passes.

**Step 5: Commit**

```bash
git add .oat/templates apps/oat-docs/docs packages/cli/assets/docs .agents/skills/update-repo-reference .agents/skills/review-backlog
git commit -m "docs(p04-t01): refresh PJM reference documentation"
```

---

### Task p04-t02: Bump Public Packages and Run Full Verification

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify lockfile if package manager updates it.
- Modify bundled `public-package-versions.json` via bundle script.

**Step 1: Write test (RED)**

- Run release validation before version bump to confirm it reports expected
  lockstep requirements when applicable.

Run: `pnpm release:validate`
Expected: May fail until versions/assets are aligned.

**Step 2: Implement (GREEN)**

- Apply lockstep version bump.
- Run bundle script.

**Step 3: Refactor**

- Check `git diff` for asset-only churn and package version consistency.

**Step 4: Verify**

Run:

```bash
pnpm test
pnpm lint
pnpm type-check
pnpm build
pnpm release:validate
```

Expected: All pass, or failures are captured in `implementation.md` with exact
commands and output summaries.

**Step 5: Commit**

```bash
git add packages/*/package.json pnpm-lock.yaml packages/cli/assets
git commit -m "chore(p04-t02): bump public packages for PJM refresh"
```

---

### Task p04-t03: Final Sweep and Local Audit Cleanup

**Files:**

- Modify: `.oat/projects/shared/pjm-refresh/implementation.md`
- Modify: `.oat/projects/shared/pjm-refresh/state.md`
- Remove local non-repo audit copies:
  - `/Users/tstang/code/oat-audit`
  - `/tmp/oat-audit`

**Step 1: Write test (RED)**

- Not code-backed. Prepare shell checks for stale references and local audit
  copies.

**Step 2: Implement (GREEN)**

- Run final `rg` sweeps for old live PJM paths.
- Remove local audit copies after all needed content is committed into repo
  artifacts/assets.

**Step 3: Refactor**

- Ensure project artifacts record what was implemented and verified.

**Step 4: Verify**

Run:

```bash
test ! -e /Users/tstang/code/oat-audit
test ! -e /tmp/oat-audit
git status --short
```

Expected: Audit copies are gone and only intentional project/repo changes
remain.

**Step 5: Commit**

```bash
git add .oat/projects/shared/pjm-refresh/implementation.md .oat/projects/shared/pjm-refresh/state.md
git commit -m "chore(p04-t03): finalize PJM refresh tracking"
```

## Reviews

| Scope  | Type     | Status  | Date | Artifact |
| ------ | -------- | ------- | ---- | -------- |
| p01    | code     | pending | -    | -        |
| p02    | code     | pending | -    | -        |
| p03    | code     | pending | -    | -        |
| p04    | code     | pending | -    | -        |
| final  | code     | pending | -    | -        |
| spec   | artifact | pending | -    | -        |
| design | artifact | pending | -    | -        |
| plan   | artifact | pending | -    | -        |

## Implementation Complete

**Summary:**

- Phase 1: 5 tasks - Additive ID, decision, template, init, and doctor core.
- Phase 2: 3 tasks - Path move defaults, migration, and asset registration.
- Phase 3: 3 tasks - Skill and lifecycle destination updates.
- Phase 4: 3 tasks - Docs, release validation, version bump, and cleanup.

**Total: 14 tasks**

Ready for implementation.

## References

- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md`
- Audit bundle: `/Users/tstang/code/oat-audit/`
