---
title: Agentic Workflows Overview
description: Plain-language explanation of when to use tracked OAT projects versus direct CLI usage.
---

# Agentic Workflows Overview

OAT workflow mode adds a tracked lifecycle on top of the base CLI. Instead of just running commands directly, you work through explicit project artifacts such as `state.md`, `plan.md`, and `implementation.md`, with stable task IDs and review checkpoints.

That extra structure is optional. You only need it when the work is large enough, risky enough, or long-lived enough that resumability and explicit coordination matter.

## When To Use Workflow Mode

Use workflow mode when:

- the work spans multiple sessions or contributors
- you want explicit discovery, plan, implementation, and review artifacts
- you need stable task sequencing and resumable execution
- you want human-in-the-loop checkpoints around risky transitions

Stay with direct CLI usage when:

- the task is straightforward and bounded
- you mainly need provider sync or a utility command
- the overhead of project artifacts would outweigh the value

## Workflow Modes In Practice

- CLI only: direct commands, no tracked project artifacts
- Quick mode: tracked work with a lighter upfront planning path
- Spec-driven mode: explicit discovery, requirements, design, and plan artifacts
- Import mode: an externally-authored plan imported into OAT for tracked execution

## Continue Here

- [Skills](../guide/skills/index.md) for task-oriented workflow skill discovery
- [Ideas](../guide/ideas/index.md) for lightweight capture and refinement
- [Workflow & Projects](../guide/workflow/index.md) for the lifecycle, artifact, and review model
