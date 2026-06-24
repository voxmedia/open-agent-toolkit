---
name: update-repo-reference
version: 1.3.0
description: Retired. Use oat-pjm-update-repo-reference instead. The repo reference layer moved from .oat/repo/reference/ to the two-layer .oat/repo/pjm/ + reference/ taxonomy.
disable-model-invocation: true
user-invocable: true
---

# Update OAT Repo Reference

> **Retired — do not follow the process below.** This skill predates the PJM
> two-layer restructure and points at the old single `.oat/repo/reference/`
> layout (live `current-state.md`/`roadmap.md`/`backlog/` and a single
> `decision-record.md`). Use **`oat-pjm-update-repo-reference`** instead, which
> targets the current taxonomy:
>
> - Active operational state under `.oat/repo/pjm/` (`current-state.md`,
>   `roadmap.md`, `backlog/`).
> - Durable references under `.oat/repo/reference/`, with file-per-record
>   decisions created via `oat decision new` under `reference/decisions/`.
>
> The path guidance in the sections below is **historical/legacy context only**
> and describes the pre-migration layout. It is kept for repos that have not yet
> run `oat pjm migrate`.

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

### Step 1b: Mine Recent Project Artifacts for Deferred Work and Decisions

Recent project artifacts often contain deferred tasks, convention decisions, and out-of-scope items that need to surface into reference docs. These are easy to miss if you only look at the reference docs themselves.

For each recently completed or in-progress project (check recent commits for project paths, or scan `{PROJECTS_ROOT}/*/state.md` for recently updated projects):

1. Read `discovery.md` — look for:
   - **Out of Scope** / **Deferred Ideas** sections → new backlog items
   - **Key Decisions** → potential ADR entries
   - **Open Questions** that were resolved → decisions to record
2. Read `design.md` (if it exists) — look for:
   - Design decisions that establish conventions → ADR candidates
   - Deferred/future phases → backlog items
3. Read `spec.md` (if it exists) — look for:
   - Non-requirements or explicitly deferred requirements → backlog items

For each finding, determine whether it should become:

- A **backlog item** (deferred work to track)
- A **decision record entry** (convention or contract worth preserving)
- A **roadmap update** (phase status change or new deliverable)

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

4. `.oat/repo/reference/backlog.md` + `.oat/repo/reference/backlog-completed.md`
   - Capture new tasks/ideas discovered during dogfooding that are not ready to implement
   - Link to friction logs, commits, or PRs where relevant
   - Move completed items (`[x]`) out of `backlog.md` entirely — add detailed completion entries to `backlog-completed.md` and remove the stubs from `backlog.md` so it stays focused on actionable work

5. `.oat/repo/reference/decision-record.md`
   - Record notable decisions (especially workflow contracts, directory layout, and phase guardrails)
   - Include rationale and consequences so future sessions don’t re-litigate decisions

Optional:

- `.oat/repo/archive/` for historical notes we intentionally keep out of active reference flow.

### Step 3: Sanity Checks (Fast)

1. Search for stale “pending/planned” references:

```bash
rg -n "pending\\)|planned\\)|not yet implemented|Remaining:" .oat/repo/reference
```

2. Search for outdated paths (common offenders):

```bash
rg -n "\\.oat/repo/reference/(current-state|roadmap|deferred-phases|decision-record|backlog|backlog-completed)\\.md" .oat/repo/reference docs/oat .agents/skills AGENTS.md
```

3. Search for hardcoded project-root assumptions (prefer `oat config get projects.root` + `oat config get activeProject`):

```bash
rg -n "\\.oat/projects/shared/|\\.oat/projects-root|\\.oat/active-project" .agents/skills/oat-*/SKILL.md .oat/templates .oat/repo/reference -S
```

4. Ensure new skills are registered in `AGENTS.md` (if meant to be discoverable):

```bash
rg -n "<name>update-repo-reference</name>" AGENTS.md || true
```

### Step 4: Output

Provide:

- The list of files updated
- A brief note of what was changed in each
- Any remaining inconsistencies you intentionally deferred
