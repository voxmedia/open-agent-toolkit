---
title: Documentation Review Rubric
description: Checklist for reviewing documentation quality, accuracy, safety, and maintainability.
---

# Documentation Review Rubric

Use this rubric to review documentation changes and audit existing docs. The
goal is not perfection. The goal is to identify whether docs are accurate,
useful, safe, and maintainable.

## Quick Review Checklist

A documentation change is ready when:

- The page has a clear purpose.
- The reader persona is obvious.
- The page belongs to the right documentation type.
- The page is in the right location.
- The title describes the task or topic.
- Commands are accurate.
- Examples are realistic and grounded in evidence.
- Links work.
- Code blocks specify a language.
- Prerequisites are listed for task pages.
- Verification steps are included for tasks.
- Rollback steps are included for risky operations.
- Reference tables include types, defaults, required fields, and descriptions.
- Internal-only details are not included in public docs.
- No secrets or sensitive data are present.
- Terminology is consistent.
- Uncertainty is marked clearly.
- The docs are useful without external tribal knowledge.

## Scoring Model

Score each area from 0 to 3.

| Score | Meaning                                     |
| ----: | ------------------------------------------- |
|     0 | Missing or harmful                          |
|     1 | Present but incomplete, stale, or confusing |
|     2 | Useful but has gaps                         |
|     3 | Strong, accurate, and maintainable          |

## Core Areas

Review purpose, accuracy, structure, task support, reference quality,
operational safety, agent usefulness, maintainability, public/internal boundary,
and links or navigation.

Production runbooks should be especially strong on operational safety.
Public-facing docs should be especially strong on examples, accuracy, and
audience boundary.

## Red Flags

Block publishing until fixed or explicitly marked when docs include invented
deployment steps, undocumented production mutation commands, missing rollback
for risky operations, secrets or tokens, stale commands that fail, public docs
with internal URLs, internal docs with no owner, runbooks with no verification,
or generated reference edited manually without a regeneration path.
