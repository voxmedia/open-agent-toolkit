---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-05
oat_generated: false
---

# Discovery: oat-project-retro

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Create an OAT **project retro skill** that runs at the end of an OAT project and
produces a retro artifact. The skill should review available project evidence —
session logs, project log, OAT execution log, and related project artifacts —
then synthesize room for improvement so there is a continuous feedback loop:

1. **Host repository feedback** — improvements for the repo where the project ran
2. **Upstream OAT feedback** — improvements to send back to Open Agent Toolkit
   (workflows, CLI tooling, skills, etc.) when warranted

Earlier session context also pointed at a wp-platform PR commit as a possible
reference/handoff source to pull into this project's `references/` directory:
https://github.com/voxmedia/wp-platform/pull/5333/changes/3179025e5d2dfe28cc977013f80b8528a28fbcf4

User indicated a handoff document will be provided next; discovery is paused
until that arrives.

## Clarifying Questions

_Pending handoff and follow-up Q&A._

## Solution Space

_Pending handoff. Will explore approaches after reference material is available._

## Options Considered

_Pending discovery completion._

## Key Decisions

1. **Workflow:** Use quick-start (`oat-project-quick-start`) for this project.
2. **Outcome shape:** Deliverable is a retro skill + generated retro artifact
   focused on continuous improvement feedback (host repo + upstream OAT).

## Constraints

- Prefer evidence from real project execution surfaces (session logs, project
  log, execution log, related artifacts) over speculative recommendations.
- Separate host-repo vs upstream-OAT feedback clearly when both apply.

## Success Criteria

- A runnable retro skill exists that can be invoked at end of an OAT project.
- Retro output is a durable artifact useful for continuous improvement.
- Feedback is actionable and routed (host repo vs upstream OAT) when relevant.

## Out of Scope

_To be refined after handoff._

## Deferred Ideas

_None yet._

## Open Questions

- **Handoff contents:** What reference material / prior work is in the pending
  handoff, and how much of the retro skill shape is already decided there?
- **Reference import:** Should the linked wp-platform PR commit files be pulled
  into `.oat/projects/shared/oat-project-retro/references/` as discovery inputs?
- **Trigger point:** Is retro always post-project (wrap-up / PR-final adjacent),
  or also invocable mid-project?
- **Artifact destination:** Where should the retro artifact live (project dir,
  repo reference surface, both)?

## Assumptions

- The skill will primarily consume existing OAT project telemetry/logs rather
  than inventing a new logging subsystem in this project.
- Upstream feedback is optional and only emitted when evidence warrants it.

## Risks

- **Thin evidence:** Some projects may lack rich session/execution logs.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Degrade gracefully; document missing sources in the
    retro artifact instead of fabricating findings.

## Next Steps

Use this discovery artifact to drive the next workflow step:

- **Spec-driven mode:** continue to `oat-project-design` (which confirms
  requirements and produces both `spec.md` and `design.md`).
- **Spec-driven mode → formalize-only:** use `oat-project-spec` standalone
  if you want a formalized requirements artifact but aren't ready to
  design yet.
- **Quick mode → straight to plan:** proceed directly to `plan.md` when
  scope is clear and no architecture decisions remain.
- **Quick mode → optional lightweight design:** produce a focused
  `design.md` (architecture, components, data flow, testing) before
  planning. Choose this when discovery surfaced architecture choices
  or component boundaries.
- **Quick mode → promote:** escalate to spec-driven if discovery revealed
  the scope is larger or more complex than expected.
