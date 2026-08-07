---
id: DR-260807-local-filing-is-destination
title: Local filing is destination-first
date: 2026-08-07
status: accepted
legacy_id: null
---

# Local filing is destination-first

## Context

Dogfood exposed that a local backlog destination could be treated as filed before a separate durable receipt proved the destination mutation, and local durability could be confused with remote visibility.

## Decision

Require each new or strengthened local destination to be committed and exact-path verified before a later retro writeback records filed status. Local links recover and validate an existing exact-path receipt; invalid or ambiguous filed states fail closed.

## Consequences

Every locally filed item carries a verified commit receipt plus pushed or unpushed visibility. Push remains separately authorized, and failed commits or incoherent destinations cannot remain filed.
