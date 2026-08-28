---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-08-27
oat_generated: false
---

# Discovery: Scope and Adoption Diagnostics

## Initial Request

Create a bounded follow-up to the completed user-scope tool-pack work for the
remaining PJM adoption and scoped-diagnostic defects, plus the associated small
output and test-quality cleanup. This project graduates backlog item
[`BL-260827-correct-scope-and-adoption`](../../../repo/pjm/backlog/items/BL-260827-correct-scope-and-adoption.md).

## Classification

**Well-understood.** The final implementation and review residue identify the
affected behavior, source seams, and regression surfaces. No new architecture,
data model, or public command is required, so this quick workflow goes straight
to a runnable plan without a lightweight design.

## Chosen Direction

Apply the smallest coherent correction at each existing ownership boundary:

- resolve canonical PJM adoption for migration context, but decide whether the
  explicit migration command may write from recognized legacy-source evidence
  rather than project-pack intent or an adoption-state label alone;
- make user-agent reachability diagnostics conditional on the active provider
  materialization contract;
- retain one shared inventory model while making owner attribution and
  inventory-failure rendering precise in both `doctor` and `status`;
- close the known output separator and test-harness quality residue; and
- treat CLI, bundled documentation, and their lockstep public package versions
  as one release unit.

## Key Decisions

1. **Workflow depth:** Use quick mode, straight to plan. The work corrects
   existing contracts and does not need a design artifact.
2. **PJM authority:** Resolve the canonical repository adoption state once for
   context and recovery, but keep recognized legacy input as an independent
   migration precondition. `declared` and `inferred-legacy` are inspected;
   `partial-initialization` and `none` are also inspected because a genuine old
   `reference/` layout may resolve to either state. A complete current layout
   returns `already-migrated`; recognized legacy input may dry-run/apply from
   any state; no recognized input skips with state-specific recovery and zero
   writes.
3. **Provider authority:** Materialization uses the same config-aware adapter
   resolution as sync for the applicable scope: explicitly enabled is active
   even without detection, explicitly disabled is inactive even when detected,
   unset plus detected is active, and unset plus undetected is inactive. Only
   active Codex/Cursor adapters supply the user managed-role extension; Claude
   does not.
4. **Diagnostic consistency:** Human and JSON surfaces continue to consume the
   canonical pack inventory. Failures degrade to explicit diagnostics rather
   than silently falling back or terminating `oat status`.
5. **Test cleanup:** Replace tautological or impossible fixtures with assertions
   that can fail against production behavior; keep process-global test state
   exception-safe.

## Constraints

- Preserve fail-closed PJM writes and the existing adoption states:
  `declared`, `inferred-legacy`, `partial-initialization`, and `none`. Adoption
  labels do not substitute for a legacy-source inventory.
- Do not broaden user-scope agent syncing or change `SCOPE_CONTENT_TYPES`; this
  project reports provider reachability accurately.
- Preserve home-path redaction, bounded path reporting, and hook-mode status
  behavior.
- Shared-owner evidence must not make an uninstalled or unintended pack appear
  installed.
- Shipped CLI/docs changes require all five public package versions to advance
  together above current `origin/main`.

## Success Criteria

- `oat pjm migrate` has regression coverage for every adoption state, current
  and legacy input shapes, and no longer reads project-management pack intent
  as its gate.
- `user-agent-unmaterialized` names every genuinely unreachable managed agent
  for the active provider set without false positives when a Codex/Cursor
  materialization extension is active.
- Shared-owner observations name only applicable installed/intended packs;
  `oat status` returns a structured, human-readable inventory-unavailable state
  instead of throwing; doctor findings cannot split on text embedded in a
  detail.
- Both test-quality follow-up groups are corrected and their focused suites can
  fail on a real behavior regression.
- Focused suites and the repository's complete eight-step CI/release gate
  sequence pass with explicit exit-code evidence.

## Out of Scope

- Portable sibling-skill reference cleanup; it is tracked in the separate
  `portable-skill-references` quick project.
- New tool-pack scope types, provider adapters, migration commands, or manifest
  ownership models.
- Remediating unrelated findings from the broad final review that were not
  accepted into the associated backlog item.

## Risks

- **Provider false classification:** Deriving materialization from filesystem
  presence instead of config-aware active adapters could repeat the original
  bug. **Mitigation:** cover enabled-undetected, disabled-detected,
  detected-unset, and absent-unset cases for Codex/Cursor, plus Claude-only and
  mixed configurations.
- **Legacy migration regression:** Gating directly on adoption state could
  block the old layouts the command exists to migrate. **Mitigation:** test the
  four adoption states independently from recognized legacy evidence and
  assert zero writes when neither current nor legacy evidence permits action.
- **Diagnostic divergence:** Fixing only one renderer would leave human and JSON
  output inconsistent. **Mitigation:** test shared inventory output through
  both `doctor` and `status`.

## Open Questions

None. The migration matrix and provider-activation authority are resolved
above. Managed High dispatch is configured, the additional cross-runtime phase
gate is disabled, and the plan-review outcome remains a workflow gate.

## Next Steps

Review and finalize `plan.md`, resolve dispatch and optional phase-review
policy, then hand the project to `oat-project-implement`.
