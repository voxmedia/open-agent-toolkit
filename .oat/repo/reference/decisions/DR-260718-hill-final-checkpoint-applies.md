---
id: DR-260718-hill-final-checkpoint-applies
title: HiLL final checkpoint applies per mergeable delta
date: 2026-07-18
status: accepted
legacy_id: null
---

# HiLL final checkpoint applies per mergeable delta

## Context

workflow.hillCheckpointDefault=final assumes the plan's final phase completes in-run; wave-skills-promotion's final phase was RC-gated and could not run, so a literal reading yields zero checkpoints.

## Decision

Interpret final as the final phase of each mergeable delta: checkpoint at the last executable phase of the current run plus the gated phase when it eventually executes; record the interpretation as a plan deviation.

## Consequences

Runs with gated tail phases still pause before PR. Candidate for upstream skill-text clarification in the checkpoint-resolution contract.
