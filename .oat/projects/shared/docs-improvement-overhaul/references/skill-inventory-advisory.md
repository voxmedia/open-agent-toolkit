# Fable skill inventory advisory

**Source:** Fable 5.1's final advisory message, 2026-10-01. Fable attributed enumeration/classification to an Opus lane and reported spot-checking flags and drift against source. These are retained peer findings, not a complete root-reproduced audit. The subsequently supplied [full matrix and sidebar probe report](skill-inventory-matrix.md) is Fable's transcription, with its verification limits retained. Validate public-support intent before relying on an exact public coverage total.

## Reported inventory

| Classification                            | Count |
| ----------------------------------------- | ----: |
| Project lifecycle                         |    30 |
| Ideas                                     |     4 |
| Waves                                     |     2 |
| Docs lane                                 |     5 |
| Project management                        |     5 |
| Standalone                                |    21 |
| Ambiguous ownership                       |     4 |
| Internal / retired / unshipped candidates |    12 |
| Total                                     |    83 |

Subtracting the 12 internal candidates gives approximately 71 user-facing candidates, **not a confirmed supported catalog**.

### Internal classification evidence

- Explicit `user-invocable: false`: `oat-dispatch-subagents`, `oat-project-dispatch-subagents`, `oat-project-plan-writing`, `oat-worktree-bootstrap-auto`.
- Retired: `review-backlog`, `update-repo-reference`.
- Unshipped or repository-only candidates: `codex-skill`, `create-oat-skill`, `create-pr-description`, `create-ticket`, `docs-completed-projects-gap-review`, `triage-oat-issues`. Only `triage-oat-issues` explicitly declares repository-only distribution; the others were inferred from absence in packs. Their public-support intent is unresolved.

## Classification exceptions

- Active-project-required is not the lifecycle boundary. Entry skills new, quick-start, lite, import-plan, and capture operate without an active project. No machine-readable prerequisite field currently supports generating that badge.
- Four `oat-review-*` and four `oat-project-review-*` skills share the existing reviews guide and its Project vs ad-hoc explanation. Retain one Review family rather than splitting by section.
- Project-free chains include docs bootstrap/analyze/apply, agent-instructions analyze/apply, and maintainability-review → repo-improve → import-plan. Canonical family ownership handles these better than a standalone/lifecycle split.
- Ambiguous owners: `oat-brainstorm` → Skills; `oat-explainer-kit` → existing Explainer Kit page; `oat-worktree-bootstrap` → Workflows advanced; `oat-cursor-cloud-projects` → existing Cursor Cloud page. These are agent recommendations, pending user approval.
- Packs do not map to these classes: the workflows pack also ships `oat-wrap-up` and `oat-repo-knowledge-index`.

## Reported catalog drift

Fable reported these ten names absent from the whole current Skills page:

- `oat-cursor-cloud-projects`
- `oat-dispatch-subagents`
- `oat-docs`
- `oat-doctor`
- `oat-pjm-decision`
- `oat-project-autonomous`
- `oat-project-dispatch-subagents`
- `oat-project-revise`
- `oat-project-summary`
- `triage-oat-issues`

No phantom names were reported. Some absences are internal helpers, so ten absent names does not mean ten public documentation defects. A supported inventory needs explicit visibility policy and canonical ownership before it becomes a completeness check.

## Reported content gaps

One-line coverage candidates: `analyze`, `compare`, `deep-research`, `skeptic`, `synthesize`, `oat-repo-maintainability-review`, `oat-wrap-up`.

Missing substantive-guide candidates: `oat-repo-knowledge-index`, `oat-project-reconcile`, `oat-project-clear-active`, `oat-project-open`.

**Root qualification:** All four latter names are present in the current Skills page (including a resume entry for `oat-project-open`). Therefore “nothing” in the advisory must not be treated as literal absence of mentions. The open question is useful guidance depth and canonical ownership, to be checked across the full docs tree before authoring.

New substantive guides are coverage work, not merely a no-removal content move. Preserve that distinction in scope and review.
