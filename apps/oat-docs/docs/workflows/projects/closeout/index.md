---
title: Closeout
description: 'Project retrospectives and progress or final PR flow.'
---

# Closeout

Use these guides to close out tracked work and prepare its PR or retrospective.

## What completion does

What `oat-project-complete` does at the end depends on the project's scope and
on configuration. Local projects are never archived; shared and synced projects
archive or decline. Archiving is one operation: it snapshots the project into
`.oat/projects/archived/`, and its exports run inside that operation, each only
when it is configured or selected. A shared project's active copy is removed
right after the snapshot; a synced project retires its ref and removes its
checkout only after its configured exports succeed. See
[Completion archive behavior](../lifecycle.md#completion-archive-behavior) for
the full contract.

=== "Diagram"

    ![Completion by scope: local never archives; shared and synced archive or decline; archive runs exports when set; synced cleanup waits for them](/diagrams/completion-by-scope-light.svg)
    ![Completion by scope: local never archives; shared and synced archive or decline; archive runs exports when set; synced cleanup waits for them](/diagrams/completion-by-scope-dark.svg)

=== "Mermaid source"

    ```mermaid
    flowchart TD
      accTitle: Completion by project scope
      accDescr: oat-project-complete reads the project scope. A local project is never archived and never exports a recap. Shared and synced projects reach an archive choice set by workflow.archiveOnComplete or asked. Declined, a shared project stays where it is and a synced project keeps its ref and checkout. Archived, oat project archive snapshots the project into archived/, removing a shared project's active copy right after the snapshot. Inside that operation it runs recap export (before the snapshot), summary export and shared-storage sync only when each is selected or set; shared-storage sync needs both archive.s3Uri and archive.s3SyncOnComplete. A synced project needs its summary export and upload to succeed, and only then does synced cleanup move its ref to completed and remove its checkout.
      C["oat-project-complete"] --> SC["Project scope\noat project scope"]
      SC --> LO["local\nnot durable"]
      SC --> SH["shared\ndurable"]
      SC --> SY["synced\ndurable; project ref"]
      LO --> NA["Never archived\nstays in place\nno recap export"]
      SH --> Q["Archive?\nset by workflow.archiveOnComplete, or asked"]
      SY --> Q
      Q -->|"declined"| KEEP["Not archived\nshared: stays where it is\nsynced: ref and checkout kept"]
      Q -->|"archive"| AR["oat project archive\nsnapshot to archived/\nshared: active copy removed\nright after the snapshot"]
      AR -.->|"if set"| SE["Summary export\narchive.summaryExportPath\ncopies summary.md\nsynced: must succeed"]
      AR -.->|"if selected"| RE["Recap export\nif a recap run is selected\none tracked page,\nwritten before the snapshot"]
      AR -.->|"if set"| S3["Shared-storage sync\narchive.s3Uri +\narchive.s3SyncOnComplete\nsynced: upload must succeed"]
      AR -->|"synced"| CL["Synced cleanup\nonly after configured exports succeed\nref moves to completed, checkout removed"]
    ```

## Contents

- [Project closeout skills](closeout-skills.md) - Reviews, documentation, retrospectives, PRs and completion.
- [Project Retrospectives](retro.md) - Generate evidence-grounded retros, apply repo improvements, and file tracker feedback.
- [PR Flow](pr-flow.md) - Progress and final PR generation expectations.
