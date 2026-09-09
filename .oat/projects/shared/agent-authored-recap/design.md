---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-09
oat_generated: false
---

# Design: agent-authored-recap

## Overview

The OAT explainer adapter skill (`oat-explainer-kit`) gains one `generate` flow: three small scripts (bundle, verify, record) around a single authoring step performed by the host agent, with visual verification resolved at run time through a three-rung ladder. The flow keeps the Explainer Kit's fact-base schema, cohesion checker, HTML checks, browser probe, and manifest key contract as libraries; it drops the set planner, the five provider seams, expansion, publish/durability, and the legacy run-package shape from the default path. The archive command's package rule is replaced (no backward compatibility) so it requires exactly the new package. The lifecycle consumers call the flow; the program recap for the execution program is the last implementation phase.

## Architecture

### System Context

- Callers: `oat-project-complete` (Step 3.6 recap gate and its duplicate in `oat-project-implement/references/completion-and-closeout.md`), `oat-project-summary` (Explainer Outcome mapping), `oat-project-autonomous` (autonomous recap tail), `oat-wave-program` and `oat-wave-execute` (program-close caller).
- The flow: `.agents/skills/oat-explainer-kit/scripts/recap/{bundle,verify,record}.mjs`, the authoring brief `references/recap-authoring.md`, orchestrated by prose in `oat-explainer-kit/SKILL.md` § Generate.
- Reused libraries (unchanged): `explainer-kit/schemas/fact-base.schema.json`; `scripts/lib/qa.mjs` (`checkArtifactCohesion`, `checkHtmlStructure`, `checkSourceDumping`, `pngDimensions`, `REPRESENTATIVE_WIDTHS`); `scripts/lib/browser-runtime.mjs` (`resolveHeadlessRuntime`, `launchInstalledChromium` / `createBrowserProbeSession`, `probeRenderedPage`, `RUNTIME_UNAVAILABLE_REASONS`); `schemas/manifest.schema.json` (its `required` array is the key contract). Read-only dependency: `oat-explainer-kit/scripts/finalize-tracked-run.mjs`, the only producer of `built-durable`.
- Changed downstream (in lockstep): `explainer-kit/scripts/lib/package-coverage.mjs` (`requiredImmutablePackagePaths`, `permissibleRunPackagePaths`), `packages/cli/src/commands/project/archive/archive-utils.ts` (the coverage and inventory calls around `:1418-1436` and `:1480-1492`; the manifest-key validator `isProjectRecapManifestV1` and `readVerifiedRunMode` are untouched), and `archive-utils.test.ts`'s recap fixture (`:79-355`).
- Core prerequisite: `oat-explainer-kit/scripts/check-core.mjs#checkCoreCompatibility` resolves the core from `~/.agents/skills/explainer-kit` (minimum 2.1.0). A missing or too-old core is a hard prerequisite failure (see Error Handling).

### Data Flow

1. The caller checks the core (prerequisite), resolves the recipe (`project-recap` v2 or `program-recap` v1) and the output root (`<project>/explainers/<slug>/` or `.oat/repo/reference/explainers/<slug>/`).
2. `bundle.mjs` reads the allowlisted inputs and writes `source/fact-base.json` (canonical), `source/fact-base.md` (derived), and `source/ledger.json` (the cohesion ledger derived from the claims). Input hashes go into the manifest at record time; freshness is decided by comparing the existing run's `manifest.source.inputHashes` with the freshly computed hashes, and a fresh run with a usable outcome is reused without re-authoring.
3. The host agent reads the authoring brief and the fact base and writes `site/index.html`: one file, inline CSS, no external requests, the recipe's required sections as `<section id="…">` anchors.
4. `verify.mjs` runs the browser-free checks (both directions of claim tracing), then the ladder, and writes `qa/result.json` plus any screenshots under `qa/`.
5. `record.mjs` writes `run-request.json`, `theme.resolved.json`, and `manifest.json`, and returns the terminal outcome.
6. The caller routes on the outcome: satisfied, or an explicit retry-or-skip decision persisted in `state.md` (project) or the program ledger (program).

### Run package (the archive contract)

