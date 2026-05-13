---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-13
oat_generated: true
oat_summary_last_task: p04-t01
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: subagent-model-selection

## Overview

This project clarified how OAT chooses model, effort, or provider control for phase-level subagent dispatch. It started from backlog item `bl-0738`, which asked for per-phase model-selection guidance, then pivoted away from precomputed caps after discovery showed the orchestrator cannot reliably read the current host model/control state before implementation.

The final shape matches the simpler Superpowers-style rule: at runtime, use the lowest available control that can confidently complete the task, escalate when risk or retry evidence requires it, and only let plans specify explicit overrides.

## What Was Implemented

The plan template, plan-writing skill, and import-plan skill now treat `## Dispatch Profile` as optional override guidance. Plans omit dispatch rows by default; if a row exists, it is interpreted as a user constraint or preference rather than generated advice.

`oat-project-implement` now documents runtime dispatch selection alongside its Tier 1/Tier 2 execution-mode selection. Tier selection still decides whether OAT uses subagents or inline fallback. Runtime dispatch selection decides the phase-specific model/effort/control when the host exposes one, records `host-auto` when the host owns the choice, and includes dispatch rationale in orchestration notes.

The phase implementer and reviewer prompts now report confidence and escalation-relevant concerns. `oat-project-review-provide` also has a Dispatch Profile override advisory so artifact-plan reviews do not flag missing dispatch rows as defects.

The final review pass added one consistency fix: `oat-project-implement` phase and review scope templates now include `dispatch_control` and `dispatch_rationale` fields when known, so downstream agents receive the dispatch context the orchestrator has resolved.

Documentation and repo reference artifacts were updated after implementation: the docs app now explains runtime dispatch selection, and `bl-0738` is closed in the file-backed backlog.

## Key Decisions

- **Runtime selection over planned caps:** precomputing caps depended on reading a value the host cannot authoritatively expose. Runtime selection avoids encoding a false source of truth in `plan.md`.
- **Override-only Dispatch Profile:** a missing dispatch profile is expected. Rows should exist only when the user has an explicit constraint or preference that runtime selection should honor.
- **Provider-neutral language:** the guidance uses "model/effort/control" and `host-auto` so Claude-family model selection, Codex effort selection, and host-managed dispatch all fit the same contract.
- **Escalate on evidence:** retry/fix-loop evidence and high-risk scope justify stronger available control before redispatch; escalation is bounded by the existing retry loop instead of creating a separate retry budget.

## Notable Challenges

The main design challenge was discovering that the earlier cap mechanism depended on a value the orchestrator could not reliably read. The project pivoted before implementation started, which kept the change mostly to prompt, template, docs, and bookkeeping surfaces rather than needing to unwind code written against the wrong abstraction.

Final review processing found one Minor gap in the scope templates and one stale state count during re-review. Both were fixed and the final v4 review passed with no findings.

## Integration Notes

The implementation touched canonical skill and agent files plus managed Codex role exports. Future changes to `.agents/skills/*/SKILL.md` still need the normal skill version bump check, and changes to bundled skill/docs assets still require lockstep public package release validation.

Docs and reference sync closed the associated backlog item by moving `bl-0738` from `backlog/items/` to `backlog/archived/`, adding a completed summary, regenerating the backlog index, and updating `apps/oat-docs/docs/workflows/projects/implementation-execution.md`.

## Associated Issues

- `bl-0738` — Define per-phase model selection guidance for phase-subagent dispatch.
