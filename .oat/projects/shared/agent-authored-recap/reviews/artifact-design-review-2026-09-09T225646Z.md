---
oat_generated: true
oat_generated_at: 2026-09-09T22:56:46Z
oat_review_scope: design
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/agent-authored-recap
---

# Artifact Review: design

**Reviewed:** 2026-09-09T22:56:46Z
**Scope:** `design.md` with its inline-authored `spec.md` (spec-driven mode), against `discovery.md` and `BL-260907-replace-the-default-project`
**Files reviewed:** 3 artifacts; 21 live-tree premise sources
**Commits:** worktree `agent-authored-recap` @ `cf0552cfe` (design drafted in `463a8cfe1`)
**Reconnaissance:** not-attempted

## Summary

The design is coherent, matches every operator decision recorded in discovery, and its Explainer Kit citations for the QA and browser libraries reproduce exactly. Its central compatibility premise does not: `FR5`'s "a manifest the current archive validator accepts unchanged" is verified against the whole run package, not the manifest alone, and the run layout the design specifies is rejected at four independent gates. Three further reused contracts — the fact-base claim shape, the cohesion checker's direction, and the closed `oat_project_recap` state record — cannot carry what the design asks of them, and the migration inventory is short by two lifecycle skills, one shared contract doc, and a CLI test that pins the recap-gate prose verbatim.

Findings: 1 critical, 6 important, 7 medium, 3 minor

## Findings

### Critical

- **The archive validator verifies the entire run package, so the designed run layout is rejected** (`.oat/projects/shared/agent-authored-recap/design.md:55`, `design.md:63`)
  - Issue: The design asserts "the export path is unchanged because the manifest is" and describes the package as `site/`, `source/`, `qa/`, `manifest.json`, `recap-result.json`, with `immutableHashes` over `site/`, `source/`, `qa/`. `loadVerifiedProjectRecap` does far more than key-check the manifest, and the design's layout fails at four separate gates:
    1. `packages/cli/src/commands/project/archive/archive-utils.ts:1420` calls `readVerifiedRunMode`, which reads `run-request.json` from the run root and requires it to declare `mode: interactive | unattended` (`archive-utils.ts:1342-1364`). The design never writes `run-request.json`.
    2. `package-coverage.mjs:126-140` unconditionally requires `run-request.json`, `source/content-approval.json`, `source/fact-base.md`, `manifest.theme.path`, and every artifact's `contentPath` **and** `renderedPath` to appear in `immutableHashes`; `archive-utils.ts:1425-1431` turns a missing `run-request.json` or `source/content-approval.json` into a hard `CliError`. `manifest.theme.path` must be exactly `theme.resolved.json` (`archive-utils.ts:1029`), a root-level file the design does not produce, and the design's single hub has no `contentPath` source file at all.
    3. `package-coverage.mjs:19,145-166`: `built-not-durable` is a member of `SUCCESSFUL_OUTCOMES`, so choosing it for the happy path (design.md:56) makes the five `SET_PLAN_RECORD_PATHS` required, and — for `runMode: unattended` — the full `qa/browser/<id>/{mobile,tablet,desktop}.{png,json}` plus `qa/visual-review/attempt-1/{request,result}.json` evidence chain required as well. That is exactly the set-planner and visual-review machinery this project removes. `built-needs-review` is the only outcome that short-circuits this (`package-coverage.mjs:151`), and it in turn requires a valid confined `terminal-evidence.json` (`archive-utils.ts:1371-1388`), which the design also never writes.
    4. `package-coverage.mjs:41-107` (`enforceRunPackageInventory`, invoked at `archive-utils.ts:1486`) requires the on-disk tree to match `permissibleRunPackagePaths` **exactly**: every allowed file present (`build-record.json` is unconditionally allowed-and-therefore-required, line 33) and no extra file. `recap-result.json` in the run root is an unexpected entry and fails the inventory.
       The working fixture at `packages/cli/src/commands/project/archive/archive-utils.test.ts:79-355` is the ground truth: a passing `project-recap` package carries `run-request.json`, `source/content-approval.json`, `theme.resolved.json`, `source/content/recap.md`, `build-record.json`, the five set-plan files, and the complete browser/visual-review chain.
  - Fix: Replace the one-line compatibility claim with an explicit run-package layout table listing every file the archive path requires, and add a design decision for each of the five records the flow must now originate (`run-request.json` with its mode, `source/content-approval.json`, `theme.resolved.json`, `build-record.json`, `terminal-evidence.json`). Decide deliberately which outcome the verified happy path emits: if `built-not-durable` is kept, the design must either produce the set-plan and visual-review records or accept that `archive-utils.ts` changes — which the spec's Constraints forbid (`spec.md:65`). State the chosen resolution and enumerate it under NFR2. This must be settled before planning, because it changes `record.mjs`, `verify.mjs`, and the outcome table.
  - Requirement: FR5, NFR2, Primary Goal 1 (`spec.md:24`)

