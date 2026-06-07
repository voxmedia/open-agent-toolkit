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

| Area                     | 0                           | 1                      | 2                           | 3                                                          |
| ------------------------ | --------------------------- | ---------------------- | --------------------------- | ---------------------------------------------------------- |
| Purpose                  | No clear reason page exists | Purpose is implied     | Purpose is stated           | Purpose, reader, and outcome are clear                     |
| Accuracy                 | Incorrect or invented       | Partially accurate     | Mostly accurate             | Grounded and verified                                      |
| Structure                | Hard to scan                | Some headings          | Clear sections              | Predictable IA and strong headings                         |
| Task support             | Cannot complete task        | Can partially complete | Can complete with some gaps | Can complete safely with verification                      |
| Reference quality        | Missing facts               | Facts scattered        | Most fields documented      | Types, defaults, constraints, examples, errors documented  |
| Operational safety       | Risky or absent             | Mentions risk          | Includes basic verification | Includes verification, rollback, escalation, failure modes |
| Agent usefulness         | Ambiguous                   | Some exact data        | Mostly explicit             | Exact commands, paths, constraints, and uncertainty        |
| Maintainability          | Duplicated or stale         | Hard to update         | Mostly maintainable         | Clear source of truth and generated markers where needed   |
| Public/internal boundary | Leaks or omits key context  | Boundary unclear       | Mostly appropriate          | Correct assumptions and safe content                       |
| Links and navigation     | Broken or absent            | Sparse                 | Useful                      | Strong cross-links and clear next steps                    |

## Minimum Acceptable Scores

For internal docs:

- no area below 1
- purpose, accuracy, task support, and operational safety at least 2
- production runbooks at 3 for operational safety

For public docs:

- no area below 2
- accuracy, structure, examples, and public/internal boundary at 3

## Definition of Done for a Docs Migration

A repo docs migration is done when:

- docs have a clear landing page
- local development works from documented steps
- test commands are documented
- deployment behavior is documented or explicitly marked unknown
- configuration is documented
- API or CLI reference exists if applicable
- architecture summary exists for non-trivial systems
- operations docs exist for production systems
- ownership is documented or explicitly marked missing
- old docs are redirected, moved, or deleted
- duplicate docs are removed or linked to the source of truth
- public/internal boundary is reviewed

## Red Flags

Block publishing until fixed or explicitly marked when docs include invented
deployment steps, undocumented production mutation commands, missing rollback
for risky operations, secrets or tokens, stale commands that fail, public docs
with internal URLs, internal docs with no owner, runbooks with no verification,
or generated reference edited manually without a regeneration path.

## Good Enough vs Done

Sometimes a repo starts with no docs. A first pass can be good enough if it is
honest.

Acceptable first pass:

- grounded overview
- local setup from repo scripts
- test commands
- config table from source
- explicit missing deployment or ownership notes

Not acceptable:

- plausible but unverified architecture
- fake owner
- guessed deploy process
- copied templates with empty sections

## Review Comment Patterns

Use direct, actionable comments.

Weak:

```txt
This needs more detail.
```

Stronger:

```txt
Add the expected output for `pnpm dev` so readers can verify local startup.
```

Weak:

```txt
This is confusing.
```

Stronger:

```txt
This page mixes API reference and architecture explanation. Split endpoint
fields into `reference/api.md` and keep the auth model explanation here.
```

## Agent Self-Check

Before finishing a documentation task, verify:

- Did I inspect enough source files?
- Did I avoid inventing facts?
- Did I mark uncertainty?
- Did I use the right page type and structure?
- Did I include prerequisites and verification?
- Did I include rollback for risky operations?
- Did I document exact commands and paths?
- Did I preserve useful existing content?
- Did I avoid public/private leakage?
- Did I leave a useful handoff summary?
