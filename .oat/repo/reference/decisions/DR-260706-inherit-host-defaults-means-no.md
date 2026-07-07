---
id: DR-260706-inherit-host-defaults-means-no
title: Inherit Host Defaults means no OAT selection
date: 2026-07-06
status: accepted
legacy_id: null
---

# Inherit Host Defaults means no OAT selection

## Context

This mode is the only path where implementation, fix, and review dispatch leave model/effort controls to the executing harness or provider.

## Decision

Define `Inherit Host Defaults` as the explicit mode where OAT does not choose
model or effort controls for implementation, fix, or review dispatch.

## Consequences

Provider defaults and harness behavior are used only when this mode is selected
or when a base/unpinned fallback is required. OAT logs must not describe this as
managed uncapped behavior.
