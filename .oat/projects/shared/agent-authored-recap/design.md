---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-09
oat_generated: false
---

# Design: agent-authored-recap

## Overview

The OAT explainer adapter skill (`oat-explainer-kit`) gains one `generate` flow: three small scripts (bundle, verify, record) around a single authoring step performed by the host agent, with visual verification resolved at run time through a three-rung ladder. The flow keeps the Explainer Kit's fact-base schema, cohesion checker, browser probe, and manifest contract as libraries and drops the set planner, the five provider seams, expansion, and publish/durability from the default path. The four lifecycle consumers call the flow; the program recap for the execution program is the last implementation phase.

## Architecture

### System Context

- Callers: `oat-project-complete` (Step 3.6 recap gate), `oat-project-summary` (outcome mapping), `oat-wave-program` and `oat-wave-execute` (program-close caller).
- The flow: `.agents/skills/oat-explainer-kit/scripts/recap/{bundle,verify,record}.mjs` plus the authoring brief `references/recap-authoring.md`, orchestrated by prose in `oat-explainer-kit/SKILL.md` § Generate.
- Reused libraries (unchanged): `explainer-kit/schemas/fact-base.schema.json`, `scripts/lib/qa.mjs` (`checkArtifactCohesion`, `checkHtmlStructure`, `REPRESENTATIVE_WIDTHS`), `scripts/lib/browser-runtime.mjs` (`resolveHeadlessRuntime`, `probeRenderedPage`), `schemas/manifest.schema.json`.
- Downstream (unchanged): `packages/cli/src/commands/project/archive/archive-utils.ts` manifest validation and export.

### Data Flow

1. Caller resolves the recipe (`project-recap` v2 or `program-recap` v1) and the output root (`<project>/explainers/<slug>/` or `.oat/repo/reference/explainers/<slug>/`).
2. `bundle.mjs` reads the allowlisted inputs, writes `source/fact-base.json` (canonical) and `source/fact-base.md` (derived), and `source/inputs.json` (path → SHA-256). If an existing run's `inputs.json` matches and its manifest outcome is usable, the flow returns that run (freshness).
3. The host agent reads the authoring brief and the fact base and writes `site/index.html` — one file, inline CSS, no external requests, the recipe's required sections as `<section id="…">` anchors.
4. `verify.mjs` runs the browser-free checks, then the ladder: `--rung host` records screenshots the agent captured; otherwise it tries the Playwright probe; otherwise it records `none`. Output: `qa/result.json`.
5. `record.mjs` writes `manifest.json` (`explainer-kit.manifest/v1`) and `recap-result.json`, and returns the terminal outcome.
6. The caller routes on the outcome: satisfied, or an explicit retry-or-skip decision persisted in `state.md` (project) or the program ledger (program).

## Component Design

### `scripts/recap/bundle.mjs`

- Input: `{ recipe, projectPath | programArtifactPath, waveRecords[] }`.
- Allowlist (project): `summary.md`, `implementation.md`, `orchestration-log.md`, `plan.md`, and `discovery.md`/`spec.md`/`design.md` when present. Allowlist (program): the execution-program artifact plus, per wave, the exported summary under `.oat/repo/reference/project-summaries/` and the archived wrapper's `implementation.md` § Final Summary when reachable. Any path outside the project root, the archive root, or `.oat/repo/reference/` is refused (realpath containment).
- Claims are extracted per section as `{ subject, value, sourcePath, sourceLine }` in the schema's existing claim shape; numbers and statuses become subject-bound claims the cohesion checker can verify. `unresolvedClaims` lists inputs that could not be parsed rather than dropping them.
- Output: `source/fact-base.json`, `source/fact-base.md`, `source/inputs.json`. Consumer: the host agent (authoring), `verify.mjs` (claim tracing), the freshness check.

### Authoring step (host agent, no script)

- `references/recap-authoring.md` is the brief: the required sections by recipe, the "one file, inline CSS, no external requests, no source dumping" rules, and the claim discipline (every number, status, and date must appear in the fact base). The agent writes `site/index.html` directly.
- No author module path, no critic pass, no set planning. The agent is the author; the checks are the critic.

### `scripts/recap/verify.mjs`