| Path                                                      | Written by                                              | Read by                                                                                                      |
| --------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `manifest.json`                                           | `record.mjs`                                            | archive validator (keys, hashes, recipe id), `oat-project-summary`, `oat-project-complete`, the wave ledgers |
| `run-request.json` (`{ mode, recipe, slug }`)             | `record.mjs`                                            | archive `readVerifiedRunMode`; the resume path                                                               |
| `theme.resolved.json`                                     | `record.mjs` (from `explainers.defaults`)               | manifest `theme.path`; the authoring brief's palette                                                         |
| `source/fact-base.json`, `source/fact-base.md`            | `bundle.mjs`                                            | the host agent (authoring), `verify.mjs`, a human auditing a claim                                           |
| `source/ledger.json`                                      | `bundle.mjs`                                            | `verify.mjs` (both claim-tracing directions)                                                                 |
| `site/index.html`                                         | the host agent                                          | the human reader; the archive export; `verify.mjs`                                                           |
| `qa/result.json`                                          | `verify.mjs`                                            | `record.mjs`, `oat-project-summary` (state and reason), `oat-project-complete` (retry/skip), a human         |
| `qa/320.png`, `qa/768.png`, `qa/1440.png` (when captured) | the agent (host rung) or `verify.mjs` (Playwright rung) | a human; `verify.mjs` binding checks                                                                         |

`immutableHashes` covers every path above except `manifest.json`. `permissibleRunPackagePaths` becomes exactly `immutableHashes` keys plus `manifest.json`; `requiredImmutablePackagePaths` for `project-recap` becomes `run-request.json`, `theme.resolved.json`, `source/fact-base.json`, `source/fact-base.md`, `source/ledger.json`, `qa/result.json`, and each artifact's `contentPath`/`renderedPath` (both `site/index.html`); the outcome-keyed set-plan and visual-review requirements, `source/content-approval.json`, `build-record.json`, and `terminal-evidence.json` are removed, and `archive-utils.ts`'s legacy-coverage and `qa/browser` checks go with them. Existing exports under `.oat/repo/reference/project-recaps/` are static and unaffected.

## Component Design

### `scripts/recap/bundle.mjs`

- Input: `{ recipe, projectPath | programArtifactPath, outputRoot }`.
- Allowlist (project): `summary.md`, `implementation.md`, `project-log.md`, `plan.md`, and `discovery.md` / `spec.md` / `design.md` when present; `orchestration-log.md` additionally for wave wrapper projects (both logs when both exist). Allowlist (program): the execution-program artifact plus, per wave, exactly one exported summary under `.oat/repo/reference/project-summaries/` (the newest export by date prefix wins; older exports are ignored) and exactly one archived wrapper's `implementation.md` § Final Summary when reachable. Any input whose realpath escapes the project root, the archive root, or `.oat/repo/reference/` is refused.
- Claims use the schema's real shape: `{ id, text, status: 'confirmed', citations: [{ sourceId, path, lineRange }] }`, one claim per extracted fact, with `sources[]` listing each input and its hash. Inputs that cannot be parsed land in `unresolvedClaims`, never dropped.
- `source/ledger.json` is derived from the claims: `{ numbers: { subject: value }, statuses: { subject: value }, dates: { subject: value } }`, where the subject is the nearest heading or label. It is the ledger `checkArtifactCohesion` consumes and the table the page→ledger pass matches against.

### Authoring step (host agent, no script)

