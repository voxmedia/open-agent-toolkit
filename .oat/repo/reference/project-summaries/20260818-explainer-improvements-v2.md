---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-17
oat_generated: true
oat_summary_last_task: p07-t16
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: explainer-improvements-v2

## Overview

Hardened the Explainer Kit's publication boundary end to end, driven by the
Cyclone case-study handoff (quick mode; the handoff's acceptance criteria were
normative). The project closed a Critical credential-exposure bypass, made
protected-mode publication durably verifiable, restored golden unattended
recap quality on `project-recap@2`, and — through its own failure modes —
drove structural fixes to the repository's verification surface: the skill
and release test suites now run in `pnpm test`, and the local gate list is a
true superset of CI.

## What Was Implemented

Seven phases, 50 tasks, plus five bounded final-fix batches across six final
review rounds.

- **p01–p02** — adapter paths, destination derivation, credential hygiene,
  canonical GitHub blob links, and the hard internal-reference gate
  (`E_INTERNAL_REFERENCE`, shared correction budget with visual review).
- **p03–p04** — publication verification, `publish-receipt/v2` with split
  object/public verification, lifecycle ordering, bounded recovery, closed
  code-only terminal evidence, and exact retained-package confinement.
- **p05** — prose-led authoring (`project-recap@2`: hub-only floor plus
  justified expansion), docs, and release closure.
- **p06** — first final-review fixes: unsafe S3 publication roots rejected
  before initialization, packaged-RC acceptance evidence, review-ledger
  reconciliation, CLI canary matrices.
- **p07** — second final-review fixes (18 findings): version-agnostic
  publication-root and receipt gates, C0/C1 control-character screening,
  public-root address policy with redirect refusal, `initiative-catalog/v2`
  policy marker, `project-recap@2` end-to-end coverage, skill/release suites
  wired into `pnpm test`, and evidence-attribution corrections.
- **final-fix-001…005** — catalog `v2` versioning against published `0.2.30`;
  `origin/main` merge with lockstep bump to `0.2.31`; a merge
  version-collision fix; the round-5 accuracy batch (durability guard
  testability, whole-core identifier scan, CI-mirroring Definition of Done);
  and a spaced-checkout scan fix.

## Key Decisions

- **Publication gates are version-agnostic, and `publish-request/v1` is
  retained.** The Critical was a fail-open gate keyed to an exact version
  string; the fix validates every publish-request/receipt shape (default
  deny) so a future v3 cannot reintroduce the bypass. Removing v1 is separate
  backlog (`BL-260817-drop-explainer-kit-publish`) because six of nine benign
  v1 root shapes already pass strict validation and the three that fail
  should fail.
- **No structural root-correspondence rule.** The S3-key-to-URL mapping is
  underdetermined by the two root strings — it lives in CDN configuration the
  tool cannot read — and a production CloudFront Origin Path fixture refuted
  the reviewer-proposed equality rule (suffix-containment is vacuous for the
  same case). Divergence detection survives only as a suppressible warning;
  the sound long-term control (authenticated end-to-end URL verification) is
  backlog `BL-260817-verify-protected-mode-public`. Cross-model advisory
  (Codex) concurred at high confidence.
- **The catalog carries verification policy, never outcome.**
  `initiative-catalog/v2`'s `publicVerification` marker is resolved before the
  catalog is serialized and hashed, because the catalog is itself an uploaded,
  hash-bound artifact and cannot carry a post-verification outcome without
  invalidating its own hash. Compatibility is regenerate-only: no v1 read path
  exists because no released consumer could verify v1 catalog evidence.
- **Security-relevant options must be required arguments.**
  `catalogFromManifest`/`validateInitiativeCatalog` require an explicit
  `{ publicAccess }`; omission throws, while explicit `undefined` reads as
  `public` for v1 records. The guard tests call-site syntax, which cannot be
  satisfied by accident of data flow — chosen after a silently-defaulting
  option, threaded only within a task's declared file boundary, broke
  protected-mode durability across four call sites.
- **Local gates mirror CI exactly.** The Definition of Done lists CI's eight
  steps in CI order, after version-bump drift twice reached review with no
  local gate to surface it and the root's own gate harness proved vacuous.

## Design Deltas

- Closed local terminal-evidence codes replaced open-ended provider-text
  scrubbing (approved p04 scope revision; design updated).
