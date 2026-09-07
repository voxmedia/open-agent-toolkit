---
oat_generated: true
oat_generated_at: 2026-09-06
oat_pr_type: project
oat_pr_scope: final
oat_project: .oat/projects/shared/lite-workflow-mode
---

# feat: add Lite project workflow

## Summary

Add Lite as a first-class OAT workflow for single-sitting changes that still
benefit from an approved plan, atomic task commits, managed dispatch, and
independent review. Lite uses a focused three-artifact project shape and one
sequential phase, while preserving a safe in-place promotion path to Quick when
scope grows. Its plan depth now adapts to observable product and technical
change, and each task uses a risk-proportionate proof strategy instead of a
mandatory test-first recipe. The change is integrated across the CLI, control
plane, lifecycle skills, provider projections, templates, tests, and user
documentation.

## Goals / Non-Goals

- Provide a batched-interview workflow with one `plan.md` approval for bounded,
  single-sitting work.
- Retain OAT's validation, dispatch ceilings, phase review, final review, and
  configured implementation exit gate.
- Promote oversized Lite projects to Quick without losing project identity or
  authored planning context.
- Preserve numbered Product Behavior and bounded Technical Design when their
  observable triggers apply, without adding those sections to mechanical work.
- Require fail-capable evidence for behavioral risk without rewarding fixtures
  or test harnesses that add no meaningful confidence.
- Keep Lite single-phase and sequential; parallel execution and unresolved
  architecture remain escalation signals.
- Do not rename Quick or make it the default workflow mode in this change; that
  remains separately tracked.

Assurance note: this project itself used OAT's Quick workflow. A formal
`spec.md` was therefore optional; `discovery.md`, the lightweight `design.md`,
the approved `plan.md`, and the implementation ledger formed the project
contract.

## Changes

- Add `lite` to the canonical workflow-mode declaration, parsing, project
  scaffolding, status routing, dashboard, recommender, progress, next-step,
  review, import, brainstorm, PR, and closeout surfaces.
- Add the `plan-lite.md` template and a three-artifact Lite scaffold consisting
  of `plan.md`, `state.md`, and `implementation.md`.
- Add `oat-project-lite` with a batched critical interview, an adaptive
  single-phase plan contract, one approval, plan validation, managed dispatch,
  and independent review. Every plan retains Summary, Decisions, Assumptions,
  Out of Scope, and Validation Criteria; Product Behavior and Technical Design
  are added when their observable triggers apply.
- Add `oat project promote <path> --to quick`, preserving the Lite plan under
  `references/`, carrying Product Behavior and Technical Design into Quick
  discovery, scaffolding a fresh Quick plan, and recording quick-start readiness
  on both project and artifact state.
- Replace mandatory RED/GREEN/refactor wording with task-level proof strategies
  selected for the risk. Keep fail-capable behavioral, bug, UI, and
  assurance-sensitive evidence while allowing focused static or composition
  proof for suitable mechanical or prose changes.
- Add production-derived shared/local promotion controls, fail-capable negative
  controls, provider projections, a disposable end-to-end Lite run, and
  lifecycle documentation.
- Compose native Lite planning with the complete shared lifecycle-gate posture
  contract, including per-gate Keep or Disable choices, non-interactive
  preservation, and `LITE-10` autonomy coverage.
- Integrate Wave 4's delivered-project follow-ups and closeout contracts while
  preserving the five lockstep public packages and bundled release metadata at
  `0.2.60`.

## Verification

- `pnpm check`
- `pnpm type-check`
- `pnpm test`
- `pnpm build`
- `pnpm run check:skill-bumps`
- `pnpm release:check-versions`
- `pnpm release:validate`
- `pnpm build:docs`
- Supplemental isolated-HOME forced tests, smoke tests, skill tests, lint,
  format, focused negative controls, provider sync dry-run, and post-commit
  checks
- Post-Wave-4 focused shared-posture checks: 232/232 contract tests, autonomy
  inventory validation, a no-op project sync dry-run, skill-bump validation,
  lint, and format
- Disposable manual Lite project covering interview, approval, implementation,
  phase/final reviews, exit gate, and PR-description generation

## Reviews

- Independent phase reviews passed for p01 through p06 after bounded fix loops.
- The final configured cross-family Claude/Fable exit gate passed at the
  Important threshold with 0 Critical, 0 Important, 0 Medium, and one Minor
  design-wording finding.
- The Minor finding was aligned to the production-tested artifact-readiness
  behavior under the user's explicit wording-only no-re-review direction.
- Revision p-rev1 completed seven tasks after one recovered execution defect and
  two review-fix loops. Its third independent review passed with 0 Critical,
  0 Important, 0 Medium, and 0 Minor findings.
- Wave 4 integrated from current `main`; its additive execution contracts
  compose with the revised Lite proof strategy, and public release surfaces are
  authoritative at `0.2.60`.
- The post-Wave-4 final review's three Important findings are closed. The
  stabilized p-rev2 re-review found one wording-only Medium alignment issue,
  resolved in `prev2-t04` under the user's no-re-review waiver. All four p-rev2
  tasks and five governed recovery events are complete. The final two test-only
  recoveries made the symlink replacement control deterministic across hosts
  and removed a reproduced SIGTERM readiness race without changing production
  behavior. Focused review, publication, push, and required CI for the exact
  remote head remain pending. This refreshed local body has not been published
  to GitHub.

## References

- [Discovery](https://github.com/voxmedia/open-agent-toolkit/blob/simple-project/.oat/projects/shared/lite-workflow-mode/discovery.md)
- [Design](https://github.com/voxmedia/open-agent-toolkit/blob/simple-project/.oat/projects/shared/lite-workflow-mode/design.md)
- [Plan](https://github.com/voxmedia/open-agent-toolkit/blob/simple-project/.oat/projects/shared/lite-workflow-mode/plan.md)
- [Implementation](https://github.com/voxmedia/open-agent-toolkit/blob/simple-project/.oat/projects/shared/lite-workflow-mode/implementation.md)
- [Project summary](https://github.com/voxmedia/open-agent-toolkit/blob/simple-project/.oat/projects/shared/lite-workflow-mode/summary.md)
