---
id: DR-260706-reviewer-targets-only-capped
title: Reviewer targets only capped policies
date: 2026-07-06
status: accepted
legacy_id: null
---

# Reviewer targets only capped policies

## Context

Capped managed policies produce a deterministic reviewer target at the cap; managed uncapped and inherit/default reviewer paths use no-target/base-role fallback.

## Decision

Only capped managed policies produce deterministic reviewer targets. Managed
uncapped and inherit/default reviewer dispatch use an explicit no-target/base
reviewer fallback.

## Consequences

Review quality gates stay deterministic when a cap exists, while uncapped and
inherit/default modes honestly report provider-default fallback behavior instead
of claiming a selected review target.
