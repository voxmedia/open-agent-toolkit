---
id: DR-261031-judge-stacked-delivery-exit
title: Judge stacked delivery exit carriers at the stack tip
date: 2026-10-31
status: accepted
legacy_id: null
---

# Judge stacked delivery exit carriers at the stack tip

## Context

Goal-mode deliveries recorded as kind: stack (GitHub #383) always read stale, because delivery check, delivery refresh and the closeout check evaluated the exit carrier against every member's observed head, and only the stack tip carries the reviewed head. The operator chose to make stacks a supported shape rather than reject multi-member registration.

## Decision

For a kind: stack delivery whose exit carrier is a configured code carrier bound to a reviewed head, judge the carrier against the tip member's observed head only, after a stack-order check confirms every lower member's observed head is the tip or one of its ancestors. Null and unreviewed-resolution carriers, kind: pr and null kinds keep every-member evaluation. One exported wrapper (evaluateDeliveryExitCarrier) runs the order check before evaluateGateCarrier so no caller can take tip-only heads without it. pr-progress registers a stack attach-only, recording an existing gh-stack set base to tip.

## Consequences

A correctly ordered stack reviewed at its tip is deliverable; a non-ancestor lower layer reports stack-order on delivery subjects (dNN), while missing commits report missing-object or inspection-failed so an unfetched commit does not steer the operator to supersession. Milestone subjects keep branch-head carrier evaluation. A mis-ordered stack is replaced by supersession rather than repaired in place, and OAT does not create stacks.
