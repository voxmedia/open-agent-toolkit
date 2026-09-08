---
id: BL-260907-name-the-resolved-target
title: Name the resolved target in the symlink inert-exclusion warning
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - cli
  - docs
  - wave-5-followup
assignee: null
created: 2026-09-07T14:05:38.688Z
updated: 2026-09-08T21:33:57.000Z
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-09-08-name-the-resolved-symlink-target.md
---

## Description

The inert-exclusion warning added by wave-5 p02 says an `instructionPointerExcludes` entry 'matches no directory (paths are case-sensitive)' even when `realpath` resolved the entry to a directory elsewhere through a symlink; the case-sensitivity hint is then misleading. Report the resolved target and the actual reason (review round 2 minor, deferred as code-message polish).

## Acceptance Criteria

- [ ] The warning distinguishes 'no such directory' from 'resolves outside the docs tree via a symlink' and names the resolved path in the latter case
- [ ] A fixture with a symlinked docs directory asserts the message
