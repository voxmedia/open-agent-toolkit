---
oat_generated: true
oat_generated_at: 2026-05-17
oat_review_scope: prev1-prev7
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/subagent-model-selection
---

# Code Review: prev1-prev7

**Reviewed:** 2026-05-17
**Scope:** Seven revision rounds (`prev1`-`prev7`) plus project bookkeeping/release commits, range `491faa172a0c32b4b27515013a6f2c598f7183f9..HEAD` (23 commits)
**Files reviewed:** 19 non-project-artifact files (orchestrator skill, two agent prompts, plan-writing skill, plan template, docs page, 4 new/changed Codex TOML views, config.toml, new TypeScript + test, 5 package.json bumps)
**Workflow mode:** quick

## Summary

The seven revision rounds land in a coherent end state for the most part: the two-axis dispatch contract (`model_axis` / `effort_axis`, four states each) is consistent across `oat-project-implement` SKILL.md, both agent prompts, the docs page, and the managed Codex views, with no leftover single-axis `dispatch_control` vocabulary anywhere in scope. The new TypeScript (`sync-extension.ts` effort-variant generation) is correct, well-tested, type-checks, lints clean, and the managed-view sync is idempotent. All verification commands pass (5/5 sync-extension tests, sync dry-run clean, skill version bumps validated, docs build, release validation for all five packages at 0.0.70).

The findings are about internal coherence drift from layering seven revisions: two escalation/invariant passages in the orchestrator skill still reference the pre-prev7 one-line `Dispatching ...` log format that prev7 replaced, one escalation example uses `effort_axis=selected:xhigh` which directly contradicts the prev6/prev7 "xhigh is inherited-only, never a selectable variant" rule, and the review-dispatch contract logs `effort_axis=inherited` on Claude Code where the implementer-dispatch rule says Claude Code's effort axis is always `not-applicable`. `design.md` carries a Revision 2 + Revision 3 audit trail and is acceptably current. No Critical findings.

## Findings

### Critical

None.

### Important

- **Escalation example contradicts the xhigh-is-inherited-only contract** (`.agents/skills/oat-project-implement/SKILL.md:610`)
  - Issue: The escalation history-note example reads `Dispatch: p03 escalated to model_axis=selected:opus, effort_axis=selected:xhigh after repeated review failures.` prev6 and prev7 establish — in this same file (line 194), in `oat-project-plan-writing/SKILL.md`, and in `.oat/templates/plan.md` — that `xhigh` is inherited-only and that the orchestrator must never select or create an `xhigh` implementer variant. `effort_axis=selected:xhigh` is exactly the construct the rest of the contract forbids; an orchestrator following this example during escalation would emit an invalid dispatch state. The model side is also questionable: `model_axis=selected:opus` as a Codex escalation example conflicts with the contract's "in Codex, the model axis normally logs `inherited`" guidance (line 183), though `selected` is at least a legal model state.
  - Fix: Replace the xhigh escalation example with a contract-legal one — e.g., `Dispatch: p03 escalated to effort_axis=selected:high after repeated review failures.` If the intent is to illustrate escalation past `high`, describe the inherited-only path instead: escalate by stopping for user re-invocation at xhigh, splitting, or revising the phase, consistent with line 194 and §3.3 of the design.
  - Requirement: Discovery key decision "Escalation is behavioral, not permission math"; success criterion "plan.md template documents optional override-only Dispatch Profile syntax" (xhigh semantics).

### Medium

- **Stale one-line `Dispatching ...` log-format references survive prev7's structured-block rewrite** (`.agents/skills/oat-project-implement/SKILL.md:188`, `:565`)
  - Issue: prev7 (`36098f2e`) deliberately replaced the compact `Dispatching {phase} with ...` log line with the structured `OAT Dispatch:` block (lines 225-270). But two passages authored in earlier revisions still cite the removed format verbatim. Line 188 (payload-first invariant, prev5): "Do not print a `Dispatching ... effort_axis=selected:<value>` or `Dispatching ... model_axis=selected:<value>` line until ...". Line 565 (pre-dispatch assertion, prev3/prev5): "Then derive the `Dispatching ... effort_axis=selected:<value>` line from that same argument map." An orchestrator now logs an `OAT Dispatch:` block with an `Effort axis:` field, so these instructions reference a log shape that no longer exists. The intent is still followable, but the literal vocabulary is internally inconsistent with the canonical block introduced one revision later.
  - Fix: Update both passages to reference the structured block, e.g. "Do not print the `OAT Dispatch:` block with an `Effort axis: selected:<value>` line until the corresponding host-tool selection is present in the argument map" and "derive the `Effort axis:` field of the `OAT Dispatch:` block from that same argument map."

