---
name: oat-docs-apply
description: Run when you have a docs analysis artifact and want to generate or update documentation structure and content. Creates a branch, applies approved changes, and optionally opens a PR.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Edit, Bash(git:*), Bash(gh:*), Bash(oat:*), Bash(pnpm:*), Bash(bash:*), Bash(jq:*), Bash(mkdir:*), Bash(date:*), Bash(echo:*), Bash(cd:*), Bash(pwd:*), Glob, Grep, AskUserQuestion
metadata:
  version: '1.4.8'
---

# Docs Apply

Generate or update documentation files from a docs analysis artifact, with explicit approval and branch-based workflow.

## Hook-safe exact-path commits

Before a parent-branch commit, verify `oat internal commit-paths --help` succeeds. If unavailable, stop and update the OAT CLI; never fall back to a staged-index or pathspec-only commit. Set `COMMIT_IDENTITY` to a unique operation/artifact identity before the first attempt and retain it for every retry; use a new identity for a new operation. Pass only the exact produced file list, including tracked removals and both names of a rename. A blocked/failed result stops the workflow; retain its receipt and follow its diagnostics. Hooks remain enabled. Synced project artifacts continue through `oat project push`.

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
- No changes outside the documentation scope except the approved IA record/config mirrors, owner-authorized nav sync, tracking updates, and the individually approved tooling-update carve-out below.

**ALLOWED Activities:**

- Reading analysis artifacts and the current docs surface.
- Creating or updating docs files and hand-authored navigation when approved. Nav-sync-owned navigation changes only through `oat docs nav sync`; undeclared ownership blocks regeneration.
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

The one input is an **analysis artifact path plus approved recommendation IDs**.
Accept an explicitly supplied artifact; when none is supplied, offer the newest
artifact below and confirm that it is the reviewed input. Never silently switch
to a newer artifact after approval. IDs identify recommendations within that
artifact, remain stable through artifact review, and are never reassigned.

Locate a candidate when no artifact path was supplied:

```bash
ls -t .oat/repo/analysis/docs-*.md 2>/dev/null | head -1
```

If none exists, stop and instruct the user to run `oat-docs-analyze`.

Validate that each recommendation in the artifact includes:

- a unique stable ID (for example `R-001`)
- `approval: explicit | default`
- evidence
- confidence
- disclosure
- link targets when disclosure is `link_only`

If the artifact is missing that detail, stop and tell the user to re-run `oat-docs-analyze`.

Resolve the artifact target against `.oat/config.json` and cited local guidance.
With `documentation.tooling: markdown`, the configured root is the literal
content tree even when it contains a child `docs`; the configured index is
authored. Preserve excludes, useful audience/context/ownership prose and existing
local AGENTS files. A changed or incompatible target requires fresh analysis.

### Step 1: Build the Recommendation Plan

Read the analysis artifact and build the plan from its recommendations.
Do not rediscover conventions from scratch during this step.

Common docs actions:

- Create missing `index.md`
- Add or repair `## Contents`
- Convert `overview.md` usage to the `index.md` contract
- Add or update `docs/contributing.md` plugin guidance
- Route approved setup/adoption to `oat-docs-bootstrap`; a Markdown tree does
  not require app scaffolding
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

- confirm the full plan and capture global notes
- approve only non-blocked `approval: default` recommendations, excluding named exceptions
- Blanket approval never approves an `approval: explicit` recommendation.
- Ask for individual approval by recommendation ID for each explicit item. A
  restructure block always needs its own approval, including its full map and
  old-URL plan; approving a different block does not approve it.

In unattended mode, skip every explicit recommendation even when an input list
names its ID; report `explicit_requires_interactive_approval` in the structured
result. Never interpret automation configuration or `apply all` as individual
approval. Missing/unknown approval classes or duplicate/unknown IDs block intake.
The approved-ID list is captured at this approval step, not inferred from prose.
An input list alone does not prove individual approval for an explicit item.

If the user chooses `apply interactively`, ask for each recommendation:

- `approve`
- `modify`
- `skip`

If the user chooses `discuss`, answer questions, revise the plan if needed, and then ask again:

- `apply all`
- `apply interactively`
- `discuss`

If all recommendations are skipped, emit the structured result with reasons and stop without changing files.

Build an `APPLIED_PLAN_DETAILS` block from approved or modified recommendations with:

- recommendation id
- approval class and individual approval evidence when required
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

Independently probe each exact `authoring-docs/SKILL.md` in order:
`${SKILL_DIR}/..` from the loaded skill (`SKILL_DIR` is the absolute directory
containing that loaded `SKILL.md`), `${HOME}/.agents/skills`, then
`<repo-root>/.agents/skills`. Bind the first matching `authoring-docs` directory
once as `AUTHORING_DOCS_ROOT`; load `${AUTHORING_DOCS_ROOT}/SKILL.md` and use
that same root for every authoring-docs reference and script, never ambient
discovery. If none is found, name `authoring-docs`, stop this handoff, and give
the intended-scope recovery command: `oat tools install docs --scope <user|project>`
or `oat tools update --pack docs --scope <user|project>`.

