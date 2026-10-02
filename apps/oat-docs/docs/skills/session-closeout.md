---
title: Summarize What Shipped
description: Produce an evidence-backed shipping digest across projects and merged pull requests for a chosen reporting window.
---

Use a shipping digest for a team update or periodic recap. It answers what
shipped across a time window, not which task an active project should do next.

## oat-wrap-up

**Invocation:** `/oat-wrap-up --past-week --dry-run`. This is an agent
instruction, not a shell command. The slash form is the reliable way to start
it; Codex uses `$oat-wrap-up`, and asking for a wrap-up by name usually works
too. Choose exactly one window: `--past-week`,
`--past-2-weeks`, `--past-month`, or `--since YYYY-MM-DD` with optional
`--until YYYY-MM-DD`. Named windows and explicit dates are not combined.

**Prerequisites:** An OAT repository (one with a `.oat/` directory) and
authenticated GitHub CLI (`gh`) access for merged-PR evidence. Project
summaries are the `summary.md` files that `oat-project-summary` writes for
each OAT project; they make the digest richer, but with none in the window the
report is built from merged PRs alone. Needs an active OAT project: no.
Archived local summaries also contribute; if a configured archive has not been
synced, the skill warns and may suggest the separate `oat repo archive sync`
action rather than silently doing it.

**Example scenario:** Before Friday's team update, you want a concise account
of changes users can now rely on, including work that crossed several OAT
projects. Preview the past-week digest, check that its feature and fix claims
match merged PRs, then rerun without `--dry-run` to save the report.

The skill gathers project summaries and merged PRs for the selected window,
then synthesizes features, fixes, and capabilities. It deduplicates summaries
per project and assigns a merged PR to a project only when the project's
summary cites that PR number. Many summaries do not cite PR numbers, so expect
some PRs under "Other merged PRs" that belong to a project. Summaries are
selected by date, not completion status, so an in-progress project's summary
can appear. Treat the result as an editable draft and check it before sharing.
This is a reporting workflow: it does not modify source summaries, publish a
GitHub update, or close projects for you.

**What it does without asking:** It reads local summaries and queries GitHub
for merged PRs (read-only). Without `--dry-run` it writes one report file to
the destination below, creating the folder if needed. With `--dry-run` it
prints the report and writes nothing. It never commits the report, never
pushes, and never runs `oat repo archive sync` for you.

**Expected output:** With `--dry-run`, the digest is returned without writing
a file. Otherwise it is saved under the configured `archive.wrapUpExportPath`,
falling back to `.oat/repo/reference/wrap-ups/`, with a filename derived from
the reporting end date and window. `--output` can override the destination.
The report groups meaningful outcomes and keeps links to the underlying
evidence so readers can follow up. The report is written but not committed;
run `git add` and `git commit` yourself if you want to keep it in history.

**Next step:** Review the digest for audience fit and evidence gaps, then
share it through your usual communication process. Saving the report is not
the same as publishing it. For unfinished work, resume the relevant project
instead of using the digest as an execution instruction.
