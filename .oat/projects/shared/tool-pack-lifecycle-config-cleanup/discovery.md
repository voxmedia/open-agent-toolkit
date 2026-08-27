---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-08-27
oat_generated: false
---

# Discovery: Tool-Pack Lifecycle and Config Cleanup

## Initial Request

Create a bounded follow-up to the completed user-scope tool-pack project for
the five residual Medium findings identified during final closeout review. This
project graduates backlog item
[`BL-260827-clean-up-tool-pack-lifecycle`](../../../repo/pjm/backlog/items/BL-260827-clean-up-tool-pack-lifecycle.md).

## Classification

**Well-understood.** Every behavior is already located in the shipped lifecycle
or configuration implementation, and the expected correction is explicit. No
new architecture, data model, or public command is required, so this quick
workflow goes straight to a runnable plan without a design artifact.

## Chosen Direction

Correct each inconsistency at its existing authority boundary:

- inventory seed-if-missing assets and versioned skills/agents using content
  evidence, not presence or version metadata alone;
- make legacy project-pack adoption report the exact intents it writes;
- prevent the generic config setter from creating a legacy-conflict state; and
- remove the inert per-pack `--force` surface unless implementation reveals a
  real supported behavior that warrants retaining it.

## Key Decisions

1. **Workflow depth:** Quick mode, straight to plan. The review already fixed
   scope and success criteria.
2. **Content authority:** Bundled and installed digests determine content
   equality. Skill/agent versions remain useful metadata but cannot suppress a
   content-drift signal.
3. **Adoption reporting:** Reconciliation reports the exact pack intents newly
   adopted, while preserving idempotent no-op behavior.
4. **Legacy config state:** Existing `false` values remain readable migration
   input, but supported commands do not create new ones.
5. **CLI surface:** Prefer removing the ignored per-pack `--force` flag rather
   than inventing destructive or overwrite semantics late in the lifecycle.

## Constraints

- Preserve user overrides for seed-if-missing assets; classification must not
  overwrite them.
- Preserve version comparison and malformed/missing metadata behavior while
  adding content-drift evidence.
- Do not change the unified pack lifecycle's additive install contract.
- Keep config writes schema-valid and provide an actionable error or supported
  alternative when a caller attempts to set a pack intent to `false`.
- Shipped CLI or docs changes require all five public package versions to move
  together above current `origin/main`.

## Success Criteria

- Unchanged seed-if-missing assets are distinguishable from retained overrides.
- Same-version but changed skill/agent content is reported as drift.
- Legacy reconciliation returns or renders the exact adopted pack set and is
  unchanged on a second run.
- The config command cannot write a new `tools.<pack>: false` conflict state.
- Per-pack help no longer advertises an unused `--force` option.
- Focused suites and the complete CI/release gate sequence pass.

## Out of Scope

- Portable cross-skill references; owned by `portable-skill-references`.
- PJM migration eligibility and provider-aware diagnostics; owned by
  `scope-adoption-diagnostics`.
- New pack types, scopes, manifest ownership modes, or destructive update
  behavior.

## Risks

- **Digest cost:** Recursively hashing versioned assets could make inventory
  needlessly expensive. Mitigate by reusing existing bounded digest helpers and
  measuring only managed inventory paths.
- **False drift:** Generated or ignored files could create noisy differences.
  Mitigate by matching the same canonical materialization boundary used by
  install/update and pinning representative fixtures.
- **Compatibility:** Tightening `config set` can break scripts that wrote
  unsupported `false` values. Mitigate with explicit error text and upgrade
  guidance where public behavior changes.

## Open Questions

None. The final review established the expected dispositions, and the user
authorized seeding implementation-ready quick projects for closeout follow-up.

## Next Steps

Finalize and review `plan.md`, then hand the project to
`oat-project-implement` when the follow-up is prioritized.
