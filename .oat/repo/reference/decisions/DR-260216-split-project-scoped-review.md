---
id: DR-260216-split-project-scoped-review
title: Split project-scoped review from ad-hoc review and default non-project
  artifacts to local-only storage
date: 2026-02-16
status: accepted
legacy_id: ADR-007
---

### ADR-007: Split project-scoped review from ad-hoc review and default non-project artifacts to local-only storage

- **Date:** 2026-02-16
- **Status:** accepted
- **Drivers:** Avoid forcing project lifecycle assumptions on ad-hoc review requests; reduce accidental source-control churn for local-only review artifacts.
- **Related:**
  - `.agents/skills/oat-project-review-provide/SKILL.md`
  - `.agents/skills/oat-review-provide/SKILL.md`
  - `.agents/skills/oat-review-provide/scripts/resolve-review-output.sh`
  - `docs/oat/workflow/reviews.md`

#### Context

`oat-project-review-provide` assumes active project state (`.oat/active-project` + project `state.md`) and writes artifacts into project-local `reviews/`. This is correct for lifecycle-managed work, but fails for users who want review of arbitrary commit ranges, staged/unstaged diffs, or pre-existing files outside a project flow.

#### Options Considered

1. Keep a single project-scoped review skill and attempt to infer fallback behavior when state is missing
2. Split into project-scoped and ad-hoc review skills, with explicit routing and storage policy
3. Force users to initialize/open a project before any review can run

#### Decision

Adopt option 2:

- Keep `oat-project-review-provide` project-scoped and require valid project state.
- Add `oat-review-provide` for ad-hoc/non-project review scopes.
- For ad-hoc artifacts, default storage to local-only `.oat/projects/local/orphan-reviews/`.
- If `.oat/repo/reviews/` already exists and is not gitignored, treat that as explicit tracked-storage intent.
- Allow explicit override to tracked/custom destination or inline-only output.

#### Consequences

- Positive:
  - Clearer contracts: project lifecycle review vs ad-hoc review are no longer conflated.
  - Lower risk of unintentionally committing transient review artifacts.
  - Better support for real-world review requests (branch range, staged/unstaged, explicit files).
- Trade-offs:
  - Additional skill to document and maintain.
  - Review guidance must explicitly route users when project state is missing.

#### Follow-ups

- Add ad-hoc receive/intake flows (`oat-review-receive`, PR-comment ingestion) when ready.
- Keep project review and ad-hoc review templates aligned on severity model and output shape.

---
