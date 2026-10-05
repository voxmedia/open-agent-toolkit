---
id: BL-261002-teach-check-skill-bumps
title: Teach check:skill-bumps to follow vendored .agents/docs symlinks
status: closed
priority: medium
scope: task
scope_estimate: S
labels:
  - validation
  - skills
  - release
assignee: null
created: 2026-10-02T22:53:38.194Z
updated: '2026-10-05T03:05:32Z'
associated_issues: []
external_plans: []
---

## Description

check:skill-bumps (listChangedVersionedFiles in packages/cli/src/validation/skills.ts) diffs only paths under .agents/skills, so a change to a shared doc under .agents/docs reaches the skills that vendor it by symlink (references/docs/\*.md, or oat-project-autonomous/references/gate-inventory.md) without the gate requiring their version bumps. The backlog-wave-4 p04 review found oat-project-autonomous shipping the changed autonomy contract unbumped; oat tools update skips tools whose status is current, so installed copies would have kept the old contract. Today one pin in packages/cli/src/validation/skills.test.ts ('bumps every skill that ships the autonomy contract') covers autonomy-contract.md only; complexity-review-fallback.md, gate-approval-record.md, and the other vendored docs have no guard.

## Acceptance Criteria

- A change to any file under `.agents/docs` that a skill vendors by symlink
  makes `check:skill-bumps` require that skill's `metadata.version` bump, the
  same as a change under the skill's own directory.
- A test reproduces the missed case (a changed shared doc with an unbumped
  vendor) and fails without the fix; a bumped vendor still passes.
- The autonomy-contract-only pin in `skills.test.ts` is removed or reduced
  once the gate covers every vendored doc.
