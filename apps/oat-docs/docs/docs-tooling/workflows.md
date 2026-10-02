---
title: Docs Workflows
description: 'Docs CLI helpers and skills for analysis and controlled documentation updates.'
---

# Docs Workflows

OAT’s docs workflow combines deterministic CLI helpers with higher-judgment
skills for analysis and controlled updates.

Install the workflow skills with `oat tools install docs` (preferred) or
`oat init tools docs` before using the analyze/apply flow in a new repo.

## Docs workflow pieces

### CLI helpers

- `oat docs init` bootstraps/adopts Markdown files or scaffolds a docs app (Fumadocs or MkDocs)
- `oat docs migrate` converts MkDocs admonitions to GFM callouts and injects frontmatter
- `oat docs generate-index` generates a Fumadocs app-root docs index manifest from the Markdown file tree
- `oat docs nav sync` regenerates MkDocs `mkdocs.yml` nav, or strict Fumadocs `meta.json` files, from `index.md` `## Contents` sections
- `oat docs analyze` and `oat docs apply` expose the workflow surface in CLI help

### Skills

- `authoring-docs` is the provider-agnostic baseline for evidence-first
  technical documentation: page types, information architecture, category
  guidance, templates, and review rubrics
- `oat-docs-authoring` layers the OAT Markdown/Fumadocs authored-source contract on top of
  `authoring-docs` for targeted authoring, restructuring, link repair, and
  local navigation maintenance inside an existing OAT documentation surface
- `oat-docs-bootstrap` is the guided onramp for Markdown setup/adoption or adding a docs app —
  wraps `oat docs init` with preflight detection, richer input gathering (site
  name distinct from package name), labeled post-patches for open CLI gaps,
  file-level verification for Markdown or framework build verification, config
  inspection, and an educational walkthrough
- `oat-docs-analyze` evaluates a docs surface for structure, drift, coverage,
  contributor guidance, and docs-app contract issues, then runs the shared
  auto artifact-review loop to verify the generated analysis artifact's
  evidence, severities, and recommendations (an analysis artifact is the
  timestamped Markdown findings report that analyze writes under
  `.oat/repo/analysis/` and that apply later reads)
- `oat-docs-apply` consumes the analysis artifact and applies only approved,
  evidence-backed recommendations
