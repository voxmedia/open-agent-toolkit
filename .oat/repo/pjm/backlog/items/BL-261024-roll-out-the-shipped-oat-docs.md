---
id: BL-261024-roll-out-the-shipped-oat-docs
title: Roll out the shipped OAT docs front door and approval policy to consumer
  repositories
status: open
priority: high
scope: feature
scope_estimate: M
labels:
  - docs
  - consumer-rollout
assignee: null
created: 2026-10-24T18:59:55.490Z
updated: 2026-10-25T00:30:00.000Z
associated_issues: []
external_plans: []
---

## Description

Carry out the unperformed external portion of AC2, AC5 and AC6 from
[BL-260911-make-docs-bootstrap-a-front — Make docs bootstrap a front door for existing docs and support the docs-directory convention](../archived/BL-260911-make-docs-bootstrap-a-front.md)
(source path `.oat/repo/pjm/backlog/archived/BL-260911-make-docs-bootstrap-a-front.md`; archive preserves the source history).
The original source retains all eight original criteria, observations and prior
Markdown-project history. AC1/3/4/7/8 and the OAT capability portions of AC2/5/6
are delivered; they are not new unfinished OAT implementation work.

Approved transfer: [issue #367](https://github.com/voxmedia/open-agent-toolkit/issues/367),
[docs-skills-ia-367 brief](https://github.com/voxmedia/open-agent-toolkit/blob/a65959999f17c5c77b4659946f48251098061fed/.oat/projects/shared/docs-skills-ia-367/plan.md)
and [implementation evidence](https://github.com/voxmedia/open-agent-toolkit/blob/a65959999f17c5c77b4659946f48251098061fed/.oat/projects/shared/docs-skills-ia-367/implementation.md)
(p02/p03 accepted; p09-t01 corrects residual E13). The front door/guidance shipped
in [PR #369](https://github.com/voxmedia/open-agent-toolkit/pull/369), and IA records,
approval handoff and offline drift in [PR #371](https://github.com/voxmedia/open-agent-toolkit/pull/371).
See the [P1–P28 delivery checklist](https://github.com/voxmedia/open-agent-toolkit/blob/a65959999f17c5c77b4659946f48251098061fed/.oat/projects/shared/docs-skills-ia-367/references/issue-367-delivery-checklist.md).

The named local paths below are historical source observations, not verified
current facts. No external repository was accessed for this transfer. Consumer
execution requires its owner's authorization and local rules. Selecting the
framework acceptance consumer is a future rollout-owner choice, not an invented
target or a claim that Markdown proves framework drift.

## Acceptance Criteria

- [ ] Verify Markdown adoption in the named `~/code/personal-skills` consumer (source says configured root docs) and repair/add documentation config in `~/code/vox/pntr` (source says absent at observation time). Those are historical observations to re-inspect during rollout, not verified current facts. Use consumer-approved roots and preserve authored content/local guidance; no app package/build requirement.
- [ ] For both, verify literal `documentation.root`, `tooling: "markdown"` and authored index/root AGENTS pointers, first-class docs-directory detection, and the existing docs fallback. Verify analyze/apply/index consumers work without framework config/site nav/build; optional generated inventory must remain external and distinct from authored context.
- [ ] Audit applicable directory indexes (including useful context and populated dash Contents), sibling/immediate-child relative .md links, title/description metadata and contributor/agent entry guidance. Preserve existing content, local audience/ownership guidance, authored indexes and asset-only exceptions. Additive config success is not full content acceptance; repairs go through analyze/approved apply.
- [ ] In pntr, change exactly `scripts/github-actions/oat-docs-update/config.mjs` so its blanket phrase “treat this workflow configuration as approval to apply all recommendations” expressly excludes every `approval: explicit` recommendation. Retain its `targetPaths` documentation-only boundary (`docs/` and `.oat/`) and existing path gate; do not broaden it to app packages/build config.
- [ ] Verify real automation handoff honors per-recommendation approval classes. Blanket/unattended approval applies only eligible default content repairs; explicit recommendations are skipped and reported by ID/reason, even if IDs are supplied unattended. No docs-app package bump under `apps/<docs-app>/` may pass pntr's existing path gate. Preserve an allowed default repair as the accepted control.
- [ ] Where a framework consumer is actually present/selected, verify offline drift compares installed docs-\* versions with that invoked CLI's bundled `public-package-versions.json`, with source/version evidence and exact upgrade command for genuine older-package drift; no registry-latest lookup. Under automation the explicit upgrade is skipped/reported, never performed. If named Markdown consumers have no docs app, record package drift as not applicable there; root/rollout must select an appropriate framework acceptance target rather than invent packages or claim a Markdown run proves drift. Hoisted-only installs currently return unverified; do not imply a fix.
- [ ] Where interactive tooling approval is actually exercised, allow only docs-app docs-\* dependency updates/resulting lockfile, already-supported migrate admonition/frontmatter conversion and build verification. Unsupported config/routes/package scripts remain manual; don't transfer the old “template shape changed” wording as permission for an unshipped generic migrator. Retain individually approved versus blanket/unattended outcomes separately.
- [ ] Record actual consumer commits/PRs, invoked CLI version/bundle, commands, categorical outcomes and remaining owner decisions. OAT's merged PRs/synthetic tests prove shipped capability, not these consumer runs. Apply ordinary existing regression/approval-boundary proof standards, without expanding into an unrelated broad rollout campaign.

## Scope and retained limits

The eight checkboxes preserve every outstanding external obligation; none is
satisfied by this transfer. Original source AC2 maps to checkboxes 1–3, AC5 to
4–5 and 7, AC6 to 5–8. The supported migration scope above qualifies the source's
historical “template shape changed” wording; it grants no generic scaffold
migrator. Framework selection remains open. No second audit surface or
`oat docs doctor` is included. P28 external vendored-copy normalization was not
performed by #367 and may be separately scoped by a future owner; it is not an
extra inherited BL-260911 acceptance clause. Adjacent documentation-aware
project discovery remains separate.

## Delivery status

Open: all consumer acceptance is unperformed. The OAT-side capability is merged
in the linked phase PRs; this item records no consumer commit/PR, publication,
deployment or acceptance. Record those delivery facts only when observed.

## Pilot follow-ups

A 0.3.31 pilot on a pilot consumer repository surfaced tooling defects (fixed
for the next release) and four follow-ups tracked separately:

- [BL-261025-add-a-check-or-stdout-mode — Add a check or stdout mode to oat docs generate-index](BL-261025-add-a-check-or-stdout-mode.md)
- [BL-261025-keep-oat-docs-analyze-tracking — Keep oat-docs-analyze tracking from dirtying consumer repositories and failing silently](BL-261025-keep-oat-docs-analyze-tracking.md)
- [BL-261025-let-oat-docs-analyze-propose — Let oat-docs-analyze propose candidate IA structures when no IA is recorded](BL-261025-let-oat-docs-analyze-propose.md)
- [BL-261025-add-an-adoption-path-for-pre-0 — Add an adoption path for pre-0.3.31 Fumadocs apps whose guidance assumes nav sync](BL-261025-add-an-adoption-path-for-pre-0.md)