### Important

- **The fact-base claim shape the design specifies does not exist in `explainer-kit.fact-base/v1`** (`design.md:39`)
  - Issue: The design says claims are extracted as `{ subject, value, sourcePath, sourceLine }` "in the schema's existing claim shape". `.agents/skills/explainer-kit/schemas/fact-base.schema.json` defines `claim` with `additionalProperties: false` and `required: [id, text, status, citations]`, where `status` is the enum `confirmed | overridden` and source location lives inside a `citation` (`sourceId`, `locator`, optional `path`/`lineRange`). None of `subject`, `value`, `sourcePath`, `sourceLine` is permitted. Separately, the `{ terminology, numbers[{subject,value}], statuses[{subject,value}] }` ledger the cohesion checker consumes is the **set-plan** shape (`schemas/set-plan.v1.schema.json:49`, `scripts/lib/visual-review.mjs:223-250`), not a fact-base shape — so "a ledger built from the fact base" (design.md:49) needs a derivation the design does not specify. Any attempt to satisfy this literally changes the fact-base schema, which `spec.md:38` and `discovery.md:118` list as out of scope.
  - Fix: Express bundled claims in the real schema fields (`text` carrying the subject/value assertion, `citations[].path` + `lineRange` for provenance) and describe the derived cohesion ledger as a separate in-run record with its own shape, naming where it is written and whether it enters `immutableHashes`. Note that `checkArtifactCohesion` raises `cohesion-ledger-empty` unless all three groups are non-empty (`scripts/lib/qa.mjs:448-455`), so the derivation must always yield terminology, numbers, and statuses.
- **`checkArtifactCohesion` cannot fail on a page claim that is absent from the fact base** (`design.md:49`, `design.md:116`)
  - Issue: FR4 requires that "every claim in the page traces to the fact bundle by subject and value", and the test row promises "a page with a number not in the fact base fails cohesion". The reused checker runs in the opposite direction: `scripts/lib/qa.mjs:485-500` iterates the **ledger's** claims and reports `cohesion-claim-unobserved` for ledger entries the page does not show; observed claims with no ledger entry are ignored unless two artifacts disagree, and there is only one artifact here. A probe confirms it: a ledger of one term, one number, and one status, against an artifact whose `numericClaims` also carries an invented `99`, returns `{"valid":true,"issues":[]}`.
  - Fix: Name the missing component — an extraction pass over the authored HTML that harvests rendered numbers, dates, and statuses and asserts each one matches a fact-base claim by subject and value — and assign it to a phase. `cohesionEvidenceFromLedger` (`visual-review.mjs:223`) is the ledger-driven observation builder and is not a substitute. Until then FR4's second clause and the FR2/FR4 test row are unsupported.
  - Requirement: FR4
