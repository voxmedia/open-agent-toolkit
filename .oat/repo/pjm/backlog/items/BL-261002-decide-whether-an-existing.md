---
id: BL-261002-decide-whether-an-existing
title: Decide whether an existing provider folder should activate sync without opt-in
status: open
priority: medium
scope: idea
scope_estimate: S
labels:
  - sync
  - provider-sync
  - needs-discussion
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:40:55.303Z
updated: 2026-10-02T18:40:55.303Z
associated_issues: []
external_plans: []
---

## Description

A provider is synced without any opt-in whenever its folder already exists. In
a repository that already had a committed `.claude/settings.json` and no
`oat providers set`, `oat sync --scope project` printed
`Provider config mismatch detected [project] (unset: claude).` and still
created `.claude/skills/<name>` links. At user scope, creating an empty
`~/.claude/` was enough for bare `oat sync` to write 75 skill links, 5 agent
links and `~/.oat/sync/manifest.json` under HOME.

Why it matters: whether OAT writes into a provider's folders depends on
whether that folder happens to exist, not on a choice the user made. This may
be intended (it is how detection works), but it surprises adopters and is
not stated as a policy.

Reproduced with the branch CLI. Evidence:
`.oat/projects/shared/docs-improvement-overhaul/references/fact-sheet-writes-and-removal.md` sections C6 and C7 (untracked in the
project when this item was filed).

Source: product defect list `.oat/projects/shared/docs-improvement-overhaul/references/product-defects-found.md` (docs-improvement-overhaul project, 2026-10-02), entry B5.

## Acceptance Criteria

- A decision is recorded (via `oat decision new`) on whether an unset provider
  is activated by folder detection, at project and user scope.
- If detection stays: the mismatch message says that sync is writing anyway
  and how to opt out, and docs state the policy plainly.
- If detection is dropped: an unset provider is not synced until enabled, with
  a migration note for repositories that relied on detection, and tests cover
  both scopes.
- `provider-sync/config.md:161` on the docs branch `docs-overhaul-readme-visual` matches the decision.
