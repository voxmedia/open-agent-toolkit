---
title: Product feature
description: Intended behavior and reader-visible boundaries for one feature or journey.
---

# Product feature

## Availability and entry points

Describe who can use the feature, prerequisites and supported entry points.
Identify unavailable contexts without guessing rollout status.

## Expected journey

Describe the reader's goal, starting state, numbered actions and observable result.

## Behavior rules

State the rules and permissions that determine the result; link canonical shared rules.

## States and edge cases

Cover loading, empty, success, denied and failed states that source supports.

## External boundary

Name external systems and where this feature stops owning behavior.

## Paired documentation

Link the Engineering feature and QA validation pages using matching feature names.

## Evidence and owner-review gaps

Cite implementation/product evidence and name unconfirmed behavior and its reviewer.

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
