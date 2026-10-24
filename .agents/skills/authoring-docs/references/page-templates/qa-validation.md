---
title: QA validation
description: Reproducible behavioral validation for one feature or journey.
---

# QA validation

## Scope

Name the behavior, supported platforms and paired Product and Engineering pages.

## Named seeds

Name each reproducible account/data seed, setup procedure and preconditions. Do not
include credentials or real personal data; document safe provisioning instead.

## Configuration matrix

List relevant versions, flags, permissions, data states and platform combinations.

## Scenarios

| ID          | Priority   | Given                  | When     | Then (exact copy)                       | Evidence                       | Automation                              |
| ----------- | ---------- | ---------------------- | -------- | --------------------------------------- | ------------------------------ | --------------------------------------- |
| <stable ID> | <priority> | <named seed and state> | <action> | <verified observable result or unknown> | <dated result link or not run> | <planned or implemented test reference> |

## Ready signal

State the observable signal that setup and asynchronous work are ready before acting.

## Cleanup

Give reset/removal steps and verify that seeds and side effects are cleaned up.

## Platform deltas

Document supported differences, including locators and expected results.

## External boundary

Name external behavior that requires another owner or test environment.

## Out of scope

Explain excluded behaviors and who verifies them. Keep owner-review gaps visible.

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
