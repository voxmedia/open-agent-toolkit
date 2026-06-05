---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-06-05
oat_generated: false
oat_template: false
---

# Design: docs-authoring-skills

## Overview

This project creates a layered documentation-authoring system for OAT. The agnostic `authoring-docs` skill becomes the reusable baseline for evidence-backed technical documentation across APIs, CLIs, apps, services, libraries/frameworks, monorepos, architecture, operations, and public/internal docs. The `oat-docs-authoring` skill sits on top as a thin OAT/Fumadocs wrapper that teaches the concrete docs-app contract: authored `index.md` local maps, `## Contents`, `.md` links, generated root indexes, plain Markdown defaults, and lifecycle boundaries.

Existing lifecycle skills remain responsible for their workflows. `oat-docs-analyze` should gain repeatable read-only checks for structural drift and generated-index hygiene; `oat-docs-bootstrap` should only receive bootstrap-relevant clarifications, not migration ownership; `oat-docs-apply` and `oat-project-document` should continue to apply approved recommendations and project-derived deltas respectively. The MkDocs-to-OAT-Fumadocs migration work remains a standalone markdown handoff guide that can be given to an agent for the one remaining migration repo.

The design keeps repo-specific improvement artifacts as evidence and follow-up prompts, not as core skill content. This avoids overfitting the skills to individual docs apps while still using the cross-repo analyses to harden the wrapper contract and analyzer checks.

## Architecture

### System Context

The project changes three kinds of repository surfaces: new skill directories, existing OAT docs lifecycle skills, and brainstorm/reference artifacts. The main dependency flow is from research artifacts into skills, then from skills into lifecycle behavior. The imported research pack and generated analyses provide source material; `authoring-docs` distills universal guidance; `oat-docs-authoring` distills the OAT/Fumadocs contract; `oat-docs-analyze` and `oat-docs-bootstrap` consume selected findings as enforcement or scaffold improvements.

**Key Components:**

- **`authoring-docs` baseline:** Reusable, provider-agnostic skill/reference pack for documentation quality, evidence gathering, page types, writing style, category-specific docs guidance, templates, and review rubric.
- **`oat-docs-authoring` wrapper:** OAT-specific wrapper that tells agents how to author or restructure docs inside existing OAT/Fumadocs docs apps without breaking local maps, generated indexes, app shell customizations, or lifecycle boundaries.
- **`oat-docs-analyze` checks:** Read-only analysis improvements that convert repeated drift patterns into actionable findings with evidence.
- **`oat-docs-bootstrap` refinements:** Narrow updates for new docs app scaffolds and post-scaffold checks, excluding migration workflow ownership.
- **Standalone migration guide:** Durable markdown handoff for MkDocs-to-OAT-Fumadocs migration, outside bootstrap ownership.

### Data Flow

1. Brainstorm/research artifacts define standards, findings, and constraints.
2. `authoring-docs` extracts general docs-authoring guidance.
3. `oat-docs-authoring` references the baseline and adds OAT/Fumadocs contract guidance.
4. `oat-docs-analyze` encodes repeatable checks found across existing docs apps.
5. `oat-docs-bootstrap` receives only scaffold-relevant clarifications.
6. Validation confirms skill metadata, package policy, docs/reference consistency, and release readiness.

## Component Design

### `authoring-docs`

**Purpose:** Provide the general-purpose technical documentation authoring baseline.

**Responsibilities:**

- Preserve the imported research pack's evidence-first documentation principles.
- Provide guidance for documentation types: tutorial, how-to, reference, explanation, and runbook.
- Cover category-specific docs needs for APIs, CLIs, apps/services, libraries/frameworks, architecture/operations, and internal/public docs.
- Provide reusable templates and review rubric guidance.
- Avoid OAT/Fumadocs-specific assumptions.

**Interfaces:**

- `SKILL.md` as the primary entry point.
- Reference markdown files for deeper guidance.
- Optional templates/rubric reference files for wrapper and lifecycle skills to consult.

### `oat-docs-authoring`

**Purpose:** Provide the OAT/Fumadocs-specific authoring wrapper on top of `authoring-docs`.

**Responsibilities:**

