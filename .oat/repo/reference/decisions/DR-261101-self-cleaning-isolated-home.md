---
id: DR-261101-self-cleaning-isolated-home
title: Self-cleaning isolated HOME for evidence tests
date: 2026-11-01
status: accepted
legacy_id: null
---

# Self-cleaning isolated HOME for evidence tests

## Context

The AGENTS.md evidence-grade recipes ran HOME=$(mktemp -d) before forced test runs so maintainer user-scope templates could not leak into tests, but nothing removed the directory, so runs left isolated HOME directories under TMPDIR.

## Decision

A repository wrapper script, scripts/with-isolated-home.sh, creates the temporary HOME, runs the given command with it, and removes it on success, failure, INT and TERM. A root pnpm test:evidence script runs the forced turbo test through it, and AGENTS.md points both isolated-HOME recipes at the wrapper. Moving HOME ownership into every package's test harness was rejected.

## Consequences

Evidence-grade runs leave no HOME behind. A TERM sent only to the wrapper PID waits for the child to finish before cleanup, as the script header documents.
