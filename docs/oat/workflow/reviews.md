# Reviews

Review loop:

1. Request review (`oat-request-review`)
2. Receive review and convert findings into tasks (`oat-receive-review`)
3. Implement fixes (`oat-implement`)
4. Re-review until passing status

## Status model

Status progression in `plan.md` Reviews table:

- `pending`
- `received`
- `fixes_added`
- `fixes_completed`
- `passed`

## Current policy

- Critical/Important: address before pass.
- Medium: address by default; defer only with explicit approval and disposition.
- Minor: normally addressed, can be deferred with rationale.

## Phase and final review

Use phase-scoped review artifacts during implementation (`p01`, `p02`, etc), then run final review before project closeout.

## Reference artifacts

- `.oat/projects/<scope>/<project>/plan.md` (`## Reviews`)
- `.oat/projects/<scope>/<project>/reviews/`
- `.agents/skills/oat-request-review/SKILL.md`
- `.agents/skills/oat-receive-review/SKILL.md`
