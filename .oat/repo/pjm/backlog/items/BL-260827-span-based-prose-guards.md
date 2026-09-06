---
id: BL-260827-span-based-prose-guards
title: Span-based prose guards, anchored probe records, and a shared probe
  runner for skill contract tests
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - skills
  - tests
  - tooling
  - wave-4-follow-up
assignee: null
created: 2026-08-27T06:56:35.554Z
updated: 2026-08-27T06:56:35.554Z
associated_issues: []
external_plans: []
---

## Description

Wave 4's codex-skill contract guard took six review rounds to converge because each rule approximated its concept (keyword lists, physical lines, two literal subcommand tokens, row-level phrase carve-outs). Residual at the cap: the documented exception row stays exempt if its use-case cell is broadened while retaining 'not a Git repo' (final round 3 M2 / gate M1, probe y1; candidate: deny exemption when the cell also advertises a general case, or when the flag cell is unconditional). Generalize: scan backticked spans instead of lines, key exemptions on structural rules, carry insertion anchors in probe records, and move the wave-4 probe runner (run-all.sh + apply.py, NO-TESTS-RAN guard, isolation controls) under tools/ for .agents/skills/\*/tests/.

### Wave 2 residuals (p02 review, 2026-09-06)

- `LIST_MARKER_ONLY` in `codex-skill/tests/codex-skill-contract.test.mjs` does not strip blockquote prefixes, so `> 1. In that case, confirm before launching.` still escapes attachment (fails open; no bundled SKILL.md contains a blockquote today).
- `requiresConfirmation` misses `approve` / `sign-off` / `block until` / `require approval` synonyms inside an attached anaphoric continuation.
- The documented fail-open boundary: a filler clause between the non-blocking anchor and the anaphor breaks attachment; antecedent resolution is this item's scope, not the guard's.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
