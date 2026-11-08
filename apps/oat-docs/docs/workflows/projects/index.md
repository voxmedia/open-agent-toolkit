---
title: Projects
description: 'Lifecycle, project artifacts, reviews, PR flow, and repository analysis for tracked OAT projects.'
---

# Projects

Use this section when you want the detailed lifecycle and artifact model behind tracked OAT projects.

Projects are where the workflow layer becomes concrete: lifecycle phases, `state.md`, `plan.md`, review gates, PR flow, and repository-analysis helpers all live here.

## One record per project

Every tracked project keeps one folder of artifacts, and each lifecycle stage
adds to it. Solid boxes are files and folders every project has (split
coordination parents excepted); dashed boxes
depend on the workflow mode or on a choice such as running a retrospective.
[Lifecycle](lifecycle.md) shows the stage order and each mode's lane.

=== "Diagram"

    ![Lifecycle stages beside one project folder: the artifacts each stage writes, solid when every project has them, dashed when mode or choice decides](/diagrams/artifact-rail-light.svg)
    ![Lifecycle stages beside one project folder: the artifacts each stage writes, solid when every project has them, dashed when mode or choice decides](/diagrams/artifact-rail-dark.svg)

=== "Mermaid source"

    ```mermaid
    flowchart LR
      accTitle: One project record across the lifecycle
      accDescr: Each lifecycle stage writes into one project folder. Solid nodes are in every project; dashed nodes depend on the workflow mode or a choice. state.md is updated at every stage. project-log.md follows workflow.projectLog: auto creates it on the first append, true or --with-project-log also scaffolds it with the project, and false creates none automatically.
      subgraph STAGES["Stages"]
        direction TB
        D["Discovery"] --> SD["Spec, design"] --> P["Plan"] --> I["Implement"] --> RP["Review, PR"] --> C["Closeout"]
      end
      subgraph REC["One project record\n.oat/projects/#lt;scope#gt;/#lt;name#gt;/"]
        direction TB
        DISC["discovery.md\nspec-driven, quick, capture"]:::opt
        SPEC["spec.md"]:::opt
        DES["design.md\nspec-driven; quick may add design.md"]:::opt
        PLAN["plan.md"]
        REFS["references/\ncreated for import, brief, goal"]:::opt
        IMPL["implementation.md"]
        REV["reviews/\nfilled as reviews and PRs run"]
        PRD["pr/"]
        SUM["summary.md\nwhen the summary runs"]:::opt
        RETRO["references/project-retro.md\nwhen a retro runs"]:::opt
        STATE["state.md\nupdated at every stage"]
        LOG["project-log.md\nauto: created on first append\ntrue, --with-project-log: scaffolded\nfalse: no automatic creation"]:::opt
      end
      D --> DISC
      SD --> SPEC
      SD --> DES
      P --> PLAN
      P --> REFS
      I --> IMPL
      RP --> REV
      RP --> PRD
      C --> SUM
      C --> RETRO
      classDef opt stroke-dasharray: 5 4
    ```

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