- **Review dispatch logs `effort_axis=inherited` on Claude Code, contradicting the host's `not-applicable` effort axis** (`.agents/skills/oat-project-implement/SKILL.md:282`, `:639-643`; `.agents/agents/oat-reviewer.md:53`; `.codex/agents/oat-reviewer.toml`; `apps/oat-docs/docs/workflows/projects/implementation-execution.md:106`)
  - Issue: The contract states uniformly that review dispatch records `model_axis=inherited, effort_axis=inherited` on every host. But the implementer-dispatch rule (line 184, line 192) establishes that Claude Code has no per-dispatch `reasoning_effort` control at all, so its effort axis is always `not-applicable` — and the four-state definition (line 60-62, design Revision 2) defines `not-applicable` as "this host/API has no meaningful per-dispatch concept for that axis" while `inherited` means "the host exposes the axis and the orchestrator deliberately defers." A Claude Code review therefore should log `effort_axis=not-applicable`, not `effort_axis=inherited`; logging `inherited` asserts the host exposes an effort axis it does not. This is the same single-axis-collapse problem prev2 set out to fix, re-introduced for the review path.
  - Fix: Make the review-dispatch effort axis host-conditional: `effort_axis=inherited` on Codex, `effort_axis=not-applicable` on Claude Code. The simplest wording is "record `model_axis=inherited`; record `effort_axis=inherited` on hosts that expose an effort axis (Codex) and `effort_axis=not-applicable` on hosts that do not (Claude Code)." Apply consistently across SKILL.md:282 and :639-643, oat-reviewer.md:53 (and re-sync `.codex/agents/oat-reviewer.toml`), and the docs page.

### Minor

- **Step 3 of the Codex per-phase loop still says "Dispatch `oat-phase-implementer`" generically** (`.agents/skills/oat-project-implement/SKILL.md:573`)
  - Issue: After the pre-dispatch assertion (step 2) correctly maps Codex selected effort to `oat-phase-implementer-{low,medium,high}`, step 3 reads "Dispatch `oat-phase-implementer` (Tier 1 ...) with the Phase Scope block ... and with the asserted host invocation parameters." The base role name is technically only correct for `effort_axis=inherited`. The "asserted host invocation parameters" clause carries the real intent, so this is not misleading in practice, but the literal base-role name is a small coherence wrinkle.
  - Suggestion: Reword to "Dispatch the asserted phase-implementer role" or "Dispatch the implementer role selected in step 2" to match the variant mapping.

- **prev1 and prev2 changed canonical skill/agent content without bumping `version:` in the same commit** (`.agents/skills/oat-project-implement/SKILL.md`, `.agents/agents/oat-phase-implementer.md`)
  - Issue: Commit `8ce52f04` (prev1) and `aa06e926` (prev2) both edited `oat-project-implement/SKILL.md` content; `aa06e926` also edited `oat-phase-implementer.md`. Neither commit bumped the respective `version:` field — the bumps were absorbed by the later prev3 commit (`6e49cca0`). The PR-scoped AGENTS.md rule ("one bump per changed skill in the final PR diff") and the `validate-skill-version-bumps` guardrail both pass for the cumulative range (2.0.7→2.0.13). However, the user's standing dogfooding note (`feedback_skill_version_per_content_release.md`) asks for a bump per shipped stage on a branch so the update flow can be exercised per revision. The net-range bump satisfies the canonical rule; flagging only for the dogfooding-cadence expectation.
  - Suggestion: For future revision rounds, bump the touched skill/agent `version:` in the same commit that changes its content. No action needed for this range — the guardrail passes and the cumulative versions are monotonic.

## Spec/Design Alignment

**Evidence sources used:** `discovery.md`, `design.md` (with Revision 2 and Revision 3 audit-trail sections), `plan.md`, `implementation.md`. This is a quick-mode project; `spec.md` is present but discovery + design + plan are the operative requirement sources for the dispatch contract.

### Requirements Coverage

