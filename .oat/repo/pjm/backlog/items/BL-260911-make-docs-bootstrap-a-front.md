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
- The existing-docs front door offers two paths with distinct owners. **Audit content**: `oat-docs-analyze` then `oat-docs-apply`, markdown, nav, and tracking only, identical to the unattended automation. **Update docs tooling** (bootstrap-owned, interactive only, apps with packages only): report the drift, bump the `@open-agent-toolkit/docs-*` dependencies and install, run `oat docs migrate` where a template shape changed between versions, then the same build verifier and post-scaffold inspector the scaffold path uses, gated on the same capability probes. Docs-directory repos get only the audit path plus the config and index repair bootstrap owns.
- `oat-docs-analyze` reports docs package version drift (the app's `@open-agent-toolkit/docs-*` versions versus the CLI's lockstep version, read from the bundled `public-package-versions.json`, no network) as an informational finding with the upgrade command. `oat-docs-apply` never applies it: the automation boundary is fixed by the pntr `oat-docs-update` workflow, whose prompt confines the agent to `docs/` and `.oat/` (`scripts/github-actions/oat-docs-update/config.mjs` `targetPaths`) and whose path gate keeps it out of build config, and by apply's own rule of no changes outside the documentation scope except nav sync and tracking. A package bump under `apps/<docs-app>/` would fail that gate.
- Index and content-section misuse (the `index.md` contract, section headings, nav drift) is covered by the existing analyze steps; this item adds no second audit surface and no `oat docs doctor` command.
- Docs pages for bootstrap and analyze describe the front-door behavior and the docs-directory shape.

Related: BL-260911-support-per-tool-scope (per-tool scope migration, lower priority).
