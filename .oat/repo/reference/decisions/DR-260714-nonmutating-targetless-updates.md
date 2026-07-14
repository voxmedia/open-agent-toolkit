---
id: DR-260714-nonmutating-targetless-updates
title: Nonmutating targetless updates
date: 2026-07-14
status: accepted
legacy_id: null
---

# Nonmutating targetless updates

## Context

Treating a targetless tools update as an implicit all-tools update would change scripted behavior and perform an unexpectedly broad mutation.

## Decision

Keep targetless tools updates failing safely and provide the explicit oat tools update --all remedy only for the true no-target case.

## Consequences

Bulk updates remain intentional, while invalid packs and conflicting targets retain precise diagnostics and perform no update work.