Before content actions, use its page-purpose, landing, placement and five-axis IA
method within the approved recommendation scope. Carry the analysis artifact's ordered guidance
locators/provenance into the apply plan; do not silently re-resolve different
sources. Verify cited inputs still exist and remain read-only outside the repo.
Local AGENTS/contributing rules stay authoritative; a conflict is `ask_user`
and blocks that recommendation pending a fresh analysis/user decision. Cite
sources without copying private contents.

Before the first approved write, initialize `OWNED_OUTPUT_FILES=()`. Append
each exact successfully created, modified or removed path at that write,
including both names of a rename and any generated navigation/index file this
step actually changes. Retain the complete list through verification and commit
retries; do not substitute a directory or staged-index diff.

For each approved recommendation:

1. Read only the affected docs files and the evidence sources cited by the artifact.
2. Make targeted edits that satisfy the approved fix.
3. Preserve existing prose and only change the necessary sections.
4. Honor the disclosure mode from the artifact:
   - `inline` -> keep the essential guidance in the target page
   - `link_only` -> add a concise pointer to the canonical doc/config/example
   - `omit` -> do not encode the item in the docs change
   - `ask_user` -> require explicit user confirmation before writing

#### Record an accepted IA

Only an approved `record-ia` recommendation authorizes persistence. Before any
PJM/decision write run `oat pjm doctor --json` in the target repo and inspect
`adoption.state`; absent/partial adoption routes to `oat pjm init` before the
record, never silently writes an unmanaged decision. Read the target's
`.oat/repo/AGENTS.md`, decision conventions and existing decision index; update
an existing matching record rather than duplicate it. Create a new record with
`oat decision new "Documentation information architecture" --status accepted
--context "<approved evidence>"` and its supported `--decision`/`--consequences` options
(check `--help`). The command owns index generation; never hand-edit the index.

Write a short `## Information architecture` section with tracks, organizing
principle per track, placement rules and verification overlay. For Fumadocs and
MkDocs put it in the docs-app `AGENTS.md`, preserving existing guidance. For
Markdown put it in the contributing page; create no docs-root `AGENTS.md`.
Link the decision and authored section reciprocally. They remain authoritative;
a conflict with config becomes `ask_user`, never a config-driven rewrite.

Mirror the accepted record using shared repo config only:
`oat config set documentation.ia '<JSON>'`, with exactly `{preset, decision,
tracks?: [{path, principle}], verification?: 'triad'|'agent-only'|'none'}`.
Write `preset` as the canonical ID (`product-engineering-qa`,
`consumer-maintainer`, `domain-engineering`, `task-type`, `toolkit-cli` or
`flat-small`) of the approved label.
`decision` is repo-relative; preserve guidance and unrelated config. For a
framework surface, separately record the operator's approved sidebar owner via
`oat config set documentation.navOwner nav-sync` or `hand-authored`. Missing
ownership stays undeclared and blocks automatic regeneration. Markdown ignores
navOwner and never runs nav sync. New-scaffold default ownership and preset
materialization are not implemented by this persistence step.

#### Restructure one approved block

`restructure` requires `approval: explicit` and one individual approval per
block before any move. Use the apply-plan block: source→destination map, source
and destination parent Contents edits, grep-derived inbound references (including
relative links, anchors and assets), exact rewrite list, and old-URL recovery.
Search the whole repo for each old path/basename with `rg`; resolve relative
references from their original file and check them again from their new location.
Keep links to moved headings working. Do not treat search hits in examples or
unrelated same-name files as automatic rewrites.

