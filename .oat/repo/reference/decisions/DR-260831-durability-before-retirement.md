---
id: DR-260831-durability-before-retirement
title: Durability before retirement
date: 2026-08-31
status: accepted
legacy_id: null
---

# Durability before retirement

## Context

Deleting active records or checkouts before all required archive outputs succeed could leave completion neither active nor durably recoverable.

## Decision

Require local archive outputs and every configured durability target, including configured S3, to succeed before terminal ref transition, checkout removal, or active-record deletion.

## Consequences

Configured remote archive failures leave the project resumable and active; unconfigured S3 remains outside the required durability set.
