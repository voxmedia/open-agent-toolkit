---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-09
oat_generated: false
---

# Design: agent-authored-recap

## Overview

The OAT explainer adapter skill (`oat-explainer-kit`) gains one `generate` flow: three small scripts (bundle, verify, record) around a single authoring step performed by the host agent, with visual verification resolved at run time through a three-rung ladder. The flow keeps the Explainer Kit's fact-base schema, cohesion checker, HTML checks, browser probe, and manifest key contract as libraries; it drops the set planner, the five provider seams, expansion, publish/durability, and the legacy run-package shape from the default path. The archive command's package rule is replaced (no backward compatibility) so it requires exactly the new package; that departs from discovery Q2 by the operator's decision of 2026-09-09 ("we don't need backward compatibility"), recorded here and as dated superseded notes in `discovery.md`. The lifecycle consumers call the flow; the program recap for the execution program is the last implementation phase.

## Architecture

### System Context

- Callers: `oat-project-complete` (Step 3.6 recap gate and its duplicate in `oat-project-implement/references/completion-and-closeout.md`), `oat-project-summary` (Explainer Outcome mapping), `oat-project-autonomous` (autonomous recap tail), `oat-wave-program` and `oat-wave-execute` (program-close caller).
- The flow: `.agents/skills/oat-explainer-kit/scripts/recap/{bundle,verify,record}.mjs`, the authoring brief `references/recap-authoring.md`, orchestrated by prose in `oat-explainer-kit/SKILL.md` § Generate.
- Reused libraries (unchanged): `explainer-kit/schemas/fact-base.schema.json`; `scripts/lib/qa.mjs` (`checkArtifactCohesion`, `checkHtmlStructure`, `checkSourceDumping`, `pngDimensions`, `REPRESENTATIVE_WIDTHS`); `scripts/lib/browser-runtime.mjs` (`resolveHeadlessRuntime`, `launchInstalledChromium` / `createBrowserProbeSession`, `probeRenderedPage`, `RUNTIME_UNAVAILABLE_REASONS`); `schemas/manifest.schema.json` (its `required` array is the key contract). Reused adapter scripts (unchanged): `oat-explainer-kit/scripts/resolve-paths.mjs#resolveExplainerOutputRoot` (the output root in Data Flow step 1), `resolve-config.mjs#resolveExplainerConfig` (`explainers.defaults` for `theme.resolved.json`), and `check-core.mjs`. Read-only dependency: `oat-explainer-kit/scripts/finalize-tracked-run.mjs`, the only producer of `built-durable`.
- Changed downstream (in lockstep), the complete archive change inventory: `explainer-kit/scripts/lib/package-coverage.mjs` — `requiredImmutablePackagePaths` (new required set), `permissibleRunPackagePaths` (exactly `immutableHashes` keys plus `manifest.json`), and `validateImmutablePackageEvidence`, whose `project-recap` branch (legacy review material, the outcome/run-mode `requireAttemptOne` computation at `:191-201`, and the `qa/browser/` chain reads) is deleted so the function keeps only its first check, that `immutableHashes` covers `requiredImmutablePackagePaths`; `packages/cli/src/commands/project/archive/archive-utils.ts` — the coverage and inventory calls around `:1418-1436` and `:1480-1492`, the legacy `qa/browser` and visual-review-chain checks, and `verifyProjectRecapTerminalEvidence` (`:1366-1387`) with its three call sites (`:1471`, `:1564`, `:1628`), all deleted, together with the `explainer-terminal-evidence.ts` loader when nothing else imports it; `terminal-evidence.json` is dropped from the contract for every outcome because the outcome sits inside the hash-verified `manifest.json` and its reason inside `qa/result.json`, which is in `immutableHashes`. Untouched: the manifest-key validator `isProjectRecapManifestV1` and `readVerifiedRunMode`. Rewritten: `archive-utils.test.ts`'s recap fixture (`:79-355`).
- Core prerequisite: `oat-explainer-kit/scripts/check-core.mjs#checkCoreCompatibility` resolves the core from `~/.agents/skills/explainer-kit` (minimum 2.1.0). A missing or too-old core is a hard prerequisite failure (see Error Handling).

### Data Flow

