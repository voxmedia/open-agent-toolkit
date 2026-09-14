---
id: BL-260911-make-docs-bootstrap-a-front
title: Make docs bootstrap a front door for existing docs and support the
  docs-directory convention
status: open
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
updated: 2026-09-11T01:18:44.450Z
associated_issues: []
external_plans: []
---

## Description

Three related gaps in the docs pack, observed 2026-09-10 across ~/code/personal-skills and ~/code/vox/pntr (both keep OAT-convention docs in a plain docs/ directory with no docs app; pntr also hosts the oat-docs-update automation). (1) oat-docs-bootstrap only scaffolds a docs app; when it detects an existing docs setup it treats that as a conflict and offers replace / second-app / abort / repair, with the audit path (repair -> oat-docs-analyze) buried as the fourth option. (2) The plain docs/-directory convention has no first-class bootstrap shape even though oat-docs-analyze and oat-docs-apply already resolve a root docs/ as a fallback; pntr has no documentation section in .oat/config.json at all and works only because of that fallback. (3) Nothing reports drift between a bootstrapped app's @open-agent-toolkit/docs-\* package versions and the CLI's lockstep version (computable offline from packages/cli/assets/public-package-versions.json), and nothing audits index/content-section misuse as a maintenance pass after the initial bootstrap.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}

## Acceptance Criteria

- Bootstrap's first step detects an existing bootstrapped docs surface (app or plain `docs/` directory, `documentation` config, AGENTS.md section) and offers the audit (`oat-docs-analyze` then `oat-docs-apply`) as the primary path; replace and second-app stay behind an explicit choice.
- A `docs-directory` shape is a first-class bootstrap option: no app; writes `documentation.root` (and `index` where used) to `.oat/config.json`, scaffolds the `index.md` contract and the AGENTS.md documentation section, and never requires a docs app package. Verified against `~/code/personal-skills` (has `documentation.root: docs`) and `~/code/vox/pntr` (no `documentation` config today; bootstrap repairs it).
- The existing-docs front door hands off to `oat-docs-analyze` then `oat-docs-apply` for both content and tooling; bootstrap owns only the docs-directory config and index repair. Analyze tags every recommendation with an approval class (`explicit` for the docs package update and anything else outside the markdown scope; default otherwise). Apply never treats `explicit` recommendations as covered by blanket approval: interactively they are applied only when the person approves them in the approval step, and in unattended mode they are skipped and reported in the structured result. Apply's contract gains the matching scoped carve-out: an explicitly approved tooling update may bump the docs app's `@open-agent-toolkit/docs-*` dependencies, run `oat docs migrate` where a template shape changed, and run the build verifier, and nothing else outside the documentation scope. The pntr `oat-docs-update` prompt config (`scripts/github-actions/oat-docs-update/config.mjs`, "treat this workflow configuration as approval to apply all recommendations") is amended to exclude explicit-approval items so the config and the skill agree; its `docs/` + `.oat/` path gate stays as the backstop.
- `oat-docs-analyze` reports docs package version drift (the app's `@open-agent-toolkit/docs-*` versions versus the CLI's lockstep version, read from the bundled `public-package-versions.json`, no network) as an `explicit`-approval recommendation with the upgrade command. Under automation it is skipped and reported, never applied: the automation boundary is fixed by the pntr `oat-docs-update` workflow, whose prompt confines the agent to `docs/` and `.oat/` (`scripts/github-actions/oat-docs-update/config.mjs` `targetPaths`) and whose path gate keeps it out of build config, and by apply's own rule of no changes outside the documentation scope except nav sync and tracking. A package bump under `apps/<docs-app>/` would fail that gate.
- Index and content-section misuse (the `index.md` contract, section headings, nav drift) is covered by the existing analyze steps; this item adds no second audit surface and no `oat docs doctor` command.
- Docs pages for bootstrap and analyze describe the front-door behavior and the docs-directory shape.

Related: BL-260911-support-per-tool-scope (per-tool scope migration, lower priority).
