---
oat_generated: true
oat_generated_at: 2026-03-29
oat_review_scope: design
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/oat-project-next
---

# Artifact Review: design

**Reviewed:** 2026-03-29
**Scope:** Design artifact review for `oat-project-next`
**Files reviewed:** 2
**Commits:** n/a

## Summary

The design is generally aligned with the spec and answers the main open questions around boundary detection, review detection, and summary state signals. The main gaps are in the post-implementation gate logic, repo-convention alignment for skill registration, and incomplete handling of the no-active-project guidance path.

## Findings

### Critical

None.

### Important

1. **Final review pass state is not enforced before routing to summary.** The post-implementation router only checks whether a `final` code-review row exists in `plan.md`, then advances to `oat-project-summary` if `summary.md` is incomplete. That allows the router to bypass the final quality gate once a `final` review has merely been recorded, even if it is still `received`, `fixes_added`, or `fixes_completed`. FR5 requires advancing only when the final review exists **and is passed**. Update the decision tree so it explicitly requires `Status=passed` for the `final` code-review row before routing to summary. Evidence: [design.md](/Users/thomas.stang/Code/vox/open-agent-toolkit/.oat/projects/shared/oat-project-next/design.md#L287), [design.md](/Users/thomas.stang/Code/vox/open-agent-toolkit/.oat/projects/shared/oat-project-next/design.md#L296), [spec.md](/Users/thomas.stang/Code/vox/open-agent-toolkit/.oat/projects/shared/oat-project-next/spec.md#L91).

2. **The implementation guidance conflicts with the repo’s canonical skill-location rule.** The design tells implementers to register the skill in both `.claude/skills/` and `.agents/skills/`, and it references `.claude/skills/oat-project-progress/SKILL.md` as a primary implementation reference. This repo’s instructions define `.agents/skills` as the canonical source and rely on sync tooling for provider-linked views. If implemented as written, this design will recreate manual duplication and drift between skill trees. The design should instead treat `.agents/skills` as the only authored location and call out `oat sync --scope all` as the propagation mechanism. Evidence: [design.md](/Users/thomas.stang/Code/vox/open-agent-toolkit/.oat/projects/shared/oat-project-next/design.md#L442), [design.md](/Users/thomas.stang/Code/vox/open-agent-toolkit/.oat/projects/shared/oat-project-next/design.md#L469), [design.md](/Users/thomas.stang/Code/vox/open-agent-toolkit/.oat/projects/shared/oat-project-next/design.md#L489), [AGENTS.md](/Users/thomas.stang/Code/vox/open-agent-toolkit/AGENTS.md#L7).

### Medium

1. **No-active-project guidance does not fully cover FR9.** The error-handling sections only suggest `oat-project-new` or `oat-project-open` when no active project exists. FR9 requires a second branch: if no projects exist at all, the router should suggest `oat-project-new`, `oat-project-quick-start`, or `oat-project-import-plan`; otherwise it should suggest `oat-project-open`. The current design never models that distinction, so one acceptance path remains unspecified. Evidence: [design.md](/Users/thomas.stang/Code/vox/open-agent-toolkit/.oat/projects/shared/oat-project-next/design.md#L127), [design.md](/Users/thomas.stang/Code/vox/open-agent-toolkit/.oat/projects/shared/oat-project-next/design.md#L378), [spec.md](/Users/thomas.stang/Code/vox/open-agent-toolkit/.oat/projects/shared/oat-project-next/spec.md#L128).

### Minor

None.

## Spec/Design Alignment

### Requirements Coverage

| Requirement | Status      | Notes                                                                                                                |
| ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| FR2         | implemented | Boundary detector defines complete, substantive, and template tiers.                                                 |
| FR3         | implemented | Phase router covers spec-driven, quick, and import workflows.                                                        |
| FR4         | implemented | Review checker specifies directory scan plus Reviews-table cross-reference.                                          |
| FR5         | partial     | Post-implementation routing does not require the `final` review row to be `passed` before advancing to summary.      |
| FR8         | implemented | Active-project resolution is modeled in the state reader and error handling.                                         |
| FR9         | missing     | No-project guidance does not distinguish between “no projects exist” and “projects exist but none is active.”        |
| NFR1        | implemented | Dispatcher includes a concise routing banner with phase and target skill.                                            |
| NFR2        | partial     | The design follows lifecycle-skill structure, but the registration guidance conflicts with current repo conventions. |

### Extra Work (not in requirements)

None.

## Verification Commands

```bash
nl -ba .oat/projects/shared/oat-project-next/design.md | sed -n '1,492p'
nl -ba .oat/projects/shared/oat-project-next/spec.md | sed -n '1,240p'
nl -ba AGENTS.md | sed -n '1,20p'
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
