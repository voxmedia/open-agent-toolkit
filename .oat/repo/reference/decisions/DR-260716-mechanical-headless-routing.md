---
id: DR-260716-mechanical-headless-routing
title: Mechanical headless routing
date: 2026-07-16
status: accepted
legacy_id: null
---

# Mechanical headless routing

## Context

Headless gate reviews previously depended on prompt wording and could launch reviewer work that the parent could not reliably await.

## Decision

Gate children receive machine-readable invocation context and execute the checkout-local route helper; prompt prose is explanatory rather than the completion-safety mechanism.

## Consequences

Headless review uses inline or synchronously awaited execution and fails closed when no compliant route exists.
