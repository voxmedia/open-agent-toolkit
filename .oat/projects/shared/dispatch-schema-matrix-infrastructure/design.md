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

## Architecture

### System Context

The existing layered configuration resolver remains responsible for precedence,
and the dispatch-ceiling resolver remains responsible for policy and target
selection. This project extracts pure matrix-shape work below those layers and
adds a report adapter above selection. Command-specific warnings, prompting,
layer labels, and exit behavior stay in their current command adapters.

The report adapter consumes a completed dispatch resolution plus workflow
invocation context such as scope, action, and role. It does not participate in
model selection. The `project dispatch-ceiling resolve` surface will expose the
structured report and formatted display when report context is requested, while
existing calls without that context retain their current response contract.

**Key Components:**

- **Dispatch matrix core:** Normalizes provider values, tier maps, ordered
  routes, and sparse overrides; walks normalized cells into provider/value/path
  references without command-specific metadata.
- **Config and command adapters:** Reuse the core from config loading,
  project-state parsing, config adoption, doctor checks, and dispatch
  resolution while preserving existing warnings and provenance.
- **Validation-pass context:** Owns one memoized Cursor catalog resolution per
  adopt/doctor pass; model-specific Task probes remain independent.
- **Dispatch report adapter:** Converts resolved route/policy/control/default
  data plus invocation context into the canonical report model.
- **Report formatters:** Produce deterministic JSON, a human-readable block, and
  the existing compact `Dispatch:` compatibility stamp.
- **Verification evidence:** Records exact Cursor candidate, command/prompt,
  exit code, output, sentinel result, date, and environment context in a project
  reference artifact.

### Component Diagram

```text
layered config + project state
              |
              v
   dispatch matrix core -------------------------+
      | normalization          | cell refs        |
      v                        v                  |
dispatch-ceiling resolver   adopt / doctor       |
      |                        |                  |
      |                 validation-pass context  |
      |                  | Task probe per slug   |
      |                  | cached catalog lookup |
      v                        v                  |
dispatch report adapter    validation outcomes   |
      |                                           |
      +--> deterministic JSON                     |
      +--> human dispatch block                   |
      +--> compatibility Dispatch: stamp ---------+
```

### Data Flow

1. Resolve raw matrix configuration using existing local, shared, user, and
   project-state precedence. Normalize it once through the shared core, then
   select the policy tier and ordered target as today.
2. For adopt/doctor validation, walk the normalized matrix once. Create one
   validation-pass context and pass it through every cell check. A Cursor cell
   still performs its exact model-specific Task probe; only broad catalog
   resolution is memoized and used as diagnostic context when the probe does
   not verify eligibility.
3. Treat provider vocabularies as distinct. Cursor stores combined native slugs
   such as `gpt-5.6-sol-high`; Codex stores a family model such as
   `gpt-5.6-sol` plus a separate effort control. No helper translates or copies
   one provider's string shape into another provider's matrix.
4. After target selection, combine the resolution with invocation context and
   any runtime-reported identity. Serialize the same report model to stable JSON
   and human output, and derive the compact compatibility stamp without using
   configured/requested values as observed producer identity.
5. Use the current user matrix only as live verification input, not as a shipped
   repository default. The exact candidates are `gpt-5.6-luna-high`,
   `gpt-5.6-terra-xhigh`, `gpt-5.6-sol-high`, and `gpt-5.6-sol-max`. Record a
   Task-probe result for each distinct configured slug. Only verified slugs may
   update OAT examples or recommended configuration; otherwise record the
   unavailable state and a dated recheck.

<!-- Remaining collaborative lightweight-design sections are added after approval. -->
