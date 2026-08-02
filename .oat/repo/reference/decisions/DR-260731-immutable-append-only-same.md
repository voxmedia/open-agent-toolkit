---
id: DR-260731-immutable-append-only-same
title: Immutable append-only same-target recovery
date: 2026-07-31
status: accepted
legacy_id: null
---

# Immutable append-only same-target recovery

## Context

Post-commit verification can expose a mechanically bounded defect after the user has already authorized a phase, but accepted commits and accepted-launch route terminality must remain protected.

## Decision

Keep every committed task immutable. Eligible repair remains on the exact accepted target, creates separate append-only recovery history under the phase authorization, and leaves every other lifecycle consumer default-deny unless it defines an equally complete standing-authority contract.

## Consequences

Recovery remains auditable and cannot become provider, model, route, or worker fallback. Routine bounded repairs avoid redundant prompts, while ambiguity, scope expansion, consequence, destructiveness, target loss, or exhaustion still requires direction.
