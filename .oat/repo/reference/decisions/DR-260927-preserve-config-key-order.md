---
id: DR-260927-preserve-config-key-order
title: Preserve config key order and skip no-op writes
date: 2026-09-27
status: accepted
legacy_id: null
---

# Preserve config key order and skip no-op writes

## Context

Writes to .oat/config.json reordered existing keys and rewrote the file even when nothing semantically changed, producing noisy diffs from commands such as oat docs generate-index and same-value oat config set (BL-260927-preserve-oat-config-json-key, GitHub #329 and #311).

## Decision

The .oat/config.json writer preserves the existing key order, including JSONC trailing commas, and skips the write entirely when the value is semantically unchanged; a real change must not reorder untouched keys. Shipped in triage-correctness-wave p02-t05 and p02-t06.

## Consequences

Same-value writes leave the file byte-identical and a real change touches only its own key, so config diffs show exactly what changed. Tests pin byte identity and key order in config/index.test.ts, oat-config.test.ts, and index-generate/index.test.ts; future config writers should go through the order-preserving writer in packages/cli/src/config/oat-config.ts.