- `oat-project-document` performs post-implementation docs sync for a tracked project,
  including finding missing coverage for newly shipped capability areas and
  recommending new docs pages or directories when existing docs do not provide
  a natural home. See the [project lifecycle post-implementation flow](../workflows/projects/lifecycle.md#post-implementation-flow)
  for where this runs in the tracked project flow.

## Contract model

The docs workflow mirrors the
[agent-instructions analyze/apply split](agent-instructions.md):

- Analyze owns discovery, evidence gathering, confidence, and disclosure decisions
- Analyze also owns accuracy verification of the generated analysis artifact
  through the shared auto artifact-review loop before the apply workflow consumes
  it
- Apply consumes the artifact, asks for approval, and must not invent new docs conventions

This keeps deterministic behavior in the CLI and judgment-heavy behavior in the
skills.

## Typical flow

Diagram: bootstrap once, then analyze, approve and apply only agreed improvements.

```mermaid
flowchart TD
  SETUP["Bootstrap once\nConfirm inputs, then oat docs init"]
  MD["Markdown\nValidate files and config"]
  APP["Docs app\nInstall and verify build"]
  AN["Analyze\nRead docs, write findings"]
  PLAN["Plan from findings\nNo docs writes yet"]
  Q{"Approve changes?"}
  APPLY["Apply approved items\nNew branch, verify, offer PR"]
  STOP["Skip all\nNo docs changed"]
  SETUP --> MD
  SETUP --> APP
  MD -.-> AN
  APP -.-> AN
  AN --> PLAN
  PLAN --> Q
  Q -->|"approved"| APPLY
  Q -->|"all skipped"| STOP
```

- **Setup, once.** `oat-docs-bootstrap` checks the repo without writing, asks
  you to confirm its inputs, then runs `oat docs init`. Plain Markdown setup validates authored files,
  configuration and guidance without installing app dependencies or building a
  site. Fumadocs and MkDocs setup adds the relevant post-patches, installation,
  build verification and walkthrough.
- **Analyze.** `oat-docs-analyze` never edits docs. It writes an analysis
  artifact under `.oat/repo/analysis/` (and updates OAT tracking).
- **Approve.** `oat-docs-apply` builds a plan from the newest artifact and
  stops for your decision: apply all, review item by item, or discuss and
  revise. If the artifact is missing or stale it sends you back to analyze. If
  you skip every item, nothing changes.
- **Apply.** Only after approval does apply create a branch, edit the approved
  docs, regenerate navigation, verify, commit and offer a pull request. Items
  marked as needing confirmation are confirmed again before they are written.
- **Repeat.** Re-run analyze afterwards to confirm the result.

1. Bootstrap or explicitly adopt a documentation surface with `oat-docs-bootstrap` (preferred — guided, includes post-scaffold patches and walkthrough) or `oat docs init` directly (CLI-only / non-interactive workflows)
2. (Optional) If migrating from MkDocs, handle that as a separate migration workstream; `oat docs migrate --docs-dir docs --config mkdocs.yml --apply` is only the syntax/frontmatter helper
3. Use `oat-docs-authoring` for targeted OAT Markdown/Fumadocs authoring work, with `authoring-docs` as the universal documentation-quality baseline
4. Keep authored context and title/description metadata, with an `index.md` and useful `## Contents` in each non-excluded Markdown-bearing directory; preserve asset-only exceptions and local instructions
5. Keep local `## Contents` sections current
6. Verify files/links and refresh declared derived artifacts:
   - **Markdown:** use the configured root literally, including nested `docs`; authored indexes are editable. No app install/site build/nav sync is required. Optional manifests need explicit external output and never replace the authored config index.
   - **MkDocs:** `oat docs nav sync`
   - **Fumadocs:** `oat docs nav sync` for the committed `meta.json` sidebar files (it reports pages no `## Contents` map lists), and `oat docs generate-index` for the root manifest (runs automatically via `predev`/`prebuild` hooks)
7. Run `oat-docs-analyze`; by default it verifies the generated analysis artifact
   through `workflow.autoArtifactReview.analysis`
8. Review the artifact and run `oat-docs-apply`

## Existing Markdown and partial setup

Bootstrap checks declared config before discovery and framework evidence before
plain-tree candidates. A populated plain tree is offered adopt/audit; `--yes`
alone does not authorize adoption. `--adopt` preserves existing bytes and adds
missing baseline files only. Config/guidance success does not prove complete
content conformity: analyze recommends missing context, metadata, Contents or
child indexes, and apply performs only approved repairs without replacing useful
context or local instructions.

Use `--dry-run` for a nonmutating Markdown preview. Guidance conflicts may yield
`partial`/exit `1`, with planned files/config; a real partial reports any already
created files/config separately. Repeated converged adoption returns no changes.
See [Commands](commands.md#oat-docs-init) for examples and exit behavior.

## Progressive disclosure

The docs workflow expects local indexes to guide discovery without forcing agents
to open every page.

- keep local topic summaries in `index.md`
- link to deeper setup/config/reference material when full detail is not needed inline
- let the analysis artifact decide what should be inline, link-only, omitted, or escalated to the user

## authoring-docs

**Invocation:** Ask, “Use authoring-docs to improve the recovery instructions
in `docs/imports.md` for an on-call engineer.” Skill invocations are agent
instructions, not shell commands: use `/authoring-docs` where supported,
`$authoring-docs` in Codex, or the skill's name in a request. This convention
also applies to the other skills below; example paths refer to your files.

**Prerequisites:** A documentation target, intended reader, and accessible
sources of truth. No OAT project or OAT documentation configuration is
required. Source code, configuration, tests, deployment files, and existing
instructions establish what you can safely document.

**Example scenario:** An import runbook says to retry a job but does not
explain how an operator confirms that retrying is safe. Ask the skill to
inspect the actual job behavior and add a reader-focused recovery sequence,
marking any operational assumption that needs the owner's confirmation.

Choose the page's primary job before writing: a tutorial gets a reader to
first success, a how-to completes a task, reference provides exact contracts,
explanation builds understanding, and a runbook supports safe recovery. This
avoids mixing an introductory story, an exhaustive flag list, and an
incident procedure into one undifferentiated page. Preserve useful existing
intent and improve the nearest appropriate page instead of creating a
parallel documentation surface.

**Expected output:** Evidence-backed Markdown with clear prerequisites,
steps, expected results, verification, and relevant links. Risky operations
need recovery or rollback guidance when the sources establish it. Unknown
ownership, commands, endpoints, or compatibility guarantees remain explicit
questions rather than invented facts. The handoff identifies changed files,
sources inspected, checks run, and remaining uncertainty.

**What it does without asking:** It edits the documentation files your
request covers and can run the repository's documented docs checks. Its
workflow has no commit, push, or pull-request step.

**Next step:** Run the target repository's documented checks and resolve
owner-review gaps before sharing. Use [oat-docs-authoring](#oat-docs-authoring)
when the target also needs OAT placement and navigation conventions.

## oat-docs

**Invocation:** `/oat-docs "How do I choose between a quick and lite project?"`.
If you provide no question, the skill asks what you want to understand.

**Prerequisites:** Installed bundled OAT documentation under `~/.oat/docs/`
(install it with `oat init tools core`). No active project is required. If that documentation is missing, the skill
stops with installation guidance rather than substituting a repository
checkout that may describe a different release.

**Example scenario:** You are about to plan a small maintenance change and
want to understand the artifacts and approval boundary of each workflow.
Ask the skill to explain the choices from the installed documentation before
starting a project or changing configuration.

**Expected output:** A documentation-backed answer with practical examples
and pointers to relevant bundled pages. The skill searches and reads the
actual documentation rather than answering only from remembered behavior.
It can offer a related setup action or skill, but does not execute that offer
without confirmation.

**What it does without asking:** Nothing beyond reading. It is a read-only
question-and-answer skill: it creates or changes no files and runs no
commands that change state.

**Next step:** Choose the workflow or command that matches your task. If the
answer suggests setup changes, confirm the exact action separately from the
question-and-answer conversation.

## oat-docs-authoring

**Invocation:** Ask, “Use oat-docs-authoring to add a retry troubleshooting
section to the existing imports guide and update its local map if needed.”
The skill can also be invoked as `/oat-docs-authoring` with your task.

**Prerequisites:** An existing OAT Markdown surface, OAT/Fumadocs app, or
clearly identified target following OAT conventions, plus the installed
`authoring-docs` baseline. No active OAT project is required. This is
a targeted authoring or repair workflow, not bootstrap, a broad audit, or
bulk application of an analysis report.

**Example scenario:** One documented import error has a new recovery path.
Update that guide from the actual implementation and tests without
reorganizing unrelated sections or hand-editing generated sidebar files.

The wrapper adds OAT-specific placement and navigation rules to universal
authoring standards. Edit authored pages and relevant local `index.md`
Contents maps together, preserve useful context and local instructions, and
prefer `.md` unless the page needs JSX. For configured Markdown, use the
literal content root and authored index, even if it contains a nested
directory named `docs`; do not create an unnecessary app shell.

**Expected output:** Focused authored-source changes, checked links and
metadata, and any locally required generated-artifact refresh or freshness
check. The handoff distinguishes checks actually run from checks unavailable
or intentionally not applicable. Project-derived release documentation
belongs in the project-document workflow, not this wrapper.

**What it does without asking:** It edits the authored pages your task
covers together with the nearest local `index.md` Contents map. When
navigation changes, it regenerates or freshness-checks derived navigation
files with the docs app's own scripts, and it runs local validation
commands when they exist. Its workflow has no commit, push, or
pull-request step.

**Next step:** Review and validate the focused diff. For broader uncertainty
about the surface, use [oat-docs-analyze](#oat-docs-analyze); for a new surface,
use [oat-docs-bootstrap](#oat-docs-bootstrap).

## oat-docs-bootstrap

**Invocation:** `/oat-docs-bootstrap`, optionally with a target directory.
The conversation chooses Markdown, Fumadocs, or MkDocs and confirms the
destination before scaffolding or adoption. You do not need to remember the
framework later: `oat docs nav sync` has no framework flag and detects MkDocs
or Fumadocs on its own.

**Prerequisites:** An initialized OAT repository with readable
`.oat/config.json`, `.agents/`, and a runnable OAT CLI. An active project is
optional: it may provide context for the walkthrough, but setup does not
require one. The installed CLI must support the selected setup path.

**Example scenario:** Your repository already has useful Markdown guides in
`documentation/`, and the team wants OAT discovery and authoring guidance
without a site runtime. Choose additive Markdown adoption, retain those
guides, and then audit their metadata and local maps. Do not replace the tree
with a docs app simply because one can be scaffolded.

Preflight only reads. It checks declared documentation configuration before
discovery and checks framework evidence before assuming a populated
directory is plain Markdown. The skill then summarizes your choices and asks
you to confirm them before it runs `oat docs init`. The two setup paths
differ from that point on.

**Plain Markdown path:** Use this when you want plain Markdown files and no
site runtime. The skill collects a title, a dedicated repository-relative
root, and an optional description. It asks no app or package questions and
never installs dependencies, patches packages, starts a preview server, or
builds a site. An existing plain tree needs an explicit choice: adopt and
audit, audit only, or abort. A non-interactive `--yes` alone is not
permission to adopt. Adoption keeps existing files byte for byte and adds
only missing baseline files; a fresh setup creates an authored `index.md`
and `contributing.md` in the root you chose. Missing content conformity
becomes audit work rather than silent repair. Verification checks files,
configuration, and links.

**Fumadocs or MkDocs path:** Use this when you want a built documentation
site. The skill gathers app inputs (the visible site title and the package
name are different inputs), probes which capabilities the installed CLI
supports, runs the scaffold, and applies only the relevant post-patches (the
skill's labeled fixes for known gaps in the CLI's scaffold output).
Verification installs dependencies and runs a build. If a docs app already
exists, you choose how to resolve the conflict, and one of the choices,
`replace`, deletes the existing app.

**What it does without asking:** After you confirm your inputs, bootstrap
runs `oat docs init`, which writes the `documentation` section of
`.oat/config.json` and adds or updates a managed `## Documentation` section
in the root `AGENTS.md`. This happens on both paths. On the Fumadocs or
MkDocs path it also scaffolds the app, applies post-patches, installs
dependencies, runs a build, and may patch the root `package.json` so the
default build leaves the docs app out. It may also write an `AGENTS.md`
inside the new app when the CLI did not create one. Only after you confirm:
the `replace` choice deletes the existing docs app directory and clears its
`documentation` config and root `AGENTS.md` section (it refuses only when
that directory has uncommitted changes); answering yes to the
project-completion prompt writes `documentation.requireForProjectCompletion`
to `.oat/config.json`; and accepting the optional content kickoff at the end
runs analyze and then apply, which creates a branch and a commit and can
open a pull request.

**Expected output:** A verified fresh setup or additive adoption, followed
by a walkthrough of actual configuration, authored indexes, page metadata,
and contribution conventions. Markdown keeps its configured index authored;
an optional generated inventory needs an explicit destination outside the
configured content tree and never replaces it. A dry-run is only a preview.
A partial result can have created files while still requiring manual
guidance work; report that state rather than claiming complete bootstrap.
Optional completion enforcement is an explicit choice, not a hidden side
effect of initialization.

**Next step:** Bootstrap ends by offering
[oat-docs-analyze](#oat-docs-analyze) against the configured root, followed
by [oat-docs-apply](#oat-docs-apply) for repairs you approve. An adopted tree
needs this audit. Use `oat-project-document` for updates derived from an OAT
project. For later one-off pages, use
[oat-docs-authoring](#oat-docs-authoring).

## oat-docs-analyze

**Invocation:** `/oat-docs-analyze` (no arguments). The skill resolves the
docs surface itself: the configured `documentation.root` and `tooling` in
`.oat/config.json` first, then framework evidence, then a generic `docs/`
tree or root Markdown files. It does not rely on a guessed root when the
repository already declares one.

**Prerequisites:** A Git repository with a docs app, Markdown tree, or
root-level documentation, and `jq` for tracking updates. No active project
is required. Configured Markdown does not need an app package, generated
manifest, or docs-root agent file to qualify for analysis.

**Example scenario:** A team adopted an existing Markdown tree, but users
still cannot find several supported CLI operations. Analyze the literal
configured root against command definitions, examples, and local maps so
the report identifies which capability needs which page or section, rather
than prescribing a new framework as the fix.

The skill inventories content, checks index-contract coverage, verifies
substantive claims against repository sources, finds missing or thin
capability coverage, and checks navigation and drift. A usable finding names
the evidence, severity, proposed location, and concrete subtopics. Ownership
or operational claims that local sources cannot establish become
owner-review gaps, not confident invented instructions.

Existing tracking selects full or delta analysis when its recorded commit
is valid. The workflow is read-only toward docs and navigation; it writes
and may correct its own report, then updates analysis tracking. Generated
navigation is freshness-checked, not repaired during the audit.

**Expected output:** A timestamped `.oat/repo/analysis/docs-*.md` report with
evidence, confidence, and disclosure decisions, including concrete targets
for link-only recommendations. By default, a bounded auto artifact-review
loop checks the report before tracking and handoff. A disabled loop or
residual findings must remain disclosed; a report's existence alone does
not mean every recommendation is verified or approved.

**What it does without asking:** It writes the analysis artifact
`.oat/repo/analysis/docs-<timestamp>.md`, lets its review loop correct that
report, and then updates its tracking record in `.oat/tracking.json` (used
to choose a full or delta analysis next time). It does not edit
documentation pages, navigation files, or `mkdocs.yml`, and it creates no
branch or commit.

**Next step:** Review the findings and run [oat-docs-apply](#oat-docs-apply)
for selected recommendations. If evidence or target information is missing,
repair the analysis contract rather than asking apply to fill it in.

## oat-docs-apply

**Invocation:** `/oat-docs-apply` after reviewing a docs analysis report.
The skill loads the newest `.oat/repo/analysis/docs-*.md` report. You cannot
select an older one, so rerun analysis if the newest report is not the one
you reviewed. It then builds a recommendation plan and asks you to choose
`apply all`, `apply interactively` (approve, modify, or skip each item), or
`discuss` before changing anything.

**Prerequisites:** A recent, complete docs analysis artifact and an unchanged
compatible target. Recommendations need evidence, confidence, disclosure,
and concrete link targets where applicable. Apply also needs `jq` for
tracking updates, and `gh` only if you want it to open the pull request. No
active OAT project is required. Missing analysis or a changed target requires a fresh analysis,
not conventions invented during apply.

**Example scenario:** The audit found three CLI pages missing from their
`## Contents` maps, an inaccurate
example, and a proposed reorganization. Approve only the page listings and
example correction, leaving the reorganization for discussion. Apply should
execute those selected actions without broadening the work to every finding.

**Expected output:** Approved changes committed on a new
`oat/docs-<timestamp>` branch, relevant source/link checks, and declared
navigation or generated-artifact refreshes. Markdown retains its authored
index and needs no framework build or nav sync; Fumadocs sidebar metadata is
regenerated from approved Contents changes, never hand-edited. The summary
reports the applied plan and checks.

**What it does without asking:** Nothing changes until you approve the plan.
After you approve it, apply continues without asking again. It creates
branch `oat/docs-<timestamp>` from your current HEAD and edits only the
approved files. Items whose disclosure is `ask_user` are confirmed with you
once more before they are written. For a Fumadocs or MkDocs app it runs
the verification that fits what changed, such as `oat docs nav sync` and
the app's existing docs lint, format-check, and build scripts. It then
commits the changes as `docs: apply approved docs recommendations`. If the
branch cannot be created (for example because of local changes), it stops
and asks you to resolve that first. After committing, it asks whether to
push the branch and open a pull request; only a yes pushes. The PR targets
`main`, and its body includes the applied plan and the full analysis
report, so check the report for anything you would not publish. Finally it
updates `.oat/tracking.json`.

**Next step:** Review the committed diff before you agree to push or open a
pull request. Rerun analysis if you need a post-apply assessment, and treat
unapproved recommendations as remaining decisions rather than completed
work.

## Related docs

- [`commands.md`](commands.md)
- [`add-docs-to-a-repo.md`](add-docs-to-a-repo.md)
- [Improve Agent Instructions](agent-instructions.md)
- [`../reference/docs-index-contract.md`](../reference/docs-index-contract.md)
- [`../contributing/skills.md`](../contributing/skills.md)
