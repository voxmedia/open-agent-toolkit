---
title: Project Retrospectives
description: Generate evidence-grounded project retrospectives, apply repo improvements, and file tracker feedback.
---

# Project Retrospectives

OAT project retrospectives capture how an implementation run went and route
what should change next. The workflow uses two skills:

- `oat-project-retro` generates
  `{PROJECT_PATH}/references/project-retro.md` and applies approved repo
  improvements.
- `oat-project-retro-file` files tracker-bound feedback into repository or
  upstream GitHub issues and OAT backlog items.

A configured `retro` post-approval sequence step can generate the artifact
after final feedback exists and before project completion freezes lifecycle
artifacts. Interactive completion also offers generation when the artifact is
missing. Neither path applies or files findings without separate consent.

## Generate a retrospective

Ask to run the project retro, or configure `retro` in
`workflow.postImplementSequence.postApproval`. Generate mode resolves the active
project, inventories evidence, renders the retro artifact, and records the run
in the project log when that log exists.

Evidence is read in this order:

1. `project-log.md`
2. `oat-execution-learnings.md`, when present
3. Lifecycle artifacts such as `implementation.md`, `state.md`, `plan.md`,
   design and discovery artifacts, reviews, and evidence ledgers
4. The current session or run transcript when the environment makes it
   available

The artifact identifies every used or unavailable source. Missing transcript
access is recorded rather than hidden, and runtime claims fall back to durable
ledgers when transcript output is incomplete. Findings distinguish confirmed
causes, hypotheses, and inconclusive mechanisms.

### Scale depth to the evidence

Keep output concise by default. Every section must add distinct information.
Prefer references to evidence over repeated chronology. For a small project,
keep core sections brief. Use subsections and tables only for evidence-rich
projects where they improve decisions. The required core and register
contracts stay intact; evidence volume controls depth, not a new configuration
or consent setting.

Every retro contains two machine-scannable registers:

- **Repo Improvements (`RP-NN`)** route each item through
  `Disposition: apply` for a bounded repo edit or `Disposition: file` for a
  tracker follow-up.
- **OAT Upstream Feedback (`UP-NN`)** contains sanitized, tracker-ready
  suggestions for toolkit improvements. The section remains present with an
  explicit empty state when no upstream item is warranted.

Per-item statuses and frontmatter rollups make interrupted and repeated runs
resumable. The promotions rollup covers RP apply-items; the filing rollup covers
UP items plus RP file-items.

## Apply repo improvements

Invoke apply mode directly with wording such as "apply the retro findings."
Apply mode requires an existing retro and never regenerates it. It processes
only RP items whose authoritative disposition is `apply` and whose status is
`proposed` or `approved`.

Interactive runs present each item, target, rationale, and concrete edit before
approval. Non-interactive runs apply items only when
`workflow.retro.apply: auto`; an absent value or `ask` leaves proposals
untouched when no interaction is possible.

Application follows the item type:

- documentation updates the canonical existing page;
- agent instructions update the narrowest existing instruction surface;
- rules update the canonical scoped rule;
- decisions use `oat decision new` after an exact duplicate check; and
- code follow-ups default to `Disposition: file` and remain outside apply mode.

After a successful application, the skill records `Status: applied` and an
`Applied-ref`. Re-runs skip settled items and recover an exact prior side effect
instead of applying it twice.

## File tracker feedback

Run `oat-project-retro-file` against the active project's retro or an explicit
artifact path. It extracts every UP item and each RP item with
`Disposition: file`; it never mutates apply-items.

Before item approval, the skill reports a lane-by-destination capability
matrix:

| Lane     | Destination | Preflight                                             |
| -------- | ----------- | ----------------------------------------------------- |
| Repo     | Issues      | GitHub issues enabled and `gh` authenticated          |
| Repo     | Backlog     | Canonical OAT backlog initialized and writable        |
| Upstream | Issues      | Upstream issues enabled and creation authorized       |
| Either   | None        | Intentionally disabled; no external capability needed |

Interactive runs confirm or override configured lane defaults and choose a
disposition for each suspected duplicate:

1. **Strengthen** the existing issue or backlog item with new evidence.
2. **File as new** despite the candidate.
3. **Skip** without filing.
4. **Link existing** without adding content.

Strengthening is the default when applicable, but it is still an external
write. Non-interactive configuration does not authorize modifying an existing
destination; an unambiguous duplicate may be linked without an external write,
while ambiguous candidates remain unsettled for interactive review.

### Local receipts and reruns

Before skipping an already-filed item, the filing skill runs a pre-selection
integrity pass. A local backlog destination is complete only when its path
exists, its current contents still represent the retro proposal, its full
`Destination-receipt` names the latest exact-path commit containing that path,
and `Remote-visibility` is `pushed` or `unpushed`. A valid exact recovery may
retain `filed` without mutating the destination. A missing or invalid local
receipt that cannot be recovered cannot remain `filed`.

New and strengthened local destinations use destination-first ordering: commit
the destination mutation alone, verify that commit contains the backlog path
and excludes retro writeback, then record its receipt in a later retro
writeback commit. A failed destination commit never produces `filed`. A local
link performs no destination mutation, but must recover and validate the latest
exact-path commit before it can be filed.

Remote visibility is independent of local durability. No configured upstream
means `unpushed`; the skill never pushes without separate authorization.
GitHub destinations use a validated issue URL and explicitly leave
`Destination-receipt` and `Remote-visibility` as `—`.

Public destinations receive a sanitization check when the source repository is
private. Filing records the confirmed URL or backlog path in `Destination` and
updates the filing rollup. Unavailable lanes and missing backlog metadata are
reported rather than silently rerouted or invented.

## Configure non-interactive consent

The `workflow.retro` namespace controls non-interactive actions:

| Key                              | Values                      | Unset behavior                              |
| -------------------------------- | --------------------------- | ------------------------------------------- |
| `workflow.retro.apply`           | `auto`, `ask`               | Propose only                                |
| `workflow.retro.filing.repo`     | `issues`, `backlog`, `none` | No repo-lane filing                         |
| `workflow.retro.filing.upstream` | `issues`, `none`            | No upstream-lane filing                     |
| `workflow.retro.upstreamRepo`    | `owner/repo`                | Guidance uses `voxmedia/open-agent-toolkit` |

Explicit `auto` or filing destinations count as consent only for their bounded
action. Architecture, security, product-scope, credential, destructive, and
duplicate-mutation boundaries still require direction. See
[Configuration](../../cli-utilities/configuration.md#workflow-preferences-workflow)
for the full key reference.

## Summary versus retrospective

|                       | Summary                       | Retrospective                                    |
| --------------------- | ----------------------------- | ------------------------------------------------ |
| Primary question      | What did we build and decide? | How did the run go, and what should change next? |
| Session transcript    | Optional                      | Required when available                          |
| OAT upstream feedback | Rare                          | Required section or explicit empty lane          |
| Tone                  | Institutional memory          | Reflective and operational                       |
| Default path          | `summary.md`                  | `references/project-retro.md`                    |

Use the summary to preserve the delivered system and its decisions. Use the
retro to preserve execution lessons, course changes, repo improvements, and
upstream toolkit feedback.
