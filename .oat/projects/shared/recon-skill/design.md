---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-30
oat_generated: false
oat_template: true
oat_template_name: design
---

# Design: recon-skill

## Overview

`recon` is a provider-neutral Agent Skills workflow that compiles a bounded
investigation into a durable evidence-packet directory. Its main instructions
own request completion, rigor-profile expansion, model and execution-manifest
approval, lane decomposition, selectively blind pass boundaries, and final
handoff. Provider catalogs, model selection, dispatch mechanics, launch
receipts, and recovery remain delegated to the existing
`oat-dispatch-subagents` contract instead of being reimplemented.

The skill uses an artifact-first context firewall. Reconnaissance workers write
bounded dossiers into `raw/`; a compiler constructs canonical `claims.json`;
independent validators and adversarial workers write review results without
receiving prior reasoning; and a final assembler emits compact `packet.md` from
the validated ledger. The parent or expensive downstream consumer receives the
packet path and compact completion summary, not every worker transcript.

The initial release is standalone and capability-based. It can use repository,
git, read-only command, URL, and connected-system evidence when those sources
are available, but it modifies only its confirmed packet directory. A small set
of bundled, deterministic helpers validates versioned JSON artifacts and
renders the consumer view so packet structure and assurance rules do not depend
solely on prose compliance. Automatic integration into project discovery and
the broader research skill family remains deferred to the recorded backlog
items.

## Architecture

_Pending collaborative review._

## Component Design

_Pending collaborative review._

## Data Models

_Pending collaborative review._

## Error Handling

_Pending collaborative review._

## Testing Strategy

_Pending collaborative review._

## Open Questions

- Confirm the packet schema and artifact exchange interfaces during this
  lightweight design.
