---
id: bl-074b
title: 'Live dogfood for `oat-project-split` declared and detected entry paths'
status: open # open | in_progress | closed | wont_do
priority: high # urgent | high | medium | low | none
priority_reviewed: '2026-05-21'
scope: task # idea | task | feature | initiative
scope_estimate: S # XS | S | M | L | XL | XXL
labels:
  - dogfood
  - workflow/project
  - topic/split
assignee: null
created: '2026-05-21T00:00:00Z'
updated: '2026-05-21T00:00:00Z'
associated_issues: []
oat_template: true
oat_template_name: backlog-item
---

## Description

Phase p05 of `oat-project-split` verified the command-boundary split flow, detected non-interactive behavior, and resume behavior, but the phase runner could not honestly exercise two live interactive agent entry paths:

- a declared `oat-brainstorm` conversation where multi-project intent is present at turn 1;
- a detected `oat-project-discover` conversation where mid-stream and convergence split prompts are shown to the user.

This item tracks the required live dogfood pass before relying on those user-facing entry paths as fully exercised.

## Required Live Runs

1. Run a real `oat-brainstorm` session with declared multi-project intent in the first user turn. Capture whether umbrella framing fires, the boundary question wording, the confirmation flow, the invoked `SplitPlanDocument` payload, and the resulting coordination parent plus child tree.
2. Run a real `oat-project-discover` session on a request that naturally separates into at least three independently shippable child projects. Capture the mid-stream offer, the end-of-discovery scope-check confirmation, the invoked split payload, and the resulting tree.
3. Record exact prompt wording and any UX issues in `.oat/projects/shared/oat-project-split/dogfood/declared.md` and `.oat/projects/shared/oat-project-split/dogfood/detected.md`.

## Acceptance Criteria

- Declared live pass confirms umbrella framing and the child-boundary question before split execution.
- Detected live pass confirms both the mid-stream offer and convergence scope check are reachable in an interactive discovery conversation.
- Captured split payloads use the expected origins (`declared`, `detected-mid-stream`, or `detected-convergence`) and produce a coordination-only parent plus implementation children.
- Dogfood notes are updated from "command-boundary only" to actual live-entry evidence, or record a specific product defect if either entry path cannot be completed.
