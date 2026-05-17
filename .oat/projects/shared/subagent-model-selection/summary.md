---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-13
oat_generated: true
oat_summary_last_task: p04-t01
oat_summary_revision_count: 1
oat_summary_includes_revisions: ['prev1-t01']
---

# Summary: subagent-model-selection

## Overview

This project clarified how OAT chooses model, effort, or provider control for phase-level subagent dispatch. It started from backlog item `bl-0738`, which asked for per-phase model-selection guidance, then pivoted away from precomputed caps after discovery showed the orchestrator cannot reliably read the current host model/control state before implementation.

The final shape matches the simpler Superpowers-style rule: at runtime, use the lowest available control that can confidently complete the task, escalate when risk or retry evidence requires it, and only let plans specify explicit overrides.

## What Was Implemented

The plan template, plan-writing skill, and import-plan skill now treat `## Dispatch Profile` as optional override guidance. Plans omit dispatch rows by default; if a row exists, it is interpreted as a user constraint or preference rather than generated advice.

`oat-project-implement` now documents runtime dispatch selection alongside its Tier 1/Tier 2 execution-mode selection. Tier selection still decides whether OAT uses subagents or inline fallback. Runtime dispatch selection decides phase-specific model and effort axes independently, records selected/inherited/not-applicable/host-auto state per axis, and includes dispatch rationale in orchestration notes.

Revision 1 clarified the implementation/review split in the implement skill, reviewer agent prompt, and docs: implementation dispatch chooses and logs the lowest sufficient available control, while review dispatch inherits the parent session's model/effort/control unless the user explicitly requests an override.

Revision 2 split the dispatch label into `model_axis` and `effort_axis` so hosts that expose only one control are not mislabeled as `host-auto`. Claude Code implementation dispatch can select a subagent model while marking effort as `not-applicable`; Codex implementation dispatch usually inherits model and selects `reasoning_effort`. Review dispatch inherits both axes by default.

Revision 3 tightened the host-call wiring and design audit trail: `model_axis=selected:<value>` now explicitly requires passing the corresponding Claude Code Task `model` parameter for implementation dispatch, and the design artifact now flags its older single-axis sections as superseded by the two-axis contract.

Revision 4 extended that assertion to Codex implementer and fix dispatches after live dogfooding showed a selected medium effort being logged while the spawned worker used high effort. The skill now requires selected effort to be passed as the top-level `reasoning_effort` argument and treats mismatched spawned effort as an orchestration deviation.

Revision 5 tightened the same Codex path again after repeated dogfooding showed `effort_axis=selected:low|medium` still being logged while spawned workers used high effort. The skill now requires payload-first dispatch: build the `spawn_agent` argument map first, include top-level `reasoning_effort` there, then derive the dispatch log from that payload. It also promotes mismatch handling into a post-spawn verification gate before waiting on the agent. A selected effort that exists only in Phase Scope text is explicitly invalid.

The phase implementer and reviewer prompts now report confidence and escalation-relevant concerns. `oat-project-review-provide` also has a Dispatch Profile override advisory so artifact-plan reviews do not flag missing dispatch rows as defects.

The final review pass added one consistency fix: `oat-project-implement` phase and review scope templates include dispatch context fields when known, so downstream agents receive the dispatch context the orchestrator has resolved. Revision 2 refined that context into separate `model_axis`, `effort_axis`, and `dispatch_rationale` fields.

Documentation and repo reference artifacts were updated after implementation: the docs app now explains runtime dispatch selection, and `bl-0738` is closed in the file-backed backlog.

## Key Decisions

- **Runtime selection over planned caps:** precomputing caps depended on reading a value the host cannot authoritatively expose. Runtime selection avoids encoding a false source of truth in `plan.md`.
- **Override-only Dispatch Profile:** a missing dispatch profile is expected. Rows should exist only when the user has an explicit constraint or preference that runtime selection should honor.
- **Two-axis dispatch state:** model and effort are logged independently as `selected:<value>`, `inherited`, `not-applicable`, or `host-auto`, so partial host control surfaces are represented accurately.
- **Provider-neutral language:** the guidance uses separate model and effort axes so Claude-family model selection, Codex effort selection, and host-managed dispatch all fit the same contract.
- **Review inherits:** OAT review dispatch does not choose a separate model or effort by default. It inherits the parent session controls and records that inheritance explicitly.
- **Escalate on evidence:** retry/fix-loop evidence and high-risk scope justify stronger available control before redispatch; escalation is bounded by the existing retry loop instead of creating a separate retry budget.

## Notable Challenges

The main design challenge was discovering that the earlier cap mechanism depended on a value the orchestrator could not reliably read. The project pivoted before implementation started, which kept the change mostly to prompt, template, docs, and bookkeeping surfaces rather than needing to unwind code written against the wrong abstraction.

Final review processing found one Minor gap in the scope templates and one stale state count during re-review. Both were fixed and the final v4 review passed with no findings.

Post-PR dogfood feedback found that review dispatch guidance could be misread as selecting reviewer effort separately. Revision 1 tightened the language so implementation effort selection and review inheritance are distinct.

## Integration Notes

The implementation touched canonical skill and agent files plus managed Codex role exports. Future changes to `.agents/skills/*/SKILL.md` still need the normal skill version bump check, and changes to bundled skill/docs assets still require lockstep public package release validation.

Docs and reference sync closed the associated backlog item by moving `bl-0738` from `backlog/items/` to `backlog/archived/`, adding a completed summary, regenerating the backlog index, and updating `apps/oat-docs/docs/workflows/projects/implementation-execution.md`.

## Associated Issues

- `bl-0738` — Define per-phase model selection guidance for phase-subagent dispatch.
