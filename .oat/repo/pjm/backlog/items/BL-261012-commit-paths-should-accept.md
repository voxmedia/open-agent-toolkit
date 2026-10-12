---
id: BL-261012-commit-paths-should-accept
title: commit-paths should accept tracked files under ignored directories
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - artifact-cleanup
  - cli
  - developer-experience
assignee: null
created: 2026-10-12T04:48:58.861Z
updated: 2026-10-12T04:48:58.861Z
associated_issues: []
external_plans: []
---

## Description

oat internal commit-paths exits 1 when an owned path is a tracked file under an ignored directory such as packages/cli/assets/\*, because its git add refuses ignored paths without -f. artifact-cleanup p02-t05 (commit 29ba174eb) had to fall back to git add -f plus git commit -- <paths>, and every lockstep bump of packages/cli/assets/public-package-versions.json meets the same refusal, outside the primitive's identity and receipt handling. commit-paths should stage an explicitly named path that git already tracks even when an ignore rule matches it, while still refusing untracked ignored paths.

## Acceptance Criteria

- oat internal commit-paths commits an explicitly named, already tracked file under an ignored directory (for example packages/cli/assets/public-package-versions.json) with hooks enabled
- An untracked path matched by an ignore rule is still refused
- The lockstep version bump commits through commit-paths without a git add -f fallback
