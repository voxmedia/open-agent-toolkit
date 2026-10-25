---
id: BL-261025-close-docs-skill-workflow-gaps
title: Close docs skill workflow gaps found in the consumer rollout
status: open
priority: high
scope: feature
scope_estimate: L
labels:
  - docs
  - consumer-rollout
assignee: null
created: 2026-10-25T13:57:30.342Z
updated: 2026-10-25T13:57:30.342Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/367
external_plans: []
---

## Description

The docs skills and commands consumers follow (oat-docs-bootstrap,
oat-docs-analyze, oat-docs-apply and Markdown `oat docs init --adopt`) leave
adopters with missing upgrade paths, incomplete CI, silent failures and manual
follow-up work. This item consolidates eight follow-ups filed on 2026-10-25 from
the OAT docs tooling 0.3.31 pilot and 0.3.32 read-only conformance runs on
consumer repositories, as follow-ups to
[BL-261024-roll-out-the-shipped-oat-docs — Roll out the shipped OAT docs front door and approval policy to consumer repositories](BL-261024-roll-out-the-shipped-oat-docs.md)
and issue #367. The archived source records keep their original wording:

- [BL-261025-add-an-adoption-path-for-pre-0 — Add an adoption path for pre-0.3.31 Fumadocs apps whose guidance assumes nav sync](../archived/BL-261025-add-an-adoption-path-for-pre-0.md) (**high**, M)
- [BL-261025-close-gaps-in-the-oat-docs — Close gaps in the oat-docs-bootstrap PR CI recipe](../archived/BL-261025-close-gaps-in-the-oat-docs.md) (medium, S)
- [BL-261025-flag-the-source-config-change — Flag the source-config change nonReaderPaths needs to stop rendering](../archived/BL-261025-flag-the-source-config-change.md) (medium, S)
- [BL-261025-keep-oat-docs-analyze-tracking — Keep oat-docs-analyze tracking from dirtying consumer repositories and failing silently](../archived/BL-261025-keep-oat-docs-analyze-tracking.md) (medium, S)
- [BL-261025-let-oat-docs-analyze-propose — Let oat-docs-analyze propose candidate IA structures when no IA is recorded](../archived/BL-261025-let-oat-docs-analyze-propose.md) (medium, M)
- [BL-261025-make-markdown-oat-docs-init — Make Markdown oat docs init --adopt formatter-stable and complete](../archived/BL-261025-make-markdown-oat-docs-init.md) (medium, M)
- [BL-261025-align-oat-docs-apply — Align oat docs apply with the analyze next-step message](../archived/BL-261025-align-oat-docs-apply.md) (low, XS)
- [BL-261025-cite-decision-records-as-code — Cite decision records as code text on Markdown reader pages in oat-docs-apply](../archived/BL-261025-cite-decision-records-as-code.md) (low, XS)

### Pre-0.3.31 nav-sync adoption (high)

0.3.31 treats an unset `documentation.navOwner` as undeclared and offers no
migration prompt, even when the app's AGENTS guidance (scaffolded before
0.3.31) says `meta.json` comes from nav sync and `oat docs nav sync --check`
proves the committed `meta.json` files are generated. Such apps lose automatic
regeneration expectations until someone hand-records `navOwner`. Provide an
evidence-backed adoption path (for example analyze or bootstrap proposing
`navOwner: nav-sync`, with approval) without changing undeclared semantics for
apps that lack that evidence.

### oat-docs-bootstrap PR CI recipe

The `references/pr-ci.md` recipe leaves consumer CI incomplete.

- It has no `oat docs nav sync --check` step and relies on a prebuild that only
  fresh-template apps have.
- "Preserve existing triggers" does not address PR workflows whose
  `paths-ignore` skips `**/*.md`, where a docs job never runs on docs-only PRs.
- The manifest freshness step runs a bare `oat` from PATH rather than the
  app-local generate script, giving a false diff when the PATH CLI differs from
  the app's pinned CLI or when the app post-processes the manifest.
- Markdown-only repositories with no existing CLI provision get no guidance on
  choosing a pinned devDependency versus `dlx`.

### oat-docs-analyze gaps

- `documentation.nonReaderPaths` stops Fumadocs from rendering excluded pages
  only when the app's `source.config.ts` passes OAT's config to
  `createSourceConfig()` (`oatConfigFile`/`appRoot`). Older apps lack that, and
  oat-docs-apply treats the source-config change as manual, but neither
  `oat docs check` nor oat-docs-analyze notices that it is missing, so excluded
  pages keep rendering (and, without `meta.json`, appear in the sidebar).
