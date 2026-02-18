---
name: update-repo-reference
description: Use when OAT implementation changes and repository reference docs must be synchronized. Updates .oat/repo/reference to match current behavior.
disable-model-invocation: true
user-invocable: true
---

# Update OAT Repo Reference

Keep this repo's OAT reference documentation consistent as implementation evolves.

## Purpose

When OAT implementation changes (new skills/templates/scripts, changed behavior, moved docs), update the repo reference docs so they remain trustworthy for humans and agents.

## When To Use

- After adding/modifying an OAT skill under `.agents/skills/`
- After changing skill frontmatter metadata (e.g., `user-invocable`, `disable-model-invocation`, `allowed-tools`)
- After changing templates under `.oat/templates/`
- After changing canonical repo reference doc locations under `.oat/repo/reference/`
- After shifting roadmap status (e.g., “pending” -> “implemented”)

## Process

### Step 1: Identify What Changed

Write down a 1-3 bullet summary of the change:
- New/updated skill(s)
- New/updated template(s)
- New/updated agent prompt(s)
- Behavior changes (routing, gating, review loop, PR loop)
- Any file moves/renames

### Step 2: Update Canonical Repo Docs (Always)

Update these files (as applicable):

1. `.oat/repo/reference/current-state.md`
   - Add/remove skills that now exist
   - Update quickstart steps if control flow changed
   - Update “Known Gaps / Next Steps”
   - Update **Last Updated** date

2. `.oat/repo/reference/roadmap.md`
   - Move items from “Known Gaps” / “pending” -> “implemented”
   - Update Phase status and deliverables lists
   - Ensure “what’s next” reflects current priorities

3. `.oat/repo/reference/deferred-phases.md`
   - Keep the Phase 3/4/… statuses consistent with roadmap
   - Ensure deliverables reflect reality (no “pending” for implemented work)

4. `.oat/repo/reference/backlog.md`
   - Capture new tasks/ideas discovered during dogfooding that are not ready to implement
   - Link to friction logs, commits, or PRs where relevant

5. `.oat/repo/reference/decision-record.md`
   - Record notable decisions (especially workflow contracts, directory layout, and phase guardrails)
   - Include rationale and consequences so future sessions don’t re-litigate decisions

Optional:
- `.oat/repo/archive/` for historical notes we intentionally keep out of active reference flow.

### Step 3: Update Pointer Docs (If Applicable)

If we keep compatibility pointers in `docs/plans/`, ensure they still point at the canonical repo reference docs:
- `docs/plans/deferred-phases.md`

### Step 4: Sanity Checks (Fast)

1. Search for stale “pending/planned” references:
```bash
rg -n "pending\\)|planned\\)|not yet implemented|Remaining:" .oat/repo/reference
```

2. Search for outdated paths (common offenders):
```bash
rg -n "\\.oat/repo/reference/(current-state|roadmap|deferred-phases|decision-record|backlog|backlog-completed)\\.md" .oat/repo/reference docs/oat .agents/skills AGENTS.md
```

3. Search for hardcoded legacy project root references (prefer `.oat/projects-root` + `.oat/active-project`):
```bash
rg -n "\\.oat/projects/shared/" .agents/skills/oat-*/SKILL.md .oat/templates .oat/repo/reference -S
```

4. Ensure new skills are registered in `AGENTS.md` (if meant to be discoverable):
```bash
rg -n "<name>update-repo-reference</name>" AGENTS.md || true
```

### Step 5: Output

Provide:
- The list of files updated
- A brief note of what was changed in each
- Any remaining inconsistencies you intentionally deferred
