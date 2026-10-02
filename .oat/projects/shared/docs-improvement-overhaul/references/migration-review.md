# p02-t01 migration review handoff

**Status:** Corrected draft ready for the same independent normalization/map reviewer recheck and Fable map review. Intrinsic analysis reviewed with an offered Low residual, not a clean pass. Not approved, not committed, no docs moved. Root continues the accepted phase handle after reviews; this is not a user checkpoint or phase-completion claim.

## Authority and provenance

Implementation request: `docs-overhaul-run1-p02-implementation`. Exact target: `oat-phase-implementer-gpt-6-1-sol-high`. Selected model/effort: GPT-6.1 Sol/high; runtime confirmation not reported. Mini execution host, existing Orca worktree `/Users/tstang/orca/workspaces/open-agent-toolkit/amphipod`, branch `amphipod`. Native helper remains attached to root; no standalone sidebar visibility is claimed. No new branch, source relocation, publication or nested reviewer launch.

Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-6.1-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-6-1-sol-high

Execution release HEAD: `fc3515327df51632286f0c9a373e76e7b36b8c30` (clean and unchanged before drafting). Exact accepted p01/pre-move source baseline: `8b78d9a935b31ef50e65713b03a022a5d022aa59`. Initial implementation base: `257517ab5aa1a5846cb4069ba036eafd7b5009f5`. The release commit changes only root-owned state/implementation bookkeeping after the source baseline.

Read root and nested app/CLI/repository guidance, canonical phase role, complete quick-plan contract, design/discovery, prior implementation context, canonical analyze skill/criteria/template and shared artifact-review loop. No spec exists by design. Root owns core artifacts/logs, dispatch records, final phase reviews and shared public versions. The task commit is still pending and must eventually be exactly `docs(p02-t01): inventory and approve the information migration`.

## Proposed destinations

- Home remains overview; seven primary labels in order: Getting Started, Skills, Workflows, Provider Sync, Docs Tooling, Reference, Contributing.
- Quickstart/bootstrap/tool packs/concepts → Getting Started. Existing CLI Utilities router supplies its unique preserved guidance; User Guide is the sole explicit router consolidation into Home.
- Current Skills index/Explainer Kit/Repo Improve/Recon → top-level Skills. Sidebar contains owned guides only; body/catalog discovers Workflows/Docs Tooling families. No catalog or new skill prose lands now.
- Workflows → Choose a Workflow, Projects, Ideas, Backlog and planning, Waves, Advanced. The existing workflow overview becomes the choose-workflow leaf with its headings/prose intact; a new canonical Workflows index reuses `/workflows` deliberately, not as an alias.
- Projects retains lifecycle; real planning/execution/reviews/closeout directories own their guides. Existing Reviews guide becomes `projects/reviews/index.md`, retaining all headings/prose and adding only Contents for its children. This avoids Reviews → Reviews duplication.
- Project Log → Projects execution. Configuration/local state/artifact/state contracts → Reference. Backlog/remote planning → Workflows Backlog and planning; wave guide → Waves.
- Dispatch/autonomy/Cursor Cloud/programmatic execution/orchestration/evidence/gates → Advanced. Provider Sync, Docs Tooling and Contributing physical owners remain.
- `repo-analysis.md` is actual repository-wide PR-comment CLI analysis, not research/knowledge indexing. Proposed owner: `reference/repository-pr-comments.md`; Skills Review-family body discovery may link there. Root prefers it; Fable/map approval is pending.

The map enumerates 70 source pages: 33 retained paths, 36 moves, one consolidation; seven new router indexes and promotion of the existing Reviews leaf. Expected 76 authored pages after apply, subject to reviewed corrections. Intentional old-route absence excludes canonical roots reused by new section indexes. No aliases, redirects or transitional stubs.

## Normalization and router exceptions to review

