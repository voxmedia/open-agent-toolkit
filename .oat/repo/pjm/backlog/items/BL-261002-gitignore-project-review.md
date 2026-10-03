---
id: BL-261002-gitignore-project-review
title: Gitignore project review artifacts instead of committing them
status: open
priority: high
scope: task
scope_estimate: M
labels:
  - reviews
  - skills
  - cli
assignee: null
created: 2026-10-02T13:01:17.422Z
updated: 2026-10-02T13:01:17.422Z
associated_issues: []
external_plans: []
---

## Description

Operator request (2026-10-02, during Wave 4): OAT PRs should not carry a
pile of review files. Keep project review artifacts on disk for reference and
retros, but never version them.

Today only `reviews/archived/` is ignored (`.oat/**/reviews/archived` in the
`oat init` defaults, `packages/cli/src/commands/init/index.ts` around 622 and
`init/tools/index.ts` around 1324 and 1467). Active review artifacts are
committed: `oat-project-review-provide` commits each one ("record {scope}
review artifact", SKILL.md around 1179-1198), and receive and pr-final stage
their moves into the archive. On the Wave 3 branch nine review files were
committed during the run and only disappeared from the diff when they were
archived, so an open PR can show many review files.

Ignoring the whole `reviews/` directory also needs every staging site changed,
because `git add` of an ignored path fails. Retros and the plan's `## Reviews`
ledger keep working from the local files; synced projects already sync
through their own refs (`project/sync/ref-sync.ts`).

## Acceptance Criteria

- `oat init` and the repository's own `.gitignore` and `localPaths` ignore
  every project `reviews/` directory, not only `reviews/archived/`.
- `oat-project-review-provide`, `oat-project-review-receive`,
  `oat-project-pr-final`, and `oat-project-implement` no longer stage or
  commit review artifacts; their ledger and bookkeeping commits still happen,
  and no step runs `git add` on an ignored review path.
- Retro, receive, and the review resolver (`oat review latest`) still find
  review artifacts locally; synced and cloud project flows are checked and any
  cross-environment handoff that relied on committed reviews is documented.
- Existing repositories get a migration path (for example, a doctor or init
  check that offers to stop tracking already-committed review files).
- Docs and contract pins updated; skill version bumps and the lockstep bump
  in the same PR.
