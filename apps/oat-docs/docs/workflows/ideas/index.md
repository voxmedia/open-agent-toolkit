---
title: Ideas Workflow
description: 'Guide to lightweight idea capture, brainstorming, and promotion into tracked projects when the work becomes concrete.'
---

# Ideas Workflow

Use the ideas workflow when you need a place to think, sketch, or explore before you are ready to commit to full project artifacts.

Ideas are intentionally lighter than projects: they are usually gitignored, personal, and optimized for brainstorming rather than traceable delivery.

## Not Sure If It's an Idea Yet?

If the thought is still pre-shape — you don't know whether it should land as a quick scratchpad note, a captured idea, a scoped backlog item, or a full project — start with [`oat-brainstorm`](../../cli-utilities/tool-packs.md) instead. It's the always-on, project-independent brainstorming entry point: it activates on destinationless exploratory phrasing like "let's brainstorm" or "brainstorm this", runs a structured design conversation, and routes the outcome into the right destination (including this ideas workflow if that's where the brainstorm lands). Use ideas directly when you already know the work is "an idea worth tracking" and you want to capture or extend one without going through the dispatcher.

## Contents

- [Lifecycle](lifecycle.md) - Capture, ideate, refine, and summarize an idea before promotion or discard.

## When Ideas Fit Better Than Projects

- the problem is still fuzzy
- you want conversational exploration before writing a plan
- the work may never become a tracked deliverable
- you want local-only brainstorming that should not be committed yet

## Key Differences from Projects

| Aspect      | Projects                                                      | Ideas                                             |
| ----------- | ------------------------------------------------------------- | ------------------------------------------------- |
| Location    | `.oat/projects/shared/` or configured project roots           | `.oat/ideas/` or `~/.oat/ideas/`                  |
| State model | multi-phase lifecycle with task pointers and reviews          | lightweight brainstorming and summarization state |
| Output      | tracked requirements, plans, implementation logs, and reviews | scratchpad-style ideation plus optional summary   |
| Best fit    | committed delivery work                                       | exploratory thinking and early shaping            |

## Promotion Path

When an idea becomes concrete, summarize it and then start a tracked OAT project in quick or spec-driven mode depending on design risk.
