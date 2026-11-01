---
id: DR-261101-stamp-canonical-codex-roles
title: Stamp canonical Codex roles with the scope owner
date: 2026-11-01
status: accepted
legacy_id: null
---

# Stamp canonical Codex roles with the scope owner

## Context

Codex role exports generated from canonical agents carried oat-managed and oat-role headers but no oat-owner header, so stale cleanup (which removes only roles whose owner equals the scope's cleanup owner) never removed a deleted or renamed agent's .codex/agents role file, its model/effort variants or its [agents.*] tables. Older CLIs reject an unknown owner value and treat the file as unmanaged.

## Decision

Stamp canonical-derived Codex roles with the scope's existing owner value: project-config at project scope, user-config at user scope. At project scope stale cleanup covers the supported-catalogue and project-config owners, following the Cursor extension's precedent; at user scope it covers user-config. Removal partial syncs (pack removal) run the same owned-stale cleanup against the roles every present canonical agent produces. A new owner value and a manifest-persisted role list were rejected.

## Consequences

Every canonical-derived Codex role gains one header line on its first sync after 0.3.39, and mixed-version teams may see that line churn until all members upgrade. Roles left ownerless by earlier CLIs cannot be proved canonical-derived and stay in place; the docs say so. Persisting extension-managed roles in the sync manifest remains a deferred option if owner-stamped cleanup proves insufficient.
