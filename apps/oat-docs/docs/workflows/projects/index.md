---
title: Projects
description: 'Lifecycle, project artifacts, reviews, PR flow, and repository analysis for tracked OAT projects.'
---

# Projects

Use this section when you want the detailed lifecycle and artifact model behind tracked OAT projects.

Projects are where the workflow layer becomes concrete: lifecycle phases, `state.md`, `plan.md`, review gates, PR flow, and repository-analysis helpers all live here.

## Reference Contracts

Read [Project Artifacts](../../reference/project-artifacts.md) for project file contracts and [State Machine](../../reference/project-state-machine.md) for lifecycle and review-state transitions.

## Contents

- [Lifecycle](lifecycle.md) - End-to-end flow from discovery through completion.
- [Reviews](reviews/index.md) - How review request/receive loops work inside OAT projects.
- [Planning](planning/index.md) - Design modes, HiLL checkpoints and project splitting.
- [Execution](execution/index.md) - Implementation execution, project logs and picking up shared projects.
- [Closeout](closeout/index.md) - Retrospectives and PR flow.

## What This Section Is

This sub-section is the deep technical surface for how tracked OAT projects execute and how their artifacts, reviews, and PR states fit together.

## Start Here

- Start with [Lifecycle](lifecycle.md) for the end-to-end flow.
- Use [Autonomous Project Execution](../advanced/autonomy.md) for unattended lifecycle runs and defined boundary behavior.
- Read [OAT in Cursor Cloud](../advanced/cursor-cloud.md) before running OAT in a cloud workspace.
- Read [Artifacts](../../reference/project-artifacts.md) once you need the file contract behind project execution.
- Use [Project Splitting](planning/splitting.md) when one discovery or brainstorm should become coordinated child projects.
- Use [HiLL Checkpoints](planning/hill-checkpoints.md) when you want to understand pause/approval behavior.

## Common Tasks

- Understand lifecycle order and alternate lanes in [Lifecycle](lifecycle.md).
- Learn the artifact system of record in [Artifacts](../../reference/project-artifacts.md).
- Split broad scopes into coordination parents and focused children in [Project Splitting](planning/splitting.md).
- Understand lifecycle and review transitions in [State Machine](../../reference/project-state-machine.md).
- Learn review and PR expectations in [Reviews](reviews/index.md) and [PR Flow](closeout/pr-flow.md).
- Review a synced project's durable context in [Reviewing OAT PRs](reviews/reviewing-oat-prs.md).
- Continue remote project work with [Picking Up Projects](execution/picking-up-projects.md).

## Go Deeper

- [Lifecycle](lifecycle.md) - End-to-end flow from discovery through completion.
- [Autonomous Project Execution](../advanced/autonomy.md) - Session activation, gate outcomes, independent review, HiLL closeout, and learnings synthesis.
- [OAT in Cursor Cloud](../advanced/cursor-cloud.md) - Repository anchoring, environment readiness, user-scope assets, and Cursor execution surfaces.
- [Design Modes](planning/design-modes.md) - How full design balances collaborative, selective collaborative, and draft-and-review interaction.
- [HiLL Checkpoints](planning/hill-checkpoints.md) - Human-in-the-Loop Lifecycle configuration and approval behavior.
- [Dispatch Policy](../advanced/dispatch-ceiling.md) - Managed capped tiers, managed Uncapped, Inherit Host Defaults, legacy dispatch-ceiling compatibility, and provider-specific enforcement.
- [Orchestration Model](../advanced/orchestration-model.md) - The layered dispatch model: roles, selection flow, and per-harness topology.
- [Review Flavors](reviews/review-flavors.md) - The four review flavors and who resolves each one's target.
- [Evidence Layers](../advanced/evidence-layers.md) - The three-layer dispatch evidence model behind records and smoke verification.
- [Programmatic Execution](../advanced/programmatic-execution.md) - Per-harness headless/CLI execution surfaces and where OAT uses them.
- [Artifacts](../../reference/project-artifacts.md) - What lives in `state.md`, `discovery.md`, `plan.md`, `implementation.md`, and related files.
- [Project Splitting](planning/splitting.md) - How broad discoveries or brainstorms become coordination parents and child projects.
- [State Machine](../../reference/project-state-machine.md) - Lifecycle and review status transitions across a project.
- [Reviews](reviews/index.md) - How review request/receive loops work inside OAT projects.
- [PR Flow](closeout/pr-flow.md) - Progress and final PR generation expectations.
- [Reviewing OAT PRs](reviews/reviewing-oat-prs.md) - Record metadata, pinned links, and editor discovery for synced projects.
- [Picking Up Projects](execution/picking-up-projects.md) - Remote discovery, adopting pull, coordination children, and retention boundaries.
- [Repository PR Comment Analysis](../../reference/repository-pr-comments.md) - Repo-wide PR comment collection and triage workflows.
