---
title: Workflow & Projects
description: 'Guide to OAT lifecycle execution, project artifacts, reviews, PR flow, and repo-analysis helpers.'
---

# Workflow & Projects

Use this section when you want tracked, resumable work on top of the base CLI and provider-sync layers.

OAT workflow is optional. The CLI remains useful on its own, but projects add explicit artifacts, stable task IDs, review loops, and resumable implementation state for longer-running work.

## Contents

- [Lifecycle](lifecycle.md) - End-to-end flow from discovery through implementation and completion.
- [HiLL Checkpoints](hill-checkpoints.md) - Human-in-the-Loop Lifecycle configuration and approval behavior.
- [Artifacts](artifacts.md) - What lives in `state.md`, `discovery.md`, `plan.md`, `implementation.md`, and related files.
- [State Machine](state-machine.md) - Lifecycle and review status transitions across a project.
- [Reviews](reviews.md) - How review request/receive loops work inside OAT projects.
- [PR Flow](pr-flow.md) - Progress and final PR generation expectations.
- [Repository Analysis](repo-analysis.md) - Repo-wide PR comment collection and triage workflows.

## Choose the Right Workflow Layer

- Use the CLI only when you want direct commands without tracked artifacts.
- Use quick mode when the work is bounded and requirements are already clear.
- Use spec-driven mode when requirements or design decisions need explicit baseline artifacts.
- Use import mode when a plan already exists outside OAT and you want tracked execution.

## Core Project Concepts

- `state.md` tracks the current phase, task pointer, blockers, and review readiness.
- `plan.md` owns the stable task sequence and HiLL checkpoint configuration.
- `implementation.md` records outcomes, verification, and resume notes as work progresses.
- reviews and PR artifacts provide the quality gate between implementation and merge.
