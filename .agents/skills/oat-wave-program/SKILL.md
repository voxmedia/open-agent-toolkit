---
name: oat-wave-program
version: 1.3.0
description: Use when decomposing a corpus of external implementation plans into an ordered wave program — coverage inventory, dependency mapping, wave composition, and the durable execution-program artifact that oat-wave-execute consumes and updates.
argument-hint: '[new|refresh|wave-close <wave-id>] (default: refresh against the current artifact)'
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# Program a Corpus of External Plans into Waves

Maintain the **program layer** above `oat-wave-execute`: record how N external
plans (from one or more plan-generation runs) map into an ordered sequence of
waves, and keep that mapping durable and current as waves complete.
`oat-wave-execute` runs ONE wave; this skill records and maintains the
orchestrator-composed, operator-approved mapping of WHICH plans form each wave.

## Progress Indicators (User-Facing)

Print this banner once when the selected mode starts:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ WAVE PROGRAM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Report the active boundary: inventory, dependency mapping, composition
  checkpoint, coverage validation, or wave-close ledger update.
- Present the composed wave map before its required operator checkpoint; do not
  narrate every file read.
- Surface missing plans, coverage mismatches, and frozen-wave conflicts
  immediately with the exact artifact or row that blocks progress.

## Ownership Boundary

**This skill owns (mechanical):** the execution-program artifact contract and its
durable home, the plan-coverage inventory (every plan mapped exactly once or
explicitly deferred), the wave-status ledger and its update procedure at wave
boundaries, and the refresh procedure when a new plan batch lands.

**The orchestrator owns (judgment — never delegate to this skill or to workers):**
wave composition itself — theme coherence, dependency ordering, risk balancing
(don't stack all high-churn lanes in one wave), wave sizing against the operator's
concurrency ceiling, and the call on when a deferred plan re-enters the program.

## The Artifact

**Home:** `.oat/repo/reference/external-plans/<YYYY-MM-DD>-execution-program.md`
(created from `assets/execution-program-template.md`). One live program artifact
at a time; a superseding program links its predecessor. It is index-adjacent
reference material — NOT an executable plan and NOT an `oat-project-import-plan`
target (same disclaimer as the plan indexes).

**Contract:**

- **Wave table:** one row per plan — plan link, source index, wave, ordering
  notes (merge-first/solo, hard/soft dependencies), status
  (`pending | in-wave | done | deferred | dropped`).
- **Coverage invariant (load-bearing):** every plan listed in every
  `*-plan-index.md` appears in exactly one row. Plans deliberately not scheduled
  get `deferred`/`dropped` WITH the reason and re-entry trigger — silence is a
  bug. Verify mechanically (count plans in indexes vs rows) before committing.
- **Wave sections:** per wave — theme, lane list, intra-wave dependency notes
  (which lane merges first and why), and cross-wave prerequisites ("W4
  token-cost requires W3 permission-policy").
- **Status ledger:** per wave — composed → in-progress (project link) → merged
  (PR + merge SHA + completion record link). Updated by this skill's
  `wave-close` mode, invoked from `oat-wave-execute` closeout step 8.

## Process

### Mode: `new` (first program for a plan corpus)

1. **Inventory:** read every `*-plan-index.md` under
   `.oat/repo/reference/external-plans/`; extract each plan, its dependency
   notes, and any wave hints the index already records. Verify each plan file
   exists (a dangling index row is a STOP — report, don't guess).
2. **Shared-surface scan:** from the indexes' dependency notes (NOT fresh recon —
   the wave-boundary drift refresh in `oat-wave-execute` owns live evidence),
   collect hard orderings (e.g. a tool-family chain), soft orderings (same-file
   churn), and cross-batch seams (shared new modules; first-executed builds).
3. **[JUDGMENT] Compose waves:** group by theme + dependency layer, sized so a
   wave's write-disjoint groups fit the operator's concurrency ceiling in 2–3
   dispatch groups. Honor index wave hints unless evidence contradicts them —
   and record the contradiction when it does.
4. **Write the artifact** from the template; run the coverage check; present the
   wave map to the operator for approval BEFORE the first wave kicks off
   (program composition is an operator checkpoint, not a silent default).
5. Run the repo's formatter over the artifact and commit it (source-program
   examples: `pnpm format:fix`; `docs(pjm): add execution program <date>`).

### Mode: `refresh` (new plan batch, or drift in a pending wave)

1. Diff current indexes against the artifact's rows; add new plans as rows
   (initially `pending`, wave `TBD` unless an index hints placement).
2. [JUDGMENT] Re-compose only waves not yet started. Never reshuffle a wave
   that is `in-progress`; a merged wave's row set is frozen history.
3. Re-run the coverage check; commit.

### Mode: `wave-close <wave-id>` (called at wave closeout)

1. Flip the wave's plan rows to `done` (or back to `deferred` with reason, for
   lanes parked by a STOP — a parked lane re-enters a later wave explicitly).
