---
id: BL-260827-span-based-prose-guards
title: Span-based prose guards, anchored probe records, and a shared probe
  runner for skill contract tests
status: wont_do
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
updated: '2026-11-01T15:57:47Z'
associated_issues: []
external_plans: []
---

## Description

Wave 4's codex-skill contract guard took six review rounds to converge because each rule approximated its concept (keyword lists, physical lines, two literal subcommand tokens, row-level phrase carve-outs). Residual at the cap: the documented exception row stays exempt if its use-case cell is broadened while retaining 'not a Git repo' (final round 3 M2 / gate M1, probe y1; candidate: deny exemption when the cell also advertises a general case, or when the flag cell is unconditional). Generalize: scan backticked spans instead of lines, key exemptions on structural rules, carry insertion anchors in probe records, and move the wave-4 probe runner (run-all.sh + apply.py, NO-TESTS-RAN guard, isolation controls) under tools/ for .agents/skills/\*/tests/.

### Wave 2 residuals (p02 review, 2026-09-06)

- `LIST_MARKER_ONLY` in `codex-skill/tests/codex-skill-contract.test.mjs` does not strip blockquote prefixes, so `> 1. In that case, confirm before launching.` still escapes attachment (fails open; no bundled SKILL.md contains a blockquote today).
- `requiresConfirmation` misses `approve` / `sign-off` / `block until` / `require approval` synonyms inside an attached anaphoric continuation.
- The pinned markup set for `clauseOpener` (plain `>`, `> [!TAG]`, list markers) overstates how general the normalization is; the final review found four more markup shapes that escape (see `codex-skill-contract.test.mjs:171-175`), and the `requiresConfirmation` comment at `:144-145` should read as a phrase list with a named residual.
- The documented fail-open boundary: a filler clause between the non-blocking anchor and the anaphor breaks attachment; antecedent resolution is this item's scope, not the guard's.

## Acceptance Criteria

- The codex-skill contract guard scans backticked spans rather than physical
  lines, and keys its exemptions on structural rules instead of keyword lists
  or row-level phrase carve-outs.
- The documented exception row loses its exemption when its use-case cell also
  advertises a general case or its flag cell is unconditional (final round 3
  M2 / gate M1, probe y1).
- Probe records carry insertion anchors, and the wave-4 probe runner
  (`run-all.sh` + `apply.py`, with its NO-TESTS-RAN guard and isolation
  controls) lives under `tools/` and serves `.agents/skills/*/tests/`.
- The wave 2 residuals are fixed or recorded as named residuals:
  blockquote-prefixed list markers no longer escape attachment,
  `requiresConfirmation` covers the listed approval synonyms in an attached
  continuation, and the `clauseOpener` and `requiresConfirmation` comments
  describe their actual coverage.
- Each guard change has a probe that the pre-change guard accepts and the
  changed guard rejects, plus an accepted valid control.