840 parsed page/heading units protect all original content, including preambles, with raw and normalized SHA-256. The 824 ordinary units must match at named destinations; headings and all non-URL bytes remain protected. URL normalization replaces only actual micromark destination-string tokens matched to parsed/inventoried link/image/definition owners and decoded URLs with original page IDs, retaining queries/fragments. Missing, ambiguous or mismatched tokens fail explicitly. Original frontmatter is separate exact evidence; listed title changes are Home, Getting Started, Choose a Workflow and Projects. No arbitrary paragraph stripping, broad whitespace cleanup or whole-site semantic extraction.

Sixteen router units have explicit source text/link accounting, not a blanket exclusion. Each of the 70 non-Guide Contents list items has exact source text/line and a concrete disposition: 69 retain their unique description at a named anchor/entry target/label; Home's compatibility entry is the single exception. The guide consolidation separately lists every nonblank sentence/bullet and source line. `routeOnlySupersessions` distinguishes two Guide status sentences (`guide/index.md:8` and `:18`) from the separate Home compatibility-router entry (`index.md:19`). Only these three specific route-only items are proposed superseded by the existing explicit user URL-break/no-stub decision. Adoption-lane intent, new-authoring guidance, canonical capability descriptions, retired-bucket direction and Concepts entry survive. The repeated Concepts item is an explicit exact duplicate. Non-author/Fable must confirm this narrow interpretation before any move.

Adding an index Contents block/new router introduction must be recorded as an addition, not treated as a missing baseline fact or excuse to rewrite its surrounding section. For Reviews promotion, compare original protected section bytes separately from the new Contents addition; any necessary separator byte is an individually inventoried addition, not a broad normalization rule. Later existing-prose rewrites/removals require their own pre-edit fact ledger and non-author verification.

## Capability/source proof

| Surface                         | Captured result                                                               | Evidence boundary                                                                                                                              |
| ------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Docs                            | 70 pages, 11 indexes, 840 units, 477 parsed links, zero tracked assets        | exact git objects at source SHA; no unresolved inventory file target                                                                           |
| CLI                             | 162 registered nodes, 362 explicit option declarations, one alias             | real createProgram/registerCommands; constructors only, no operational action invocation                                                       |
| Framework/global CLI behavior   | actual `-h, --help`, implicit `help [command]`, root version/json/verbose/cwd | real root createHelp/visibleOptions/visibleCommands/helpInformation; no invented per-command duplication                                       |
| Supported configuration catalog | 110 entries with declared defaults/type/scope/file/mutability                 | read-only branch config describe, real CONFIG_CATALOG/runDescribe                                                                              |
| Structural configuration        | 296 declaration field/pattern records                                         | TypeScript checker over shared/local/user/sync types; supported catalog keys distinguished from structural/dynamic keys and consumer fallbacks |
| Skills                          | 83 canonical dirs; 71 eligible                                                | actual imported pack manifest plus source frontmatter; 4 non-invocable, 2 retired, 1 repository-only, 5 unshipped/uncertain exclusions         |
| Live consumers                  | 38 candidate files; historical evidence separately retained                   | repository-wide source/hosted/path sweep, including real tests/templates and stale existing consumers                                          |
| Public README links             | 17 hosted occurrences in five READMEs                                         | root9, CLI5, each docs package1; previously published npm content awaits separate release                                                      |

P01 changed ten docs files but added/deleted no pages. Five owned-label repairs and new authoring/generated-output guidance are explained in content-baseline.md. Literal mention evidence does not prove semantic coverage: 16 command nodes and 40 catalog entries remain named candidate gaps for p06, including hidden/internal/dynamic distinctions. Every eligible skill name occurs somewhere, not necessarily at a useful scenario anchor.

## Canonical analyze execution

Actual artifact: `.oat/repo/analysis/docs-2026-10-02-0644.md`. Canonical branch analyze version 1.6.1, full current surface despite stale prior tracking delta. `.oat/config.json` and app instructions identify Fumadocs/authored source/generated inventory correctly. Shared tracking read was performed; PJM doctor shows adoption declared, with unrelated backlog warnings retained. Tracking is not written before intrinsic review.