- oat-docs-analyze writes `.oat/tracking.json` at the end of a run. In a
  consumer repository that file can be untracked but not ignored, so a run
  documented as read-only leaves the working tree dirty. The tracking read is
  also wrapped in `2>/dev/null || true`, so a missing user-scope
  `resolve-tracking.sh` silently forces full mode instead of reporting why delta
  mode was unavailable.
- Without `--ia`, oat-docs-analyze must ask the operator to choose an IA when
  none is recorded, but that run cannot show the candidate structures
  (two-level trees, placements, nearest presets) the choice depends on. The
  operator has to rerun with `--ia` to see them, effectively forcing a second
  analysis run.

### Markdown `oat docs init --framework markdown --adopt`

- The managed `<!-- OAT docs -->` AGENTS block is not stable under oxfmt: the
  formatter inserts a blank line after the marker, and a rerun of init then
  reports `manual-required` and demands the unformatted bytes, so init and the
  formatter loop.
- The contributing page renders `{{REPO_NAME}}` from `basename(repoRoot)`
  (`packages/cli/src/commands/docs/init/markdown.ts`), which is the worktree or
  temporary directory name, not the repository name.
- Adoption creates `contributing.md` but leaves it unlinked from the root
  Contents map, and no checker rule notices an orphan page.
- `--json` output reports `appName` for Markdown, although help and the
  bootstrap skill say app name does not apply; a dry run that plans 0 files
  still prints "Docs scaffold planned".

### oat-docs-apply handoff

- `oat docs analyze` prints "Next: run oat docs apply after reviewing findings."
  (`packages/cli/src/commands/docs/analyze.ts`), but `oat docs apply`
  (`apply.ts`) only prints a pointer to the oat-docs-apply skill, so the
  suggested next step does nothing.
- oat-docs-apply's IA-record step tells agents to link the decision record and
  the contributing/AGENTS IA section both ways. With Markdown tooling the
  contributing page is a reader page, so a link into `.oat/` triggers
  link-escape and provenance warnings from `oat docs check`.

## Acceptance Criteria

**[high]** marks criteria from the one high-priority source; every other group
names its source priority.

Pre-0.3.31 nav-sync adoption (**high**):

- [ ] **[high]** For a Fumadocs app with undeclared `documentation.navOwner`, analyze or bootstrap detects evidence that navigation is generated (guidance that says so and a passing `oat docs nav sync --check`) and proposes recording `navOwner: nav-sync` as an explicit-approval recommendation.
- [ ] **[high]** Undeclared semantics stay unchanged for apps without that evidence; nothing regenerates navigation without approval.
- [ ] **[high]** Docs describe the upgrade path for apps scaffolded before 0.3.31.

PR CI recipe (medium):

- [ ] The recipe includes a nav-sync check step for `navOwner: nav-sync` apps (and the membership check for hand-authored).
- [ ] It tells adopters to add or adjust a trigger that fires on docs-only PRs.
- [ ] Freshness uses the app's own generate script when one exists.
- [ ] Markdown repositories get a concrete CLI provisioning recommendation.

Source-config wiring for `nonReaderPaths` (medium):

- [ ] oat-docs-analyze reports the missing source-config wiring as a `manual` recommendation when `nonReaderPaths` is set, and the docs explain the dependency.

Analyze tracking (medium):

- [ ] An analyze run in a repository where `.oat/tracking.json` is not ignored either leaves the working tree unchanged or reports the tracking write it made and how to ignore or commit it.
- [ ] A missing or failing tracking helper is reported in the analysis summary with the reason full mode was used, instead of being suppressed.
- [ ] Existing delta-mode behavior is unchanged when tracking is available.

Analyze IA candidates (medium):

- [ ] When no IA is recorded, a single analyze run presents the candidate structures (two two-level trees with representative placements and nearest presets) alongside the `ask_user` choice, or clearly offers the `--ia` path in the same session.
- [ ] The IA choice remains operator-approved; analyze still records nothing itself.

Markdown init adoption (medium):

- [ ] Init writes managed blocks in the formatter's canonical shape (or compares them formatter-insensitively), so init, oxfmt and a rerun converge.
- [ ] The repository name comes from package metadata or the Git remote, falling back to the directory name only when neither exists.
- [ ] Adoption links `contributing.md` from the root Contents map (or reports that it must), and the JSON omits `appName` for Markdown.
- [ ] Tests cover adoption followed by formatting and a rerun.

Analyze next-step message (low):

- [ ] The analyze message points at the oat-docs-apply skill (or the apply command does something useful), and the docs say which.

Decision-record citations on Markdown reader pages (low):

- [ ] oat-docs-apply says to cite the decision path as code text, not a link, on Markdown reader pages (or the checker exempts that one link shape), and its skill contract test pins the wording.
