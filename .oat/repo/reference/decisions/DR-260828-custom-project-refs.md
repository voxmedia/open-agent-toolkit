---
id: DR-260828-custom-project-refs
title: Custom project refs
date: 2026-08-28
status: accepted
legacy_id: null
---

# Custom project refs

## Context

Branch commits exposed agent-facing project artifacts in pull requests and on main, while a live S3 transport would add credentials and weaken Git history and conflict handling.

## Decision

Publish each synced project's linear artifact history to refs/oat/projects/<slug> and keep the artifact checkout off the work branch.

## Consequences

Git remains the sole in-flight transport and synced artifacts avoid branch lists and CI triggers, but reviewers use commit-pinned links rather than a live branch URL.
