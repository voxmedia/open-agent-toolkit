---
id: DR-260827-close-ambient-environment
title: Close ambient environment sensitivity at the test-runner seam
date: 2026-08-27
status: accepted
legacy_id: null
---

# Close ambient environment sensitivity at the test-runner seam

## Context

wave-3-execution made resolveAssetsRoot honor OAT_ASSETS_DIR, so every zero-argument production call site the CLI unit suite exercises became sensitive to an ambient value; a review finding named one test call site, but a metadata-only ambient bundle failed 7 files / 52 tests through real command paths.

## Decision

Neutralize the variable once in packages/cli/vitest.config.ts test.env and keep the two explicit test call-site fixes as defense in depth, rather than editing every call site.

## Consequences

One line closes the class and is verified non-masking (full suite green with the line removed under a complete ambient bundle); rule: when a change makes production read a new environment variable, fix hermeticity at the runner env seam and state the fixture shape used in any ambient-sensitivity finding.