- **The `oat_project_recap` state record is closed at three keys, so `last_attempt` and `skip/failed_attempt` cannot be persisted** (`design.md:86-94`, `design.md:58`)
  - Issue: `validateIntentRecord` rejects any record whose key count is not exactly 3 (`.agents/skills/oat-explainer-kit/scripts/resolve-intent.mjs:132-140`) and any source outside `SOURCES` (line 7-12) or pair outside `ALLOWED_PAIRS.projectRecap` (line 20-24). `updateStateFrontmatter` writes exactly `decision`, `source`, `decided_at` and replaces the whole indented block (`scripts/persist-intent.mjs:44-64`), so even a hand-written `last_attempt` is erased by the next persist. Probing both records confirms: `skip/failed_attempt` returns `projectRecap intent has an invalid source`, and adding `last_attempt` returns `projectRecap intent must contain only decision, source, and decided_at`. The design lists neither `resolve-intent.mjs`'s source/pair tables nor `persist-intent.mjs` as changed components. The same paragraph also states `SKIP_REASONS` "becomes `{ interactive, failed_attempt }`", which contradicts design.md:94 and design.md:135 ("`skip/capability_probe` is read as legacy and honored") — the guard's `SKIP_REASONS` set at `scripts/check-terminal-outcome.mjs:15` _is_ the acceptance set, so dropping `capability_probe` makes every legacy record fail the gate on resume.
  - Fix: Add `resolve-intent.mjs` (`SOURCES`, `ALLOWED_PAIRS`, `validateIntentRecord`'s arity) and `persist-intent.mjs` (`updateStateFrontmatter`'s writer and the block-replacement rule) to Component Design, state that `capability_probe` stays in both `SOURCES` and `SKIP_REASONS` as read-only legacy, and decide explicitly whether `last_attempt` belongs in the intent record at all or in the run's own `qa`/result records that the gate already reads.
  - Requirement: FR6
- **The migration inventory omits two lifecycle skills, a shared contract doc, and a CLI test that pins the recap-gate prose** (`design.md:60-65`, `design.md:130`, `spec.md:111`)
  - Issue: FR8's success metric is "Zero references to the seam probe or the five seams remain in lifecycle skills" (`spec.md:82`), but the design's consumer list and skill-bump list cover only `oat-explainer-kit`, `oat-project-complete`, `oat-project-summary`, `oat-wave-program`, `oat-wave-execute`. The vocabulary also lives in `.agents/skills/oat-project-implement/references/completion-and-closeout.md:896-914` (a full duplicate of the recap gate), `.agents/skills/oat-project-autonomous/SKILL.md:274-278`, `.agents/docs/autonomy-contract.md:187` (row IMPLEMENT-19), and in two more guard tests at `oat-project-complete/tests/check-terminal-outcome.test.mjs:38-51` and `oat-project-implement/tests/check-terminal-outcome.test.mjs:41-51`. Most consequentially, `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts:468-635,1449-1479` pins the exact recap-gate sentences of both `oat-project-autonomous` and `oat-project-complete` as regexes, so rewriting Step 3.6 requires editing CLI test code. That falsifies the spec's Assumption that "The archive validator is the only CLI-side coupling (verified: no CLI code changes needed when the manifest is kept)".
  - Fix: Extend Component Design and Deployment Strategy with the full carrier list above, correct the spec Assumption at `spec.md:111`, and add `review-skill-contracts.test.ts` to the FR7/FR8 contract-test row so the prose pins are updated in the same change rather than discovered at gate time.
  - Requirement: FR8, NFR4
- **No defined behavior when the Explainer Kit core is not installed** (`design.md:21`, `design.md:161`, `design.md:102-107`)
  - Issue: The whole flow's browser-free checks depend on `explainer-kit/scripts/lib/*`, and the adapter resolves that core from the **user scope** — `checkCoreCompatibility` reads `~/.agents/skills/explainer-kit/SKILL.md` and returns `missing` or `invalid-layout` when it is absent (`.agents/skills/oat-explainer-kit/scripts/check-core.mjs:9-56`; the adapter's minimum is `2.1.0`, installed is `2.1.1`). A host without the utility pack installed user-scope therefore cannot run the "dependable default path" at all — the same class of blocked-on-absent-capability failure the item exists to remove. The Error Handling section enumerates bundle refusal, authoring failure, browser absence, and interruption, but not core absence, and no outcome or rung covers it.
  - Fix: Add a row to Error Handling deciding what a missing or too-old core produces (a `failed` outcome with the `oat tools install utility --scope user` guidance, a skip, or a hard prerequisite check at the gate), and say whether NFR1's "fresh host" test asserts core presence or core absence. If the intent is that the default path never depends on the advanced kit, say which of the four reused libraries must be vendored into the adapter instead.
  - Requirement: NFR1, NFR3, Primary Goal 1
