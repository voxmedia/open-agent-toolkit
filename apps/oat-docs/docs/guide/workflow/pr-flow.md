---
title: PR Flow
description: 'PR generation inputs, outputs, artifact expectations, and frontmatter handling.'
---

# PR Flow

Two PR paths:

- `oat-project-pr-progress`: progress PR for one phase or partial scope
- `oat-project-pr-final`: final project PR into `main`

## Inputs

Expected artifacts:

- Required (all modes): `plan.md`
- Required (spec-driven mode): `spec.md`, `design.md`
- Optional (quick/import): `spec.md`, `design.md`
- Recommended (quick mode): `discovery.md`
- Recommended (import mode): `references/imported-plan.md`
- Recommended: `implementation.md` final summary
- Recommended: `summary.md` — if present, pr-final uses it as the primary source for the PR Summary section; if absent, pr-final generates it automatically
- Required gate for final PR: review table final row should be `passed`

## Output

Local artifact path:

- `.oat/projects/<scope>/<project>/pr/*.md`

GitHub PR body policy:

- Keep YAML frontmatter in local artifact
- Strip frontmatter from submitted PR body

## Post-PR state

After `oat-project-pr-final` creates the PR, `state.md` transitions to `oat_phase_status: pr_open`. This signals "awaiting human review" rather than "done."

`pr_open` is the routing/review posture. Actual PR existence is tracked separately in:

- `oat_pr_status` — lifecycle state for the PR itself (`ready`, `open`, etc.)
- `oat_pr_url` — the tracked PR URL when a PR exists

From `pr_open`:

- **Feedback received:** run `oat-project-revise` to create revision tasks and re-enter implementation
- **Approved:** run `oat-project-complete` to finalize and archive the project. If `oat_pr_status: open` is already tracked, completion skips asking whether to open a PR again and can show the tracked `oat_pr_url` in its summary.

## Reference artifacts

- `.agents/skills/oat-project-pr-progress/SKILL.md`
- `.agents/skills/oat-project-pr-final/SKILL.md`
- `.oat/projects/<scope>/<project>/pr/`
