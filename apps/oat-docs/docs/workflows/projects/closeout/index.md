---
title: Closeout
description: 'Project retrospectives and progress or final PR flow.'
---

# Closeout

Use these guides to close out tracked work and prepare its PR or retrospective.

## What completion does

What `oat-project-complete` does at the end depends on the project's scope and
on configuration. Local projects are never archived; shared and synced projects
archive or decline. Archiving moves the project: it copies it to
`.oat/projects/archived/`, then removes the active copy. Each export after
archive runs only when it is configured or selected. See
[Completion archive behavior](../lifecycle.md#completion-archive-behavior) for
the full contract.

=== "Diagram"

    ![Completion by scope: local never archives; shared and synced archive or decline; archive moves the project and runs each export only when set](/diagrams/completion-by-scope-light.svg)
    ![Completion by scope: local never archives; shared and synced archive or decline; archive moves the project and runs each export only when set](/diagrams/completion-by-scope-dark.svg)

=== "Mermaid source"

    ```mermaid
    flowchart TD
      accTitle: Completion by project scope
      accDescr: oat-project-complete reads the project scope. A local project is never archived and never exports a recap. Shared and synced projects reach an archive choice set by workflow.archiveOnComplete or asked. Declined, a shared project stays where it is and a synced project keeps its ref and checkout. Archived, oat project archive copies the project to archived/ and removes the active copy, then runs summary export, recap export and shared-storage sync only when each is set or selected; shared-storage sync needs both archive.s3Uri and archive.s3SyncOnComplete, and a synced project needs its summary export and upload to succeed.
      C["oat-project-complete"] --> SC["Project scope\noat project scope"]
      SC --> LO["local\nnot durable"]
      SC --> SH["shared\ndurable"]
      SC --> SY["synced\ndurable; project ref"]
      LO --> NA["Never archived\nstays in place\nno recap export"]
      SH --> Q["Archive?\nset by workflow.archiveOnComplete, or asked"]
      SY --> Q
      Q -->|"declined"| KEEP["Not archived\nshared: stays where it is\nsynced: ref and checkout kept"]
      Q -->|"archive"| AR["oat project archive\ncopies to archived/,\nthen removes the active copy\nsynced: moves to completed ref"]
      AR -.->|"if set"| SE["Summary export\narchive.summaryExportPath\ncopies summary.md\nsynced: must succeed"]
      AR -.->|"if selected"| RE["Recap export\nif a recap run is selected\none tracked page"]
      AR -.->|"if set"| S3["Shared-storage sync\narchive.s3Uri +\narchive.s3SyncOnComplete\nsynced: upload must succeed"]
    ```

## Contents

- [Project closeout skills](closeout-skills.md) - Reviews, documentation, retrospectives, PRs and completion.
- [Project Retrospectives](retro.md) - Generate evidence-grounded retros, apply repo improvements, and file tracker feedback.
- [PR Flow](pr-flow.md) - Progress and final PR generation expectations.