- **Dropping `built-durable` from the satisfied set regresses the durability path** (`design.md:56`, `design.md:58`)
  - Issue: The design says `generate` is satisfied by `built-not-durable` or `built-needs-review`, and that `built-durable` "is never produced by the default path". It is produced by the tracked-run finalizer: `.agents/skills/oat-explainer-kit/scripts/finalize-tracked-run.mjs:73,220,407` promotes an attested run's manifest to `built-durable`, and `oat-project-complete/SKILL.md:610` plus the later durability stage depend on that promotion. `oat-project-summary/SKILL.md:297` currently maps `generated` _only_ from `built-durable`. Once the guard no longer accepts `built-durable`, a resumed or re-run completion over an attested recap raises `E_RECAP_OUTCOME` and blocks. NFR2 only forbids new _acceptances_, so this stricter change passes the letter of the rule while breaking a working path.
  - Fix: Keep `built-durable` in the satisfied set (satisfaction is "a usable artifact exists", which a durable run is a fortiori), and restate the rule as "`failed` and `incomplete` are never satisfied". Enumerate the change under NFR2 either way, and name `finalize-tracked-run.mjs` as a read-only dependency in the design.
  - Requirement: NFR2, FR5

### Medium

- **`recap-result.json` and `source/inputs.json` duplicate records that already exist** (`design.md:27`, `design.md:57`, `design.md:69-82`)
  - Issue: NFR5 requires every persisted artifact to name a consumer and forbids records written for a deferred reader. `recap-result.json` carries `runId`, `recipe`, and `outcome` (already in `manifest.json`) plus `rung`, `screenshots`, and `reason` (already in `qa/result.json`), so it is the union of two records the same consumers can read. `source/inputs.json` (path → SHA-256) duplicates `manifest.source.inputHashes`, which the completion gate already uses for exactly this freshness comparison (`oat-project-complete/SKILL.md:537`: "its recorded source hashes match the current approved implementation inputs"). Two freshness sources can disagree. `recap-result.json` in the run root additionally fails `enforceRunPackageInventory` (see Critical), so its placement needs a decision regardless.
  - Fix: Either drop both records and point `oat-project-summary` and `oat-project-complete` at `manifest.json` + `qa/result.json`, or justify each one against NFR5 by naming what it lets a consumer do that the existing records do not, and state where it lives relative to the run root.
- **The host rung upgrades the outcome to "verified" on evidence that is not bound to the artifact** (`design.md:50`, `design.md:56`)
  - Issue: `--rung host` accepts screenshots the agent says it captured, and that alone moves the outcome from `built-needs-review` to `built-not-durable` ("usable, verified"). Nothing binds those PNGs to the authored page. The kit already has the binding primitive for this: `browserCaptureIdentity(runtime, capture)` (`scripts/lib/browser-runtime.mjs:558`) and the `explainer-kit.browser-evidence/v2` record whose capture identity is re-derived and compared during package validation (`scripts/lib/package-coverage.mjs:458-487`). The design's top rung is therefore weaker evidence than the middle rung while producing the stronger outcome.
  - Fix: Require the host rung to record, at minimum, the SHA-256 of `site/index.html` at capture time, PNG magic-byte validation, and the actual rendered width per screenshot, and have `verify.mjs` reject the rung when the recorded artifact hash differs from the file it just checked. Alternatively record `rung: host` as a distinct, explicitly self-attested evidence class and say so in the outcome line the human reads.
- **NFR4 and NFR5 have no row in the Requirement-to-Test Mapping** (`design.md:113-122`)
  - Issue: The mapping covers FR1–FR9, NFR1, NFR2, and NFR3. NFR4 (bundled-asset discipline) is addressed only as prose in Deployment Strategy, and NFR5 (necessity) has no verification anywhere. A spec-driven design's mapping is the traceability contract; two unmapped NFRs will not be planned.
  - Fix: Add a row for NFR4 naming the gates that prove it (`pnpm run check:skill-bumps`, `pnpm release:check-versions`, `pnpm release:validate`, and the core-version parity smoke test the discovery constraint names) and a row for NFR5 naming the review or checklist step that confirms each added record's consumer.
