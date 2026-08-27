---
name: triage-oat-issues
version: 1.0.0
description: Use when triaging Open Agent Toolkit GitHub issues or suspected OAT defects from issue lists, reports, or research notes. Verifies claims, aligns the file-backed backlog, opens a reviewable triage PR, and resumes post-merge issue actions.
argument-hint: '[scope, issue references, research-note path, or resume PR reference]'
disable-model-invocation: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion, Skill
user-invocable: true
compatibility: Repository-specific to voxmedia/open-agent-toolkit; requires gh and the OAT PJM backlog.
metadata:
  distribution: repository-only
---

# Triage OAT Issues

Verify suspected OAT defects, reconcile them with the repository backlog, and
separate reviewable repository changes from post-merge GitHub issue mutations.

This is a repository-only skill. Do not add it to OAT's bundled skill manifest or
publish it as part of the installed OAT skill set.

## Mode Assertion

Start every run with:

```text
Mode: OAT issue triage
Scope: <resolved scope>
Phase: <initial triage | resume post-merge>
Mutations: <none until approval | approved repository changes | approved post-merge actions>
```

Keep the user informed when verification changes a reported claim, when approval
is required, when the triage PR opens, and when a resume run encounters drift.

## When to Use

Use when:

- Triaging untriaged or explicitly selected OAT GitHub issues
- Verifying suspected bugs collected in a report or research note
- Converting verified findings into new or refined OAT backlog items
- Resuming the approved GitHub issue actions after a triage PR merges

## When NOT to Use

Do not use when:

- Implementing a bug fix or feature
- Prioritizing the full backlog without first verifying new issue claims; use
  `oat-pjm-review-backlog`
- Turning an already-approved backlog item into an implementation plan; use
  `oat-repo-improve`
- Programming or executing delivery waves; use `oat-wave-program` or
  `oat-wave-execute`

## Invocation and Scope

Infer scope from the user's natural-language invocation. Do not define or require
a flag grammar.

Interpret common forms as follows:

- `github issues` or `untriaged github issues`: all open issues that do not have
  a disposition label
- `all open github issues`: every open issue, including previously triaged issues
- Issue numbers or URLs: exactly those issues
- A research-note or report path: every concrete OAT defect claim in that source,
  cross-referenced with GitHub and the backlog
- `resume post-merge PR #123` or equivalent: resume the approved issue actions
  recorded by that merged triage PR

Treat these as disposition labels:

- `tracked-in-backlog`
- `needs-reproduction`
- `duplicate`
- `invalid`
- `wontfix`

The `question` label is not a completed disposition. Type labels such as `bug`,
`enhancement`, and `documentation` do not mean an issue has been triaged.

If the requested population is ambiguous and a reasonable default would change
which issues are included, ask the user. Otherwise state the inferred scope and
continue. For the bare phrase `github issues`, default to untriaged open issues.

## Triage Record

Create one durable record per run at:

```text
.oat/repo/pjm/triage/YYYY-MM-DD-<topic>.md
```

Use this structure:

```markdown
---
oat_triage_record: true
schema_version: 1
status: verifying
scope: <scope summary>
baseline_sha: <origin/main SHA>
triage_pr: null
created: YYYY-MM-DD
updated: YYYY-MM-DD
---

# <Triage title>

## Scope and exclusions

## Evidence baseline

## Disposition ledger

### <GH-NNN or CLAIM-NNN> — <title>

- Source:
- Claim:
- Verification:
- Confidence:
- Evidence:
- Existing coverage:
- Proposed GitHub action:
- Backlog action:
- Priority and size rationale:
- Approval:
- Post-merge result:

## Open concerns

## Resume instructions
```

Record enough detail to execute the approved post-merge actions without relying
on conversation history. Never include secrets, private downstream code, or
sensitive reproduction details in a public repository record.

Use these record states as applicable: `verifying`, `proposed`, `approved`,
`pr_open`, `post_merge_complete`, `partial`, and `blocked`.

## Workflow

### Step 1: Select Initial or Resume Mode

Resolve the invocation before doing work.

- In initial mode, follow Steps 2 through 9.
- In resume mode, go to Step 10.

Do not mix unapproved new findings into a resume run. If new findings appear,
record them for a separate triage run.

### Step 2: Establish a Current Baseline

