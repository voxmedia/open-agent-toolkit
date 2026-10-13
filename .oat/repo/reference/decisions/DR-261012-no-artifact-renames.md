---
id: DR-261012-no-artifact-renames
title: No artifact renames
date: 2026-10-12
status: accepted
legacy_id: null
---

# No artifact renames

## Context

Both audit reviewers considered renaming implementation.md, project-log.md, summary.md, reviews/ and the retro to names matching their contents. A rename touches about 300 files including the control-plane task parser, 102 archives and the S3 mirror, and removes no noisy line.

## Decision

Keep implementation.md, project-log.md, summary.md, reviews/ and references/project-retro.md. Retire only new writes to oat-execution-learnings.md, losslessly, once the project log carries its categories; existing legacy files are still read (artifact-cleanup D3).

## Consequences

Noise is fixed in the writers, not the names. A later rename (for example retro.md) needs its own justification. Readers keep supporting the legacy learnings file indefinitely.
