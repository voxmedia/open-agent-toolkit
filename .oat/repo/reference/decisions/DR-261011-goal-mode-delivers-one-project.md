---
id: DR-261011-goal-mode-delivers-one-project
title: Goal mode delivers one Project Brief in milestones
date: 2026-10-11
status: accepted
legacy_id: null
---

# Goal mode delivers one Project Brief in milestones

## Context

Some outcomes need several deliveries over time: a first version now and a follow-up once it has been used. Brief mode covers one delivery; repeating brief projects would lose the shared outcomes, decisions and audit.

## Decision

Add the goal workflow mode (oat_workflow_mode: goal, oat_plan_source: goal) on the brief mode family. One reviewed Project Brief carries a canonical '| Milestone | Phases |' table assigning every phase, revision phases included, to exactly one milestone, read by one shared reader (readMilestoneMembership) for the router, both project readers, validate-plan and the delivery commands. Milestone state lives in state.md (oat_milestone, oat_milestone_status aligning | implementing | reviewing | delivering | delivered, oat_goal_status, oat_goal_recovery, oat_milestone_gates with plan and exit carriers, oat_deliveries). oat-project-goal owns authoring, each milestone's activation and re-alignment, and the terminal declaration; implement, review-provide, review-receive, pr-progress, pr-final and revise own the transitions in brief-contract section 12.3. The first approval marks plan.md complete; every later amendment is approved only by that milestone's plan carrier. Activation waits until the previous delivery is observed at its agreed endpoint (open or merged); re-alignment may plan and approve the next milestone before then. For goal, the milestone exit gate runs before the integrated review. Goal is never selected or continued by an autonomous run.

## Consequences

The router reads only persisted goal state and never evaluates Git; delivery freshness comes from oat project delivery refresh and check. Recovery of an older milestone's delivery is persisted in oat_goal_recovery and never moves the active milestone. A goal project can promote to quick only at a settled delivery boundary (goal-milestone-active, goal-recovery-pending, goal-delivery-unsettled). Because the project branch is the delivery head branch, brief amendments stay unpushed while a delivery is open (see the bookkeeping-successor record). Each activation and re-alignment appends one structural project-log entry, and learnings capture is a concrete write.
