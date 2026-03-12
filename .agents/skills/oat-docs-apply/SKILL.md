---
name: oat-docs-apply
version: 1.2.0
description: Run when you have a docs analysis artifact and want to generate or update documentation structure and content. Creates a branch, applies approved changes, and optionally opens a PR.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Edit, Bash(git:*), Bash(gh:*), Glob, Grep, AskUserQuestion
---

# Docs Apply

Generate or update documentation files from a docs analysis artifact, with explicit approval and branch-based workflow.

## Prerequisites

- A recent docs analysis artifact in `.oat/repo/analysis/`.
- If no analysis exists, run `oat-docs-analyze` first.
- `jq` available in PATH for tracking updates.
- `gh` available if a PR should be opened automatically.

## Mode Assertion

**OAT MODE: Docs Apply**

**Purpose:** Apply approved documentation changes derived from a docs analysis artifact.

**BLOCKED Activities:**

- No unapproved documentation changes.
- No branch creation before the recommendation plan is reviewed.
- No changes outside the documentation scope except deterministic nav sync and tracking updates.

**ALLOWED Activities:**

- Reading analysis artifacts and the current docs surface.
- Creating or updating docs files and `mkdocs.yml` when approved.
- Running `oat docs nav sync` after approved structural changes.
- Creating branches, commits, and optional PRs.

## Analyze vs Apply Boundary

Treat the docs analysis artifact as the source of truth for what should be changed and why.

Apply may:

- read the exact evidence sources cited by the artifact
- verify that cited files still exist
- translate approved recommendations into concrete docs changes

Apply must **not**:

- invent unsupported docs conventions
- infer structure or migration rules from defaults or a tiny sample
- create new recommendations that are not present in the artifact
- silently fill in missing evidence gaps

**Self-Correction Protocol:**
If you catch yourself:

- Editing docs outside approved recommendations -> STOP and remove the extra change from the work plan.
- Applying manual nav changes when `oat docs nav sync` should be used -> STOP and switch to the CLI helper.

**Recovery:**

1. Return to the approved recommendation list.
2. Re-apply only approved docs changes and deterministic nav sync.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what’s happening.

- Print a phase banner once at start:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ DOCS APPLY
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Use step indicators:
  - `[1/7] Loading analysis artifact…`
  - `[2/7] Building recommendation plan…`
  - `[3/7] Reviewing approvals…`
  - `[4/7] Creating branch…`
  - `[5/7] Applying docs changes…`
  - `[6/7] Running nav sync + verification…`
  - `[7/7] Committing, tracking, and summary…`

## Process

### Step 0: Intake - Find Analysis Artifact

Locate the most recent docs analysis artifact:

```bash
ls -t .oat/repo/analysis/docs-*.md 2>/dev/null | head -1
```

If none exists, stop and instruct the user to run `oat-docs-analyze`.

Validate that each recommendation in the artifact includes:

- evidence
- confidence
- disclosure
- link targets when disclosure is `link_only`

If the artifact is missing that detail, stop and tell the user to re-run `oat-docs-analyze`.

### Step 1: Build the Recommendation Plan

Read the analysis artifact and build the plan from its recommendations.
Do not rediscover conventions from scratch during this step.

Common docs actions:

- Create missing `index.md`
- Add or repair `## Contents`
- Convert `overview.md` usage to the `index.md` contract
- Add or update `docs/contributing.md` plugin guidance
- Scaffold an OAT docs app when no docs app exists
- Run `oat docs nav sync` after approved structural changes

Carry forward the artifact's evidence refs, confidence, disclosure mode, and link targets into the apply plan.

Coverage-gap recommendations may also be:

- `omit`
- `ask_user`

If evidence is missing, stale, or contradicts the current docs tree, stop and ask for a fresh analysis instead of guessing.

Use `references/apply-plan-template.md` and preserve the exact presented markdown as `APPLY_PLAN_MARKDOWN` for commit/PR summary use.

### Step 2: Review the Plan with the User

Present the full recommendation plan first, then ask which review mode they want:

- `apply all`
- `apply interactively`
- `discuss`

For review-mode and follow-up decisions, use host-aware prompting:

- Claude Code: `AskUserQuestion`
- Codex: structured user-input tooling when available in the current host/runtime
- Fallback: plain-text questions

If the user chooses `apply all`:

- confirm the full plan
- capture any global notes that apply across the whole plan
- treat all non-blocked recommendations as approved unless the user names exceptions

If the user chooses `apply interactively`, ask for each recommendation:

- `approve`
- `modify`
- `skip`

If the user chooses `discuss`, answer questions, revise the plan if needed, and then ask again:

- `apply all`
- `apply interactively`
- `discuss`

If all recommendations are skipped, stop without changing files.

Build an `APPLIED_PLAN_DETAILS` block from approved or modified recommendations with:

- recommendation id
- action
- target path
- disclosure
- evidence refs
- decision (`approved_via_apply_all` / `approved` / `modified`)
- user notes

### Step 3: Create Branch

After approvals:

```bash
TIMESTAMP=$(date -u +"%Y-%m-%d-%H%M")
BRANCH="oat/docs-${TIMESTAMP}"
git checkout -b "$BRANCH"
```

If branch creation fails because of unrelated local changes, ask the user to resolve that state before continuing.

### Step 4: Apply Approved Changes

For each approved recommendation:

1. Read only the affected docs files and the evidence sources cited by the artifact.
2. Make targeted edits that satisfy the approved fix.
3. Preserve existing prose and only change the necessary sections.
4. Honor the disclosure mode from the artifact:
   - `inline` -> keep the essential guidance in the target page
   - `link_only` -> add a concise pointer to the canonical doc/config/example
   - `omit` -> do not encode the item in the docs change
   - `ask_user` -> require explicit user confirmation before writing

When approved actions involve docs app creation or nav updates:

- Use `oat docs init` for scaffolding when appropriate.
- Use `oat docs nav sync` instead of manually editing nav when the CLI helper can generate it.

Negative rules:

- Do not invent docs structure rules, migration rules, or plugin guidance not backed by the artifact's cited evidence.
- Do not inline large setup/config details when the artifact says `link_only`.
- Do not create replacement link targets if the artifact omitted them; stop and ask for a fresh analysis or user guidance.
- If a cited source no longer exists, stop that recommendation and ask for a fresh analysis or user guidance.

### Step 5: Verify and Sync Navigation

Run the smallest relevant verification set based on what changed:

- `oat docs nav sync`
- `pnpm --dir <docs-app> docs:lint` (no-op when no linter is configured)
- `pnpm --dir <docs-app> docs:format:check`
- `pnpm --dir <docs-app> docs:build`

If no docs app exists yet, use file-level verification and confirm the structural contract manually in the summary.

### Step 6: Commit and PR

Commit the approved changes:

```bash
git add {approved-files}
git commit -m "docs: apply approved docs recommendations"
```

**Offer to open a PR:**

After committing, proactively ask the user if they'd like to open a pull request. Frame this as the recommended next step:

```
Changes committed. Would you like me to push and open a pull request?
The PR will include the applied plan summary and the full analysis artifact for reference.
```

For the PR-choice prompt, use host-aware prompting:

- Claude Code: `AskUserQuestion`
- Codex: structured user-input tooling when available in the current host/runtime
- Fallback: plain-text questions

**If creating PR:**

1. Push the branch.
2. Create a PR with the structure below.
3. The PR body must include the full analysis artifact in a collapsible section at the bottom so reviewers can see the evidence behind every change.

```bash
git push -u origin "$(git rev-parse --abbrev-ref HEAD)"
gh pr create --base main \
  --title "docs: apply approved docs recommendations" \
  --body "$(cat <<'PRBODY'
## Summary

- Applied docs recommendations from analysis artifact
- Source: {analysis-artifact-path}
- Result: {N} created, {N} updated, {N} skipped

## Applied Plan

{APPLY_PLAN_MARKDOWN}

## Verification

- {commands run and results}

---

## Full Analysis Artifact

The complete analysis that produced these recommendations is included below for reviewer reference.

<details>
<summary>Click to expand full analysis</summary>

{full contents of the analysis artifact markdown file}

</details>
PRBODY
)"
```

**If `gh` is not available or fails:**

```
PR creation failed. To create manually:
1. Push: git push -u origin {branch}
2. Open PR at your repository's web interface
3. Use the structure above in the PR body, including the full analysis in a collapsible section
```

### Step 7: Update Tracking and Output Summary

Update shared tracking:

```bash
TRACKING_SCRIPT=".agents/skills/oat-agent-instructions-analyze/scripts/resolve-tracking.sh"
ROOT_TARGET=$(bash "$TRACKING_SCRIPT" root)
ROOT_HASH=$(echo "$ROOT_TARGET" | jq -r '.commitHash')
ROOT_BRANCH=$(echo "$ROOT_TARGET" | jq -r '.baseBranch')

bash "$TRACKING_SCRIPT" write \
  docsApply \
  "$ROOT_HASH" \
  "$ROOT_BRANCH" \
  "apply"
```

Output:

```text
Apply complete.

  Files created:   {N}
  Files updated:   {N}
  Files skipped:   {N}
  Docs target:     {path}
  Verification:    {commands run}

Next step: Re-run oat-docs-analyze if you want a post-apply verification artifact.
```

## Deferred from v1

- Automatic content synthesis for missing topic pages
- Multi-docs-app fanout in one apply session
- Bulk conversion of legacy docs trees without user review

## References

- Apply plan template: `references/apply-plan-template.md`
- Shared tracking helper: `.agents/skills/oat-agent-instructions-analyze/scripts/resolve-tracking.sh`
