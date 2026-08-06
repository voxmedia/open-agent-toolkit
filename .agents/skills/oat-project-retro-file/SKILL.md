---
name: oat-project-retro-file
version: 1.0.0
description: Use when the user requests or confirms filing proposed feedback from a project retro into repository or upstream GitHub issues and OAT backlog items. Runs destination capability, duplicate, approval, and sanitization checks before filing, then writes destinations and statuses back to the retro artifact.
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Bash(gh:*), Bash(oat backlog:*), Bash(oat config:*), Glob, Grep, AskUserQuestion
---

# File Project Retro Feedback

Route tracker-bound project-retro items to host-repository or OAT-upstream
destinations, with capability preflight, duplicate handling, consent, and
idempotent status writeback.

This skill never applies `Disposition: apply` repo edits and never mutates
`oat_retro_promotions`.

## Progress Indicators

Print one banner and concise step indicators:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ FILE RETRO FEEDBACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Use steps for artifact resolution, item extraction, capability preflight,
duplicate/approval review, filing, and writeback.

## Artifact Hygiene

Before finishing or committing, format every created or edited file with the
repository's documented write/fix formatter, preferably file-scoped. Run
checks relevant to the touched files. Never stage unrelated changes.

## Process

### Step 1: Resolve the Retro Artifact

