---
oat_generated: true
oat_generated_at: 2026-06-20
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: /Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-frozen-cuprate-d30e/.oat/projects/shared/tools-install-additive-scope
---

# Code Review: final

**Reviewed:** 2026-06-20
**Scope:** final code review for `e292ca7d36d11c10134cf35ef18636e66d145031..HEAD`
**Files reviewed:** 17
**Commits:** 20 commits in range

## Summary

The branch implements the additive install model, per-pack interactive end-state selector, non-interactive no-remove behavior, scoped auto-sync tests, docs/ADR updates, and the required lockstep public-package version bump. I found one important correctness issue in the confirmed-removal flow: when a user chooses a different single scope, the old scope is deleted before the replacement install succeeds. The prior deferred minor about refreshed preserved scopes not entering `affectedScopes` remains acceptable for this final review because it is consistent with the no-prune design trade-off and is now documented as a follow-up in ADR-021.

## Findings

### Critical

None

### Important

- **I1 - Confirmed scope moves remove the existing scope before the replacement install succeeds** (`packages/cli/src/commands/init/tools/index.ts:953`)
  - Issue: After the batch confirmation, `runInitTools` applies every `stagedRemoval` immediately at lines 953-955, before the pack-specific installer blocks begin at line 974. For a valid interactive move such as a pack currently at `user` with desired end-state `project`, reconciliation contains both `+ pack@project` and `- pack@user`; if the project install then throws, the preserved user install has already been deleted and the pack can be left unavailable in either scope.
  - Fix: Apply successful additions before destructive removals. One bounded fix is to run installers for scopes in `reconciliation.adds` first, record those added scopes, and call `removePackFromScope` only after the replacement add phase succeeds; add a regression test that mocks an install failure for current `user` -> desired `project` and asserts the user-scope removal is not attempted.
  - Requirement: Design data flow requires applying `adds` and then confirmed `removes` (`.oat/projects/shared/tools-install-additive-scope/design.md:86`, `.oat/projects/shared/tools-install-additive-scope/design.md:114`).

### Medium

None

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `design.md`, `plan.md`, `implementation.md`, archived prior final review for deferred-ledger context, changed CLI code/tests, docs page, ADR, and public-package version files.

### Requirements Coverage

| Requirement                                                                            | Status                                      | Notes                                                                                                                                                                 |
| -------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Additive install default: installing at one scope never silently removes another scope | implemented                                 | `unionScopeWithCurrent` and non-interactive preservation produce `both` where required; tests assert no `removePackFromScope` on additive installs.                   |
| Interactive per-pack end-state selector defaulting to current placement                | implemented                                 | `selectWithAbort` per user-eligible pack offers `project`, `user`, and `both`; tests cover defaults and current-placement labels.                                     |
| Removals are interactive-only and batch-confirmed; decline mutates nothing             | partial                                     | Confirmation and decline behavior are implemented, but confirmed move-like changes apply removals before replacement additions, creating the I1 failure window.       |
| Non-interactive `--scope project                                                       | user` and default set are strictly additive | implemented                                                                                                                                                           | Explicit scope resolution unions with current placement and a non-interactive removal guard fails loud if removals are ever staged. |
| Auto-sync no-prune guarantee for additive installs                                     | implemented                                 | `affectedScopes` records added/confirmed-removed scopes for user-eligible packs; tests assert additive user->project and project->user sync only the added scope.     |
| Docs, ADR, and release guardrails                                                      | implemented                                 | Tool-pack docs and ADR-021 describe additive install behavior; all five public packages and bundled version manifest are at `0.1.28`; `pnpm release:validate` passed. |

### Deferred Findings Disposition

- Prior deferred m1 (`reviews/archived/final-review-2026-06-20.md`): outdated-skill refresh on a preserved, non-added scope is not recorded in `affectedScopes`. **Disposition: still acceptable to defer.** The behavior is consistent with the no-prune design, fixing it would add new behavior and tests beyond the current bug fix, and ADR-021 now records it as a follow-up (`.oat/repo/reference/decision-record.md:1016`).

### Extra Work (not in declared requirements)

- Installs copy the full desired end-state idempotently rather than additions only. This differs from the original design wording but is defensible, documented in `implementation.md`, and reflected in ADR-021 as the chosen way to preserve idempotent refresh behavior; no code fix required.

## Verification Commands

Run these to verify the implementation and the required release guardrails:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/index.test.ts src/commands/tools/install/index.test.ts
pnpm --filter @open-agent-toolkit/cli lint
pnpm --filter @open-agent-toolkit/cli type-check
pnpm release:validate
pnpm run cli -- project validate-plan --project-path .oat/projects/shared/tools-install-additive-scope
```

Commands run during review:

- `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/index.test.ts src/commands/tools/install/index.test.ts` - passed, 48 tests
- `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check` - passed
- `pnpm release:validate` - passed for 5 public packages at `0.1.28`
- `pnpm run cli -- project validate-plan --project-path .oat/projects/shared/tools-install-additive-scope` - passed

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