2. Update the status ledger row: PR, merge SHA, completion-record link.
3. Note next-wave unblocks ("W3 merged → W4 token-cost unblocked").
4. Commit with the wave's closeout bookkeeping.
5. Default recap scope is the PROGRAM, not the individual wave. Until the wave
   that completes the final pending wave, run a per-wave recap only on explicit
   operator request; otherwise record `recap: deferred to program close` in that
   wave's ledger row. At program close, offer or run the program-recap caller
   below from the reconciled execution-program artifact and ALL wave records,
   then record its manifest `runId` and `outcome` in the program ledger. If the
   program recap is not run, record `recap: not run — {reason}` there. Every
   optional step gets an explicit disposition; silence is indistinguishable
   from oversight (Orc program-recap evidence).

### Program-close explainer caller

At program close by default, or for a per-wave recap explicitly requested by the
operator, the orchestrator owns fact-base synthesis. For the default program
recap it synthesizes an `explainer-kit.fact-base/v1` document from the reconciled
execution-program artifact, ALL wave summaries, and ALL completion records. Its
required keys are exactly:
`schemaVersion, generatedAt, mode, freshnessPolicy, sources, claims, unresolvedClaims, overrides`.

The mechanical caller constructs an `explainer-kit.run-request/v1` document whose
required keys are exactly:
`schemaVersion, recipe, slug, outputRoot, factBase, mode`. Set `recipe` to
`{ "id": "program-recap", "version": "1" }`; this is an object with exactly
`id` and `version`. Set `outputRoot` to `.oat/repo/explainers/<slug>/`. Bind the
synthesized fact-base file through `factBase` with the required keys
`mode, freshnessPolicy`, set `mode` to `"supplied"`, set `freshnessPolicy` to
`"live-wins"`, and set `path` to that file.

After the run, read the `explainer-kit.manifest/v1` document. Its required keys
are exactly:
`schemaVersion, runId, slug, recipe, createdAt, source, theme, artifacts, immutableHashes, outcome, buildRecord, warnings`.
Record the manifest's `runId` and `outcome` in the wave or program ledger row.
Publishing is human-gated; this caller never invokes publish.

## Integration with `oat-wave-execute`

- `oat-wave-execute` **Inputs** resolves its lane list from this artifact (falling
  back to index wave hints only when no program artifact exists).
- `oat-wave-execute` closeout step 8 invokes `wave-close` here.
- A lane parked mid-wave (source-plan STOP) surfaces in BOTH artifacts: the
  wave project's blocker record and this ledger's `deferred` row.

## Success Criteria

- Coverage invariant holds on every commit of the artifact (no silently
  unmapped plan).
- The program survives session loss: a fresh session can resume wave kickoff
  from the artifact alone, without reconstructing composition from index notes.
- Wave status ledger is current within one commit of each wave's closeout.
- Composition changes are recorded with reasons — the artifact shows why a plan
  moved waves, not just that it did.
