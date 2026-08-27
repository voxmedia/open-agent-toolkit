---
title: Reviewing OAT PRs
description: Understand synced-project records, SHA-pinned artifact links, and the reviewer-facing PR experience.
---

# Reviewing OAT PRs

A PR for a synced OAT project contains the implementation diff without placing
the agent-facing project tree on the feature branch. Reviewers get durable
project context through a small tracked record and a generated links block in
the PR body.

## The synced record

`.oat/projects/synced/<project>.json` is tracked on the feature branch. It
names the project slug, `origin`, `refs/oat/projects/<project>`, whether the
project is active or complete, and the archive snapshot when completion has
created one. It is discovery and lifecycle metadata; the project artifacts
themselves live on the project ref.

## The artifact links block

`oat project links` generates a delimited Markdown block for the PR body. Each
URL points at the exact project-ref commit current when the block was rendered,
so later pushes cannot silently change the content behind an existing link.
`oat project push` refreshes the block when the project's `state.md` identifies
an open PR.

The block includes the reviewer-oriented artifacts that exist:

- `discovery.md` for problem framing and constraints;
- `design.md` for the selected architecture; and
- `summary.md` for the concise outcome and durable decisions.

It does not link `plan.md`, `state.md`, `implementation.md`, or `reviews/`.
Those files are operational agent context, can be noisy or transient, and are
not part of the stable reviewer narrative. The implementation diff and normal
PR review remain authoritative for the code change.

## Editor discovery

The project checkout is a nested Git worktree. VS Code and Cursor may not show
it in Source Control unless repository scanning includes nested repositories.
Add the synced root to `git.scanRepositories` in workspace settings when you
want editor Git integration for these checkouts:

```json
{
  "git.scanRepositories": [".oat/projects/synced"]
}
```

This setting is an editor convenience. OAT's `push`, `pull`, and `links`
commands do not depend on editor discovery.

## Related

- [PR Flow](pr-flow.md)
- [Project Artifacts](artifacts.md)
- [Picking Up Projects](picking-up-projects.md)
