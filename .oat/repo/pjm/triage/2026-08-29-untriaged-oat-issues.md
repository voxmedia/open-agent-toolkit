---
oat_triage_record: true
schema_version: 1
status: verifying
scope: open GitHub issues without a completed disposition label: #199, #204-#207, #209-#210, #213-#214, #228, and #230
baseline_sha: 5d684ba9746cd91006524eb5a82f18078a3196ef
triage_pr: null
created: 2026-08-29
updated: 2026-08-30
---

# Untriaged OAT Issues

## Scope and exclusions

Included: GitHub issues #199, #204, #205, #206, #207, #209, #210,
#213, #214, #228, and #230. This record replaces the initial
0165f3f5 evidence snapshot after PRs #227, #231, #240, #242, and #243
reached main.

Excluded: GitHub issue mutations, implementation, unrelated backlog
reprioritization, and external-plan generation. Proposed issue-derived backlog
changes remain unapproved and are not applied by this cleanup PR.

## Evidence baseline

- origin/main and HEAD: 5d684ba9746cd91006524eb5a82f18078a3196ef
  (PR #243).
- GitHub authentication and live issue/PR reads succeeded on 2026-08-30.
- Relevant merged PRs: #225, #227, #231, #240, and #242.
- PR #190 remains open, draft, and conflicting.
- Active and archived canonical backlog records plus the legacy backlog snapshot
  were searched before proposing new coverage.

## Disposition ledger

### GH-199 — Make tracking helper references pack-integrity checked

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/199
- Claim: Shipped skill-to-script references can drift outside owning pack
  manifests without a general integrity check.
- Verification: Partially fixed; residual upstream enhancement.
- Confidence: 99%.
- Evidence: The concrete knowledge-index reference is fixed at
  .agents/skills/oat-repo-knowledge-index/SKILL.md:678 and both packs declare
  the helper at packages/cli/src/commands/tools/shared/pack-manifest.ts:201.
  packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts:1812
  checks only resolve-tracking.sh, while bundle-consistency.test.ts:349 does
  not validate every script path named by every shipped skill. Commit 4eed6fa7
  fixed the reported instance; the issue's maintainer comment leaves the
  universal check open.
- Existing coverage: No canonical item covers the residual general check.
- Proposed GitHub action: Keep open; after approved backlog coverage merges,
  add tracked-in-backlog and link the item and triage PR.
- Backlog action: Proposed new item, Validate every shipped skill-to-script
  reference against its owning pack manifest.
- Priority and size rationale: high / task / M. A miss silently ships a broken
  bundled workflow; implementation needs syntax-aware extraction, owning-pack
  diagnostics, fixtures, and mutation proof.
- Approval: Pending.
- Post-merge result: Pending.

### GH-204 — Make project-recap fact projection artifact-driven

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/204
- Claim: Current OAT projects recap facts through brittle positional mapping.
- Verification: Reproduced downstream stale-tooling incident; no current
  upstream OAT defect.
- Confidence: 98%.
- Evidence: The sanitized reproduction and ownership follow-up show downstream
  oat-explainer-kit 1.0.3 remained installed while OAT correctly reported it
  outdated against 1.0.6. Current projection remains semantic at
  .agents/skills/explainer-kit/scripts/lib/fact-base.mjs:244, with
  arbitrary-ID and contradiction tests at fact-base.test.mjs:303.
- Existing coverage: None required; this is downstream version drift.
- Proposed GitHub action: After approval, add invalid with a public-safe stale
  tooling explanation and close as not planned.
- Backlog action: None. Outdated-tool preflight UX would be a separate
  enhancement if independently requested.
- Priority and size rationale: Not applicable.
- Approval: Pending.
- Post-merge result: Pending.

### GH-205 — Make discovery knowledge-index policy configurable and documentation-aware

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/205
- Claim: Discovery blocks on a knowledge index even when current documentation
  already supplies adequate repository context.
- Verification: Confirmed discovery/config enhancement.
- Confidence: 99%.
- Evidence: .agents/skills/oat-project-discover/SKILL.md:120 blocks without an
  index and line 180 hardcodes staleness thresholds.
  packages/cli/src/config/oat-config.ts:216 has no discovery prerequisite
  policy. Legacy bl-b5af already owns configurable staleness thresholds but not
  the full documentation-aware requirement.
- Existing coverage: Legacy bl-b5af is partial historical coverage, not a
  canonical active PJM item.
- Proposed GitHub action: Keep open; add tracked-in-backlog after an approved
  promoted item merges.
- Backlog action: Promote and broaden bl-b5af into one canonical item covering
  configurable, documentation-aware discovery prerequisites and mapper/tests.
- Priority and size rationale: medium / feature / M. The current workaround is
  available but wasteful; the fix crosses config, discovery policy, mapper
  evidence, and contract tests.
- Approval: Pending.
- Post-merge result: Pending.

### GH-206 — Make review continuation ranges self-validating

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/206
- Claim: Review continuation can carry invalid or unstable commit ranges.
- Verification: Confirmed residual integrity gap with partial ReviewPlan
  coverage; narrower than originally reported.
- Confidence: 95%.
- Evidence: packages/cli/src/review-remote/narrowing.ts:198 filters malformed
  heads and line 236 verifies existence and ancestry. narrowing.test.ts:491
  shows abbreviated heads normally fall back to full scope rather than being
  rejected. Generic continuation provenance remains prose-only at
  .agents/skills/oat-project-implement/references/phase-execution.md:273.
  BL-260729-implement-reviewplan-first is compatible but not explicit; PR #190
  remains unmerged and conflicting.
- Existing coverage: Partial coverage in the existing ReviewPlan item/project.
- Proposed GitHub action: Keep open; add tracked-in-backlog after the ReviewPlan
  item explicitly covers this residual.
- Backlog action: Refine BL-260729-implement-reviewplan-first with normalization,
  repository existence/ancestry, immutable range, and continuation identity.
  Split a review-integrity task only if PR #190 is abandoned or narrowed.
- Priority and size rationale: Retain the existing high / feature / L parent;
  this is a required acceptance slice, not a new project.
- Approval: Pending.
- Post-merge result: Pending.

### GH-207 — Add a consolidated scope decision at the review cap

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/207
- Claim: Exhausting the review-cycle cap lacks one explicit synthesis of
  accepted requirements, regressions, and expanded hardening.
- Verification: Confirmed cap-decision gap; default ReviewPlan ownership in the
  old draft was incorrect.
- Confidence: 97%.
- Evidence: phase-execution.md:529 repeats until exhaustion, while
  .agents/skills/oat-project-review-receive/SKILL.md:554 offers only three
  generic cap options. BL-260818-distinguish-operator-directed already owns cap
  authorization/accounting. DR-260827-cycle-cap-disposition-bounded is
  incident-specific rather than a generic synthesis contract.
- Existing coverage: Partial coverage in BL-260818.
- Proposed GitHub action: Keep open; add tracked-in-backlog after approved
  refined coverage merges.
- Backlog action: Refine BL-260818 with a separate consolidated scope-decision
  acceptance section; create a linked review-gate-integrity companion only if
  that item must remain authorization-only.
- Priority and size rationale: Retain medium / task / M; this is bounded but
  spans receive and implement lifecycle contracts.
- Approval: Pending.
- Post-merge result: Pending.

### GH-209 — Retro should preserve or add to a finished project retro

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/209
- Claim: Re-running retro can overwrite a completed project-retro.md.
- Verification: Confirmed lifecycle-history defect.
- Confidence: 95%.
- Evidence: .agents/skills/oat-project-retro/SKILL.md:80 always selects the
  same output path; its append-only language applies to project-log corrections,
  while line 298 still expects one project-retro.md. Contract tests contain no
  completed-retro preservation/addendum fixture.
- Existing coverage: No canonical item. Compatible with #210 only under
  independent acceptance criteria.
- Proposed GitHub action: Keep open; add tracked-in-backlog after approved
  coverage merges.
- Backlog action: Proposed shared lifecycle-history item with a dedicated
  immutable-retro/addendum acceptance section.
- Priority and size rationale: high / task / M. Overwrite risks durable history;
  implementation and tests cross retro and completion semantics.
- Approval: Pending.
- Post-merge result: Pending.

### GH-210 — Lifecycle complete should not freeze the project log

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/210
- Claim: Completed or archived projects cannot receive later durable log
  corrections.
- Verification: Confirmed post-completion target-resolution gap, narrower than
  a frozen-log implementation defect.
- Confidence: 96%.
- Evidence: packages/cli/src/commands/project/log/append.ts:257 accepts an
  explicit directory containing state.md but otherwise requires the active
  project. The log remains appendable at line 298; completion/archive removes
  the default target. Explicit project targeting is a workaround when the
  completed path is known and present.
- Existing coverage: BL-260713 concerns root-agent logging responsibility, not
  durable completed/archived target resolution.
- Proposed GitHub action: Keep open; add tracked-in-backlog after approved
  coverage merges.
- Backlog action: Fold into the proposed #209 lifecycle-history item under a
  separate completed/archived target-resolution and idempotence section.
- Priority and size rationale: high / task / M shared with #209.
- Approval: Pending.
- Post-merge result: Pending.

### GH-213 — Make gate-owned project-log finalization resilient to transient Git index locks

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/213
- Claim: A transient Git index lock can strand a gate-owned log append or
  commit without a resumable receipt.
- Verification: Confirmed gate-finalization reliability defect.
- Confidence: 98%.
- Evidence: packages/cli/src/commands/gate/index.ts:2731 appends then directly
  stages and commits; failures become diagnostics without changing the gate
  result at line 2819. index.test.ts:4980 proves diagnostic-only behavior under
  a held index lock. There is no retry, stable idempotency key, or resumable
  append-versus-commit receipt.
- Existing coverage: BL-260820-bind-each-gate-review owns received-event
  identity, not Git finalization.
- Proposed GitHub action: Keep open; add tracked-in-backlog after approved
  coverage merges.
- Backlog action: Proposed review-gate-integrity child for bounded lock handling,
  append/commit receipts, and idempotent resume.
- Priority and size rationale: high / task / M. It is a recurring integrity
  boundary with narrow runtime and test scope.
- Approval: Pending.
- Post-merge result: Pending.

### GH-214 — Allow passing-gate receive to file deferred repository follow-ups

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/214
- Claim: Passing-gate receive cannot durably file accepted deferred repository
  follow-ups with identity and duplicate protection.
- Verification: Confirmed distinct receive enhancement.
- Confidence: 96%.
- Evidence: .agents/skills/oat-project-review-receive/SKILL.md:316 defers
  passing-gate findings only into implementation.md; final handling remains at
  line 586. Retro filing config at packages/cli/src/config/oat-config.ts:112 is
  separate. PR #190 preserves obligations but supplies no repository backlog
  identity, receipt, duplicate detection, or resumable filing.
- Existing coverage: No exact item; depends on stable event/finding identity in
  the review-gate-integrity cluster.
- Proposed GitHub action: Keep open; add tracked-in-backlog after approved
  coverage merges.
- Backlog action: Proposed review-gate-integrity child for receive-time
  backlog filing after event identity stabilizes.
- Priority and size rationale: medium / task / M. Useful and bounded, but
  dependency-ordered behind exact event identity.
- Approval: Pending.
- Post-merge result: Pending.

### GH-228 — User-scope packs misreport placement and do not project agents

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/228
- Claim: User-scope selection can be reported as project plus user and
  user-scope agents do not reach provider views.
- Verification: Confirmed composite scope/provider defect.
- Confidence: 99%.
- Evidence: The issue's verbatim transcript verifies the picker mismatch.
  packages/cli/src/engine/compute-plan.ts:638 still skips user agents and
  scanner.test.ts:53 codifies skill-only user scope. pack-inventory.ts:389
  treats declared intent as placement evidence, and init/tools/index.ts:607
  unions that misreported current placement into interactive selection.
  PR #231 shipped portable references and PR #242 shipped provider-aware
  canonical reads; neither shipped provider materialization or picker truth.
  The PR #242 project summary explicitly assigns that residual to the
  tool-pack-scope-provider-truthfulness project.
- Existing coverage: Exact urgent coverage in
  BL-260829-make-tool-pack-scope-selection and its active project.
  scope-adoption-diagnostics is a coordinated diagnostics dependency, not the
  provider-materialization owner.
- Proposed GitHub action: Keep open; add tracked-in-backlog and link the
  existing item/project after the triage PR merges.
- Backlog action: Link existing only; create nothing new.
- Priority and size rationale: Existing urgent / feature / L remains correct.
- Approval: Pending.
- Post-merge result: Pending.

### GH-230 — Implementation-tail project recap cannot run unattended on a fresh machine

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/230
- Claim: Autonomous closeout can require recap seams that a fresh unattended
  host cannot satisfy.
- Verification: Confirmed narrower autonomous-recap readiness/policy defect.
- Confidence: 94%.
- Evidence: workflow.explainers.projectRecap now exists at
  packages/cli/src/config/oat-config.ts:174 and defaults to ask in
  packages/cli/src/config/resolve.ts:132, so the old no-config premise is stale.
  Autonomous mode still overrides never and always generates at
  .agents/skills/oat-explainer-kit/references/lifecycle-contract.md:21.
  completion-and-closeout.md:771 constructs author/critic seams, while
  lifecycle-contract.md:121 additionally requires real browser and visual
  critic seams for unattended recap.
- Existing coverage: BL-260727-make-explainer-run-durability and
  BL-260817-run-the-rc-explainer-end cover different durability and CI-browser
  boundaries. Neither owns fresh-host capability policy.
- Proposed GitHub action: Keep open; add tracked-in-backlog after approved
  coverage merges.
- Backlog action: Proposed new item, Make autonomous project recap capability
  aware and non-blocking on unconfigured hosts.
- Priority and size rationale: high / task / M. It blocks autonomous closeout
  but can use an explicit nonprompting skip or another bounded fail-safe policy.
- Approval: Pending.
- Post-merge result: Pending.

## Coverage and ownership summary

- tool-pack-scope-provider-truthfulness owns #228. PRs #231 and #242 are
  shipped prerequisites, not complete fixes for provider projection or picker
  truth.
- ReviewPlan partially owns #206 only. #207 belongs with cycle-cap handling,
  not ReviewPlan by default.
- review-gate-integrity should own proposed children for #213 and #214.
- gate-headless-no-yield and gate-structured-output-contract do not cleanly own
  any of these eleven issues and should not be replaced.
- #209 and #210 may share one lifecycle-history item only with independent
  acceptance sections.
- #230 needs a new capability-policy item; explainer durability and browser
  work are adjacent, not substitutes.

## Open concerns

1. Exact issue-derived backlog mutations and post-merge GitHub actions require
   consolidated user approval before application.
2. PR #190 must be reconciled before treating ReviewPlan as complete coverage
   for #206 or implementing overlapping gate/review work.
3. The active scope/provider and diagnostics worktrees overlap on inventory and
   diagnostics surfaces and require explicit file partitioning or serialization.
4. Historical legacy backlog candidates remain non-active until individually
   revalidated and promoted.

## Resume instructions

Review and approve or revise the eleven proposed dispositions as one set.
After approval, apply only the approved canonical backlog links/refinements/new
items in this PR. GitHub labels, comments, and closures remain deferred until
the triage PR has merged and a resume run rechecks live issue state.
