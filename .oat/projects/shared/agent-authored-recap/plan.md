---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-09-10
oat_phase: plan
oat_phase_status: in_progress
oat_plan_parallel_groups: [] # fully sequential: every phase touches the explainer-kit tree or its consumers
oat_plan_source: spec-driven # spec-driven | quick | imported | lite
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: agent-authored-recap

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** The Explainer Kit works again for every caller because the host agent authors the artifact: project recap at completion, program recap at program close, project explainer at plan approval, and a person invoking the core skill on any inputs. The callback orchestration, the durability/S3-publish path, and the explainer release-candidate tooling are retired with nothing left referencing them, and the last phase generates the recap for the 2026-08-31 execution program (spec FR1–FR12, NFR1–NFR5).

**Architecture:** Three core scripts (`.agents/skills/explainer-kit/scripts/{bundle,verify,record}.mjs`) around one authoring step by the host agent, a three-rung browser ladder, a small run package under a v2 manifest, and a thin adapter (`.agents/skills/oat-explainer-kit`) that resolves OAT inputs, theme, output root, and intent. Design § Retained and retired inventory is the authoritative partition; design § Migration Plan (six items) is the authoritative list of acceptance changes.

**Tech Stack:** Node 22 ESM (`.mjs` skill scripts, `node --test`), TypeScript CLI (`packages/cli`, vitest), markdown skills and docs, oxfmt/oxlint.

**Commit Convention:** `{type}({scope}): {description}` — e.g. `feat(p01-t05): add bundle.mjs`, `refactor(p01-t13): retire the core orchestrator`.

## Planning Checklist

- [x] Defer HiLL checkpoint confirmation to oat-project-implement
- [x] Evaluated phases for parallelism opportunities (none: every phase edits the explainer-kit tree, its consumers, or files a previous phase created)
- [x] Set `oat_plan_parallel_groups` in frontmatter (`[]`)
- [x] Phase gate review: disabled (user declined); Phase gate review remains disabled. (Operator's standing preference: no phase gates; plan gate and final review only.)
- [x] Lifecycle gate posture: every configured gate kept; `oat_skill_gate_overrides` absent.

---

## Parallelism

Fully sequential (`oat_plan_parallel_groups: []`): every phase edits the explainer-kit tree, its consumers, or files a previous phase created, so no two phases are file-disjoint.

---

## Conventions for every task

- Work only in this worktree. Scratch under `mktemp -d`; never `rm -rf` a variable path.
- **Phase-boundary invariant** (design § Migration Plan): at the last task of each phase the full gate list is green (`pnpm check`, `pnpm type-check`, `pnpm test`, `pnpm build`, `pnpm run check:skill-bumps`, `pnpm release:check-versions`, `pnpm release:validate`, `pnpm build:docs`; capture each exit code; forced test run `HOME=$(mktemp -d) pnpm exec turbo run test --force` plus `pnpm test:smoke`, `pnpm test:skills`, `pnpm test:scripts` after `pnpm build`) and no executable, test, or configuration file references a missing module or symbol. Within a phase, task commits may be intermediate; each deletion task removes a module together with its last executable reference, wherever that reference lives.
- **Deletion tasks** are non-TDD: the "test" is the import sweep named in the task. Run `pnpm lint` and `pnpm format` for every task that touches `.agents/skills`, `tools/smoke`, or `packages/control-plane`.
- **Negative controls**: where a task says "prove it can fail", neutralize the guard, run the named test, confirm red, restore, and record the observation in the task's commit body.
- Never oxfmt `state.md`. Locate test pins by their old literal, not by line number; line numbers in this plan are anchors from the design at head `c6a40c58a` and shift as tasks land.
- **Prove before deleting:** Phase 1 lands the new flow first (p01-t01 to p01-t08) and proves one real `bundle → author → verify → record → archive-check` path on tracked real material (p01-t09) before any deletion task runs; no task from p01-t10 on starts until p01-t09 is green.
- Skill bumps are PR-scoped: bump each changed skill's `metadata.version` once, in the phase that first changes a non-test bundled file (p01-t17 for `explainer-kit` and `oat-explainer-kit`; p03-t08 for every other skill, since Phase 1 touches only their `tests/`, which the bump validator skips), and move the version pins with them. The complete pin inventory at head `c6a40c58a`: `explainer-kit` / `oat-explainer-kit` at `skills.test.ts:1491-1492`; `oat-project-implement` at `skills.test.ts:2122,2603,2912,3001,3493,4701,6024,8140`; `oat-project-complete` at `skills.test.ts:4704` and `review-skill-contracts.test.ts:1406`; `oat-project-lite` at `skills.test.ts:2114` (locate by the adjacent `skillName: 'oat-project-lite'`, since `'1.1.2'` also belongs to other skills); `oat-project-summary` at `:3184`, `:7925`; `oat-project-document` at `:3185`, `:7926`; `oat-project-pr-final` at `:3186`, `:4702`; `oat-project-quick-start` at `:2105`, `:3187`, `:6009`, `:7002`; `oat-project-plan` at `:2097`, `:6008`; `oat-wave-program`, `oat-wave-execute`, and `oat-project-autonomous` have no version pins (their old literals collide with other skills', so never locate a pin by literal alone).

---

## Phase 1: The cut — core flow, contracts, and retirement

Deliverable: the new core flow exists, is tested browser-free, and is proven end to end on real material before any deletion; the retired core, adapter scripts, CLI loaders, config keys, release tooling, smoke tests, and their tests are gone; the archive command validates the v2 package; gates green.