- **The project allowlist names `orchestration-log.md`, which ordinary projects do not have** (`design.md:38`)
  - Issue: `orchestration-log.md` exists only in wave wrapper projects (`.oat/projects/archived/wave-3-execution/orchestration-log.md`, produced by `oat-wave-execute`). The per-project structural log for ordinary projects is `project-log.md`, present in 39 project directories. As written, the project bundle silently omits the structural log for every non-wave project, weakening FR1's "implementation record" coverage and the "key agent decisions" narrative section.
  - Fix: List `project-log.md` in the project allowlist and keep `orchestration-log.md` for the wrapper case, or state one precedence rule covering both names.
  - Requirement: FR1, FR2
- **Duplicate exported wave summaries make the program bundle ambiguous** (`design.md:38`, `design.md:174`)
  - Issue: The program allowlist takes "per wave, the exported summary under `.oat/repo/reference/project-summaries/`". Waves 1–4 have two exports each — `20260830-wave-{1..4}-execution.md` and `20260909-wave-{1..4}-execution.md` — while waves 5–7 have one. A bundle that globs by wave name double-counts four waves, which lands directly in FR9's "aggregate numbers" section and in the cohesion ledger. The archive tree has the same duplication (`wave-1-execution/` and `wave-1-execution-202609091526342/`).
  - Fix: State the selection rule (bind exactly one summary per wave, newest export date wins; bind exactly one archived wrapper per wave) and add it to the FR9 phase so the program run cannot silently double-count.
  - Requirement: FR9, FR1
- **The `program-recap` recipe declares `authoring: markdown` for its hub** (`design.md:26`, `design.md:28`)
  - Issue: The flow has the agent write `site/index.html` for both recipes, but `.agents/skills/explainer-kit/recipes/program-recap.json` sets `floor[0].authoring: "markdown"` (`project-recap.v2.json` sets `"html"`), and `authoring` is load-bearing in the core it is shared with (`scripts/run.mjs:427,850,1063,1421,1437`). The design reads `requiredNarrative` from the recipes but never says it deliberately ignores `authoring`, and the manifest's artifact contract wants both a `contentPath` and a `renderedPath` (see Critical), which is exactly the markdown-source/HTML-render split.
  - Fix: State which recipe fields the new flow reads (`floor[].id`, `floor[].type`, `floor[].requiredNarrative`) and which it deliberately does not, and reconcile the program hub's authoring mode with the `contentPath`/`renderedPath` pair the manifest requires.
- **The FR5 contract test cites a non-exported predicate and an unnamed helper** (`design.md:118`)
  - Issue: The row says the manifest "parses through the archive validator's `isProjectRecapManifestV1` (called through the CLI's existing test helper on a fixture run)". `isProjectRecapManifestV1` is module-private (`archive-utils.ts:978`, no `export`); the only exported entry point is `verifySelectedProjectRecapForArchive` (`archive-utils.ts:1504`), which runs the full package verification. `createRecapPackage` (`archive-utils.test.ts:79`) is a local closure inside the vitest suite, not an exported helper, and skill tests are node:test `.mjs` files in a different tier. As written this test cannot be built, and it is precisely the test that would have caught the Critical finding.
  - Fix: Name the real entry point (`verifySelectedProjectRecapForArchive`), state which tier the test lives in and how a skill-produced run reaches the CLI suite, and say explicitly that the assertion is over the whole package, not the manifest keys.
  - Requirement: FR5, NFR2

### Minor

- **The manifest key enumeration omits two required keys** (`design.md:55`)
  - Issue: The parenthetical list drops `schemaVersion` and `createdAt`. Both are required by `hasExactKeys` at `archive-utils.ts:988-1001` and by `manifest.schema.json`'s `required` array, and `createdAt` must be a valid date-time (`archive-utils.ts:1009`). The surrounding sentence says "exactly as `explainer-kit.manifest/v1`", so this is an enumeration slip rather than a contract error.
  - Suggestion: Complete the list, or replace it with a pointer to the schema's `required` array so it cannot drift.
- **The Migration Plan's commit rule contradicts the phase split** (`design.md:137`, `design.md:141-151`)
  - Issue: "`probe-recap-seams.mjs`, its test, and the seam-probe prose are deleted in the same commit that lands the flow" conflicts with the phases, which land `bundle.mjs`/`record.mjs` in Phase 1, `verify.mjs` in Phase 2, and the seam-probe removal in Phase 3 — necessarily different commits.
  - Suggestion: Restate the invariant that actually matters ("no consumer references a missing script at any commit boundary") and say which phase owns the deletion.
