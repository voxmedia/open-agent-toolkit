---
oat_generated: true
oat_generated_at: 2026-03-08
oat_review_scope: plan
oat_review_type: artifact
oat_project: /Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/docs-framework-migration
---

# Artifact Review: plan

**Reviewed:** 2026-03-08
**Scope:** Current `plan.md` for `docs-framework-migration` on branch `docs-migration`
**Files reviewed:** 3
**Commits:** N/A (artifact review)

## Summary

The plan is detailed and mostly executable, but it still misses two material requirement-coverage items and a couple of readiness gaps that would let implementation drift from the approved spec/design. The main issues are missing planned coverage for site description interpolation and FR4 theme acceptance verification, plus an FR7 MkDocs config gap and contradictory readiness bookkeeping inside the plan itself.

## Findings

### Critical

- **FR1 site description interpolation is not planned** (`plan.md:457`, `plan.md:459`, `plan.md:516`)
  - Issue: The spec requires scaffold-time interpolation of both site title and description, but the plan only carries `{{SITE_NAME}}`, `{{APP_NAME}}`, and a framework-choice prompt. There is no task to collect a description from the user, no description token in the template contract, and no verification that the scaffolded app renders or stores it.
  - Fix: Expand `p02-t01`, `p02-t03`, `p02-t04`, and `p02-t07` so the scaffold flow collects a site description, threads a `{{SITE_DESCRIPTION}}` token into the Fumadocs template/config surface, and verifies the generated app contains the interpolated description.
  - Requirement: FR1

- **FR4 theme acceptance criteria are not verifiable from this plan** (`plan.md:302`, `plan.md:333`, `plan.md:366`, `plan.md:1112`)
  - Issue: The theme tasks only verify that `@oat/docs-theme` builds and type-checks. The plan never adds an explicit check for branding props being applied, light/dark rendering behavior, or the code-copy button called out by the spec/design.
  - Fix: Add a concrete verification task, or extend `p04-t02`/`p04-t05`, to assert branding props are reflected in the rendered site, dark/light mode works, and code blocks expose the inherited copy-button behavior.
  - Requirement: FR4

### Important

- **FR7 MkDocs coverage omits the canonical `documentation.index` field** (`plan.md:582`, `plan.md:584`, `plan.md:588`)
  - Issue: The spec requires `oat docs init` to set `documentation.index` for both scaffold types, with MkDocs using `mkdocs.yml`. The plan only checks `documentation.index` for Fumadocs and falls back to `documentation.config` for MkDocs, leaving the new canonical field partially unplanned.
  - Fix: Update `p02-t05` so the RED/GREEN steps assert and set `documentation.index: "mkdocs.yml"` for MkDocs as well. Keep `documentation.config` only if backward compatibility still requires it.
  - Requirement: FR7

- **The plan body overstates lifecycle readiness** (`plan.md:2`, `plan.md:6`, `plan.md:1150`, `plan.md:1160`)
  - Issue: Frontmatter correctly shows this artifact is still in the plan phase, but the closing section says “Implementation Complete” and “Ready for code review and merge.” That contradiction materially affects readiness because it misrepresents the artifact as execution-complete.
  - Fix: Replace the closing section with a plan-status summary, or rename it accordingly, and remove merge-ready language until implementation and review artifacts actually exist.
  - Requirement: Workflow/readiness

### Medium

- **FR8 preservation stops at scaffold parity and misses downstream MkDocs command compatibility** (`plan.md:1056`, `plan.md:1060`)
  - Issue: The spec explicitly keeps `oat docs analyze` and `oat docs apply` in scope for MkDocs preservation, but `p04-t03` only checks scaffolded template output and config state. The plan leaves the command-compatibility part of FR8 unverified.
  - Fix: Extend `p04-t03` or add a follow-on task that runs `oat docs analyze` and `oat docs apply` against a MkDocs scaffold/fixture and records expected pass criteria.
  - Requirement: FR8

### Minor

None

## Requirements/Design Alignment

**Artifacts available and used:** `plan.md`, `spec.md`, `design.md`
**Background context available but not used as authoritative evidence:** `reviews/artifact-design-review-2026-03-08.md`, `reviews/artifact-design-review-2026-03-08-v2.md`

### Plan Readiness Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| FR1 | partial | Framework choice and Fumadocs scaffold work are planned, but description capture/interpolation is missing. |
| FR2 | covered | Config package, source config, mermaid/callout/search wiring, and downstream validation are planned. |
| FR3 | covered | Transform package includes RED/GREEN unit coverage and package integration steps. |
| FR4 | partial | Component implementation is planned, but the acceptance verification for branding, dark/light mode, and copy button is missing. |
| FR5 | covered | Codemod, frontmatter injection, dry-run/apply behavior, and fixture validation are planned. |
| FR6 | covered | Index generator logic, output contract, config updates, and scaffold script integration are planned. |
| FR7 | partial | The schema extension is planned, but MkDocs does not explicitly set the canonical `documentation.index` field. |
| FR8 | partial | MkDocs scaffold preservation is planned, but downstream MkDocs command compatibility is not. |
| NFR1 | covered | Authoring/render E2E validation is planned. |
| NFR2 | covered | Manual npm/pnpm/yarn verification is planned. |
| NFR3 | covered | Static export and FlexSearch verification are planned. |
| NFR4 | covered | Open-source branding review is planned. |
| NFR5 | covered | Upgrade-path verification is planned. |

### Extra Work (not in declared requirements)

None

## Verification Commands

Run these after updating the plan:

```bash
rg -n "SITE_DESCRIPTION|description prompt|\\{\\{SITE_DESCRIPTION\\}\\}" /Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/docs-framework-migration/plan.md
rg -n "documentation\\.index|mkdocs\\.yml" /Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/docs-framework-migration/plan.md
rg -n "copy button|light/dark|branding props|oat docs analyze|oat docs apply" /Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/docs-framework-migration/plan.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
