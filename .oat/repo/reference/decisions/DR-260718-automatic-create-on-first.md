---
id: DR-260718-automatic-create-on-first
title: Automatic create-on-first-append
date: 2026-07-18
status: accepted
legacy_id: null
---

# Automatic create-on-first-append

## Context

Quick-mode projects need zero ceremony when no lifecycle observation is produced, but logging must begin automatically when an append point fires.

## Decision

Default workflow.projectLog to auto and create project-log.md on the first append, with explicit scaffold and config overrides.

## Consequences

Projects without append activity gain no artifact; existing logs remain writable regardless of later config so recorded history is not stranded.
