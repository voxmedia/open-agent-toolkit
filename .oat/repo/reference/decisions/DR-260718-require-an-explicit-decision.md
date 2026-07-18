---
id: DR-260718-require-an-explicit-decision
title: Require an explicit decision per Cursor skill
date: 2026-07-18
status: accepted
legacy_id: null
---

# Require an explicit decision per Cursor skill

## Context

A bulk checklist would implicitly classify unchecked Cursor-local skills and could hide user intent or unsafe duplicate packages.

## Decision

Prompt individually to adopt or keep each Cursor skill, preserve completed choices on abort, and block keep-local when a same-name canonical skill exists.

## Consequences

Interactive migration is deliberate and resumable; non-interactive modes report pending work without mutating it, and duplicate names require a rename.
