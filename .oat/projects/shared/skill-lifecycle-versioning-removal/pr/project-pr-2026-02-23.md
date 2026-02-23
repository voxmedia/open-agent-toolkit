---
oat_generated: true
oat_generated_at: 2026-02-23
oat_pr_type: project
oat_pr_scope: final
oat_project: .oat/projects/shared/skill-lifecycle-versioning-removal
---

# PR: skill-lifecycle-versioning-removal

## Summary

This PR completes the imported `skill-lifecycle-versioning-removal` project and ships end-to-end skill lifecycle improvements across install, update, remove, and diagnostics flows. It adds skill version metadata and version-aware update detection for `oat init tools`, introduces `oat remove skill` / `oat remove skills --pack`, and surfaces outdated bundled-skill checks in `oat doctor`.

The project also closes two full review-fix cycles plus a final v3 re-review pass, including follow-up hardening for doctor DI clarity, repo-wide skill version metadata coverage, and creation-workflow versioning guidance/templates. Documentation was updated before PR creation to accurately classify and describe the new command surfaces (`oat init tools`, `oat remove`, `oat doctor`).

## Goals / Non-Goals

Project mode: `import` (`references/imported-plan.md` is the requirements/design source; `spec.md` and `design.md` are optional and not required for this mode).

Goals (from imported plan and implemented work):
- Add semver-based skill version metadata support and validation.
- Make `oat init tools` version-aware so outdated installed skills can be detected and selectively updated.
- Add safe, scope-aware skill removal commands with manifest-managed provider-view cleanup.
- Surface outdated bundled OAT skill installs in `oat doctor`.

Non-goals (preserved):
- No automatic non-interactive outdated-skill updates in `oat init tools` (report-only unless explicitly forced / selected).
- No deletion of unmanaged provider views during removal (warn and preserve).
- No mandatory `version` field enforcement in all historical skill files at parser level (format validation when present; repo-wide coverage enforced via tests/process for this project).

## What Changed

### Phase 1: Version Infrastructure

- Added `getSkillVersion()` frontmatter helper for `SKILL.md` version extraction.
- Added optional semver validation for skill frontmatter `version` values.
- Added semver parse/compare utilities for installer/update flows.
- Added `version: 1.0.0` to bundled OAT skills and test coverage tied to bundle inventory.

### Phase 2: Version-Aware `oat init tools`

- Extended copy helpers with version-aware results (`outdated`/`current`/`newer`).
- Updated ideas/workflows/utility installers to surface `outdatedSkills` without mutating by default.
- Added TTY batch selection UX for updating outdated skills.
- Added non-interactive report-only messaging for outdated installed skills.
- Clarified unversioned display as `(unversioned)` in init-tools output.

### Phase 3: Skill Removal Lifecycle (`oat remove`)

- Added `oat remove` command group with:
  - `oat remove skill <name>`
  - `oat remove skills --pack <ideas|workflows|utility>`
- Implemented scope-aware canonical skill removal plus manifest-managed provider-view cleanup.
- Preserved unmanaged provider views with explicit warnings.
- Added JSON-mode success payloads and single-payload pack JSON hardening.
- Added regression coverage for multi-scope and pack flows.

### Phase 4: Doctor Integration, Review Fixes, and Final Hardening

- Added `skill_versions` doctor diagnostics (per scope) to detect outdated installed OAT skills vs bundled assets.
- Added remediation guidance to run `oat init tools` when outdated skills are detected.
- Completed full verification and manual lifecycle checks.
- Implemented review-fix tasks from final and final-v2 review cycles (frontmatter helper contract docs, doctor DI fixes, JSON output consistency, parser hardening, display consistency).
- Added repo-wide skill version frontmatter coverage and enforcement test for all `.agents/skills/*/SKILL.md` files.
- Updated `create-skill` / `create-oat-skill` workflows and templates to require `version: 1.0.0` and document semver bump guidance.

### Post-Rebase Reconciliation + Docs

- Reconciled branch behavior with merged upstream PRs (#29, #30, #32), preserving this project's lifecycle/versioning guarantees.
- Updated docs (`README`, quickstart, CLI docs, troubleshooting) to document `oat init tools`, `oat remove`, and doctor skill-version diagnostics.
- Reorganized CLI docs to classify commands by intent (bootstrap, tool packs/assets, diagnostics, provider interop).

## Verification

Implementation verification (from project artifacts):
- `pnpm --filter @oat/cli test -- --run` (pass)
- `pnpm build && pnpm test` (pass)
- `pnpm lint && pnpm type-check` (pass)
- Post-rebase targeted lifecycle overlap suites + push-hook checks (`pnpm check`, `pnpm type-check`, `pnpm test`) (pass)
- Manual lifecycle checks for init-tools/remove/doctor flows (pass)

Final follow-up verification (review-fix tasks):
- `pnpm --filter @oat/cli test -- --run packages/cli/src/commands/doctor/index.test.ts` (pass)
- `pnpm --filter @oat/cli test -- --run packages/cli/src/validation/skills.test.ts` (pass)
- `pnpm oat:validate-skills` (pass)

Documentation sanity checks before PR artifact generation:
- `pnpm run cli -- remove --help`
- `pnpm run cli -- remove skill --help`
- `pnpm run cli -- remove skills --help`
- `pnpm run cli -- init tools --help`
- Grep-based docs coverage sanity check for `oat init tools`, `oat remove`, and `oat doctor` remediation references

Git context (merge-base `983de1d..HEAD`):
- `89 files changed, 5524 insertions(+), 136 deletions(-)`

## Reviews

Final review lineage (from `plan.md`):

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| final | code | fixes_completed | 2026-02-23 | `reviews/final-review-2026-02-22.md` |
| final-v2 | code | fixes_completed | 2026-02-23 | `reviews/final-review-2026-02-22-v2.md` |
| final-v3 | code | passed | 2026-02-23 | `reviews/final-review-2026-02-22-v3.md` |

Note: The base `final` row is retained for review-fix lineage; `final-v3` is the passing final re-review gate used for merge readiness.

## References

- Plan: [`plan.md`](https://github.com/tkstang/open-agent-toolkit/blob/codex/skill-lifecycle-versioning-removal/.oat/projects/shared/skill-lifecycle-versioning-removal/plan.md)
- Implementation: [`implementation.md`](https://github.com/tkstang/open-agent-toolkit/blob/codex/skill-lifecycle-versioning-removal/.oat/projects/shared/skill-lifecycle-versioning-removal/implementation.md)
- State: [`state.md`](https://github.com/tkstang/open-agent-toolkit/blob/codex/skill-lifecycle-versioning-removal/.oat/projects/shared/skill-lifecycle-versioning-removal/state.md)
- Imported Source Plan: [`references/imported-plan.md`](https://github.com/tkstang/open-agent-toolkit/blob/codex/skill-lifecycle-versioning-removal/.oat/projects/shared/skill-lifecycle-versioning-removal/references/imported-plan.md)
- Reviews: [`reviews/`](https://github.com/tkstang/open-agent-toolkit/tree/codex/skill-lifecycle-versioning-removal/.oat/projects/shared/skill-lifecycle-versioning-removal/reviews)
- Spec (optional / import mode): `.oat/projects/shared/skill-lifecycle-versioning-removal/spec.md`
- Design (optional / import mode): `.oat/projects/shared/skill-lifecycle-versioning-removal/design.md`
