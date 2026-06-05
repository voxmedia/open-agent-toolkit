---
title: Documentation Review Rubric
description: Review checklist and scoring model for documentation quality.
---

# Documentation Review Rubric

Use this rubric to review documentation changes and audit existing docs.

The goal is not perfection. The goal is to identify whether docs are accurate, useful, safe, and maintainable.

## Quick review checklist

A documentation change is ready when:

- The page has a clear purpose.
- The reader persona is obvious.
- The page belongs to the right documentation type.
- The page is in the right location.
- The title describes the task or topic.
- Commands are accurate.
- Examples are realistic.
- Links work.
- Code blocks specify a language.
- Prerequisites are listed.
- Verification steps are included for tasks.
- Rollback steps are included for risky operations.
- Reference tables include types, defaults, required fields, and descriptions.
- Internal-only details are not included in public docs.
- No secrets or sensitive data are present.
- Terminology is consistent.
- Uncertainty is marked clearly.
- The docs are useful without Slack archaeology.

## Scoring model

Score each area from 0 to 3.

| Score | Meaning                                     |
| ----: | ------------------------------------------- |
|     0 | Missing or harmful                          |
|     1 | Present but incomplete, stale, or confusing |
|     2 | Useful but has gaps                         |
|     3 | Strong, accurate, and maintainable          |

## Rubric

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

## Minimum acceptable scores

For internal docs:

- no area below 1
- purpose, accuracy, task support, and operational safety should be at least 2
- production runbooks should score 3 in operational safety

For public docs:

- no area below 2
- accuracy, structure, examples, and public/internal boundary should be 3

## Docs audit summary template

````md
# Documentation audit: <repo>

## Summary

<Short summary of current docs quality.>

## Project type

- <frontend app/backend service/API/CLI/library/framework/etc.>

## Current docs

| Page        | Type    | Quality | Notes                          |
| ----------- | ------- | ------- | ------------------------------ |
| `README.md` | Landing | 2       | Useful but missing deployment. |

## Missing docs

| Missing page     | Priority | Why it matters                                     |
| ---------------- | -------: | -------------------------------------------------- |
| Deployment guide |     High | Production changes need verification and rollback. |

## Stale or risky docs

| Page        | Issue                    | Recommended action          |
| ----------- | ------------------------ | --------------------------- |
| `README.md` | Command no longer exists | Update from `package.json`. |

## Recommended structure

```txt
docs/
├── index.md
├── getting-started.md
├── how-to/
├── reference/
├── concepts/
└── operations/
```

## Follow-up questions

- <Question that needs owner verification>
````

## Definition of done for repo migration

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
- duplicate docs are removed or linked to source of truth
- public/private boundary is reviewed

## Red flags

These should block publishing until fixed or clearly marked:

- invented deployment steps
- undocumented production mutation commands
- missing rollback for risky operations
- secrets or tokens in docs
- stale commands that fail
- public docs with internal URLs
- internal docs with no owner
- runbooks with no verification steps
- generated reference edited manually without regeneration path

## Good enough vs done

Sometimes a repo starts with no docs. A good first pass may be enough if it is honest.

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

## Review comment patterns

Use direct, actionable comments.

Bad:

```txt
This needs more detail.
```

Better:

```txt
Add the expected output for `pnpm dev` so readers can verify local startup.
```

Bad:

```txt
This is confusing.
```

Better:

```txt
This page mixes API reference and architecture explanation. Split endpoint fields into `reference/api.md` and keep the auth model explanation here.
```
