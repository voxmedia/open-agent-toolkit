---
name: oat-project-retro-file
version: 1.0.2
description: Use when the user requests or confirms filing proposed feedback from a project retro into repository or upstream GitHub issues and OAT backlog items. Runs destination capability, duplicate, approval, and sanitization checks before filing, then writes destinations and statuses back to the retro artifact.
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Bash(jq:*), Bash(pnpm:*), Bash(gh:*), Bash(oat backlog:*), Bash(oat config:*), Bash(oat project push:*), Bash(oat project scope:*), Glob, Grep, AskUserQuestion
---

# File Project Retro Feedback

Route tracker-bound project-retro items to host-repository or OAT-upstream
destinations, with capability preflight, duplicate handling, consent, and
idempotent status writeback.

This skill never applies `Disposition: apply` repo edits and never mutates
`oat_retro_promotions`.

## Progress Indicators (User-Facing)

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

Before ordinary selection, run a **pre-selection integrity pass** over every
item already marked `Status: filed`:

- Classify its destination as a GitHub issue URL or a canonical local backlog
  path.
- For GitHub, require a valid destination URL and require
  `Destination-receipt: —` plus `Remote-visibility: —`; GitHub destinations do
  not use local receipt fields.
- For local backlog destinations, resolve the latest commit for the exact path
  with `git log -1 --format=%H -- "$DESTINATION_PATH"`. Verify the path appears
  in that commit, the current file exists, and its ID, title, mechanism, and
  acceptance scope still represent the retro proposal. Derive remote visibility
  from the configured upstream: no upstream or a commit not reachable from it
  means `unpushed`; only reachability from the upstream means `pushed`.
- A local item with a missing, stale, or invalid receipt is not skippable. Valid
  exact-path recovery may retain `filed` and write the recovered
  `Destination-receipt` and `Remote-visibility` without external mutation. If
  recovery or current-destination coherence fails, it cannot remain `filed`:
  set it back to `proposed`, clear both receipt fields to `—`, explain the
  invalid state in `Disposition-note`, and include it in ordinary selection.
- A malformed GitHub filed state likewise returns to `proposed`; do not preserve
  or skip an invalid destination-type state.

After the integrity pass, select by the filing status vocabulary:

- Process `Status: proposed`.
- Skip `filed` only when its destination-type state is complete and valid.
- Skip `rejected`.
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
- Configured destination consent authorizes creating a new item only when no
  duplicate is found and all destination-required metadata is already present.
  It does not authorize modifying an existing destination.

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

Classify each candidate before choosing a disposition:

- **Exact duplicate:** the existing title identifies the same outcome, its
  tracked mechanism matches the proposed mechanism, and its acceptance scope
  already covers the proposal.
- **Merely related:** the item shares a subsystem, symptom, or keywords, but
  its title, mechanism, or acceptance scope does not cover the proposal.

Recommend **Strengthen** only for a genuine scope and mechanism match. If the
new evidence would broaden the tracked mechanism or acceptance scope, recommend
**File as new** instead, unless the user explicitly approves an umbrella
retitle and corresponding scope change to the existing item. Search proximity
alone never makes an item a duplicate.

For a suspected duplicate in an interactive run, select one explicit
disposition:

1. **Strengthen** — default only for an exact duplicate. Add this run's new
   evidence to the existing issue as a comment, or append a concise
   evidence/insight note to the existing backlog item and run
   `oat backlog regenerate-index`.
2. **File as new** — create a separate item despite the candidate.
3. **Skip** — leave the retro item `proposed` unless it is explicitly rejected.
4. **Link existing** — record the existing URL/path without adding content.

Strengthened and linked items receive `Status: filed` and the existing
`Destination`.

**Deterministic non-interactive duplicate handling:** configured filing consent
does not grant separate consent to mutate an existing destination. Do not
strengthen, edit, comment on, or refile an external duplicate without separate
consent recorded for that side effect. When the search result is a validated
existing destination that unambiguously represents the current item and policy
permits linking, safely link it without an external write. A GitHub link
requires a valid URL and uses `—` for both local receipt fields. A local link
must complete the exact-path receipt recovery and current-destination coherence
checks from Step 2 before it may set or retain `Status: filed`. Copy the
validated URL/path to `Destination` and explain the recovery in
`Disposition-note`. If the candidate or receipt is ambiguous, linking is not
permitted, or destination coherence fails, perform no external write, leave the
item unsettled, and report the candidate for a future interactive disposition.

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

