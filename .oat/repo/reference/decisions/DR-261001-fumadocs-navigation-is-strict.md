---
id: DR-261001-fumadocs-navigation-is-strict
title: Fumadocs navigation is strict and generated from Contents maps
date: 2026-10-01
status: accepted
legacy_id: null
---

# Fumadocs navigation is strict and generated from Contents maps

## Context

oat docs nav sync only understood MkDocs. Fumadocs reads per-folder meta.json files, and a permissive rest entry would silently show pages that no index.md Contents map lists, so docs navigation would drift from the curated maps (backlog-wave-3, BL-260718-support-fumadocs-in-oat-docs).

## Decision

For Fumadocs, oat docs nav sync writes meta.json listing exactly the Contents-map entries with no rest entry. Cross-folder links become link entries, folder titles come from index.md frontmatter or its first H1, and a second run writes nothing. Pages no Contents map lists are reported in human and JSON output. nav sync --check reports drift and unlisted pages without writing and runs in the apps/oat-docs prebuild.

## Consequences

A docs page missing from its index.md Contents map is hidden from the sidebar and fails build:docs through nav sync --check, so authors must list new pages. Generated meta.json files are committed. The docs-app-fuma scaffold does not yet wire the check, and filenames starting with ! are a known escaping gap (BL-261001-escape-directive-like).
