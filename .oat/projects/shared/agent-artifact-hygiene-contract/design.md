---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-13
oat_generated: false
oat_template: true
oat_template_name: design
---

# Design: agent-artifact-hygiene-contract

## Overview

Artifact formatting becomes an explicit, self-contained completion contract at every canonical boundary that can create or edit tracked output: the phase implementer and reviewer role definitions, six lifecycle skills, and the CLI-injected gate-review context note. Every copy starts with the stable, greppable lead-in `Artifact hygiene contract:` and uses equivalent verbatim instructions. Duplication is intentional: role definitions and gate prompts cross dispatch/runtime boundaries where a referenced shared file may not be loaded or even be available. The stable lead-in keeps the duplicated contract auditable and leaves room for future automated validation without adding enforcement in this project.

The contract tells an agent to discover repository-owned formatting instructions from applicable `AGENTS.md`/`CLAUDE.md` files and relevant package manifests, prefer a documented write/fix command over a check-only command, and scope the write to created or edited files when the documented command supports paths. It must not infer or hardcode a formatter executable, and it must not casually run a whole-tree write that pollutes the diff with unrelated changes. When no formatting command is discoverable, the agent emits one warning—`no format command discovered in repo instructions; skipping`—then continues without formatting. Existing relevant definition-of-done checks remain applicable; artifact writes are explicitly not exempt.

## Architecture

_Pending collaborative review._

## Component Design

_Pending collaborative review._

## Testing Strategy

_Pending collaborative review._

## References

- Discovery: `discovery.md`
