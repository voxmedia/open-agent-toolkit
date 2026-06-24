---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-06-23
oat_current_task_id: null
oat_generated: false
---

# Implementation: pjm-refresh

**Started:** 2026-06-23
**Last Updated:** 2026-06-23

## Progress Overview

| Phase   | Status    | Tasks | Completed |
| ------- | --------- | ----- | --------- |
| Phase 1 | completed | 5     | 5/5       |
| Phase 2 | completed | 3     | 3/3       |
| Phase 3 | completed | 3     | 3/3       |
| Phase 4 | completed | 4     | 4/4       |

**Total:** 15/15 tasks completed

## Phase 1: Additive Core

**Status:** completed
**Started:** 2026-06-23

### Phase Summary

Completed additive core support for deterministic decision records, legacy
decision migration, two-layer PJM initialization, and PJM doctor checks.

### Task p01-t01: Add Shared ID and Template Helpers

**Status:** completed
**Commit:** 3ade17eb

**Outcome:**

- Added deterministic shared helpers for slug generation, UTC date prefixes,
  and template-frontmatter stripping.
- Updated PJM init to use the shared template-frontmatter stripping helper.

**Files changed:**

- `packages/cli/src/commands/shared/slug.ts` - deterministic ASCII slug helper.
- `packages/cli/src/commands/shared/slug.test.ts` - slug behavior coverage.
- `packages/cli/src/commands/shared/date-id.ts` - UTC `YYMMDD` helper.
- `packages/cli/src/commands/shared/date-id.test.ts` - date formatting coverage.
- `packages/cli/src/commands/shared/strip-template-frontmatter.ts` - shared
  template frontmatter stripping.
- `packages/cli/src/commands/shared/strip-template-frontmatter.test.ts` -
  frontmatter stripping coverage.
- `packages/cli/src/commands/pjm/init.ts` - imports the shared stripper.

**Verification:**

- Run:
  `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/slug.test.ts src/commands/shared/date-id.test.ts src/commands/shared/strip-template-frontmatter.test.ts src/commands/pjm/init.test.ts`
- Result: passed, 4 files, 23 tests.

**Notes / Decisions:**

- The first RED test run used package-relative Vitest paths and failed because
  the helper modules did not exist yet.
- `slugify` uses NFKD normalization, strips combining marks, lowercases, trims
  separators, truncates to 48 characters, and falls back to `untitled`.
- `yymmdd` uses UTC accessors to avoid local timezone drift.

---

### Task p01-t02: Rewrite Backlog IDs and Harden Index Determinism

**Status:** completed
**Commit:** 9c945de9

**Outcome:**

- Replaced hash-and-scan backlog IDs with allocator-free
  `bl-YYMMDD-slug` generation.
- Updated `oat backlog generate-id` to check item and archived filenames for
  direct collisions and report a disambiguation error instead of probing
  sequential candidates.
- Made backlog index regeneration deterministic by sorting directory entries
  before reading and using direct string comparisons with ID tie-breaks.

**Files changed:**

- `packages/cli/src/commands/backlog/shared/generate-id.ts` - date+slug
  backlog ID generation.
- `packages/cli/src/commands/backlog/shared/generate-id.test.ts` - UTC,
  slug, and determinism coverage.
- `packages/cli/src/commands/backlog/index.ts` - command contract and
  collision checks.
- `packages/cli/src/commands/backlog/index.test.ts` - CLI JSON/text and
  collision coverage.
- `packages/cli/src/commands/backlog/regenerate-index.ts` - stable filename
  and row sort ordering.
- `packages/cli/src/commands/backlog/regenerate-index.test.ts` - repeated
  regeneration and ID tie-break coverage.
- `packages/cli/src/commands/backlog/regenerate-index.readdir-order.test.ts` -
  shuffled readdir determinism coverage.

**Verification:**

- Run:
  `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/backlog`
- Result: passed, 5 files, 22 tests.
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: passed.

**Notes / Decisions:**

- A direct filename collision is now a user-facing ambiguity rather than an
  allocator responsibility. This preserves the two-machine/no-scan design while
  still warning when a same-day same-slug item already exists.

---

### Task p01-t03: Add Decision Command Init/New/Regenerate

**Status:** completed
**Commit:** 8af3c8ea

**Outcome:**

- Added `oat decision` with `init`, `new`, and `regenerate` subcommands.
- Added deterministic `dr-YYMMDD-slug` decision ID generation.
- Added file-per-record decision creation from `decision.md` templates and
  deterministic decision index regeneration.
- Registered the command group and updated command help snapshots.

**Files changed:**

- `packages/cli/src/commands/decision/shared/generate-id.ts` - decision ID
  helper.
- `packages/cli/src/commands/decision/init.ts` - decision index scaffold.
- `packages/cli/src/commands/decision/regenerate-index.ts` - managed decision
  index regeneration.
- `packages/cli/src/commands/decision/new.ts` - file-per-record creation.
- `packages/cli/src/commands/decision/index.ts` - command group.
- `packages/cli/src/commands/index.ts` - root command registration.
- `packages/cli/src/commands/help-snapshots.test.ts` - command help coverage.
- Matching `*.test.ts` files under `packages/cli/src/commands/decision/`.

**Verification:**

- Run:
  `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/decision src/commands/help-snapshots.test.ts`
- Result: passed, 6 files, 63 tests.
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: passed.

**Notes / Decisions:**

- The plan's repo-root Vitest path form found no files under the CLI package
  filter, matching the earlier p01-t01 note. Verification used package-relative
  paths.

---

### Task p01-t04: Add Decision Migration

**Status:** completed
**Commit:** 7215f93e

**Outcome:**

- Added `oat decision migrate` with dry-run, apply, and guarded
  `--delete-legacy` behavior.
- Parsed legacy ADR/DR sections from `decision-record.md`, preserved body text,
  generated new decision IDs from original date/title, and wrote `legacy_id`.
