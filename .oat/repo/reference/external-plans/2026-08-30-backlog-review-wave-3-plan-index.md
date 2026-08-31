---
oat_generated: true
oat_external_plan_index: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
oat_external_plan_commit: 2c6005d64f45a19e8b9eedbc977959b066d3eda0
oat_external_plan_date: '2026-08-31'
created: '2026-08-31T00:01:21Z'
---

# External Plan Index: Backlog review Wave 3

This index records selection and ordering. It is not an executable plan and is
not an `oat-project-import-plan` target.

## Selection

- Selected: five bounded outcomes. All five are plan-ready and have no
  unsatisfied hard dependency.
- Deferred/rejected:
  - [BL-260827-span-based-prose-guards](../../pjm/backlog/items/BL-260827-span-based-prose-guards.md)
    is not plan-ready. The shared runner contract, structural anchor/probe
    record, migration roster, and ownership boundary remain unresolved. Keep
    the narrow codex-skill guard independent.
  - [BL-260713-root-agent-judgment-logging](../../pjm/backlog/items/BL-260713-root-agent-judgment-logging.md)
    is substantially implemented by the root-owned project-log append points
    landed with PR #156 and the reviewer prohibition at
    `.agents/agents/oat-reviewer.md:113-116`. Archive the broad item after a
    focused confirmation; fold only the residual trigger wording—breaks,
    surprises, workarounds, and notable successes—into existing ReviewPlan or
    review/gate-integrity workflow ownership rather than opening a project.
- Administrative normalization:
  - `BL-260818-extend-guarded-prose-contract` and
    `BL-260818-require-repo-wide-call-site` each contain a duplicate placeholder
    Acceptance Criteria section. Remove it during authorized backlog cleanup,
    not by changing implementation scope in this planning run.
  - Do not create another repo-improve follow-up for external-plan readiness;
    `BL-260830-distinguish-external-plan` already owns that exact contract.
- Unaudited or out of scope: implementation, plan import, current leaked smoke
  resource deletion, active-project edits, PR/issue mutation, and backlog
  status/archive changes.

## Recommended order

| Order | Plan                                                                                                                           | Source item                                | Execution | Depends on                                     | Rationale                                                                                                |
| ----- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | --------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1     | [Harden the codex-skill below-floor anaphora guard](./2026-08-30-harden-codex-skill-anaphora-guard.md)                         | `BL-260827-harden-the-codex-skill-below`   | READY     | None; broad span runner is explicitly separate | Smallest independent regression guard.                                                                   |
| 2     | [Guard docs-app mirrors of contract-tested skill prose](./2026-08-30-guard-docs-app-mirrors-of-skill-prose.md)                 | `BL-260818-extend-guarded-prose-contract`  | READY     | PR #196 is merged evidence                     | Focused test hardening with no policy design.                                                            |
| 3     | [Require repo-wide call-site sweeps for cross-cutting options](./2026-08-30-require-repo-wide-call-site-sweeps.md)             | `BL-260818-require-repo-wide-call-site`    | READY     | Broader recurring-gate item is soft only       | Bounded phase-agent contract with a known historical reproduction.                                       |
| 4     | [Require executable backstops for standing contract claims](./2026-08-30-require-executable-backstops-for-contract-claims.md)  | `BL-260714-executable-backstops`           | READY     | Existing precedents only                       | Authoring-policy change should follow the two concrete guard plans if one branch executes them together. |
| 5     | [Journal deterministic smoke worktrees before creation](./2026-08-30-journal-deterministic-smoke-worktrees-before-creation.md) | `BL-260826-deterministic-smoke-tier-leaks` | READY     | Existing manifest safety invariant             | Independent tooling lane; highest safety review burden despite bounded code scope.                       |

## Dependency notes

- Plans 1–4 are peer lanes, not a hard serial chain. If implemented concurrently,
  they share public package versions and `pnpm-lock.yaml`; coordinate or rebase
  rather than merging version edits blindly.
- Plan 4 may cite plans 1–2 as fresh examples if they land first, but its
  authoring contract does not require them.
- Plan 5 is code-path independent from plans 1–4. Its docs update may share
  public release files, and its cleanup behavior requires a dedicated
  ownership/security review.
- The smoke plan deliberately narrows the source item's unsafe prefix-pruning
  suggestion. Existing residue is administrative evidence, not cleanup
  authority; only manifest-reserved and corroborated resources are removable.
- Every selected plan was revalidated against full `origin/main` SHA
  `2c6005d64f45a19e8b9eedbc977959b066d3eda0` and contains its own drift and
  revalidation contract.
