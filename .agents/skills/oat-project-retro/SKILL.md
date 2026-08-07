---
name: oat-project-retro
version: 1.0.1
description: Use when the user requests or confirms a project retrospective — e.g. "run the project retro", "write project-retro.md", "retrospective this project", or confirms a previously offered retro. Do NOT auto-invoke merely because implementation or summary completed. Produces references/project-retro.md from project logs, execution learnings, and session/transcript evidence, with repo improvements and OAT upstream feedback.
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Bash(pnpm:*), Bash(oat config:*), Bash(oat decision:*), Bash(oat project log:*), Bash(oat tools:*), Glob, Grep, AskUserQuestion
---

# Project Retrospective

Generate an evidence-grounded project retrospective or apply approved
repo-improvement items from an existing retrospective.

## Mode Resolution

Resolve exactly one mode before reading evidence:

- **Generate:** an explicit retro/retrospective request, a configured
  post-approval `retro` sequence step, or confirmation of a retro offer.
- **Apply:** an explicit apply flag or wording such as "apply the retro
  findings." Apply mode requires an existing artifact and never regenerates it.
- Explicit flags or wording beat inference. If the request remains ambiguous,
  ask once.

Do not auto-invoke merely because implementation, summary, or completion work
finished. A configured sequence step or direct confirmation is explicit
consent to generate.

For apply mode, follow
[references/apply-procedure.md](references/apply-procedure.md) and skip the
generation process below.

Apply mode treats a docs item as an append-only project-log correction only
when its safe normalized target canonical path has the exact final path
component `project-log.md`; use `oat project log append` and never directly edit
the log.
Fail closed on absolute, traversing, or otherwise ambiguous targets. The
proposal must identify the prior heading or event being corrected and preserve
the original entry. Follow the reference's judgment flags, stable correction
identity, correction-commit, and later retro-writeback transitions. Perform
semantic post-side-effect recovery before appending again. Record `Applied-ref`
only after the correction and retro writeback are durably committed.

## Progress Indicators

Print one banner and concise step indicators:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ PROJECT RETRO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Use `[1/6] Resolving project and mode…` through `[6/6] Formatting and
committing…`. Name evidence inventory, synthesis, disposition, and project-log
steps as they begin.

## Artifact Hygiene

Before finishing or committing, format every created or edited file with the
repository's documented write/fix formatter, preferably file-scoped. Run the
checks relevant to those files after formatting. Never leave a partial retro:
complete it fully or delete the newly created partial file.

## Generate Process

### Step 1: Resolve the Active Project

Use an explicit project path when supplied. Otherwise resolve:

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
```

If it is absent or invalid, ask for the project and resolve it beneath the
configured projects root. Derive `PROJECT_NAME` from the directory name.
Confirm the target before expensive transcript retrieval.

The output is always:

```text
{PROJECT_PATH}/references/project-retro.md
```

### Step 2: Inventory Evidence Honestly

Follow the reading order and environment detection in
[references/evidence-and-lanes.md](references/evidence-and-lanes.md).

Create an inventory before synthesis. Record every source in
`oat_retro_evidence_sources` with `status: used | unavailable`; name unavailable
sources in `## Evidence and Review Method`. Do not invent session-only claims.
When an evidence family is partial, split it into truthful source entries, for
example `archived-review-markdown: unavailable` and `gate-receipts: used`
instead of `review-artifacts: unavailable`. Do not add a `partial` evidence
status. Derivative current-run reconnaissance transcripts are not original
project-run evidence.

Use optional bounded, read-only reconnaissance lanes only when project size
justifies them. Root synthesis remains with the invoking agent.

### Step 3: Render the Artifact

Copy `.oat/templates/project-retro.md` to the output path and render it against
[references/retro-quality-bar.md](references/retro-quality-bar.md).

Keep output concise by default. Every section must add distinct information.
Prefer references to evidence over repeated chronology. For a small project,
keep core sections brief. Use subsections and tables only for evidence-rich
projects where they improve decisions. This evidence-scaled depth adds no new
consent-bearing config surface.

Each material incident must stand alone: a reader can understand it without
opening another artifact. Use stable evidence anchors such as project-log event
IDs, artifact headings, review paths, decision IDs, and commit IDs. Anchors
supplement but never replace explanation.

Give each narrative section one job:

- `Challenges and Struggles` owns the complete incident narrative: what
  happened, impact, response, and result.
- `Where We Changed Course` records only the trigger, changed direction, and
  outcome.
- `Domain Learnings` abstracts reusable lessons without replaying chronology.
- `Gotchas for Humans` and `Gotchas for Autonomous Agents` contain
  future-facing instructions rather than incident summaries.

Required contracts:

1. Keep all core sections and only evidence-supported conditional sections.
2. Render `## Current State` from register fields and frontmatter rollups. This
   is the only freeform live-status surface that apply/file writeback refreshes.
3. Phrase status elsewhere as generation-time evidence, not as live status.
4. Separate the Repo Improvements and OAT Upstream Feedback lanes.
5. Use stable `RP-NN` and `UP-NN` item IDs.
6. Give every RP item a `Type`, authoritative `Disposition: apply | file`, and
   fields/status matching that disposition.
7. Give every register item a mutable `Disposition-note` initialized to `—`.
8. Start every actionable item at `Status: proposed`.
9. Keep the upstream section and its explicit empty-state line when no item is
   warranted.
10. Derive `oat_retro_promotions` from RP apply-items and `oat_retro_filing`
    from UP items plus RP file-items.

Narrative outside `## Current State` is immutable historical analysis after
generation. It may describe an item's generation-time status when explicitly
qualified, but it must not claim a register item "remains" or "is currently"
in a mutable state. Proposal bodies remain immutable.

