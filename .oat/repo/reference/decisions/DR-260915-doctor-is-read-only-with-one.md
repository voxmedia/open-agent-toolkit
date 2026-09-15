---
id: DR-260915-doctor-is-read-only-with-one
title: Doctor is read-only with one approved-command carve-out
date: 2026-09-15
status: accepted
legacy_id: null
---

# Doctor is read-only with one approved-command carve-out

## Context

oat-doctor runs unattended from other skills and interactively as a collaborative setup check. Fully read-only dives would leave people to copy fixes by hand, while auto-fixing would be unsafe unattended.

## Decision

The sweep and dives never edit config, PJM, instructions, docs, or skills directly. After explicit approval, a dive may run exactly the one command it named, from oat config set|unset|adopt, oat pjm init, oat instructions sync, or oat tools update|install. Under OAT_NON_INTERACTIVE=1 the report is the whole output.

## Consequences

Unattended runs stay side-effect free, and interactive runs can finish a fix in place. The allowed command stems are an exact set pinned by the skill contract test, so widening the carve-out is a deliberate change.
