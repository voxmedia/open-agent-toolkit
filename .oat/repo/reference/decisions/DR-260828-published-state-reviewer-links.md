---
id: DR-260828-published-state-reviewer-links
title: Published-state reviewer links
date: 2026-08-28
status: accepted
legacy_id: null
---

# Published-state reviewer links

## Context

Reviewers need discovery, design, and summary access without exposing machine-facing plan, state, implementation, or review artifacts in the pull-request diff.

## Decision

Generate a delimited allowlisted links block from the published project-ref SHA and retain the ref copy as canonical when a durable summary export is added.

## Consequences

Review links are immutable and reflect published state, though they must be refreshed after later artifact pushes and non-GitHub hosts may degrade to plain ref information.