- `references/recap-authoring.md` is the brief: the required sections by recipe (read from the recipe's `floor[].requiredNarrative`), the one-file / inline-CSS / no-external-request / no-source-dumping rules, the palette from `theme.resolved.json`, and the claim discipline (every number, status, and date must come from the fact base, spelled as the fact base spells it).
- The flow reads only `floor[].id`, `floor[].type`, and `floor[].requiredNarrative` from a recipe. It deliberately ignores `authoring`, `expansion`, `fallback`, and `discoveryLimits`, which belong to the advanced kit's run orchestrator; the program hub is authored as HTML like the project hub, and the manifest's `contentPath` and `renderedPath` both name `site/index.html`.

### `scripts/recap/verify.mjs`

- Browser-free checks (always): the HTML parses; every required `<section id>` is present and non-empty; `checkHtmlStructure`; `checkSourceDumping`; no external `src`/`href` (anchors excepted); `checkArtifactCohesion` with `source/ledger.json` (ledger→page: every ledger entry is observed on the page); and the page→ledger pass: `extractRenderedClaims(html)` harvests every number, date, and status token from the rendered text with its nearest heading or label as subject and asserts each one matches a ledger entry by subject and value — an unmatched token fails the run with `verify-claim-untraced` naming it. The two passes together are FR4.
- Ladder: `--rung host --screenshots <dir>` accepts screenshots the agent captured with its own browser tool at 320 / 768 / 1440 (the skill tells the agent to open `file://…/site/index.html` and capture the three widths) and binds them: the agent records the SHA-256 of `site/index.html` at capture time in the request; `verify.mjs` recomputes it after the checks, validates each PNG's magic bytes and dimensions (`pngDimensions`) against the declared width, and downgrades the rung to `none` with a named reason if any check fails. Otherwise `resolveHeadlessRuntime` → `launchInstalledChromium` (or `createBrowserProbeSession`) → `probeRenderedPage(browser, url, { width, screenshotPath })` at `REPRESENTATIVE_WIDTHS`; otherwise `rung: none` with the `RUNTIME_UNAVAILABLE_REASONS` value.
- Output: `qa/result.json` `{ checks: { … }, rung: host|playwright|none, artifactSha256, screenshots: [{ width, path }], reason }`.

### `scripts/recap/record.mjs`

- Writes `run-request.json`, `theme.resolved.json`, and `manifest.json` exactly per `manifest.schema.json`'s `required` array (runId, slug, recipe, createdAt, `source.factBasePath/factBaseHash/inputHashes/backlinks`, `theme`, one hub artifact with `contentPath` = `renderedPath` = `site/index.html`, `immutableHashes` over the package table, `outcome`, `buildRecord`, `warnings`).
- Outcome semantics (the enum is unchanged): checks pass and rung `host` or `playwright` → `built-not-durable`; checks pass and rung `none` → `built-needs-review` with the reason; any check fails → `failed` with a sanitized cause (no absolute paths, no environment values); an interrupted run → `incomplete`. `built-durable` is produced only by the tracked-run finalizer and stays satisfied.
- `check-terminal-outcome.mjs` is rewritten in place: `generate` is satisfied by `built-durable`, `built-not-durable`, or `built-needs-review`; `failed` and `incomplete` are never satisfied. `SKIP_REASONS` becomes `{ interactive, failed_attempt, capability_probe }`, the last read-only legacy.

### State record and retry/skip

- The intent record keeps its three keys and `validateIntentRecord`'s arity; `resolve-intent.mjs` adds `failed_attempt` to `SOURCES` and `skip:failed_attempt` to `ALLOWED_PAIRS.projectRecap`; `capability_probe` stays in both so recorded skips remain valid on read but is never written again. `persist-intent.mjs` is unchanged.
- The last attempt is not stored in the intent record: the completion skill reads the newest run's `manifest.json` (`outcome`) and `qa/result.json` (`reason`) under the project's `explainers/` root, so `skip:failed_attempt` is valid only when that outcome is `failed` or `incomplete`.

### Skill prose and consumers

- `oat-explainer-kit/SKILL.md` § Generate: the flow above, the core prerequisite, the ladder instruction for the agent, and the retry/skip rule. Removed in Phase 3, in one commit with the last consumer edit: the seam-probe section, `probe-recap-seams.mjs`, its test, the `seamProbe` argument in `resolve-intent.mjs`, and `lifecycle-contract.md` § State records' `skip/capability_probe` row (replaced by `skip/failed_attempt`).
- Vocabulary carriers, all edited together with one shared contract test: `oat-project-complete/SKILL.md` Step 3.6 and export path; `oat-project-implement/references/completion-and-closeout.md` (the duplicate gate, ~`:896-947`); `oat-project-autonomous/SKILL.md` (~`:274-278`); `.agents/docs/autonomy-contract.md` row IMPLEMENT-19; `oat-project-summary/SKILL.md` Explainer Outcome mapping; `oat-wave-program/SKILL.md` and `oat-wave-execute/SKILL.md` program-close callers (one paragraph each invoking the flow with `program-recap` and recording `runId` / `outcome`); the guard tests `oat-project-complete/tests/check-terminal-outcome.test.mjs` and `oat-project-implement/tests/check-terminal-outcome.test.mjs`; and `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts` (~`:468-635`, `:1449-1479`), whose prose pins on the recap gate are rewritten with the prose.
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

| Requirement | Test                                                                                                                                                                                                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR1         | `bundle.test.mjs`: allowlists incl. `project-log.md` and the newest-export rule, containment refusal (symlink escape), schema-valid claims, ledger derivation, identical inputs → identical hashes                                                                                                                                          |
| FR2, FR4    | `verify.test.mjs`: required sections; ledger→page (`cohesion-claim-unobserved`); page→ledger (`verify-claim-untraced` on a number absent from the fact base); source dumping and external requests rejected                                                                                                                                 |
| FR3, NFR3   | `verify.test.mjs`: host rung accepted with a bound hash and valid PNGs, downgraded on hash mismatch or a bad PNG; Playwright rung when the runtime resolves; forced runtime-unavailable → `rung: none`, `built-needs-review`                                                                                                                |
| FR5, NFR2   | `record.test.mjs` (skill tier) writes a package; `archive-utils.test.ts` (CLI tier, the exported `verifySelectedProjectRecapForArchive` over a checked-in copy of that package) accepts it and rejects the legacy fixture shape — both red-then-green; `checkTerminalOutcome` red-then-green on `failed`, `incomplete`, and `built-durable` |
| FR6         | `completion.integration.test.mjs`: failed attempt → retry produces a run; `skip:failed_attempt` accepted only after a failed/incomplete run and honored on resume; `capability_probe` still readable; no silent skip                                                                                                                        |
| FR7, FR8    | the shared contract test over all carriers (skills, reference docs, the autonomy contract row, both guard tests) and `review-skill-contracts.test.ts`                                                                                                                                                                                       |
| FR9         | the program recap run: `qa/result.json` checks pass; the manifest verifies; the ledger row carries `runId` / `outcome`                                                                                                                                                                                                                      |
| NFR1        | fresh-host end-to-end in a scratch repo with the core installed at user scope and `EXPLAINER_KIT_HEADLESS_PROBE` disabled: generation succeeds as `built-needs-review`; negative controls (delete a section; point the runtime at a missing binary; remove the core) stay visible while the accepted control still generates                |
| NFR4        | `pnpm run check:skill-bumps`, `pnpm release:check-versions`, `pnpm release:validate`, and `tools/smoke/explainer-kit/check-core-version-parity.test.mjs`                                                                                                                                                                                    |
| NFR5        | the design review's necessity item over this document, and the package table above naming a reader for every path                                                                                                                                                                                                                           |

### Negative controls

Each guard is neutralized once (section check, both claim passes, containment, the host-rung binding, the terminal-outcome rule, the new package rule) and the corresponding test must go red, then restored.

## Deployment Strategy

- Skill bumps: `oat-explainer-kit`, `explainer-kit` (package-coverage change; core minimum advances with it), `oat-project-complete`, `oat-project-summary`, `oat-project-autonomous`, `oat-project-implement`, `oat-wave-program`, `oat-wave-execute`; pins located by old literal; lockstep public-package bump; docs (`workflows/projects/lifecycle.md` recap gate, `workflows/projects/artifacts.md`, `workflows/skills/explainer-kit.md` "default path" note, `contributing/explainer-kit-verification.md` if the package shape is described there).
- Rollback: reverting the adapter skill and the package-coverage change together restores the prior path; the advanced kit's recipes are untouched.

## Migration Plan

- Existing `skip/capability_probe` state records stay valid on read.
- Existing recap exports are static and unaffected; a legacy-shaped run that has not been archived cannot be archived after this change (deliberate; enumerated under NFR2).
- Invariant at every commit boundary: no consumer references a missing script. Phase 3 owns the seam-probe deletion and lands it in the same commit as the last consumer edit.

## Implementation Phases

### Phase 1: Package rule, bundle, and record

`package-coverage.mjs` and `archive-utils.ts` changed to the new package rule with the fixture rewrite (red-then-green both ways); `bundle.mjs`, `record.mjs`, the rewritten `check-terminal-outcome.mjs`, their tests.

### Phase 2: Authoring brief, verify, and the ladder

`references/recap-authoring.md`; `verify.mjs` with both claim passes, the bound host rung, the Playwright rung, and `qa/result.json`; the fresh-host end-to-end test with negative controls.

### Phase 3: Skill flow and consumers

`oat-explainer-kit` § Generate and the core prerequisite; `resolve-intent.mjs` pairs; the seam-probe removal; every vocabulary carrier and both CLI contract tests; docs.

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

- `spec.md`, `discovery.md`; the 2026-09-09 design review (`reviews/archived/artifact-design-review-2026-09-09T225646Z.md`); recon inventory of the current machinery.
- `.agents/skills/explainer-kit/recipes/{project-recap.v2,program-recap}.json`; `scripts/lib/package-coverage.mjs`; `schemas/manifest.schema.json`
- `.agents/skills/oat-explainer-kit/references/{lifecycle-contract,config-contract}.md`; `scripts/{resolve-intent,persist-intent,check-core,check-terminal-outcome,finalize-tracked-run}.mjs`
