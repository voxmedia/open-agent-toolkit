---
id: DR-261003-assets-override-destination
title: Assets override destination rule
date: 2026-10-03
status: accepted
legacy_id: null
---

# Assets override destination rule

## Context

bundle-assets.sh publishes into OAT_ASSETS_DIR. In Wave 4 p01, a per-path denylist protected sources from a misdirected override, and every review round (three root, two Codex gate) found another unlisted path (NOTICES.md, a linked NOTICES.md, .agents/docs through skill symlinks). The complexity review at the cap classified six of nine findings as one family.

## Decision

An OAT_ASSETS_DIR override publishes only to an absent directory, an empty directory, or an existing bundle; the emptiness check is filename-safe, follows a symlinked destination, and fails closed on error. Staging may never sit inside a recursively copied source (skills, templates, docs). The default destination is exempt because a fresh clone tracks four files under packages/cli/assets while bundle-metadata.json is gitignored.

## Consequences

The denylist and its finding family were removed and bundle-assets.sh shrank by 36 lines net. An override pointing at an arbitrary populated directory is refused rather than replaced. The default-destination exemption has its own test and neutralization proof. The exit gate later found two edge cases in the emptiness check (a newline-only filename and a symlinked destination), both fixed within the rule.
