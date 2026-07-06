---
id: DR-260706-review-artifacts-use-seconds
title: Review artifacts use seconds-precision UTC timestamps
date: 2026-07-06
status: accepted
legacy_id: null
---

# Review artifacts use seconds-precision UTC timestamps

## Context

Review artifacts were named `<scope>-review-YYYY-MM-DD.md` with a date-only
`oat_generated_at`. When a phase or the final scope is re-gated several times in
one day, the filenames collided and — worse — the artifacts tied on
`oat_generated_at` in `oat review latest`, which then fell through to a lexical
path tiebreak unrelated to recency. A stale earlier round could resolve as
"latest," and an orchestrator watching the filesystem could act on a prior
FAIL before the fresh PASS was written.

## Decision

Review artifact filenames and `oat_generated_at` use a seconds-precision **UTC**
timestamp: filename token `YYYY-MM-DDTHHMMSSZ` (from `date -u +%Y-%m-%dT%H%M%SZ`)
and frontmatter `YYYY-MM-DDTHH:MM:SSZ`. The `-u`/trailing `Z` are mandatory —
a timezone-less datetime parses as local time and mis-orders across timezones,
so `oat review latest` and the gate parse via a helper that treats a
zone-less datetime as UTC. This applies to both the project rail
(`oat-reviewer` / `oat-project-review-provide`) and the ad-hoc rail
(`oat-review-provide`).

Rejected alternatives: a manual `-vN` suffix (fragile lexical order, unenforced);
an opaque run-id in the name (not human-sortable); ordering by filesystem mtime
(unreliable across git checkouts).

## Consequences

Distinct rounds differ on generated time, so ordering is deterministic and the
newest round wins; the `-vN` suffix survives only as a same-second fallback that
is effectively unreachable. `Date.parse` already accepts the richer value, so
pre-existing date-only artifacts remain back-compatible (they sort at UTC
midnight, before any same-day timestamped round). Non-review artifacts
(knowledge index, PR descriptions, docs analysis) keep date-only stamps — they
are not in the `oat review latest` scan set. See
[DR-260706-phase-review-gate-is-non](DR-260706-phase-review-gate-is-non.md).
