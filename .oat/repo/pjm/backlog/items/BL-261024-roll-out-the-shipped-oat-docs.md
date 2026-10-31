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
updated: 2026-10-31T21:08:00Z
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

**Delivery status (2026-10-31):** Landed: OAT rollout fixes in #378 and #379
(0.3.32, 0.3.33) and four consumer docs surfaces brought to conformance (see
[Delivery status](#delivery-status) below). Remaining: every checkbox below.
Each still has unmet clauses as listed there, so the criteria stay as written.

## Acceptance Criteria

- [ ] Verify Markdown adoption in the named `~/code/personal-skills` consumer (source says configured root docs) and repair/add documentation config in `~/code/vox/pntr` (source says absent at observation time). Those are historical observations to re-inspect during rollout, not verified current facts. Use consumer-approved roots and preserve authored content/local guidance; no app package/build requirement.
- [ ] For both, verify literal `documentation.root`, `tooling: "markdown"` and authored index/root AGENTS pointers, first-class docs-directory detection, and the existing docs fallback. Verify analyze/apply/index consumers work without framework config/site nav/build; optional generated inventory must remain external and distinct from authored context.
- [ ] Audit applicable directory indexes (including useful context and populated dash Contents), sibling/immediate-child relative .md links, title/description metadata and contributor/agent entry guidance. Preserve existing content, local audience/ownership guidance, authored indexes and asset-only exceptions. Additive config success is not full content acceptance; repairs go through analyze/approved apply.
- [ ] In pntr, change exactly `scripts/github-actions/oat-docs-update/config.mjs` so its blanket phrase “treat this workflow configuration as approval to apply all recommendations” expressly excludes every `approval: explicit` recommendation. Retain its `targetPaths` documentation-only boundary (`docs/` and `.oat/`) and existing path gate; do not broaden it to app packages/build config.
- [ ] Verify real automation handoff honors per-recommendation approval classes. Blanket/unattended approval applies only eligible default content repairs; explicit recommendations are skipped and reported by ID/reason, even if IDs are supplied unattended. No docs-app package bump under `apps/<docs-app>/` may pass pntr's existing path gate. Preserve an allowed default repair as the accepted control.
- [ ] Where a framework consumer is actually present/selected, verify offline drift compares installed docs-\* versions with that invoked CLI's bundled `public-package-versions.json`, with source/version evidence and exact upgrade command for genuine older-package drift; no registry-latest lookup. Under automation the explicit upgrade is skipped/reported, never performed. If named Markdown consumers have no docs app, record package drift as not applicable there; root/rollout must select an appropriate framework acceptance target rather than invent packages or claim a Markdown run proves drift. Hoisted installs resolve through ancestor `node_modules` since 0.3.33 (#379).
- [ ] Where interactive tooling approval is actually exercised, allow only docs-app docs-\* dependency updates, the app's own declared `@open-agent-toolkit/cli` update in its existing dependency section (resulting lockfile included) and manifest regeneration with that upgraded CLI (DR-261025-approved-docs-tooling-updates), already-supported migrate admonition/frontmatter conversion and build verification. Unsupported config/routes/package scripts remain manual; don't transfer the old “template shape changed” wording as permission for an unshipped generic migrator. Retain individually approved versus blanket/unattended outcomes separately.
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

Open. Observed delivery as of 2026-10-25, recorded generically (consumer
repositories are not named in this public record):

- OAT 0.3.32 and 0.3.33 shipped rollout fixes in
  [PR #378](https://github.com/voxmedia/open-agent-toolkit/pull/378) and
  [PR #379](https://github.com/voxmedia/open-agent-toolkit/pull/379).
- Four consumer docs surfaces were brought to conformance and merged: three
  Fumadocs apps (one nav-sync app with a hoisted install, one standalone nested
  nav-sync app and one pilot nav-sync app) and one Markdown docs directory
  adopted with `oat docs init --framework markdown --adopt`.
- A fifth Fumadocs consumer, with hand-authored navigation, is in review.
- The invoked CLI was 0.3.33 (bundled `public-package-versions.json` 0.3.33).
  Package drift was verified current after approved tooling updates, and
  framework drift acceptance was exercised on real consumers.

No checkbox is ticked yet; each one still has unmet clauses as written:

- 1–2: the second named consumer's documentation config is not yet repaired or
  added, and both checkboxes cover both named consumers. Checkbox 2 also needs
  evidence for docs-directory detection, the existing docs fallback, apply and
  index consumers, and an external generated inventory.
- 3: conformance is recorded, but not that repairs went through analyze and
  approved apply, or that authored content and local guidance were kept.
- 4–5: the named automation config change and a real automation handoff have
  not been made or verified.
- 6: interactive offline drift on framework consumers is evidenced. Still
  missing: the automation skip-and-report path for explicit upgrades, and the
  not-applicable drift record for the named Markdown consumers. Hoisted
  installs resolve since 0.3.33 (#379) and were verified on the hoisted consumer.
- 7: approved tooling updates were exercised, but the allowed-category limits,
  build verification, and separate individually approved and blanket outcomes
  are not recorded.
- 8: the CLI version, bundle, categorical outcomes and one command are recorded
  above. Consumer commit and PR references and the remaining owner decisions
  (the second named consumer, the fifth consumer in review and automation) are
  still to record.

## Rollout follow-ups

A 0.3.31 pilot on a pilot consumer repository surfaced tooling defects (fixed
for the next release) and four follow-ups; read-only 0.3.32 conformance runs on
consumer repositories added fifteen more. All nineteen were consolidated on
2026-10-25 into three items whose checklists keep every source acceptance
criterion (the archived source records keep their original wording):

- [BL-261025-tighten-oat-docs-check-rules — Tighten oat docs check rules and diagnostics](BL-261025-tighten-oat-docs-check-rules.md)
- [BL-261025-make-oat-docs-generators — Make OAT docs generators and writers predictable](BL-261025-make-oat-docs-generators.md)
  (includes the pilot's generate-index check or stdout mode)
- [BL-261025-close-docs-skill-workflow-gaps — Close docs skill workflow gaps found in the consumer rollout](BL-261025-close-docs-skill-workflow-gaps.md)
  (includes the pilot's analyze tracking, analyze IA candidates and pre-0.3.31
  nav-sync adoption follow-ups)