Read the repository instructions. Confirm the checkout, branch, worktree state,
GitHub authentication, and remote repository. Fetch `origin/main` and record its
SHA before judging claims.

Use `gh` as the primary GitHub interface. Inspect both open and closed issues and
pull requests when checking history. Search active and archived backlog items,
not just the generated backlog index.

Use a dedicated branch and pull request for each initial triage run. Preserve
unrelated work. If the current worktree contains active work, create or request a
separate visible worktree using the repository's worktree workflow.

### Step 3: Create the Record and Snapshot the Scope

Create the triage record before changing backlog items. Capture:

- The exact issue set or extracted claims
- The baseline commit and retrieval date
- Any exclusions
- Current labels, state, linked pull requests, and existing backlog references

Treat reported bugs as hypotheses. Do not copy a reporter's conclusion into the
verification field until current evidence supports it.

### Step 4: Verify Every Claim

For each issue or claim, inspect the current implementation, relevant tests,
instructions, Git history, merged pull requests, and live GitHub state. Prefer a
safe, non-mutating reproduction when it materially increases confidence.

Load and execute `skeptic` for each material or uncertain claim. Give it a bounded
claim and evidence package, and ask it to search first for disconfirming evidence,
then supporting evidence. Let that skill own its subagent capability probe and
fallback behavior. If it is unavailable, perform the same disprove-then-support
sequence locally and record that fallback.

Classify the result as one of:

- Confirmed current defect
- Confirmed but narrower than reported
- Already fixed
- Duplicate or already covered
- Intended behavior, not a bug
- Downstream or private integration defect
- Enhancement or UX improvement
- Insufficient evidence

Use exact file, test, commit, pull request, and issue references. Distinguish
observed facts from inferences. Never run a mutating reproduction against the
backlog, issues, releases, or external systems.

### Step 5: Reconcile Existing Coverage

Before proposing anything new, search:

- Active and archived OAT backlog items
- Open and closed GitHub issues
- Merged and open pull requests
- Current plans or projects when they are directly relevant

Prefer linking or refining an existing backlog item over creating a duplicate.
Do not treat a superficially similar archived item as coverage unless its scope
and acceptance criteria actually cover the verified defect.

For a claim without a GitHub issue, default to a backlog-only proposal. Create a
new public issue only when the user explicitly requests it.

### Step 6: Propose Exact Dispositions

Prepare one consolidated table before making repository or GitHub mutations. For
each row show:

- Claim or issue reference and title
- Verification classification and confidence
- Evidence summary
- Existing backlog or issue coverage
- Backlog action: none, create, refine, or link existing
- Exact backlog title, priority, scope, and scope estimate when applicable
- GitHub labels to add or remove
- Comment purpose and links
- Whether to close the issue and why

Use OAT backlog values:

- Priority: `urgent`, `high`, `medium`, `low`, or `none`
- Scope: `idea`, `task`, `feature`, or `initiative`
- Scope estimate: `XS`, `S`, `M`, `L`, `XL`, or `XXL`

Explain priority from user impact, lifecycle blocking, recurrence, workaround,
and evidence quality. Explain size from implementation breadth, cross-skill or
cross-package coordination, test fixtures, migration risk, and review burden.
Do not infer priority from issue age or reporter emphasis alone.

Apply these disposition rules:

- Confirmed defect with approved backlog coverage: keep the issue open, add
  `tracked-in-backlog` after merge, and comment with the backlog item and merged
  triage PR.
- Insufficient evidence: add `needs-reproduction`, state the missing evidence,
  and keep the issue open.
- Already fixed: close only after identifying a merged fixing PR. Link that PR in
  the closing comment. The triage PR is not a fixing PR.
- Duplicate: link the canonical issue, add `duplicate`, and close.
- Invalid or declined: use `invalid` or `wontfix` only with an explicit rationale.
- Downstream or private defect: record the ownership boundary and propose an exact
  public-safe comment; do not expose private implementation details.

### Step 7: Obtain Consolidated Approval

Ask the user to approve the complete disposition table as one set. Approval must
cover both repository changes and the exact post-merge GitHub actions.

Do not create or edit backlog items, labels, comments, issue state, or public
issues before approval. Read-only verification and creation of the draft triage
record are allowed.

