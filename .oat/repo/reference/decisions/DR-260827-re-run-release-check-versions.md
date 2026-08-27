---
id: DR-260827-re-run-release-check-versions
title: Re-run release:check-versions after every task commit
date: 2026-08-27
status: accepted
legacy_id: null
---

# Re-run release:check-versions after every task commit

## Context

pnpm release:check-versions evaluates committed state only: before the task commit it reported a no-op pass that looks identical to success, so the wrapper DoD order (gates before commit) could not validate the lockstep bump on its own.

## Decision

Run git fetch origin && pnpm release:check-versions again immediately after each task commit and record that exit code as part of the phase report and the wrapper DoD.

## Consequences

Adopted for W4 briefs and the wrapper execution contract; the pre-commit run stays as an early signal only.
