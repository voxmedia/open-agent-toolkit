---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-10
oat_generated: false
oat_template: false
oat_template_name: design
---

# Design: dispatch-schema-matrix-infrastructure

## Overview

Build the project around two small, reusable cores. A shared dispatch-matrix
module will own normalization and cell-reference traversal for repository config
and sparse project overrides, while callers retain their command-specific
warnings and presentation. A separate dispatch-report module will define a
canonical JSON-compatible TypeScript data model plus pure human and stable JSON
formatters. The report keeps route, OAT policy, requested controls, configured
defaults, and runtime confirmation distinct; the current parseable `Dispatch:`
stamp remains an embedded compatibility/audit surface rather than becoming the
new schema.

Use dependency-free TypeScript types and deterministic serialization for the
machine contract. Do not add Zod or publish a standalone JSON Schema in this
project because the known consumers are internal CLI/workflow code and the
backlog asks for a stable JSON contract, not an external validation artifact.
The formatter will make inherited/defaulted/unreported states explicit instead
of conflating them with requested or runtime-confirmed identity.

Cursor availability will gain an explicit validation-pass context that memoizes
only broad catalog resolution (`models`, then `--list-models` fallback). The
model-specific Task/subagent probe remains per candidate because it is the
eligibility oracle. GPT-5.6 Sol, Terra, and Luna verification will use that same
production probe contract and record exact reproducible evidence; only verified
slugs may flow into dispatch configuration or documentation. Shared integration
docs, package-version updates, and release validation land after the independent
implementation workstreams converge.

<!-- Collaborative lightweight-design sections are added after approval. -->
