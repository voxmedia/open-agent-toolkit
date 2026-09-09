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
completed SHAs require repair before lifecycle work continues. The same guard
applies to coordination children: a terminal child discovered while pulling
its parent is reported and skipped rather than adopted.

After adoption, set or open the project through the normal lifecycle command
you are using. Arrival-aware project skills pull before reading its artifacts.

An adopted quick-workflow project whose `plan.md` is not implementation-ready
resumes through `oat-project-quick-start`, which continues it in place without
re-scaffolding, rather than through `oat-project-implement`. `oat-project-plan`,
`oat-project-progress`, and `oat-project-next` all route by the single **quick
plan readiness** predicate that `oat-project-quick-start` defines; readiness is
never inferred from the presence of tasks alone.

`oat project status` and `oat project list` apply the same predicate. For a
quick project at the `plan` phase they recommend `oat-project-quick-start`, with
the unmet clause in the reason, until the plan carries ready frontmatter, a
durable `## Reviews` disposition, and a substantive task; only then do they
recommend `oat-project-implement`. Recommendations for lite, spec-driven, and
import projects are unchanged, because the predicate is quick-workflow policy.

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

If closeout is interrupted after terminal archive identity exists, rerun
completion so it can resume from the completed ref and archive metadata. Do not
use `pull` or `open` to recreate an active record or checkout.

For a `shared` project, archive moves the project into
`.oat/projects/archived/<project>/` and removes the source directory, while
completion keeps the `activeProject` pointer until the receipt validates.
Rerunning completion after an interruption between the archive and that clear
recognizes exactly this state — the pointer names a source directory that no
longer exists and the archive carries `oat_lifecycle: complete` plus the
`Lifecycle complete; archived locally` phase marker — so it validates the
discovered archive and clears the pointer without archiving a second time or
sealing the project log again. An interruption before the archive leaves the
source directory in place, so completion simply reruns from the start and skips
the work it already finished.

If the archive cannot be discovered — the source directory is gone and either
no archived project or several match the name — completion stops and leaves the
pointer untouched. Recover manually: locate the archive directory under
`.oat/projects/archived/`, confirm `oat_lifecycle: complete` in its `state.md`,
then clear the pointer with `oat config set activeProject ""`.

## Related

- [Reviewing OAT PRs](reviewing-oat-prs.md)
- [Project Artifacts](artifacts.md)
- [Implementation Execution](implementation-execution.md#synced-projects-in-worktrees)
