---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-14
oat_generated: false
---

# Discovery: sync-install-cross-pack-removal

## Initial Request

Fix the sync-planning bug where `oat tools install <pack>` can delete provider-view files for unrelated packs when stale manifest entries remain and the canonical scan does not return those entries.

## Clarifying Questions

### Question 1: Workflow

**Q:** Which workflow should be used for this fix?
**A:** Quick workflow (`2`)
**Decision:** Proceed with a bounded repro, conservative engine fix, and regression coverage without adding a spec/design phase.

## Options Considered

### Option A: Scope auto-sync removals to the installed pack

**Description:** Thread install-pack context into auto-sync and suppress removal planning outside that pack during post-install sync.

**Pros:**

- Matches the immediate failure mode closely
- Leaves full sync behavior unchanged

**Cons:**

- Requires new plumbing from install into sync/engine
- Risks introducing divergent behavior between auto-sync and direct `oat sync`

**Chosen:** B

**Summary:** Prefer a smaller engine-side guard that treats missing canonical content more defensibly when only stale manifest entries remain.

### Option B: Ignore stale manifest-only entries when canonical content is absent

**Description:** Narrow removal planning so manifest entries are only removed when the provider path still represents a sync-managed artifact that can be safely tied to the current canonical view.

**Pros:**

- Conservative change in the removal pass
- Covers install-triggered sync without changing pack manifests or manifest format

**Cons:**

- Leaves some stale manifest data behind unless separately pruned
- Needs careful test coverage to avoid masking legitimate removals

**Chosen:** B

**Summary:** This is the smallest defensible fix if reproduction confirms the removal pass is treating manifest state as authoritative when canonical content was never part of the current install.

## Key Decisions

1. **Fix scope:** Reproduce first, then patch conservatively in sync planning rather than refactoring install architecture.
2. **Regression coverage:** Add a test that proves stale manifest entries for unrelated packs do not produce provider removals in the install-triggered scenario.

## Constraints

- Do not change tool-pack manifests such as `DOCS_SKILLS` or `WORKFLOW_SKILLS`.
- Do not redesign manifest format unless reproduction proves it is unavoidable.
- Keep the fix limited to the smallest viable engine/install boundary.

## Success Criteria

- Reproduction confirms the unrelated-pack removals are caused by stale manifest entries plus missing canonical content.
- `oat tools install docs` no longer plans or applies removals for unrelated packs in that scenario.
- A regression test fails before the fix and passes after it.

## Out of Scope

- Install-scope UX improvements
- Config-schema or manifest redesign beyond what the bug strictly requires

## Deferred Ideas

- Manifest-pruning follow-up - useful if stale entries should be cleaned up proactively, but not required for this bugfix
- Broader sync/install architecture cleanup - explicitly deferred unless the conservative fix fails

## Open Questions

- **Repro path:** Is the failing behavior easiest to prove at the `computeSyncPlan` layer or only through install-triggered command flow?
- **Removal semantics:** What signal best distinguishes a legitimate deletion from stale manifest drift?

## Assumptions

- The removal bug is rooted in `packages/cli/src/engine/compute-plan.ts`.
- The install command itself is not copying unrelated provider assets.

## Risks

- **Over-suppressing removals:** A conservative guard could leave behind entries that should be removed after an intentional deletion.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Keep the condition narrow and back it with targeted tests for legitimate deletion behavior.
- **Missing the real entry point:** The install-triggered behavior could depend on command-level scoping outside `computeSyncPlan`.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Reproduce through source-level tests before choosing the final patch point.

## Next Steps

Proceed directly to `plan.md`, then implement the fix and regression test in the same session.