Choose recovery supported by the actual deployment: Next static export does
not support Next config redirects (see [Next static-export unsupported features](https://nextjs.org/docs/app/guides/static-exports#unsupported-features)).
Use an authored stub at the old route with a relative pointer, or an approved
archive pointer; a redirect requires verified framework/host support and stays
manual when it needs app/host config. Never edit `not-found.tsx` through this
carve-out. Retired pages retain a stub/archive pointer and a parent Contents
update, never a silent delete. Preserve stub routes in the approved reader map
where the framework needs them to build.

Apply one block as one exact-path implementation commit; do not combine it with
another block. Validate all rewritten inbound links and old URLs under the
actual base path. With `navOwner: nav-sync`, run nav sync then nav sync --check
with the explicit app target. With `hand-authored`, update approved hand-authored
navigation and compare membership/order against Contents read-only; never run a
writing nav sync. With undeclared ownership, report `ask_user` before navigation
writes. Markdown checks files/Contents/links only. Re-run `oat-docs-analyze`
after each block, preserving residual findings instead of claiming a clean run.

#### Individually approved tooling update

A `tooling-update` recommendation has `approval: explicit`. Even with individual
approval, its out-of-Markdown allowance is only these four operations:

1. Bump the docs app's existing `@open-agent-toolkit/docs-*` dependencies, and the
   app's own `@open-agent-toolkit/cli` dependency when the app declares it, to the
   bundled versions using the artifact's exact upgrade commands (preserve each
   dependency section and the package manager; include the resulting lockfile only).
   Run the pinned package-manager form the command gives; a global pnpm of another
   major can rewrite workspace settings and break the store link.
   Never downgrade an installed version: `ahead` or `unverified` requires CLI
   selection/update or manual verification before re-analysis, not a tooling update.
2. After a CLI bump, regenerate the app's generated manifest (`index.md`) with that
   upgraded app-local CLI, using the `oat docs generate-index` invocation from the
   app's existing `predev`/`prebuild` scripts; inspect the diff.
3. Run `oat docs migrate --docs-dir <authored-root> --apply` only for its currently
   supported admonition conversions and injected frontmatter; inspect the diff.
4. Run the docs build verifier from the app's existing scripts.

Scaffold changes the CLI cannot make (app config, routes, package scripts) are
`manual`: report the required change and ID without editing those files. This
allowance does not permit other application dependencies, framework upgrades,
host settings, arbitrary migrations or an app-shell rebuild. Other out-of-scope
prohibitions remain.

When approved actions involve docs app creation or nav updates:

- Use `oat docs init` for scaffolding when appropriate.
- Use `oat docs nav sync` instead of manually editing nav only when recorded `navOwner: nav-sync` authorizes it. In Fumadocs apps it writes strict `meta.json` files and reports pages no `## Contents` map lists (`unlisted` in `--json`); resolve a reported page through an approved `## Contents` change, never by hand-editing `meta.json`.

Negative rules:

- Do not invent docs structure rules, migration rules, or plugin guidance not backed by the artifact's cited evidence.
- Do not inline large setup/config details when the artifact says `link_only`.
- Do not create replacement link targets if the artifact omitted them; stop and ask for a fresh analysis or user guidance.
- If a cited source no longer exists, stop that recommendation and ask for a fresh analysis or user guidance.

### Step 5: Verify and Sync Navigation

For configured Markdown, check touched authored indexes/context, nonempty
title/description metadata, Contents reachability, sibling `.md` and child
`section/index.md` destinations, configured excludes and local instructions.
Keep existing context while applying only approved repairs. Run documented
existing file/link/lint/format checks; no install or site build is required.
Do not invoke default `generate-index` or site `nav sync`. Regenerate an optional
external manifest only when locally declared, with explicit output outside the
full configured content tree; keep the authored config index unchanged.

For framework apps, discover actual scripts and run the smallest relevant
verification set based on what changed; these examples apply only when present:

- `oat docs nav sync --target-dir <docs-app>` then `--check` only for `nav-sync` ownership; hand-authored/undeclared navigation gets read-only Contents membership/order comparison
- `pnpm --dir <docs-app> docs:lint` (no-op when no linter is configured)
- `pnpm --dir <docs-app> docs:format:check`
- `pnpm --dir <docs-app> docs:build`

If no docs app exists yet, use file-level verification and confirm the structural contract manually in the summary.

### Step 6: Commit and PR

Commit the approved changes (for restructure, repeat with one retained identity and exact path list per approved block; exclude already committed blocks from any final aggregate commit and skip an empty aggregate):

```bash
OWNED_COMMIT_PATHS=("${OWNED_OUTPUT_FILES[@]}")
oat internal commit-paths --identity "${COMMIT_IDENTITY:?set once and retain for retries}:oat-docs-apply:1" --message "docs: apply approved docs recommendations" -- "${OWNED_COMMIT_PATHS[@]}" || exit 1
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

Always emit this structured result, including no-op/unattended runs. Each input
recommendation ID appears in exactly one outcome; failed verification is a
failure, never an applied success. Unsupported scaffold work is skipped with
reason `manual` and its required change. Include individual approval evidence
in the plan, not invented in this result.

```json
{
  "analysisArtifact": ".oat/repo/analysis/docs-example.md",
  "approvedRecommendationIds": ["R-001"],
  "applied": ["R-001"],
  "skipped": [
    { "id": "R-002", "reason": "explicit_requires_interactive_approval" }
  ],
  "failed": []
}
```

Failed entries use `{ "id": "R-003", "reason": "<verification/error>" }`.
Report partial writes and stop on a failure; never continue by widening scope.

### Tracking and summary

Update shared tracking:

```bash
# Set SKILL_DIR to the absolute directory containing this loaded SKILL.md.
SCOPE_ROOT="$(cd "$SKILL_DIR/../../.." && pwd)"
TRACKING_SCRIPT="$SCOPE_ROOT/.oat/scripts/resolve-tracking.sh"
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
- Shared tracking helper: `$SCOPE_ROOT/.oat/scripts/resolve-tracking.sh`, where
  `SCOPE_ROOT` is derived from this loaded skill's directory.
