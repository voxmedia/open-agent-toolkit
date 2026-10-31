---
id: BL-260830-add-remote-review-respond
title: Add remote review respond and summarize skill set
status: open
priority: medium
scope: feature
scope_estimate: L
labels:
  - skills
  - review
  - legacy-promoted
assignee: null
created: 2026-08-30T22:30:54.971Z
updated: 2026-10-31T21:08:00Z
associated_issues: []
external_plans: []
---

## Description

Promoted from legacy backlog record bl-9fb8. Complete the remaining remote-review respond and summarize skills while keeping GitHub posting explicitly approval-gated.

**Delivery status (2026-10-31):** Landed: the respond half. `oat-review-receive-remote`
Step 7 ("Optional GitHub Reply Posting",
`.agents/skills/oat-review-receive-remote/SKILL.md:213`, since #29) posts
replies only after the user approves. Remaining: a remote review summarize skill; none is
bundled under `.agents/skills`.

## Acceptance Criteria

- A remote review summarize skill has a contract distinct from, and not overlapping, `oat-review-receive-remote`'s reply posting, for repo and project review flows.
- The skill preserves source review identity and produces deterministic summaries across re-review rounds.
- Every GitHub posting or reply action remains explicitly user-approved.
- Registration, bundle consistency, and representative remote-review tests cover the new skill.
