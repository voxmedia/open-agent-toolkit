---
id: DR-260719-keep-final-judgment
title: Keep final judgment with the primary reviewer
date: 2026-07-19
status: accepted
legacy_id: null
---

# Keep final judgment with the primary reviewer

## Context

Recon workers can gather scoped evidence efficiently, but they do not hold the full artifact context or authority needed for severity, validation, and final findings.

## Decision

Workers return evidence and uncertainty only; the primary reviewer reopens authoritative sources, repeats load-bearing checks, reconciles reports, assigns severity, and owns final output.

## Consequences

Parallelism can reduce evidence-gathering latency without delegating reviewer accountability or allowing worker reports to become unverified findings.