Use this **destination-first** local transaction for every newly created or
strengthened local backlog destination:

1. Format and verify the created or strengthened backlog item and regenerated
   index.
2. Commit the destination side effect before setting the retro item to
   `Status: filed`. Do not include retro writeback in this destination commit.
3. Capture the full destination commit SHA and verify that the commit contains
   the destination path. Inspect the complete name-only commit output and
   enforce that the destination commit must not contain `RETRO_PATH`; a
   command success without the path, or a commit containing retro writeback, is
   not a receipt.
4. Determine remote visibility from the branch's configured upstream and
   local remote-tracking state. Record exactly `pushed` when the destination
   commit is reachable from that upstream. No configured upstream, or a commit
   not reachable from it, means `unpushed`.
5. Only after the receipt is confirmed, write back the retro in a subsequent
   commit with `Destination`, `Destination-receipt`, and `Remote-visibility`.
6. Capture the full writeback commit SHA and require it to differ from the
   destination commit. For shared/local projects, run
   `git merge-base --is-ancestor "$DESTINATION_COMMIT" "$WRITEBACK_COMMIT"`.
   For synced projects, the writeback lives on the independent project ref, so
   ancestry is not expected; verify the destination commit and exact-path
   receipt first, then perform the project push and retain both SHAs as the
   ordering proof. In both branches, the destination commit predates the
   writeback commit: shared/local history proves it by ancestry, while the
   synced transaction proves it by verified-before-push sequencing.

If the destination mutation commit fails, stop that item without retro
writeback; a failed destination commit yields no receipt and must never yield
`Status: filed`.

Local commit durability does not imply remote visibility. Pushing is a
separately authorized Git operation: never push implicitly, never treat filing
consent as push authorization, and report an unpushed receipt as durable but
local-only.

The destination-type transition contract is:

| Scenario            | Destination side effect | Receipt rule                                                              | Filed result                                          |
| ------------------- | ----------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| New local           | Create backlog item     | Separate mutation commit contains path and excludes retro                 | Filed only after later retro writeback                |
| Strengthened local  | Modify backlog item     | Separate mutation commit contains path and excludes retro                 | Filed only after later retro writeback                |
| Linked local        | No destination mutation | Recover latest exact-path commit and verify current destination coherence | Retain or set filed only with valid recovered receipt |
| Failed local commit | Mutation did not commit | No receipt                                                                | Must not be filed                                     |
| No upstream         | None                    | Valid local receipt                                                       | Filed with `Remote-visibility: unpushed`              |
| GitHub              | Create or link issue    | Destination URL; local receipt fields are `—`                             | Filed only with valid URL                             |
| Rerun               | No new mutation         | Pre-selection integrity validates destination-type state                  | Skip only complete valid filed items                  |

For non-interactive backlog filing, all required backlog metadata — title,
description, acceptance criteria, labels, priority, scope, and scope estimate —
must already be explicit in the retro item. When any required backlog metadata
is missing, perform **no external write**: do not prompt or invent values, leave
the item unsettled at its current eligible status, record the missing field
names in `Disposition-note`, and report the missing metadata. Configuration
selects the destination; it does not supply or authorize inferred tracker
content.

### Step 8: Write Back Statuses and Rollup

For each confirmed filing, strengthening, or link:

- set `Status: filed`;
- set `Destination` to the issue URL or backlog ID/path; and
- for local backlog destinations, set `Destination-receipt` to the confirmed
  full commit SHA and `Remote-visibility` to `pushed | unpushed`;
- for GitHub destinations, set `Destination-receipt: —` and
  `Remote-visibility: —`; these fields are local-Git metadata and never apply
  to issue URLs;
- set `Disposition-note` to a concise filing/linking outcome or `—`; and
- set `Sanitized: yes` when the public-destination check ran.

For explicitly rejected items, set `Status: rejected` and preserve the reason
in `Disposition-note`. For an unavailable configured lane, set
`Status: no-destination`, keep `Destination: —`, and record the unblock action
in `Disposition-note`. Execution failures and missing-metadata cases remain
unsettled at their current eligible status with bounded detail in
`Disposition-note`.