- Regenerated the decision index after migration and printed old-to-new
  mappings.

**Files changed:**

- `packages/cli/src/commands/decision/migrate.ts` - legacy migration parser and
  apply flow.
- `packages/cli/src/commands/decision/migrate.test.ts` - migration safety
  coverage.
- `packages/cli/src/commands/decision/index.ts` - `migrate` subcommand.
- `packages/cli/src/commands/decision/index.test.ts` - command wiring and
  mapping output coverage.
- `packages/cli/src/commands/help-snapshots.test.ts` - updated `decision`
  command help for the new subcommand.

**Verification:**

- Run:
  `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/decision src/commands/help-snapshots.test.ts`
- Result: passed, 7 files, 67 tests.
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: passed.

---

### Task p01-t05: Add Templates, AGENTS Docs, PJM Init, and Doctor Core

**Status:** completed
**Commit:** 5b4c935d

**Outcome:**

- Added `decision.md` and three PJM AGENTS templates, updated backlog item ID
  placeholder, and removed the legacy `decision-record.md` template.
- Updated `oat pjm init` to scaffold `.oat/repo` with `pjm/`,
  `reference/decisions/`, and three AGENTS guides.
- Added `runPjmDoctorChecks`, exposed `oat pjm doctor`, and shared the checks
  with project-scope `oat doctor` when `.oat/repo` exists.

**Files changed:**

- `.oat/templates/*` - decision, AGENTS, backlog, and legacy template updates.
- `packages/cli/src/commands/pjm/init.ts` - two-layer scaffold initialization.
- `packages/cli/src/commands/pjm/doctor.ts` - PJM doctor checks.
- `packages/cli/src/commands/pjm/index.ts` - `init` root update and
  `doctor` subcommand.
- `packages/cli/src/commands/doctor/index.ts` - project-scope PJM doctor
  integration.
- Matching PJM and doctor tests.

**Verification:**

- Run:
  `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm src/commands/doctor`
- Result: passed, 4 files, 31 tests.
- Run:
  `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/decision src/commands/pjm src/commands/doctor src/commands/help-snapshots.test.ts`
- Result: passed, 11 files, 98 tests.
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: passed.
- Run:
  `pnpm --filter @open-agent-toolkit/cli exec oxlint src/commands/pjm src/commands/doctor src/commands/decision`
- Result: passed.

### p01 Review Fix: Bundle P01 Templates

**Status:** completed
**Commit:** e3916914

**Outcome:**

- Updated the CLI asset bundler to copy the current p01 template set by
  replacing deleted `decision-record.md` with `decision.md`,
  `repo-agents.md`, `pjm-agents.md`, and `reference-agents.md`.
- Added focused bundle consistency coverage that rejects missing template
  entries and verifies the p01 template additions remain in the bundler.
- Ran the bundle script so local `packages/cli/assets/templates/` mirrors the
  current p01 template copy set. The assets directory is ignored, so this
  produced no tracked asset diff.

**Files changed:**

- `packages/cli/scripts/bundle-assets.sh` - copied p01 template list.
- `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts` -
  focused template consistency coverage.

**Verification:**

- Run: `bash packages/cli/scripts/bundle-assets.sh`
- Result: passed.
- Run:
  `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts`
- Result: passed, 1 file, 15 tests.
- Run:
  `pnpm run cli -- project status --project-path .oat/projects/shared/pjm-refresh --field project.phase`
- Result: passed, returned `implement`.
- Run: `bash -n packages/cli/scripts/bundle-assets.sh`
- Result: passed.
- Run:
  `pnpm --filter @open-agent-toolkit/cli exec oxlint src/commands/init/tools/shared/bundle-consistency.test.ts`
- Result: passed, 0 warnings and 0 errors.

## Phase 2: Path Move and Migration

**Status:** completed
**Started:** 2026-06-23

### Phase Summary

Moved the live PJM working layer to `.oat/repo/pjm/` while preserving durable
`reference/` destinations, added the `oat pjm migrate` repo-restructure command
with a bundled migration prompt asset, and registered the new assets and pack
manifest entries with matching release-contract coverage.

- **Outcome:** Backlog defaults and cleanup guards now target `pjm/`;
  `reference/external-plans` and `reference/project-summaries` remain protected.
  `oat pjm migrate` performs safe, idempotent, lossless restructuring with
  `--dry-run`, `--print-prompt`, and `legacy_id` preservation. Bundle script,
  PM skill manifest, and the public-package contract include the new assets.
- **Key files:** `packages/cli/src/commands/backlog/index.ts`,
  `packages/cli/src/commands/cleanup/artifacts/artifacts.ts`,
  `packages/cli/src/commands/pjm/migrate.ts`,
  `packages/cli/assets/migration/pjm-restructure.md`,
  `packages/cli/scripts/bundle-assets.sh`,
  `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`,
  `packages/cli/src/release/public-package-contract.ts`.
- **Verification:** Focused Vitest across `backlog`, `pjm`, `cleanup`,
  `init/tools`, and `release` (302 passed) plus CLI type-check; p02 code review
  passed with 0 Critical / 0 Important findings.
- **Notable decisions:** `oat-pjm-decision` manifest registration deferred to
  p03-t01 (see Deviations). The force-tracked migration asset under the
  otherwise-gitignored `assets/` directory is intentional and self-preserving
  via the bundle script's temp-copy step.

### Task p02-t01: Move Live Backlog Defaults and Cleanup Guards to `pjm/`

**Status:** completed
**Commit:** 82a7b044

**Outcome:**

- Moved the default backlog root to `.oat/repo/pjm/backlog` and updated help
  strings and command contracts.
- Updated cleanup reference-guard scanning to cover the active `pjm/` layer
  while preserving `reference/external-plans/` and `reference/project-summaries`.

**Files changed:**

- `packages/cli/src/commands/backlog/index.ts` and `index.test.ts` - default
  root resolution and coverage.
