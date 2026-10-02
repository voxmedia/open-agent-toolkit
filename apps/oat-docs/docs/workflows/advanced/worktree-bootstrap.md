---
title: Worktree bootstrap
description: 'Create or validate an isolated Git worktree and run the repository-specific readiness checks before implementation.'
---

# Worktree bootstrap

Use a separate worktree when a task needs its own branch and checkout. Bootstrap
prepares that checkout. It does not approve a plan, implement code, or prove that
another worktree's tests pass here.

Examples beginning with `/` invoke an agent skill. Providers that use `$` skill
syntax use `$oat-worktree-bootstrap` instead. These are not terminal commands.
For host-managed worktrees, follow the host's conventions and validate the
existing checkout rather than creating a duplicate to normalize its path.

## oat-worktree-bootstrap

**Invocation:** Name the branch for a new worktree and optionally choose its base.
`--path` overrides the worktree root, not the final branch-specific directory.

```text
/oat-worktree-bootstrap export-filter --base origin/main
```

To prepare the current already-registered worktree instead:

```text
/oat-worktree-bootstrap --existing
```

**Prerequisites:** Project applicability is `optional`. You need a Git
repository, its required toolchain, and OAT files in `.oat/` and `.agents/`.
Creation requires a branch name and a repository clean enough for the operation.
An active project is not required. If the pointer exists but is invalid, the
skill asks you to clear or open the intended project rather than rewrite it.

**Example scenario:** You need to implement an export filter without mixing its
changes into a reporting branch. Bootstrap creates the feature worktree at the
chosen base, carries safe local context, and runs that repository's setup and
baseline checks. If Orca or another host already created the checkout, choose
`--existing` to validate and initialize that same worktree.

**Expected output:** The reported checkout has the intended branch and path,
bootstrap results, readiness status, and a next action. Root selection follows
the explicit `--path`, environment, configured root, then documented directory
precedence. Repository-local roots must be Git-ignored before creation.

Local config copies only when the destination is absent. Configured local paths
are synchronized, and active synced project context is pulled when present.
Setup comes from repository instructions and manifests, not an assumed package
manager. Baseline failures require a disposition. Setup failure or a dirty
post-bootstrap worktree cannot be reported as ready.

**Next step:** Review the actual readiness result, then use
`oat-project-implement` for an approved tracked plan. Without an active project,
choose a [project entry workflow](../projects/planning/starting-projects.md)
before tracked implementation.
