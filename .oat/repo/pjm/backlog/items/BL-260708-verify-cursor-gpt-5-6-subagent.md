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
updated: '2026-07-11T03:26:19Z'
associated_issues: []
---

## Description

After Cursor exposes the GPT-5.6 family models, verify the exact subagent-eligible model slugs for Sol, Terra, and Luna before wiring them into OAT dispatch. This follows the codex-family-subagents discovery conclusion that Cursor can use generic `.cursor/agents` files with Task-level model selection, but model strings must be validated against Cursor's narrower subagent allow-list instead of inferred from general model listings.

Target this check on or after 2026-07-09, when the GPT-5.6 Cursor model entries are expected to become available.

## Acceptance Criteria

- Cursor's actual subagent-eligible GPT-5.6 model slugs for Sol, Terra, and Luna are verified with a live Cursor Task/subagent probe.
- The verified slug list is recorded in the relevant OAT project or backlog notes with the exact command/output evidence needed to reproduce it.
- Any OAT dispatch config, validation logic, or docs that reference GPT-5.6 Cursor models use the verified Cursor slugs rather than guessed names.
- If Cursor has not exposed the models yet, the item records the observed state and the next recheck date.

## Evidence / Recheck

- On 2026-07-11, commits `578fa21c`, `e7f1ee86`, `44b513ce`, and
  `f2122197` recorded and independently validated one sanitized canonical
  Cursor Task/subagent probe for all 13 recommended GPT-5.6 candidates.
- All 13 outcomes remain `unvalidated`: eight probes exited without the exact
  sentinel or recognized explicit subagent allow-list evidence, and five timed
  out. The four configured candidates are also `unvalidated`; configuration
  does not establish eligibility.
- The exact commands, outputs, exit status or timeout, environment metadata,
  outcome basis, configured subset, and recommendation disposition are in
  `.oat/projects/shared/dispatch-schema-matrix-infrastructure/references/cursor-gpt-5-6-subagent-verification.md`.
- Acceptance criteria 1 and 3 remain open because no Sol, Terra, or Luna slug
  has successful Task/subagent eligibility evidence. Criterion 2 is satisfied
  by the reproducible artifact; criterion 4 is satisfied by this observed
  state and the recorded recheck date.
- Recheck after 2026-07-18 using the same canonical protocol. Do not promote a
  broad model-catalog result or non-sentinel success to verified eligibility.
