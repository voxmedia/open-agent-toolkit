---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-09-20
oat_generated: false
oat_template: false
---

# Discovery: claude-effort-levels

## Initial Request

Extend OAT's reviewer and phase-implementer dispatch to select Claude model and reasoning effort, matching the configurable behavior already available for Codex and Cursor. Include orchestrator awareness: Claude must know when and how to select effort, not merely have generated variants available. Update bundled dispatch ladder recommendations and their documented presentation.

The user confirmed requirements were clear and requested quick-start discovery and a plan on 2026-09-20. This authorizes planning and its configured reviews; implementation is a subsequent action.

## Clarifying Questions

### Question 1: Which Claude control applies?

**Q:** Can effort be passed directly on the Agent call?
**A:** The user supplied Anthropic's shipped-feature explanation: effort belongs in subagent frontmatter or the JSON supplied to `--agents`; there is no per-call Agent effort parameter.
**Decision:** Generate named Claude variants with model and effort in their definitions, and dispatch the selected variant by name.

### Question 2: Is mechanical support sufficient?

**Q:** Should Claude be taught to choose different effort levels?
**A:** Yes, explicitly. Existing Claude selection guidance contains effort recommendations, while workflow instructions still label effort inapplicable.
**Decision:** Update selection, launch, retry, review, and reporting instructions together; verify an orchestrator actually makes and applies distinct choices.

### Question 3: Should defaults be updated?

**Q:** Does OAT have bundled ladder recommendations that should change?
**A:** Yes. The current bundle has model-only Claude candidates, and planning guidance also displays the recommendation.
**Decision:** Add explicit Claude effort candidates to the bundled recommendation, update its version and presentations, and preserve explicit existing configuration during adoption.

### Question 4: Repeated prompts for unrelated workflow gates

**Q:** Is asking a quick project about lite/import-plan gates a workflow bug, and should this work fix it?
**A:** The user reported repeated irrelevant prompts and explicitly requested hardening the prose as part of this work while it is cheap.
**Decision:** Include a bounded shared-instruction fix: offer lifecycle gates only for the active planning workflow and applicable downstream implementation. Add regression coverage; do not redesign gate configuration or disable unrelated gates.

## Solution Space

The selected direction reuses OAT's model-plus-effort target and generated-role pattern. Fixed effort on the two base roles would not provide selectable effort. A hypothetical per-call effort field is unsupported. A separate CLI dispatch architecture is unnecessary for the normal native path.

## Key Decisions

1. Support `oat-reviewer` and `oat-phase-implementer`, including bounded fixes and nested launches using these roles. Generate provider-specific variants without editing installed files by hand.
2. Keep model and effort independent in config, resolution, and evidence. The resolver owns exact selection and dispatch stamps; Claude's agent definition applies effort.
3. Preserve existing model-only candidates and explicit inherit/default behavior. Capped reviewers still use the terminal candidate at their configured ceiling; implementers select eligible candidates by task.
4. Teach Claude selection through the existing provider guidance and lifecycle consumers. Preserve reviewer policy instead of letting reviewers self-select a cheaper effort.
5. Update the bundled Claude ladder and recommendation presentations, preserving Codex/Cursor ladder semantics and explicit user-owned cells. The bundle is a recommendation, not an automatic migration of personal configuration.
6. Keep current model-family eligibility and the Opus-first hard-reasoning/consequential policy. This project adds effort control; it does not re-rank providers or turn every review into maximum effort.
7. Restrict lifecycle-gate setup to the actual workflow path. For quick-start, consider quick-start and implementation; do not prompt for lite, import-plan, or separate plan gates unless entering those workflows. Preserve explicitly configured settings and independent phase-review setup.
8. Proceed straight to a quick plan. The existing generated-role architecture provides the implementation pattern; no separate spec or design artifact is needed.

## Constraints

- No per-call Agent effort argument; choose a role definition with the desired effort. An explicit model argument must agree with that definition.
- Provider-native effort support is model-dependent. Unsupported pairs must not be claimed as enforced targets or silently substituted by OAT.
- Environment overrides, provider limits, and older-runtime behavior can change effective effort. Configured selection and independently observed execution remain distinct evidence.
- Model-only configurations keep their existing launch behavior; omission of effort does not become an implicit newly pinned effort.
- Preserve native-first dispatch, pre-start rejection boundaries, and continuation through accepted child handles.
- Generated projections and bundled output are produced from canonical sources. Follow repository version-bump and verification requirements when implementation ships.
- Do not modify this user's reusable ladders, install globally, publish, or deploy as part of planning.

