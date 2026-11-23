---
id: DR-261122-contributing-guidance-covers
title: Contributing guidance covers every docs capability
date: 2026-11-22
status: accepted
legacy_id: null
---

# Contributing guidance covers every docs capability

## Context

Docs authors and agents in scaffolded apps learn what the docs pipeline supports from the scaffold's contributing guidance and the oat-docs-bootstrap walkthrough. A capability missing there is effectively undiscoverable.

## Decision

Every capability available to docs authors, such as a visual or figure capability, must be documented in the scaffold contributing templates and app AGENTS guidance, described by oat-docs-bootstrap, and checked by oat-docs-analyze legacy-scaffold repair, in the same change that adds it.

## Consequences

New docs transforms carry guidance, skill and analyze updates with skill version bumps, which widens their PRs. Scaffolded apps get Syntax and Rendered examples for each capability without manual steps.
