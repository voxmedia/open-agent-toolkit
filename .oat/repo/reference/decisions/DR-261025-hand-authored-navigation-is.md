---
id: DR-261025-hand-authored-navigation-is
title: Hand-authored navigation is checked by membership and order, never regenerated
date: 2026-10-25
status: accepted
legacy_id: null
---

# Hand-authored navigation is checked by membership and order, never regenerated

## Context

Issue #367 G2/G5 and P21 specified a membership-and-order comparison against Contents for hand-authored or undeclared navigation, without assuming strict generator output. The shipped checker compared Fumadocs meta.json pages and the MkDocs nav with exact generator output, so hand-authored separators, separator and group labels, folder borrows such as "../install" and link items such as [Home](/) failed in consumer repositories. oat docs nav sync never read documentation.navOwner, so its writing form silently overwrote hand-authored meta.json, and its --check demanded generator output for every owner.

## Decision

With navOwner nav-sync, oat docs check and nav sync --check keep strict generated freshness. With hand-authored or undeclared ownership, oat docs check compares membership and order: every Contents page must be reachable from some sidebar entry (its folder's pages, a rest entry, a borrow from another folder, or a root-relative link to its URL), every pages or nav entry must name an existing page or folder, and listed pages keep Contents order. Separators and their labels, MkDocs section labels and nesting, link items, rest entries and borrowed pages are presentation and are not compared. For hand-authored ownership, nav sync --check uses the same comparison and the writing form refuses with exit 1. Undeclared ownership keeps today's explicit nav sync behavior (G2) with a warning to declare an owner. nav sync defaults its target to documentation.root and reports Markdown tooling as not applicable.

## Consequences

Hand-authored sidebars pass when they list every Contents page, and findings name the missing page, the missing target or both orders. Renaming a MkDocs group label in a hand-authored nav is no longer an error. Fresh framework scaffolds declare nav-sync and call the sync function directly, so init is unaffected. This repository declares navOwner nav-sync for apps/oat-docs. Recorded in the docs-tooling check and commands pages.
