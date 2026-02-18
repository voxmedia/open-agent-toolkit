# Reviews

Review loop:

1. Request review (`oat-project-review-provide`)
2. Receive review and convert findings into tasks (`oat-project-review-receive`)
3. Implement fixes (`oat-project-implement`)
4. Re-review until passing status

## Project vs ad-hoc

- `oat-project-review-provide` is project-scoped and requires `.oat/active-project` + project `state.md`.
- `oat-review-provide` is for non-project commit-range reviews (ad-hoc, no project state required).

## Status model

Status progression in `plan.md` Reviews table:

- `pending`
- `received`
- `fixes_added`
- `fixes_completed`
- `passed`

## Current policy

- Critical/Important: address before pass.
- Medium: address by default; defer only with explicit approval and recorded rationale/disposition.
- Minor (non-final scopes): auto-deferred by default with rationale; do not block review completion.
- Minor (final scope): not auto-deferred; require explicit user disposition (defer vs convert), and explain each minor in plain language before asking.

## Phase and final review

Use phase-scoped review artifacts during implementation (`p01`, `p02`, etc), then run final review before project closeout.

Final review `passed` gate requires:
- No unresolved Critical/Important/Medium findings.
- Deferred Medium findings resurfaced and explicitly dispositioned.
- Minor findings explicitly dispositioned (after plain-language explanation).

## Reference artifacts

- `.oat/projects/<scope>/<project>/plan.md` (`## Reviews`)
- `.oat/projects/<scope>/<project>/reviews/`
- `.oat/projects/local/orphan-reviews/` (default local-only storage for ad-hoc review artifacts)
- `.oat/repo/reviews/` (tracked storage convention when explicitly desired)
- `.agents/skills/oat-review-provide/SKILL.md`
- `.agents/skills/oat-project-review-provide/SKILL.md`
- `.agents/skills/oat-project-review-receive/SKILL.md`