- **The browser rung skips the session-launch step** (`design.md:50`)
  - Issue: "else `resolveHeadlessRuntime` → `probeRenderedPage` at `REPRESENTATIVE_WIDTHS`" omits the intermediate step: `probeRenderedPage(browser, url, request)` needs a browser object, produced by `launchInstalledChromium` or `createBrowserProbeSession` (`browser-runtime.mjs:125,140`), and it writes a screenshot only when `request.screenshotPath` is set. All three cited symbols and `RUNTIME_UNAVAILABLE_REASONS`' three values reproduce; only the sequence is abbreviated.
  - Suggestion: Name the launch/session call and the `screenshotPath` request field so the phase-2 task is unambiguous.

## Spec/Design Alignment

**Evidence sources used:** `discovery.md` (complete, HiLL approved 2026-09-09), `spec.md` (inline-authored by the design phase, in scope), `design.md` (under review), `.oat/repo/pjm/backlog/items/BL-260907-replace-the-default-project.md` including the 2026-09-08 triage amendments, `state.md`. Plan and implementation are scaffold-only, as expected at this phase. Premise verification ran against the live tree at `cf0552cfe`.

Upstream alignment is otherwise sound: every discovery Key Decision (direct agent authoring, contracts kept, the three-rung ladder, no CLI, one flow for both recipes, generate/retry/skip) is carried into the design without relitigation, and no operator decision is contradicted. The five discovery Open Questions are each answered. The design correctly reproduces both recipes' `requiredNarrative` lists, the program caller's output root, the `explainers.defaults` config keys, the manifest outcome enum, and all four reused QA/browser symbols.

### Requirements Coverage

| Requirement | Status  | Notes                                                                                                                                                                                        |
| ----------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR1         | partial | `bundle.mjs` and containment are specified; claim shape is not in the cited schema (I1); allowlist misses `project-log.md` (M4); `inputs.json` duplicates `manifest.source.inputHashes` (M1) |
| FR2         | covered | Both recipes' `requiredNarrative` lists reproduce exactly; authoring brief and agent step are specified. Program hub's declared `authoring` unreconciled (M6)                                |
| FR3         | partial | Ladder specified and every browser-runtime citation reproduces; top-rung evidence is unbound (M2); launch step abbreviated (minor)                                                           |
| FR4         | gap     | The reused cohesion checker cannot fail on a page claim absent from the fact base (I2); the "not token membership" clause is unmet                                                           |
| FR5         | gap     | The archive path validates the whole run package, not the manifest (C1); key list incomplete (minor); the contract test cannot be built as cited (M7)                                        |
| FR6         | partial | Retry/skip routing is well specified; its persistence mechanism rejects both the new source and `last_attempt` (I3)                                                                          |
| FR7         | covered | One flow with a recipe switch; both wave callers' text and output root reproduce                                                                                                             |
| FR8         | partial | Four consumers named; `oat-project-implement`, `oat-project-autonomous`, `autonomy-contract.md`, and the CLI prose pins are not (I4)                                                         |
| FR9         | partial | All seven wave summaries, wrapper records, and the program artifact exist; duplicate exports make aggregate numbers ambiguous (M5)                                                           |
| NFR1        | partial | Fresh-host test and per-guard negative controls are specified; the core-absent path is undefined (I5)                                                                                        |
| NFR2        | partial | Stricter for `failed`/`incomplete` as intended; silently drops `built-durable` acceptance without enumerating it (I6); C1's outcome choice unresolved                                        |
| NFR3        | covered | Browser-less completion never blocks and records `built-needs-review` with the reason; its archive path needs terminal evidence (C1)                                                         |
| NFR4        | partial | Deployment Strategy lists bumps, docs, and lockstep; the skill list is short by at least two skills (I4); no mapping row (M3)                                                                |
| NFR5        | partial | Each added record names a consumer, but two duplicate existing records (M1); no mapping row (M3)                                                                                             |

### Extra Work (not in declared requirements)