- `packages/cli/src/commands/cleanup/artifacts/artifacts.ts` - reference-guard
  scope move to `pjm/`.
- `packages/cli/src/commands/cleanup/artifacts/reference-guards.test.ts`,
  `cleanup/cleanup.integration.test.ts`, `help-snapshots.test.ts` - updated
  expectations.

---

### Task p02-t02: Add `oat pjm migrate` and Migration Prompt Asset

**Status:** completed
**Commit:** e0db9539

**Outcome:**

- Added `oat pjm migrate` with PJM-disabled no-op, `--dry-run`, idempotency
  probe, mechanical move/re-ID/split, and `--print-prompt`.
- Bundled the restructure migration prompt asset.

**Files changed:**

- `packages/cli/src/commands/pjm/migrate.ts` and `migrate.test.ts` - migration
  orchestration and safety coverage.
- `packages/cli/src/commands/pjm/index.ts` and `index.test.ts` - subcommand
  wiring.
- `packages/cli/assets/migration/pjm-restructure.md` - bundled migration prompt.

---

### Task p02-t03: Register Assets and Update Pack Manifests

**Status:** completed
**Commit:** 16521fa4

**Outcome:**

- Registered the migration asset and repo AGENTS/decision templates in the
  bundle script and PM skill manifest.
- Updated the public-package contract and bundle-consistency coverage.

**Files changed:**

- `packages/cli/scripts/bundle-assets.sh` - migration asset bundling.
- `packages/cli/src/commands/init/tools/shared/skill-manifest.ts` and
  `install-project-management.test.ts` - PM pack registration.
- `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts` -
  migration asset bundle coverage.
- `packages/cli/src/release/public-package-contract.ts` and `*.test.ts` -
  release contract for new assets/templates.

**Notes / Decisions:**

- `oat-pjm-decision` skill manifest registration deferred to p03-t01 (the
  canonical skill is created in Phase 3). Recorded as an accepted deviation;
  the decision-skill PM manifest entry is added when the skill exists.

## Phase 3: Skills and Lifecycle Destinations

**Status:** completed
**Started:** 2026-06-23

### Phase Summary

Rewrote PJM and content/lifecycle skills for the two-layer taxonomy: active
operational guidance points at `.oat/repo/pjm/` (current-state, roadmap,
backlog), decisions route through `oat decision new` into
`.oat/repo/reference/decisions/`, and durable content destinations
(brainstorms, research, external-plans) point under `reference/`. Added the new
`oat-pjm-decision` skill and resolved the deferred p02-t03 PM-manifest
registration. Every changed canonical skill received exactly one frontmatter
version bump; the new skill starts at `1.0.0`.

### Task p03-t01: Rewrite PJM Skills and Add Decision Skill

**Status:** completed
**Commit:** 5d79119f

**Outcome:**

- Created `.agents/skills/oat-pjm-decision/SKILL.md` (v1.0.0) routing durable
  decision capture through `oat decision init/new/regenerate`.
- Registered `oat-pjm-decision` in `PROJECT_MANAGEMENT_SKILLS`
  (skill-manifest single source of truth), the bundle script SKILLS array, and
  the `install-project-management.test.ts` expectations — resolving the deferred
  p02-t03 registration.
- Repointed `oat-pjm-add-backlog-item`, `oat-pjm-review-backlog`, and
  `oat-pjm-update-repo-reference` from `reference/{backlog,roadmap}` to `pjm/`
  and routed decisions through `oat decision new`; bumped each version once.
- Repointed the bundled `oat-pjm-review-backlog` review template example paths.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation src/commands/init/tools`
- Result: passed, 28 files, 247 tests.
- Run: `rg -n "reference/(backlog|roadmap|current-state)|decision-record\.md" .agents/skills/oat-pjm-*`
- Result: only legacy/migration-context matches remain.
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: passed.

---

### Task p03-t02: Repoint Lifecycle Decision and Reference Paths

**Status:** completed
**Commit:** 10f3ae03

**Outcome:**

- Repointed `oat-project-document` reference reads to `pjm/` (active) and
  `reference/decisions/` (durable), with an explicit legacy-fallback note for
  un-migrated repos; bumped version once.
- Repointed `oat-project-complete` References backlog link to `pjm/backlog/`
  (decision link already correct); bumped version once.
- Audited `oat-project-summary` and `oat-project-pr-final`: neither references
  `.oat/repo` operational paths nor creates decision records, so no edits or
  version bumps were needed (recorded in Deviations).

**Verification:**

- Run: `rg -n "reference/(backlog|roadmap|current-state)|decision-record\.md" .agents/skills/oat-project-*`
- Result: only the intentional legacy-fallback note in `oat-project-document` remains.
- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation`
- Result: passed, 2 files, 43 tests.

---

### Task p03-t03: Encode Content-Skill Destinations

**Status:** completed
**Commit:** 79d329bf

**Outcome:**

- `oat-brainstorm` saved-doc destination now suggests
  `reference/brainstorms/` by default at project-level OAT (created on demand)
  and repointed its backlog handoff path to `pjm/backlog/items/`; bumped version.
- `deep-research` project-level default output now `reference/research/`;
  bumped version (user-level path kept at `~/.oat/research/`, see Deviations).
- `oat-project-import-plan` retains `reference/external-plans/` and now cites
  the `reference/AGENTS.md` durable-destination guide; bumped version. The
  discovery script already resolved the correct path.

**Verification:**

