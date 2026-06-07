---
title: Workflow & Projects
description: 'Lifecycle, project artifacts, reviews, PR flow, and repository analysis for tracked OAT projects.'
---

# Workflow & Projects

Use this section when you want the detailed lifecycle and artifact model behind tracked OAT projects.

Projects are where the workflow layer becomes concrete: lifecycle phases, `state.md`, `plan.md`, review gates, PR flow, and repository-analysis helpers all live here.

## Contents

- [Lifecycle](lifecycle.md) - End-to-end flow from discovery through completion.
- [Design Modes](design-modes.md) - How full design balances collaborative, selective collaborative, and draft-and-review interaction.
- [HiLL Checkpoints](hill-checkpoints.md) - Human-in-the-Loop Lifecycle configuration and approval behavior.
- [Dispatch Ceiling](dispatch-ceiling.md) - Provider-neutral ceiling model and provider-specific enforcement.
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
- [Design Modes](design-modes.md) - How full design balances collaborative, selective collaborative, and draft-and-review interaction.
- [HiLL Checkpoints](hill-checkpoints.md) - Human-in-the-Loop Lifecycle configuration and approval behavior.
- [Dispatch Ceiling](dispatch-ceiling.md) - Provider-neutral ceiling model: presets, the compile/resolve flow, and how enforcement differs for Codex, Claude, and unsupported providers.
- [Artifacts](artifacts.md) - What lives in `state.md`, `discovery.md`, `plan.md`, `implementation.md`, and related files.
- [Project Splitting](splitting.md) - How broad discoveries or brainstorms become coordination parents and child projects.
- [State Machine](state-machine.md) - Lifecycle and review status transitions across a project.
- [Reviews](reviews.md) - How review request/receive loops work inside OAT projects.
- [PR Flow](pr-flow.md) - Progress and final PR generation expectations.
- [Repository PR Comment Analysis](repo-analysis.md) - Repo-wide PR comment collection and triage workflows.