- `p07-t03` was respecified mid-phase by operator direction: the planned
  correspondence rule was removed as unsound rather than narrowed
  (implementation is source of truth; plan and design updated).
- `p07-t07` used reason kind `pipeline-failure` instead of the planned
  `finding`, because the terminal-evidence contract permits only
  `provider-failure`/`pipeline-failure` on failed outcomes.
- `final-fix-003` added the optional `publicRootPolicy` receipt field beyond
  its brief, because documenting the SSRF-trace without implementing it would
  have recreated the prose-vs-shipped drift the batch existed to fix
  (round-5 review judged it correct and shippable).

## Notable Challenges

- **Vacuous verification was the project's defining failure mode** — five
  instances: a canary row, two fixtures that rebuilt their expected value with
  the same omission as the code under test (concealing a total protected-mode
  durability regression), a self-caught vacuous fix-batch test, and the root
  orchestrator's own piped gate markers that printed OK regardless of exit
  status. The countermeasures — mandatory red/green proof for every new test,
  reviewer-side mutation testing, and explicit per-gate exit codes — are now
  standing practice in this repo's artifacts.
- **Boundary-scoped edits versus cross-cutting options:** the four files
  carrying the `publicAccess` propagation gap were exactly the four absent
  from the fixing commit's declared file boundary. Repo-wide call-site sweeps
  are the required response when an option crosses module boundaries.
- The final scope ran six review rounds and exceeded the three-cycle
  governance cap under explicit standing operator direction; every round
  through round 5 found something real.

## Tradeoffs Made

- Keeping `publish-request/v1` accepts a slightly larger contract surface in
  exchange for not shipping a breaking removal inside a patch-level release.
- The staged-rename asset publish narrows but does not close the bundling
  race (measured 3/3 failing runs → 1/3); full closure needs the reader-side
  override (`BL-260817-let-resolveassetsroot-honor`).
- The RC lane's end-to-end test remains outside CI pending a browser
  provisioning decision; its tautological always-on assertion was made real
  as partial compensation.

## Follow-up Items

Six backlog items carry all deferred residue: `BL-260817-drop-explainer-kit-publish`,
`BL-260817-verify-protected-mode-public` (with the credential-scoping caveat),
`BL-260817-let-resolveassetsroot-honor`, `BL-260817-run-the-rc-explainer-end`,
`BL-260817-decide-and-pin-the-system`, and
`BL-260817-detect-branch-behind-published` (the merge-base version check
structurally cannot catch branch-behind-published-main). Prior item
`BL-260712-serialize-cli-asset-bundling` was closed by this project.

## Workflow Observations

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:4,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T002327Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T004027Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:4,medium:2,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T005429Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T012159Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:3,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T012720Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:2,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T013953Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T015212Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:3,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T021300Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:4,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T023457Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:4,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T024804Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important exit=124 status=review_failed

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T031926Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:3,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T033345Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T034831Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T040012Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:3,medium:2,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T042235Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T043754Z.md

### 2026-08-06 · structural · oat-project-implement · p03

Phase p03 passed after 11 tasks, two bounded recoveries, and three review cycles; final review: reviews/archived/p03-review-2026-08-06T235124Z.md.

### 2026-08-14 · structural · oat-project-implement · p01

Phase p01 completed 6/6 tasks on 2026-08-06; its focused correction passed at `c1d5a1b0994e19abb2b349b776ba3235f8955b52` in `reviews/archived/p01-t06-review-2026-08-06T174423Z.md`.

### 2026-08-14 · structural · oat-project-implement · p02

Phase p02 completed 2/2 tasks on 2026-08-06; the corrected canonical-link and internal-reference range passed at `3f0dfe5e3131ee2ef12bd06cf4eb842566b50ca9` in `reviews/archived/p02-review-2026-08-06T202708Z.md`.

### 2026-08-14 · structural · oat-project-implement · p04

Phase p04 completed 6/6 tasks on 2026-08-07 after two automatic fixes, two operator-authorized scope decisions, and the terminal p04-t05/p04-t06 re-review at `098e1780b86116492073513614f64835aa470030`; immutable artifact: `reviews/archived/p04-t04-review-2026-08-07T200546Z.md`.

### 2026-08-14 · structural · oat-project-implement · p05

Phase p05 completed 4/4 tasks on 2026-08-07 and passed its narrowed guidance re-review at `836d850147f067a59d6d4fd06edfd4d8f568e780` in `reviews/archived/p05-review-2026-08-07T211756Z.md`.

