---
id: DR-260720-recap-callers-own-prose
title: Recap callers own prose authoring
date: 2026-07-20
status: accepted
legacy_id: null
---

# Recap callers own prose authoring

## Context

Stoa W6's live unattended recap (run-19af6e55) pasted raw federated artifact text as deck prose — implementation.md verbatim, frontmatter included — and every automated structural gate passed it, because nothing in the explainer pipeline owned prose quality.

## Decision

Content authoring is caller-owned, exactly like critic execution and fact-base synthesis. Wave recap callers must author the content document from the synthesized fact base plus the recipe outline, or skip the unattended build with a recorded disposition. The explainer core now enforces this: unattended runs require exactly one provider-neutral author seam (author callback or authorModulePath) invoked per recipe artifact with author-request/v1 -> author-result/v1.

## Consequences

Unattended raw-dump decks are structurally impossible: runs fail when the author is absent, invalid, or copies excessive verbatim source. Wave skill text cites the concrete shipped contract (p-rev5 + fast-follow after explainer PR #170).
