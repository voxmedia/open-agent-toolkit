---
id: bl-71a1
title: 'Memory system + provider enhancements'
status: open
priority: low
scope: initiative
scope_estimate: XL
labels: ['tooling', 'memory']
assignee: null
created: '2026-03-15T22:59:28Z'
updated: '2026-03-15T22:59:28Z'
associated_issues: []
---

## Description

This item tracks longer-term workflow durability work that should happen after provider interop and multi-project support are proven in real usage. The focus is persistent cross-session memory plus deeper provider-specific capabilities once the current sync and workflow foundations are stable.

Proposed change:

- Add `.oat/memory/` as a home for cross-session context, learned patterns, and durable workflow memory.
- Expand the provider capability matrix and provider-specific features such as hook mirroring policies and subagent limitation handling.

When to start:

- After Phase 8 and Phase 9 work is proven in real usage.

## Acceptance Criteria

- OAT defines a durable `.oat/memory/` surface for cross-session context and learned patterns.
- Provider capability documentation is expanded beyond the current baseline.
- Provider-specific enhancements are scoped with clear behavioral contracts.