| Requirement (discovery success criteria / revision intent)                                                           | Status      | Notes                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two-axis dispatch contract (`model_axis`/`effort_axis`, 4 states) consistent across skill, agents, docs, Codex views | implemented | No leftover `dispatch_control` single-axis vocabulary in any scope file; managed views mirror canonical `.md` exactly.                                                                                                                                     |
| Selected axis values wired to host dispatch API (prev3/prev5)                                                        | implemented | Payload-first invariant + pre-dispatch assertion + post-spawn verification gate present and mutually consistent.                                                                                                                                           |
| Codex selected effort maps to effort-specific implementer roles (prev6)                                              | implemented | `oat-phase-implementer-{low,medium,high}` generated, registered in `.codex/config.toml`, base role = inherited effort.                                                                                                                                     |
| Structured `OAT Dispatch:` log block (prev7)                                                                         | partial     | Block is defined and used in examples, but two earlier passages (SKILL.md:188, :565) still cite the removed one-line format — see Medium finding.                                                                                                          |
| `xhigh` is inherited-only, never a selectable variant (prev6/prev7)                                                  | partial     | Contract states this in 3 places, but escalation example at SKILL.md:610 uses `effort_axis=selected:xhigh` — see Important finding.                                                                                                                        |
| Review dispatch inherits parent controls unless overridden (prev1)                                                   | partial     | Correct intent, but `effort_axis=inherited` on Claude Code contradicts that host's `not-applicable` effort axis — see Medium finding.                                                                                                                      |
| Claude Code capability accuracy (model selectable, effort not-applicable)                                            | implemented | Wording consistent and accurate across SKILL.md:184/192, reviewer prompt, docs; no misrepresentation.                                                                                                                                                      |
| Effort variants are coherent variants of canonical base role                                                         | implemented | Variant TOML bodies are byte-identical to base except `# oat-role:` header and one inserted `model_reasoning_effort` line.                                                                                                                                 |
| Managed Codex view sync                                                                                              | implemented | `sync --scope project --dry-run` reports all 7 roles + config in sync.                                                                                                                                                                                     |
| Lockstep public package bump                                                                                         | implemented | All five packages bumped 0.0.69 → 0.0.70; `release:validate` passes.                                                                                                                                                                                       |
| Skill version bumps present and monotonic                                                                            | implemented | `oat-project-implement` 2.0.7→2.0.13, `oat-project-plan-writing` 1.2.2→1.2.3, `oat-phase-implementer` 1.0.0→1.0.1; validator passes. Per-commit cadence note is Minor only.                                                                                |
| `design.md` current with implementation                                                                              | implemented | design carries Revision 2 (two-axis) and Revision 3 (structured blocks + role variants) audit-trail sections that explicitly point readers to `oat-project-implement` as canonical and flag the superseded single-axis subsections. Not materially behind. |

### New TypeScript review (`sync-extension.ts` + `.test.ts`)

The effort-variant generation is the first executable code in this project and was reviewed for correctness:

- **Correctness:** `codexEffortVariantsFromBase` gates strictly on `roleName === 'oat-phase-implementer'`, so variants are generated only for the intended base role. `codexEffortVariantContent` performs two string replaces against the canonical export; verified the export produces exactly one `developer_instructions =` top-level key and no pre-existing `model_reasoning_effort`, so both replaces hit their intended single target. `# oat-role:` header rewrite preserves managed-file detection (`isOatManagedCodexRoleFile`) for the variant name. Roles are sorted deterministically by name, so `managedRoles` ordering is stable (test asserts the exact sorted order).
- **Stale-role handling:** Variant roles are now part of `desiredRoleNames`, so they are not falsely flagged stale. If the base canonical file were removed, the three variant config-table entries would still be detected as stale managed roles and removed (variant `configFile` follows the `agents/{name}.toml` convention that `collectStaleManagedRoles` and the path reconstruction at line 314-319 assume). Correct.
- **Error handling:** `applyCodexProjectExtensionPlan` swallows per-operation errors into a `failed` counter rather than throwing — consistent with the pre-existing pattern in this file; not a regression.
- **Edge cases / brittleness:** The string-replace transform in `codexEffortVariantContent` is coupled to the exact TOML export shape (top-level `developer_instructions =`). It works today and is covered by tests, but a future change to `exportCanonicalAgentToCodexRole` key ordering or to a nested table could silently break it. Not a finding for this scope — flagging as a maintainability note only.
- **Test coverage:** The new `generates effort-specific codex variants for oat-phase-implementer` test exercises plan generation (all three variant role paths + base present), the exact `managedRoles` ordering, apply success, the variant `# oat-role:` header, the `model_reasoning_effort = "low"` line, and the config-table registration. It genuinely exercises the new behavior. The pre-existing idempotency, partial-sync, and zero-role tests still pass. 5/5 tests pass.

### Extra Work (not in declared requirements)

None. Every changed file maps to a plan phase task (`prev1`-`prev7`) or a required lockstep package bump.

## Verification Commands

Run these to verify the implementation:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/codex/codec/sync-extension.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
pnpm --filter @open-agent-toolkit/cli lint
pnpm run cli -- sync --scope project --dry-run
pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main
pnpm release:validate
pnpm build:docs
```

All seven commands were run during this review and passed (sync-extension 5/5 tests, type-check/lint clean, sync dry-run reports all roles + config in sync, skill version bumps validated, release validation passes for 5 packages at 0.0.70, docs build succeeds).

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the findings into plan tasks. The two coherence findings (Important: xhigh escalation example; Medium: stale one-line log references and the Claude Code review `effort_axis` label) are all contained edits to `oat-project-implement/SKILL.md` plus the reviewer prompt/docs, and the reviewer-prompt change requires re-running `sync --scope project` to refresh `.codex/agents/oat-reviewer.toml`.