- Browser-free checks (always): the HTML parses; every required `<section id>` is present and non-empty; `checkHtmlStructure`; `checkSourceDumping`; `checkArtifactCohesion` with a ledger built from the fact base, so each rendered number/status traces to a claim by subject and value.
- Ladder: `--rung host --screenshots <dir>` accepts screenshots the agent captured with its own browser tool at 320/768/1440 (the skill tells the agent to use a browser tool when it has one, open `file://…/site/index.html`, and capture the three widths); else `resolveHeadlessRuntime` → `probeRenderedPage` at `REPRESENTATIVE_WIDTHS`; else `rung: none` with `RUNTIME_UNAVAILABLE_REASONS` as the reason.
- Output: `qa/result.json` `{ checks: {…}, rung: host|playwright|none, screenshots: [{ width, path }], reason }`. Consumer: `record.mjs`, and the human reading the summary's outcome line.

### `scripts/recap/record.mjs`

- Writes `manifest.json` exactly as `explainer-kit.manifest/v1` (runId, slug, recipe, `source.factBasePath/factBaseHash/inputHashes/backlinks`, `theme` from `explainers.defaults`, `artifacts[]` = the one hub, `immutableHashes` over `site/`, `source/`, `qa/`, `outcome`, `buildRecord`, `warnings`). The archive validator's exact-keys check is the contract test.
- Outcome semantics (the enum is unchanged): checks pass + rung `host` or `playwright` → `built-not-durable` ("usable, verified, not published"); checks pass + rung `none` → `built-needs-review` with the reason; any check fails → `failed` with a sanitized cause (no absolute paths, no stack traces); an interrupted run → `incomplete`. `built-durable` is never produced by the default path.
- Writes `recap-result.json` `{ runId, recipe, outcome, reason, artifactPath, rung, screenshots[] }`. Consumers: `oat-project-summary` (prints state and the note), `oat-project-complete` (retry/skip routing), the human reading either.
- `check-terminal-outcome.mjs` is rewritten in place: `generate` is satisfied by `built-not-durable` or `built-needs-review`; `failed` and `incomplete` are never satisfied. `SKIP_REASONS` becomes `{ interactive, failed_attempt }`.

### Skill prose and consumers

- `oat-explainer-kit/SKILL.md` § Generate: the six-step flow above, the ladder instruction for the agent, and the retry/skip rule. The seam-probe section, `probe-recap-seams.mjs`, its test, and the `seamProbe` argument in `resolve-intent.mjs` are removed; `lifecycle-contract.md` § State records replaces `skip/capability_probe` with `skip/failed_attempt`, which is valid only when `last_attempt.outcome` is `failed` or `incomplete`.
- `oat-project-complete` Step 3.6: reuse a fresh run; otherwise run the flow; on `failed`/`incomplete`, present the cause and require retry or skip (autonomous: one retry, then `skip/failed_attempt` recorded with the reason, never silent); the export path is unchanged because the manifest is.
- `oat-project-summary` outcome mapping: `generated` (verified), `generated — needs review` (unverified, with reason), `skipped` (with reason), `failed` (with cause) from `recap-result.json`.
- `oat-wave-program` "Program-close explainer caller" and `oat-wave-execute` Step 6's duplicate: replaced by one paragraph each that invokes the flow with `program-recap` and records `runId`/`outcome` in the ledger; the fact-base synthesis is `bundle.mjs` with the program allowlist.

## Data Models

### `recap-result.json`

```json
{
  "schemaVersion": "oat.recap-result/v1",
  "runId": "run-…",
  "recipe": { "id": "project-recap", "version": "2" },
  "outcome": "built-not-durable | built-needs-review | failed | incomplete",
  "reason": "sanitized, actionable, or null",
  "artifactPath": "site/index.html",
  "rung": "host | playwright | none",
  "screenshots": [{ "width": 320, "path": "qa/320.png" }]
}
```

### `state.md` recap record (project)

```yaml
oat_project_recap:
  decision: generate | skip
  source: interactive | autonomous_policy | failed_attempt
  decided_at: '…'
  last_attempt: { runId, outcome, reason } # present after any attempt
```

Allowed pairs: `generate/interactive`, `skip/interactive`, `generate/autonomous_policy`, `skip/failed_attempt` (only with `last_attempt.outcome` in `failed`/`incomplete`). `skip/capability_probe` is read as legacy and honored, never written.

## Security Considerations

- Path containment: `bundle.mjs` refuses any input whose realpath escapes the project root, the archive root, or `.oat/repo/reference/`; symlinked inputs are read only when their target is inside those roots.
- The authored page makes no external requests (checked by `verify.mjs`: no `http(s)://` in `src`/`href` except anchors); screenshots are captured from a `file://` URL.
- Sanitized causes never carry absolute paths or environment values.

## Error Handling