If a row changes after approval, preview that row again and obtain approval for
the change. Unchanged rows retain their approval.

### Step 8: Apply Approved Repository Changes

After approval:

1. Update the triage record to `approved` and capture the approved disposition.
2. Load and execute `oat-pjm-add-backlog-item` for each approved new item, passing
   the approved values without reopening settled choices.
3. Refine or cross-link existing items only as approved.
4. Include issue URLs or numbers in backlog source and association fields where
   the schema supports them.
5. Regenerate repository-managed indexes through the supported OAT workflow.
6. Run checks proportional to the changed files and inspect the final diff.

Do not implement fixes, generate implementation plans, reprioritize the unrelated
backlog, or program waves during triage.

### Step 9: Open the Triage PR and Stop

Commit only the approved triage record and backlog changes. Push the dedicated
branch and open a pull request that summarizes:

- Scope and evidence baseline
- Verified dispositions
- Backlog changes
- Deferred post-merge GitHub actions
- Open concerns or questions
- Exact resume instruction

Avoid `Closes #NNN` and similar auto-close keywords. GitHub issue state must not
change before the triage PR merges.

Set the record status to `pr_open`, add the PR reference, and include a copyable
instruction such as:

```text
After merging this PR, invoke:
/triage-oat-issues resume post-merge PR #123
```

Stop after the PR is open. Do not wait for or merge the PR unless the user
separately requests that action.

### Step 10: Resume Post-Merge Actions

On a resume invocation:

1. Verify the referenced PR belongs to this repository and is merged.
2. Fetch and refresh `origin/main`.
3. Read the approved triage record from the merged PR.
4. Confirm every referenced backlog item exists on `origin/main`.
5. Re-read each live issue and compare it with the approved action.
6. Apply unchanged approved actions idempotently.
7. Post a concise completion receipt on the merged triage PR.

The merged record is authorization for the actions it contains. Do not request a
second approval when the live issue state and merged instructions match.

If live state conflicts with the record, block only that row, explain the drift,
and ask for approval before changing its action. Continue independent unchanged
rows. Skip labels, comments, or closures already applied exactly. Never close an
already-fixed issue without the merged fixing PR link required by the record.

Report complete, partial, skipped, and blocked actions. Because the triage record
is already merged, do not open a second repository PR merely to persist the
resume result; use the receipt comment as the audit trail.

### Step 11: Offer Optional Follow-On Work

After triage completes, offer rather than automatically run:

- `oat-pjm-review-backlog` for broader priority alignment
- `oat-repo-improve` to produce implementation-ready plans for selected items
- `oat-wave-program` to group approved plans into safe execution waves

Triage completion does not authorize implementation.

## Examples

### Basic Usage

```text
/triage-oat-issues github issues
/triage-oat-issues all open github issues
/triage-oat-issues #194 #195 #197
/triage-oat-issues Research/2026-08-18-bugs-identified.md
/triage-oat-issues resume post-merge PR #223
```

### Conversational

```text
Review the untriaged OAT GitHub issues and propose backlog dispositions.

Verify every bug claim in this research note and tell me which ones belong in
the OAT backlog.

The triage PR merged. Resume the approved issue actions from PR #223.
```

## Troubleshooting

**The scope is unclear:**

- State the plausible interpretations and ask one short scope question.

**GitHub authentication fails:**

- Keep the record in `verifying`, report the blocked evidence or action, and use
  an available GitHub connector if repository instructions allow it.

**A reproduction would mutate state:**

- Do not run it. Use tests, history, or a disposable isolated fixture, or record
  the claim as insufficient evidence.

**A backlog item was merged but the issue changed afterward:**

- Treat the changed row as drift. Do not blindly execute the old action.

**The triage PR is not merged:**

- Stop post-merge execution and give the user the PR's current state.

## Success Criteria

- Every in-scope claim has a current evidence-backed classification
- Existing issues, PRs, and active and archived backlog items were checked
- Priority and size recommendations have explicit rationales
- The user approved one exact disposition ledger before mutations
- The triage record and approved backlog changes are reviewable in a dedicated PR
- No GitHub issue mutation occurs before that PR merges
- Resume execution is idempotent and drift-aware
- Fixed issues close only with links to their merged fixing PRs
- The skill remains repository-only and absent from OAT's bundled skill manifest