Recompute `oat_retro_filing` from all UP items plus RP file-items:

- `none`: no filing items exist;
- `proposed`: filing items exist and none are settled;
- `partial`: some, but not all, items are settled;
- `complete`: every filing item is `filed` or `rejected`.

Refresh the contents of the bounded `## Current State` section from register
fields and frontmatter rollups after recomputing the rollup.

Filing mode may mutate only `Status`, `Destination`, `Sanitized`,
`Destination-receipt`, `Remote-visibility`, `Disposition-note`, and
`oat_retro_filing` on selected filing items, plus the contents of
`## Current State`. Do not alter apply-items, `Applied-ref`,
`oat_retro_promotions`, any RP disposition, proposal bodies, or any other
narrative. Refresh `Current State` without rewriting proposal bodies. Proposal
bodies are stable and immutable after generation.

Format and commit the retro writeback only after a local destination receipt is
confirmed. GitHub destinations are represented by their validated URLs and
explicit `—` local receipt fields. On re-run, skip a `filed` item only after the
pre-selection integrity pass proves its destination-type state complete and
valid; retry all eligible unsettled statuses.

Resolve project scope and fail closed before committing the writeback. For a
synced project, capture the project-ref commit returned by the push; otherwise
commit only the retro artifact on the current branch:

```bash
PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || {
  echo "oat: cannot resolve project scope for $PROJECT_PATH; refusing to commit artifacts" >&2
  exit 1
}
```

Define this fail-closed parser before the writeback push. If it rejects the
receipt, print the full CLI JSON, run `oat project pull "$PROJECT_PATH"`,
resolve the reported conflict, and retry the original push.

```bash
parse_synced_push_receipt() {
  node -e '
let value;
try { value = JSON.parse(process.argv[1]); } catch { process.exit(1); }
if (!["pushed", "up-to-date"].includes(value.status) || !/^[0-9a-f]{40}$/.test(value.sha)) process.exit(1);
process.stdout.write(value.sha);
' "$1"
}
```

```bash
if [ "$PROJECT_SCOPE" = "synced" ]; then
  RETRO_PUSH=$(oat project push "$PROJECT_PATH" --message "chore(oat): record project retro filing writeback" --json)
  WRITEBACK_COMMIT=$(parse_synced_push_receipt "$RETRO_PUSH") || { printf '%s\n' "$RETRO_PUSH" >&2; echo "Recovery: run oat project pull \"$PROJECT_PATH\", resolve conflicts, then retry this push." >&2; exit 1; }
else
  git add "$RETRO_PATH"
  git diff --cached --quiet || git commit -m "chore(oat): record project retro filing writeback"
  WRITEBACK_COMMIT=$(git rev-parse HEAD)
fi

if [ -n "${DESTINATION_COMMIT:-}" ]; then
  [ "$DESTINATION_COMMIT" != "$WRITEBACK_COMMIT" ] || exit 1
  if [ "$PROJECT_SCOPE" = "synced" ]; then
    git cat-file -e "${DESTINATION_COMMIT}^{commit}" || exit 1
  else
    git merge-base --is-ancestor "$DESTINATION_COMMIT" "$WRITEBACK_COMMIT" || exit 1
  fi
fi
```

## Final Report

Report:

- lane × destination capability matrix;
- filed, strengthened, linked, skipped, rejected, and undeliverable counts;
- every created or existing destination;
- all unavailable lanes with concrete unblock actions;
- final `oat_retro_filing` rollup; and
- destination and writeback commit hashes when local files changed; and
- `pushed` or `unpushed` remote visibility for every local destination receipt.

## Success Criteria

- Only UP items and RP `Disposition: file` items are processed.
- Capability results appear before item approval.
- Interactive filing has explicit item disposition; non-interactive filing
  follows config exactly.
- Duplicate candidates are strengthened, filed as new, skipped, or linked
  explicitly.
- Public posts from private sources pass sanitization, including comments.
- Every `filed` status has a confirmed destination.
- Every locally filed backlog item has a confirmed destination commit receipt
  and explicit pushed/unpushed visibility; no push occurs implicitly.
- Re-runs are idempotent and retry newly deliverable `no-destination` items.
- Filing writeback updates only allowed fields, `oat_retro_filing`, and the
  derived `Current State` contents.
