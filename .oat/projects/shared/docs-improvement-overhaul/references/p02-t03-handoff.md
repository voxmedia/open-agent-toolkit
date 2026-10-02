# p02-t03 Consumer Repair Evidence

## Scope and Conservation

The five README surfaces retain exactly 17 hosted docs occurrences, with no baseline-count drift. All are individually mapped from source URLs to current authored pages and built export routes; fragment IDs are checked against the actual HTML. Four occurrences change: root Start Here, root Agentic Workflows, and root/package CLI Utilities. Broad CLI discovery targets Reference General CLI Adoption Guidance, not an onboarding relabel. Published npm README links remain stale until a separately authorized package release; no deployment, publication or remote-health check is claimed.

The canonical `oat-docs` topic table now has 14 real paths across 13 existing rows. Existing examples/citations use current owners. `oat-doctor` citations retain exact page-heading guidance with moved paths. Gap-review Quickstart and already nonexistent `docs/cli` citations point to verified current CLI Reference/linked owners. Each of these three canonical skills has one version increment above current `origin/main`: `oat-docs` 1.0.3 → 1.0.4, `oat-doctor` 2.0.2 → 2.0.3, gap-review 1.2.1 → 1.2.2. Provider Cursor's retained runbook path already resolves and is unchanged. All five public versions remain root-coordinated 0.3.14.

Mechanical existing consumers also include `.agents/README.md` and both app AGENTS Quickstart pointers. Five derived CLI test consumers receive only real-file path or real Home Contents expectation changes: Fumadocs nav, post-implement, retro, Git support, and skill contracts. The per-occurrence ledger and exact skill citation diffs are in `p02-t03-consumers.json`; no production nav/compiler logic or existing assertions are weakened. Archived blocked-plan evidence and synthetic transform examples are intentionally not rewritten.

No authored docs page changes in this task. All 816 protected hashes and router accounting remain identical to accepted t02 proof. The one reviewed CLI table-format supplement remains phase-local; permanent scripts/tests read neither it nor project artifacts. The source app index and bundles were regenerated from canonical owners. All 76 bundled Markdown pages match source hashes; all 71 manifest-listed bundled skill entrypoints match source, and generated nav metadata/sidecars are excluded.

## Testing Value and Negative Controls

Permanent validation reads live source only: the canonical skill's Topic Area table plus hosted links in the five README surfaces. It resolves pages, directory landings and actual Markdown anchors without `out`, `.source`, sidecars, migration maps, baseline hashes or `.oat/projects`. Temporary fixtures protect two distinct consumer boundaries not previously enrolled: skill topic routing and hosted README routing. Literal expected leaf/landing/fragment targets and captured current source establish independent oracles.

`p02-t03-controls.json` records three isolated guard-neutralization probes. Omitting topic target validation, allowing a hosted missing-route fallback, or disabling fragment validation makes the intended rejection tests fail with Missing expected rejection. Restored source passes. These probes never mutate the live validator. Initial scratch setup failed because its temporary tsconfig lacked `baseUrl`; that setup failure is not counted as a capable control. The corrected run is the receipt.

`p02-t03-pristine.json` separately captures the actual pre-t03 archive with stale live skill/README inputs: the original source check accepts them; the new topic and hosted guards reject those same inputs for the intended missing targets. The task-diff pristine control passes with the entire project directory and generated docs output absent before and after. Existing installed/built upstream dependencies are linked into the disposable control; no fresh install/build is claimed. A direct app check creates no metadata, sidecar, `.source`, `.next` or export output.

## Executed Verification

- Formatting, docs validation, app check/type-check and 12 direct docs tests pass.
- Five direct CLI consumer suites execute 386 tests, all passing; no Turbo test cache replay.
- Required `pnpm lint` and `pnpm format` pass; scoped evidence lint and `git diff --check` pass.
- Canonical bundle generator and branch app-index generation pass; generated tracked index/version asset are unchanged.
- Docs build executes the app freshly with five cached dependency results, not six fresh tasks.
- Actual export/search route validation passes. Declared local crawl visits 76 pages, checks 867 links and finds zero broken links, with external checks disabled.
- Required final p02 native Mini smoke is in `reviews/p02-browser-smoke.md`, with a cropped screenshot and exact mapped README target/provenance. This is not final independent QA.

Root owns the eight ordered phase-closeout gates, review dispatch, canonical apply tracking, project bookkeeping and publication. This handoff does not claim those lifecycle actions completed. No post-commit recovery attempt has been consumed; all corrections so far are precommit prevention.