1. The caller checks the core (prerequisite), resolves the recipe (`project-recap` v2 or `program-recap` v1) and the output root (`<project>/explainers/<slug>/` or `.oat/repo/reference/explainers/<slug>/`).
2. `bundle.mjs` reads the allowlisted inputs and writes `source/fact-base.json` (canonical), `source/fact-base.md` (derived), and `source/ledger.json` (the cohesion ledger derived from the claims). Input hashes go into the manifest at record time; freshness is decided by comparing the existing run's `manifest.source.inputHashes` with the freshly computed hashes, and a fresh run with a usable outcome is reused without re-authoring.
3. The host agent reads the authoring brief and the fact base and writes `site/index.html`: one file, inline CSS, no external requests, the recipe's required sections as `<section id="…">` anchors.
4. `verify.mjs` runs the browser-free checks (both directions of claim tracing), then the ladder, and writes `qa/result.json` plus any screenshots under `qa/`.
5. `record.mjs` writes `run-request.json`, `theme.resolved.json`, and `manifest.json`, and returns the terminal outcome.
6. The caller routes on the outcome: satisfied, or an explicit retry-or-skip decision persisted in `state.md` (project) or the program ledger (program).

### Run package (the archive contract)

| Path                                                      | Written by                                                                                                                                                                                                                                                  | Read by                                                                                                                  |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `manifest.json`                                           | `record.mjs`                                                                                                                                                                                                                                                | archive validator (keys, hashes, recipe id), `oat-project-summary`, `oat-project-complete`, the wave ledgers             |
| `run-request.json` (`{ mode, recipe, slug }`)             | `record.mjs` (`mode` as passed by the caller: `unattended` from every lifecycle tail, `interactive` only when a human runs the flow by hand; after the branch deletion above no archive gate branches on it, `readVerifiedRunMode` only validates the enum) | archive `readVerifiedRunMode`; the resume path                                                                           |
| `theme.resolved.json`                                     | `record.mjs` (from `explainers.defaults`)                                                                                                                                                                                                                   | manifest `theme.path`; the authoring brief's palette                                                                     |
| `source/fact-base.json`, `source/fact-base.md`            | `bundle.mjs`                                                                                                                                                                                                                                                | the host agent (authoring), `verify.mjs`, a human auditing a claim                                                       |
| `source/ledger.json`                                      | `bundle.mjs`                                                                                                                                                                                                                                                | `verify.mjs` (both claim-tracing directions)                                                                             |
| `site/index.html`                                         | the host agent                                                                                                                                                                                                                                              | the human reader; the archive export; `verify.mjs`                                                                       |
| `build-record.json`                                       | `record.mjs` (minimal, schema-valid `explainer-kit.build-record/v1`: `runId`, `renderStrategy: default-only`, `startedAt`/`completedAt`, stages `fact-base`, `content`, `qa` with status and `outputPaths`, `outcome`)                                      | manifest `buildRecord.hash` (`archive-utils.ts:1047`); `durability.mjs#recordDurability` on the read-only finalizer path |
| `qa/result.json`                                          | `verify.mjs`                                                                                                                                                                                                                                                | `record.mjs`, `oat-project-summary` (state and reason), `oat-project-complete` (retry/skip), a human                     |
| `qa/320.png`, `qa/768.png`, `qa/1440.png` (when captured) | the agent (host rung) or `verify.mjs` (Playwright rung)                                                                                                                                                                                                     | a human; `verify.mjs` binding checks                                                                                     |

`immutableHashes` covers every path above except `manifest.json`. `permissibleRunPackagePaths` becomes exactly `immutableHashes` keys plus `manifest.json` (it is the gate that enforces `build-record.json`'s presence today, at `package-coverage.mjs:33` with `enforceRunPackageInventory`'s every-allowed-file-present rule; the file stays in the package, now hash-covered). `requiredImmutablePackagePaths` for `project-recap` becomes `run-request.json`, `theme.resolved.json`, `build-record.json`, `source/fact-base.json`, `source/fact-base.md`, `source/ledger.json`, `qa/result.json`, and each artifact's `contentPath`/`renderedPath` (both `site/index.html`); the outcome-keyed set-plan and visual-review requirements and `source/content-approval.json` are removed from it. `terminal-evidence.json` is removed by deleting `verifyProjectRecapTerminalEvidence` and its call sites, and the `qa/browser/` chain by deleting `validateImmutablePackageEvidence`'s `project-recap` branch (both under System Context). `.oat/repo/reference/project-recaps/` holds two untracked legacy-shaped v1 exports (`20260721-explainer-kit`, `20260722-wave-skills-promotion`); they are unaffected because the archive re-verifies only the export destination of the project being archived (`archive-utils.ts:1540-1570`, the same-slug retry case), never other projects' exports.

