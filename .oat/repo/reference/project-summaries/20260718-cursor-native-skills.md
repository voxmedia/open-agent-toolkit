---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-18
oat_generated: true
oat_summary_last_task: p05-t02
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: Cursor Native Skills

## Overview

Cursor already discovers project and user skills from canonical
`.agents/skills`, so OAT's generated `.cursor/skills` mirrors had become
redundant. This project removed those mirrors without treating existing
Cursor-local skills as disposable: users can migrate each skill into the
canonical inventory or intentionally keep it Cursor-only.

## What Was Implemented

- Cursor project and user skill mappings are now native-read. Sync no longer
  generates `.cursor/skills` views, while Cursor agent materialization and rule
  rendering retain their provider-specific behavior.
- Provider metadata now separates sync mappings from adoption sources.
  `.cursor/skills` and `~/.cursor/skills` remain discoverable migration and
  extension surfaces even though they are not sync targets.
- Obsolete manifest-owned views are retired according to verified state. Clean
  links and copies are removed, missing paths are untracked, and changed or
  unverified paths are preserved and detached from manifest ownership.
- Interactive `oat init` and `oat status` ask for an explicit disposition for
  each Cursor-local skill. Adopt moves the package to canonical storage without
  recreating a provider view; Keep Cursor-only records the exact path as a
  known stray. Abort preserves completed choices and leaves unanswered skills
  pending.
- User `knownStrays` ownership moved from `~/.oat/config.json` to
  `~/.oat/sync/config.json`. Migration unions normalized entries, writes the
  canonical sync config first, preserves unrelated user settings, removes only
  the legacy key, and is safe to retry.
- The feature was reconciled with the latest `origin/main`, including Cursor
  managed-agent materialization, and the five lockstep public packages were
  validated at `0.1.76` after the final documentation audit.

## Key Decisions

- **Separate native-read mappings from adoption sources.** Keep a native-read
  mapping's provider directory equal to its canonical directory, and represent
  `.cursor/skills` independently as an adoption source. This preserves the
  mapping contract without losing migration visibility.
- **Require an explicit decision per Cursor skill.** Do not infer keep-local
  from an unchecked bulk list. Each skill is adopted or kept individually, and
  same-name canonical collisions block Keep Cursor-only until one package is
  renamed.
- **Preserve uncertain legacy content.** Delete obsolete managed views only
  after re-verifying that they are clean. Modified, replaced, broken, or
  otherwise unverified paths are detached from OAT ownership instead of being
  deleted.
- **Keep sync state in sync config.** Project and user known-stray choices live
  in their respective `.oat/sync/config.json` files. Legacy user state migrates
  before user sync resolution and before any general user-config write so
  normalization cannot erase it.

## Notable Challenges

- The initial final review found that an unrelated general user-config write
  could normalize away legacy `knownStrays` before migration. The shared
  `writeUserConfig` boundary now resolves the user sync config first, with
  regression coverage for write ordering and failure safety.
- Merging the moved `origin/main` required combining adoption-source scans with
  new Cursor and Codex materialization filtering. The reconciled command flows
  preserve both behaviors, and the full CLI suite passed with 3,181 tests.

## Tradeoffs Made

- Cursor-only skills remain valid, but OAT refuses to remember a local skill
  when a canonical package has the same name because Cursor does not document a
  safe duplicate-resolution order.
- Non-interactive and JSON runs report unresolved migration actions without
  making decisions. This favors data safety and explicit intent over automatic
  cleanup.

## Integration Notes

- Code that scans provider-local migration candidates should use adoption
  sources; code that plans generated provider output should use sync mappings.
- General user-config writers must continue routing through the shared migration
  boundary before rewriting `~/.oat/config.json`.
- The release definition of done includes the lockstep package set and
  `pnpm release:validate`; this project ships in version `0.1.76`.
