---
id: DR-260307-new-cli-commands-use-dry-run
title: New CLI commands use `--dry-run` convention; defer CLI-wide flip
date: 2026-03-07
status: accepted
legacy_id: ADR-014
---

### ADR-014: New CLI commands use `--dry-run` convention; defer CLI-wide flip

- **Date:** 2026-03-07
- **Status:** accepted
- **Drivers:** Existing `--apply` convention (dry-run by default) is unintuitive — users expect commands to do what they ask. New `oat tools` commands adopted `--dry-run` (mutate by default) as the better UX pattern, but flipping all existing commands in the same PR would increase scope and risk.
- **Related:**
  - `.oat/projects/shared/oat-tools-command-group/discovery.md` (Question 3, Deferred Ideas)
  - `.oat/repo/pjm/backlog/index.md`

#### Context

The OAT CLI has two mutability conventions in use:

- **Old:** dry-run by default, `--apply` to mutate (`oat sync`, `oat instructions sync`)
- **New:** mutate by default, `--dry-run` to preview (`oat tools update`, `oat tools remove`)

The `--dry-run` pattern is more intuitive and aligns with common CLI tooling (npm, brew, etc.). However, flipping existing commands mid-project would widen scope and risk breaking existing scripts/docs.

#### Options Considered

1. Keep `--apply` everywhere (consistent but unintuitive)
2. Flip all commands to `--dry-run` in the same PR (consistent but high scope)
3. Use `--dry-run` for new commands only, flip existing commands in a follow-up (incremental)

#### Decision

Adopt option 3:

- New `oat tools` commands use `--dry-run` (mutate by default).
- Existing commands keep `--apply` (dry-run by default) unchanged.
- A separate follow-up PR will flip the convention CLI-wide (purely mechanical).

#### Consequences

- Positive:
  - New commands ship with better UX immediately.
  - Existing commands remain stable — no unexpected behavior changes.
  - Follow-up flip is low-risk and can be done as a single mechanical PR.
- Negative / trade-offs:
  - Temporary inconsistency across CLI commands until the flip ships.
  - Users may be confused by different defaults for different command groups.

#### Follow-ups

- ~~Create and execute the CLI-wide `--apply` → `--dry-run` convention flip (backlog item tracked).~~ Done — `.oat/projects/shared/auto-apply-dry-run/`, PR #46.
- ~~Update all docs, skill references, and scripts that mention `--apply`.~~ Done — included in the same PR.

---
