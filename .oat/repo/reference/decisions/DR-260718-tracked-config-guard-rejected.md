---
id: DR-260718-tracked-config-guard-rejected
title: Tracked-config guard rejected after root cause
date: 2026-07-18
status: accepted
legacy_id: null
---

# Tracked-config guard rejected after root cause

## Context

Stoa's wave program hit 12+ interceptions of .oat/config.json reverts and 27-file provider-view deletions; a CLI-level tracked-config guard was proposed while the cause was unknown. Post-packet, the class was root-caused: a stale locally-resolved CLI (node_modules/.bin/oat at 0.1.1) shadowing the current global via pnpm's PATH prepending - two tool versions thrashing managed files.

## Decision

Reject the CLI-level guard permanently (archived wont_do): dependency hygiene in the consuming repo is the cure. Ship the skill-level view-parity check as a regression guard for the NAMED failure class, and file the general fix upstream - oat sync stamps the producing CLI version and warns on mismatch.

## Consequences

No guard code masking a hygiene bug; the promoted skill text explains the failure class honestly; BL-260718-warn-when-oat-sync-uses tracks the general detection.
