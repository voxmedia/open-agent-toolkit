---
oat_generated: true
oat_generated_at: 2026-04-17
oat_review_scope: design
oat_review_type: artifact
oat_review_invocation: manual
oat_project: /Users/thomas.stang/Code/vox/open-agent-toolkit/.claude/worktrees/hungry-khorana/.oat/projects/shared/collaborative-design-workflow
---

# Artifact Review: design

**Reviewed:** 2026-04-17
**Scope:** `design.md` reviewed against `spec.md`; `discovery.md`, `plan.md`, and `implementation.md` read for upstream/downstream context per reviewer contract.
**Files reviewed:** 2
**Workflow mode:** spec-driven
**Artifacts used:** `discovery.md`, `spec.md`, `design.md`, `plan.md`, `implementation.md`

## Summary

The design is close, but it is not ready to hand to planning yet. I found 3 Important, 2 Medium, and 1 Minor issue; the biggest gaps are around quick-start automation/minimal-ceremony behavior and one direct contradiction with the spec's `NOTICES.md` attribution rule.

## Findings

### Critical

None.

### Important

- **Quick-start requirements gate still blocks unattended runs** (`design.md:591`, `design.md:603`, `design.md:630`, `spec.md:151`)
  - Issue: Component 8 only bypasses Step 2.6 with `OAT_NO_REQUIREMENTS_GATE` or an explicit arg, but FR9 requires non-interactive quick-start runs to auto-confirm or no-op under `OAT_NON_INTERACTIVE=1` and never block orchestration.
  - Fix: Define explicit non-interactive behavior for Step 2.6 and bind it to the same non-interactive contract used for design mode selection.

- **Quick-start gate is designed as an iterative loop instead of a single-prompt check** (`design.md:594`, `design.md:632`, `spec.md:266`)
  - Issue: The component re-prompts after adds/redirects, while NFR6 requires the straight-to-plan gate to stay a single conversational checkpoint so quick-start remains materially lighter than spec-driven flow.
  - Fix: Keep Step 2.6 to one confirmation turn; if the user materially redirects scope, route them into lightweight design or back into discovery rather than looping inside the gate.

- **Approach-reaffirmation instructions reintroduce in-skill attribution text that FR14 forbids** (`design.md:390`, `design.md:396`, `design.md:958`, `spec.md:201`)
  - Issue: Component 3.5 tells the implementer to place attribution text directly inside the borrowed Superpowers prose block, but FR14 and Component 13 both require provenance to live only in repo-root `NOTICES.md`, with no skill-file attribution comments or footers.
  - Fix: Remove the inline attribution sentence from the proposed skill prose and keep attribution exclusively in `NOTICES.md`.

### Medium

- **Quick-start self-review behavior is internally inconsistent** (`design.md:659`, `design.md:729`, `design.md:734`, `spec.md:186`)
  - Issue: Component 9 first says quick-start draft mode runs Component 6's full four-check self-review, then later says only placeholder + consistency checks run.
  - Fix: Pick one behavior and state it once. The spec already requires the full four-check review, so the scaled-down note should be removed.

- **The HiLL/user-review gate says artifacts are committed before the design commits them** (`design.md:190`, `design.md:192`, `design.md:552`, `design.md:561`)
  - Issue: The prompt says the design is "written and committed," but the data flow and gate logic place commit after approval.
  - Fix: Either move the commit before the review prompt, or change the prompt text to "written" until approval/commit actually happens.

### Minor

- **YAGNI is an upstream requirement but has no concrete design insertion point** (`spec.md:48`, `discovery.md:240`, `design.md:1150`)
  - Issue: Discovery and spec both require an explicit YAGNI guardrail in `oat-project-design`, but the component plan and implementation phases never assign a concrete place where that principle is added.
  - Fix: Add a named guardrail change under the `oat-project-design` rework so the implementer cannot miss it.

## Readiness

Not ready for `oat-project-plan`. The design needs one consistency pass to close the quick-start behavior gaps and resolve the FR14/commit-order contradictions.

## Recommended Next Step

Run the oat-project-review-receive skill to convert findings into plan tasks.