### Task p01-t01: Trim `contracts.mjs` to the three kept contract kinds

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`, `.agents/skills/explainer-kit/tests/contracts.test.mjs`

**Step 1: Write test (RED)** — rewrite `contracts.test.mjs` to cover only: `validateContract('fact-base')` accepts a fixture with the eight required keys, `mode: supplied`, `freshnessPolicy: live-wins`, `sources[] = { id, kind: 'file', locator, hash }`, citations `{ sourceId, locator }` (design § bundle.mjs), and rejects a citation carrying `path`; `validateContract('theme')`; `canonicalHash` / `canonicalStringify` determinism; `validateContract('run-request')` throws "unknown contract kind". (The `manifest` cases land in p01-t04.) Run `node --test .agents/skills/explainer-kit/tests/contracts.test.mjs` → red on the unknown-kind case.

**Step 2: Implement (GREEN)** — `SCHEMA_FILES` becomes `{ 'fact-base', manifest, theme }`; delete `validateSourceBacklinks` (the call at `:128`, the function `:132-171`) and the `source-backlinks.mjs` and `s3-roots.mjs` imports (`:4-7`, `:9-12`; the `safe-paths.mjs` import at `:8` stays); delete `validatePublicationRoots` (`:484-583`) and every run-request / set-plan / author / visual-review / terminal-evidence / publish / build-record validation branch (`:620-950`, the `run-request` branch starting at `:620`; the manifest cross-record block `:955-1139` is replaced in p01-t04); exports become `validateContract`, `canonicalHash`, `canonicalStringify`, `isVerifiablePublishReceipt` deleted. Run the test → green.

**Step 3: Verify** — `grep -n "source-backlinks\|s3-roots\|set-plan\|visual-review\|author-request\|terminal-evidence\|publish-\|run-request\|build-record" .agents/skills/explainer-kit/scripts/lib/contracts.mjs` → empty.

**Step 4: Commit** — `git commit -m "refactor(p01-t01): trim contracts.mjs to fact-base, manifest, theme"`

---

### Task p01-t02: Trim the recipes, the recipe loader, and the briefs

**Files:**

- Modify: `.agents/skills/explainer-kit/recipes/project-recap.v2.json`, `.agents/skills/explainer-kit/recipes/program-recap.json`, `.agents/skills/explainer-kit/recipes/project-explainer.json`, `.agents/skills/explainer-kit/recipes/engineer-tour.json` (each to `schemaVersion`, `id`, `version`, `sourceRoles`, `floor[]` with `id`, `type`, `template`, `requiredNarrative`, `briefRef` only; `authoring`, `required`, `expansion`, `discoveryLimits`, `fallback` removed), `.agents/skills/explainer-kit/scripts/lib/recipes.mjs` (`RECIPE_FILES` drops `project-recap.v1.json`; exports `RECIPES`, `loadRecipe`, `recipeFloor`, `recipeRequiredNarrative`; `validateRecipe` retained as an internal for the trimmed shape; delete `selectRecipeAuthoring`, `resolveDiagramRenderingRoute`, `recipeExpansion`, `evaluateExpansionProposals`, `validateSourceBindings`, `validateContentModel`, `validatePlannedPortfolio`, `shouldStopDiscovery`), `.agents/skills/explainer-kit/tests/recipes.test.mjs`
- Delete: `.agents/skills/explainer-kit/recipes/project-recap.v1.json`, `.agents/skills/explainer-kit/briefs/deep-dive.md`, `.agents/skills/explainer-kit/briefs/project-page.md`, `.agents/skills/explainer-kit/briefs/supporting-diagram.md`, `.agents/skills/explainer-kit/briefs/walkthrough-deck.md`

**Step 1: Write test (RED)** — `recipes.test.mjs` keeps only: the four recipes load; each `floor[0]` has `template` naming an existing `templates/*.html` and `briefRef` naming an existing brief; `recipeRequiredNarrative` reproduces the design's lists (`project-recap` six sections, `program-recap` six, `project-explainer` five); `validateRecipe` rejects an `authoring` key. Run → red.

**Step 2: Implement (GREEN)** → green.

**Step 3: Verify** — `ls .agents/skills/explainer-kit/briefs` = engineer-tour, program-recap, project-explainer, project-recap; `node -e "import('./.agents/skills/explainer-kit/scripts/lib/recipes.mjs').then(m=>console.log([...m.RECIPES.keys()]))"` prints four keys.

**Step 4: Commit** — `git commit -m "refactor(p01-t02): trim recipes to floors and briefs"`

---

### Task p01-t03: Trim `qa.mjs` and rewrite the kept QA, theme, safety, and schema tests

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/qa.mjs` (keep `REPRESENTATIVE_WIDTHS`, `BROWSER_PROBE_EVALUATE`, `checkSourceDumping`, `checkHtmlStructure`, `checkArtifactCohesion`, `pngDimensions`; keep `runBrowserProbes` trimmed to its probe loop and finding rules (`:527-790`: drop the `browserSession` / `requireEvidence` / evidence-retention branch, `retainBrowserEvidence` `:838-906` with its six `browserSession` references, `browserEvidenceId`, `viewportName`; keep `validateProbeResult`, `keyboardPassed`, `browserScenarios`, `representativeHeight` as its private helpers); delete `checkGuidelines`, `renderQaWarningIds`, `renderWarningIds`, `auditArtifactSet`, `addExpansionWarnings`, the `visual-review.mjs` import, and the warning-id tables only they used; `checkArtifactCohesion` emits `cohesion-ledger-empty` only when all three groups are empty), `.agents/skills/explainer-kit/tests/qa.test.mjs`, `.agents/skills/explainer-kit/tests/html-safety.test.mjs` (keeps `findUnpinnedResourceRefs`, `validateHtmlSafety`, `coreScriptHashes` cases against `templates/`), `.agents/skills/explainer-kit/tests/theme.test.mjs` (drop `initializeRun`), `.agents/skills/explainer-kit/tests/visual-matrix.test.mjs` (theme CSS across styles/palettes/profiles without `render.mjs`), `.agents/skills/explainer-kit/tests/schemas.test.mjs` (name map = fact-base, manifest, theme)

**Step 1: Write test (RED)** — `qa.test.mjs`: cohesion with a ledger whose `statuses` group is empty passes (`cohesion-ledger-empty` absent); all three empty fails; term keyed by term; `checkHtmlStructure` reports `external-asset`; `pngDimensions` on `fixtures/png.mjs`; `runBrowserProbes` with a fixture probe returning `clippedX` entries reports `inner-x-overflow` and with a clean result reports none. Run `node --test .agents/skills/explainer-kit/tests/qa.test.mjs` → red on the relaxed rule.

**Step 2: Implement (GREEN)** → green. **Prove it can fail:** restore the old any-group-empty rule, the new case goes red, restore.

**Step 3: Verify** — `grep -n "visual-review\|auditArtifactSet\|runBrowserProbes\|render.mjs\|browserSession\|visualCritic\|retainBrowserEvidence" .agents/skills/explainer-kit/scripts/lib/qa.mjs .agents/skills/explainer-kit/tests/theme.test.mjs .agents/skills/explainer-kit/tests/visual-matrix.test.mjs` → empty; `node --test .agents/skills/explainer-kit/tests/qa.test.mjs .agents/skills/explainer-kit/tests/html-safety.test.mjs .agents/skills/explainer-kit/tests/theme.test.mjs .agents/skills/explainer-kit/tests/visual-matrix.test.mjs .agents/skills/explainer-kit/tests/schemas.test.mjs` → green.

**Step 4: Commit** — `git commit -m "refactor(p01-t03): trim qa.mjs and the kept core tests"`

---

### Task p01-t04: Manifest v2 schema and package rule v3

**Files:**

- Modify: `.agents/skills/explainer-kit/schemas/manifest.schema.json` (design § Data Models: `schemaVersion` const `explainer-kit.manifest/v2`; required `schemaVersion, runId, slug, recipe, createdAt, mode, source, theme, artifacts, immutableHashes, outcome, warnings`; `mode` enum `unattended | interactive`; `source` required `factBasePath, factBaseHash, inputHashes` and nothing else; `theme` `{ path, hash }` (no `derived`); `artifactEntry` required `id, type, contentPath, hash, status`, `status` enum `built | failed`, no `renderedPath`/`rebuildable`/`rebuild`/`durableEvidence`/`failure`; `outcome` enum `built | built-needs-review | failed | incomplete`; no `buildRecord`; `additionalProperties: false` throughout), `.agents/skills/explainer-kit/scripts/lib/contracts.mjs` (the manifest cross-record block becomes: every `immutableHashes` key must be a safe relative path; `theme.path` and every artifact `contentPath` must be `immutableHashes` keys; `artifacts[].hash === immutableHashes[contentPath]`; `theme.hash === immutableHashes['theme.resolved.json']`), `.agents/skills/explainer-kit/scripts/lib/package-coverage.mjs` (`PACKAGE_COVERAGE_VERSION = 'explainer-kit.package-coverage/v3'`; `requiredImmutablePackagePaths(manifest)` = `theme.resolved.json`, `source/fact-base.json`, `source/fact-base.md`, `source/ledger.json`, `qa/result.json`, each artifact `contentPath`; `permissibleRunPackagePaths(manifest)` = `immutableHashes` keys ∪ `manifest.json`; `validateImmutablePackageEvidence` keeps only the coverage check; `enforceRunPackageInventory` keeps the exact-inventory rule; delete `SUCCESSFUL_OUTCOMES`, `SET_PLAN_RECORD_PATHS`, the review-material predicates, and the `browser-runtime.mjs` import), `.agents/skills/explainer-kit/tests/contracts.test.mjs` (manifest cases), new `.agents/skills/explainer-kit/tests/package-coverage.test.mjs`
- Delete: `.agents/skills/explainer-kit/schemas/build-record.schema.json`, `.agents/skills/explainer-kit/schemas/run-request.schema.json`

**Step 1: Write test (RED)** — manifest v2 fixture accepted; v1 `schemaVersion` rejected; `buildRecord` key rejected; `theme.hash` mismatch rejected; artifact hash mismatch rejected; `requiredImmutablePackagePaths` equals the six paths for a one-artifact manifest; `enforceRunPackageInventory` rejects an extra file and a missing required file. Run → red.

**Step 2: Implement (GREEN)** → green. **Prove it can fail** for the v1-rejection and the extra-file cases.

**Step 3: Verify** — `grep -n "build-record\|run-request\|content-approval\|set-plan\|qa/browser\|visual-review\|built-durable\|built-not-durable" .agents/skills/explainer-kit/schemas/manifest.schema.json .agents/skills/explainer-kit/scripts/lib/package-coverage.mjs .agents/skills/explainer-kit/scripts/lib/contracts.mjs` → empty.

**Step 4: Commit** — `git commit -m "feat(p01-t04): manifest v2 and package rule v3"`

---

### Task p01-t05: `bundle.mjs` — allowlisted inputs, fact base, and the anchor-fact ledger

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/bundle.mjs`, `.agents/skills/explainer-kit/tests/bundle.test.mjs`, `.agents/skills/explainer-kit/tests/fixtures/bundle/` (a minimal OAT project with `summary.md`, `implementation.md`, `plan.md`, `project-log.md`, `state.md`; a three-document directory; a supplied fact base). The fixture markdown sits inside `format:root`'s oxfmt glob, so author it oxfmt-clean and make sure the fixture `state.md` frontmatter survives `oxfmt --write` (the never-oxfmt rule protects the real project's `state.md`, not fixtures).

**Step 1: Write test (RED)** — allowlists per recipe (project, project-explainer, program with the newest-export rule over a fixture `project-summaries/` holding `20260830-w1.md` and `20260909-w1.md`, documents); containment refusal on a symlink escaping the root; the fact base validates through `validateContract('fact-base')` with `mode: supplied`, `freshnessPolicy: live-wins`, `overrides: []`, sources `{ id, kind: 'file', locator, hash }`, citations `{ sourceId, locator }`; an unparseable input lands in `unresolvedClaims`; `source/ledger.json` has the three groups, ≤ 12 entries each, terminology starting with the project name and phase ids, dates folded into `numbers`, statuses from the plan's phase statuses; the documents case yields an empty `statuses` group; identical inputs → identical `inputHashes`; `theme.resolved.json` written from `--theme <resolved-json>` before authoring; the reuse test: a second `bundle` over identical inputs with a satisfied manifest present reports `reuse: true` and touches no file, while a changed input, a different `--recipe`, or a `failed` manifest rebundles; a retry after a bundle refusal deletes the stale `failure.json` first, so the run root never holds a stray file; `source/ledger.json` carries the fourth key `claims: [{ subject, value, kind, claimId }]` built by the row/sentence/heading subject rule (design § bundle.mjs) over numeric, date, and closed-vocabulary status tokens, with a fixture derived from real material (`.oat/repo/reference/external-plans/2026-08-31-execution-program.md` and two wave summaries, provenance recorded in the fixture header) whose expected pairs are hand-checked; `fact-base.json` carries no index. Run `node --test .agents/skills/explainer-kit/tests/bundle.test.mjs` → red.

**Step 2: Implement (GREEN)** — CLI `node bundle.mjs --recipe <id> (--project <dir> | --program <artifact> --summaries <dir> --archive <dir> | --inputs <path>... | --fact-base <path>) --theme <resolved-json> --out <run-root>` — all four input modes land here with tests (the `--fact-base` end-to-end case and the missing `--out` usage refusal included), so p04-t01 touches no script; functions `collectInputs(recipe, inputs)`, `extractClaims(input)`, `indexClaims(claims)` (the subject rule), `selectAnchorLedger(claims, recipe)`, `writeBundle(runRoot, factBase, ledger, theme)`, `findReusableRun(outputRoot, recipe, inputHashes)`, `writeFailure(runRoot, stage, cause)` (shared with `verify.mjs`, used for `stage: core` by the adapter prose and `stage: bundle` here); writes to a temp dir and renames into `<run-root>/source/` (design § Error Handling). → green. **Prove it can fail:** disable the containment check → the symlink case goes red; restore.

**Step 3: Verify** — `node --test .agents/skills/explainer-kit/tests/bundle.test.mjs` green; `pnpm lint && pnpm format`.

**Step 4: Commit** — `git commit -m "feat(p01-t05): add bundle.mjs with the anchor-fact ledger"`

---

### Task p01-t06: `record.mjs` — manifest v2 and the checked-in archive fixture

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/record.mjs`, `.agents/skills/explainer-kit/tests/record.test.mjs`
- Create: `packages/cli/src/commands/project/archive/fixtures/v2-package/` (a package produced by `record.mjs` over the bundle fixture and a fixture `site/index.html` + `qa/result.json`, with `PROVENANCE.md`; p01-t08 consumes it — the archive command still rejects v2 at this task, so nothing here runs the archive vitest)

**Step 1: Write test (RED)** — `record.mjs --run-root <dir> --recipe <id> --slug <s> --mode unattended --theme <resolved> [--run-id <id> --created-at <iso>]` (the two optional flags are the determinism seam the parity check needs; omitted, they default to a fresh id and now) writes `manifest.json` that validates through `validateContract('manifest')` (hashing the `theme.resolved.json` `bundle.mjs` wrote); a `qa/result.json` whose `artifactSha256` differs from the current `site/index.html` hash is rejected with `record-qa-stale` (QA for different HTML bytes never records); a run root holding `failure.json` is rejected with `record-failure-present`; `immutableHashes` covers exactly the package table minus `manifest.json`; `outcome` follows `qa/result.json` (`checks` all pass + rung host|playwright + `visual.verdict === 'pass'` → `built`; rung none, or a browser rung with `visual.verdict === 'findings'` → `built-needs-review` with `reason`; any fail → `failed` with a sanitized cause containing no `/Users/` and no env value; missing `qa/result.json` → `incomplete`); the archive test accepts the checked-in package. Run → red.

**Step 2: Implement (GREEN)** → green. The test also includes a parity check that regenerates the package from the bundle fixture at test time with the checked-in `runId` / `createdAt` passed through `--run-id` / `--created-at` and asserts byte-equality with the checked-in copy, so the fixture cannot drift from `record.mjs`; a separate assertion validates the checked-in `manifest.json` through `validateContract('manifest')` directly, independent of `record.mjs`; and the fixture directory carries a `PROVENANCE.md` naming the generating task, the bundle fixture, and the `record.mjs` commit. **Prove it can fail:** make `record.mjs` omit `source/ledger.json` from `immutableHashes`, regenerate the fixture, run the archive test → red; restore `record.mjs`, regenerate, → green (a static fixture alone cannot fail).

**Step 3: Verify** — `node --test .agents/skills/explainer-kit/tests/record.test.mjs` green (the checked-in package validates through `validateContract('manifest')` and passes `enforceRunPackageInventory` at the library level; archive acceptance is p01-t08's).

**Step 4: Commit** — `git commit -m "feat(p01-t06): add record.mjs and the v2 archive fixture"`

---

### Task p01-t07: `verify.mjs` — browser-free checks, `extractRenderedClaims`, and the `none` rung

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/verify.mjs`, `.agents/skills/explainer-kit/tests/verify.test.mjs`, `.agents/skills/explainer-kit/tests/fixtures/verify/` (an authored page from `templates/house-style.html` over the bundle fixture; variants: missing section, foreign script, external `src`, a number absent from the fact base, a ledger anchor absent from the page)

**Step 1: Write test (RED)** — parse; required `<section id>` present and non-empty per `recipeRequiredNarrative`; `checkHtmlStructure` (reports `external-asset`); `checkSourceDumping`; `validateHtmlSafety` against the recipe's shell (foreign script → `shellScripts` fail); `extractRenderedClaims(html)` fixtures (terminology keyed term→term; numbers and statuses keyed by subject with normalized value; dates harvested as numbers); ledger→page via `checkArtifactCohesion` (`cohesion-claim-unobserved` on the missing anchor); page→fact-base (bounded): numeric, date, and closed-vocabulary status tokens only, each with its row/sentence/section subject, matched against `ledger.claims`; on the real-material fixture a correct page passes and a page with two wave task counts swapped fails with `verify-claim-untraced` naming the token and subject; `qa/result.json` carries `visual: { verdict: 'none' }` on `--rung none`; `--rung none` (or runtime unavailable) writes `qa/result.json` with `rung: none` and the `RUNTIME_UNAVAILABLE_REASONS` value; the checks object has no `externalRequests` key. Run → red.

**Step 2: Implement (GREEN)** — CLI `node verify.mjs --run-root <dir> --recipe <id> [--rung host --screenshots <dir> --artifact-sha256 <hex> --visual-verdict pass|findings [--visual-notes <text>] | --rung none]`; a missing `site/index.html` writes `<run-root>/failure.json` (`stage: authoring`) and exits without `qa/result.json`, a crash inside verify writes it with `stage: verify`, and a malformed page (present but failing parse or sections) records the failing checks so `record.mjs` yields `failed`; the host and Playwright rungs are p02. → green. **Prove it can fail** for the page→ledger and the shell-script checks.

**Step 3: Verify** — `node --test .agents/skills/explainer-kit/tests/verify.test.mjs` green.

**Step 4: Commit** — `git commit -m "feat(p01-t07): add verify.mjs with both claim passes"`

---

### Task p01-t08: Archive command validates the v2 package

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts` (replace `isProjectRecapManifestV1` (~`:978-1056`) with a v2 key-set validator pinning `schemaVersion` to v2; delete `readVerifiedRunMode` (`:1342-1364`), `verifyProjectRecapTerminalEvidence` (`:1366-1389`) and its call sites (`:1471`, `:1564`, `:1628`), the `missingLegacyCoverage` / legacy-coverage branch (`:1428-1432`), the `qa/browser` and visual-review-chain checks; keep `verifyProjectRecapImmutableHashes`, the coverage call, `enforceRunPackageInventory`, the export re-verification (`:1538-1580`); drop the `runMode` threading that dies with `readVerifiedRunMode` (`:1420-1456` passes `{ runMode }` into `requiredImmutablePackagePaths` / `validateImmutablePackageEvidence`; read `manifest.mode` where mode still matters) and the `includeTerminalEvidence` option on `ExactRunPackageCoverage` (`:946`, `:952`) with its four call sites (`:1487`, `:1499`, `:1577`, `:1642`); rekey the artifact-hash check (`:1461-1467`) to `contentPath` and add the `theme.hash` cross-check; reject a selected run whose `outcome` is not `built` / `built-needs-review` or whose artifact `status !== 'built'` (Migration Plan item 6); `SUCCESSFUL_OUTCOMES`/`built-durable` strings gone), `packages/cli/src/commands/project/archive/explainer-package-coverage.ts` (`PACKAGE_COVERAGE_VERSION` v3; `runMode` dropped from its interface `:13`, `:18`), `packages/cli/src/commands/project/archive/archive-utils.test.ts` (recap fixture `:79-355` becomes a checked-in v2 package produced by p01-t06; every terminal-evidence and source-backlink case wherever it lives — the `loadExplainerTerminalEvidence` import `:46`, `:326`, `:1663`, `:2028`, `:2075`, `:2109`, `:2131`; `sourceBacklinks` at `:89`, `:102`, `:289`, `:2292`, `:2393` — deleted or rewritten; cases: accepted for `built` and `built-needs-review` in both modes; v1 fixture rejected (its outcome literal is `built-needs-review`, so the rejection is the `schemaVersion` and key set); `schemaVersion` v1 rejected; extra file rejected; `failed` outcome rejected; `theme.hash` mismatch rejected), `packages/cli/src/release/public-package-contract.ts` (`package-coverage.mjs` pin → v3 strings; delete the `source-backlinks.mjs` entries: the packed-file line `:98` and the whole packed-text object `:125-131`) and `public-package-contract.test.ts`, `packages/cli/src/validation/skills.test.ts` (`:1491-1509` v3 strings)
- Delete: `packages/cli/src/commands/project/archive/explainer-terminal-evidence.ts`, `packages/cli/src/commands/project/archive/explainer-source-backlinks.ts` (and their imports in `archive-utils.ts:56-60` and wherever `isCanonicalSourceBacklinks` was used, `:1026-1027`)

**Step 1: Write test (RED)** — the `archive-utils.test.ts` cases above against the checked-in package p01-t06 produced (`fixtures/v2-package/`; no temporary fixture). Run `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/archive-utils.test.ts` → red.

**Step 2: Implement (GREEN)** → green. **Prove it can fail** for: v1 rejection, extra-file rejection, `failed`-outcome rejection (Migration Plan items 2, 1, 6).

**Step 3: Verify** — `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive src/release src/validation/skills.test.ts` → green; `grep -rn "terminal-evidence\|source-backlinks\|readVerifiedRunMode\|built-durable\|qa/browser" packages/cli/src/commands/project/archive packages/cli/src/release` → empty.

**Step 4: Commit** — `git commit -m "feat(p01-t08): archive validates the v2 explainer package"`

---

### Task p01-t09: Prove one real path end to end before any deletion

**Files:**

- Create: `.agents/skills/explainer-kit/tests/flow.e2e.test.mjs`, `.agents/skills/explainer-kit/tests/fixtures/flow/` (a page the implementing agent authors once, by hand, from `templates/house-style.html` and the program-recap brief over the real bundle below; provenance header names the inputs and their commit)

**Step 1: Write test** — over tracked real material only (`.oat/repo/reference/external-plans/2026-08-31-execution-program.md` and the two newest wave summaries under `.oat/repo/reference/project-summaries/`): `bundle --recipe program-recap --theme <defaults>` → the authored fixture page copied to `site/index.html` → `verify --rung none` (every check `pass`, the two claim passes on real claims) → `record` (`built-needs-review`) → `verifySelectedProjectRecapForArchive` accepts the run root read-only; then `bundle` again over the same inputs reports `reuse: true`. Negative: the same page with two wave task counts swapped → `verify-claim-untraced`; `record` over a `qa/result.json` for different HTML bytes → `record-qa-stale`.

**Step 2: Verify** — `node --test .agents/skills/explainer-kit/tests/flow.e2e.test.mjs` green; `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/archive-utils.test.ts` green. This is the gate for every deletion task that follows: do not start p01-t10 until it is green.

**Step 3: Commit** — `git commit -m "test(p01-t09): prove the flow end to end on real material"`

---

### Task p01-t10: Rewrite `check-terminal-outcome.mjs`, the intent pairs, and their guard tests

**Files:**

- Modify: `.agents/skills/oat-explainer-kit/scripts/check-terminal-outcome.mjs` (`TERMINAL_OUTCOMES` = `built`, `built-needs-review`, `failed`, `incomplete`; `generate` satisfied only by `built` / `built-needs-review`; `SKIP_REASONS` = `interactive`, `failed_attempt`, `capability_probe`; `--skip-reason failed_attempt` requires `--manifest` whose `outcome` is `failed` or `incomplete`, or `--failure <path>` naming a `failure.json` the flow wrote before recording, otherwise rejected), `.agents/skills/oat-explainer-kit/scripts/resolve-intent.mjs` (`SOURCES` + `failed_attempt`; `ALLOWED_PAIRS.projectRecap` + `skip:failed_attempt`; `capability_probe` retained), `.agents/skills/oat-explainer-kit/tests/intent.test.mjs`, `.agents/skills/oat-project-complete/tests/check-terminal-outcome.test.mjs`, `.agents/skills/oat-project-implement/tests/check-terminal-outcome.test.mjs`

**Step 1: Write test (RED)** — both guard tests: `built` satisfies, `built-needs-review` satisfies, `failed` / `incomplete` / `built-durable` / `built-not-durable` do not; `skip failed_attempt` accepted with a failed manifest or with a `failure.json`, rejected with neither, rejected with a `built` manifest; `skip capability_probe` still readable; `intent.test.mjs`: `skip/failed_attempt` allowed for `projectRecap`, not for `projectExplainer`. Each guard test's second case — the prose assertion over `oat-project-complete/SKILL.md` and `completion-and-closeout.md:946` (`/built-durable.*built-not-durable.*built-needs-review.*failed/s`) — is retained verbatim in this phase and re-pinned in p03-t02 / p03-t03. Run → red.

**Step 2: Implement (GREEN)** → green. **Prove it can fail** for the `failed_attempt`-without-manifest case (Migration Plan item 3).

**Step 3: Verify** — `node --test .agents/skills/oat-explainer-kit/tests/intent.test.mjs .agents/skills/oat-project-complete/tests/check-terminal-outcome.test.mjs .agents/skills/oat-project-implement/tests/check-terminal-outcome.test.mjs` green.

**Step 4: Commit** — `git commit -m "feat(p01-t10): rewrite the terminal-outcome guard and add skip/failed_attempt"`

---

### Task p01-t11: Retire the explainer release-candidate tooling and its gate scripts

**Files:**

- Delete: `tools/release/build-explainer-rc.mjs`, `tools/release/build-explainer-rc.test.mjs`, `tools/release/run-explainer-rc.mjs`, `tools/release/run-explainer-rc.test.mjs`, `tools/release/run-explainer-rc.integration.test.mjs`, `tools/release/explainer-rc-contract.mjs`, `tools/release/validate-explainer-acceptance.mjs`, `tools/release/validate-explainer-acceptance.test.mjs`, `tools/release/validate-explainer-visuals.mjs`, `tools/release/validate-explainer-visuals.test.mjs`, `.oat/repo/reference/explainer-kit-acceptance/` (whole directory)
- Modify: `package.json` (`release:validate` drops `&& pnpm release:validate:visual`; delete the `release:validate:visual` and `test:release` scripts; `test` chain drops `&& pnpm test:release`), `AGENTS.md:74`, `.oat/repo/knowledge/testing.md:35`, `apps/oat-docs/docs/contributing/code.md:60`

**Step 1: Sweep** — `grep -rn "explainer-rc\|validate-explainer\|test:release\|release:validate:visual\|explainer-kit-acceptance" --include='*.json' --include='*.ts' --include='*.mjs' --include='*.md' --include='*.yml' . | grep -v node_modules | grep -v "^./.oat/projects\|^./.oat/repo/pjm"` returns nothing outside the files above except this known, deliberately untouched residue: `.agents/skills/oat-explainer-kit/references/migration.md` (p03-t01), `.agents/skills/explainer-kit/references/extension-contract.md` (p01-t13), the docs page `workflows/skills/explainer-kit.md` (p03-t06), `.oat/repo/reference/decisions/DR-260908-bundled-skills-declare.md` and the records under `.oat/repo/reference/` (history), and the gitignored `packages/cli/assets/` mirror. Anchor exclusions on `.oat/` and `packages/cli/assets/` (not `./.oat/`; ugrep prints no `./` prefix).

**Step 2: Delete and edit** the files above.

**Step 3: Verify** — `pnpm release:validate > /tmp/x.log 2>&1; echo exit=$?` → 0; `node -e "const p=require('./package.json');if(/release:validate:visual|test:release/.test(JSON.stringify(p.scripts)))process.exit(1)"` → 0; `pnpm test:smoke` still runs (`tools/smoke/explainer-kit/*` failures are expected until p01-t12; note them).

**Step 4: Commit** — `git commit -m "refactor(p01-t11): retire the explainer release-candidate tooling"`

---

### Task p01-t12: Retire the explainer smoke tests and the reader-sameness test

**Files:**

- Delete: `tools/smoke/explainer-kit/package-coverage-consumers.test.mjs`, `tools/smoke/explainer-kit/packaged-layout.test.mjs`, `tools/smoke/explainer-kit/publish-boundary.test.mjs`, `tools/smoke/explainer-kit/wrapper-compatibility.test.mjs`, `tools/smoke/explainer-kit/fixtures/package-root.mjs`, `tools/smoke/explainer-kit/fixtures/private-wrapper.mjs`, `tools/smoke/explainer-kit/fixtures/presets.example.json`, `tools/smoke/skill-version/reader-sameness.test.mjs`
- Keep: `tools/smoke/explainer-kit/check-core-version-parity.test.mjs`

**Step 1: Sweep** — `grep -rln "wrapper-compatibility\|reader-sameness\|package-root.mjs\|private-wrapper" tools packages .agents --include='*.mjs' --include='*.ts' --include='*.md'` returns nothing outside the files being deleted except `.agents/skills/explainer-kit/references/extension-contract.md` and `scripts/lib/catalog.mjs` (both p01-t13), `.agents/skills/oat-explainer-kit/references/migration.md` (p03-t01), and the gitignored `packages/cli/assets/` mirror; `.agents/skills/recon/tests/skill-contract.test.mjs` is NOT listed (it declares its own helper and nothing pins it). Also remove the stale comment naming `packaged-layout.test.mjs` at `packages/cli/src/__tests__/skills/skill-version.ts:45`. This task removes the `tools/smoke/skill-version/` category entirely; `check-core-version-parity.test.mjs` under `explainer-kit/` retains the reader-honesty coverage.

**Step 2: Delete.**

**Step 3: Verify** — `pnpm build && pnpm test:smoke > /tmp/x.log 2>&1; echo exit=$?` → 0; `ls tools/smoke/explainer-kit` shows only the parity test.

**Step 4: Commit** — `git commit -m "refactor(p01-t12): retire the explainer smoke tests"`

---

### Task p01-t13: Delete the retired core orchestrator, modules, schemas, references, examples, and tests

**Files:**

- Delete: `.agents/skills/explainer-kit/scripts/run.mjs`, `.agents/skills/explainer-kit/scripts/render-qa.mjs`, `.agents/skills/explainer-kit/scripts/record-durability.mjs`, `.agents/skills/explainer-kit/scripts/publish.mjs`, `.agents/skills/explainer-kit/scripts/validate.mjs`; `.agents/skills/explainer-kit/scripts/lib/{set-plan,content-approval,visual-review,terminal-evidence,internal-references,render,markdown,diagram,durability,catalog,s3-static,s3-roots,publication-policy,fact-base,records,source-backlinks}.mjs`; `.agents/skills/explainer-kit/schemas/{author-request.v2,author-request.v3,author-result.v2,set-plan.v1,visual-review-request.v1,visual-review-result.v1,visual-review-evidence.v1,terminal-evidence.v1,durability-evidence,publish-request.v1,publish-request.v2,publish-receipt.v1,publish-receipt.v2}.schema.json`; `.agents/skills/explainer-kit/references/{contracts,extension-contract,visual-review,destination-contract,golden-conformance}.md`; `.agents/skills/explainer-kit/examples/` (whole); `.agents/skills/explainer-kit/tests/{content-approval,diagram,e2e-recap,golden-conformance,link-validation,markdown,narrative-render,render,run.integration,templates,durability,s3-static,fact-base,records,rebuildability}.test.mjs`; `.agents/skills/explainer-kit/tests/fixtures/golden/`, `.agents/skills/explainer-kit/tests/fixtures/seeded-leak.html`

**Step 1: Sweep before deleting** — `grep -rn "from './\|from '../\|import(" .agents/skills/explainer-kit/scripts/lib/{qa,html-safety,browser-runtime,png,theme,contracts,recipes,package-coverage,fs-safe,safe-paths}.mjs | grep -o "'[^']*'" | sort -u` names only kept modules (the p01-t01/t05/t06 trims made that true; if not, fix the import before deleting).

**Step 2: Delete.**

**Step 3: Verify** — `ls .agents/skills/explainer-kit/scripts .agents/skills/explainer-kit/scripts/lib .agents/skills/explainer-kit/schemas .agents/skills/explainer-kit/references .agents/skills/explainer-kit/tests` matches design § Retained and retired inventory; `node --test .agents/skills/explainer-kit/tests/*.test.mjs > /tmp/x.log 2>&1; echo exit=$?` → 0; `for f in .agents/skills/explainer-kit/scripts/lib/*.mjs; do node -e "import('./$f')" || echo BROKEN $f; done` prints nothing.

**Step 4: Commit** — `git commit -m "refactor(p01-t13): retire the core orchestrator, seams, durability, and publish"`

---

### Task p01-t14: Cut the adapter's retired scripts and their tests

**Files:**

- Delete: `.agents/skills/oat-explainer-kit/scripts/run.mjs`, `.agents/skills/oat-explainer-kit/scripts/derive-destination.mjs`, `.agents/skills/oat-explainer-kit/scripts/probe-recap-seams.mjs`, `.agents/skills/oat-explainer-kit/scripts/finalize-tracked-run.mjs`, `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`, `.agents/skills/oat-explainer-kit/tests/derive-destination.test.mjs`, `.agents/skills/oat-explainer-kit/tests/probe-recap-seams.test.mjs`, `.agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/scripts/resolve-intent.mjs` (delete the `probe-recap-seams.mjs` import at `:1`, the `seamProbe` parameter `:36`, its guard `:51-52`, its pass-through `:74`, the `seamProbe` branch in the resolve path `:175-189` (the capability-probe skip message, which carries no pinned token and would otherwise survive both sweeps), and `assertSeamProbe` `:256-320` — the whole symbol closure), `.agents/skills/oat-explainer-kit/scripts/resolve-config.mjs` (delete the `explainers.publish.*` keys `:14-19` and `resolvePublish`), `.agents/skills/oat-explainer-kit/scripts/bind-project-sources.mjs` (rewrite `RECIPE_ARTIFACTS` to design § bundle.mjs allowlists incl. `project-log.md`, `discovery.md`, conditional `orchestration-log.md`, `program`; delete `bindRepositorySources`' git/github bindings that only the run orchestrator used, keep the supplied-fact-base path), `.agents/skills/oat-explainer-kit/scripts/check-core.mjs` (gains `export const MINIMUM_CORE_VERSION`, relocated from `run.mjs:19`, its only definition today), `.agents/skills/oat-explainer-kit/tests/check-core.test.mjs` (the import at `:14` re-pointed at `check-core.mjs`; the `:70` assertion and the `:79` call kept; the `supportsAdaptiveSetPlanning` cases dropped), `.agents/skills/oat-explainer-kit/tests/config-paths.test.mjs` (drop the `run-request` validation case `:514` and the publish-key cases), `.agents/skills/oat-explainer-kit/tests/intent.test.mjs` (drop the `probe-recap-seams.mjs` import `:12`, the `allFiveSeams` helper `:19-29`, and every `seamProbe` / `probeRecapSeams` case `:157-489`), `.agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs` (drop the `run.mjs` import `:12` and every assertion that executes a retired module; keep the prose assertions)

**Step 1: Sweep** — `grep -rn "probe-recap-seams\|probeRecapSeams\|seamProbe\|RECAP_PROBE_CODES\|RECAP_SEAM_IDS\|finalize-tracked-run\|derive-destination\|scripts/run.mjs\|runOatExplainer\|explainers.publish" .agents/skills/oat-explainer-kit/scripts .agents/skills/oat-explainer-kit/tests` → after the edits, empty.

**Step 2: Edit and delete.**

**Step 3: Verify** — `node --test .agents/skills/oat-explainer-kit/tests/*.test.mjs > /tmp/x.log 2>&1; echo exit=$?` → 0; the sweep is empty.

**Step 4: Commit** — `git commit -m "refactor(p01-t14): cut the adapter's callback path, seam probe, and finalizer"`

---

### Task p01-t15: Remove the `explainers.publish.*` config keys from the CLI

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts` (`:145-150`, `:312-317`, the `Explainer Publish (shared)` key-metadata group `:744-816`, the value-validation branches `:1451-1478`, the surface allowlist `:1583-1593`, and `defaultSurfaceForKey` `:1645-1662`; the surface and default branches must collapse cleanly for the four remaining `explainers.defaults.*` keys), `packages/cli/src/commands/config/index.test.ts` (`:1062-1248`, every publish-key case), `packages/cli/src/config/resolve.test.ts` (publish-key cases), `packages/cli/src/config/oat-config.ts` (`interface OatExplainerPublishConfig` `:96-104`, the `publish?:` field `:107`, the normalizer that reads `parsed.publish.*` `:620-655`), `packages/cli/src/config/resolve.ts:66-73` (the resolved publish defaults map that feeds `oat config dump`), `packages/cli/src/config/oat-config.test.ts:3368-3490`

**Step 1: Write test (RED)** — `oat config set explainers.publish.provider s3-static` is rejected as an unknown key; `explainers.defaults.style` still accepted. Run `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config src/config/resolve.test.ts` → red.

**Step 2: Implement (GREEN)** → green.

**Step 3: Verify** — `grep -rn "explainers.publish\|OatExplainerPublishConfig" packages/cli/src` → empty; `grep -n "publish" packages/cli/src/config/oat-config.ts packages/cli/src/config/resolve.ts` → only unrelated hits (record them).

**Step 4: Commit** — `git commit -m "refactor(p01-t15): drop the explainers.publish config keys"`

---

### Task p01-t16: Rewrite the push completion-transaction fixtures to v2

**Files:**

- Modify: `packages/cli/src/commands/project/push/completion-transaction.test.ts` (`RECAP_BUILD_RECORD` `:28-29` and its write sites → a v2 `manifest.json` fixture only; the `built-durable` receipt strings `:561`, `:748`, `:1228` and the `built-not-durable` strings `:952`, `:1216` → `built`)

**Step 1: Run** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/push/completion-transaction.test.ts` → green before and after (fixtures only; the transaction code is recap-agnostic).

**Step 2: Verify** — `grep -n "build-record\|built-durable\|built-not-durable" packages/cli/src/commands/project/push/*.ts` → empty.

**Step 3: Commit** — `git commit -m "test(p01-t16): move the completion-transaction recap fixtures to v2"`

---

### Task p01-t17: The no-retired-references sweep (code scope), skill bumps, lockstep

**Files:**

- Create: `tools/smoke/explainer-kit/no-retired-references.test.mjs` (pinned list: retired module paths, symbols `runExplainer`, `runOatExplainer`, `probeRecapSeams`, `planSet`, `visualCritic`, `browserSession`, `authorModulePath`, `criticModulePath`, `E_AUTHOR_REQUIRED`, `recordDurability`, schema ids for the deleted schemas, outcome strings `built-durable` / `built-not-durable`, config keys `explainers.publish.`, docs slugs `explainer-kit-providers` / `explainer-kit-verification`; the symbol `OatExplainerPublishConfig`; the file list comes from `git ls-files` so the gitignored `packages/cli/assets/` mirror and `dist/` never count; scope in this phase: `packages/`, `tools/`, `.agents/skills/*/scripts`, `.agents/skills/*/tests`, `scripts/`, minus itself, minus the three prose-pin files `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`, `packages/cli/src/validation/skills.test.ts`, and `.agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs` (listed in the pinned exclusion set with the reason: they quote lifecycle prose that Phase 3 rewrites; p03-t08 removes the exclusion after p03-t01 and p03-t05 re-pin them); and a permanent, named allowlist of negative-control sites that must keep the retired outcome strings forever: `.agents/skills/oat-project-complete/tests/check-terminal-outcome.test.mjs` and `.agents/skills/oat-project-implement/tests/check-terminal-outcome.test.mjs` (they assert that `built-durable` / `built-not-durable` no longer satisfy `generate`, design § Testing Strategy FR5/NFR2); no other file is allowlisted, and p01-t08's v1-rejection fixture uses `built-needs-review` as its outcome so the rejection comes from `schemaVersion` and the key set, not from an outcome literal; Phase 3 widens the scope)
- Modify: `.agents/skills/explainer-kit/SKILL.md` (`metadata.version` major bump), `.agents/skills/oat-explainer-kit/SKILL.md` (version bump only; prose is Phase 3), `.agents/skills/oat-explainer-kit/scripts/check-core.mjs` (`MINIMUM_CORE_VERSION`, relocated there in p01-t14, → the new core version; `check-core.test.mjs:70` asserts it), `packages/cli/src/validation/skills.test.ts` (the explainer family pins `:1491-1492`, by old literal; no other skill is bumped in this phase), the five lockstep `package.json` files + `packages/cli/assets/public-package-versions.json`

**Step 1: Write test (RED)** — seed `built-durable` into a scratch copy of a kept module under `mktemp -d` (outside the allowlist) and point the sweep at it → red; seed it into a scratch copy named like an allowlisted guard test → green (the allowlist is honored); against the tree → green.

**Step 2: Bump** the two skills and lockstep (`pnpm release:check-versions` requires strictly greater than `origin/main`; fetch first).

**Step 3: Verify (phase boundary)** — the full gate list with captured exit codes; `HOME=$(mktemp -d) pnpm exec turbo run test --force` shows `Cached: 0`; `pnpm test:smoke`, `pnpm test:skills`, `pnpm test:scripts` after `pnpm build`; `pnpm lint`, `pnpm format`; `tools/smoke/explainer-kit/check-core-version-parity.test.mjs` green after the bumps (it re-reads every bundled `SKILL.md` through both readers); the minimum-version assertion lives in `check-core.test.mjs`.

**Step 4: Commit** — `git commit -m "chore(p01-t17): add the retired-reference sweep and bump the explainer skills"`

---

## Phase 2: Ladder and fresh-host proof

Deliverable: the host and Playwright rungs work with the hash binding; the authoring brief exists; a fresh-host end-to-end test with negative controls passes.

### Task p02-t01: Host rung with the artifact-hash binding

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/verify.mjs`, `.agents/skills/explainer-kit/tests/verify.test.mjs`, `.agents/skills/explainer-kit/tests/fixtures/verify/` (three valid PNGs at 320/768/1440 via `fixtures/png.mjs`, one wrong-width PNG, one non-PNG)

**Step 1: Write test (RED)** — `--rung host --screenshots <dir> --artifact-sha256 <hex> --visual-verdict pass|findings [--visual-notes <text>]`: accepted when the hex equals the SHA-256 of `site/index.html` after the checks and all three PNGs pass magic bytes + `pngDimensions` at the declared width → `rung: host`, `screenshots[]` = `qa/320.png` etc., `visual.verdict` and `visual.notes` recorded (a missing verdict is rejected: capture without inspection is not verification); downgraded to `none` with reason `host-artifact-hash-mismatch` / `host-screenshot-invalid` otherwise; `record.mjs` yields `built` only on `pass`, `built-needs-review` on `findings`. Run → red.

**Step 2: Implement (GREEN)** → green. **Prove it can fail:** skip the hash recomputation → the mismatch case goes red; restore.

**Step 3: Verify** — `node --test .agents/skills/explainer-kit/tests/verify.test.mjs` green.

**Step 4: Commit** — `git commit -m "feat(p02-t01): bind host-rung screenshots to the artifact hash"`

---

### Task p02-t02: Playwright rung

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/verify.mjs`, `.agents/skills/explainer-kit/tests/verify.test.mjs`

**Step 1: Write test (RED)** — when `resolveHeadlessRuntime` resolves, `launchInstalledChromium` / `createBrowserProbeSession` then `probeRenderedPage(browser, fileUrl, { viewport: { width, height }, evaluate: BROWSER_PROBE_EVALUATE, screenshotPath })` for each of `REPRESENTATIVE_WIDTHS` → `rung: playwright`, three screenshots, and `runBrowserProbes`' findings consumed into `visual.findings` (`verdict: pass` when empty); a deliberately broken fixture layout (a fixed 1200px-wide table at 320) captures successfully but yields `viewport-overflow` → `verdict: findings` → `record.mjs` gives `built-needs-review`, never `built`; with `EXPLAINER_KIT_HEADLESS_PROBE` disabled (the runtime's own env switch, see `browser-runtime.mjs`) → `rung: none` with the `RUNTIME_UNAVAILABLE_REASONS` value; a probe that throws → `rung: none`, reason recorded, checks unaffected. Run → red.

**Step 2: Implement (GREEN)** → green (the Playwright case is skipped with a note when no Chromium is installed; the unavailable case always runs).

**Step 3: Verify** — `node --test .agents/skills/explainer-kit/tests/verify.test.mjs` green; `node --test .agents/skills/explainer-kit/tests/browser-runtime.test.mjs` unchanged and green.

**Step 4: Commit** — `git commit -m "feat(p02-t02): add the Playwright rung"`

---

### Task p02-t03: The authoring brief

**Files:**

- Create: `.agents/skills/explainer-kit/references/recap-authoring.md` (design § Authoring step: the input files; required sections by recipe as `<section id>` anchors; the shell to copy from `templates/` per `floor[0].template` and how to fill `THEME_CSS`, `TITLE`, `DESCRIPTION`, `EYEBROW`, `NAVIGATION`, `CONTENT`, `FOOTER` from `theme.resolved.json` and the fact base; one file / inline CSS / no external requests / no source dumping; the claim discipline; the pointer to `references/visual-authoring.md`; the host-rung instruction: open `file://<run-root>/site/index.html`, capture 320/768/1440 to `qa/`, then inspect the three screenshots against the checklist (no horizontal overflow, every required section visible, headings readable at 320, no overlapping text) and pass `--artifact-sha256`, `--visual-verdict`, `--visual-notes`); nothing that restates a bundled brief
- Modify: `.agents/skills/explainer-kit/references/fact-base-contract.md` (rewritten for the flow: the eight keys, sources, citations, the claims index, the anchor ledger)

**Step 1: Check** — `diff <(grep -o '^## .*' .agents/skills/explainer-kit/briefs/project-recap.md) <(grep -o '^## .*' .agents/skills/explainer-kit/references/recap-authoring.md)` shares no headings (no overlap with the bundled briefs).

**Step 2: Verify** — `pnpm exec oxfmt --check .agents/skills/explainer-kit/references/*.md`; `pnpm oat:validate-skills`.

**Step 3: Commit** — `git commit -m "docs(p02-t03): add the recap authoring brief"`

---

### Task p02-t04: Fresh-host end-to-end proof with negative controls

**Files:**

- Create: `.agents/skills/explainer-kit/tests/fresh-host.test.mjs`

**Step 1: Write test** — under `mktemp -d`: a scratch git repo with one OAT project fixture, `HOME` pointing at a temp home where the core is installed at user scope (copy the skill tree into `$HOME/.agents/skills/explainer-kit`), `EXPLAINER_KIT_HEADLESS_PROBE` disabled; run `bundle` → write a fixture page authored from the shell (the test stands in for the agent) → `verify --rung none` → `record`; expect `built-needs-review` with the runtime reason and a package the p01-t08 validator accepts (`verifySelectedProjectRecapForArchive` over the run root). Negative controls, each asserted visibly failed while the accepted control still passes: delete a required section → `failed` (sections) with a manifest the skip guard accepts via `--manifest`; remove the core → `failure.json` (`stage: core`) and the guard accepts it via `--failure`, then the resume chain: record `skip:failed_attempt` from that failure, re-run the completion resolution over the same project → the skip is honored with no prompt and no authoring; with the probe enabled, point `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` (`browser-runtime.mjs:106`, checked first and only for existence) at an existing, non-executable temp file → `launchInstalledChromium` throws → `rung: none` with `verify.mjs`'s launch-failure reason, distinct from `RUNTIME_UNAVAILABLE_REASONS.disabled` (`disabled-by-configuration`), still `built-needs-review` (deterministic on any host that has the repo's `@playwright/test` devDependency, which `resolveHeadlessRuntime` imports before reading the env var; without it the reason is `browser-driver-not-installed` and the control fails loudly — inject `loadDriver` / `fileExists`, both already injectable at `browser-runtime.mjs:71-75`, if the test must be host-independent); remove the core from `$HOME` → `check-core.mjs` reports the install command and the flow stops before bundling.

**Step 2: Verify** — `node --test .agents/skills/explainer-kit/tests/fresh-host.test.mjs` green; run twice, the second with `Cached: 0` semantics (it is a `node --test` file, no turbo cache).

**Step 3: Gates (phase boundary)** — the full list with exit codes; `pnpm lint`, `pnpm format`.

**Step 4: Commit** — `git commit -m "test(p02-t04): fresh-host end-to-end proof with negative controls"`

---

## Phase 3: Adapter, core skill prose, lifecycle consumers, and docs

Deliverable: every skill, reference, contract test, docs page, and repository record speaks the new vocabulary; the sweep covers the whole repository; the decision record and backlog reconciliation exist.

### Task p03-t01: Adapter § Generate and its references

**Files:**

- Modify: `.agents/skills/oat-explainer-kit/SKILL.md` (rewritten around § Generate: core prerequisite; intent; inputs by recipe via `bind-project-sources.mjs`; theme via `resolve-config.mjs`; output root via `resolve-paths.mjs`; `bundle` → author (the recipe brief + `recap-authoring.md`) → `verify` → `record`; the ladder instruction; retry/skip; the outcome vocabulary; § Responsibilities rewritten; no seam, callback, probe, durability, or publish sentence), `.agents/skills/oat-explainer-kit/references/lifecycle-contract.md` (intent record, allowed pairs incl. `skip/failed_attempt`, `skip/capability_probe` read-only legacy at `:73`, `:76-81`; the outcome vocabulary; no `:29` / `:154` probe text), `.agents/skills/oat-explainer-kit/references/config-contract.md` (`explainers.defaults.*` only; `:35` gone), `.agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs` (prose assertions rewritten to § Generate and the new ordering in every caller: complete, closeout, autonomous, both wave skills, plan Step 15.5 — this task lands the adapter half; p03-t02–t04 land the callers, so keep the test red-then-green across those tasks and green at the phase boundary)
- Modify (core): `.agents/skills/explainer-kit/SKILL.md` (§ Run replaces § Core Run, § Authoring, and § Review, Approval, and Warnings: `--recipe`, the four input modes p01-t05 shipped, `--out`; unattended never prompts; § Responsibilities rewritten; § Wrapper Extension Seam and § Dependency Direction deleted; § Asset Resolution and § Progress Indicators kept; no `run.mjs`, `E_AUTHOR_REQUIRED`, `author-request`, `extension-contract`, `visual-review.md`, `contracts.md`, or `built-not-durable` mention — p04-t01 adds only the interactive front-door posture), `packages/cli/src/validation/skills.test.ts:1501-1518` (the `trusted browser-session contract` case re-pinned to the § Generate contract: the core prerequisite sentence and `package-coverage/v3`; the three seam assertions deleted)
- Delete: `.agents/skills/oat-explainer-kit/references/author-callback.md`, `.agents/skills/oat-explainer-kit/references/visual-review-callback.md`, `.agents/skills/oat-explainer-kit/references/migration.md`

**Step 1: Verify** — `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts -t "explainer skill family"` green; `grep -n "probeRecapSeams\|authorModulePath\|visualCritic\|browserSession\|planSet\|runOatExplainer\|built-durable\|built-not-durable\|finalize-tracked-run\|explainers.publish" .agents/skills/oat-explainer-kit/SKILL.md .agents/skills/oat-explainer-kit/references/*.md .agents/skills/explainer-kit/SKILL.md` → empty; `pnpm oat:validate-skills`.

**Step 2: Commit** — `git commit -m "docs(p03-t01): rewrite the adapter and the core skill around the generate flow"`

---

### Task p03-t02: `oat-project-complete` — Step 3.6, the deleted durability steps, and the archive-resume scripts

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md` (Step 3.6 `:531-611` rewritten per design § Skill prose and consumers; Steps 10.5 and 10.6 deleted; every `EVIDENCE_COMMIT` / attest / `built-not-durable` sentence in Steps 1, 2, 3.65, 5, 6, 8, 11.5, 12 rewritten so Step 8's export is the durable copy and completion is one bookkeeping push; `:608`'s project-explainer sentence kept. **Out of scope and unchanged:** `IS_DURABLE_PROJECT` is the project-scope classifier (`:133-136`, `shared || synced`), not recap durability; its archive and pointer gates at `:226-235`, `:247`, `:287`, `:903`, `:942`, `:1173`, `:1666`, `:1736` stay byte-identical. The only `IS_DURABLE_PROJECT` line this task touches is `:610`, rewritten to drop `built-not-durable` while keeping the local-scope prohibition on exporting a tracked recap or passing `--project-recap-run`), `.agents/skills/oat-project-complete/scripts/execute-synced-archive-entry.mjs` (drop `exportedBuildRecordPath`, the `recoverArchiveEvidence` call and its evidence paths, `evidenceCommit` / `evidencePushRequired`, and the `attestRecap` continuation), `.agents/skills/oat-project-complete/scripts/parse-synced-archive-resume-fields.mjs` (the `EVIDENCE_COMMIT` field `:62`), `.agents/skills/oat-project-complete/scripts/parse-completion-retry-fields.mjs` (the `evidenceCommit` / `evidencePushRequired` validation and contradiction block `:144-145`, `:180-187`, `:206-222`), `.agents/skills/oat-project-complete/scripts/recover-completion-receipts.mjs` (the recap-evidence recovery path: `EVIDENCE_MESSAGE` `:10`, its receipt-subject use `:397`, the `evidencePaths` parameter and validation `:531-559`, the `localSubject === EVIDENCE_MESSAGE` branch `:598-614`), `.agents/skills/oat-project-complete/tests/resolve-synced-archive-entry.test.mjs`, `.agents/skills/oat-project-complete/tests/check-terminal-outcome.test.mjs` (its prose assertion re-pinned to the rewritten Step 3.6 vocabulary)

**Step 1: Write test (RED)** — `resolve-synced-archive-entry.test.mjs`: the continuation runs `finalizeLinks → refreshDashboard → pushBookkeeping → closeoutPr → clearPointer → confirmCompletion` with no `attestRecap`; a resume record carrying `EVIDENCE_COMMIT` is rejected as unknown. Run `node --test .agents/skills/oat-project-complete/tests/*.test.mjs` → red.

**Step 2: Implement (GREEN)** → green.

**Step 3: Verify** — `grep -n "EVIDENCE_COMMIT\|EVIDENCE_MESSAGE\|evidencePaths\|evidenceCommit\|attest\|build-record\|built-durable\|built-not-durable\|finalize-tracked-run\|probeRecapSeams\|runOatExplainer\|authorModulePath" .agents/skills/oat-project-complete/SKILL.md .agents/skills/oat-project-complete/scripts/*.mjs` → empty; `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts` red on the pins this task moves (they are re-pinned in p03-t05; record the failing pin names in the commit body).

**Step 4: Commit** — `git commit -m "docs(p03-t02): route completion onto the generate flow and retire recap attestation"`

---

### Task p03-t03: The closeout duplicate, the autonomous tail, and the summary mapping

**Files:**

- Modify: `.agents/skills/oat-project-implement/references/completion-and-closeout.md` (`:884-950` only; `:432-517` and `:629-673` untouched), `.agents/skills/oat-project-autonomous/SKILL.md` (Step 2.5 `:260-285`: the forced `generate` intent stays; the capability-probe paragraph `:271-278` becomes the retry-then-`skip:failed_attempt` rule; the `projectExplainer` paragraph stays), `.agents/skills/oat-project-summary/SKILL.md` (`:290-302`: `generated` (`built`), `generated — needs review` (`built-needs-review`, reason), `skipped` (reason), `failed` (cause); source of truth `manifest.json` + `qa/result.json`), `.agents/skills/oat-project-implement/tests/check-terminal-outcome.test.mjs` (its prose assertion over `completion-and-closeout.md:946` re-pinned)

**Step 1: Test** — `node --test .agents/skills/oat-project-implement/tests/*.test.mjs .agents/skills/oat-project-complete/tests/check-terminal-outcome.test.mjs` red before the re-pin, green after.

**Step 2: Verify** — `grep -n "capability_probe\|probeRecapSeams\|built-durable\|built-not-durable\|build-record" .agents/skills/oat-project-implement/references/completion-and-closeout.md .agents/skills/oat-project-autonomous/SKILL.md .agents/skills/oat-project-summary/SKILL.md` → only the read-only-legacy mention of `capability_probe` in the autonomous skill, if any; `sed -n 432,517p` and `sed -n 629,673p` of the closeout file are byte-identical to `origin/main`'s.

**Step 3: Commit** — `git commit -m "docs(p03-t03): closeout, autonomous tail, and summary mapping on the new vocabulary"`

---

### Task p03-t04: Plan Step 15.5 and the wave program-close callers

**Files:**

- Modify: `.agents/skills/oat-project-plan/SKILL.md` (Step 15.5 `:753-766`: call the adapter's § Generate with recipe `project-explainer` over the approved plan artifacts, report outcome and run path, continue on any outcome; the critic-callback sentence `:760` deleted; Step 4.5 untouched), `.agents/skills/oat-wave-program/SKILL.md` (the whole `### Program-close explainer caller` section `:135-171`: the caller-owns-fact-base paragraph, the `explainer-kit.run-request/v1` construction block with its required-key list, the `explainer-kit.manifest/v1` key list incl. `buildRecord`, and the publish-gate sentence are deleted; replaced by one paragraph invoking § Generate with `program-recap` and recording `runId` / `outcome` in the program ledger), `.agents/skills/oat-wave-execute/SKILL.md` (the mirrored section `:461-497`, the same)

**Step 1: Verify** — `grep -n "authorModulePath\|critic\|author seam\|author-request\|run-request\|manifest/v1\|buildRecord\|publish" .agents/skills/oat-project-plan/SKILL.md .agents/skills/oat-wave-program/SKILL.md .agents/skills/oat-wave-execute/SKILL.md` → empty.

**Step 2: Commit** — `git commit -m "docs(p03-t04): plan explainer and wave program-close callers use the flow"`

---

### Task p03-t05: Autonomy contract row and table, its five mirrors, and the CLI prose pins

**Files:**

- Modify: `.agents/docs/autonomy-contract.md` (row IMPLEMENT-19; the § HEAD prompt-site coverage table `:255`: recompute the site keys for `oat-project-implement/references/completion-and-closeout.md` (old `acf05140d8f3`, `37d6705db801`, `de4bc19da5e2`) and `oat-project-complete/SKILL.md` (six old sites) with the test's rule `sha256(heading + "\n" + normalized line).slice(0,12)`), the byte-identical mirrors `.agents/skills/{oat-project-implement,oat-project-quick-start,oat-project-document,oat-project-pr-final,oat-project-lite}/references/docs/autonomy-contract.md`, `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts` (every recap and durability pin in the file, located by its old literal; at head `c6a40c58a` they are `:446`, `:468-635` incl. `:623-626`, `:1406` (the `oat-project-complete` version), `:1438-1479` (the author-seam sentence at `:1439` and the recap block), `:1501-1536`, `:2080-2113` (the `EVIDENCE_COMMIT` recovery shell, the `attest final project recap` commit line, and the Step 10.5 ordering, removed with the deleted steps); within `:1501-1536` only the recap-bearing lines `:1523` (re-attest), `:1533`, and `:1536` (`built-not-durable`) change. **Kept verbatim** because they pin the project-scope classifier, not the recap: `:1913` (the `SHOULD_ARCHIVE` / `IS_DURABLE_PROJECT` skip sentence), `extractDurableDerivation` `:4720-4735` and its two active-pointer tests at `:4848` and `:4881`, and the `IS_DURABLE_PROJECT=true` fixture preambles `:4950-4965`, `:5040-5055`; each other pin re-pinned to the rewritten sentence or removed with the deleted step), `.agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs` (now green end to end)

**Step 1: Run** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/autonomy-gate-inventory.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts` → red (stale keys and pins).

**Step 2: Implement** → green; `node --test .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs` green.

**Step 3: Verify** — `shasum -a 256 .agents/docs/autonomy-contract.md .agents/skills/*/references/docs/autonomy-contract.md` shows one hash.

**Step 4: Commit** — `git commit -m "docs(p03-t05): recompute the prompt-site table and re-pin the recap prose"`

---

### Task p03-t06: Docs

**Files:**

- Modify: `apps/oat-docs/docs/workflows/skills/explainer-kit.md` (rewritten around the flow: the four callers, the front door, the run package, the ladder, the outcome vocabulary; no seams, callbacks, expansion profiles, durability, publish), `apps/oat-docs/docs/workflows/projects/lifecycle.md:88-102`, `apps/oat-docs/docs/workflows/projects/artifacts.md:121-140`, `apps/oat-docs/docs/cli-utilities/configuration.md:178-230` (publish keys removed), `apps/oat-docs/docs/cli-utilities/tool-packs.md:159-187`, `apps/oat-docs/docs/reference/troubleshooting.md:331-368` (`built-needs-review` is a satisfied, archivable outcome needing a human look), `apps/oat-docs/docs/reference/cli-reference.md:154` (the two legacy clauses), `apps/oat-docs/docs/workflows/skills/index.md:15`, `apps/oat-docs/docs/contributing/index.md:20`, regenerated `apps/oat-docs/index.md`
- Delete: `apps/oat-docs/docs/workflows/skills/explainer-kit-providers.md`, `apps/oat-docs/docs/contributing/explainer-kit-verification.md`

**Step 1: Verify** — `pnpm build:docs > /tmp/x.log 2>&1; echo exit=$?` → 0; `pnpm check` (markdownlint) → 0; `git status --short apps/oat-docs/index.md` shows the regeneration is committed; `grep -rn "visualCritic\|planSet\|browserSession\|authorModulePath\|set-plan\|content-approval\|built-durable\|explainers.publish\|explainer-kit-providers\|explainer-kit-verification" apps/oat-docs/docs apps/oat-docs/index.md` → empty.

**Step 2: Commit** — `git commit -m "docs(p03-t06): rewrite the explainer docs for the agent-authored flow"`

---

### Task p03-t07: Decision record and backlog reconciliation

**Files:**

- Create: one decision record via `oat decision new "Explainers are agent-authored; the provider seams and durability path are retired" --status accepted --context ... --decision ... --consequences ...` (supersedes `DR-260726-explainer-authoring-is-two`, `DR-260726-recipe-policy-owns-expansion`, `DR-260726-expansion-artifacts-get-id`, `DR-260726-explainer-render-qa-is-opt`, `DR-260817-version-agnostic-publication`, named in its body; the superseded records are not edited), then `oat decision regenerate-index`
- Modify (via CLI): `oat backlog archive BL-260727-make-explainer-run-durability --wont-do --summary "Superseded by agent-authored-recap: built-not-durable and the durability path are retired; the archive export is the durable copy"`

**Step 1: Precondition** — `oat pjm doctor --json` → `adoption.state` is `declared`.

**Step 2: Verify** — `git status --short .oat/repo/reference/decisions .oat/repo/pjm/backlog` shows the new record, the regenerated index, the archived item, and `completed.md`.

**Step 3: Commit** — `git commit -m "chore(p03-t07): record the explainer decision and close BL-260727"`

---

### Task p03-t08: Widen the sweep, bump the remaining skills, phase gates

**Files:**

- Modify: `tools/smoke/explainer-kit/no-retired-references.test.mjs` (scope: every `git ls-files` path minus itself, `.oat/projects/`, `.oat/repo/reference/`, `.oat/repo/pjm/`; the Phase 1 exclusion of the three prose-pin files removed, which p03-t01 and p03-t05 already re-pinned; the two-file negative-control allowlist stays), the `metadata.version` of `oat-project-complete`, `oat-project-implement`, `oat-project-summary`, `oat-project-autonomous`, `oat-project-plan`, `oat-wave-program`, `oat-wave-execute`, `oat-project-quick-start`, `oat-project-document`, `oat-project-pr-final`, `oat-project-lite`, `packages/cli/src/validation/skills.test.ts` and `review-skill-contracts.test.ts` (the complete pin inventory under Conventions: `oat-project-implement` at `skills.test.ts:2122,2603,2912,3001,3493,4701,6024,8140`; `oat-project-complete` at `skills.test.ts:4704` and `review-skill-contracts.test.ts:1406`; the others by old literal)

**Step 1: Run** the sweep → red on any leftover; fix the leftover in its owning file; → green.

**Step 2: Gates (phase boundary)** — the full list with exit codes, forced test run, `pnpm test:smoke`, `pnpm test:skills`, `pnpm test:scripts`, `pnpm lint`, `pnpm format`, `pnpm run check:skill-bumps` green.

**Step 3: Commit** — `git commit -m "chore(p03-t08): repository-wide retired-reference sweep and skill bumps"`

---

## Phase 4: The front door

Deliverable: a person can run the core skill on any inputs; the project explainer is proven on this project's own plan artifacts.

### Task p04-t01: `explainer-kit/SKILL.md` § Run and the document and supplied-fact-base modes

**Files:**

- Modify: `.agents/skills/explainer-kit/SKILL.md` (§ Front door added to the § Run p03-t01 wrote: a person names the recipe, `--inputs <file|dir>…` or `--fact-base <path>`, and `--out <dir>`; interactive posture: propose scope and show the fact-base summary before authoring, no gate machinery; no script changes — p01-t05 shipped every input mode)
- Create: `.agents/skills/explainer-kit/tests/front-door.test.mjs`

**Step 1: Write test** (no RED expectation: the scripts shipped in Phase 1; this test adds the end-to-end chain `bundle.test.mjs` does not exercise) — a scratch directory of three documents → `bundle --inputs` → fixture page → `verify --rung none` → `record` → `built-needs-review` and a package `verifySelectedProjectRecapForArchive` accepts; `--fact-base` with a supplied fact base → the same chain; a missing `--out` refused with a usage message. Run → green.

**Step 2: Write the prose** — § Front door in `explainer-kit/SKILL.md` as described.

**Step 3: Verify** — `pnpm oat:validate-skills`; `grep -n "E_AUTHOR_REQUIRED\|author callback\|runExplainer\|--author-module" .agents/skills/explainer-kit/SKILL.md` → empty (already true since p03-t01; this task must keep it so).

**Step 4: Commit** — `git commit -m "feat(p04-t01): the explainer-kit front door for any inputs"`

---

### Task p04-t02: The project explainer, end to end, on this project

**Files:**

- Create: `.oat/projects/shared/agent-authored-recap/explainers/agent-authored-recap-explainer/` (a real run: `bundle --recipe project-explainer --project <this project>`, the implementing agent authors `site/index.html` from `templates/house-style.html` and the project-explainer brief, `verify` at the highest rung the host reaches, `record`)
- Modify: `.oat/projects/shared/agent-authored-recap/implementation.md` (record `runId`, `outcome`, rung, and the run path under a "Project explainer" note)

**Step 1: Run** the flow as the adapter's § Generate describes for `project-explainer`; expect `built` (host or Playwright rung) or `built-needs-review` (browser-less host) with every check passing.

**Step 2: Verify (read-only; never re-run `verify.mjs` after `record.mjs`, it would rewrite `qa/result.json` under the manifest's hashes)** — `qa/result.json` shows every check `pass`; `verifySelectedProjectRecapForArchive` over the run root accepts the package byte-for-byte; the manifest validates; `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/archive-utils.test.ts` unchanged.

**Step 3: Gates (phase boundary)** — the full list with exit codes.

**Step 4: Commit** — `git commit -m "feat(p04-t02): generate this project's explainer through the flow"`

---

## Phase 5: The program recap

Deliverable: the recap for the 2026-08-31 execution program exists, verifies, and its identity is in the program ledger.

### Task p05-t01: Generate the program recap

**Files:**

- Create: `.oat/repo/reference/explainers/2026-08-31-execution-program-recap/` (the run: `bundle --recipe program-recap --program .oat/repo/reference/external-plans/2026-08-31-execution-program.md --summaries .oat/repo/reference/project-summaries --archive .oat/projects/archived` selecting one summary per wave by the newest-export rule and each archived wrapper's `implementation.md` § Final Summary when reachable; the agent authors `site/index.html` from the program-recap brief; `verify` at the highest rung the host reaches; `record --mode unattended`)
- Modify: `.oat/repo/reference/external-plans/2026-08-31-execution-program.md` (line `:423` "Program recap: not run" → the `runId`, `outcome`, rung, and run path; the four per-wave `recap: not run` rows stay as history), `.oat/projects/shared/agent-authored-recap/implementation.md` (the validation-evidence note: `qa/result.json` checks, manifest verification, the ledger row)

**Step 1: Run** the flow; expect every browser-free check to pass and `built` or `built-needs-review`.

**Step 2: Verify (read-only; never re-run `verify.mjs` after `record.mjs`)** — `qa/result.json` shows every check `pass`; `verifySelectedProjectRecapForArchive` over the run root accepts the package byte-for-byte; the manifest validates through `validateContract('manifest')`; the package passes `enforceRunPackageInventory`; `unresolvedClaims` lists any unreachable wrapper input rather than dropping it.

**Step 3: Gates (phase boundary)** — the full list with exit codes, forced test run, smoke/skills/scripts suites, `pnpm lint`, `pnpm format`.

**Step 4: Commit** — `git commit -m "feat(p05-t01): generate the execution-program recap"`

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows (p03, p04, etc.) as needed, but do not delete `spec`/`design`.}

| Scope  | Type     | Status          | Date       | Artifact                                                      | Reviewed Head | Invocation | Gate Target |
| ------ | -------- | --------------- | ---------- | ------------------------------------------------------------- | ------------- | ---------- | ----------- |
| p01    | code     | pending         | -          | -                                                             | -             | -          | -           |
| p02    | code     | pending         | -          | -                                                             | -             | -          | -           |
| p03    | code     | pending         | -          | -                                                             | -             | -          | -           |
| p04    | code     | pending         | -          | -                                                             | -             | -          | -           |
| p05    | code     | pending         | -          | -                                                             | -             | -          | -           |
| final  | code     | pending         | -          | -                                                             | -             | -          | -           |
| spec   | artifact | pending         | -          | -                                                             | -             | -          | -           |
| design | artifact | fixes_completed | 2026-09-09 | reviews/archived/artifact-design-review-2026-09-09T225646Z.md | -             | -          | -           |
| design | artifact | fixes_completed | 2026-09-09 | reviews/archived/artifact-design-review-2026-09-09T232532Z.md | -             | manual     | -           |
| design | artifact | fixes_completed | 2026-09-10 | reviews/archived/artifact-design-review-2026-09-10T010926Z.md | -             | manual     | -           |
| design | artifact | fixes_completed | 2026-09-10 | reviews/archived/artifact-design-review-2026-09-10T013018Z.md | -             | manual     | -           |
| plan   | artifact | fixes_completed | 2026-09-10 | - (structured, in-memory, round 1)                            | -             | manual     | -           |
| plan   | artifact | fixes_completed | 2026-09-10 | - (structured, in-memory, round 2)                            | -             | manual     | -           |
| plan   | artifact | fixes_completed | 2026-09-10 | - (structured, in-memory, round 3; retry bound exhausted)     | -             | manual     | -           |

For code-review events, `Reviewed Head` is the full 40-character SHA at the
head of the reviewed range. `Invocation` records `manual`, `auto`, or `gate`;
`Gate Target` is populated only for gate events. Legacy five-column rows remain
valid. Writers must preserve every existing row and every unknown trailing
cell; never truncate a widened row back to five columns.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 17 tasks - The cut: flow first, proof on real material, then retirement
- Phase 2: 4 tasks - Ladder and fresh-host proof
- Phase 3: 8 tasks - Adapter, core skill prose, lifecycle consumers, and docs
- Phase 4: 2 tasks - The front door and the project explainer
- Phase 5: 1 task - The program recap

**Total:** 32 tasks

## References

- Design: `design.md` (approved 2026-09-10 after four review rounds)
- Spec: `spec.md` (FR1–FR12, NFR1–NFR5)
- Discovery: `discovery.md` (incl. the 2026-09-09 amendment)
- Backlog: `.oat/repo/pjm/backlog/items/BL-260907-replace-the-default-project.md` (incl. the 2026-09-09 amendment)
- Reviews: `reviews/archived/artifact-design-review-2026-09-09T225646Z.md`, `…T232532Z.md`, `…2026-09-10T010926Z.md`, `…T013018Z.md`
