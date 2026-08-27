---
title: Picking Up Projects
description: Continue a synced OAT project on another machine or from another user through its dedicated Git ref.
---

# Picking Up a Project on Another Machine or From Another User

Synced projects travel through ordinary Git refs on `origin`. Their artifact
history is independent from the implementation branch, so a teammate or a
second machine can continue the project even before the branch carrying its
record file merges.

## Discover and adopt

From any checkout with access to `origin`:

```bash
oat project list --remote
oat project pull <project>
```

`list --remote` discovers `refs/oat/projects/*` directly. `pull` can adopt a
remote project that has no local record yet: it writes the record and creates
the nested checkout. When the selected project is a coordination parent, pull
also discovers and pulls its child projects by default. Pass `--no-children`
only when you intentionally want the selected project alone.

After adoption, set or open the project through the normal lifecycle command
you are using. Arrival-aware project skills pull before reading its artifacts.

## What travels

- The project ref carries the complete active artifact tree and its history.
- The tracked JSON record travels once the branch containing it is shared or
  merged.
- Coordination relationships travel in the artifacts and records pulled with
  the project.

## What does not travel automatically

- `local` projects never leave their original machine.
- GitHub forks copy branches and tags, but not the `refs/oat/*` namespace. A
  fork collaborator needs access to the upstream remote or an explicit ref
  transfer.
- A normal `git clone` fetches branches and tags, not custom OAT refs. OAT
  handles remote discovery with `ls-remote` and explicitly fetches the selected
  project ref during sync operations such as `pull`; do not expect a generic
  clone or `git fetch` to materialize the checkout.

## Why retained refs remain durable

`refs/oat/projects/<project>` is a real Git ref locally and on `origin`. The
objects reachable from it remain garbage-collection roots even when no nested
checkout exists. Branch pruning, remote-tracking-ref pruning, and
`git worktree prune` do not delete the project ref. Completion deliberately
retains it so pinned PR links remain valid.

Only the explicit destructive operation `oat project prune` removes the local
and remote project refs. Treat it as permanent project-history deletion and
review its warnings before using `--force`.

## Archive contents

Completion copies a synced project into `.oat/projects/archived/<project>/`
without the nested checkout's `.git` pointer or `reviews/`. S3 snapshots also
omit `pr/`, following the existing archive policy. The ref remains available
after completion, while the tracked record changes to `complete` and identifies
the archive snapshot.

## Related

- [Reviewing OAT PRs](reviewing-oat-prs.md)
- [Project Artifacts](artifacts.md)
- [Implementation Execution](implementation-execution.md#synced-projects-in-worktrees)