- Resolve docs app/source roots and read local instructions before authoring.
- Explain the authored `index.md` / `## Contents` contract.
- Require `.md`-suffixed links for new authored navigation entries.
- Distinguish generated app-root indexes from authored source maps.
- Define validation and handoff expectations for targeted docs changes.
- Route broad audits, bulk applies, bootstrap, and project-derived docs deltas to existing lifecycle skills.

**Interfaces:**

- `SKILL.md` as targeted authoring/restructuring entry point.
- Reference files for OAT/Fumadocs contract, workflow, restructure checklist, migration pitfalls pointer, and lifecycle boundaries.

### `oat-docs-analyze` updates

**Purpose:** Convert repeated cross-repo drift patterns into read-only analysis findings.

**Responsibilities:**

- Add checks for generated-index freshness and warning banners.
- Detect local navigation drift: missing/placeholder `## Contents`, missing `index.md`, generated entries unreachable from authored parents.
- Detect link and Markdown hygiene issues: broken links, extensionless links, unlabeled code fences, unexpected `.mdx`, lingering `overview.md`.
- Update reference checklists/templates so findings are evidence-backed and apply-ready.

**Interfaces:**

- Existing `oat-docs-analyze` workflow and analysis artifact template.
- Updated reference files under the skill's `references/` directory.

### `oat-docs-bootstrap` refinements

**Purpose:** Improve new docs app bootstrap guidance without absorbing migration workflow responsibilities.

**Responsibilities:**

- Clarify Fumadocs generated-index behavior and generated-file boundaries.
- Improve post-scaffold checks where they apply to new docs apps.
- Keep MkDocs migration guidance out of bootstrap except as an external guide reference if useful.

**Interfaces:**

- Existing bootstrap `SKILL.md`.
- Bootstrap `AGENTS.md` template and docs/reference guidance where appropriate.

### Migration handoff guide

**Purpose:** Provide a standalone single markdown guide for an agent migrating an existing MkDocs docs app to OAT Fumadocs.

**Responsibilities:**

- Incorporate Duet/Honeycomb migration lessons.
- Include preflight inventory, syntax conversion, render checks, formatter guardrails, OAT config checks, and validation.
- Stay outside bootstrap ownership.

**Interfaces:**

- `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/mkdocs-to-oat-fumadocs-refactor-guide.md`.

## Testing Strategy

Testing should combine skill validation, targeted unit/fixture tests where implementation touches code, artifact review, and repository-level release checks.

### Skill Validation

Run the repository's skill validation command after creating or changing skills. This should catch frontmatter issues, allowed-tools contract problems, and structural skill-format errors.

### Analyzer Behavior Tests

For `oat-docs-analyze` changes, add or update focused tests/fixtures for generated-index freshness, missing/placeholder `## Contents`, extensionless links, broken links, `overview.md`, unlabeled fences, generated warning banners, and stale authoring guidance when the current test structure supports it.

### Bootstrap Checks

For `oat-docs-bootstrap` refinements, validate generated template/reference changes and any existing tests around bootstrap output or skill validation.

### Artifact Validation

Run the OAT plan/artifact review loop for the generated project plan. During implementation, run format/lint/type-check/test commands discovered from repo scripts.

### Release Validation

Because skills and shipped bundled assets may change, include package version checks and `pnpm release:validate` when publishable-package policy applies.

### Manual Review

Inspect the standalone migration guide and new wrapper references for boundary clarity: migration stays standalone; bootstrap does not own migration; `authoring-docs` stays agnostic; `oat-docs-authoring` stays OAT/Fumadocs-specific.

## Open Questions

- Should `authoring-docs` be scaffolded using the agnostic skill workflow or authored directly as a project-local skill after inspecting current repository conventions?
- Which `oat-docs-analyze` checks can be implemented with existing analyzer helpers versus requiring new reusable CLI support?
- Which bootstrap refinements belong in `oat-docs-bootstrap` itself versus docs/reference files?

## References

- Discovery: `discovery.md`
- Brainstorm notes: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/brainstorm-notes.md`
- Wrapper analysis: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/oat-docs-authoring-wrapper-pattern-analysis.md`
- Analyzer recommendations: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/oat-docs-analyze-improvement-recommendations.md`
- Migration guide: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/mkdocs-to-oat-fumadocs-refactor-guide.md`
