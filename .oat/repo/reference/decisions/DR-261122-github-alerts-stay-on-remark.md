---
id: DR-261122-github-alerts-stay-on-remark
title: GitHub alerts stay on remark-github-blockquote-alert
date: 2026-11-22
status: accepted
legacy_id: null
---

# GitHub alerts stay on remark-github-blockquote-alert

## Context

mdxcn ships its own callout, quote, terminal and footnote upgrades. OAT docs already render GitHub alert syntax (> [!NOTE]), which GitHub renders natively.

## Decision

Callouts keep using remark-github-blockquote-alert. mdxcn's alert, quote, terminal and footnote upgrades are not adopted; only the eight figure components are.

## Consequences

Alert sources render the same on GitHub and in the docs site. The figure wrapper (withDocsFigures) adds only figure components and leaves blockquote handling to the existing plugin.
