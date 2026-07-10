---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-10
oat_generated: false
oat_template: false
---

# Design: gate-review-provenance-target-safety

## Overview

This project hardens `oat gate review` at the two identity boundaries that a workflow gate must know without inference: the review subject and the configured invocation that performed the review. The CLI will preserve provider-neutral target selection, then construct a small immutable invocation record from the selected exec target. That record will be injected into the reviewer prompt, stamped into artifact frontmatter, parsed and corroborated after execution, and returned in the gate JSON envelope. Separately, an explicitly declared project will be carried with a resolution source and corroborated against the artifact's `oat_project` value before a gate can pass.

The implementation extends the existing gate path instead of replacing it. Current exact-scope producer resolution and final/range family-union avoidance stay in place; aggregation output gains an explicit aggregated-stamps source and focused range coverage. The exec-target extension is deliberately local and minimal, containing only invocation model and reasoning effort plus derived source semantics. It does not introduce the broader dispatch-machine route, policy, defaults, or runtime-confirmation schema.

Only after these safety contracts are verified will shared planning guidance detect a deliberately configured review target and offer project-level phase-review enablement. The prompt writes the existing `oat_phase_review_gate` shape for all phases, selected phases, or disabled, while reusable lifecycle commands continue to declare `--project` and omit provider/model `--target` pins.

## Architecture

_Pending collaborative validation._

## Component Design

_Pending collaborative validation._

## Data Models

_Pending collaborative validation._

## API Design

_Pending collaborative validation._

## Error Handling

_Pending collaborative validation._

## Testing Strategy

_Pending collaborative validation._
