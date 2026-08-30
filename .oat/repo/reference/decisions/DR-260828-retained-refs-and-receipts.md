---
id: DR-260828-retained-refs-and-receipts
title: Retained refs and receipts
date: 2026-08-28
status: accepted
legacy_id: null
---

# Retained refs and receipts

## Context

Deleting project refs at completion would break pinned review links, and interruption across multi-step completion could duplicate or misattribute durable outputs.

## Decision

Retain project refs by default and recover completion only after validating the exact project, repository, ref, pin SHA, final artifact receipt, and recap evidence chain.

## Consequences

Pinned links remain durable and interrupted completion is retryable without inventing receipts; removing a ref becomes an explicit prune operation that accepts link breakage.
