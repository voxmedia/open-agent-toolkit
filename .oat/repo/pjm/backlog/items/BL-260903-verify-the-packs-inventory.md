---
id: BL-260903-verify-the-packs-inventory
title: Verify the packs:inventory path-redaction claim in troubleshooting docs
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - docs
  - redaction
  - verification
assignee: null
created: 2026-09-03T17:54:25.647Z
updated: 2026-09-03T17:54:25.647Z
associated_issues: []
external_plans: []
---

## Description

From the tool-pack-scope-provider-truthfulness retrospective (RP-03).

`apps/oat-docs/docs/reference/troubleshooting.md:185` states, for the `packs:inventory` diagnostic, that "Reported project and home paths remain redacted." That surface was outside the project's scope and the claim was never verified against the code.

It is worth checking rather than assuming. During that project's gate rounds, every comparable universal redaction claim examined proved to overstate the implementation: the absolute-paths module docstring, a spec bullet about message redaction, the CLI reference's "no absolute path reaches --json", a design.md line asserting paths remain process-local, and a test title promising no absolute path reaches the JSON surface. All five were narrowed. This one has the same shape and was left only because verifying it was out of scope.

Closing it means tracing the `packs:inventory` diagnostic's actual path handling and either confirming the claim or narrowing it to what the code does.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
