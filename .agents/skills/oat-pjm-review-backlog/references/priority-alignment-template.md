# Backlog Priority Alignment

**Date:** {YYYY-MM-DD}
**Status:** {Active|Stale} — {one-line snapshot of what just shipped or shifted since the previous alignment, e.g. "Post-PR #XX ship of feature Y; new high-priority item Z promoted"}.

One-page execution guide: recommended order, scope, parallelism, and (optionally) planning investment. For the full value/effort catalog, dependency graph, and quadrant tables, see [backlog-and-roadmap-review.md](./backlog-and-roadmap-review.md).

> This document is produced or refreshed via the optional walkthrough at the end of `oat-pjm-review-backlog`. It is **not** auto-generated — phase shape, parallelism, and the kickoff stack reflect operator judgment captured during the walkthrough.

## Related sources

| Document                                                         | Role                                                                  |
| ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| [roadmap.md](../../roadmap.md)                                   | Authoritative Now / Next / Later execution order                      |
| [current-state.md](../../current-state.md)                       | Shipped capabilities and selected active backlog (if maintained)      |
| [backlog/index.md](../index.md)                                  | Curated overview + generated item table                               |
| [backlog/items/](../items/)                                      | Executable backlog records (one file per item)                        |
| [backlog-and-roadmap-review.md](./backlog-and-roadmap-review.md) | Full `oat-pjm-review-backlog` artifact (catalog, dependencies, waves) |
| Dated snapshots                                                  | `backlog-and-roadmap-review-YYYY-MM-DD.md` in this directory          |

<!--
Optional axis: some teams find a "planning investment" or "design effort" column
useful — it separates discovery/design time from total build time. If you use it,
define the term inline here so readers don't have to guess. Example:

> **Planning investment** = discovery/design likely needed *before* implementation
> pays off — not total build time.

If the team doesn't find it useful, omit the column entirely.
-->

---

## Finishing / in flight

Items already started, in code review, or otherwise mid-flight. Close these out before — or alongside — the next phase.

| Item                                             | Scope      | Notes                                        |
| ------------------------------------------------ | ---------- | -------------------------------------------- |
| [Item title](../items/{filename}.md) (`bl-XXXX`) | {S/M/L/XL} | {Status, blocker if any, next concrete step} |

---

<!-- Repeat one section per execution phase. Use repo-specific phase names —
     organize by initiative, parallel lane, or sequencing constraint, not by
     generic "Phase 1 / Phase 2". The point of named phases is that operators
     can talk about them ("the synthesis phase", "the docs IA push"). -->

## Phase {N} — {Repo-specific name}

{One short paragraph: what this phase represents, how many tracks can run in parallel inside it, any kickoff constraints (e.g. "weekly pair is one combined kickoff").}

| Item                                             | Scope      | {Optional column} | Parallel with        | Notes                                   |
| ------------------------------------------------ | ---------- | ----------------- | -------------------- | --------------------------------------- |
| [Item title](../items/{filename}.md) (`bl-XXXX`) | {S/M/L/XL} | {Low/Med/High}    | `bl-YYYY`, `bl-ZZZZ` | {One-line context — gotchas, decisions} |

---

## Parallelism cheat sheet

Quick lookup for "can I start X while Y is in flight?"

| Can run together      | Keep sequential            |
| --------------------- | -------------------------- |
| `bl-XXXX` ∥ `bl-YYYY` | `bl-AAAA` before `bl-BBBB` |
| {…}                   | {…}                        |

---

## Suggested next kickoff stack

Three concrete actions for the next development cycle. Not a ranked list of everything — just what to do _first_.

1. **{Close|Kick off|Defer}** [`bl-XXXX`](../items/{filename}.md) — {one-line reason: why now, what it unblocks}
2. **{Close|Kick off|Defer}** [`bl-YYYY`](../items/{filename}.md) — {one-line reason}
3. **{Close|Kick off|Defer}** [`bl-ZZZZ`](../items/{filename}.md) — {one-line reason}

---

## Changelog

Append a new row each time this file is refreshed via the `oat-pjm-review-backlog` walkthrough. Keep entries short — what shifted and why.

| Date         | Update                                                                             |
| ------------ | ---------------------------------------------------------------------------------- |
| {YYYY-MM-DD} | {What changed this pass: promotions/demotions, new high-pri items, phase reshapes} |
