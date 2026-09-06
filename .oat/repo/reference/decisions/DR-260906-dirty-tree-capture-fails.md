---
id: DR-260906-dirty-tree-capture-fails
title: Dirty-tree capture fails closed on anything it cannot restore faithfully
date: 2026-09-06
status: accepted
legacy_id: null
---

# Dirty-tree capture fails closed on anything it cannot restore faithfully

## Context

Wave 2 p05 shipped oat-project-implement/scripts/capture-dirty-tree.mjs and the recovered_patch contract so a lost child handle's staged work can be carried into the next attempt.

## Decision

The capture supports only the plan's enumerated dirt (hunks in tracked paths, binary changes, untracked files) inside a mandatory phase bound; staged renames, paths both tracked-changed and untracked, unstable trees, and anything outside the bound are unsupported-dirt and refuse capture. Verification requires the manifest digest, size, and expected head from the continuation event, and every prose block that invokes the script resolves and guards its path in that same block.

## Consequences

Recovery never widens the phase boundary or applies an unverified artifact; a missing script or empty path is a named stop, not a silent exit 0; renames need a future per-path restore before they can be supported.
