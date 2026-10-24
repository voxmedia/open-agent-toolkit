---
title: Screen spec
description: Shared visible-state contract only for screens serving several journeys.
---

# Screen spec

## When to use

Create this page only when one screen serves several journeys. Otherwise keep the
state contract in its feature pages and avoid a second canonical description.

## Route and params

List verified route identity, parameters, validation and defaults.

## Entry points

Name the journeys and deep links reaching this screen and their preconditions.

## Visible states

Describe loading, empty, content, permission and error states supported by source.

## Locators

| Element           | Test ID                  | A11y label                  | Literal text               | Source path       |
| ----------------- | ------------------------ | --------------------------- | -------------------------- | ----------------- |
| <element concept> | <verified ID or unknown> | <verified label or unknown> | <verified text or unknown> | <source location> |

## Transitions

Describe actions, state changes and visible results; link journey-specific behavior.

## Back behavior

Explain back, dismissal, restoration and cancellation for each supported entry path.

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
