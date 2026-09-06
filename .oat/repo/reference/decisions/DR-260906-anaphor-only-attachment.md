---
id: DR-260906-anaphor-only-attachment
title: Anaphor-only attachment for the codex-skill below-floor guard
date: 2026-09-06
status: accepted
legacy_id: null
---

# Anaphor-only attachment for the codex-skill below-floor guard

## Context

The codex-skill contract test guards against prose that reinstates a confirmation demand below the capability floor. Wave 2 p02 hardened it against anaphoric continuations; a Codex review round proposed exempting clauses that classify their own route.

## Decision

Only clauses that open with an anaphor are attached to the non-blocking anchor and rejected; a clause that independently classifies the route is accepted as its own sentence. The exemption was reverted because every workable form was an ordered-token heuristic that admitted real escapes, and the plan's 'explicitly and independently classifies' wording makes anaphoric continuations non-independent by construction.

## Consequences

A filler clause between the anchor and the anaphor breaks attachment (documented fail-open boundary, pinned; antecedent resolution belongs to BL-260827-span-based-prose-guards); the direct-API exception stays accepted in every position; residual markup shapes are tracked on the same backlog item.