None. Every component maps to a requirement. The two records flagged in M1 are in-requirement but redundant rather than out of scope; they are graded as necessity concerns, not scope creep. The design correctly declines a CLI surface, keeps the advanced kit untouched, and leaves publish/durability alone, matching all three Non-Goals.

## Verification Commands

Run from the worktree root `/Users/tstang/orca/workspaces/open-agent-toolkit/repo-improve-wave/.worktrees/agent-authored-recap`.

```bash
# C1 — the required package paths and the exact-inventory rule (exit 0; read the code)
sed -n '110,168p' .agents/skills/explainer-kit/scripts/lib/package-coverage.mjs
sed -n '41,108p' .agents/skills/explainer-kit/scripts/lib/package-coverage.mjs
sed -n '1342,1364p;1410,1450p;1480,1492p' packages/cli/src/commands/project/archive/archive-utils.ts
sed -n '79,130p;318,345p' packages/cli/src/commands/project/archive/archive-utils.test.ts

# I1 — the fact-base claim shape is closed and has no subject/value (exit 0)
python3 -c "import json;d=json.load(open('.agents/skills/explainer-kit/schemas/fact-base.schema.json'));print(d['\$defs']['claim'])"

# I2 — a rendered number absent from the fact base passes cohesion (prints {"valid":true,"issues":[]}; exit 0)
PROBE=$(mktemp -d); printf '%s\n' \
  "import { checkArtifactCohesion } from '$PWD/.agents/skills/explainer-kit/scripts/lib/qa.mjs';" \
  "const ledger = { terminology: [{ term: 'recap' }], numbers: [{ subject: 'waves', value: 7 }], statuses: [{ subject: 'program', value: 'merged' }] };" \
  "const artifacts = [{ id: 'recap', cohesion: { terminology: { recap: 'recap' }, numericClaims: { waves: 7, 'invented-metric': 99 }, statuses: { program: 'merged' } } }];" \
  "console.log(JSON.stringify(checkArtifactCohesion(artifacts, { ledger })));" > "$PROBE/probe.mjs"
node "$PROBE/probe.mjs"; echo "exit=$?"

# I3 — both new state records are rejected today (prints two REJECTED lines; exit 0)
PROBE=$(mktemp -d); printf '%s\n' \
  "import { validateIntentRecord } from '$PWD/.agents/skills/oat-explainer-kit/scripts/resolve-intent.mjs';" \
  "for (const r of [{ decision: 'skip', source: 'failed_attempt', decided_at: '2026-09-09T00:00:00Z' }, { decision: 'skip', source: 'capability_probe', decided_at: '2026-09-09T00:00:00Z', last_attempt: { runId: 'run-1', outcome: 'failed' } }]) {" \
  "  try { validateIntentRecord('projectRecap', r); console.log('ACCEPTED', JSON.stringify(r)); } catch (e) { console.log('REJECTED:', e.message); } }" > "$PROBE/p2.mjs"
node "$PROBE/p2.mjs"; echo "exit=$?"

# I4 — the full carrier set for the retired vocabulary (exit 0)
grep -rln "probe-recap-seams\|probeRecapSeams\|capability_probe" --exclude-dir=node_modules --exclude-dir=.git .
grep -n "capability_probe" packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts

# I5 — the core is resolved from user scope and fails closed when absent (exit 0)
sed -n '9,56p' .agents/skills/oat-explainer-kit/scripts/check-core.mjs

# I6 — the finalizer promotes tracked runs to built-durable (exit 0)
grep -n "built-durable" .agents/skills/oat-explainer-kit/scripts/finalize-tracked-run.mjs

# M4/M5 — allowlist and program-input ambiguity (exit 0)
find .oat/projects -maxdepth 3 -name 'orchestration-log.md' | wc -l
find .oat/projects -maxdepth 3 -name 'project-log.md' | wc -l
ls .oat/repo/reference/project-summaries/ | grep -c 'wave-[1-4]-execution'
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert these findings into design revisions before the design HiLL checkpoint. The Critical finding changes the run-package layout and the outcome table, and I1/I2/I3 change three component contracts, so plan authoring should wait for the revised design. I4 and I5 are additions to the migration inventory and Error Handling rather than reworks. The Medium items are best folded into the same revision pass.
