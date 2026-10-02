---
title: Summarize What Shipped
description: Produce an evidence-backed shipping digest across projects and merged pull requests for a chosen reporting window.
---

Use a shipping digest for a team update or periodic recap. It answers what
shipped across a time window, not which task an active project should do next.

## oat-wrap-up

**Invocation:** `/oat-wrap-up --past-week --dry-run`. This is an agent
instruction, not a shell command; Codex uses `$oat-wrap-up`, and you can also
ask for the skill by name. Choose exactly one window: `--past-week`,
`--past-2-weeks`, `--past-month`, or `--since YYYY-MM-DD` with optional
`--until YYYY-MM-DD`. Named windows and explicit dates are not combined.

**Prerequisites:** An OAT repository with local project summaries and
authenticated GitHub CLI access for merged-PR evidence. There need not be an
active project. Archived local summaries also contribute; if a configured
archive has not been synced, the skill warns and may suggest the separate
`oat repo archive sync` action rather than silently doing it.

**Example scenario:** Before Friday's team update, you want a concise account
of changes users can now rely on, including work that crossed several OAT
projects. Preview the past-week digest, check that its feature and fix claims
match merged PRs, then rerun without `--dry-run` to save the report.

The skill gathers project summaries and merged PRs for the selected window,
then synthesizes features, fixes, and capabilities. It reconciles overlapping
project and PR evidence so one delivery is not counted twice. An incomplete
project or an unmerged PR should not become a shipped claim simply because it
was discussed during the window. This is a reporting workflow: it does not
modify source summaries, publish a GitHub update, or close projects for you.

**Expected output:** With `--dry-run`, the digest is returned without writing
a file. Otherwise it is saved under the configured `archive.wrapUpExportPath`,
falling back to `.oat/repo/reference/wrap-ups/`, with a filename derived from
the reporting end date and window. `--output` can override the destination.
The report groups meaningful outcomes and keeps links to the underlying
evidence so readers can follow up.

**Next step:** Review the digest for audience fit and evidence gaps, then
share it through your usual communication process. Saving the report is not
the same as publishing it. For unfinished work, resume the relevant project
instead of using the digest as an execution instruction.
