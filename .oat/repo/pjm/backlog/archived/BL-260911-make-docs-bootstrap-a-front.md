---
id: BL-260911-make-docs-bootstrap-a-front
title: Make docs bootstrap a front door for existing docs and support the
  docs-directory convention
status: closed
priority: high
scope: feature
scope_estimate: M
labels:
  - docs
  - skills
  - bootstrap
  - analyze
assignee: null
created: 2026-09-11T01:18:44.450Z
updated: '2026-10-24T19:01:58Z'
associated_issues: []
external_plans: []
---

## Description

Three related gaps in the docs pack, observed 2026-09-10 across ~/code/personal-skills and ~/code/vox/pntr (both keep OAT-convention docs in a plain docs/ directory with no docs app; pntr also hosts the oat-docs-update automation). (1) oat-docs-bootstrap only scaffolds a docs app; when it detects an existing docs setup it treats that as a conflict and offers replace / second-app / abort / repair, with the audit path (repair -> oat-docs-analyze) buried as the fourth option. (2) The plain docs/-directory convention has no first-class bootstrap shape even though oat-docs-analyze and oat-docs-apply already resolve a root docs/ as a fallback; pntr has no documentation section in .oat/config.json at all and works only because of that fallback. (3) Nothing reports drift between a bootstrapped app's @open-agent-toolkit/docs-\* package versions and the CLI's lockstep version (computable offline from packages/cli/assets/public-package-versions.json), and nothing audits index/content-section misuse as a maintenance pass after the initial bootstrap.

Clarified 2026-09-30: plain Markdown must be an explicit bootstrap choice and use `documentation.tooling: "markdown"` in `.oat/config.json`. The config reader currently accepts arbitrary nonblank tooling strings, so storing the value is already possible; this item makes Markdown a documented, supported docs mode across bootstrap and its consumers.

## Acceptance Criteria

- Bootstrap's first step detects an existing bootstrapped docs surface (app or plain `docs/` directory, `documentation` config, AGENTS.md section) and offers the audit (`oat-docs-analyze` then `oat-docs-apply`) as the primary path; replace and second-app stay behind an explicit choice.
- Plain Markdown (`docs-directory` shape) is an explicit first-class bootstrap choice alongside Fumadocs and MkDocs: no app; writes `documentation.tooling: "markdown"`, `documentation.root` (default `docs`), and `index` where used to `.oat/config.json`, scaffolds the `index.md` contract and the AGENTS.md documentation section, and never requires a docs app package. Verified against `~/code/personal-skills` (has `documentation.root: docs`) and `~/code/vox/pntr` (no `documentation` config today; bootstrap repairs it).
- The documentation config contract documents and supports `tooling: "markdown"`; config read/write/resolution preserves it, and docs detection, analyze/apply, and index generation recognize the configured Markdown surface without requiring framework config, site navigation tooling, or a site build. Existing plain `docs/` fallback behavior remains supported.
- Markdown mode follows all applicable OAT docs best practices: every Markdown-bearing content directory has an authored `index.md` with useful overview/context and a populated `## Contents` map of sibling pages and immediate child directories; parent maps link child `index.md` files using relative Markdown paths. Pages retain the applicable title/description metadata and authoring conventions, and bootstrap supplies agent/contributor guidance identifying the docs root, structure, context entrypoints, and analyze/apply workflow. Generated indexes remain distinct from authored context and are refreshed through their owning command. Existing content, local audience/ownership guidance, and asset-only directory exceptions are preserved. Analyze/apply evaluate the same applicable structural, navigation, content-quality, and context requirements in Markdown mode.
- The existing-docs front door hands off to `oat-docs-analyze` then `oat-docs-apply` for both content and tooling; bootstrap owns only the docs-directory config and index repair. Analyze tags every recommendation with an approval class (`explicit` for the docs package update and anything else outside the markdown scope; default otherwise). Apply never treats `explicit` recommendations as covered by blanket approval: interactively they are applied only when the person approves them in the approval step, and in unattended mode they are skipped and reported in the structured result. Apply's contract gains the matching scoped carve-out: an explicitly approved tooling update may bump the docs app's `@open-agent-toolkit/docs-*` dependencies, run `oat docs migrate` where a template shape changed, and run the build verifier, and nothing else outside the documentation scope. The pntr `oat-docs-update` prompt config (`scripts/github-actions/oat-docs-update/config.mjs`, "treat this workflow configuration as approval to apply all recommendations") is amended to exclude explicit-approval items so the config and the skill agree; its `docs/` + `.oat/` path gate stays as the backstop.
- `oat-docs-analyze` reports docs package version drift (the app's `@open-agent-toolkit/docs-*` versions versus the CLI's lockstep version, read from the bundled `public-package-versions.json`, no network) as an `explicit`-approval recommendation with the upgrade command. Under automation it is skipped and reported, never applied: the automation boundary is fixed by the pntr `oat-docs-update` workflow, whose prompt confines the agent to `docs/` and `.oat/` (`scripts/github-actions/oat-docs-update/config.mjs` `targetPaths`) and whose path gate keeps it out of build config, and by apply's own rule of no changes outside the documentation scope except nav sync and tracking. A package bump under `apps/<docs-app>/` would fail that gate.
- Index and content-section misuse (the `index.md` contract, section headings, nav drift) is covered by the existing analyze steps; this item adds no second audit surface and no `oat docs doctor` command.
- Docs pages for bootstrap and analyze describe the front-door behavior and the docs-directory shape.

