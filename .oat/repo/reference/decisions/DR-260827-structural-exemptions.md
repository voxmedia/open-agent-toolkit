---
id: DR-260827-structural-exemptions
title: Structural exemptions and property assertions for prose contract tests
date: 2026-08-27
status: accepted
legacy_id: null
---

# Structural exemptions and property assertions for prose contract tests

## Context

Wave 4's codex-skill contract test took three phase-review rounds and three final-scope rounds to converge because each guard approximated its concept (keyword lists, physical lines, two literal subcommand tokens, phrase-locked assertions) and each approximation opened a narrower evasion.

## Decision

Key exemptions on a structural rule (an exempted line must not itself run the command; a table row is exempt only by its use-case cell), normalize soft-wrapped prose to logical lines, assert wording dispositions as properties, and pair every guard change with a reproducible probe runner with isolation controls that fails loudly when no tests ran.

## Consequences

Guard changes became verifiable in one run instead of one review round; two remaining phrase-level residuals were ledgered to backlog at the cycle cap rather than chased; adopted as the pattern for .agents/skills/\*/tests/.
