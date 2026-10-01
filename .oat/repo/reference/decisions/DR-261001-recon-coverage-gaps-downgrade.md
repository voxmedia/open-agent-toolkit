---
id: DR-261001-recon-coverage-gaps-downgrade
title: Recon coverage gaps downgrade claims instead of failing publication
date: 2026-10-01
status: accepted
legacy_id: null
---

# Recon coverage gaps downgrade claims instead of failing publication

## Context

GitHub issue #333 reported recon packets that the production helpers built but the validator refused: a material coverage finding failed publication unless the coverage reviewer also disposed each statement as gap, and unresolvedIssues could only be global strings.

## Decision

Keep the forced downgrade of claims affected by a material coverage finding and drop the per-statement gap disposition check. unresolvedIssues entries become structured, scoped to claim IDs or explicitly global, and legacy string entries are read as global.

## Consequences

Packets with material coverage gaps publish with the affected claims kept below verified. Older packets keep every covered claim below verified after re-reconciliation, and only newly produced scoped issues downgrade selectively. This reverses the documented string-only rule.
