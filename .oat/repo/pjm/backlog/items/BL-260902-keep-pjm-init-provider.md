---
id: BL-260902-keep-pjm-init-provider
title: Keep instruction-sync pointer files out of documentation content trees
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - pjm
  - cli
  - docs
  - instruction-sync
assignee: null
created: 2026-09-02T23:48:35.398Z
updated: 2026-09-03T00:08:42Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/238
external_plans:
  - .oat/repo/reference/external-plans/2026-09-02-keep-instruction-sync-pointers-out-of-docs-trees.md
---

## Description

Issue #238 reports `CLAUDE.md` pointer files (`@AGENTS.md`) landing inside documentation content trees and breaking docs validators, `oat docs generate-index`, and MDX builds. On the live tree `oat pjm init` never writes pointers (`packages/cli/src/commands/pjm/init.ts:50-55`); `oat instructions sync` does, by scanning every directory that holds an `AGENTS.md` with no docs-tree awareness (`instructions.utils.ts:27-37`). PR #244 already taught `oat pjm doctor` to accept the repo-level pointers; this item covers placement: skip the configured `documentation` docs directory and an explicit opt-out list in both `oat instructions sync` and `oat instructions validate`, preserving the `.oat/repo` carve-in. Source: GitHub issue #238.

## Acceptance Criteria

- `oat instructions sync` and `oat instructions validate` skip the configured `documentation` docs directory and any opted-out directory when planning pointer files, and agree with each other on the same tree.
- A documented opt-out lets a repository exclude additional directories from pointer placement without editing generated files by hand.
- Running `oat instructions sync` in a fixture with a documentation tree leaves the docs tree pointer-free across repeated runs while the `.oat/repo` carve-in still receives pointers.
- Existing repo-level pointers (`.oat/repo/CLAUDE.md`, `.oat/repo/reference/CLAUDE.md`) keep passing `oat pjm doctor` as PR #244 established.
- Focused tests cover docs-directory skipping, the opt-out, and idempotent re-runs.
