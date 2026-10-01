---
id: DR-261001-oat-template-resolve-copies
title: oat template resolve copies content for skills
date: 2026-10-01
status: accepted
legacy_id: null
---

# oat template resolve copies content for skills

## Context

Lifecycle skills copied templates from `.oat/templates/`, which user-scope-only installs do not have, so those installs broke. DR-260927-templates-resolve-repository fixed the precedence order, but skills still needed a way to reach the bundle tier without a package-manager path.

## Decision

`oat template resolve <name> [--json] [--output <path>]` resolves through the shared repository, user, bundle resolver and reports the matching tier. It returns a filesystem path only for the repository and user tiers, and `--output` copies the resolved content, so skills never handle a bundle path.

## Consequences

Eleven lifecycle skills copy templates through the command and gained the `Bash(oat template:*)` grant. `--output` creates no directories and has no `--force`, so callers create the destination directory. `oat-wrap-up` still reads `.oat/templates/summary.md` directly (BL-261001-resolve-the-summary-template).