## Component Design

### `scripts/recap/bundle.mjs`

- Input: `{ recipe, projectPath | programArtifactPath, outputRoot }`.
- Allowlist (project): `summary.md`, `implementation.md`, `project-log.md`, `plan.md`, and `discovery.md` / `spec.md` / `design.md` when present; `orchestration-log.md` additionally for wave wrapper projects (both logs when both exist). Allowlist (program): the execution-program artifact plus, per wave, exactly one exported summary under `.oat/repo/reference/project-summaries/` (the newest export by date prefix wins; older exports are ignored) and exactly one archived wrapper's `implementation.md` § Final Summary when reachable. Any input whose realpath escapes the project root, the archive root, or `.oat/repo/reference/` is refused.
- Claims use the schema's real shape: `{ id, text, status: 'confirmed', citations: [{ sourceId, locator, path, lineRange }] }` (`locator` is required by `fact-base.schema.json`'s `citation` and is written as `<path>:<start>-<end>`), one claim per extracted fact, with `sources[]` listing each input and its hash. Inputs that cannot be parsed land in `unresolvedClaims`, never dropped.
- `source/ledger.json` is derived from the claims in the shape `checkArtifactCohesion` consumes (`qa.mjs:431-455`): `{ terminology: [{ term }], numbers: [{ subject, value }], statuses: [{ subject, value }] }`, where the subject is the nearest heading or label. `terminology` is always non-empty because it starts with the project (or program) name and adds phase titles from `plan.md` and every backlog or wave identifier the inputs mention; dates are folded into `numbers` as `{ subject, value: '<ISO date>' }`, so there is no fourth group. It is the same table the page→ledger pass matches against.

### Authoring step (host agent, no script)

- The recipe's bundled brief (`floor[0].briefRef`: `briefs/project-recap.md` or `briefs/program-recap.md`, audience, voice, and narrative intent, not seam-specific) is handed to the agent verbatim. `references/recap-authoring.md` adds only what those briefs do not cover: the input files to read, the required sections by recipe (from `floor[].requiredNarrative`) as `<section id>` anchors, the one-file / inline-CSS / no-external-request / no-source-dumping rules, the palette from `theme.resolved.json`, the claim discipline (every number, status, and date must come from the fact base, spelled as the fact base spells it), and the host-rung capture instruction. Nothing in it restates a bundled brief (NFR5).
- The flow reads only `floor[].id`, `floor[].type`, `floor[].requiredNarrative`, and `floor[0].briefRef` from a recipe. It deliberately ignores `authoring`, `expansion`, `discoveryLimits`, and (`project-recap.v2` only) `fallback`, which belong to the advanced kit's run orchestrator; the program hub is authored as HTML like the project hub, and the manifest's `contentPath` and `renderedPath` both name `site/index.html`.

### `scripts/recap/verify.mjs`

- Browser-free checks (always): the HTML parses; every required `<section id>` is present and non-empty; `checkHtmlStructure`; `checkSourceDumping`; no external `src`/`href` (anchors excepted); and the two claim passes, both fed by `extractRenderedClaims(html)`, a new helper owned by `verify.mjs` that harvests every term, number, date, and status token from the rendered text with its nearest heading or label as subject and returns the `{ terminology, numericClaims, statuses }` observation object. Ledger→page: that object is passed as the single artifact's `cohesion` to `checkArtifactCohesion` with `source/ledger.json`, so every ledger entry must be observed on the page. Page→ledger: every harvested token must match a ledger entry by subject and value — an unmatched token fails the run with `verify-claim-untraced` naming it. The two passes together are FR4.
- Ladder: `--rung host --screenshots <dir>` accepts screenshots the agent captured with its own browser tool at 320 / 768 / 1440 (the skill tells the agent to open `file://…/site/index.html` and capture the three widths) and binds them: the agent records the SHA-256 of `site/index.html` at capture time in the request; `verify.mjs` recomputes it after the checks, validates each PNG's magic bytes and dimensions (`pngDimensions`) against the declared width, and downgrades the rung to `none` with a named reason if any check fails. Otherwise `resolveHeadlessRuntime` → `launchInstalledChromium` (or `createBrowserProbeSession`) → `probeRenderedPage(browser, url, { width, screenshotPath })` at `REPRESENTATIVE_WIDTHS`; otherwise `rung: none` with the `RUNTIME_UNAVAILABLE_REASONS` value.
- Output: `qa/result.json` `{ checks: { … }, rung: host|playwright|none, artifactSha256, screenshots: [{ width, path }], reason }`.

