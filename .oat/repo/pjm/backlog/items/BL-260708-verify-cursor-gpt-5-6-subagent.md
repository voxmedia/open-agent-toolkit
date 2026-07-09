---
id: BL-260708-verify-cursor-gpt-5-6-subagent
title: 'Verify Cursor GPT-5.6 subagent model slugs'
status: open # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
scope: task # idea | task | feature | initiative
scope_estimate: S # XS | S | M | L | XL | XXL
labels: [cursor, subagents, model-dispatch, gpt-5.6]
assignee: null
created: '2026-07-08T21:08:00Z'
updated: '2026-07-08T21:08:00Z'
associated_issues: []
oat_template: true
oat_template_name: backlog-item
---

## Description

After Cursor exposes the GPT-5.6 family models, verify the exact subagent-eligible model slugs for Sol, Terra, and Luna before wiring them into OAT dispatch. This follows the codex-family-subagents discovery conclusion that Cursor can use generic `.cursor/agents` files with Task-level model selection, but model strings must be validated against Cursor's narrower subagent allow-list instead of inferred from general model listings.

Target this check on or after 2026-07-09, when the GPT-5.6 Cursor model entries are expected to become available.

## Acceptance Criteria

- Cursor's actual subagent-eligible GPT-5.6 model slugs for Sol, Terra, and Luna are verified with a live Cursor Task/subagent probe.
- The verified slug list is recorded in the relevant OAT project or backlog notes with the exact command/output evidence needed to reproduce it.
- Any OAT dispatch config, validation logic, or docs that reference GPT-5.6 Cursor models use the verified Cursor slugs rather than guessed names.
- If Cursor has not exposed the models yet, the item records the observed state and the next recheck date.
