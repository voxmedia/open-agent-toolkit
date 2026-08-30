---
id: DR-260830-normalize-executable-modes
title: Normalize executable modes before drift comparison
date: 2026-08-30
status: accepted
legacy_id: null
---

# Normalize executable modes before drift comparison

## Context

Tool-pack installation intentionally adds executable bits to managed scripts, so raw filesystem mode comparison incorrectly classified expected materialization as drift.

## Decision

Normalize expected executable-mode differences before inventory drift comparison while continuing to compare content, entry type, and symlink targets.

## Consequences

Installed scripts do not report false drift solely because of intentional mode normalization, while substantive managed-asset changes remain detectable.
