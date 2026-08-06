---
id: DR-260805-retrospectives-run-after
title: Retrospectives run after approval
date: 2026-08-05
status: accepted
legacy_id: null
---

# Retrospectives run after approval

## Context

The complete execution history includes final human approval and its feedback tail. Running a retrospective before approval would omit evidence that the retrospective is expected to analyze.

## Decision

Accept retro only in workflow.postImplementSequence.postApproval and reject structured sequences that place retro in preApproval. Preserve all existing legacy sequence mappings.

## Consequences

Retrospectives can include final feedback while still running before project completion freezes artifacts. Invalid pre-approval retro configuration fails normalization instead of silently running too early.
