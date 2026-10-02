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

Terms used on this page:

- **Worktree:** a separate Git checkout of the same repository, with its own
  folder and branch, created with `git worktree add`.
- **Active project:** the OAT project your checkout currently points to,
  stored as `activeProject` in `.oat/config.local.json`.
- **Synced project:** a project whose artifacts live on a separate Git ref
  instead of on your feature branch; `oat project pull` brings them into a
  checkout.

## oat-worktree-bootstrap

**Invocation:** Name the branch for a new worktree and optionally choose its base.
Without `--base`, a new branch starts from `origin/main`. `--path` overrides the
worktree root, not the final branch-specific directory. The skill runs only
when you invoke it by name.

```text
/oat-worktree-bootstrap export-filter --base origin/main
```

To prepare the current already-registered worktree instead:

```text
/oat-worktree-bootstrap --existing
```

**Prerequisites:** Needs an active OAT project: no, but the skill uses one if
it is set. You need a Git repository, its required toolchain, and OAT files in
`.oat/` and `.agents/`. Creation requires a branch name and a repository clean
enough for the operation. If the active-project pointer exists but is invalid,
the skill asks you to clear or open the intended project rather than rewrite
it.

**What it does without asking:** the skill creates the worktree with
`git worktree add`, which also creates the branch when it does not exist yet.
It copies `.oat/config.local.json` into the new worktree when the worktree has
none, copies configured local-only paths with `oat local sync`, and pulls an
active synced project with `oat project pull`. It then runs the repository's
setup command (for example, dependency installation) and its readiness and
baseline checks, stating each selected command before running it. Apart from
the invalid-pointer question above, it asks before continuing only when the
baseline check fails;
if you choose to proceed anyway and an active project has `implementation.md`,
it appends a timestamped baseline-failure note there.

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
