---
title: Backlog Lifecycle
description: The states a file-backed backlog item moves through, how oat backlog archive closes it out atomically, and how oat pjm doctor catches lifecycle drift.
---

# Backlog Lifecycle

The file-backed backlog under `.oat/repo/pjm/backlog/` tracks work as one Markdown file per item. This page describes the lifecycle those items move through, the atomic close-out command that keeps the pieces in sync, and the diagnostics that flag drift when a close-out is done by hand and something is missed.

For the flag-by-flag command reference, see [`oat backlog archive`](../../reference/config-and-local-state.md#oat-backlog-archive). For the two-layer PJM (project management: OAT's file-backed backlog, roadmap, and decision records) surface that hosts the backlog, see [Tool Packs](../../getting-started/tool-packs.md#install-vs-initialize).

## Adoption comes first

`oat backlog` mutations require this repository to have adopted PJM. Installing
the `project-management` pack makes the capability available — including at user
scope, which is the default — but it does not adopt PJM for a repository, and
`oat backlog init` is not an alternate adoption path.

Run `oat pjm init` once per repository. Until adoption is recorded, backlog
mutations write nothing and return an error naming the repository path and
`oat pjm init` as the recovery. Check the current state with
`oat pjm doctor --json` and read its `adoption.state` field.

## Where a backlog item lives

- **`items/<id>.md`** - active, file-backed records. Each carries frontmatter with a `status` and an `updated` timestamp.
- **`archived/<id>.md`** - the resting place for closed-out items, preserving the full item file as history.
- **`completed.md`** - a newest-first summary log of completed work, one line per entry (`YYYY-MM-DD — BL-YYMMDD-slug — Title — one-line outcome`).
- **`index.md`** - the human-facing curated overview plus a managed, generated index table rebuilt from item frontmatter.

## Item statuses

An item's `status` frontmatter field is one of exactly four values:

- `open` - captured, not yet started.
- `in_progress` - actively being worked.
- `closed` - completed.
- `wont_do` - abandoned or intentionally declined.

`closed` and `wont_do` are the two **terminal** statuses. These are the only valid values — never invent variants like `done`. A terminal item belongs in `archived/`, not `items/`.

## Closing out an item

When an item reaches a terminal state, close it out with the atomic command rather than editing files by hand:

```bash
# completed work
oat backlog archive BL-260705-example --summary "shipped the thing"

# abandoned work
oat backlog archive BL-260705-example --wont-do --summary "superseded by BL-260706-other"
```

A single `oat backlog archive` run performs the whole close-out so its parts cannot drift apart:

1. Sets the terminal `status` (`closed` by default, `wont_do` with `--wont-do`) and stamps `updated`.
2. Validates and trims a nonblank `--summary` before mutating a `closed` item, then appends its canonical (standard OAT format) newest-first `completed.md` entry. `wont_do` items may omit the summary and get an entry only when one is provided.
3. Moves `items/<id>.md` into `archived/` — with `git mv` inside a work tree, or a plain rename outside git.
4. Rewrites inbound references to the moved file across Markdown under `.oat/repo/**` (tracked and untracked files that Git does not ignore; a code span whose whole content is the item's path, such as an external plan's source citation, is rewritten, while other code spans and fenced code are left as written with a warning) — external plans, decision records, and other backlog items — so no link dangles at `items/<id>.md`, and reports each rewritten file. A reference it cannot resolve is left alone with a warning.
5. Regenerates the managed backlog index.

The command is safe to re-run: an item already in `archived/` produces a no-op warning and only retries the reference rewrite and index regeneration, so an interrupted close-out finishes on the next run. A missing closed-item summary or an out-of-enum current status (for example a hand-set `done`) is a hard error before mutation and includes recovery guidance. See the [command reference](../../reference/config-and-local-state.md#oat-backlog-archive) for exit codes and the `--json` payload.

## Catching lifecycle drift

The manual close-out this command replaces is exactly where the two motivating repos drifted — an item was marked closed in frontmatter and summarized in `completed.md` but never moved to `archived/`, and one shipped with the invalid status `done`. `oat pjm doctor` (and therefore `oat doctor`, which aggregates the `pjm:*` checks) now surfaces that drift:

- **`pjm:backlog_terminal_in_items`** (fail) - a `closed` or `wont_do` item is still sitting in `items/`. Fix: run `oat backlog archive <id>` to finish the move.
- **`pjm:backlog_invalid_status`** (fail) - an item carries an out-of-enum or missing `status`. The message lists the offending file paths and the valid statuses.
- **`pjm:backlog_archived_open`** (warn) - an `open` or `in_progress` item is in `archived/`, which usually means it was archived prematurely.
- **`pjm:backlog_completed_unarchived`** (warn) - `completed.md` references an item whose file still lives in `items/`.
- **`pjm:backlog_duplicate_id`** (fail) - the same `<id>.md` exists in both `items/` and `archived/`. `oat backlog archive` refuses to auto-resolve this (it would clobber the archived record), so the duplicate must be reconciled by hand.

These backlog checks run once the repository is adopted. `oat doctor` keys the
`pjm:*` family on repository adoption state rather than on
`tools.project-management`, so a repository whose PJM capability lives at user
scope still gets full backlog diagnostics. An unadopted repository reports
`pjm:adoption` with the `oat pjm init` recovery instead of backlog drift.

Doctor reports drift; it never auto-fixes. A human or agent runs `oat backlog archive` (or corrects the status) and re-runs doctor to confirm the backlog is clean again.

## oat-pjm-add-backlog-item

**Invocation:** Ask, “Use oat-pjm-add-backlog-item to capture a retry-safety
review for imports, including acceptance criteria.” Use the skill name,
`/oat-pjm-add-backlog-item`, or `$oat-pjm-add-backlog-item` in Codex. These
forms are agent instructions, not shell commands; the same convention
applies to the other PJM skills below.

**Prerequisites:** Repository PJM adoption and enough context to describe the
work. Like every PJM skill that writes files on this page, it refuses to
write until the repository has adopted PJM with `oat pjm init`. The skill
first runs `oat pjm doctor --json` and inspects `adoption.state`; only
`declared` or `inferred-legacy` permits writes. For `none` or
`partial-initialization` it stops and tells you to run `oat pjm init`. Installed
tools alone do not establish adoption. No active OAT project is required.

**Example scenario:** A support incident exposed uncertainty about duplicate
records after retries. Capture an investigation with acceptance criteria
covering the write path, relevant failure cases, and an evidence-backed
recommendation, rather than creating an implementation project before the
problem is understood.

The skill collects the title, context, criteria, and optional triage fields,
then proposes a scope estimate for confirmation. The CLI creates the item
and managed index atomically. A collision requires a more specific title,
not overwriting an active or archived record. After creation, the agent
fills confirmed acceptance criteria while preserving generated frontmatter.

**Expected output:** A `BL-YYMMDD-slug` item under
`.oat/repo/pjm/backlog/items/`, a refreshed managed index, and any useful
curated-overview note. The summary includes the actual ID/path and confirmed
scope estimate. Creating the item records work to consider; it does not
start execution or publish an external issue.

**What it does without asking:** After you confirm the scope estimate, it
runs `oat backlog new`, which writes the item file and regenerates the
managed backlog index. It then fills in the acceptance criteria you
confirmed and may add a short note to the curated overview in
`.oat/repo/pjm/backlog/index.md`. Its workflow has no commit or push step
and sends nothing to an external tracker.

**Next step:** Prioritize it with [oat-pjm-review-backlog](#oat-pjm-review-backlog)
or explicitly start a suitable project. Follow the atomic close-out flow
above when the work reaches a terminal state.

## oat-pjm-review-backlog

**Invocation:** `/oat-pjm-review-backlog`, optionally with a backlog root and
`--roadmap=<path>` or `--output=<path>`. The default source is the file-backed
repository backlog. `--archive-dated` also saves a dated snapshot alongside
the living review.

**Prerequisites:** Adopted repository PJM, verified through
`oat pjm doctor --json` before writes, and accessible backlog items. A
roadmap is optional alignment evidence; an active OAT project is not
required. The skill stops and tells you to run `oat pjm init` if adoption
is absent or partial.

**Example scenario:** Your team has time for one maintenance initiative, but
the backlog mixes isolated fixes with work blocked on shared infrastructure.
Review item value, effort, and dependencies against the roadmap, then
discuss a realistic kickoff stack rather than treating every high-priority
item as safe to run concurrently.

**Expected output:** A living review at
`.oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md` unless overridden,
with ratings, dependency mapping, parallel lanes, roadmap alignment, and a
recommended sequence. Dated snapshots remain beside the living report.
References pair each backlog ID with a human-readable title so readers do
not need a separate board lookup.

Priority alignment and kickoff handoffs are optional collaborative steps.
They need operator context and an agreed kickoff stack; the review does not
silently choose capacity, lane count, or project starts. Any generated
handoff points back to the item and authoritative inputs rather than
replacing them. The execution view is written to
`.oat/repo/pjm/backlog/reviews/priority-alignment.md` and each handoff to
`.oat/repo/pjm/handoffs/<BL-id>.md`; handoffs for items dropped from the
kickoff stack are deleted with `git rm`.

**What it does without asking:** It writes the living review (and the dated
snapshot when you pass `--archive-dated`), creating the `reviews/` folder if
needed. Only after you accept the walkthrough and agree a kickoff stack does
it write or update `priority-alignment.md`, write or refresh handoff files,
and `git rm` handoffs for items that left the stack. It hands items to
`oat-repo-improve` only if you accept that offer, and it never generates
external plans itself.

**Next step:** Accept a priority walkthrough if you need an execution view,
or explicitly choose items for external-plan generation through
`oat-repo-improve`. A review recommendation is not implementation approval.

## oat-pjm-decision

**Invocation:** Ask, “Use oat-pjm-decision to record our choice to make import
retries idempotent, with its context and trade-offs.” This skill is for an
explicit request or confirmed capture, not automatic recording of every
routine choice.

**Prerequisites:** Repository PJM adoption verified with
`oat pjm doctor --json`, the decision scaffold, and meaningful context,
decision, and consequences. No active OAT project is required.
Review existing relevant decisions before finalizing a durable choice.

**Example scenario:** The team confirmed that a stable import identity must
span retries, accepting additional storage and cleanup work. Record why
this approach was chosen and what it enables or constrains so a future
maintainer does not reverse it based only on the extra implementation cost.

**Expected output:** A CLI-created `DR-YYMMDD-slug` record under
`.oat/repo/reference/decisions/`, completed Context, Decision, and
Consequences sections, and a generated index entry. The default status is
`proposed`; select `accepted` only when that is the actual decision state.
Preserve generated identity and use the CLI to refresh indexed metadata,
never hand-editing the managed index or replacing a collision.

**What it does without asking:** It runs `oat decision new`, which writes
the record and regenerates the managed decision index, then fills in the
Context, Decision, and Consequences sections and reruns
`oat decision regenerate-index` if it changed the status or title. Its
workflow has no commit or push step. If the decision index markers are
missing, it stops and tells you to repair the repository with
`oat pjm init`.

**Next step:** Review the record and link relevant work to it. If later
evidence changes the choice, preserve history through the appropriate
decision status or successor record rather than silently rewriting the
original rationale.

## oat-pjm-remote

This skill connects OAT records to a remote tracker such as GitHub, Linear,
or Jira. A binding is OAT's stored link between one local backlog item or
project and one remote issue. Intake reads a remote issue into a local
backlog item and creates a binding. Publish creates or updates the remote
issue from a local record.

**Invocation:** Ask, “Use oat-pjm-remote to refresh this repository's existing
remote binding from the configured tracker.” Name the intended operation and
exact remote context; do not assume local backlog capture authorizes
publishing it remotely. The skill supports these operations:

- `intake` reads one remote issue into a local backlog item
  (`--to-backlog <id>`) and creates the binding.
- `publish` creates or updates the remote issue for one selected binding,
  backlog item, or project.
- `refresh` updates OAT's saved copy of a binding without writing remotely.
- `reconcile` compares local, remote, and last-known changes before
  proposing any write.
- `operation continue` submits the result of a pending step so the same
  operation can finish.

Run these through the skill rather than as one-line shell commands. Each
`oat pjm remote` command expects a host agent (the AI coding tool running
the skill) to supply capability evidence on standard input: a short,
sanitized description of which connector or provider CLI it can use for
that tracker. The skill gathers that evidence for you.

**Prerequisites:** PJM adoption verified by `oat pjm doctor --json` (the
skill stops and points you to `oat pjm init` otherwise), applicable local
policy, and an available host capability matching the provider, operation,
and exact account, workspace, site, or repository. No active OAT project is
required. Remote mutation authority defaults to `read-only`, so `publish`
and every other remote write are refused until your repository policy
grants a higher authority (`user-approved`, `user-authorized`, or
`autonomous`). Mutations also need the current caller-owned authority
evidence (a record of who authorized this write) that the CLI asks for. The
skill looks for granted connectors first; if none matches, it can inspect
an already configured provider CLI with live help before the first attempt.
If neither surface qualifies, it stops rather than installing tools,
requesting credentials, or improvising a route.

The way a binding was created controls which fields can move. A binding
created by intake only pulls the title, description, and priority into OAT.
A binding created by publish lets those fields flow in both directions. See
[Remote Project Management](remote-project-management.md) for policy,
previews, approvals, and the remaining commands.

**Example scenario:** A tracker item changed after its OAT binding was last
refreshed. Request a refresh of that binding, preserving the local policy
boundary. A successful host read or visible tracker update is only evidence
for the CLI to verify, not an authoritative success verdict.

The host discovers live capability, executes only the exact semantic action
emitted by the OAT CLI (the provider-neutral step the CLI asks it to perform,
such as reading or updating one issue) at most once, and submits one bounded
sanitized observation (a short summary of the result with credentials and
raw provider responses removed). Continue only when the same durable
operation emits another action; do not broaden a field mask (the list of
fields the action may touch) or switch execution surfaces mid-attempt.
Discussion reads remain bounded read-only evidence, not comment
synchronization or an invitation to persist raw threads.

**Expected output:** The CLI's terminal operation envelope and verified
binding state, or an explicit pending/blocked outcome. Only `ok` after
authoritative read-back establishes remote success. Durable evidence excludes
credentials, native requests/responses, tool catalogs, and raw provider
payloads.

**What it does without asking:** It runs the adoption preflight
(`oat pjm doctor --json`), inspects the connectors your host has granted,
runs the operation you asked for, and executes each action the CLI emits
against the tracker at most once. The CLI saves operation state and
snapshots under `.git/oat/pjm-remote/`, and saves backlog bindings under
`.oat/repo/pjm/remote/bindings/`, which is not gitignored. When the target
backlog item does not exist yet, intake creates it from the remote title,
description, and priority. A remote write
happens only when your policy grants mutation authority and any preview or
approval the CLI requires has been given; under the default `read-only`
authority, the CLI refuses it. See the storage notes on the
[Remote Project Management](remote-project-management.md#storage-and-worktrees)
page before committing.

**Next step:** Inspect the CLI verdict and address a stated policy, authority,
or capability blocker before another action. Make any requested local
distillation a separately scoped edit, not a hidden remote mutation.

## oat-pjm-update-repo-reference

**Invocation:** Ask, “Use oat-pjm-update-repo-reference to reconcile the retry
work's shipped outcome, deferred follow-ups, and decision history.” Identify
the actual changed capability and the evidence to use.

**Prerequisites:** Repository PJM adoption verified with
`oat pjm doctor --json`, canonical backlog/reference scaffolds, and evidence
of what changed. It uses recent project artifacts when they exist, but you
do not need an active OAT project to run it.

**Example scenario:** Retry handling shipped, but an operator dashboard was
deferred and the roadmap still lists the whole effort as upcoming. Reconcile
the shipped portion, capture the deferred work, and preserve the decision
behind the retry model without declaring the dashboard complete.

**Expected output:** Applicable updates to current-state, Now/Next/Later
roadmap guidance, curated backlog context, item records, completed history,
and durable decisions. Completed items use `oat backlog archive` for atomic
status/history/move/index close-out; decisions use the canonical decision
commands. Managed indexes are regenerated, not hand-edited. The final
sanity check distinguishes valid active paths from retired references.

**What it does without asking:** It edits `current-state.md`, `roadmap.md`,
the curated overview, and backlog item files under `.oat/repo/pjm/` as it
judges applicable, with no separate approval step. It runs
`oat backlog archive` for completed items, which moves each item file into
`archived/` (with `git mv` inside a Git work tree), and it creates decision
records with `oat decision new`. Its workflow has no commit or push step,
so review the working-tree diff afterwards. If the backlog index markers
are missing, it stops and tells you to repair the repository with
`oat pjm init`.

**Next step:** Review the changes against the implementation evidence and
rerun diagnostics for lifecycle consistency. Start deferred work separately;
reference synchronization must not turn a follow-up into a shipped claim.