Read-only branch config get returns `workflow.autoArtifactReview.analysis=true`, default source, exit0. Shared review-loop retry bound defaults to2. Root completed the artifact-only structured review; receipt `references/docs-analysis-review-01.json` binds artifact SHA-256 `d8603c7f8b8ce03809a1b6c7e1c460052e97f321a9c4b0d8d68ff522d705fa33`. One Low residual was offered: 40 scoped catalog entries represent 39 distinct keys. Root disposition is reviewed with this residual, not a clean pass; artifact bytes remain unchanged and no retry is consumed. This implementer launched no reviewer and performed no analysis tracking write. Non-author normalization/accounting recheck and Fable map review additionally remain pending.

Only after that review completes does root run the canonical helper's verified docs tracking write. The eventual apply uses this authorized project branch rather than creating another branch; that plan-approved adaptation must be recorded before t02. Branch nav/index commands, never the released stale binary, own new source behavior.

## Tests and prevention evidence

New source-target validation is a small refactor of existing link/fragment resolution, shared with live-page validation and later reusable consumer checks. Tests are self-contained temporary sources, not copied migration inventories. It protects stale external consumer paths and fragments at the source-target boundary; existing page-only tests did not exercise explicit non-page consumer targets. Known literal fixture headings and missing files are the oracle. No test-only hook or project-artifact CI input is added.

- `pnpm docs:test`: exit0, **9 executed / 9 passed**, no Turbo replay (`/tmp/docs-p02-t01-tests.log`).
- Rejection-guard neutralization, focused migration tests: exit1, the stale-route and missing-fragment cases fail with **Missing expected rejection**; valid control passes (`/tmp/docs-p02-t01-negative-control.log`). Guard restored immediately; no temporary mutation retained.
- Restored focused migration tests: exit0, **3 executed / 3 passed** (`/tmp/docs-p02-t01-restored-control.log`).
- Exact baseline generator: exit0, explicit counts and no unresolved file targets (`/tmp/docs-p02-baseline.log`).
- Final formatted app check/types/source validation/output check and disposable source-only proof: receipts appended below after execution; no green claim based on incomplete setup.

## Disposable project/output-absent control

Scratch tree: `/tmp/docs-p02-pristine-6lOMe5`, created from `git archive HEAD` with `.oat/projects` excluded; only the draft validator/test files overlaid. Offline frozen-lockfile install with scripts ignored exits0. No app generated metadata, sidecar, .source or out is copied. This is a disposable checkout-source fixture, not another feature branch/worktree or source writer.

Scoped Turbo prerequisite build fails before task execution with `I/O error: Is a directory (os error21)`; one no-edit isolated-HOME/force rerun fails identically. No unrelated Turbo/environment repair or successful cache evidence is claimed. First direct prerequisite sequence builds control-plane (exit0), then docs-config fails (exit2) because docs-transforms is not yet built. Corrected dependency order is docs-transforms → docs-config → docs-theme → CLI, using each existing package build script. This is setup evidence, not a source defect or post-commit recovery attempt. Final app check/direct tests and absence assertions must all pass before claiming pristine proof.

## Completed scoped verification receipts

All final main-checkout commands ran directly rather than through cached Turbo tasks: artifact/source formatter exit0; `pnpm --filter oat-docs check` exit0 (oxlint, formatting, markdownlint over70 pages and source validation); `pnpm --filter oat-docs type-check` exit0; `pnpm docs:test` exit0, nine executed/passed; `git diff --check` exit0. Logs: `/tmp/docs-p02-t01-final-{format,app-check,type-check,tests}.log`. The additional one-time evidence-script oxlint initially finds12 local style errors; they are corrected before commit, not reported as phase recovery.

Disposable proof now passes: direct control-plane build0; correctly ordered docs-transforms/config/theme/CLI builds0; `pnpm --filter oat-docs check`0; `pnpm docs:test`0 with nine executed/passed; project absence0 and generated app output absence0 after both checks. Exact receipts: `/tmp/docs-p02-pristine-direct-receipts.txt`; empty forbidden-output listing `/tmp/docs-p02-pristine-generated-paths.txt`. Earlier Turbo failures and the first wrong direct dependency order remain visible in the receipts/setup discussion, not converted to passes. The final proof is source-only and does not create metadata, sidecar, .source or out in the app.

