---
id: DR-261012-summary-observations-digest
title: Summary observations digest
date: 2026-10-12
status: accepted
legacy_id: null
---

# Summary observations digest

## Context

oat project log rollup copied every project-log entry, structural ones included, into summary.md under ## Workflow Observations. The summary is exported into the tracked repository, so the copy became permanent noise with live .oat/projects/shared paths.

## Decision

Roll-up writes a bounded observations digest: judgment entries only, newest first with decision and gotcha prioritized within workflow.projectLogDigest.maxEntries (12) and maxLines (60), one concise item each with an export-safe oat-project:<slug>#<entry-id> locator, an omitted-count trailer, and the section omitted when no entry qualifies. Roll-up stays the only writer of the section. General-scope graduation into the repository ledger still reads the complete judgment set (artifact-cleanup D4).

## Consequences

Structural entries stay in the archived log as provenance. Synthesized recommendations for categorized learnings appear once, in Autonomous Execution Learnings, with a cross-reference from the digest. Archive export rewrites locator tokens to oat-archive:<snapshot>#<id>.