- Run: `rg -n "repo/research|reference/brainstorms|reference/research|reference/external-plans" .agents/skills/oat-brainstorm .agents/skills/deep-research .agents/skills/oat-project-import-plan`
- Result: destinations match design.
- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools src/validation src/release`
- Result: passed, 31 files, 271 tests.
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: passed.

## Phase 4: Polish, Docs, Release, and Cleanup

**Status:** completed
**Started:** 2026-06-23

### Phase Summary

Refreshed templates and docs for the two-layer `pjm/` + `reference/` taxonomy,
retired the deprecated PJM skills with redirect banners, resolved the two p03
provider-view/sweep carry-overs, applied the lockstep public-package version
bump (`0.1.30 -> 0.1.31` across all five public packages), and passed the full
verification suite plus `release:validate`. Final old-path sweeps are clean and
the local out-of-repo audit copies were removed.

- **Outcome:** Docs/templates teach the new taxonomy with explicit legacy/
  migration framing; release artifacts validate; no live old-path operational
  teaching remains in source.
- **Verification:** `pnpm test` (1907 pass), `pnpm lint`, `pnpm type-check`,
  `pnpm build`, `pnpm release:validate`, and `pnpm build:docs` all passed; p04
  code review passed after one docs-accuracy fix cycle.
- **Notable decisions:** Corrected a drifted `oat decision migrate` dry-run-
  default docs claim (CLI applies by default; docs were wrong — fixed docs, not
  CLI). Out-of-repo audit cleanup and the finalize tracking commit are
  orchestrator-owned.

### Task p04-t01: Update Docs, Templates, and Legacy Guidance

**Status:** completed
**Commit:** 334d4f18 (self-review fix 635847a8; review fix 067dee3b)

**Outcome:**

- Updated `current-state.md` and `roadmap.md` templates with anti-conflict
  conventions (append-mostly, section ownership, `bl-YYMMDD-slug` references)
  and new-taxonomy pointers (`pjm/` operational, `reference/decisions/` durable).
- Updated `apps/oat-docs/docs/**` pages that taught old active PJM paths:
  `tool-packs.md` (two-layer `oat pjm init` surface, corrected `--repo-root`
  flag, decision migration note), `config-and-local-state.md` (backlog moved to
  `pjm/backlog/`, new `oat decision` command-group section), `file-locations.md`
  (added `pjm/` operational layer), and `oat-directory-structure.md` (two-layer
  `.oat/repo/` table/tree, top-level overview tree `pjm/` entry). Legacy/migration
  mentions kept explicit.
- Marked deprecated `update-repo-reference` (v1.2.0->1.3.0) and `review-backlog`
  (v1.2.1->1.3.0) skills as retired with explicit redirect banners; old-path
  process bodies framed as historical/legacy-only.
- Resolved the two p03 carry-over advisories: ran `oat sync --scope all`
  (created provider symlink views `.claude/skills/oat-pjm-decision` and
  `.cursor/skills/oat-pjm-decision`, updated `.oat/sync/manifest.json`) and
  swept the 2 stale old-path lines in
  `.agents/skills/oat-brainstorm/references/dogfood-results.md` to `pjm/backlog/`.
- Ran `bash packages/cli/scripts/bundle-assets.sh`; gitignored asset-doc mirrors
  refreshed (no tracked diff except force-tracked entries).

**Verification:**

- Run: `pnpm build:docs` - passed (6/6 turbo tasks, 53 static pages, no broken
  links/frontmatter errors), run before each commit.

**Notes / Decisions:**

- `--reference-root` in the old `tool-packs.md` was incorrect against the live
  `oat pjm init` implementation (the flag is `--repo-root`, default `.oat/repo`).
  Corrected as a docs-accuracy fix (recorded in Deviations).
- `oat-brainstorm` reference-file edit needed no new version bump: the policy is
  PR-scoped one-bump-per-changed-skill, and `oat-brainstorm` was already bumped
  in p03-t03 (`79d329bf`).

---

### Task p04-t02: Bump Public Packages and Run Full Verification

**Status:** completed
**Commit:** 542d9342

**Outcome:**

- Applied lockstep patch bump `0.1.30 -> 0.1.31` to all five public packages
  (`cli`, `control-plane`, `docs-config`, `docs-theme`, `docs-transforms`),
  matching the repo's single-patch-per-release convention.
- Re-ran `bash packages/cli/scripts/bundle-assets.sh`; bundled
  `public-package-versions.json` refreshed to `0.1.31`.
- Internal deps use `workspace:*`; no `pnpm-lock.yaml` change.

**Verification (full suite, all passed):**

- `pnpm test` - passed: 216 files, 1907 tests, 0 failures.
- `pnpm lint` - passed: 0 warnings, 0 errors (all packages).
- `pnpm type-check` - passed: 10/10 tasks.
- `pnpm build` - passed: 5/5 tasks (CLI build re-runs bundle script).
- `pnpm release:validate` - passed: all 5 public packages validated at
  `0.1.31` (tarballs contain all required assets).

---

### Task p04-t03: Final Sweep and Local Audit Cleanup

**Status:** completed
**Commit:** orchestrator finalize bookkeeping commit (sweep done by implementer;
out-of-repo audit cleanup + finalize done by orchestrator)

**Sweep results (all remaining matches are legitimate legacy/migration/fallback
context):**

- `rg -n "reference/(backlog|roadmap|current-state)|decision-record\.md"
--glob '!.oat/projects/**'`: matches remain only in (a) explicit legacy/
  migration prose in updated docs, (b) the migration tooling itself
  (`decision/migrate.ts`, `pjm/migrate.ts` source->target maps), (c) PJM doctor
  legacy-monolith / second-roadmap detection (`pjm/doctor.ts`), and (d) tests
  for that legacy/migration behavior.
- `rg -n "reference/(backlog|roadmap|current-state)|decision-record\.md"
.agents/skills`: matches remain only in the two retired skills' legacy-framed
  bodies and in explicit legacy/migration notes inside live skills
  (`oat-project-document`, `oat-pjm-decision`, `oat-pjm-update-repo-reference`).
- `rg -n "\.oat/repo/reference/(backlog|roadmap|current-state)"
--glob '!.oat/projects/**' --glob '!packages/cli/assets/**'`: **zero matches**
  (no live old-path operational teaching anywhere in source).
- Positive check: live PJM skills point active state at `pjm/` and decisions at
  `reference/decisions/`.

**Orchestrator finalization (completed):**

- Removed `/Users/tstang/code/oat-audit` and `/tmp/oat-audit` after verifying
  neither was a git repo/worktree and that the migration-prompt source is
  preserved in-repo as `packages/cli/assets/migration/pjm-restructure.md`.
  Verified absent: `test ! -e` passed for both paths.
- Final tracking reconciliation committed here (Run 4 bookkeeping).

---

### Task p04-t04: (review) Fix migration prompt decision-index contract

**Status:** completed
**Commit:** 88f5e4ec

**Outcome:**

- Resolved final-review v2 finding I1: corrected the bundled
  `oat pjm migrate --print-prompt` asset
  (`packages/cli/assets/migration/pjm-restructure.md`) to teach the canonical
  singular `<!-- OAT DECISION-INDEX -->` marker pair and the 5-column
  `| ID | Date | Status | Title | Legacy |` index header (fixed lines 153, 204,
  416-417; removed the stale plural marker and the `| Decision |` column name).
- Added a regression assertion in
  `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts` that
  imports `DECISION_INDEX_START` and derives the canonical header from
  `renderDecisionManagedSection`, then asserts the bundled asset contains the
  singular markers + 5-column header and does NOT contain the stale plural
  `OAT DECISIONS-INDEX` marker — pinning the asset to the CLI source of truth.

**Verification:**

- Focused: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools src/commands/decision` — 233 tests passed (suite grew 16 → 19 bundle-consistency tests).
- Full final-review gate: `pnpm format`, `pnpm lint`, `pnpm type-check`,
  `pnpm build`, `pnpm build:docs`, `pnpm test` (1891 CLI tests), and
  `pnpm release:validate` (5 packages @ 0.1.31) — all passed.

**Notes / Decisions:**

- Asset-accuracy fix only; no CLI behavior change. The force-tracked asset lives
  under the gitignored `packages/cli/assets/` and was staged with `git add -f`.

## Orchestration Runs

<!-- orchestration-runs-start -->

### Run 1 — 2026-06-23 02:39

**Branch:** pjm-refresh
**Tier:** 1
**Policy:** merge-strategy=direct, retry-limit=5
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer | Review | Fix Iterations | Disposition |
| ----- | ----------- | ------ | -------------- | ----------- |
| p01   | DONE        | pass   | 4/5            | accepted    |

#### Dispatch Notes

- Dispatch: p01 implementation and reviews used Codex
  `oat-phase-implementer-xhigh` / `oat-reviewer-xhigh` under the project
  maximum dispatch ceiling.
- Review fixes addressed decision record rollback, migration repeatability and
  collision preflight, bundle wrapper continuity after template changes, and
  zero-section destructive delete safety.

#### Outstanding Items

- None for p01.

#### Artifact / Design Deltas

Run-scoped snapshot only. Durable deltas are recorded in
`## Deviations from Plan / Design`.

### Run 2 — 2026-06-23 22:00

**Branch:** pjm-refresh
**Tier:** 1
**Policy:** merge-strategy=direct, retry-limit=5
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer | Review | Fix Iterations | Disposition |
| ----- | ----------- | ------ | -------------- | ----------- |
| p02   | DONE        | pass   | 0/5            | accepted    |

#### Parallel Groups

- p02: sequential (no parallel groups in plan).

#### Dispatch Notes

- Resumed an interrupted Codex session: all three p02 tasks were already
  implemented and committed (`82a7b044`, `e0db9539`, `16521fa4`) but the phase
  review and bookkeeping had not run. Re-dispatched the p02 reviewer for the
  committed HEAD.
- Dispatch: p02 review used Claude `oat-reviewer` at `model=opus` under the
  project maximum dispatch ceiling (enforced via model-arg).
- Dispatch ceiling: opus (claude, enforced — model-arg).

#### Outstanding Items

- None blocking. p02 review returned 4 Minor findings (no Critical/Important):
  `--print-prompt` test stubs the prompt reader (real-asset bundling covered by
  the bundle-consistency test); no dedicated second-apply idempotency regression
  test (verified manually during review); no standalone `pjm --help` snapshot
  (root snapshot includes `pjm`); force-tracked migration asset documented here
  and in the Phase 2 summary. Minor findings recorded, not converted to fix
  tasks at the phase gate.

#### Artifact / Design Deltas

Run-scoped snapshot only. Durable deltas are recorded in
`## Deviations from Plan / Design`. The p02-t03 `oat-pjm-decision` deferral
remains the only durable Phase 2 delta.

### Run 3 — 2026-06-23 22:20

**Branch:** pjm-refresh
**Tier:** 1
**Policy:** merge-strategy=direct, retry-limit=5
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer        | Review | Fix Iterations | Disposition |
| ----- | ------------------ | ------ | -------------- | ----------- |
| p03   | DONE_WITH_CONCERNS | pass   | 0/5            | accepted    |

#### Parallel Groups

- p03: sequential (no parallel groups in plan).

#### Dispatch Notes

- Dispatch: p03 implementation and review used Claude `oat-phase-implementer`
  and `oat-reviewer` at `model=opus` under the project maximum dispatch ceiling
  (enforced via model-arg).
- Implementer returned DONE_WITH_CONCERNS; all three concerns were advisory
  (provider-view sync drift, a stale path in a historical dogfood transcript,
  and the summary/pr-final audit), so the orchestrator proceeded to review.
- Dispatch ceiling: opus (claude, enforced — model-arg).

#### Outstanding Items

- None blocking. p03 review returned 2 Minor findings (no Critical/Important):
  a stale path in `.agents/skills/oat-brainstorm/references/dogfood-results.md`
  (historical transcript, already an accepted p04 deferral) and an optional
  wording nuance in the `oat-pjm-decision` skill. Both deferred to p04's final
  sweep / left as-is; not converted to fix tasks at the phase gate.
- Advisory for p04: run `oat sync --scope all` to refresh provider-linked skill
  views after the new `oat-pjm-decision` skill and skill edits; sweep the
  remaining historical old-path mention in the brainstorm dogfood transcript.

#### Artifact / Design Deltas

Run-scoped snapshot only. Durable deltas are recorded in
`## Deviations from Plan / Design` (rows p03-t01, p03-t02, p03-t03 added this
run; p02-t03 marked RESOLVED).

### Run 4 — 2026-06-23 22:45

**Branch:** pjm-refresh
**Tier:** 1
**Policy:** merge-strategy=direct, retry-limit=5
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer | Review            | Fix Iterations | Disposition |
| ----- | ----------- | ----------------- | -------------- | ----------- |
| p04   | DONE        | fail → fix → pass | 1/5            | accepted    |

#### Parallel Groups

- p04: sequential (no parallel groups in plan).

#### Dispatch Notes

- Dispatch: p04 implementation, fix, and review used Claude
  `oat-phase-implementer` / `oat-reviewer` at `model=opus` under the project
  maximum dispatch ceiling (enforced via model-arg).
- p04 implementer returned DONE with the full verification suite green
  (`pnpm test` 1907 pass, lint, type-check, build, `release:validate`, and
  `build:docs`). First review returned fail on one Important docs-accuracy
  defect (`oat decision migrate` documented as dry-run-default; CLI applies by
  default). One fix cycle (commit `067dee3b`, docs-only) resolved it; re-review
  passed with 0 findings.
- Dispatch ceiling: opus (claude, enforced — model-arg).

#### Outstanding Items

- None. p04 re-review returned 0 Critical / 0 Important / 0 Medium / 0 Minor.
- Orchestrator finalization complete: out-of-repo audit copies removed; final
  old-path sweeps clean.

#### Artifact / Design Deltas

Run-scoped snapshot only. Durable deltas are recorded in
`## Deviations from Plan / Design` (p04-t01 docs-accuracy corrections). The p04
review-fix corrected drifted docs to match the CLI; no artifact is now stale.

<!-- orchestration-runs-end -->

## Implementation Log

### 2026-06-23

**Session Start:** project scaffolding and artifact authoring.

- Scaffolded spec-driven OAT project `pjm-refresh`.
- Copied audit bundle from `laptop` to `/Users/tstang/code/oat-audit` and
  `/tmp/oat-audit` for local validation.
- Validated live source claims before design:
  - no `oat decision` command group exists;
  - backlog IDs use hash plus local scan;
  - backlog and PJM init still default to `.oat/repo/reference`;
  - PM pack still ships `decision-record.md`;
  - `oat-project-summary` and `oat-project-pr-final` do not create decision
    records today.
- Added cleanup requirement to remove local audit copies when done.
- [x] p01-t01: Add Shared ID and Template Helpers - 3ade17eb
- [x] p01-t02: Rewrite Backlog IDs and Harden Index Determinism - 9c945de9
- Updated execution controls per user direction:
  - dispatch ceiling set to maximum (`codex: xhigh`, `claude: opus`);
  - implementation HiLL checkpoint set to `p04` only;
  - auto-review at HiLL checkpoints enabled;
  - Tier 1 subagent implementation/review authorized for subsequent phase
    execution.
- [x] p01-t03: Add Decision Command Init/New/Regenerate - 8af3c8ea
- [x] p01-t04: Add Decision Migration - 7215f93e
- [x] p01-t05: Add Templates, AGENTS Docs, PJM Init, and Doctor Core -
      5b4c935d
- Phase 1 completed with focused verification passing.
- [x] p01 review fixes - a3cdc641
  - Hardened `decision new` so missing/invalid decision index scaffolds fail
    before writing and regeneration failures roll back the new record.
  - Hardened `decision migrate` so duplicate targets and conflicting existing
    targets are rejected before writes, successful migrations are repeatable,
    and `--delete-legacy` only runs after all migrated records verify.
  - Focused decision tests, CLI type-check, and targeted decision lint pass
    after fixes.
- [x] p01 wrapper fix - e3916914
  - Updated the bundle script template list so `pnpm run cli -- ...` remains
    runnable after p01 removed `decision-record.md`.
  - p01 re-review v3 found one remaining Important issue:
    `decision migrate --delete-legacy` can delete an unparseable legacy file
    when zero mappings were produced.
  - User authorized extending `oat_orchestration_retry_limit` to `5` and
    dispatching one more narrow p01 fix cycle before p02.
- [x] p01 zero-section delete fix - 0fd1c481
  - `decision migrate --delete-legacy` now rejects destructive migration when
    zero legacy decision sections are parsed.
  - p01 re-review v4 passed with 0 Critical, 0 Important, 0 Medium, and 0
    Minor findings.
- [x] p02-t01: Move Live Backlog Defaults and Cleanup Guards to `pjm/` -
      82a7b044
- [x] p02-t02: Add `oat pjm migrate` and Migration Prompt Asset - e0db9539
- [x] p02-t03: Register Assets and Update Pack Manifests - 16521fa4
  - Deferred `oat-pjm-decision` manifest registration to p03-t01 (89f4aea9).
- Phase 2 implemented by an interrupted Codex session; resumed in a Claude
  session to run the p02 phase review and reconcile bookkeeping.
- [x] p02 code review passed - reviews/archived/p02-review-2026-06-23.md
  - 0 Critical, 0 Important, 0 Medium, 4 Minor (non-blocking) findings.

**Session End:** ongoing.

## Deviations from Plan / Design

| Task / Review | Source Artifact     | Planned / Documented                                                                                                           | Actual / Accepted                                                                                                                        | Reason                                                                                                                                                                                                                                               | Source of Truth                                | Follow-up                                                                                                                |
| ------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| p01-t04       | plan.md             | Task file list did not include `packages/cli/src/commands/help-snapshots.test.ts`.                                             | Updated the decision help snapshot to include `migrate`.                                                                                 | Adding the p01-t04 command changed the p01-t03 snapshot; leaving it stale would create a known later test failure.                                                                                                                                   | p01-t04 command registration requirement.      | None; snapshot is current.                                                                                               |
| p02-t03       | plan.md             | PM pack tests expect `oat-pjm-decision` during p02-t03 asset registration.                                                     | Deferred `oat-pjm-decision` manifest registration.                                                                                       | The canonical `oat-pjm-decision` skill is created by p03-t01, and this phase was explicitly bounded away from p03 skill work.                                                                                                                        | p03-t01 skill creation scope.                  | RESOLVED in p03-t01: `oat-pjm-decision` added to `PROJECT_MANAGEMENT_SKILLS`, bundle script, and install/contract tests. |
| p03-t01       | plan.md             | Task file list names only the three existing PJM `SKILL.md` files for path edits.                                              | Also repointed `oat-pjm-review-backlog/references/backlog-review-template.md` from `reference/backlog`/`reference/roadmap` to `pjm/`.    | The bundled skill reference template carried live old-path examples an agent would copy; it is inside the skill's own directory boundary.                                                                                                            | design.md two-layer taxonomy.                  | None; example paths now match `pjm/`.                                                                                    |
| p03-t02       | plan.md / design.md | Plan asks to "record in comments or artifacts that summary and pr-final do not create decisions today."                        | Recorded here as artifact note; made no edits to those two skills.                                                                       | Audit confirmed `oat-project-summary` and `oat-project-pr-final` reference no `.oat/repo` PJM/reference operational paths and create no decision records, matching design's live-source finding. Editing them would force unnecessary version bumps. | Live skill source audit.                       | None unless a later change makes them create decision records.                                                           |
| p03-t03       | plan.md / design.md | Plan/design specify project-level brainstorm/research durable defaults under `reference/`.                                     | Kept user-level (`~/.oat/`) suggestions at `~/.oat/research/` and `~/.oat/brainstorms/`, not under a `reference/` layer.                 | The `reference/` taxonomy is the repo-reference (`.oat/repo/reference/`) layer; `~/.oat/` user scope has no `repo/reference` split, and deep-research's original user-level path was `~/.oat/research/`.                                             | design.md scoped reference guide decision.     | None; project-level defaults match design.                                                                               |
| p04-t01       | plan.md             | Plan scopes docs updates to old PJM-path pages; did not call out the existing `--reference-root` flag name in `tool-packs.md`. | Corrected the documented `oat pjm init` flag from `--reference-root` to `--repo-root` (default `.oat/repo`) while rewriting the page.    | The old docs flag name was wrong against the live `oat pjm init` implementation (`--repo-root`); leaving it would teach a non-existent flag.                                                                                                         | Live `packages/cli/src/commands/pjm/index.ts`. | None; doc matches implementation.                                                                                        |
| p04-t01       | plan.md             | Plan lists the `.oat/repo/` structure section as the docs-edit target.                                                         | Self-review fix `635847a8` also added `pjm/` to the top-level overview tree and `.oat/repo/` row higher in `oat-directory-structure.md`. | Same doc taught the new two-layer structure further down but the top-level overview tree still omitted `pjm/`; fixed for internal consistency, within the same file/task boundary.                                                                   | design.md two-layer taxonomy.                  | None; overview tree and detail section agree.                                                                            |

## Test Results

| Phase | Tests Run                                     | Passed | Failed | Coverage                                          |
| ----- | --------------------------------------------- | ------ | ------ | ------------------------------------------------- |
| 1     | shared helper + PJM init focused Vitest run   | 23     | 0      | helper and init unit coverage                     |
| 1     | backlog command and index focused Vitest run  | 22     | 0      | backlog ID and deterministic index unit coverage  |
| 1     | CLI package type check                        | -      | 0      | TypeScript compile coverage                       |
| 1     | decision command + help focused Vitest run    | 63     | 0      | decision init/new/regenerate and help coverage    |
| 1     | decision migration focused Vitest run         | 67     | 0      | migration plus decision command/help coverage     |
| 1     | PJM + doctor focused Vitest run               | 31     | 0      | two-layer init and doctor command coverage        |
| 1     | Phase 1 focused Vitest run                    | 98     | 0      | decision, PJM, doctor, help coverage              |
| 1     | targeted oxlint                               | -      | 0      | decision/PJM/doctor lint coverage                 |
| 1     | p01 review fix focused RED tests              | 6      | 5      | confirmed decision new/migrate safety failures    |
| 1     | p01 review fix decision suite                 | 72     | 0      | decision safety fixes plus help snapshot coverage |
| 1     | p01 review fix CLI type-check                 | -      | 0      | TypeScript compile coverage                       |
| 1     | p01 review fix targeted decision oxlint       | -      | 0      | decision command lint coverage                    |
| 1     | p01 zero-section fix migration test           | -      | 0      | destructive delete regression coverage            |
| 1     | p01 re-review v4                              | -      | 0      | passed review, no findings                        |
| 2     | backlog/pjm/cleanup/init-tools/release Vitest | 302    | 0      | path move, migration, asset registration coverage |
| 2     | CLI package type check                        | -      | 0      | TypeScript compile coverage                       |
| 2     | p02 code review                               | -      | 0      | passed review, 4 Minor (non-blocking) findings    |
| 3     | p03-t01 validation + init/tools Vitest        | 247    | 0      | new decision skill, PM registration, bundle sync  |
| 3     | p03-t02 validation Vitest                     | 43     | 0      | lifecycle skill path repointing                   |
| 3     | p03-t03 init/tools + validation + release     | 271    | 0      | content-skill durable destinations                |
| 3     | CLI package type check                        | -      | 0      | TypeScript compile coverage                       |
| 3     | p03 code review                               | -      | 0      | passed review, 2 Minor (non-blocking) findings    |
| 4     | p04-t01 `pnpm build:docs`                     | -      | 0      | docs build, 6/6 tasks, 53 static pages            |
| 4     | p04-t02 `pnpm test` (full)                    | 1907   | 0      | 216 files, full workspace suite                   |
| 4     | p04-t02 `pnpm lint` (full)                    | -      | 0      | 0 warnings / 0 errors, all packages               |
| 4     | p04-t02 `pnpm type-check` (full)              | -      | 0      | 10/10 turbo tasks                                 |
| 4     | p04-t02 `pnpm build` (full)                   | -      | 0      | 5/5 turbo tasks                                   |
| 4     | p04-t02 `pnpm release:validate`               | -      | 0      | 5 public packages validated at 0.1.31             |
| 4     | p04 code review (fail → fix → pass)           | -      | 0      | 1 Important docs fix; re-review 0 findings        |

## Review Received: final (v2)

**Date:** 2026-06-23
**Review artifact:** reviews/archived/final-review-2026-06-23-v2.md

**Findings:**

- Critical: 0
- Important: 1
- Medium: 0
- Minor: 0

**New tasks added:** p04-t04

**Finding I1 (Important, verified):** The bundled `oat pjm migrate --print-prompt`
asset (`packages/cli/assets/migration/pjm-restructure.md`) teaches an
incompatible decision-index contract in its manual fallback — the plural
`<!-- OAT DECISIONS-INDEX -->` marker pair and a 4-column
`| ID | Date | Status | Title |` table (one spot `| Decision |`). The live CLI
(`regenerate-index.ts:7-8,143`) uses the singular `<!-- OAT DECISION-INDEX -->`
marker pair and the 5-column `| ID | Date | Status | Title | Legacy |` table. An
agent following the manual fallback would build an index incompatible with
`oat decision regenerate` and drop migrated `legacy_id` values. Disposition:
`code_fix_required` → converted to fix task p04-t04 (fix the asset + add a
bundle/asset regression assertion pinning it to the CLI source of truth).
Affects FR5, FR7, NFR3.

**Context:** This v2 final review was run manually after PR #118 was opened and
supersedes the earlier passing v1 final review (which did not inspect the bundled
prompt's index contract). The PR will be updated after the fix passes re-review.

**Next:** ✓ p04-t04 implemented (commit `88f5e4ec`, full gate green). Re-running
the final review to confirm I1 is resolved; on `passed`, push to update PR #118.

## Final Summary (for PR/docs)

**What shipped:** Restructured OAT's PJM repo-reference layer into a two-layer
model — an operational `.oat/repo/pjm/` layer and a durable
`.oat/repo/reference/` layer — with deterministic date+slug IDs, file-per-record
decisions, deterministic indexes, migration tooling, and refreshed shipped
assets.

- **Deterministic IDs & indexes:** Shared `slugify` + UTC `yymmdd` helpers;
  backlog IDs moved from hash+scan to allocator-free `bl-YYMMDD-slug`; backlog
  index regeneration made order-independent and locale-independent.
- **Decision records:** New `oat decision` command group (`init`, `new`,
  `regenerate`, `migrate`) producing file-per-record decisions
  (`dr-YYMMDD-slug`) under `reference/decisions/`, with guarded legacy
  `decision-record.md` migration that preserves bodies and writes `legacy_id`.
- **Two-layer scaffold & doctor:** `oat pjm init` scaffolds `pjm/` +
  `reference/` + three AGENTS guides; `oat pjm doctor` (and project-scope
  `oat doctor`) validate the canonical layout and warn on legacy/loose/second-
  roadmap drift.
- **Path move & migration:** Live backlog defaults and cleanup guards moved to
  `pjm/` (durable `reference/external-plans` and `reference/project-summaries`
  preserved); `oat pjm migrate` performs safe, idempotent, lossless repo
  restructuring with `--dry-run` and a bundled `--print-prompt` asset.
- **Skills & lifecycle destinations:** Rewrote PJM skills and added the
  `oat-pjm-decision` skill; repointed lifecycle/content skills (document,
  complete, brainstorm → `reference/brainstorms/`, deep-research →
  `reference/research/`, import-plan stays `reference/external-plans/`); retired
  deprecated `update-repo-reference` / `review-backlog` with redirect banners.
- **Docs, release, cleanup:** Refreshed templates and `apps/oat-docs/docs`,
  refreshed provider views via `oat sync`, applied the lockstep public-package
  bump `0.1.30 → 0.1.31` across all five public packages, and removed local
  out-of-repo audit copies.

**Key modules touched:** `packages/cli/src/commands/{shared,backlog,decision,pjm,
cleanup,doctor,init/tools,index}`, `packages/cli/src/release/`,
`packages/cli/assets/migration/`, `.oat/templates/`, `.agents/skills/*`,
`apps/oat-docs/docs/`, and the five public-package manifests.

**Verification performed:** Per-phase focused Vitest + type-check + targeted
lint throughout; full-suite gate at p04-t02 — `pnpm test` (1907 tests, 0
failures), `pnpm lint`, `pnpm type-check`, `pnpm build`, `pnpm build:docs`, and
`pnpm release:validate` (all five public packages at 0.1.31) all passing. Each
phase passed an independent code review (p04 after one docs-accuracy fix cycle).

**Post-implementation note (PR closeout):** The p04-t02 verification gate did
not include `pnpm format` (`oxfmt --check`), so three p02 `pjm/` command files
(`index.ts`, `migrate.ts`, `migrate.test.ts`) carried formatting drift that the
pre-push hook caught at PR time. Fixed mechanically with `oxfmt` (commit
`294635f5`, no semantic change); workspace format and pjm tests re-verified
green. Follow-up: add `pnpm format` to the standard full-suite gate.

**Design deltas:** See `## Deviations from Plan / Design`. Notable: the p02-t03
`oat-pjm-decision` manifest deferral (resolved in p03-t01) and docs-accuracy
corrections in p04-t01 (`--repo-root` flag, `oat decision migrate` apply-default,
template list). No artifact remains stale.

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md`
