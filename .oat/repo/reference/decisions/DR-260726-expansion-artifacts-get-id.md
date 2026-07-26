---
id: DR-260726-expansion-artifacts-get-id
title: Expansion artifacts get ID-bearing paths
date: 2026-07-26
status: accepted
legacy_id: null
---

# Expansion artifacts get ID-bearing paths

## Context

Content-driven expansion can emit multiple artifacts of the same type in one run, which collides on the flat output paths the prior model used. Changing the paths of existing floor artifacts would break URLs for already-published explainers.

## Decision

Expansion sub-pages get ID-bearing output paths while floor artifacts keep the paths they already use. The origin of each artifact is carried explicitly through the pipeline rather than inferred from its position.

## Consequences

Published artifact URLs stay stable across the v1-to-v2 transition, at the cost of two path conventions coexisting in the same output tree.