The actual Commander root version getter returns0.3.13, with `-V/--version`, `--json`, `--verbose`, `--cwd` explicitly registered; automatic `-h/--help` and `help [command]` are captured once from the actual framework help model. Supported config defaults include the real110-entry catalog plus separate missing-file shared/local/user base declarations and exported sync defaults, not inferred consumer fallbacks.

Final artifacts are re-formatted after the last evidence capture. No task has been committed, root core tracking is unchanged, all source docs retain their baseline paths and bytes, and no verified tracking write has occurred.

## Required root handoff

1. Inspect exact destinations, narrow normalization, Guide consolidation and Reviews landing.
2. Recheck the bounded M1/M2 corrections with the same independent normalization/router-accounting reviewer; intrinsic structured analysis review is already complete with the disclosed Low residual.
3. Obtain Fable map review, without claiming consumption of queued advisory messages.
4. Root performs reviewed tracking/bookkeeping through canonical ownership; authorize this same phase handle to complete the one planned t01 task commit only after approved evidence is durable.

No task/phase completion, Fable approval, applied map, publication, release, final visual QA or new recovery event is claimed in this draft handoff. Full eight root gates remain phase-closeout responsibility.

## M1/M2 pre-commit correction receipts

Continuation `cont-docs-overhaul-p02-draft-correction-1` released at root-bookkeeping HEAD `c7cb1ab65132fde4f20ad9624433e9a6fad27de7`. Exact source baseline remains `8b78d9a935b31ef50e65713b03a022a5d022aa59`; no source docs, core artifacts, analysis artifact, versions or permanent app code/tests changed in this correction. This is prevention before the first planned task commit, not post-commit recovery.

M1 adds project-local `destination-spans.mjs` and `normalization-controls.mjs`, never imported by permanent CI. The helper uses real micromark destination-string tokens from remark-parse's installed dependency closure; owner type/start/end must match the actual remark link/image/definition node and decoded URL. No first-substring matching remains. Eight literal controls cover repeated labels/titles, images, definitions, angle destinations, escaped/entity destinations and nested image ownership. The literal pre-fix wrong result is rejected; the corrected extractor accepts an actual destination-only rewrite while retaining the identical label/prose, rejects a label mutation, and fails mismatched parsed URLs. The sweep checks all 477 actual links, records all 17 real first-substring collisions, and verifies 70 exact source page hashes plus all 840 recaptured section hashes. Oracle values are explicit literal strings and baseline git objects, not generated destinations alone.

M2 records Home `index.md:19` exactly: `- [User Guide](guide/index.md) - Legacy compatibility router for old guide links while content continues moving into the canonical sections below.` Only this compatibility-router list entry is superseded; the two separately enumerated Guide sentences remain distinct. The explicit existing no-alias decision is the authority, with root's independently checked interpretation and pending reviewer/Fable validation. Each retained router description now has a concrete owner-anchor/entry target/label; no unresolved parent-or-body choice or blanket router exclusion remains. Skills' cross-owner Writing Skills/Docs Workflows entries go to `skills/index.md#related-guides`; old workflow Contents stays at `workflows/choose-workflow.md#contents`.

Reproduce with `node .oat/projects/shared/docs-improvement-overhaul/references/normalization-controls.mjs`; its machine-readable output is retained in `references/normalization-controls-receipt.json`. Add `--legacy-negative-control` to run a disposable copied helper neutralized to the pre-fix first-substring algorithm: the child exits1 at the literal repeated-label assertion while the wrapper exits0 only after confirming that intended failure. The actual bad/expected strings and child stderr are retained in `references/normalization-negative-receipt.json`; no checkout source is mutated. Capture command is unchanged. Final capture exits0; direct `pnpm docs:test` exits0 with nine executed/passed and no Turbo replay; scoped script lint exits0 with no warnings/errors. Logs: `/tmp/docs-p02-correction-{capture-final,source-tests,format-final,lint-final}.log`. Final post-format control/source-hash/format receipts are recorded in `references/draft-correction-receipts.json` before handoff. No full gates, builds, generated app output or moves are part of this bounded correction.
