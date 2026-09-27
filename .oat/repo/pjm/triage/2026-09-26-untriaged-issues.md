---
oat_triage_record: true
schema_version: 1
status: pr_open
scope: Twenty open GitHub issues without a disposition label (#295–#297, #305–#307, #310–#314, #316, #322–#329), plus a resolution check of open issues labeled tracked-in-backlog
baseline_sha: 82cce7f89c12c4f9443536595e410c65ff3a0ed4
triage_pr: https://github.com/voxmedia/open-agent-toolkit/pull/330
created: 2026-09-26
updated: 2026-09-26
---

# Untriaged open issues (2026-09-26)

## Scope and exclusions

- In scope: every open issue in `voxmedia/open-agent-toolkit` with none of the
  disposition labels `tracked-in-backlog`, `needs-reproduction`, `duplicate`,
  `invalid`, or `wontfix`, retrieved 2026-09-26: #295, #296, #297, #305, #306,
  #307, #310, #311, #312, #313, #314, #316, #322, #323, #324, #325, #326, #327,
  #328, and #329.
- Also in scope, at the user's request during this run: a resolution check of
  the 28 open issues already labeled `tracked-in-backlog`, to find issues whose
  work shipped but which were never closed. Only rows with a verified merged
  fixing PR, or an explicit declined disposition, appear in the ledger; the rest
  keep their existing disposition.
- Excluded: downstream repositories referenced by issue reports, whose private
  evidence is not reproduced here.
- Snapshot: none of the twenty carried a disposition label, linked pull request,
  or backlog reference on `origin/main`. Labels at retrieval: `bug` on #322 and
  #324, `enhancement` on #323, none on the rest. #305 and #323 each carry one
  author comment with added evidence.

## Evidence baseline

- `origin/main` and the triage branch `HEAD` were both
  `82cce7f89c12c4f9443536595e410c65ff3a0ed4` on 2026-09-26, in the dedicated
  `.worktrees/triage-2026-09-26` worktree. The built CLI reported `0.3.7`.
- GitHub CLI authentication and the repository remote were verified. Open and
  closed issues and pull requests were searched, as were active and archived
  backlog items.
- Five read-only skeptical-evaluator lanes (gate/review, commit/state/log,
  retro/templates/config, sync/tools/init, dispatch record) checked each claim,
  seeking disconfirming evidence before support. Scratch reproductions ran in
  `mktemp -d` repositories with an isolated `HOME` using the baseline CLI build.
  Load-bearing conclusions below were rechecked against source by the triage
  root.
- Downstream evidence cited by reports (private repositories, CLI 0.3.x runs)
  was not reproduced; those mechanisms were judged against current code.

## Disposition ledger

Backlog item IDs were recorded after creation on 2026-09-26 (the IDs carry the
UTC creation date, 260927).

### GH-295 — Validate review reconnaissance envelopes before accepting child launches

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/295
- Claim: reviewer recon children were accepted with incomplete envelopes, then
  rejected them, leaving no replacement path.
- Verification: **Confirmed but narrower than reported.** PR #285 merged after
  the report and added a prose pre-launch envelope check
  (`.agents/agents/oat-reviewer.md:101`). No deterministic validator or
  missing-field diagnostic exists in `.agents/skills/recon/scripts/**`;
  `recon-worker` rejects only after acceptance. Replacement after acceptance is
  intentionally forbidden (`oat-dispatch-subagents/SKILL.md:457-477`), but the
  accepted handle can already be continued with a corrected envelope.
- Confidence: medium (downstream run predates #285).
- Existing coverage: criterion 4 (terminal result per accepted child) is #266 /
  `BL-260906-harden-dispatch-launch`. Criteria 1–2 are uncovered.
- Proposed GitHub action: add `tracked-in-backlog`; comment linking the new
  item, noting #285's prose guard and that post-acceptance replacement is
  intentional.
- Backlog action: created `BL-260927-validate-recon-worker` ("Validate
  recon-worker assignment envelopes deterministically before launch") (medium,
  task, S), related to `BL-260906-harden-dispatch-launch`.
- Priority and size rationale: the prose guard and inline fallback limit impact
  to wasted lanes; one validator plus mechanical and intelligent lane fixtures.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

### GH-296 — Add scoped template resolution for lifecycle artifacts

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/296
- Claim: lifecycle skills copy `.oat/templates/<name>.md`, which may not exist
  when templates are installed at user scope or only bundled.
- Verification: **Confirmed current defect, broader than reported.** A
  user-scope `oat tools install workflows` in a scratch repository produced
  `$HOME/.oat/templates/project-retro.md` and no repository `.oat/templates/`.
  The hardcoded path appears in about nine lifecycle skills (retro, discover,
  design, plan, spec, summary, quick-start, import-plan, promote-spec-driven).
  Internal resolvers exist (`project/new/scaffold.ts:447-464`,
  `pjm/template-source.ts:36-79`) but no CLI command exposes them, and they
  disagree on precedence (scaffold: user first; PJM: repository first).
- Confidence: high.
- Existing coverage: none.
- Proposed GitHub action: add `tracked-in-backlog`; comment linking the item and
  noting the broader skill set and the precedence disagreement.
- Backlog action: created `BL-260927-expose-a-scoped-template` ("Expose a scoped
  template resolver command and route lifecycle skills through it") (medium,
  feature, M).
- Priority and size rationale: breaks every template-copying skill for
  user-scope installs, with a manual workaround; new CLI surface, one precedence
  decision, and about nine skill edits with version bumps.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

### GH-297 — Require per-item summaries in interactive project retro output

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/297
- Claim: an ID-and-title retro summary forces the user to open the artifact.
- Verification: **Duplicate or already covered** by #313, which requests the
  same per-item explanation and adds non-interactive, empty-register, and
  contract-test criteria. #297's two unique points (separate apply, repository
  filing, and upstream filing groups; a worked example) are carried into the
  #313 backlog item.
- Confidence: high.
- Existing coverage: #313 (this triage).
- Proposed GitHub action: add `duplicate`; comment linking #313 and the backlog
  item that carries #297's criteria; close as duplicate.
- Backlog action: link to `BL-260927-require-a-per-item-walkthrough`.
- Priority and size rationale: see GH-313.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

### GH-305 — Make lifecycle review status transitions atomic and self-validating

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/305 (body and
  author comment)
- Claim: review status is duplicated across ledgers, prose, routing fields, and
  counters with no single authority; the comment adds duplicate `received` rows
  for one gate event and a never-resolving quick-mode `design` row.
- Verification: **Enhancement (architectural gap) with a confirmed defect in the
  comment evidence.** No transition helper or status authority exists; skills
  maintain status in prose. The `## Reviews` rows are written by skills, not the
  CLI: review-provide appends a row per artifact
  (`oat-project-review-provide/SKILL.md:1146-1149`) while quick-start and plan
  writing separately update "the plan row"
  (`oat-project-quick-start/SKILL.md:911-914`); `.oat/templates/plan.md` has no
  `plan` placeholder row, so two writers produce two rows. Quick-mode projects
  inherit unused `spec`/`design` rows. `-` Invocation/Gate Target on artifact
  gates follows the current spec (`SKILL.md:1139-1144`). The
  `manual`-vs-`auto` mismatch was not reproducible.
- Confidence: high for the mechanism.
- Existing coverage: partial — `BL-260820-bind-each-gate-review` (#194) binds
  dispositions to exact received events;
  `BL-260711-skip-re-review-for-bookkeeping` (#233) classifies bookkeeping
  findings. Neither provides a status authority or pre-dispatch invariant.
- Proposed GitHub action: add `tracked-in-backlog`; comment linking both items.
- Backlog action: created `BL-260927-derive-current-lifecycle-state` ("Derive
  current lifecycle state from one authority for review, phase, and publication
  status") (medium, feature, L), shared with #310; refined
  `BL-260820-bind-each-gate-review` with the comment evidence: one row upserted
  per (scope, type, artifact), a `plan` placeholder row, Gate Target filled for
  artifact gates, and quick-mode scaffolds omitting unused scopes.
- Priority and size rationale: recurring wasted review cycles with a manual
  workaround; cross-artifact change spanning several skills, templates, and
  validators.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

### GH-306 — Use a hook-safe exact-path commit primitive across OAT lifecycle flows

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/306
- Claim: exact-path lifecycle commits collide with index locks under hooks; OAT
  needs one hook-safe primitive.
- Verification: **Confirmed but narrower than reported.** The gate project-log
  path already retries transient locks without deleting them, is idempotent, and
  writes a resumable receipt (PR #275; `project/log/append.ts:838-980`). Other
  commit sites have no shared primitive: `promote.ts:340`, `ref-sync.ts`, and
  skill scaffold commits use `git add <paths>; git commit`, which commits all
  staged content. A scratch lint-staged reproduction did not produce a lock, but
  a formatting hook left the committed project log `MM` after a successful
  pathspec commit (inference: the log can remain dirty downstream).
- Confidence: medium.
- Existing coverage: `BL-260902-retry-gate-project-log` (closed) covers only the
  gate log lock retry.
- Proposed GitHub action: add `tracked-in-backlog`; comment noting PR #275
  covered the gate-log lock half.
- Backlog action: created `BL-260927-share-one-hook-safe-exact-path` ("Share one
  hook-safe exact-path commit primitive across CLI and skill lifecycle commits")
  (medium, feature, L), shared with #312's writer-coordination half.
- Priority and size rationale: recurring downstream with a manual workaround;
  multiple CLI call sites, a skill sweep, and hook fixtures.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

### GH-307 — Give configured-gate result receipts portable durable ownership

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/307
- Claim: shared state points to a clone-local receipt, leaving the tree dirty
  and fresh clones unable to reconcile.
- Verification: **Confirmed current defect (contract gap).** The implement
  contract calls the receipt durable and closeout-owned but never defines its
  location, tracking, redaction, cleanup, or fresh-clone behavior
  (`oat-project-implement/references/completion-and-closeout.md:420-424,628-632`);
  `:557` implies it may be committed.
- Confidence: medium.
- Existing coverage: partial — `BL-260820-emit-source-qualified` (#202) covers
  provenance fields only.
- Proposed GitHub action: add `tracked-in-backlog`; comment linking the item.
- Backlog action: created `BL-260927-give-gate-receipts-portable` ("Give gate
  receipts portable ownership, path-neutral identities, and a shipped ignore
  rule") (medium, feature, M), shared with #312's receipt half.
- Priority and size rationale: affects shared projects and cross-machine resume
  by default downstream; contract, state fields, cleanup, `oat init` ignore
  entry, and four scenario fixtures.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

### GH-310 — Derive current lifecycle state and invalidate stale project summaries

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/310
- Claim: summaries go stale after review-fix phases, publication, rebases, or
  merges; routing reads stale snapshots.
- Verification: **Enhancement, partly covered.** Routing does not read
  `summary.md` (consumers are archive, links, rollup); the summary skill already
  detects task and revision staleness on re-run
  (`oat-project-summary/SKILL.md:203-222`). Nothing tracks publication, rebase,
  or merge heads, and nothing invalidates automatically.
- Confidence: medium.
- Existing coverage: partial — `BL-260820-track-pr-closeout-evidence` (#201)
  tracks closeout evidence freshness, not summary invalidation.
- Proposed GitHub action: add `tracked-in-backlog`; comment linking the shared
  item and asking which summary surface routing read in the reported run.
- Backlog action: link to `BL-260927-derive-current-lifecycle-state`, which
  carries publication-head state and summary invalidation criteria.
- Priority and size rationale: see GH-305.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

### GH-311 — Keep documentation index generation non-mutating

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/311
- Claim: `oat docs generate-index` rewrites `.oat/config.json` incidentally.
- Verification: **Confirmed but narrower than reported.** With a valid config,
  generation leaves the file byte-identical (scratch repro; test
  `docs/index-generate/index.test.ts:408`). The only write is the deliberate
  one-time `documentation.index` record for Fumadocs sites from PR #262
  (`index.ts:548-551,618-627`). That write reorders unrelated keys through the
  same normalization as #329.
- Confidence: high.
- Existing coverage: none for the reordering; #262 intentionally added the
  write.
- Proposed GitHub action: add `tracked-in-backlog`; comment that valid configs
  are unchanged and the residual noise is #329's reordering.
- Backlog action: link to `BL-260927-preserve-oat-config-json-key` with an
  acceptance line that the one-time `documentation.index` write changes only
  that key.
- Priority and size rationale: see GH-329.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

### GH-312 — Harden gate finalization against concurrent Git index writers

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/312
- Claim: gate finalization races other writers for the index; durable receipts
  retain machine-local absolute paths.
- Verification: **Confirmed but narrower than reported.** Contention retry,
  idempotent recovery, and partial-finalization receipts shipped in PR #275
  (`gate/index.test.ts:5928-6437`). The receipt still stores absolute
  `projectPath` and `worktreeRoot` (`gate/index.ts:3131-3151,2974-2980`), and
  `oat init` does not add the `**/gate-receipts/` ignore rule that only this
  repository's `.gitignore:95` carries (`init/gitignore.ts:17-25`; scratch
  `git check-ignore` exited 1). User-home transcript paths in committed
  artifacts were not observed.
- Confidence: high.
- Existing coverage: `BL-260902-retry-gate-project-log` (closed) for contention.
- Proposed GitHub action: add `tracked-in-backlog`; comment linking both items
  and noting PR #275 delivered the contention half.
- Backlog action: link to `BL-260927-share-one-hook-safe-exact-path` (writer
  coordination) and `BL-260927-give-gate-receipts-portable` (path-neutral
  receipts and ignore rule).
- Priority and size rationale: see GH-306 and GH-307.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

### GH-313 — feat(retro): require a user-facing walkthrough of generated items

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/313
- Claim: retro can end with only paths and counts, without walking the user
  through each RP/UP item.
- Verification: **Enhancement or UX improvement, confirmed.** Step 4 requires a
  register summary only in interactive runs
  (`oat-project-retro/SKILL.md:170-173,177-186`); the skill has no final-report
  section and its success criteria (`:298-313`) never mention a walkthrough; no
  contract test pins one. Related wording defect: `SKILL.md:168` names
  `workflow.retro.filing` as one key, inviting a failing parent-key
  `oat config get` (see #329).
- Confidence: high.
- Existing coverage: none (#209 and #251 concern preservation and receipts).
- Proposed GitHub action: add `tracked-in-backlog`; comment linking the item and
  noting #297 is folded in.
- Backlog action: created `BL-260927-require-a-per-item-walkthrough` ("Require a
  per-item walkthrough of retro register items in the final report") (medium,
  task, S), including #297's grouping and worked-example criteria and the
  `SKILL.md:168` leaf-key wording fix.
- Priority and size rationale: observed repeatedly and blocks informed consent;
  skill text plus a contract test and version bump.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

### GH-314 — project log: add a side-effect-free probe for append

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/314
- Claim: no way to probe `oat project log append` without writing a permanent
  entry.
- Verification: **Enhancement, confirmed and slightly narrower.** No `--dry-run`
  flag exists. Assets are resolved only when creating a new log
  (`append.ts:1684-1685`), so the mismatch affects the first append. `project
log check` never resolves assets and reported `absent`, exit 0, under a
  scratch asset mismatch; `oat tools list --json` does fail on the mismatch and
  is an undocumented read-only workaround.
- Confidence: high.
- Existing coverage: none.
- Proposed GitHub action: add `tracked-in-backlog`; comment linking the item.
- Backlog action: created `BL-260927-add-a-side-effect-free-dry-run` ("Add a
  side-effect-free dry run to oat project log append") (low, task, S).
- Priority and size rationale: a workaround exists and the harm is one
  permanent noise entry; one flag with grammar, seal, and asset tests.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

### GH-316 — oat sync: canonical rule frontmatter errors say `<inline>`

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/316
- Claim: rule parse errors omit the file path, and one bad rule aborts the whole
  sync.
- Verification: **Confirmed current defect.** The Claude, Cursor, and Copilot
  transforms receive `canonicalPath` but call
  `parseCanonicalRuleMarkdown(canonicalContent)`
  (`providers/{claude,cursor,copilot}/rule-transform.ts`); the
  missing-frontmatter error has no path (`rules/canonical/parse.ts:128-135`).
  Scratch repro with an `alwaysApply: true` rule: `...in <inline> must be one
of...`, exit 1, sync aborted. The Cursor importer already maps `alwaysApply`.
- Confidence: high.
- Existing coverage: none.
- Proposed GitHub action: add `tracked-in-backlog`; comment linking the item.
- Backlog action: created `BL-260927-name-the-file-in-canonical` ("Name the file
  in canonical rule parse errors and keep one bad rule from aborting sync")
  (medium, task, S); the `alwaysApply` alias versus warn-and-skip choice is
  decided within the item.
- Priority and size rationale: third-party installers can block every sync; a
  small path fix plus one bounded behavior decision.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

### GH-322 — `--project-guidance` produces no OAT tools guidance in non-interactive runs

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/322
- Claim: none of four listed commands emits or writes the guidance block.
- Verification: **Confirmed but narrower than reported.** Guidance works for
  `oat init tools workflows`, whole-set `oat init tools`, `oat tools install
workflows`, and `oat init --setup`. Other pack leaves accept the inherited
  flag and silently ignore it
  (`commands/init/tools/index.ts:1789-1806,1939-1949` gate guidance on `pack ===
'workflows'`), as does `oat init` without `--setup`.
  `oat-doctor/SKILL.md:128,224` recommends `oat tools install <pack>
--project-guidance`, which is a no-op for seven of eight packs. Re-applying
  outdated assets during install is intended.
- Confidence: high.
- Existing coverage: partial — `BL-260903-close-manual-only-agents-md` names
  the silent drop and the workflows-only leaf in its description but not its
  acceptance criteria.
- Proposed GitHub action: add `tracked-in-backlog`; comment listing the working
  commands and linking the refined item.
- Backlog action: refined `BL-260903-close-manual-only-agents-md` with criteria:
  every command that accepts `--project-guidance` acts on it or rejects it;
  `oat init` without `--setup` warns or honors it; a read-only guidance emit
  that does not reinstall assets; `oat-doctor` fix hints name a working command;
  associate #322.
- Priority and size rationale: existing item stays medium; added criteria are
  small relative to its append contract.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

### GH-323 — Tool guidance should reflect where packs are installed

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/323 (body and
  author comment)
- Claim: the guidance block cites `.agents/skills/` even when all packs are
  user scope; propose `oat tools where`.
- Verification: **Confirmed but narrower than reported; the locate command is an
  enhancement.** The block already adds a user-scoped skills line and per-pack
  scope tags (`commands/init/tools/project-guidance.ts:86-99`), but always leads
  with `Skills directory: .agents/skills/` (`:80-81`). No `where` subcommand
  exists; `oat tools list --json` and `oat tools info` already report scope.
- Confidence: high.
- Existing coverage: none.
- Proposed GitHub action: add `tracked-in-backlog`; comment noting the existing
  scope lines and linking the item.
- Backlog action: created `BL-260927-name-only-installed-pack` ("Name only
  installed pack locations in the OAT tools guidance block") (low, task, S),
  with `oat tools where` recorded as an optional follow-up.
- Priority and size rationale: the block already names the user location, so
  harm is a misleading lead line; one renderer plus fixtures.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

### GH-324 — `resolve-providers.sh` exits 1 with no output when `.cline/` is absent

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/324
- Claim: under `set -euo pipefail`, a false final `&&` test makes the
  auto-detect function return 1 and abort silently.
- Verification: **Confirmed current defect.** Exact mechanism at
  `.agents/skills/oat-agent-instructions-analyze/scripts/resolve-providers.sh:23,80-86,128`.
  Scratch repro: `AGENTS.md` plus `.claude/` prints nothing, exit 1; adding
  `.cline/` prints providers, exit 0. `oat-agent-instructions-apply` runs the
  same script and inherits the failure. No tests exist for the script.
- Confidence: high.
- Existing coverage: none.
- Proposed GitHub action: add `tracked-in-backlog`; comment linking the item.
- Backlog action: created `BL-260927-stop-resolve-providers-sh-from` ("Stop
  resolve-providers.sh from aborting when the last auto-detect test is false")
  (high, task, XS).
- Priority and size rationale: breaks analyze and apply in every repository
  without sync config or `.cline/`, including unattended runs; one-line fix plus
  a script test and skill version bump.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

### GH-325 — Gate review dispatch audit line disagrees with the resolved gate target

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/325
- Claim: gate artifacts' `**Dispatch audit:**` line reflects project policy, not
  the resolved gate target in frontmatter.
- Verification: **Confirmed current defect** (mechanism in skill contract). Step
  6.0 copies `dispatchStamp` from `oat project dispatch-ceiling resolve --role
reviewer` (`oat-project-review-provide/SKILL.md:667-687`), while gate
  frontmatter copies the gate prompt's resolved values, and `:749` states gates
  resolve their target independently. No validator compares the two.
- Confidence: high.
- Existing coverage: none.
- Proposed GitHub action: add `tracked-in-backlog`; comment linking the item.
- Backlog action: created `BL-260927-derive-or-label-the-dispatch` ("Derive or
  label the dispatch audit line from the gate invocation in gate-originated
  reviews") (medium, task, S).
- Priority and size rationale: wrong provenance without blocking the lifecycle;
  a skill rule plus a contract test where gate effort differs from the ceiling.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

### GH-326 — Publish the managed Claude dispatch-record contract and report all validation errors at once

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/326
- Claim: the mandatory managed-Claude validation-only record is documented with
  placeholders, and validation surfaces errors one field per run.
- Verification: **Confirmed current defect.** Mandatory at
  `oat-project-implement/references/dispatch-and-dry-run.md:405-406,513-542`
  with placeholder-only input (`:518-528`). Derived fields throw on the first
  hit (`providers/claude/dispatch-envelope.ts:269-273`); validation stages run
  sequentially (`commands/project/dispatch/record.ts:280-296`); the
  canonical-role-resolution event fields appear in no skill or doc; path regex
  failures report bare `Invalid`. Narrower: Zod errors within one stage already
  arrive together. Additional gap: no command produces the canonical-role
  evidence (`resolveCanonicalRole` has no production caller). A valid input
  exists only in `record.test.ts:100`.
- Confidence: high.
- Existing coverage: related — `BL-260909-give-the-dispatch-record` predates
  PR #315 and still weighs deleting the schema that the managed path now
  requires.
- Proposed GitHub action: add `tracked-in-backlog`; comment linking the item and
  noting within-stage errors are already batched.
- Backlog action: created `BL-260927-make-the-managed-claude` ("Make the managed
  Claude dispatch-record input producible and self-describing") (high, feature,
  M); refined `BL-260909-give-the-dispatch-record` to record that since PR #315
  the validation-only path consumes the schema, so only journal persistence
  lacks a consumer.
- Priority and size rationale: a mandatory pre-launch check that invites
  skipping or improvising; docs, tested example, batched errors, pattern
  messages, and an evidence producer or builder mode.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

### GH-327 — Record owner approval after an exhausted gate as a structured disposition

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/327
- Claim: owner approval after an exhausted quick-start plan gate exists only as
  prose; gates cannot distinguish new from carried findings.
- Verification: **Enhancement with one narrower confirmed gap.** An exhausted
  `block` gate MUST NOT proceed by contract
  (`oat-project-quick-start/SKILL.md:900-902`), so an owner override is outside
  the contract by design, not missing parity with implement's `prompt_approved`
  (which belongs to `onFailure: prompt`). The confirmed gap: quick-start's
  `prompt` branch persists no approval (`:886`) where implement requires one.
  Gate envelopes carry no new-versus-carried finding classification.
- Confidence: high.
- Existing coverage: partial — `BL-260818-distinguish-operator-directed`
  (#200, #207) defines a bounded operator authorization for the review-cycle
  cap, not configured-gate attempts.
- Proposed GitHub action: add `tracked-in-backlog`; comment linking the item and
  noting the contract position on exhausted `block` gates.
- Backlog action: created `BL-260927-record-owner-overrides` ("Record owner
  overrides of exhausted configured gates as structured state") (low, task, M),
  related to `BL-260818-distinguish-operator-directed`, including persisted
  quick-start `prompt` approvals and new-versus-carried finding classification.
- Priority and size rationale: auditability rather than blocking, with a prose
  workaround; state schema, two skills, and gate envelope changes.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

### GH-328 — Detect stale artifact prose and unfilled placeholders at PR-final and completion

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/328
- Claim: artifacts retain stale status prose and `{…}` placeholders through PR
  and completion.
- Verification: **Confirmed current defect.** The scaffold writes
  `**Status:** Discovery` (`project/new/scaffold.ts:156,176`), which only
  completion rewrites (`complete-state/state-utils.ts:117-118`). The
  implementation template ships `{…}` placeholders and `oat_status: in_progress`
  (`.oat/templates/implementation.md:2,185-197`). PR-final only warns on an
  obviously empty Final Summary (`oat-project-pr-final/SKILL.md:279-283`);
  completion has no placeholder or frontmatter/body check. Routing does not
  parse the body status, so harm is to readers and reviewers.
- Confidence: high.
- Existing coverage: none (`BL-260908-tighten-the-pr-final-ledger` covers ledger
  paths only).
- Proposed GitHub action: add `tracked-in-backlog`; comment linking the item.
- Backlog action: created `BL-260927-detect-unfilled-placeholders` ("Detect
  unfilled placeholders and frontmatter-body drift at PR-final and completion")
  (medium, task, M), related to `BL-260927-derive-current-lifecycle-state`.
- Priority and size rationale: reaches PR bodies and archives and costs review
  rounds; one shared deterministic check used by two skills, with fixtures.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

### GH-329 — Preserve config key order on rewrite and support reading nested retro filing keys

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/329
- Claim: config rewrites reorder keys; `oat config get workflow.retro.filing`
  fails.
- Verification: **Confirmed but narrower than reported.** Key reordering
  reproduced: a same-value `oat config set` changes the file and moves `git`
  below `projects`, because `writeOatConfig` always normalizes to a fixed order
  and writes (`config/oat-config.ts:2023-2030`). Leaf keys
  `workflow.retro.filing.repo` and `.upstream` already read correctly; only
  parent keys fail, as for every parent key by design (`oat config dump` covers
  objects). The retro skill's parent-key wording is folded into
  `BL-260927-require-a-per-item-walkthrough`.
- Confidence: high.
- Existing coverage: none.
- Proposed GitHub action: add `tracked-in-backlog`; comment that leaf keys work
  and the wording fix is tracked with #313.
- Backlog action: created `BL-260927-preserve-oat-config-json-key` ("Preserve
  .oat/config.json key order and skip no-op config writes") (low, task, S),
  including #311's one-time `documentation.index` criterion.
- Priority and size rationale: noisy diffs, no data loss; one shared writer
  with about fifteen callers and byte-identity tests.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

### Resolution check of issues already labeled `tracked-in-backlog`

The rows below record open issues whose owning work already merged. Each
closes only with its merged fixing PR linked.

#### GH-199 — Tracking helper references should be pack-integrity checked

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/199
- Claim: the issue remains open although its tracked work shipped.
- Verification: **Already fixed.** Fixing PR: PR #275 (merged 2026-09-07, wave 5
  p06), after the reported instance was fixed in commit 4eed6fa7.
- Confidence: medium-high.
- Evidence:
  `packages/cli/src/validation/skills-bundled-docs-contract.test.ts:4460,4522`
  require every shipped skill's script references to resolve in its owning pack
  and name the skill, reference, and pack on failure. Narrower than the issue's
  install-time wording: integrity is enforced in CI against the pack manifest
  rather than at install time, which prevents the shipped defect class.
- Existing coverage: BL-260902-validate-every-shipped-skill (closed).
- Proposed GitHub action: Close as fixed by PR #275; comment that the general
  script-reference contract shipped there and the reported instance was fixed in
  4eed6fa7.
- Backlog action: none.
- Priority and size rationale: not applicable; no new work.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

#### GH-203 — Detect stale provider skill views and offer safe sync

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/203
- Claim: the issue remains open although its tracked work shipped.
- Verification: **Already fixed.** Fixing PR: PR #278 (merged 2026-09-08, wave 6
  p05), building on PR #249 and PR #255 for status reporting.
- Confidence: medium-high.
- Evidence: `packages/cli/src/drift/skill-view-diagnostic.ts` classifies
  missing, additive, removed, modified, and unknown provider views; `oat tools
info <skill>` reports them with a scoped sync hint; post-sync convergence is
  covered in `tools/info/skill-view-convergence.integration.test.ts`. The
  diagnostic is operator-invoked rather than provider-load-time.
  `BL-260908-align-the-provider-view-json` is unrelated JSON polish.
- Existing coverage: BL-260904-diagnose-canonical-skills (closed).
- Proposed GitHub action: Close as fixed by PR #278; comment linking #249 and
  #255 for the status half.
- Backlog action: none.
- Priority and size rationale: not applicable; no new work.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

#### GH-213 — Make gate-owned project-log finalization resilient to transient Git index locks

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/213
- Claim: the issue remains open although its tracked work shipped.
- Verification: **Already fixed.** Fixing PR: PR #275 (merged 2026-09-07, wave 5
  p04; DR-260907-gate-log-receipts-live-under).
- Confidence: high.
- Evidence: `gate/index.test.ts:5928` (transient lock recovered), `:5963`
  (persistent lock never deleted), `:5983` (partial-finalization receipt),
  `:6219` (recovery without re-review); idempotency keys at
  `project/log/append.test.ts:1721`. The broader shared commit primitive and
  path-neutral receipts are tracked from #306 and #312 in this triage.
- Existing coverage: BL-260902-retry-gate-project-log (closed).
- Proposed GitHub action: Close as fixed by PR #275; comment pointing broader
  follow-ups to #306 and #312.
- Backlog action: none.
- Priority and size rationale: not applicable; no new work.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

#### GH-230 — Implementation-tail project recap gate cannot run unattended on a fresh machine

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/230
- Claim: the issue remains open although its tracked work shipped.
- Verification: **Already fixed.** Fixing PR: PR #299 (merged 2026-09-14; body
  names #230 as source issue), after the interim probe in PR #275.
- Confidence: high.
- Evidence:
  `oat-project-implement/references/completion-and-closeout.md:912-924`:
  unattended runs never prompt, a missing browser yields `built-needs-review`,
  and a failed retry is a recorded skip. The agent-authored recap (the issue's
  option 2) replaced the seam-based gate.
- Existing coverage: BL-260902-make-autonomous-project-recap (closed),
  BL-260904-add-recap-seam-config-keys (wont_do),
  BL-260907-replace-the-default-project (closed).
- Proposed GitHub action: Close as fixed by PR #299.
- Backlog action: none.
- Priority and size rationale: not applicable; no new work.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

#### GH-232 — `oat gate review` returns `review_failed` for a review that committed a valid artifact

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/232
- Claim: the issue remains open although its tracked work shipped.
- Verification: **Already fixed.** Fixing PR: PR #275 (merged 2026-09-07, wave 5
  p01; DR-260907-additive-post-selection).
- Confidence: high.
- Evidence: `gate/index.ts:2781` names `postSelection.step` and `code`; `:4532`
  sets `postSelectionRecovery: true`; tests at `gate/index.test.ts:7428`
  (committed artifact recovered) and `:7522` (failing sub-step named).
- Existing coverage: BL-260902-recover-committed-review (closed).
- Proposed GitHub action: Close as fixed by PR #275.
- Backlog action: none.
- Priority and size rationale: not applicable; no new work.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

#### GH-234 — Document patch-and-restore recovery when a child handle is lost with staged work

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/234
- Claim: the issue remains open although its tracked work shipped.
- Verification: **Already fixed.** Fixing PR: PR #267 (merged 2026-09-06, wave 2
  p05; body names the item).
- Confidence: high.
- Evidence: `oat-project-implement/references/phase-execution.md:237,254`
  (dirty-tree rule, `capture-dirty-tree.mjs`), brief field `recovered_patch` at
  `:78` and `.agents/agents/oat-phase-implementer.md`; script tests in
  `tests/capture-dirty-tree.test.mjs`.
- Existing coverage: BL-260902-document-patch-and-restore (closed).
- Proposed GitHub action: Close as fixed by PR #267.
- Backlog action: none.
- Priority and size rationale: not applicable; no new work.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

#### GH-238 — oat pjm init writes provider-view pointers into documentation content trees

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/238
- Claim: the issue remains open although its tracked work shipped.
- Verification: **Already fixed.** Fixing PR: PR #275 (merged 2026-09-07, wave 5
  p02; body states "Issue #238 reproduced live on this repository and closed"),
  after PR #244 fixed the doctor half.
- Confidence: medium-high.
- Evidence: Instruction-sync pointer placement skips the documentation content
  root and honors `documentation.instructionPointerExcludes`, which also covers
  the fixture-tree case in the issue's follow-up comment.
- Existing coverage: BL-260902-keep-pjm-init-provider (closed).
- Proposed GitHub action: Close as fixed by PR #275; comment linking #244 for
  the doctor half.
- Backlog action: none.
- Priority and size rationale: not applicable; no new work.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

#### GH-239 — oat docs generate-index has no exclusion mechanism

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/239
- Claim: the issue remains open although its tracked work shipped.
- Verification: **Already fixed.** Fixing PR: PR #262 (merged 2026-09-06, wave
  1; body names the item).
- Confidence: high.
- Evidence: `commands/docs/index-generate/index.ts:303,406` accept config
  excludes and `--exclude`; covered in `generator.test.ts`.
- Existing coverage: BL-260902-add-an-exclusion-mechanism (closed).
- Proposed GitHub action: Close as fixed by PR #262.
- Backlog action: none.
- Priority and size rationale: not applicable; no new work.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

#### GH-252 — Clear activeProject only after completion durability receipts exist

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/252
- Claim: the issue remains open although its tracked work shipped.
- Verification: **Already fixed.** Fixing PR: PR #286 (merged 2026-09-09;
  idempotent completion seal, guard commit f4c2dc4ef), after PR #254 fixed the
  synced-archive path.
- Confidence: medium.
- Evidence: `oat-project-complete/SKILL.md:970-991` keeps the pointer for
  durable archive completions and `:1545-1572` clears it only after the receipt
  validates; contract tests at `review-skill-contracts.test.ts:4776-4966`.
  `completed.md:47` records that the wont_do was a supersession with #252
  staying open under the successor. Interruption-boundary tests were checked
  only at the pinned-text level.
- Existing coverage: BL-260902-defer-activeproject-clearing (wont_do:
  superseded, not declined) and its successor BL-260907-make-the-completion-seal
  (closed).
- Proposed GitHub action: Close as fixed by PR #286 (not `wontfix`); comment
  linking #254 for the synced path.
- Backlog action: none.
- Priority and size rationale: not applicable; no new work.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

#### GH-258 — Skill versioning should honor the Agent Skills spec's metadata.version

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/258
- Claim: the issue remains open although its tracked work shipped.
- Verification: **Already fixed.** Fixing PR: PR #278 (merged 2026-09-08,
  resolver) and PR #280 (merged 2026-09-08, bundled migration); PR #286 made the
  top-level alias an error.
- Confidence: medium.
- Evidence: `frontmatter.ts:419` `resolveSkillVersion`; no bundled `SKILL.md`
  carries top-level `version:`; the template emits `metadata.version`;
  `validation/skills.ts:1435` makes `skill-version-alias` an error. The issue's
  final step (remove top-level reads once quiet) is scheduled in
  `BL-260908-remove-the-top-level-skill`, gated on a release.
- Existing coverage: BL-260904-honor-metadata-version (closed),
  BL-260904-migrate-bundled-skills-from (closed); residue
  BL-260908-remove-the-top-level-skill (open).
- Proposed GitHub action: Close as fixed by PR #278 and PR #280; comment that
  alias-read removal is scheduled as BL-260908-remove-the-top-level-skill
  (Remove the top-level skill version alias).
- Backlog action: none.
- Priority and size rationale: not applicable; no new work.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

#### GH-250 — Make consolidated-project retirement checks semantic

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/250
- Claim: the issue may be resolved by `BL-260902-make-consolidated-project`.
- Verification: **Partially resolved.** PR #275 (wave 5 p11) shipped the
  quick-start path (`oat-project-quick-start/SKILL.md:209`,
  `oat-project-complete/SKILL.md:771-796`). Lite consolidation records no
  `absorbed_projects`; that residue is open as
  `BL-260907-record-absorbed-projects`.
- Confidence: medium-high.
- Proposed GitHub action: keep open and labeled; comment that the quick-start
  path shipped in PR #275 and the Lite residue is tracked in
  BL-260907-record-absorbed-projects.
- Backlog action: none.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

#### GH-277 — Refresh skill authoring guidance

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/277
- Claim: the issue may be resolved by `BL-260908-correct-the-factual-skill`.
- Verification: **Partially resolved.** PR #286 (p19) corrected the factual
  errors. Conditional references, deliberate invocation policy, and sourced,
  dated provider claims remain open in `BL-260908-restructure-the-authoring`
  and `BL-260909-re-source-the-surviving-codex`
  (`create-agnostic-skill/SKILL.md:5,177`).
- Confidence: high.
- Proposed GitHub action: keep open and labeled; comment that factual
  corrections shipped in PR #286 and the rest is tracked by those two items.
- Backlog action: none.
- Approval: approved by user on 2026-09-26 as part of the consolidated ledger.
- Post-merge result: pending.

#### Remaining tracked issues

No merged fixing PR was found for #194, #197, #200, #201, #202, #205, #206,
#207, #209, #210, #214, #233, #237, #251, #265, or #266; their owning items are
open. No action.

## Open concerns

- #265 and #266 stay open, but PR #288 made `oat project dispatch record`
  optional and off by default, which may remove #265's trigger and #266's
  premise. Revisit both when `BL-260909-give-the-dispatch-record` decides the
  command's fate.
- `BL-260908-restore-recon-s-cheap-fan-out` remains open after PR #285; not
  checked here.
- #296 requires a precedence decision: the project scaffold resolver checks the
  user tier first while the PJM resolver and the issue put the repository first.

## Resume instructions

After the triage PR merges, invoke:

```text
/triage-oat-issues resume post-merge PR #330
```

The resume run applies only the approved rows above, idempotently:

1. Confirm every `BL-260927-*` item and the three refined items exist on
   `origin/main`.
2. For the twenty untriaged issues: add `tracked-in-backlog` (except #297) and
   post one comment per issue linking its backlog item(s) and the merged triage
   PR, including the verification correction recorded in its row. For #297 add
   `duplicate`, comment linking #313 and
   `BL-260927-require-a-per-item-walkthrough`, and close it.
3. For the ten already-fixed issues (#199, #203, #213, #230, #232, #234, #238,
   #239, #252, #258): comment with the recorded fixing PR(s) and close as
   completed. Do not add `wontfix` to #252.
4. For #250 and #277: post the recorded progress comment only; leave them open
   and labeled.
5. Treat any row whose live issue state differs from this record (closed,
   relabeled, or newly commented with contrary evidence) as drift: block that
   row and ask before acting. Post a completion receipt on the merged triage PR.
