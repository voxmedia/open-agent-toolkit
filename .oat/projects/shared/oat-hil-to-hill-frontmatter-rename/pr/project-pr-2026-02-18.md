---
oat_generated: true
oat_generated_at: 2026-02-18
oat_pr_type: project
oat_pr_scope: final
oat_project: .oat/projects/shared/oat-hil-to-hill-frontmatter-rename
---

# PR: oat-hil-to-hill-frontmatter-rename

## Summary

Hard-cut rename of three OAT checkpoint frontmatter keys from `hil` to `hill` across all active surfaces: templates, skill definitions, documentation, CLI code, and project artifacts. This aligns the key names with the intended "HiLL" (Human-in-the-Loop-Lifecycle) naming convention. No backward compatibility shim is provided -- old key names are no longer recognized.

## Goals / Non-Goals

**Goals (from imported plan):**
- Rename `oat_hil_checkpoints` -> `oat_hill_checkpoints`
- Rename `oat_hil_completed` -> `oat_hill_completed`
- Rename `oat_plan_hil_phases` -> `oat_plan_hill_phases`
- Validate zero remaining old-key usage in active surfaces

**Non-Goals:**
- Compatibility aliases or fallback parsing
- Migration of archived/historical project artifacts
- Automated migration script for external consumers

## What Changed

**Phase 1 -- Preflight & Audit:**
- Enumerated 93 old-key occurrences across 19 files, categorized into active vs excluded surfaces

**Phase 2 -- Hard-Cut Rename:**
- `.oat/templates/state.md` and `.oat/templates/plan.md` -- template frontmatter keys renamed
- 8 skill SKILL.md files -- all `oat_hil_*` and `oat_plan_hil_phases` references renamed
- `docs/oat/workflow/hil-checkpoints.md` -- documentation key names and YAML examples updated
- `packages/cli/src/commands/state/generate.ts` -- `parseFrontmatterField` calls updated to read new keys
- `packages/cli/src/commands/state/generate.test.ts` -- test fixtures updated (TDD: red then green)
- 4 active project artifact files (`state.md`, `plan.md` for two projects) -- frontmatter keys renamed

**Phase 3 -- Verification:**
- Zero old-key matches confirmed across all active surfaces
- Full test suite passing (509/509)

## Verification

| Check | Result |
|-------|--------|
| Unit tests | 509/509 passing |
| Lint (Biome) | Clean (165 files) |
| Type-check (TypeScript) | Clean |
| Grep sweep (active surfaces) | Zero old-key matches |
| Grep sweep (project frontmatter) | Zero old-key matches |

## Reviews

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| final | code | passed | 2026-02-18 | [reviews/final-review-2026-02-18.md](https://github.com/tkstang/open-agent-toolkit/blob/hil-to-hill/.oat/projects/shared/oat-hil-to-hill-frontmatter-rename/reviews/final-review-2026-02-18.md) |

Findings: 0 critical, 0 important, 0 medium, 2 minor (documentation traceability note -- addressed; infrastructure commits in range -- expected).

## References

- Plan: [plan.md](https://github.com/tkstang/open-agent-toolkit/blob/hil-to-hill/.oat/projects/shared/oat-hil-to-hill-frontmatter-rename/plan.md)
- Implementation: [implementation.md](https://github.com/tkstang/open-agent-toolkit/blob/hil-to-hill/.oat/projects/shared/oat-hil-to-hill-frontmatter-rename/implementation.md)
- Imported Source: [references/imported-plan.md](https://github.com/tkstang/open-agent-toolkit/blob/hil-to-hill/.oat/projects/shared/oat-hil-to-hill-frontmatter-rename/references/imported-plan.md)
- Reviews: [reviews/](https://github.com/tkstang/open-agent-toolkit/tree/hil-to-hill/.oat/projects/shared/oat-hil-to-hill-frontmatter-rename/reviews)

> **Note:** This is an `import`-mode project (no spec.md/design.md). The imported plan serves as the primary requirements source.
