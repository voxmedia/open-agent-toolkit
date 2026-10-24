---
title: Engineering feature
description: Implementation contracts and testing seams for one feature.
---

# Engineering feature

## Routes and params

List verified routes, parameters, defaults and validation boundaries.

## Primary files

Link implementation entry points and explain each file's responsibility.

## Data and state

Describe ownership, lifecycle, persistence and shared contracts; link domain references.

## Flags

List verified flags and rollout/configuration behavior; state unknown when unverified.

## Failure modes and constraints

Describe failure propagation, recovery and supported limits with source references.

## Testing seams

Identify setup, injection boundaries and observable assertions without claiming coverage.

## Paired documentation

Link the Product feature and QA validation pages. Engineering is hybrid: domain and
implementation contracts coexist with paired feature pages, without duplicating facts.

## Source references

Cite source paths and symbols supporting each implementation claim.

## Writing and evidence rules

Use backticks only for literals verified verbatim in source, such as commands,
errors, labels and identifiers. Write concepts in ordinary prose. Cite the
source location for each verified literal; label unknown facts as unknown.
Remove drafting prompts before publishing and retain owner-review gaps explicitly.

Keep these three evidence classes separate:

- Planned automation: intended coverage, with owner and remaining work.
- Implemented assertions: the test path and the exact assertion it implements.
- Dated execution evidence: date, environment/configuration, result and evidence
  location. Implemented assertions alone do not prove a successful execution.
