---
oat_generated: true
oat_generated_at: 2026-05-12
oat_review_scope: design
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/subagent-model-selection
---

# Artifact Review: design

**Reviewed:** 2026-05-12
**Scope:** Design artifact readiness for `subagent-model-selection`
**Files reviewed:** 2
**Commits:** N/A

## Summary

The design is aligned with discovery's chosen direction: widen the project to both Claude model selection and Codex `reasoning_effort`, keep the expression optional in `plan.md`, and enforce invocation-cap approval before above-cap dispatch. It is not quite implementation-ready because the central cap mechanism depends on reading the current invocation provider/tier, but the design never specifies a reliable source or fallback for that value.

## Findings

### Critical

None

### Important

- **Invocation cap has no source-of-truth or fallback** (`.oat/projects/shared/subagent-model-selection/design.md:58`)
  - Issue: The design says `oat-project-implement` reads the orchestrator's current invocation tier and uses it as the cap, while discovery only records an assumption that this is reliably knowable. The cap drives every approval decision, so implementation cannot safely proceed until the design says where the value comes from in Claude/Codex hosts and what to do if it is unavailable or ambiguous.
  - Fix: Add an "Invocation tier detection" subsection to the design. Specify the provider-specific source when exposed by the host, and define a safe fallback such as asking the user once at implementation preflight and treating the answer as the run cap. Include how dry-run reports an unknown cap.
  - Requirement: Discovery requires no silent dispatch above invocation cap and explicit user confirmation for escalations.

### Medium

- **Malformed Dispatch Profile rows rely on a review advisory that does not include malformed-row checks** (`.oat/projects/shared/subagent-model-selection/design.md:370`)
  - Issue: The design says malformed cells are treated as `auto` and that the plan-review advisory catches malformed rows before execution, but the advisory rules only cover risky tier choices and weak rationales. That leaves invalid phase IDs or unknown tier names without a clear review finding category, even though those values cause user-authored dispatch intent to be ignored.
  - Fix: Add malformed-row checks to the plan-review advisory. Unknown tier values and invalid phase IDs should be at least Important because they drop explicit user intent; malformed but recoverable table structure can be Medium if execution still has an unambiguous interpretation.
  - Requirement: User-authored dispatch choices must be visible and reviewable before execution.

### Minor

None

## Spec/Design Alignment

### Requirements Coverage

| Requirement                                       | Status      | Notes                                                                     |
| ------------------------------------------------- | ----------- | ------------------------------------------------------------------------- |
| Widen scope to Claude model and Codex effort      | implemented | Design follows discovery's Approach B.                                    |
| Optional sparse Dispatch Profile in `plan.md`     | implemented | Format, omission rules, validation, and import behavior are defined.      |
| Invocation-cap approval before above-cap dispatch | partial     | Semantics are defined, but cap detection source/fallback is missing.      |
| Run-local, non-mutating approvals                 | implemented | Session-local approval state and future persistence boundary are defined. |
| Reviews use highest tier in scope                 | implemented | Review tier semantics are defined for normal, approved, and retry cases.  |
| Plan review catches risky tier choices            | partial     | Risk rules exist, but malformed explicit choices are not covered.         |

### Extra Work

None

## Verification Commands

After fixes, verify the design names the missing source/fallback and malformed-row review category:

```bash
grep -q "Invocation tier detection" .oat/projects/shared/subagent-model-selection/design.md
grep -q "unknown tier" .oat/projects/shared/subagent-model-selection/design.md
grep -q "invalid phase" .oat/projects/shared/subagent-model-selection/design.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the Important and Medium findings into design fix tasks before implementation.
