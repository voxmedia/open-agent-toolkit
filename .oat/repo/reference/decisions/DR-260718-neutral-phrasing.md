---
id: DR-260718-neutral-phrasing
title: Neutral-phrasing genericization for promoted skills
date: 2026-07-18
status: accepted
legacy_id: null
---

# Neutral-phrasing genericization for promoted skills

## Context

The wave skills' rule text named stoa-specific tools (pnpm DoD commands, oxfmt/lint-staged guards, nvm/better-sqlite3 env rules, .codex trust paths). Rules' intent is general; a config schema for per-repo specifics had no second consumer yet.

## Decision

Genericize via neutral phrasing (the repo's DoD gates / formatter / env setup) with stoa specifics retained as cited evidence examples; bundled asset templates use curly-brace instantiation placeholders; the bootstrap script uses conditional detection plus OAT_WAVE_BOOTSTRAP_CMD/OAT_WAVE_BASELINE_CMD env hooks. No new config schema.

## Consequences

Any repo can consume the skills without stoa's toolchain. A rule-by-rule behavioral-equivalence checklist (75 rows incl. assets) is the enforcement artifact; the final review proved asset-level coverage is as load-bearing as prose coverage.