### `scripts/recap/record.mjs`

- Writes `run-request.json`, `theme.resolved.json`, `build-record.json`, and `manifest.json` exactly per `manifest.schema.json`'s `required` array (`schemaVersion: explainer-kit.manifest/v1`, `runId`, `slug`, `recipe`, `createdAt`, `source.factBasePath/factBaseHash/inputHashes`, `theme`, `artifacts`, `immutableHashes` over the package table, `outcome`, `buildRecord` with the hash of the written `build-record.json`, `warnings`). The optional `source.backlinks` is omitted: it requires canonical pinned-revision GitHub blob URLs (`archive-utils.ts:1026-1027`) that an in-worktree artifact on an unpushed branch cannot supply. The one hub artifact carries `contentPath` = `renderedPath` = `site/index.html`, `status: built`, `rebuildable: true`, and the `hash` that `archive-utils.ts:1087` requires for a built artifact.
- Outcome semantics (the enum is unchanged): checks pass and rung `host` or `playwright` → `built-not-durable`; checks pass and rung `none` → `built-needs-review` with the reason; any check fails → `failed` with a sanitized cause (no absolute paths, no environment values); an interrupted run → `incomplete`. `built-durable` is produced only by the tracked-run finalizer and stays satisfied.
- `check-terminal-outcome.mjs` is rewritten in place: `generate` is satisfied by `built-durable`, `built-not-durable`, or `built-needs-review`; `failed` and `incomplete` are never satisfied. `SKIP_REASONS` becomes `{ interactive, failed_attempt, capability_probe }`, the last read-only legacy.

### Retained and retired adapter surface

