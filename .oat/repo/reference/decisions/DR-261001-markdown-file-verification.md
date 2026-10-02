---
id: DR-261001-markdown-file-verification
title: Markdown file verification
date: 2026-10-01
status: accepted
legacy_id: null
---

# Markdown file verification

## Context

Markdown has no site application but still needs the applicable OAT context, navigation, metadata, contributor and ownership contracts.

## Decision

Verify Markdown files, metadata, Contents and relative links without install or site-build requirements. Put agent documentation guidance in the managed repository-root section and contributor guidance in the content tree; preserve existing docs-local instructions without scaffolding docs-root AGENTS.md.

## Consequences

Analyze/apply retain quality requirements while framework checks remain conditional. Existing local instructions keep their ownership; adopting config and root guidance alone does not establish complete conformity.
