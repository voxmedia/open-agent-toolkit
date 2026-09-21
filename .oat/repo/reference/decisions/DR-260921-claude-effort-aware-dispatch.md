---
id: DR-260921-claude-effort-aware-dispatch
title: Claude effort-aware dispatch
date: 2026-09-21
status: accepted
legacy_id: null
---

# Claude effort-aware dispatch

## Context

Claude Code now supports effort in subagent definitions, and OAT materializes exact model-plus-effort variants for managed reviewer and phase-implementer dispatch. This supersedes the earlier model-axis-only constraint while retaining legacy model-only compatibility and Opus-first routing.

## Decision

Managed Claude reviewer and phase-implementer targets may select model and
effort independently. OAT materializes each explicit pair as a deterministic
named agent definition whose frontmatter carries both controls, resolves that
exact variant, and launches it by name. The Agent call has no separate effort
field; any per-call model must agree with the selected definition.

Legacy model-only candidates remain valid and continue to use the native model
argument with provider-default effort. Inherited routes leave both axes to the
host. Reviewer dispatch still uses the terminal configured candidate, while
implementer and fix dispatch classify work within the eligible ceiling.

This decision supersedes `DR-260706-claude-remains-model-axis-only`. It does not
supersede `DR-260723-opus-first-claude-routing`.

## Consequences

Claude dispatch records can now distinguish configured model and effort, while
runtime observation remains separate evidence. Managed sync owns generated
variants and removes only stale managed output; it never overwrites unmanaged
agents. Existing explicit model-only configuration is preserved during
recommendation adoption, so opting into an effort-pinned cell requires an
intentional config edit or clearing and re-adopting that cell.