- Bundle refuses (allowlist miss, containment, unparseable required input) → the flow stops before authoring with the cause; no run directory is left half-written (write to a temp dir, rename on success).
- Authoring absent or malformed → `verify.mjs` fails the parse/section check → `failed`, artifact retained.
- Browser absent or the probe throws → `rung: none`, `built-needs-review`, reason from the runtime.
- Interrupted between steps → `incomplete`; the next run reuses the bundle if inputs match.

## Testing Strategy

### Requirement-to-Test Mapping

| Requirement | Test                                                                                                                                                                                                                                           |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR1         | `bundle.test.mjs`: allowlist, containment refusal (symlink escape), claim extraction, identical inputs → same hashes                                                                                                                           |
| FR2, FR4    | `verify.test.mjs`: required sections, a page with a number not in the fact base fails cohesion, source dumping rejected                                                                                                                        |
| FR3, NFR3   | `verify.test.mjs`: `--rung host` with fixture screenshots; forced runtime-unavailable → `rung: none`, `built-needs-review`                                                                                                                     |
| FR5, NFR2   | `record.test.mjs`: manifest parses through the archive validator's `isProjectRecapManifestV1` (called through the CLI's existing test helper on a fixture run); outcome table; `checkTerminalOutcome` red-then-green on `failed`               |
| FR6         | `completion.integration.test.mjs`: failed attempt → retry produces a run; skip/failed_attempt recorded and honored on resume; no silent skip                                                                                                   |
| FR7, FR8    | contract tests: the wave skills' caller text references the flow once; lifecycle skills carry no seam or probe reference                                                                                                                       |
| FR9         | the program recap run itself: `qa/result.json` checks pass; manifest parses; the ledger row carries `runId`/`outcome`                                                                                                                          |
| NFR1        | fresh-host end-to-end in a scratch repo with `EXPLAINER_KIT_HEADLESS_PROBE` disabled: generation succeeds; negative controls (delete a section; point the runtime at a missing binary) stay visible while the accepted control still generates |

### Negative controls

Each guard is neutralized once (section check, cohesion check, containment, terminal-outcome rule) and the corresponding test must go red, then restored.

## Deployment Strategy

- Skill bumps: `oat-explainer-kit`, `oat-project-complete`, `oat-project-summary`, `oat-wave-program`, `oat-wave-execute`; pins located by old literal; lockstep public-package bump; docs pages (`workflows/projects/lifecycle.md` recap gate, `workflows/projects/artifacts.md`, `workflows/skills/explainer-kit.md` "default path" note).
- Rollback: the advanced kit and its recipes are untouched, so reverting the adapter skill restores the prior path.

## Migration Plan

- Existing `skip/capability_probe` state records stay valid on read.
- Existing recap manifests are unaffected (same contract).
- `probe-recap-seams.mjs`, its test, and the seam-probe prose are deleted in the same commit that lands the flow, so no consumer references a missing script.

## Implementation Phases

### Phase 1: Bundle and record scripts

`bundle.mjs`, `record.mjs`, the rewritten `check-terminal-outcome.mjs`, their tests, and the manifest contract test against the archive validator.

### Phase 2: Authoring brief, verify, and the ladder

`references/recap-authoring.md`, `verify.mjs` with the three rungs and `qa/result.json`, the fresh-host end-to-end test with negative controls.

### Phase 3: Skill flow and consumers

`oat-explainer-kit` § Generate, the seam-probe removal, the state-record pairs, and the four consumer skills plus docs; contract tests.

### Phase 4: The program recap

Generate the recap for the 2026-08-31 execution program through the flow, record `runId`/`outcome` in the program ledger, and attach the result as the project's validation evidence.

## Dependencies

### Internal Dependencies

- Explainer Kit core libraries listed under System Context; `archive-utils.ts` validator (read-only dependency).

### Development Dependencies

- Playwright/Chromium when present for the middle rung; tests run without it.

## Risks and Mitigation

| Risk                                               | Mitigation                                                                                                                               |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Host-browser rung is host-specific                 | Phase 2 proves `none` and `playwright` first; `host` is additive input, not required                                                     |
| Claim extraction misses a number the agent renders | Cohesion fails closed (`failed` with the offending value named); the brief tells the agent to take numbers only from the fact base       |
| Consumers drift on the outcome vocabulary          | One contract test over all five skills' text                                                                                             |
| Program recap inputs span archived wrappers        | `bundle.mjs` reads the exported summaries first and the archive tree second; unreachable inputs land in `unresolvedClaims`, not silently |

## References

- `spec.md`, `discovery.md`; recon inventory of the current machinery (session 2026-09-09).
- `.agents/skills/explainer-kit/recipes/{project-recap.v2,program-recap}.json`
- `.agents/skills/oat-explainer-kit/references/{lifecycle-contract,config-contract}.md`
