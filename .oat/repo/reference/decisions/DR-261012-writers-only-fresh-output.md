---
id: DR-261012-writers-only-fresh-output
title: Writers-only fresh output measurement
date: 2026-10-12
status: accepted
legacy_id: null
---

# Writers-only fresh output measurement

## Context

The archived-artifact audit (artifact-cleanup, 2026-10-11) found noisy and incomplete lifecycle artifacts across 102 archived projects. Fixing them could mean repairing the archived corpus or changing only the writers.

## Decision

Change only the writers, templates and two CLI commands. No archive, S3 snapshot or sealed project log is rewritten, deduplicated or backfilled. Success is measured on freshly generated output from scratch projects driven through each workflow mode (quick, lite, brief, goal), because historical metrics cannot move without rewriting sealed history (artifact-cleanup D1).

## Consequences

Existing archives keep their noise. Acceptance evidence is a fresh lifecycle probe per mode (artifact-cleanup p04-t01), never a corpus metric. Historical archives, S3 snapshots and sealed logs are protected non-mutation surfaces in every probe.
