---
id: DR-261001-bootstrap-detection-boundary
title: Bootstrap detection boundary
date: 2026-10-01
status: accepted
legacy_id: null
---

# Bootstrap detection boundary

## Context

Framework content trees and repository README files must not be mistaken for an independently adoptable Markdown documentation surface.

## Decision

Select Markdown evidence in docs bootstrap with declared tooling authoritative, framework evidence before plain-tree evidence, and a chosen authored docs tree required for adoption. Leave general oat init detection and config unchanged.

## Consequences

Empty targets remain available for fresh setup; existing authored trees route to explicit adopt/audit. The Markdown project does not add framework conversion or expand the general initialization entrypoint.
