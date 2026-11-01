---
id: DR-261101-guided-setup-never-calls-gh
title: Guided setup never calls gh
date: 2026-11-01
status: accepted
legacy_id: null
---

# Guided setup never calls gh

## Context

Default-branch detection during oat init --setup ran gh repo view first, so guided setup reached the network and the user's GitHub authentication without the user opting in. Guided setup was its only caller.

## Decision

Drop the gh probe: default-branch detection uses origin/HEAD, then main, and init calls nothing that runs gh. No opt-in flag for remote detection was added.

## Consequences

Guided setup is offline-safe and never depends on gh authentication. A repository without origin/HEAD whose default branch is not main gets main and must set git.defaultBranch itself.