| File                                                                                                                                                                                                                                                                                                                                  | Disposition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/check-core.mjs`, `scripts/resolve-paths.mjs`, `scripts/resolve-config.mjs`                                                                                                                                                                                                                                                   | reused by the flow (core check, output root, `explainers.defaults`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `scripts/resolve-intent.mjs`, `scripts/persist-intent.mjs`, `scripts/check-terminal-outcome.mjs`                                                                                                                                                                                                                                      | reused by the flow; the first and last are edited as stated above                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `scripts/finalize-tracked-run.mjs` and its test                                                                                                                                                                                                                                                                                       | kept, read-only, the only `built-durable` producer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `scripts/run.mjs`, `bind-project-sources.mjs`, `derive-destination.mjs`, `references/author-callback.md`, `references/visual-review-callback.md`, `references/migration.md`, `tests/run.integration.test.mjs`, `tests/config-paths.test.mjs`, `tests/derive-destination.test.mjs`, `tests/check-core.test.mjs` (its `run.mjs` import) | kept for the advanced path, whose caller is `oat-explainer-kit/SKILL.md` § Core Invocation (a user-invoked run with provider modules for `project-explainer` or a provider-backed recap); after this project its only lifecycle caller is `oat-project-plan` Step 15.5 (`project-explainer`, when the `oat_project_explainer` decision is `generate`; three recorded decisions on this repository, all `skip`, and no run). Retiring the advanced path is a separate decision, out of this project's scope (discovery non-goal: the advanced kit stays installed and its parity smoke keeps passing) |
| `scripts/probe-recap-seams.mjs` and `tests/probe-recap-seams.test.mjs`                                                                                                                                                                                                                                                                | retired in Phase 3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

### State record and retry/skip

- The intent record keeps its three keys and `validateIntentRecord`'s arity; `resolve-intent.mjs` adds `failed_attempt` to `SOURCES` and `skip:failed_attempt` to `ALLOWED_PAIRS.projectRecap`; `capability_probe` stays in both so recorded skips remain valid on read but is never written again. `persist-intent.mjs` is unchanged.
- The last attempt is not stored in the intent record: the completion skill reads the newest run's `manifest.json` (`outcome`) and `qa/result.json` (`reason`) under the project's `explainers/` root, so `skip:failed_attempt` is valid only when that outcome is `failed` or `incomplete`.

### Skill prose and consumers

- `oat-explainer-kit/SKILL.md` § Generate: the flow above, the core prerequisite, the ladder instruction for the agent, and the retry/skip rule. Removed or rewritten in Phase 3, in one commit with the last consumer edit: the seam-probe section, `probe-recap-seams.mjs`, its test, the `seamProbe` argument and the module-scope import of `RECAP_PROBE_CODES` / `RECAP_SEAM_IDS` in `resolve-intent.mjs:1`, the seam-probe references at `references/config-contract.md:35` and `references/lifecycle-contract.md:29` and `:154`, and `tests/completion.integration.test.mjs:200-260`, which today asserts the probe prose and its position in every caller and is rewritten to assert the § Generate prose instead. `lifecycle-contract.md` § State records (`:73`, `:76-81`) is extended with `skip/failed_attempt`; `skip/capability_probe` is retained there and marked read-only legacy, matching the code. The commit-boundary invariant (no consumer references a missing script) covers the skill tests and the reference docs, not only executable call sites.
- Vocabulary carriers, all edited together with one shared contract test: `oat-project-complete/SKILL.md` Step 3.6 and export path; `oat-project-implement/references/completion-and-closeout.md` (the duplicate gate, ~`:896-947`); `oat-project-autonomous/SKILL.md` (~`:274-278`); `.agents/docs/autonomy-contract.md` row IMPLEMENT-19 and its § HEAD prompt-site coverage table (`:255`), which `packages/cli/src/validation/autonomy-gate-inventory.test.ts` validates by hashing every prompt-shaped line of each in-inventory lifecycle skill — Phase 3 recomputes the site keys for `completion-and-closeout.md` (today `acf05140d8f3`, `37d6705db801`, `de4bc19da5e2`) and the six recap prompt sites in `oat-project-complete/SKILL.md` and updates the table in the same commit as the prose; `oat-project-summary/SKILL.md` Explainer Outcome mapping; `oat-wave-program/SKILL.md` and `oat-wave-execute/SKILL.md` program-close callers (one paragraph each invoking the flow with `program-recap` and recording `runId` / `outcome`); the guard tests `oat-project-complete/tests/check-terminal-outcome.test.mjs` and `oat-project-implement/tests/check-terminal-outcome.test.mjs`; and `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts` (~`:468-635`, `:1449-1479`), whose prose pins on the recap gate are rewritten with the prose.
- `oat-project-complete` Step 3.6: core check → reuse a fresh run → else run the flow → on `failed` / `incomplete`, present the sanitized cause and require retry or skip (autonomous: one retry, then `skip:failed_attempt` recorded with the reason, never silent).
- `oat-project-summary` outcome mapping: `generated` (`built-durable` / `built-not-durable`), `generated — needs review` (`built-needs-review`, with reason), `skipped` (with reason), `failed` (with cause), read from `manifest.json` + `qa/result.json`.

## Data Models

### `qa/result.json`

```json
{
  "schemaVersion": "oat.recap-qa/v1",
  "checks": {
    "parse": "pass",
    "sections": "pass",
    "structure": "pass",
    "sourceDumping": "pass",
    "externalRequests": "pass",
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

- Path containment: `bundle.mjs` refuses any input whose realpath escapes the project root, the archive root, or `.oat/repo/reference/`; symlinked inputs are read only when their target is inside those roots.
- The authored page makes no external requests (checked); screenshots are captured from a `file://` URL; the host rung's screenshots are bound to the artifact hash or rejected.
- Sanitized causes never carry absolute paths or environment values.

## Error Handling

- Core missing or below 2.1.0 → `failed` before bundling, cause `Explainer Kit core missing or too old; run oat tools install utility --scope user`, then the normal retry-or-skip decision.
- Bundle refuses (allowlist miss, containment, unparseable required input) → the flow stops before authoring with the cause; the run directory is written to a temp dir and renamed on success, so nothing is half-written.
- Authoring absent or malformed → `verify.mjs` fails the parse/section check → `failed`, artifact retained.
- Browser absent, probe throws, or host screenshots fail binding → `rung: none`, `built-needs-review`, reason recorded.
- Interrupted between steps → `incomplete`; the next run reuses the bundle when the hashes match.

## Testing Strategy

### Requirement-to-Test Mapping

| Requirement | Test                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR1         | `bundle.test.mjs`: allowlists incl. `project-log.md` and the newest-export rule, containment refusal (symlink escape), schema-valid claims, ledger derivation, identical inputs → identical hashes                                                                                                                                                                                                                                                                                                                                                                                   |
| FR2, FR4    | `verify.test.mjs`: required sections; `extractRenderedClaims` fixtures; ledger→page (`cohesion-claim-unobserved`); page→ledger (`verify-claim-untraced` on a number absent from the fact base); source dumping and external requests rejected                                                                                                                                                                                                                                                                                                                                        |
| FR3, NFR3   | `verify.test.mjs`: host rung accepted with a bound hash and valid PNGs, downgraded on hash mismatch or a bad PNG; Playwright rung when the runtime resolves; forced runtime-unavailable → `rung: none`, `built-needs-review`                                                                                                                                                                                                                                                                                                                                                         |
| FR5, NFR2   | `record.test.mjs` (skill tier) writes a package; `archive-utils.test.ts` (CLI tier, the exported `verifySelectedProjectRecapForArchive` over a checked-in copy of that package) accepts it for `built-not-durable` and `built-needs-review` in both `unattended` and `interactive` run modes with no `qa/browser/` chain and no `terminal-evidence.json`, and rejects the legacy fixture shape — each red-then-green; `checkTerminalOutcome` red-then-green on `failed`, `incomplete`, and `built-durable`; `skip/failed_attempt` accepted and `skip/<anything else>` still rejected |
| FR6         | `completion.integration.test.mjs`: failed attempt → retry produces a run; `skip:failed_attempt` accepted only after a failed/incomplete run and honored on resume; `capability_probe` still readable; no silent skip                                                                                                                                                                                                                                                                                                                                                                 |
| FR7, FR8    | the shared contract test over all carriers (skills, reference docs, the autonomy contract row, both guard tests) and `review-skill-contracts.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                |
| FR9         | the program recap run: `qa/result.json` checks pass; the manifest verifies; the ledger row carries `runId` / `outcome`                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| NFR1        | fresh-host end-to-end in a scratch repo with the core installed at user scope and `EXPLAINER_KIT_HEADLESS_PROBE` disabled: generation succeeds as `built-needs-review`; negative controls (delete a section; point the runtime at a missing binary; remove the core) stay visible while the accepted control still generates                                                                                                                                                                                                                                                         |
| NFR4        | `pnpm run check:skill-bumps`, `pnpm release:check-versions`, `pnpm release:validate`, and `tools/smoke/explainer-kit/check-core-version-parity.test.mjs`                                                                                                                                                                                                                                                                                                                                                                                                                             |
| NFR5        | the design review's necessity item over this document, and the package table above naming a reader for every path                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

### Negative controls

Each guard is neutralized once (section check, both claim passes, containment, the host-rung binding, the terminal-outcome rule, the new package rule) and the corresponding test must go red, then restored. Each acceptance change under Migration Plan gets its own pre-fix-rejects / post-fix-accepts control: a `skip/failed_attempt` intent against the old `SKIP_REASONS`; a `built-needs-review` package with no `terminal-evidence.json`; a `built-not-durable` / `unattended` package with no `qa/browser/` chain; the new package against the old rule; the legacy fixture against the new rule.

## Deployment Strategy

- Skill bumps: `oat-explainer-kit`, `explainer-kit` (package-coverage change; core minimum advances with it), `oat-project-complete`, `oat-project-summary`, `oat-project-autonomous`, `oat-project-implement`, `oat-wave-program`, `oat-wave-execute`; pins located by old literal; lockstep public-package bump; docs (`workflows/projects/lifecycle.md` recap gate, `workflows/projects/artifacts.md`, `workflows/skills/explainer-kit.md` "default path" note, `contributing/explainer-kit-verification.md` if the package shape is described there; `reference/troubleshooting.md:331-351`, whose "built-needs-review will not be archived" section is rewritten for the new semantics; `workflows/skills/explainer-kit-providers.md:26,100,115`, whose four-role and unattended-recap statements are scoped to the advanced path).
- Rollback: reverting the adapter skill and the package-coverage change together restores the prior path; the advanced kit's recipes are untouched.

## Migration Plan

- Existing `skip/capability_probe` state records stay valid on read.
- The complete list of acceptance changes (NFR2), each pinned by a negative control under Testing Strategy: (1) the archive accepts the new small run package; (2) it stops accepting the legacy package shape, so a legacy-shaped run that has not been archived cannot be archived after this change (none exists in this repository); (3) `check-terminal-outcome.mjs` accepts `skip/failed_attempt`; (4) the archive stops requiring hash-bound `terminal-evidence.json` for `built-needs-review` and `failed`; (5) the archive stops requiring the `qa/browser/` evidence chain for `built-not-durable` in `unattended` mode. Everything else the archive validator or the guard rejects today stays rejected.
- Invariant at every commit boundary: no consumer references a missing script. Phase 3 owns the seam-probe deletion and lands it in the same commit as the last consumer edit.

## Implementation Phases

### Phase 1: Package rule, bundle, and record

`package-coverage.mjs` and `archive-utils.ts` changed to the new package rule with the fixture rewrite (red-then-green both ways); `bundle.mjs`, `record.mjs`, the rewritten `check-terminal-outcome.mjs`, their tests.

### Phase 2: Authoring brief, verify, and the ladder

`references/recap-authoring.md`; `verify.mjs` with both claim passes, the bound host rung, the Playwright rung, and `qa/result.json`; the fresh-host end-to-end test with negative controls.

### Phase 3: Skill flow and consumers

`oat-explainer-kit` § Generate and the core prerequisite; `resolve-intent.mjs` pairs; the seam-probe removal across every carrier listed under Skill prose and consumers (incl. the reference docs and `completion.integration.test.mjs`); every vocabulary carrier, both CLI contract tests, and the recomputed prompt-site hash table; docs.

### Phase 4: The program recap

Generate the recap for the 2026-08-31 execution program through the flow (one summary per wave by the newest-export rule), record `runId` / `outcome` in the program ledger, and attach the result as the project's validation evidence.

## Dependencies

### Internal Dependencies

- The Explainer Kit core libraries under System Context (user-scope install, ≥ 2.1.0); the archive command (changed in lockstep); `finalize-tracked-run.mjs` (read-only).

### Development Dependencies

- Playwright/Chromium when present for the middle rung; tests run without it.

## Risks and Mitigation

| Risk                                                                | Mitigation                                                                                                                                                  |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host-browser rung is host-specific                                  | Phase 2 proves `none` and `playwright` first; the host rung is additive input and is bound to the artifact hash                                             |
| Claim extraction misses a token the agent renders, or over-extracts | Both passes fail closed with the token named; the brief tells the agent to spell facts as the fact base does; the extraction rules are pinned with fixtures |
| Consumers drift on the outcome vocabulary                           | One contract test over every carrier incl. the CLI prose pins                                                                                               |
| Program recap inputs span archived wrappers and duplicate exports   | The newest-export rule binds one summary per wave; unreachable inputs land in `unresolvedClaims`                                                            |
| The package-rule change strands an unarchived legacy run            | Deliberate; enumerated; no such run exists in this repository                                                                                               |

## References

- `spec.md`, `discovery.md`; the 2026-09-09 design reviews (`reviews/archived/artifact-design-review-2026-09-09T225646Z.md`, `reviews/archived/artifact-design-review-2026-09-09T232532Z.md`); recon inventory of the current machinery.
- `.agents/skills/explainer-kit/recipes/{project-recap.v2,program-recap}.json`; `scripts/lib/package-coverage.mjs`; `schemas/manifest.schema.json`
- `.agents/skills/oat-explainer-kit/references/{lifecycle-contract,config-contract}.md`; `scripts/{resolve-intent,persist-intent,check-core,check-terminal-outcome,finalize-tracked-run}.mjs`
