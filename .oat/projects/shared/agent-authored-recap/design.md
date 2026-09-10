---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-09
oat_generated: false
---

# Design: agent-authored-recap

## Overview

The Explainer Kit becomes one agent-authored flow for every caller. Three small core scripts (bundle, verify, record) surround a single authoring step performed by the host agent; visual verification is resolved at run time through a three-rung browser ladder; the run package is small and every file in it names its reader. The flow serves four callers through one recipe switch: the project recap at completion, the program recap at program close, the project explainer at plan approval, and a person invoking the core skill on any inputs. The callback-driven orchestration in the core and the adapter (author, critic, set planner, browser session, visual critic), the durability and S3 publish path, the explainer release-candidate tooling, and every contract, schema, test, reference, and docs page that exists only for them are retired in this project. The archive command's export under `.oat/repo/reference/` is the durable copy of a recap. Operator decisions recorded here: no backward compatibility for the archive package rule (2026-09-09, "we don't need backward compatibility"); one project rather than a recap project plus a follow-up (2026-09-09, "we should just verify this all as one project"); the durability and publish path is retired rather than rewritten (2026-09-09).

## Architecture

### System Context

- Callers of the flow: `oat-project-complete` Step 3.6 and its duplicate in `oat-project-implement/references/completion-and-closeout.md` (project recap, unattended); `oat-project-autonomous` (recap tail); `oat-project-plan` Step 15.5 (`project-explainer`, after plan approval); `oat-wave-program` and `oat-wave-execute` (program recap at program close); the `explainer-kit` skill's own front door (a person, any inputs, interactive).
- The flow lives in the core: `.agents/skills/explainer-kit/scripts/{bundle,verify,record}.mjs`, the authoring brief `references/recap-authoring.md` (mechanics only; the recipes' bundled briefs carry audience, voice, and narrative intent), orchestrated by prose in `explainer-kit/SKILL.md` § Run. The adapter `oat-explainer-kit` stays thin: it resolves the OAT project or program inputs, the theme from `explainers.defaults`, the output root, and the intent record, then calls the core scripts.
- Retained core libraries (edited where stated): `scripts/lib/qa.mjs` trimmed to `checkHtmlStructure`, `checkSourceDumping`, `checkArtifactCohesion`, `pngDimensions`, `REPRESENTATIVE_WIDTHS`; `scripts/lib/html-safety.mjs` whole (`validateHtmlSafety`, `coreScriptHashes`, `findUnpinnedResourceRefs`, used by `verify.mjs` to pin the authored page's scripts to the shell's); `scripts/lib/browser-runtime.mjs` and `scripts/lib/png.mjs` unchanged; `scripts/lib/theme.mjs` with `styles/`, `palettes/`, `profiles/` unchanged; `scripts/lib/contracts.mjs` trimmed to `validateContract` over `fact-base`, `manifest`, `theme` plus `canonicalHash` and `canonicalStringify`; `scripts/lib/recipes.mjs` trimmed to `RECIPES`, `loadRecipe`, `recipeFloor`, `recipeRequiredNarrative`; `scripts/lib/package-coverage.mjs` rewritten to the new rule (version `explainer-kit.package-coverage/v3`); `scripts/lib/fs-safe.mjs` and `safe-paths.mjs` unchanged; `schemas/{fact-base,manifest,theme}.schema.json` (manifest at v2, below); `recipes/{project-recap.v2,program-recap,project-explainer,engineer-tour}.json` trimmed to `schemaVersion`, `id`, `version`, `sourceRoles`, `floor`; `briefs/{project-recap,program-recap,project-explainer,engineer-tour}.md`; `templates/{house-style,deck-shell,diagram-shell,engineer-tour}.html` as authoring shells; `references/visual-authoring.md` (the agent's medium rules, pointed to by the brief) and `references/fact-base-contract.md` (rewritten for the flow).
- Retained adapter scripts: `check-core.mjs`, `resolve-paths.mjs#resolveExplainerOutputRoot`, `resolve-config.mjs` (the `explainers.defaults.*` keys only), `bind-project-sources.mjs` trimmed to the per-recipe allowlists and the supplied-fact-base path, `resolve-intent.mjs`, `persist-intent.mjs`, `check-terminal-outcome.mjs` (rewritten in place).
- Changed CLI surface (in lockstep): `packages/cli/src/commands/project/archive/archive-utils.ts` (manifest v2 validator, coverage and inventory calls, export re-verification; `readVerifiedRunMode`, `verifyProjectRecapTerminalEvidence`, and the legacy `qa/browser` and visual-review checks deleted) and its recap fixture in `archive-utils.test.ts:79-355`; `explainer-package-coverage.ts` (v3 loader); `explainer-terminal-evidence.ts` and `explainer-source-backlinks.ts` deleted; `release/public-package-contract.ts` packed-file pins (`package-coverage.mjs` content pin updated, `source-backlinks.mjs` pin removed) and its test; `commands/config/index.ts:145-150,312-315` and `config/resolve.test.ts` (the `explainers.publish.*` keys removed); `validation/skills.test.ts:1491-1509` (package-coverage version pin); `validation/autonomy-gate-inventory.test.ts` with the `## HEAD prompt-site coverage` table in `.agents/docs/autonomy-contract.md:255`; `commands/init/tools/shared/review-skill-contracts.test.ts` prose pins (`:468-635`, `:1449-1479`, incl. the `built-durable` mapping sentences at `:623-626`); `commands/project/push/completion-transaction.test.ts:561,748,1228` fixture receipts (outcome string only).
- Core prerequisite: `oat-explainer-kit/scripts/check-core.mjs#checkCoreCompatibility` resolves the core from `~/.agents/skills/explainer-kit`; the minimum advances to the version this project ships. A missing or too-old core is a hard prerequisite failure (Error Handling).

### Data Flow

1. The caller resolves the recipe (`project-recap` v2, `program-recap` v1, `project-explainer` v1, `engineer-tour` v1) and the inputs: an OAT project or program (adapter allowlists), a directory or list of documents, or a supplied fact base (front door). The adapter derives the output root (`<project>/explainers/<slug>/` or `.oat/repo/reference/explainers/<slug>/`); the front door takes `--out`.
2. `bundle.mjs` reads the inputs and writes `source/fact-base.json` (schema-valid), `source/fact-base.md` (derived), and `source/ledger.json` (the cohesion ledger derived from the claims). Freshness: an existing run under the output root whose `manifest.source.inputHashes` equal the freshly computed hashes and whose outcome is satisfied is reused without re-authoring.
3. The host agent reads the recipe's bundled brief, the authoring brief, the fact base, and the resolved theme, copies the recipe's shell from `templates/`, and writes `site/index.html`: one file, inline CSS from the theme, no external requests, the recipe's required sections as `<section id="…">` anchors. Interactive front-door runs confirm scope and show the fact-base summary before authoring; unattended lifecycle runs never prompt.
4. `verify.mjs` runs the browser-free checks (both claim-tracing directions, structure, source dumping, external requests, shell script pinning), then the ladder, and writes `qa/result.json` plus any screenshots under `qa/`.
5. `record.mjs` writes `theme.resolved.json` and `manifest.json` (v2) and returns the terminal outcome.
6. The caller routes on the outcome: satisfied, or an explicit retry-or-skip decision persisted in `state.md` (project) or the program ledger (program). A project explainer reports its outcome and run path and never affects the committed plan.

### Run package (the archive contract)

| Path                                                      | Written by                                              | Read by                                                                                                                 |
| --------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `manifest.json` (v2, carries `mode`)                      | `record.mjs`                                            | archive validator (keys, hashes, recipe id, mode enum), `oat-project-summary`, `oat-project-complete`, the wave ledgers |
| `theme.resolved.json`                                     | `record.mjs` (from `theme.mjs#resolveTheme`)            | manifest `theme.path`/`hash`; the authoring step's palette                                                              |
| `source/fact-base.json`, `source/fact-base.md`            | `bundle.mjs`                                            | the host agent (authoring), `verify.mjs`, a human auditing a claim                                                      |
| `source/ledger.json`                                      | `bundle.mjs`                                            | `verify.mjs` (both claim-tracing directions)                                                                            |
| `site/index.html`                                         | the host agent                                          | the human reader; the archive export; `verify.mjs`                                                                      |
| `qa/result.json`                                          | `verify.mjs`                                            | `record.mjs`, `oat-project-summary` (state and reason), `oat-project-complete` (retry/skip), a human                    |
| `qa/320.png`, `qa/768.png`, `qa/1440.png` (when captured) | the agent (host rung) or `verify.mjs` (Playwright rung) | a human; `verify.mjs` binding checks                                                                                    |

`immutableHashes` covers every path above except `manifest.json`. `permissibleRunPackagePaths` becomes exactly `immutableHashes` keys plus `manifest.json`; `requiredImmutablePackagePaths` becomes `theme.resolved.json`, `source/fact-base.json`, `source/fact-base.md`, `source/ledger.json`, `qa/result.json`, and each artifact's `contentPath` (`site/index.html`). `run-request.json`, `build-record.json`, `terminal-evidence.json`, `source/content-approval.json`, the set-plan records, `source/author/`, `source/content/`, `qa/browser/`, and `qa/visual-review/` no longer exist; `validateImmutablePackageEvidence` keeps only its coverage check and `enforceRunPackageInventory` keeps its exact-inventory rule over the new allowlist. `.oat/repo/reference/project-recaps/` holds two untracked legacy-shaped v1 exports (`20260721-explainer-kit`, `20260722-wave-skills-promotion`); they are unaffected because the archive re-verifies only the export destination of the project being archived (`archive-utils.ts:1540-1570`, the same-slug retry case).

## Component Design

### `scripts/bundle.mjs`

- Input: `{ recipe, inputs: { project | program | documents[] | factBasePath }, outputRoot }`.
- Allowlist (project, from the adapter): `summary.md`, `implementation.md`, `project-log.md`, `plan.md`, and `discovery.md` / `spec.md` / `design.md` when present; `orchestration-log.md` additionally for wave wrapper projects. Allowlist (project explainer): `plan.md`, `design.md`, `spec.md`, `discovery.md` when present. Allowlist (program): the execution-program artifact plus, per wave, exactly one exported summary under `.oat/repo/reference/project-summaries/` (the newest export by date prefix wins) and one archived wrapper's `implementation.md` § Final Summary when reachable. Documents (front door): every readable `.md`, `.txt`, `.html`, or `.json` file under the given roots. Any input whose realpath escapes its declared root is refused.
- Claims use the schema's real shape: `{ id, text, status: 'confirmed', citations: [{ sourceId, locator, path, lineRange }] }` (`locator` is required by `fact-base.schema.json`'s `citation`, written as `<path>:<start>-<end>`), one claim per extracted fact, with `sources[]` listing each input and its hash. Inputs that cannot be parsed land in `unresolvedClaims`, never dropped. The fact base is validated through `contracts.validateContract('fact-base')`; the retired `fact-base.mjs` is not reused.
- `source/ledger.json` is derived from the claims in the shape `checkArtifactCohesion` consumes (`qa.mjs:431-455`): `{ terminology: [{ term }], numbers: [{ subject, value }], statuses: [{ subject, value }] }`, subject = nearest heading or label. `terminology` is always non-empty because it starts with the project, program, or document-set name and adds phase titles and every backlog or wave identifier the inputs mention; dates are folded into `numbers` as `{ subject, value: '<ISO date>' }`.

### Authoring step (host agent, no script)

- The recipe's bundled brief (`floor[0].briefRef`) is handed to the agent verbatim. `references/recap-authoring.md` adds only what those briefs do not cover: the input files to read, the required sections by recipe (from `floor[].requiredNarrative`) as `<section id>` anchors, the shell to copy (`floor[0].template`, one of the four in `templates/`) and how to fill its placeholders with the theme CSS from `theme.resolved.json`, the one-file / inline-CSS / no-external-request / no-source-dumping rules, the claim discipline (every term, number, status, and date comes from the fact base, spelled as the fact base spells it), the pointer to `references/visual-authoring.md`, and the host-rung capture instruction. Nothing in it restates a bundled brief (NFR5).
- The flow reads `floor[].id`, `floor[].type`, `floor[].template`, `floor[].requiredNarrative`, and `floor[0].briefRef` from a recipe; the recipe files are trimmed to exactly `schemaVersion`, `id`, `version`, `sourceRoles`, `floor`, so nothing ignored remains. The program hub is authored as HTML like the project hub; the manifest's single artifact has `contentPath` = `site/index.html`.

### `scripts/verify.mjs`

- Browser-free checks (always): the HTML parses; every required `<section id>` is present and non-empty; `checkHtmlStructure`; `checkSourceDumping`; `findUnpinnedResourceRefs` finds no external `src`/`href` (anchors excepted); `validateHtmlSafety` with the recipe's shell (the page's scripts must match the shell's script hashes, no inline handlers); and the two claim passes, both fed by `extractRenderedClaims(html)`, a new helper owned by `verify.mjs` that harvests every term, number, date, and status token from the rendered text with its nearest heading or label as subject and returns the `{ terminology, numericClaims, statuses }` observation object. Ledger→page: that object is passed as the single artifact's `cohesion` to `checkArtifactCohesion` with `source/ledger.json`. Page→ledger: every harvested token must match a ledger entry by subject and value; an unmatched token fails the run with `verify-claim-untraced` naming it.
- Ladder: `--rung host --screenshots <dir>` accepts screenshots the agent captured with its own browser tool at 320 / 768 / 1440 (the skill tells the agent to open `file://…/site/index.html` and capture the three widths) and binds them: the agent records the SHA-256 of `site/index.html` at capture time in the request; `verify.mjs` recomputes it after the checks, validates each PNG's magic bytes and dimensions (`pngDimensions`) against the declared width, and downgrades the rung to `none` with a named reason if any check fails. Otherwise `resolveHeadlessRuntime` → `launchInstalledChromium` (or `createBrowserProbeSession`) → `probeRenderedPage(browser, url, { width, screenshotPath })` at `REPRESENTATIVE_WIDTHS`; otherwise `rung: none` with the `RUNTIME_UNAVAILABLE_REASONS` value.
- Output: `qa/result.json` (Data Models).

### `scripts/record.mjs`

- Writes `theme.resolved.json` and `manifest.json` per the v2 schema (Data Models): `schemaVersion: explainer-kit.manifest/v2`, `runId`, `slug`, `recipe {id, version}`, `createdAt`, `mode` (`unattended` from every lifecycle caller, `interactive` from the front door), `source {factBasePath, factBaseHash, inputHashes}`, `theme {path, hash}`, one artifact `{ id, type, contentPath: site/index.html, hash, status: built | failed }`, `immutableHashes` over the package table, `outcome`, `warnings`.
- Outcome semantics: checks pass and rung `host` or `playwright` → `built`; checks pass and rung `none` → `built-needs-review` with the reason; any check fails → `failed` with a sanitized cause (no absolute paths, no environment values); an interrupted run → `incomplete`. `built-durable` and `built-not-durable` are retired with the durability path.
- `check-terminal-outcome.mjs` is rewritten in place: `generate` is satisfied by `built` or `built-needs-review`; `failed` and `incomplete` are never satisfied. `SKIP_REASONS` becomes `{ interactive, failed_attempt, capability_probe }`, the last read-only legacy.

### Adapter (`oat-explainer-kit`)

- `SKILL.md` is rewritten around one section, § Generate: core prerequisite; resolve intent (`resolve-intent.mjs`, unchanged pairs plus `skip:failed_attempt`); resolve inputs by recipe (`bind-project-sources.mjs` allowlists), the theme (`resolve-config.mjs`, `explainers.defaults.*` only), and the output root (`resolve-paths.mjs`); call `bundle` → author → `verify` → `record`; the ladder instruction; the retry/skip rule; the outcome vocabulary. `references/lifecycle-contract.md` is rewritten to the intent record, the allowed pairs (extended with `skip/failed_attempt`; `skip/capability_probe` retained and marked read-only legacy), and the outcome vocabulary; `references/config-contract.md` to the `explainers.defaults.*` keys.
- Retired from the adapter, in one commit with the last consumer edit: `scripts/run.mjs`, `scripts/derive-destination.mjs`, `scripts/probe-recap-seams.mjs`, `scripts/finalize-tracked-run.mjs`, `references/{author-callback,visual-review-callback,migration}.md`, `tests/{run.integration,derive-destination,probe-recap-seams,finalize-tracked-run}.test.mjs`, the `seamProbe` argument and the module-scope import of `RECAP_PROBE_CODES` / `RECAP_SEAM_IDS` in `resolve-intent.mjs:1`, the `explainers.publish.*` keys in `resolve-config.mjs:14-19` and `tests/config-paths.test.mjs`, and the `run.mjs` import in `tests/check-core.test.mjs:16`. `tests/completion.integration.test.mjs` is rewritten to assert the § Generate prose and the new ordering in every caller instead of the probe prose it asserts today (`:200-260`).

### Front door and the project explainer

- `explainer-kit/SKILL.md` § Run replaces § Core Run, § Authoring, and § Review, Approval, and Warnings: a person names the recipe, the inputs (`--project <dir>`, `--inputs <file|dir>…`, or `--fact-base <path>`), and `--out <dir>`; the agent proposes scope and shows the fact-base summary before authoring (the personal kit's draft-first posture, as prose, no gate machinery), authors, runs `verify` and `record`, and reports the outcome, the run path, and any `verify-claim-untraced` token. The § Wrapper Extension Seam and § Dependency Direction sections are deleted with the extension contract.
- `oat-project-plan` Step 4.5 is unchanged (the `oat_project_explainer` intent record, `ALLOWED_PAIRS.projectExplainer`, and `persist-intent.mjs`). Step 15.5 is rewritten to call the adapter's § Generate with recipe `project-explainer` over the approved plan artifacts, report the outcome and run path, and continue to the summary on any outcome; its sentence requiring "the provider-neutral critic callback" is deleted. Project-explainer runs stay active-project working artifacts, never exported (`oat-project-complete/SKILL.md:608`, kept).

### State record and retry/skip

- The intent record keeps its three keys and `validateIntentRecord`'s arity; `resolve-intent.mjs` adds `failed_attempt` to `SOURCES` and `skip:failed_attempt` to `ALLOWED_PAIRS.projectRecap`; `capability_probe` stays in both so recorded skips remain valid on read but is never written again. `persist-intent.mjs` is unchanged.
- The last attempt is not stored in the intent record: the completion skill reads the newest run's `manifest.json` (`outcome`) and `qa/result.json` (`reason`) under the project's `explainers/` root, so `skip:failed_attempt` is valid only when that outcome is `failed` or `incomplete`.

### Skill prose and consumers

- `oat-project-complete`: Step 3.6 rewritten (core check → reuse a fresh run → else § Generate → on `failed` / `incomplete`, present the sanitized cause and require retry or skip; autonomous: one retry, then `skip:failed_attempt` recorded with the reason, never silent); Steps 10.5 (Re-attest Final Project Recap) and 10.6 (Commit Evidence + Push) deleted, and every other durability sentence (the `EVIDENCE_COMMIT` recovery in Step 3.65, the "durable project" branches of Steps 7, 8, 10, and 12; about 85 matching lines) rewritten so that the archive export in Step 8 is the durable copy and completion is one bookkeeping push. `oat-project-implement/references/completion-and-closeout.md` (the duplicate gate and durability lines, `:432-517`, `:629-673`, `:884-950`) the same way.
- `oat-project-summary` Explainer Outcome mapping (`:290-300`): `generated` (`built`), `generated — needs review` (`built-needs-review`, with reason), `skipped` (with reason), `failed` (with cause), read from `manifest.json` + `qa/result.json`; the `build-record.json` sentence goes.
- `oat-project-autonomous/SKILL.md` (~`:274-278`), `oat-wave-program/SKILL.md:145-151`, `oat-wave-execute/SKILL.md:470-476` (the author-seam paragraphs become one paragraph each invoking § Generate with `program-recap` and recording `runId` / `outcome`), `oat-project-plan` Step 15.5, `.agents/docs/autonomy-contract.md` row IMPLEMENT-19 and its § HEAD prompt-site coverage table (Phase 3 recomputes the site keys for `completion-and-closeout.md`, today `acf05140d8f3`, `37d6705db801`, `de4bc19da5e2`, and the six recap prompt sites in `oat-project-complete/SKILL.md`, in the same commit as the prose), the guard tests `oat-project-complete/tests/check-terminal-outcome.test.mjs` and `oat-project-implement/tests/check-terminal-outcome.test.mjs`, and the CLI prose pins named under System Context. One shared contract test over every carrier.
- Repository gates and instructions: `package.json` drops `release:validate:visual` from `release:validate` and the `test:release` script from the root `test` chain once `tools/release/*explainer*` is deleted; `AGENTS.md:74`, `.oat/repo/knowledge/testing.md:35`, and `apps/oat-docs/docs/contributing/code.md:60` drop the `test:release` mention; `tools/smoke/skill-version/reader-sameness.test.mjs:24-25` re-pins its two source files.
- Decision records: a new record supersedes `DR-260726-explainer-authoring-is-two`, `DR-260726-recipe-policy-owns-expansion`, `DR-260726-expansion-artifacts-get-id`, `DR-260726-explainer-render-qa-is-opt`, and `DR-260817-version-agnostic-publication` (recorded with `oat decision new` in Phase 3; the superseded records are not edited).

### Retained and retired inventory

| Surface                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Disposition                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core `scripts/run.mjs`, `render-qa.mjs`, `record-durability.mjs`, `publish.mjs`, `validate.mjs`; `lib/{set-plan,content-approval,visual-review,terminal-evidence,internal-references,render,markdown,diagram,durability,catalog,s3-static,s3-roots,publication-policy,fact-base,records,source-backlinks}.mjs`                                                                                                                                                                                                                                       | retired (Phase 1)                                                                                                                                                                            |
| Core `schemas/{author-request.v2,author-request.v3,author-result.v2,set-plan.v1,visual-review-request.v1,visual-review-result.v1,visual-review-evidence.v1,terminal-evidence.v1,durability-evidence,publish-request.v1,publish-request.v2,publish-receipt.v1,publish-receipt.v2,build-record,run-request}.schema.json`; `recipes/project-recap.v1.json`; `briefs/{deep-dive,project-page,supporting-diagram,walkthrough-deck}.md`; `examples/`; `references/{contracts,extension-contract,visual-review,destination-contract,golden-conformance}.md` | retired (Phase 1)                                                                                                                                                                            |
| Core tests `{content-approval,diagram,e2e-recap,golden-conformance,link-validation,markdown,narrative-render,render,run.integration,templates,durability,s3-static,fact-base}.test.mjs` and `fixtures/{golden,seeded-leak.html}`                                                                                                                                                                                                                                                                                                                     | retired (Phase 1)                                                                                                                                                                            |
| Core tests `{contracts,qa,html-safety,recipes,records,rebuildability,schemas,theme,visual-matrix}.test.mjs`                                                                                                                                                                                                                                                                                                                                                                                                                                          | rewritten to the retained exports (`records` and `rebuildability` fold into `verify`/`record` tests and are deleted as files; `visual-matrix` becomes a theme-CSS test without `render.mjs`) |
| Core `lib/{qa,html-safety,browser-runtime,png,theme,contracts,recipes,package-coverage,fs-safe,safe-paths}.mjs`; `schemas/{fact-base,manifest,theme}.schema.json`; `styles/`, `palettes/`, `profiles/`; four recipes; four briefs; four shells; `references/{visual-authoring,fact-base-contract}.md`                                                                                                                                                                                                                                                | kept (edits as stated)                                                                                                                                                                       |
| Adapter `scripts/{run,derive-destination,probe-recap-seams,finalize-tracked-run}.mjs`; `references/{author-callback,visual-review-callback,migration}.md`; tests named under Adapter                                                                                                                                                                                                                                                                                                                                                                 | retired (Phase 3)                                                                                                                                                                            |
| `tools/release/{build-explainer-rc,run-explainer-rc,explainer-rc-contract,validate-explainer-acceptance,validate-explainer-visuals}.mjs` and their tests; `tools/smoke/explainer-kit/{package-coverage-consumers,packaged-layout,publish-boundary,wrapper-compatibility}.test.mjs` and `fixtures/{package-root,private-wrapper}.mjs`; `.oat/repo/reference/explainer-kit-acceptance/`                                                                                                                                                                | retired (Phase 1); `tools/smoke/explainer-kit/check-core-version-parity.test.mjs` kept                                                                                                       |
| CLI `explainer-terminal-evidence.ts`, `explainer-source-backlinks.ts`, the `explainers.publish.*` config keys                                                                                                                                                                                                                                                                                                                                                                                                                                        | retired (Phase 1)                                                                                                                                                                            |
| Docs `workflows/skills/explainer-kit-providers.md`; `contributing/explainer-kit-verification.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                     | deleted with their index entries (`workflows/skills/index.md:15`, `contributing/index.md:20`)                                                                                                |

## Data Models

### `manifest.json` (`explainer-kit.manifest/v2`)

```json
{
  "schemaVersion": "explainer-kit.manifest/v2",
  "runId": "…",
  "slug": "…",
  "recipe": { "id": "project-recap", "version": "2" },
  "createdAt": "…",
  "mode": "unattended | interactive",
  "source": {
    "factBasePath": "source/fact-base.json",
    "factBaseHash": "…",
    "inputHashes": { "…": "…" }
  },
  "theme": { "path": "theme.resolved.json", "hash": "…" },
  "artifacts": [
    {
      "id": "project-recap",
      "type": "hub",
      "contentPath": "site/index.html",
      "hash": "…",
      "status": "built"
    }
  ],
  "immutableHashes": { "…": "…" },
  "outcome": "built | built-needs-review | failed | incomplete",
  "warnings": []
}
```

`additionalProperties: false` at every level; `archive-utils.ts` pins `schemaVersion` to v2 and rejects any other value (the v1 validator and its fixture are replaced, not kept).

### `qa/result.json`

```json
{
  "schemaVersion": "explainer-kit.qa/v1",
  "checks": {
    "parse": "pass",
    "sections": "pass",
    "structure": "pass",
    "sourceDumping": "pass",
    "externalRequests": "pass",
    "shellScripts": "pass",
    "ledgerToPage": "pass",
    "pageToLedger": "pass"
  },
  "rung": "host | playwright | none",
  "artifactSha256": "…",
  "screenshots": [{ "width": 320, "path": "qa/320.png" }],
  "reason": "sanitized, actionable, or null"
}
```

### `state.md` recap record (unchanged shape)

```yaml
oat_project_recap:
  decision: generate | skip
  source: interactive | autonomous_policy | failed_attempt # capability_probe read-only legacy
  decided_at: '…'
```

## Security Considerations

- Path containment: `bundle.mjs` refuses any input whose realpath escapes its declared root; symlinked inputs are read only when their target is inside those roots.
- The authored page makes no external requests and carries only the shell's scripts (`validateHtmlSafety`); screenshots are captured from a `file://` URL; the host rung's screenshots are bound to the artifact hash or rejected.
- Sanitized causes never carry absolute paths or environment values.

## Error Handling

- Core missing or below the minimum → `failed` before bundling, cause `Explainer Kit core missing or too old; run oat tools install utility --scope user`, then the normal retry-or-skip decision.
- Bundle refuses (allowlist miss, containment, unparseable required input) → the flow stops before authoring with the cause; the run directory is written to a temp dir and renamed on success, so nothing is half-written.
- Authoring absent or malformed → `verify.mjs` fails the parse/section check → `failed`, artifact retained.
- Browser absent, probe throws, or host screenshots fail binding → `rung: none`, `built-needs-review`, reason recorded.
- Interrupted between steps → `incomplete`; the next run reuses the bundle when the hashes match.

## Testing Strategy

### Requirement-to-Test Mapping

| Requirement | Test                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR1         | `tests/bundle.test.mjs`: project, project-explainer, program, and document allowlists incl. the newest-export rule; containment refusal (symlink escape); schema-valid claims with `locator`; ledger derivation with non-empty terminology; identical inputs → identical hashes                                                                                                                                                                                                                                          |
| FR2, FR4    | `tests/verify.test.mjs`: required sections; `extractRenderedClaims` fixtures; ledger→page (`cohesion-claim-unobserved`); page→ledger (`verify-claim-untraced`); source dumping, external requests, and a foreign script rejected                                                                                                                                                                                                                                                                                         |
| FR3, NFR3   | `tests/verify.test.mjs`: host rung accepted with a bound hash and valid PNGs, downgraded on hash mismatch or a bad PNG; Playwright rung when the runtime resolves; forced runtime-unavailable → `rung: none`, `built-needs-review`                                                                                                                                                                                                                                                                                       |
| FR5, NFR2   | `tests/record.test.mjs` writes a v2 package; `archive-utils.test.ts` (the exported `verifySelectedProjectRecapForArchive` over a checked-in copy) accepts it for `built` and `built-needs-review` in both modes and rejects the legacy v1 fixture, a v1 `schemaVersion`, and a package with an extra file — each red-then-green; `checkTerminalOutcome` red-then-green on `failed`, `incomplete`, and the retired `built-durable` / `built-not-durable` strings; `skip/failed_attempt` accepted, `skip/<other>` rejected |
| FR6         | `oat-explainer-kit/tests/completion.integration.test.mjs`: failed attempt → retry produces a run; `skip:failed_attempt` accepted only after a failed/incomplete run and honored on resume; `capability_probe` still readable; no silent skip                                                                                                                                                                                                                                                                             |
| FR7, FR8    | the shared contract test over all carriers (skills, reference docs, the autonomy row and table, both guard tests) and `review-skill-contracts.test.ts`                                                                                                                                                                                                                                                                                                                                                                   |
| FR9         | the program recap run: `qa/result.json` checks pass; the manifest verifies; the ledger row carries `runId` / `outcome`                                                                                                                                                                                                                                                                                                                                                                                                   |
| FR10        | `tests/front-door.test.mjs`: a scratch directory of three documents → bundle, an agent-authored fixture page, verify, record → `built-needs-review` with the runtime forced unavailable; a supplied fact base → the same; a missing `--out` refused                                                                                                                                                                                                                                                                      |
| FR11        | `oat-project-plan` contract test: Step 15.5 names § Generate and recipe `project-explainer`, no seam vocabulary; `tests/bundle.test.mjs` project-explainer allowlist; `intent.test.mjs` unchanged pairs                                                                                                                                                                                                                                                                                                                  |
| FR12        | a repository-wide sweep test (`tools/smoke/explainer-kit/no-retired-references.test.mjs`) that fails on any occurrence of the retired module paths, symbols, schema ids, outcome strings, config keys, or docs slugs (list pinned in the test) outside `.oat/projects/` and `.oat/repo/reference/` history                                                                                                                                                                                                               |
| NFR1        | fresh-host end-to-end in a scratch repo with the core installed at user scope and `EXPLAINER_KIT_HEADLESS_PROBE` disabled: generation succeeds as `built-needs-review`; negative controls (delete a section; point the runtime at a missing binary; remove the core) stay visible while the accepted control still generates                                                                                                                                                                                             |
| NFR4        | `pnpm run check:skill-bumps`, `pnpm release:check-versions`, `pnpm release:validate`, and `tools/smoke/explainer-kit/check-core-version-parity.test.mjs`                                                                                                                                                                                                                                                                                                                                                                 |
| NFR5        | the design review's necessity item over this document, and the package table above naming a reader for every path                                                                                                                                                                                                                                                                                                                                                                                                        |

### Negative controls

Each guard is neutralized once (section check, both claim passes, shell script pinning, containment, the host-rung binding, the terminal-outcome rule, the new package rule, the no-retired-references sweep) and the corresponding test must go red, then restored. Each acceptance change under Migration Plan gets its own pre-fix-rejects / post-fix-accepts control.

## Deployment Strategy

- Skill bumps: `explainer-kit` (major; the core minimum in `check-core.mjs` advances to it), `oat-explainer-kit`, `oat-project-complete`, `oat-project-summary`, `oat-project-autonomous`, `oat-project-implement`, `oat-project-plan`, `oat-wave-program`, `oat-wave-execute`; pins located by old literal; lockstep public-package bump.
- Docs: `workflows/skills/explainer-kit.md` rewritten around the flow; `workflows/projects/lifecycle.md:88-102` and `workflows/projects/artifacts.md:121-140` (recap gate, run package); `cli-utilities/configuration.md:178-230` (the publish keys removed); `cli-utilities/tool-packs.md:159-187` (the two-pack description); `reference/troubleshooting.md:331-368` (rewritten for `built-needs-review` as a satisfied outcome); `reference/cli-reference.md:154` (unchanged flag); the two deleted pages and their index entries.
- Rollback: revert the project's PR; no data migration exists because no run on this repository was produced by the retired path after the seams shipped and the two legacy exports are untracked.

## Migration Plan

- Existing `skip/capability_probe` state records stay valid on read.
- The complete list of acceptance changes (NFR2), each pinned by a negative control: (1) the archive accepts the new v2 package; (2) it stops accepting the v1 package shape and any `schemaVersion` other than v2; (3) `check-terminal-outcome.mjs` accepts `skip/failed_attempt`; (4) the archive no longer requires `terminal-evidence.json`, `run-request.json`, `build-record.json`, `source/content-approval.json`, set-plan records, or the `qa/browser/` and `qa/visual-review/` chains; (5) `built` replaces `built-durable` and `built-not-durable` in every consumer. Everything else the archive validator or the guard rejects today stays rejected.
- Invariant at every phase boundary: the full gate list is green and no file references a missing module, symbol, or docs page. Within a phase, task commits may be intermediate; each phase's last task runs the sweep test and the gates.

## Implementation Phases

### Phase 1: The cut — core flow, contracts, and retirement

Manifest v2 schema and package rule v3; `bundle.mjs`, `verify.mjs` (browser-free checks and the `none` rung), `record.mjs`; the trimmed `contracts`, `recipes`, `qa` libraries; the trimmed recipes and briefs; the retired core scripts, libraries, schemas, references, examples, and tests; the `archive-utils.ts` v2 validator with its loaders and fixture; the `explainers.publish.*` keys; the release-candidate tooling, its `package.json` scripts, and the smoke tests; the acceptance directory; the no-retired-references sweep test (scoped to the core and CLI in this phase); the core's rewritten tests.

### Phase 2: Ladder and fresh-host proof

`verify.mjs` host and Playwright rungs with the hash binding; `references/recap-authoring.md`; the fresh-host end-to-end test with its negative controls.

### Phase 3: Adapter, lifecycle consumers, and docs

`oat-explainer-kit` § Generate and the retired adapter surface; `resolve-intent.mjs` pairs; `check-terminal-outcome.mjs`; every lifecycle carrier (completion incl. the deleted durability steps, closeout, autonomous, summary, plan Step 15.5, both wave skills), the autonomy row and recomputed table, both guard tests, both CLI contract tests; the docs pages; the decision record; the sweep test widened to the whole repository; `AGENTS.md` and the knowledge file.

### Phase 4: The front door

`explainer-kit/SKILL.md` § Run for documents and supplied fact bases; `tests/front-door.test.mjs`; the project explainer proven end to end on this project's own plan artifacts.

### Phase 5: The program recap

Generate the recap for the 2026-08-31 execution program through the flow (one summary per wave by the newest-export rule), record `runId` / `outcome` in the program ledger, and attach the result as the project's validation evidence.

## Dependencies

### Internal Dependencies

- The Explainer Kit core libraries under System Context (user-scope install at the version this project ships); the archive command (changed in lockstep).

### Development Dependencies

- Playwright/Chromium when present for the middle rung; tests run without it.

## Risks and Mitigation

| Risk                                                                | Mitigation                                                                                                                                                  |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The cut in Phase 1 is wide and intermediate commits are red         | Phase-boundary invariant with the sweep test; deletions are grouped per consumer so each task's commit removes a module and its last reference together     |
| Host-browser rung is host-specific                                  | Phase 2 proves `none` and `playwright` first; the host rung is additive input and is bound to the artifact hash                                             |
| Claim extraction misses a token the agent renders, or over-extracts | Both passes fail closed with the token named; the brief tells the agent to spell facts as the fact base does; the extraction rules are pinned with fixtures |
| Consumers drift on the outcome vocabulary                           | One contract test over every carrier incl. the CLI prose pins, plus the repository-wide sweep                                                               |
| Completion-skill durability prose is entangled across eight steps   | Phase 3 rewrites the skill from its step list with `review-skill-contracts.test.ts` and `autonomy-gate-inventory.test.ts` as the two machine checks         |
| Program recap inputs span archived wrappers and duplicate exports   | The newest-export rule binds one summary per wave; unreachable inputs land in `unresolvedClaims`                                                            |

## References

- `spec.md`, `discovery.md` (incl. the 2026-09-09 amendment); the 2026-09-09 design reviews (`reviews/archived/artifact-design-review-2026-09-09T225646Z.md`, `reviews/archived/artifact-design-review-2026-09-09T232532Z.md`); the 2026-09-09 core disposition recon (module reachability, package requirements of the retired durability path, test coupling, vocabulary carriers).
- `.agents/skills/explainer-kit/recipes/*.json`; `scripts/lib/{qa,html-safety,package-coverage,contracts,recipes}.mjs`; `schemas/{manifest,fact-base,theme}.schema.json`; `templates/*.html`.
- `.agents/skills/oat-explainer-kit/scripts/{resolve-intent,persist-intent,check-core,check-terminal-outcome,bind-project-sources,resolve-config,resolve-paths}.mjs`; `~/.agents/skills/personal-explainer-kit/SKILL.md` (the original agent-authored workflow this restores).