Use an explicit artifact path when provided. Otherwise resolve the active
project:

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
RETRO_PATH="${PROJECT_PATH}/references/project-retro.md"
```

If the project or artifact is missing, report the missing path and stop. Do not
generate a retro implicitly.

Read the artifact frontmatter and both registers. Validate that RP items have
an authoritative disposition and that status/fields match the template
contract before filing.

### Step 2: Extract Eligible Items

Build two lanes:

- **Repo lane:** every RP item with `Disposition: file`.
- **Upstream lane:** every UP item.

Select items by the filing status vocabulary:

- Process `Status: proposed`.
- Skip `filed` and `rejected`.
- Retry `no-destination` only when this run's preflight finds a destination
  that is now available.

Never select or mutate RP items with `Disposition: apply`.

### Step 3: Resolve Repositories and Capabilities

Resolve:

```bash
UPSTREAM_REPO=$(oat config get workflow.retro.upstreamRepo 2>/dev/null || true)
UPSTREAM_REPO="${UPSTREAM_REPO:-voxmedia/open-agent-toolkit}"
```

Derive the host repo slug from `git remote get-url origin`. If it equals
`UPSTREAM_REPO`, collapse the upstream lane into the repo lane so items are
reviewed and filed once.

Before presenting items, probe every lane × candidate destination and print a
matrix:

| Lane     | Destination | Required capability                                   |
| -------- | ----------- | ----------------------------------------------------- |
| repo     | issues      | repository issues enabled and `gh` authenticated      |
| repo     | backlog     | canonical OAT backlog initialized and writable        |
| upstream | issues      | upstream issues enabled and `gh` authorized to create |
| either   | none        | intentionally disabled; no external capability        |

For issue destinations, verify `gh auth status` and repository issue
availability without creating anything. For backlog, verify the canonical
`.oat/repo/pjm/backlog/` structure and `oat backlog` command. Report unavailable
capabilities and their concrete unblock step.

Print the complete matrix before item approval. Do not silently omit an
unavailable lane.

### Step 4: Resolve Destinations and Consent

Read:

```text
workflow.retro.filing.repo      # issues | backlog | none
workflow.retro.filing.upstream  # issues | none
```

These are defaults, not universal fallbacks.

**Interactive run:**

1. Show configured defaults, capability results, and item counts.
2. Confirm or override the available destination per lane for this run.
3. Present every item and suspected duplicate for an explicit disposition.

**Non-interactive run:**

- Use configured destinations exactly as written.
- Absent config or `none` files nothing for that lane.
- Do not choose an alternative destination automatically.
- Explicit filing config is consent only for that configured destination.

Items in a lane with no usable destination become `Status: no-destination`
only after the lane is reported loudly with the unblock action.

### Step 5: Check Duplicates

Run a duplicate check before filing each item.

**GitHub issue destination:**

```bash
gh search issues --repo "<owner/repo>" "<title and distinguishing keywords>" --state all
```

Inspect likely matches; a search hit is a candidate, not proof.

**Backlog destination:**

Search titles and distinguishing keywords across:

- `.oat/repo/pjm/backlog/items/*.md`
- `.oat/repo/pjm/backlog/archived/`
- `.oat/repo/pjm/backlog/completed.md`

Include archived/completed work so recently closed items are not refiled.

For a suspected duplicate, select one explicit disposition:

1. **Strengthen** — default when applicable. Add this run's new evidence to
   the existing issue as a comment, or append a concise evidence/insight note
   to the existing backlog item and run `oat backlog regenerate-index`.
2. **File as new** — create a separate item despite the candidate.
3. **Skip** — leave the retro item `proposed` unless it is explicitly rejected.
4. **Link existing** — record the existing URL/path without adding content.

Strengthened and linked items receive `Status: filed` and the existing
`Destination`.

### Step 6: Sanitize Public-Destination Content

When the source repository is private and the destination is public, verify
every issue body and strengthening comment before posting:

- no verbatim private log or transcript excerpts;
- no internal URLs or hostnames;
- no credential-shaped strings, tokens, cookies, or authorization headers;
- no private user, customer, project, or infrastructure identifiers; and
- only the minimum generalized evidence needed to make the item actionable.

Show the sanitized draft during interactive approval. Sanitization applies to
new issues and strengthening comments alike. Set `Sanitized: yes` only after
this verification. If safe sanitization would remove necessary meaning, do not
post; report the item as undeliverable.

### Step 7: File Approved Items

**GitHub issue:**

```bash
gh issue create --repo "<owner/repo>" --title "<title>" --body "<sanitized tracker-ready body>"
```

Capture the returned URL. Stop and report command failures; do not write a
filed status without a confirmed destination.

**OAT backlog item:**

Follow `oat-pjm-add-backlog-item` conventions:

1. Confirm title, description, acceptance criteria, labels, priority, and scope
   estimate.
2. Run `oat backlog new ...` to create the canonical file-per-item record.
3. Enrich only its acceptance criteria/body as allowed by that skill.
4. Run `oat backlog regenerate-index` after strengthening an existing item or
   when indexed fields changed.

Never hand-author an item ID or edit inside managed index markers. Capture the
created item ID/path.

### Step 8: Write Back Statuses and Rollup

For each confirmed filing, strengthening, or link:

- set `Status: filed`;
- set `Destination` to the issue URL or backlog ID/path; and
- set `Sanitized: yes` when the public-destination check ran.

For explicitly rejected items, set `Status: rejected`. For an unavailable
configured lane, set `Status: no-destination` and keep `Destination: —`.
Execution failures remain `proposed`.

Recompute `oat_retro_filing` from all UP items plus RP file-items:

- `none`: no filing items exist;
- `proposed`: filing items exist and none are settled;
- `partial`: some, but not all, items are settled;
- `complete`: every filing item is `filed` or `rejected`.

Do not alter apply-items, `Applied-ref`, item proposal bodies,
`oat_retro_promotions`, or any RP disposition.

Format and commit the retro writeback with created/strengthened backlog files
when local. GitHub destinations are represented by their recorded URLs. On
re-run, skip settled items and retry only eligible statuses.

## Final Report

Report:

- lane × destination capability matrix;
- filed, strengthened, linked, skipped, rejected, and undeliverable counts;
- every created or existing destination;
- all unavailable lanes with concrete unblock actions;
- final `oat_retro_filing` rollup; and
- commit hash when local files changed.

## Success Criteria

- Only UP items and RP `Disposition: file` items are processed.
- Capability results appear before item approval.
- Interactive filing has explicit item disposition; non-interactive filing
  follows config exactly.
- Duplicate candidates are strengthened, filed as new, skipped, or linked
  explicitly.
- Public posts from private sources pass sanitization, including comments.
- Every `filed` status has a confirmed destination.
- Re-runs are idempotent and retry newly deliverable `no-destination` items.
- Filing writeback updates only allowed fields and `oat_retro_filing`.
