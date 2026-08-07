---
oat_retro_project: null
oat_retro_generated: null
oat_retro_evidence_sources:
  - source: project-log
    status: unavailable
  - source: oat-execution-learnings
    status: unavailable
  - source: lifecycle-artifacts
    status: unavailable
  - source: session-transcript
    status: unavailable
oat_retro_promotions: none
oat_retro_filing: none
oat_generated: false
oat_template: true
oat_template_name: project-retro
---

# Project Retrospective: {Project Name}

<!-- Rendered artifacts must replace oat_retro_project with a non-null project
     slug and oat_retro_generated with a UTC YYYY-MM-DDTHH:MM:SSZ timestamp,
     set oat_template: false, and remove oat_template_name. Record every
     inspected evidence source above with status: used | unavailable. Remove
     all brace-delimited placeholders and scaffold RP/UP item examples. -->

<!-- Keep output concise by default. Every section must add distinct
     information. Prefer references to evidence over repeated chronology. For
     a small project, keep core sections brief. Use subsections and tables only
     for evidence-rich projects where they improve decisions. -->

## Executive Summary

{Summarize how the run went, the most important outcome, and what should change next.}

## Evidence and Review Method

{List the durable project artifacts and session/run evidence reviewed. State
unavailable sources explicitly. Distinguish confirmed causes, hypotheses, and
inconclusive mechanisms.}

## Outcome Snapshot

{Summarize delivered scope, verification, lifecycle outcome, and material
boundaries in a concise table or list.}

## Current State

<!-- This is the only mutable freeform status surface. Derive it from register
     fields and frontmatter rollups after generation and after every apply/file
     writeback. Consumers may replace only the contents of this section, not
     this heading or any other narrative. Keep it concise and include
     promotions, filing, and unsettled-item state. -->

- **Promotions:** {Current promotion rollup and item state.}
- **Filing:** {Current filing rollup and item state.}
- **Unsettled items:** {Current IDs and next actions, or `None`.}

## What Went Well

{Describe successful technical and workflow practices, grounded in evidence.}

## Challenges and Struggles

{Describe blockers, failed approaches, orchestration friction, and their
effects. Classify rather than blame.}

<!-- CONDITIONAL: Include both sections below when load-bearing decisions or
     rejected/superseded alternatives shaped the outcome. Otherwise delete
     both headings and their placeholders. -->

## Decision Register

{Record decisions, rationale, consequences, and existing durable records.
Identify any justified missing decision records.}

## Rejected or Superseded Alternatives

{Record alternatives that materially shaped the outcome and why they were
rejected or superseded.}

## Where We Changed Course

{Explain meaningful changes in direction and the evidence or feedback that
caused them.}

<!-- CONDITIONAL: Include when the project introduced reusable architecture
     patterns or materially new approaches. Otherwise delete this section. -->

## New Architecture Patterns and Approaches

{Describe reusable patterns, their boundaries, and why they worked.}

<!-- CONDITIONAL: Include when the run produced project-domain knowledge worth
     preserving. Rename subsections for the domain as needed. Otherwise delete
     this section. -->

## Domain Learnings

{Capture specific domain lessons, failure classes, and correct responses.}

<!-- CONDITIONAL: Include when the evidence supports actionable guidance for
     humans. Otherwise delete this section. -->

## Gotchas for Humans

{List concrete operator or contributor gotchas.}

<!-- CONDITIONAL: Include when the evidence supports actionable guidance for
     autonomous agents. Otherwise delete this section. -->

## Gotchas for Autonomous Agents

{List concrete execution, evidence, monitoring, and escalation gotchas.}

## Repo Improvements (Promotion Register)

<!-- Stable IDs: RP-NN. Type defaults: docs, agents-instruction, rule, and
     decision default to Disposition: apply; code-follow-up defaults to
     Disposition: file. The recorded Disposition is authoritative.

     Apply item fields:
       Status: proposed | approved | applied | rejected
       Target: repository path
       Applied-ref: commit/path after application
       Disposition-note: rejection, recovery, or outcome detail

     File item fields:
       Status: proposed | filed | rejected | no-destination
       Destination: issue URL or backlog item ID/path
       Destination-receipt: full commit SHA for a local backlog destination
       Remote-visibility: pushed | unpushed for a local backlog destination
       Disposition-note: rejection, recovery, or outcome detail

     Consumers may mutate only Status, Applied-ref or Destination, and
     Destination-receipt, Remote-visibility, Sanitized, Disposition-note, plus
     the corresponding frontmatter rollup and Current State contents. IDs,
     Type, Disposition, titles, proposal bodies, and all other narrative are
     stable. -->

### RP-01: {Actionable repo improvement}

- **Type:** docs
- **Disposition:** apply
- **Status:** proposed
- **Target:** {repository path}
- **Applied-ref:** —
- **Disposition-note:** —

{Rationale, evidence summary, and concrete proposed change.}

### RP-02: {Tracker-ready repo follow-up}

- **Type:** code-follow-up
- **Disposition:** file
- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** —

{Problem, evidence summary, and suggested direction.}

## OAT Upstream Feedback (Upstream Register)

<!-- Stable IDs: UP-NN. Status: proposed | filed | rejected | no-destination.
     Destination records the issue URL or backlog item ID/path. Sanitized
     records whether the public-destination verification passed. Consumers may
     mutate only Status, Destination, Destination-receipt, Remote-visibility,
     Sanitized, Disposition-note, the filing rollup, and Current State
     contents. IDs, titles, proposal bodies, and all other narrative are
     stable. -->

No upstream feedback identified.

<!-- Replace the empty-state line above with items in this form:

### UP-01: {Tracker-ready upstream feedback}

- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** —

{Problem, evidence summary, and suggested direction.}
-->

<!-- Rollup derivation:
     oat_retro_promotions derives only from RP items with Disposition: apply.
       `none`: no apply items exist.
       `proposed`: apply items exist and none are settled.
       `partial`: a mix of settled and unsettled apply items exists.
       `complete`: all apply items are settled.
       `proposed` and `approved` are unsettled; `applied` and `rejected` are settled.
     oat_retro_filing derives from all UP items plus RP items with
     Disposition: file.
     Each rollup is none | proposed | partial | complete and must be
     computable from register fields alone. -->

<!-- CONDITIONAL: Include when unresolved work or explicit ownership boundaries
     remain. Otherwise delete this section. -->

## Remaining Boundaries and Follow-Ups

{Record unresolved boundaries, owners, and next steps without disguising them
as completed work.}

## Reflections

{End with run-specific reflections about what the project taught, what made the
result trustworthy, and what future work should do differently.}
