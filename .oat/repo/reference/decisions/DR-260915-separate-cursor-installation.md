---
id: DR-260915-separate-cursor-installation
title: Separate Cursor installation from launchability
date: 2026-09-15
status: accepted
legacy_id: null
---

# Separate Cursor installation from launchability

## Context

Recon worker definitions are materialized into Cursor provider views, but a role file on disk does not prove that the current Cursor Task catalog exposes that role. Foreground Cursor children can also be interrupted by later parent-chat messages.

## Decision

Treat installation and live Task-catalog eligibility as separate facts. Require every Cursor recon leaf to launch in the background, use recon-worker only when the observed live catalog exposes it, and otherwise preserve the approved generic background fallback.

## Consequences

Recon remains durable across parent-chat interruptions and does not overclaim Cursor role availability. OAT can materialize the agent definition and document the boundary, but it cannot force a running Cursor session to expose a custom Task type.
