---
oat_generated: true
oat_generated_at: 2026-06-20
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: /Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-frozen-cuprate-d30e/.oat/projects/shared/tools-install-additive-scope
---

# Code Review: p01 / final

**Reviewed:** 2026-06-20
**Scope:** Phase p01 (single-phase project — also serves as the final review)
**Commit range:** `bb603fc9..2a6e1738` (implementation) + `1934a059` (review fix I1)
**Tier:** 1 (oat-reviewer, model opus — maximum ceiling)

## Verdict

**pass** — 0 Critical, 0 Important remaining (after fix loop). 1 Important test-quality finding (I1) was raised and resolved; 1 Minor (m1) deferred with rationale.

## Findings

### Critical

None.

### Important

- **I1 — Second new auto-sync test asserted almost nothing; comment was false** (`packages/cli/src/commands/tools/install/index.test.ts`)
  - Issue: the additive `--scope project` over a user-pack test never re-pointed the harness scan (docs stayed at project), so the union was a no-op and `syncScopes` was empty; its only assertion (`.not.toContain('user')`) was trivially satisfied and did not exercise the named scenario.
  - Resolution (commit `1934a059`): parameterized `createHarness({ packScope })`; the test now places docs at `user`, asserts end-state `both`, `installDocs` called with the project root, no `removeDirectory` call, and `syncScopes === ['project']`. The sibling test asserts `['user']`, so both directions of the no-prune guarantee are pinned. **Status: fixed.**

### Medium

None.

### Minor

- **m1 — Outdated-skill refresh on a preserved (non-added) scope is not recorded in `affectedScopes`** (`packages/cli/src/commands/init/tools/index.ts`)
  - Issue: because installs idempotently copy the full desired end-state, a re-run can refresh an outdated skill in a preserved scope, but that scope is intentionally excluded from `affectedScopes`, so it is not auto-synced and its provider views can briefly drift until the next explicit `oat sync`.
  - Disposition: **deferred with rationale.** The reviewer explicitly stated "no change required to ship"; it is consistent with the documented no-prune design intent and similar in flavor to pre-existing behavior. Fixing it would add behavior (adding a refreshed root to `affectedScopes`) plus its own test — scope beyond this finding. Captured as a potential follow-up.

## Requirements Coverage

| Requirement                                                        | Status  | Evidence                                                                                                                    |
| ------------------------------------------------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| Additive default (never removes another scope)                     | covered | `unionScopeWithCurrent`; non-interactive default preserves placement; tests assert user retained → `both`, no removal calls |
| Interactive per-pack end-state selector defaulting to current      | covered | per-pack `selectWithAbort` over project/user/both; default = current placement                                              |
| Removal interactive-only behind one batch confirm; decline = no-op | covered | batch gate; decline returns before any mutation, `affectedScopes: []`                                                       |
| Non-interactive strictly additive, guarded                         | covered | `--scope` union branch + fail-loud guard if removals ever staged non-interactively                                          |
| `affectedScopes` records only changed scopes (original bug)        | covered | gated on real add / confirmed remove; tests assert `syncScopes` is the added scope only                                     |
| Lockstep version bump + regenerated manifest + release:validate    | covered | five public packages 0.1.27→0.1.28; `public-package-versions.json` regenerated; `pnpm release:validate` passed              |

## Accepted Design Deviation

Installs copy the full desired end-state idempotently (not adds-only), with `affectedScopes` restricted to the diff. Reviewer confirmed this is sound and truly non-destructive (re-copies to preserved scopes are no-op skips) and preserves the idempotent-refresh contract. Source of truth: code. No follow-up required.

## Verification

- `pnpm --filter @open-agent-toolkit/cli test`: pass (1837 tests, 204 files)
- `pnpm type-check` (workspace): pass (10/10)
- `pnpm lint` (workspace): pass (10/10)
- `pnpm build` (workspace): pass (5/5)
- `pnpm test` (workspace): pass (10/10) — one earlier transient flake in port-binding smoke tests cleared on re-run
- `pnpm release:validate`: pass (5 public packages at 0.1.28)
