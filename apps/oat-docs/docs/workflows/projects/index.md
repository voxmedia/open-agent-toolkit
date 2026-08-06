---
title: Workflow & Projects
description: 'Lifecycle, project artifacts, reviews, PR flow, and repository analysis for tracked OAT projects.'
---

# Workflow & Projects

Use this section when you want the detailed lifecycle and artifact model behind tracked OAT projects.

Projects are where the workflow layer becomes concrete: lifecycle phases, `state.md`, `plan.md`, review gates, PR flow, and repository-analysis helpers all live here.

## Contents

- [Lifecycle](lifecycle.md) - End-to-end flow from discovery through completion.
- [Project Retrospectives](retro.md) - Generate evidence-grounded retros, apply repo improvements, and file tracker feedback.
- [Autonomous Project Execution](autonomy.md) - Session-scoped autonomy signals, gate boundaries, review requirements, and execution learnings.
- [OAT in Cursor Cloud](cursor-cloud.md) - Project-home, provisioning, asset-precedence, and execution-surface guidance for cloud agents.
- [Design Modes](design-modes.md) - How full design balances collaborative, selective collaborative, and draft-and-review interaction.
- [HiLL Checkpoints](hill-checkpoints.md) - Human-in-the-Loop Lifecycle configuration and approval behavior.
- [Dispatch Policy](dispatch-ceiling.md) - Managed capped tiers, managed Uncapped, Inherit Host Defaults, and provider-specific enforcement.
- [Orchestration Model](orchestration-model.md) - The layered dispatch model: roles, selection flow, and per-harness topology.
- [Review Flavors](review-flavors.md) - The four review flavors and who resolves each one's target.
- [Evidence Layers](evidence-layers.md) - The three-layer dispatch evidence model behind records and smoke verification.
- [Programmatic Execution](programmatic-execution.md) - Per-harness headless/CLI execution surfaces and where OAT uses them.
- [Project Artifacts](artifacts.md) - What lives in `state.md`, `discovery.md`, `plan.md`, `implementation.md`, and related files.
- [Implementation Execution](implementation-execution.md) - Phase dispatch, runtime selection, review/fix loop, and dry-run behavior.
- [Project Splitting](splitting.md) - How broad discoveries or brainstorms become coordination parents and child projects.
- [State Machine](state-machine.md) - Lifecycle and review status transitions across a project.
- [Reviews](reviews.md) - How review request/receive loops work inside OAT projects.
- [PR Flow](pr-flow.md) - Progress and final PR generation expectations.
- [Repository PR Comment Analysis](repo-analysis.md) - Repo-wide PR comment collection and triage workflows.

## What This Section Is

This sub-section is the deep technical surface for how tracked OAT projects execute and how their artifacts, reviews, and PR states fit together.

## Start Here

- Start with [Lifecycle](lifecycle.md) for the end-to-end flow.
- Use [Autonomous Project Execution](autonomy.md) for unattended lifecycle runs and defined boundary behavior.
- Read [OAT in Cursor Cloud](cursor-cloud.md) before running OAT in a cloud workspace.
- Read [Artifacts](artifacts.md) once you need the file contract behind project execution.
- Use [Project Splitting](splitting.md) when one discovery or brainstorm should become coordinated child projects.
- Use [HiLL Checkpoints](hill-checkpoints.md) when you want to understand pause/approval behavior.

## Common Tasks

- Understand lifecycle order and alternate lanes in [Lifecycle](lifecycle.md).
- Learn the artifact system of record in [Artifacts](artifacts.md).
- Split broad scopes into coordination parents and focused children in [Project Splitting](splitting.md).
- Understand lifecycle and review transitions in [State Machine](state-machine.md).
- Learn review and PR expectations in [Reviews](reviews.md) and [PR Flow](pr-flow.md).

## Go Deeper

- [Lifecycle](lifecycle.md) - End-to-end flow from discovery through completion.
- [Autonomous Project Execution](autonomy.md) - Session activation, gate outcomes, independent review, HiLL closeout, and learnings synthesis.
- [OAT in Cursor Cloud](cursor-cloud.md) - Repository anchoring, environment readiness, user-scope assets, and Cursor execution surfaces.
- [Design Modes](design-modes.md) - How full design balances collaborative, selective collaborative, and draft-and-review interaction.
- [HiLL Checkpoints](hill-checkpoints.md) - Human-in-the-Loop Lifecycle configuration and approval behavior.
- [Dispatch Policy](dispatch-ceiling.md) - Managed capped tiers, managed Uncapped, Inherit Host Defaults, legacy dispatch-ceiling compatibility, and provider-specific enforcement.
- [Orchestration Model](orchestration-model.md) - The layered dispatch model: roles, selection flow, and per-harness topology.
- [Review Flavors](review-flavors.md) - The four review flavors and who resolves each one's target.
- [Evidence Layers](evidence-layers.md) - The three-layer dispatch evidence model behind records and smoke verification.
- [Programmatic Execution](programmatic-execution.md) - Per-harness headless/CLI execution surfaces and where OAT uses them.
- [Artifacts](artifacts.md) - What lives in `state.md`, `discovery.md`, `plan.md`, `implementation.md`, and related files.
- [Project Splitting](splitting.md) - How broad discoveries or brainstorms become coordination parents and child projects.
- [State Machine](state-machine.md) - Lifecycle and review status transitions across a project.
- [Reviews](reviews.md) - How review request/receive loops work inside OAT projects.
- [PR Flow](pr-flow.md) - Progress and final PR generation expectations.
- [Repository PR Comment Analysis](repo-analysis.md) - Repo-wide PR comment collection and triage workflows.
