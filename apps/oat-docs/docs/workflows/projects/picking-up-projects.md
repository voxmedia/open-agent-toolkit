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

Completed projects are not adoption candidates. Their authoritative ref is
`refs/oat/completed/<project>`; both `pull` and `open` return a terminal
diagnosis instead of recreating an archived checkout or record. A same-SHA
active ref may remain as an inert alias and is ignored. Differing active and
completed SHAs require repair before lifecycle work continues.

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

## Why completed refs remain durable

`refs/oat/completed/<project>` is a real Git ref locally and on `origin`. The
objects reachable from it remain garbage-collection roots even when no nested
checkout exists. Branch pruning, remote-tracking-ref pruning, and
`git worktree prune` do not delete the completed ref. Completion deliberately
retains this terminal reachability root so pinned PR links remain valid.

Only the explicit destructive operation `oat project prune` removes the
completed ref and any matching active alias. Treat that as permanent Git
project-history reachability deletion and review its warnings before using
`--force`. Prune does not remove durable local or S3 archive snapshots, and it
refuses to delete either ref when their SHAs differ.

## Archive contents

When archive is selected, completion copies a synced project into
`.oat/projects/archived/<project>/` without the nested checkout's `.git`
pointer or `reviews/`. S3 snapshots also omit `pr/`, following the existing
archive policy. When archive is disabled or declined, the active synced
checkout remains in place. Successful archived closeout instead uploads the S3
snapshot first when configured, makes the completed ref authoritative, removes
the checkout, and deletes the tracked JSON record. The local archive metadata
retains the source-ref identity needed for recordless retries and later S3
restore without recreating active state.

## Related

- [Reviewing OAT PRs](reviewing-oat-prs.md)
- [Project Artifacts](artifacts.md)
- [Implementation Execution](implementation-execution.md#synced-projects-in-worktrees)
