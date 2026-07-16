---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-16
oat_generated: false
oat_template: false
oat_template_name: design
---

# Design: cursor-subagent-materialization

## Overview

Extend OAT's sync-time materialization architecture with a provider-neutral extension boundary while retaining provider-owned codecs and file semantics. The existing Codex materializer remains the behavioral reference: canonical role definitions are the sole instruction source, generated variants carry managed-owner provenance (`supported-catalogue`, `user-config`, or `project-config`), and sync/status/stray handling compute desired state before applying writes. Cursor adds a Markdown codec that preserves the canonical body and emits only documented `model:` frontmatter values.

Cursor target selection is deliberately split into two identities. The resolver and generated variant name use the ladder-surface flat ID, while an explicit mapping entry supplies the base-ID-plus-brackets value written to frontmatter. No fallback derives one form from the other: an unmapped config-owned target cannot produce a managed variant and must fail with an actionable diagnostic rather than emit an undocumented flat ID. The supported catalogue is the shipped capability set; layered user/project configuration can change ownership and select mapped entries without changing codec behavior.

The verification lane is a release gate for mapping data, not a best-effort smoke test. One pinned test agent per syntax family must establish that Cursor accepted the configured pin before entries from that family ship. The awkward Claude Fable and Grok entries remain unresolved design inputs until that lane supplies evidence; they are corrected or excluded rather than guessed. Runtime audit language records the selected variant and model as launcher-owned `configured` provenance, reports `CURSOR_CONVERSATION_ID` for transcript correlation, and never claims Cursor self-verified its model.

## Architecture

_Pending collaborative validation._

## Component Design

_Pending collaborative validation._

## Error Handling

_Pending collaborative validation._

## Testing Strategy

_Pending collaborative validation._
