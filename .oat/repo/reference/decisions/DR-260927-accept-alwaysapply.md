---
id: DR-260927-accept-alwaysapply
title: Accept alwaysApply as a canonical rule activation alias
date: 2026-09-27
status: accepted
legacy_id: null
---

# Accept alwaysApply as a canonical rule activation alias

## Context

Canonical rule parsing rejected rules carrying the Cursor-style alwaysApply: true field, and parse errors did not name the offending file, so one bad rule aborted sync with no pointer to the source (BL-260927-name-the-file-in-canonical, GitHub #316). The existing Cursor importer already treated alwaysApply as an always-on activation.

## Decision

Canonical rule parsing accepts alwaysApply: true as an alias for activation: always, matching the Cursor importer, and every remaining parse error names the repository-relative rule file in all three provider rule transforms; one sync run reports every invalid rule. Chosen over warn-and-skip because the alias preserves a rule the author clearly intended to apply, while file-naming errors cover rules that are genuinely invalid. Shipped in triage-correctness-wave p02-t01.

## Consequences

Rules authored with alwaysApply: true now sync instead of failing. Genuinely invalid rules still fail sync, but the error names each file, so authors can fix them in one pass. The alias is documented in provider-sync/providers.md and pinned by parse and compute-plan tests.
