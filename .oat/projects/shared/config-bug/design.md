---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-23
oat_generated: false
oat_template: true
oat_template_name: design
---

# Design: config-bug

## Overview

The tool-pack lifecycle will distinguish repository installation state from
effective runtime availability. Shared `.oat/config.json#tools` will be
reconciled only from project-scoped canonical assets, while a dedicated
machine-readable capability query will compute whether a pack is available
from project or user scope. Pack-gated workflows will consume that runtime
query instead of treating shared configuration as a machine-specific cache.

Provider sync will gain a generic mutation-path safety boundary shared by
symlink, copy, update, and remove operations. Immediately before each mutation,
the executor will verify lexical containment and walk every existing parent
with `lstat`; a symbolic-link or non-directory parent will reject the operation
before any removal or write. Planning may surface the same condition earlier,
but apply-time validation remains authoritative because filesystem ancestry can
change after plan generation.

The implementation will preserve current scope-aware listing and sync
strategies while adding focused regression coverage, updating pack-gated
canonical skills, and aligning user-facing documentation. Release bookkeeping
will follow the repository's canonical-skill and public-package versioning
rules.

## Architecture

Pending collaborative review.

## Component Design

Pending collaborative review.

## API Design

Pending collaborative review.

## Error Handling

Pending collaborative review.

## Testing Strategy

Pending collaborative review.

## References

- Discovery: `discovery.md`