Before the artifact can be considered complete:

- set `oat_retro_project` to the non-null project slug;
- set `oat_retro_generated` to a non-null UTC generation timestamp in
  `YYYY-MM-DDTHH:MM:SSZ` form;
- reject all unreplaced scaffold item examples and placeholders, including
  example `RP-01`/`RP-02`/`UP-01` headings, brace-delimited instructional text,
  and template-only empty item blocks;
- set `oat_generated: true` and `oat_template: false`; and
- remove `oat_template_name` entirely.

A rendered artifact must never retain scaffold-only template markers or null
provenance.

### Step 4: Resolve Post-Generation Consent

Read effective `workflow.retro.apply` and `workflow.retro.filing` configuration.

**Interactive run:**

1. Present the generated register summary.
2. Ask whether to apply eligible RP apply-items now.
3. If unfiled UP or RP file-items exist, offer the `oat-project-retro-file`
   skill.

**Non-interactive run:**

- Apply only when `workflow.retro.apply` is `auto`.
- `ask` or absent means propose-only.
- Chain to `oat-project-retro-file` only when at least one
  `workflow.retro.filing` destination is explicitly configured.
- Without filing config, file nothing and report that proposals remain.

All applications follow the apply procedure. Filing remains owned by
`oat-project-retro-file`; generate/apply mode does not file tracker items.

### Step 5: Record the Run

Append a structural project-log entry with `oat project log append` when the
project log exists. Never hand-edit the project log. Use this exact one-line
receipt shape, with every key present exactly once:

```text
retro artifact=<path> evidence_used=<csv> evidence_unavailable=<csv> promotions=<number> upstream=<number> apply=<performed|declined|skipped|deferred> filing=<performed|declined|skipped|deferred>
```

`artifact` is the repo-relative retro path. `evidence_used` and
`evidence_unavailable` are deterministic source lists. Source identifiers are
deduplicated, sorted in bytewise ascending order, and serialized as
comma-separated values with no spaces; an empty list is `none`. Reject an
identifier unless it matches `[a-z0-9][a-z0-9._:-]*`; this excludes commas and
whitespace. `promotions` is the RP register count and `upstream` is the UP
register count. `apply` is the apply action outcome and `filing` is the filing
action outcome. Counts describe artifact contents; outcomes describe actions.
Never reuse a count key for an outcome or encode a count in `filing`.

Resolve each action outcome independently at receipt time. The apply eligible
set is RP items with `Disposition: apply` and an unsettled status. The filing
eligible set is UP items plus RP `Disposition: file` items with an unsettled
status. Use these mutually exclusive rules; an empty eligible set takes
precedence over every non-entry reason, an action-level interactive rejection
takes precedence over deferral, and normal completion applies only after the
action was entered and returned successfully:

| Scenario                       | Outcome   | Deterministic rule                                                                                        |
| ------------------------------ | --------- | --------------------------------------------------------------------------------------------------------- |
| Normal completion              | performed | Action entered and reached normal completion; durable side effects or exact recovered no-ops are included |
| Interactive action rejection   | declined  | Interactive user rejects the action-level offer before entry                                              |
| No eligible items              | skipped   | Eligible set is empty at decision time                                                                    |
| Non-interactive consent absent | deferred  | Eligible items remain but required apply or filing config is absent                                       |
| Configured deferral            | deferred  | `apply: ask` without interaction or filing destination `none` leaves eligible items for later             |
| Child or apply failure         | deferred  | Eligible items remain because the invoked procedure failed or was interrupted before normal completion    |

Item-level rejection inside an action that otherwise reaches normal completion
does not change the action outcome from `performed`. A child-skill or apply
failure after some durable side effects is still `deferred` because eligible
work remains and the action did not complete normally.

Build the one-line body in `RECEIPT_BODY`, then use this complete invocation.
The producer and ref are stable literals:

```bash
oat project log append --project "$PROJECT_PATH" --structural \
  --producer oat-project-retro \
  --ref project-retro \
  --body "$RECEIPT_BODY"
```

Do not append if body validation fails. After the command succeeds, verify the
generated structural heading uses producer `oat-project-retro` and ref
`project-retro`, and verify the appended body exactly equals `RECEIPT_BODY`.

### Step 6: Format, Verify, and Commit

Format the retro, any approved promotion targets, and any decision records.
Verify:

- required core sections exist;
- evidence availability is explicit;
- every RP item has a valid disposition and matching fields/status;
- every register item has a `Disposition-note`;
- rollups are derivable from register fields;
- `Current State` is derived from register fields and frontmatter rollups and
  contains no contradictory status claim;
- `oat_retro_project` is a non-null project slug;
- `oat_retro_generated` is a valid UTC generation timestamp;
- no unreplaced scaffold item examples, placeholders, or brace-delimited
  instructions remain;
- rendered template metadata is retired; and
- final verification confirms the structural receipt has all required keys
  exactly once, both register counts are numeric, and count keys are never
  reused for action outcomes; and
- no unrelated implementation file changed.

Commit the artifact, project-log append, and any approved apply outputs. Use
one reviewed batch when items are tightly coupled; otherwise use one commit per
item as described in the apply procedure. Never stage unrelated changes.

## Success Criteria

- The resolved mode matches explicit user/config intent.
- `references/project-retro.md` is complete, evidence-grounded, and not marked
  as a template.
- Missing evidence is named; hypotheses remain hypotheses.
- Both feedback lanes are explicit and machine-scannable.
- Register statuses and frontmatter rollups agree.
- `Current State` agrees with the registers and rollups; immutable historical
  narrative does not masquerade as live status.
- No promotion is applied or item filed without interactive approval or
  explicit non-interactive configuration.
- The project log and commit preserve the outcome without unrelated changes.
