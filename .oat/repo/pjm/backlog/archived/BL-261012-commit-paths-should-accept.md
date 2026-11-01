---
id: BL-261012-commit-paths-should-accept
title: commit-paths should accept tracked files under ignored directories
status: closed
priority: medium
scope: task
scope_estimate: S
labels:
  - artifact-cleanup
  - cli
  - developer-experience
assignee: null
created: 2026-10-12T04:48:58.861Z
updated: '2026-11-01T00:42:54Z'
associated_issues: []
external_plans: []
---

## Description

oat internal commit-paths exits 1 when an owned path is a tracked file under an ignored directory such as packages/cli/assets/\*, because its git add refuses ignored paths without -f. artifact-cleanup p02-t05 (commit 29ba174eb) had to fall back to git add -f plus git commit -- <paths>, outside the primitive's identity and receipt handling. commit-paths should stage an explicitly named path that git already tracks even when an ignore rule matches it, while still refusing untracked ignored paths.

**Correction (2026-10-31):** `packages/cli/assets/public-package-versions.json`
is no longer a case: `.gitignore:26` re-includes it
(`!packages/cli/assets/public-package-versions.json`), so lockstep bumps do
not meet this refusal. The real case is the tracked files under
`packages/cli/assets/templates/` (three today), which `packages/cli/assets/*`
(`.gitignore:25`) ignores by matching their parent directory. The failure
mechanism must be re-verified against the helper before work starts. A
scratch-repository probe on Git 2.56.0 found that `git add -A -- <path>` on a
tracked file succeeds (exit 0) when the ignore rule matches the file itself,
but when the rule matches its parent directory Git stages the change and
still exits 1 with "The following paths are ignored", which is what a helper
treating any nonzero exit as failure would report.

## Acceptance Criteria

- oat internal commit-paths commits an explicitly named, already tracked file under an ignored directory (for example a file under packages/cli/assets/templates/) with hooks enabled
- An untracked path matched by an ignore rule is still refused
- A change to a tracked file under packages/cli/assets/templates/ commits through commit-paths without a git add -f fallback