### 2026-08-14 · structural · oat-project-review-receive · final-reconciliation

The reconciled final review at `3da933d4e2d5ebd9764616fb0110b4794598fdd7` superseded the preliminary pass and recorded 1 Critical, 1 Important, 3 Medium, and 3 Minor findings in `reviews/archived/final-review-2026-08-07T215000Z.md`; all eight were authorized as p06 fix work.

### 2026-08-14 · structural · oat-project-implement · p06

Phase p06 completed 5/5 bounded final-review tasks in commits `634463e0c207b45fbb9fe9985840e0b6fdab1b40` through this bookkeeping commit. Task-level security, release, ledger, integration, and repository gates passed; serial completion gates and the fresh full final review remain pending.

### 2026-08-16 · structural · oat-project-review-provide · final

Fresh full final review over 5f76ade9..07e2c96d7 recorded 1 Critical, 2 Important, 8 Medium, and 7 Minor findings in reviews/final-review-2026-08-16T232006Z.md; the Critical publish-request/v1 root-validation bypass blocks project close.

### 2026-08-17 · structural · oat-project-implement · p07

Phase p07 stopped direction-required after 4/16 tasks at 143e15a86: p07-t03's strict root-correspondence rule regressed tools/smoke/explainer-kit/wrapper-compatibility.test.mjs (2/5 fail), refuted by the repo's own CloudFront origin-path fixture; phase_recovery_limit=0 forbids automatic recovery. p07-t01/t02/t04 verified clean.

### 2026-08-17 · structural · oat-project-implement · p07-t03

Operator authorized changed scope for p07-t03 after cross-model advisory: remove the unsound root-correspondence rule rather than narrow it, surface protected-mode uncertainty as catalog verification state, and file authenticated public-URL verification as backlog BL-260817-verify-protected-mode-public.

### 2026-08-17 · structural · oat-project-implement · p07

Phase p07 passed at bcf479807 after 16 tasks and one bounded fix round: review round 1 (reviews/p07-review-2026-08-17T053431Z.md) found 1 Critical + 2 Important from one propagation-gap pattern concealed by self-consistent fixtures; fix round p07-fix-001 made the catalog access policy a required argument and swept 30 call sites; review round 2 (reviews/p07-review-2026-08-17T061620Z.md) mutation-tested the fixtures and passed with 0 Critical / 0 Important.

### 2026-08-17 · structural · oat-project-review-provide · final

Narrowed final review over 07e2c96d7..68196ba71 recorded 0 Critical, 2 Important, 9 Medium, 7 Minor in reviews/final-review-2026-08-17T064111Z.md; 16 of 18 source findings fully resolved, 2 partial. Both Important findings are project-scope release-hygiene issues outside p07's task scope: initiative-catalog/v1 wire shape changed without a version bump against published 0.2.30, and all five public packages sit below main at 0.2.29 with no gate detecting it.

### 2026-08-17 · structural · oat-project-review-provide · final

Final review round 3 over 68196ba71..8eb45413e (reviews/final-review-2026-08-17T092205Z.md) recorded 0 Critical, 1 Important, 10 Medium, 8 Minor: catalog-versioning Important closed and v1-replay determination verified sound; version-drift Important half-open via an oat-project-complete 1.6.1 merge version collision failing CI's validate-skill-version-bumps gate, which no root package.json script runs. Fixed root-inline as final-fix-002 (5e6fcc83b, recorded deviation); all nine gates including the CI skill-bump gate verified with explicit exit codes after a vacuous-marker harness defect was found and corrected in the root's own gate runner.

### 2026-08-17 · structural · oat-project-implement · final

Final review passed at 97e5853d2 after six rounds and five bounded fix batches (reviews/final-review-2026-08-17T142743Z.md: 0 Critical, 0 Important, 0 Medium, 1 Minor converted and fixed as final-fix-005 at 0c8382fa1). All ten gates green with explicit exit codes; every deferred finding lives in one of six named backlog items. Implementation complete: 50 tasks, 7 phases; ready for oat-project-pr-final.

### 2026-08-18 · structural · oat-project-retro · project-retro

retro artifact=.oat/projects/shared/explainer-improvements-v2/references/project-retro.md evidence_used=archived-review-markdown,backlog-items,current-session-transcript,decision-records,git-history,lifecycle-artifacts,project-log evidence_unavailable=oat-execution-learnings,prior-session-transcripts promotions=5 upstream=0 apply=performed filing=performed