Related: BL-260911-support-per-tool-scope (per-tool scope migration, lower priority).

## Partial Markdown Slice

The [markdown-docs-bootstrap project](../../../../projects/shared/markdown-docs-bootstrap/implementation.md) implements the plain Markdown mode/config, additive bootstrap/adoption, authored-index protection, and corresponding docs consumers. Integrated command/file acceptance and release-valid bundles are recorded there. All fourteen tasks and current independent final review passed, including the remote feedback and optional-directory preservation fixes. Configured closeout outputs are complete; the retained exit gate passed with all dispositions settled. Final HiLL approval remains pending. Five public packages are prepared at `0.3.11`; no publication, GitHub PR merge or external-repository acceptance is claimed.

This is a partial slice. This item remains **open**: package drift, explicit-approval policy, pntr automation changes and acceptance in the named external repositories remain outside that project and are not claimed complete.

## OAT delivery and external-criteria transfer — 2026-10-24

This dated note supersedes the open-work statement in the historical Partial
Markdown Slice above without changing its original text, criteria, observations,
metadata or previous project pointer. The shipped OAT capability slice is complete:
AC1/3/4/7/8 and the OAT portions of AC2/5/6 are supported by
[issue #367](https://github.com/voxmedia/open-agent-toolkit/issues/367), the
[docs-skills-ia-367 brief](https://github.com/voxmedia/open-agent-toolkit/blob/a65959999f17c5c77b4659946f48251098061fed/.oat/projects/shared/docs-skills-ia-367/plan.md),
[accepted phase records](https://github.com/voxmedia/open-agent-toolkit/blob/a65959999f17c5c77b4659946f48251098061fed/.oat/projects/shared/docs-skills-ia-367/implementation.md)
and [delivery checklist](https://github.com/voxmedia/open-agent-toolkit/blob/a65959999f17c5c77b4659946f48251098061fed/.oat/projects/shared/docs-skills-ia-367/references/issue-367-delivery-checklist.md).
[PR #369](https://github.com/voxmedia/open-agent-toolkit/pull/369) delivers the
existing-docs front door/guidance; [PR #371](https://github.com/voxmedia/open-agent-toolkit/pull/371)
delivers IA recording, approval-class handoff and offline package drift. Prior
Markdown delivery remains recorded above. P09-t01 closes the E13 residual with
five narrow read-only shim grants and analyze 1.7.5.

Every outstanding external portion of AC2, AC5 and AC6 is durably transferred to
[BL-261024-roll-out-the-shipped-oat-docs — Roll out the shipped OAT docs front door and approval policy to consumer repositories](../items/BL-261024-roll-out-the-shipped-oat-docs.md)
(path `.oat/repo/pjm/backlog/items/BL-261024-roll-out-the-shipped-oat-docs.md`). Its eight unchecked criteria retain
named Markdown adoption/config/content acceptance, pntr's explicit-approval
exclusion and docs/.oat path gate, real default/explicit automation controls,
offline framework drift and individually approved supported-upgrade evidence,
and actual consumer delivery records. Framework consumer selection is left to
the future rollout owner. Source paths are historical observations only.

Closure is transfer-qualified: OAT capability delivered, external work preserved
and still open in the successor, not consumer acceptance. No external repository
read/change/run, framework target selection, package publication or consumer
commit/PR is claimed. The source's historical migration wording is bounded by
the shipped admonition/frontmatter helper; unsupported scaffold work stays manual.