## Success Criteria

- **SC1:** Same-model/different-effort Claude candidates resolve distinctly for implementer, fix, and reviewer paths; selection and cap/order checks preserve existing policy semantics.
- **SC2:** Sync and managed tool installation/update produce both roles' correctly named Claude definitions with explicit model and effort; regeneration is idempotent and obsolete managed variants can be removed safely.
- **SC3:** A selected native Claude launch uses the exact resolver variant. Missing variants, unsupported effort, or conflicting controls cannot silently fall back to a different target.
- **SC4:** Legacy model-only and inherit/default paths retain their behavior; Codex and Cursor resolution/materialization regressions are covered.
- **SC5:** Guidance explains task-based effort selection and how to execute it. A real Claude orchestration probe demonstrates two task shapes selecting and launching different eligible efforts without embedding the answers in the prompts.
- **SC6:** The versioned bundled recommendation includes useful Claude model-plus-effort candidates, and its documented table matches. Adoption fills missing cells while retaining explicit cells, including old model-only cells.
- **SC7:** Reproducible positive and negative controls cover effort selection, payload/variant mismatch, observed metadata, and preservation of inheritance. Report runtime evidence and limitations honestly.
- **SC8:** Supersede the accepted model-axis-only decision through the repository decision workflow, update docs/skill contracts, bump changed bundled skill/agent versions and public package versions, and pass the required gates.
- **SC9:** Shared planning instructions filter lifecycle-gate setup to the actual workflow path. A quick project with all five gate-aware skills configured offers only quick-start and implementation; no irrelevant mode questions or gate overrides are produced. Other planning entry points get their own relevant gate plus implementation.

## Out of Scope

- Changing the Agent tool schema or treating reasoning prose as an effort control.
- Reworking all providers' policy tiers, automatic economic tuning, or benchmarking all Claude models.
- A new dynamic agent broker, direct Anthropic API dispatcher, or global runtime instrumentation subsystem.
- Automatically replacing installed user ladders, publishing, merging, or deploying during this planning session.
- Implementation in this turn.

## Deferred Ideas

Provider-wide model ranking and broader recommendation refreshes remain separate work unless directly required to express Claude effort.

## Open Questions

No unresolved product requirement blocks plan authoring. Planning setup still needs this project's dispatch ceiling and optional review posture. Implementation must verify the supported model/effort pairs and runtime precedence using current docs and captured real output before claiming live acceptance.

## Assumptions

- The current Claude CLI (observed locally as 2.1.278) supports subagent effort frontmatter and `--agents` JSON. Verify again at implementation time.
- Existing generic target shapes and materialization abstractions can be extended without a config schema migration.
- The user request supplies the fresh capability evidence contemplated by the older model-axis-only decision; supersession will make that change explicit.

## Risks

- **Ignored effort:** Current matching considers effort only for Codex. Add a same-model/different-effort negative control before changing it.
- **False enforcement:** A generated definition proves intent, not effective runtime effort. Capture actual child metadata and account for environment/cap precedence.
- **Incomplete awareness:** Scattered implementation/review instructions currently contradict provider guidance. Inventory all consumers and test the actual selection-to-launch chain.
- **Config drift:** Adoption intentionally preserves explicit old cells. Document opt-in updates instead of overwriting user choices.
- **Decision drift:** An accepted decision forbids Claude effort variants; supersede it with capability and verification evidence.

## References

- [Claude subagents](https://code.claude.com/docs/en/sub-agents): frontmatter, `--agents` fields, and model precedence; inspected 2026-09-20.
- [Claude model configuration](https://code.claude.com/docs/en/model-config): effort support and override precedence; inspected 2026-09-20.
- [Claude changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md): runtime/version verification source.
- Bundled recommendation: `packages/cli/config/dispatch-matrix-recommendation.json` (version `2026-07-27.1` at discovery).
- Existing decisions: `.oat/repo/reference/decisions/DR-260706-claude-remains-model-axis-only.md`, `.oat/repo/reference/decisions/DR-260723-opus-first-claude-routing.md`.

## Next Steps

Complete discovery validation, author and review `plan.md`, resolve planning setup, and stop with an implementation handoff.
