---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-25
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p01'] # pause after Phase 1 so the operator can run the G01 pin probes
oat_plan_parallel_groups: [] # groups of phases that run concurrently in worktrees; [] = fully sequential
oat_plan_source: quick # spec-driven | quick | imported
oat_import_reference: null # e.g., references/imported-plan.md
oat_import_source_path: null # original source path provided by user
oat_import_provider: null # codex | cursor | claude | null
oat_template: false
oat_generated: false
---

# Implementation Plan: opus-5-model-guidance

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Qualify and adopt `claude-opus-5` as the hard-reasoning and
consequential incumbent in the repository's canonical model-selection guidance,
add pinned Cursor dispatch variants for it, and make the Opus 4.8
cyber-sensitive carve-out dispatchable — without changing the task-class ladder
or the Opus-first policy.

**Architecture:** Three layers change in order. Canonical guidance markdown
under `.agents/skills/subagent-orchestration/references/` carries the dated
model examples. The Cursor pin catalog in `packages/cli/src/providers/cursor/codec/catalog.ts`
declares which ladder ids may be materialized as role files, and the bundled
recommendation at `packages/cli/config/dispatch-matrix-recommendation.json`
declares which of those are default policy candidates. `oat sync` then
materializes `.cursor/agents/oat-{reviewer,phase-implementer}-<model>.md` from
the catalog; those files are generated and never hand-written.

**Tech Stack:** TypeScript ESM, pnpm workspaces, Turborepo, vitest, oxlint,
oxfmt, the `oat` CLI.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `docs(p01-t01): adopt Opus 5 in Claude guidance`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

This plan is **sequential** (`oat_plan_parallel_groups: []`), and that is a
conclusion from the write-set analysis rather than a quick-mode default.

Phase 1 (guidance markdown under `.agents/skills/`) and Phase 2 (CLI catalog
and recommendation under `packages/cli/`) are genuinely file-disjoint in their
**source** edits, so they look like parallel candidates. They are not, for two
reasons:

1. **Shared generated output.** Both phases feed a single `oat sync --scope all`
   in Phase 3, which rewrites `.oat/sync/manifest.json` and the provider view
   directories under `.claude/`, `.cursor/`, and `.codex/`. Two worktrees that
   each ran sync would conflict on the manifest and on overlapping view files
   at merge time.
2. **Shared verification gate.** Phase 3 runs one `pnpm release:validate` over
   the combined result. Splitting the phases would either duplicate that gate
   against incomplete trees or defer it entirely, which defeats its purpose.

Phase 3 depends on both predecessors by construction: sync cannot materialize
the new role files until the catalog declares them, and the lockstep version
bump must cover changes from both phases.

---

## Dispatch Profile

_No explicit per-phase constraints. Runtime selection chooses the tier._

---

RED/GREEN/Refactor is the recommended default where work is testable, not a validator requirement. Other task-body shapes, including non-TDD shapes, are allowed when appropriate, provided the plan preserves stable `pNN-tNN` IDs, per-task verification, and atomic commits.

## Phase 1: Refresh Canonical Model Guidance

Prose-only changes to dated provider references. The existing skill-validation
suite asserts structure and policy rather than incumbent names, so it must pass
**unmodified** throughout this phase. That is the phase's core signal: if a
test needs changing, the edit has drifted from an incumbent refresh into a
policy change.

### Task p01-t01: Adopt Opus 5 in the Claude provider reference

**Files:**

- Modify: `.agents/skills/subagent-orchestration/references/provider-claude.md`

**Step 1: Edit**

Apply six changes:

- **Frontmatter:** `guidance_version` and `last_verified` to `2026-07-24`;
  `review_after` to `2026-09-07` (verified + 45 days).
- **Current Families:** add `claude-opus-5` as the hard-reasoning and
  consequential default. Reposition `claude-opus-4-8` as the cyber-sensitive
  operational default and compatibility route rather than the general default.
- **Provider-Native Effort:** add an Opus 5 bullet — start at xhigh for coding
  and agentic work pending evaluation; thinking is on by default; thinking
  cannot be disabled at xhigh or max (the API returns 400); fast mode is a
  latency tier at 2x price and never a capability rung. Keep the existing Opus
  4.8 bullet for the compatibility route.
- **Dated Task-Class Matrix:** change the `intelligent-recon` and
  `default-implementation` escalation cells from `Opus 4.8 xhigh` to
  `Opus 5 xhigh`. Change the `hard-reasoning` and `consequential` defaults to
  `Opus 5 xhigh`. Both rows must still begin with the literal word `Opus`.
  Add a floor note on the consequential row pointing at the cyber section.
- **Root and Subagent Cost Posture:** update model names. Preserve the exact
  phrases the validation suite matches: "Opus remains the hard-reasoning and
  consequential root default", the Fable escalation sentence, and
  "A consequential classification by itself is insufficient".
- **Cyber-Sensitive Evidence:** keep Opus 4.8 xhigh as the operational default
  for dual-use work. Document the Opus 5 classifier unknown and the
  automatic-fallbacks evidence. State the re-evaluation condition explicitly.
  Preserve the "stronger safety classifier is not a capability weakness"
  rule and its "not an exception that inverts the general Opus-first policy"
  clause verbatim.

**Constraint — do not overstate the Claude-harness 4.8 route.** On the Claude
harness, Opus 4.8 is _not_ reachable through managed dispatch. The
candidate-ordering validator reads only `target.model` and requires it to be one
of `haiku|sonnet|opus|fable`, throwing `unsupported Claude model` otherwise
(`packages/cli/src/commands/project/dispatch-ceiling/index.ts:864-877`), and
`target.effort` is never read for Claude — contrast the Codex branch at `:879`.
`claudeAdapter.compileToDispatchArgs` likewise takes only the scalar and returns
`{ model: value }` (`packages/cli/src/providers/ceiling/registry.ts:141-149`).
The guidance must therefore describe the Claude-side carve-out as an operator
choice made outside managed dispatch, not as a dispatch-matrix route target.
Only the Cursor harness gets a materializable 4.8 pin, added in p02-t01.

**Step 2: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
Expected: passes with **no test file edits**. In particular the
`keeps Claude hard and consequential routing Opus-first` case and the
`pins all task classes and ordered guidance freshness metadata` case must both
pass, the latter confirming `guidance_version <= last_verified < review_after`.

Run: `pnpm exec oxfmt --check .agents/skills/subagent-orchestration/references/provider-claude.md`
Expected: no formatting diff.

**Step 3: Commit**

```bash
git add .agents/skills/subagent-orchestration/references/provider-claude.md
git commit -m "docs(p01-t01): adopt claude-opus-5 as Claude hard-reasoning incumbent"
```

---

### Task p01-t02: Reorder the Cursor provider reference around Opus 5

**Files:**

- Modify: `.agents/skills/subagent-orchestration/references/provider-cursor.md`

**Step 1: Edit**

- **Frontmatter:** `guidance_version` and `last_verified` to `2026-07-24`;
  `review_after` to `2026-09-07`; `catalog_basis` updated to cite the operator's
  2026-07-24 Cursor snapshot **and** CursorBench 3.2, replacing the current
  snapshot-plus-docs basis.
- **Dated Task-Class Matrix:** update the snapshot date reference from
  2026-07-21 to 2026-07-24. All five task-class rows must remain present and in
  order. Set the rows to exactly this, leaving `mechanical-recon` and
  `intelligent-recon` unchanged:

  | Row                      | Escalation / default                                                                                                                                                                 |
  | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
  | `default-implementation` | Escalation becomes `gpt-5.6-sol-high` or `claude-opus-5-thinking-high`, replacing the Fable reference.                                                                               |
  | `hard-reasoning`         | Escalation becomes `gpt-5.6-sol-xhigh` or `claude-opus-5-thinking-xhigh`, replacing the Fable reference.                                                                             |
  | `consequential`          | Default becomes a cross-family author/reviewer pair, normally `gpt-5.6-sol-xhigh` plus `claude-opus-5-thinking-xhigh`. Escalation becomes Sol max plus `claude-opus-5-thinking-max`. |

  **Cross-family means cross-vendor.** The cross-family property of the
  `consequential` pair comes from pairing OpenAI (Sol) with Anthropic — it does
  **not** come from Fable. Fable and Opus are both Anthropic, so substituting
  one for the other changes nothing about cross-family review. Do not describe
  Fable as "the cross-family reviewer"; that phrasing is wrong and this task
  exists partly to remove it.

  Fable's remaining role is **exceptional escalation only**, consistent with
  canon: reach for `claude-fable-5-thinking-max` beyond the Opus 5 max pair when
  unresolved ambiguity or exceptional novelty justifies the incremental cost. A
  consequential classification alone does not justify it.

  The `consequential` floor note keeps `claude-opus-4-8-thinking-xhigh` as the
  cyber-sensitive substitution, which p02-t01 makes materializable.

- **Broader Cursor Routes:** add Opus 5 entries with their CursorBench 3.2
  evidence. Note that non-thinking aliases cap at `high`, mirroring the API
  constraint, and that `-fast` variants remain latency purchases under the
  existing service-tier rule.
- Present all benchmark figures as dated evidence with source and date, not as
  durable ordering, consistent with how the Grok contamination caveat is framed.

**Step 2: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
Expected: passes with no test file edits; the Cursor task-class matrix still
resolves all five classes in order.

Run: `pnpm exec oxfmt --check .agents/skills/subagent-orchestration/references/provider-cursor.md`
Expected: no formatting diff.

**Step 3: Commit**

```bash
git add .agents/skills/subagent-orchestration/references/provider-cursor.md
git commit -m "docs(p01-t02): make Opus 5 the primary Cursor escalation route"
```

---

### Task p01-t03: Update the evidence and refresh summary

**Files:**

- Modify: `.agents/skills/subagent-orchestration/references/evidence-and-refresh.md`

**Step 1: Edit**

- **Frontmatter block:** `guidance_version` and `last_verified` to
  `2026-07-24`; `review_after` to `2026-09-07`; `stale_after` to `2026-10-22`.
  The suite asserts `guidance_version <= last_verified < review_after < stale_after`.
- **Current Evidence Summary:** rewrite the Anthropic bullet to record the Opus
  5 release, Anthropic's positioning of Opus as the recommended default below
  Fable, and the open classifier question raised by automatic fallbacks for
  safety-classifier-flagged requests.
- Add a CursorBench 3.2 bullet covering the Opus 5 per-rung results, including
  that Opus 5 low outscores Opus 4.8 max at a fraction of the cost — the
  measured basis for the incumbent swap under criterion 4 of Candidate
  Qualification. Scope the claim to the Cursor harness explicitly so it is not
  read as direct-provider evidence.
- Keep the existing Fable cyber-classifier bullet unchanged.

**Step 2: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
Expected: passes with no test file edits; the four refresh dates parse and
remain strictly ordered.

Run: `pnpm exec oxfmt --check .agents/skills/subagent-orchestration/references/evidence-and-refresh.md`
Expected: no formatting diff.

**Step 3: Commit**

```bash
git add .agents/skills/subagent-orchestration/references/evidence-and-refresh.md
git commit -m "docs(p01-t03): record Opus 5 qualification evidence"
```

---

### Task p01-t04: Bump the skill version and confirm the mechanics reference is clean

**Files:**

- Modify: `.agents/skills/subagent-orchestration/SKILL.md`

**Step 1: Edit**

Bump frontmatter `version` from `1.0.0` to `1.1.0`. The repo contract requires
exactly one bump per changed canonical skill across the final PR diff, and this
is the only canonical skill whose references changed. A minor bump is correct:
the dated examples changed, the durable selection contract did not.

**Step 2: Verify the mechanics reference needs no edit**

Handoff item 5 asks for verification rather than assumption.

Run: `rg -n "opus|fable|sonnet-5|gpt-5\.6" .agents/skills/oat-dispatch-subagents/references/provider-claude.md`
Expected: exit code 1, no matches. The mechanics reference is model-name-free by
design and the `keeps provider mechanics generic while retaining selectors and floors`
test enforces that.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
Expected: passes with no test file edits.

**Step 4: Commit**

```bash
git add .agents/skills/subagent-orchestration/SKILL.md
git commit -m "docs(p01-t04): bump subagent-orchestration skill to 1.1.0"
```

---

### Task p01-t05: Prepare and run the G01 pin probes

**Files:**

- Create: `.cursor/agents/zz-pin-probe-<n>.md` (six temporary probe definitions, deleted in this task)
- Create: `.oat/projects/shared/opus-5-model-guidance/references/g01-probe-results.md`

**This task ends Phase 1 at a HiLL checkpoint.** The operator must run the
probes; the implementer cannot.

**Step 1: Understand why this task exists**

`assertApprovedMapping` only validates the _shape_ of `gateEvidence`
(`packages/cli/src/providers/cursor/codec/materialize.ts:39-53`) — any mapping
declaring `gate: 'g01'` and `disposition: 'approved'` materializes. The real
authority is external:
`apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md:307` states that
mapping-specific native-launch evidence authorizes shipped mapping data, and
`:314-317` warns that Cursor can silently fall back when account or plan
constraints prevent a pin, so acceptance of a variant is not model verification.

Adding the six mappings without probes would fabricate approvals for routes that
include consequential review, where a silent downgrade is most costly.

**Step 2: Create the probe definitions**

Write six minimal Cursor agent definitions, one per candidate bracket form:

| Probe file          | `model:` frontmatter value      |
| ------------------- | ------------------------------- |
| `zz-pin-probe-1.md` | `claude-opus-5[effort=low]`     |
| `zz-pin-probe-2.md` | `claude-opus-5[effort=medium]`  |
| `zz-pin-probe-3.md` | `claude-opus-5[effort=high]`    |
| `zz-pin-probe-4.md` | `claude-opus-5[effort=xhigh]`   |
| `zz-pin-probe-5.md` | `claude-opus-5[effort=max]`     |
| `zz-pin-probe-6.md` | `claude-opus-4-8[effort=xhigh]` |

Keep each body trivial — the probe tests pin resolution, not behavior.

**Step 3: HiLL — operator runs the probes**

For each probe, launch it in Cursor and record the model **Cursor itself
reports** for the run. Do **not** ask the agent what model it is: the contract at
`dispatch-ceiling.md:316-317` explicitly forbids promoting self-report into
observed identity.

Record per probe: the bracket form submitted, the model Cursor reports, whether
the definition was accepted or silently fell back, and whether the resolved
variant is thinking-enabled. The last item is the assumption flagged in
`discovery.md` that no other step can settle.

**Step 4: Record results and decide the mapping set**

Write `references/g01-probe-results.md` with one row per probe covering the
bracket form, observed model, accepted-or-fallback, thinking state, date, and
Cursor version.

**Only mappings whose observed model matches the intent proceed to p02-t01.**
Any probe that falls back or resolves non-thinking is dropped from the mapping
set, and its tier slot in p02-t02 is dropped with it — adjust the expected
counts in p02-t01 and p02-t02 accordingly rather than forcing 17/16.

**Step 5: Clean up**

```bash
rm .cursor/agents/zz-pin-probe-*.md
```

Run: `pnpm run cli -- status --scope project`
Expected: no unmanaged provider files remain.

**Step 6: Commit**

```bash
git add .oat/projects/shared/opus-5-model-guidance/references/g01-probe-results.md
git commit -m "docs(p01-t05): record G01 pin probe evidence"
```

---

## Phase 2: Cursor Pin Catalog and Dispatch Recommendation

**Precondition:** p01-t05 is complete and
`references/g01-probe-results.md` records a matching observed model for every
mapping added below. Do not add a mapping without a passing probe row.

Unlike Phase 1, this phase **does** change test expectations, because the
affected assertions pin exact catalog contents and counts by design. Those are
inventory assertions, not policy assertions.

### Task p02-t01: Add Opus pin mappings and demote Sonnet 5 high

**Files:**

- Modify: `packages/cli/src/providers/cursor/codec/catalog.ts`
- Modify: `packages/cli/src/providers/cursor/codec/catalog.test.ts`

**Step 1: Write test (RED)**

Update `APPROVED_G01_MAPPINGS` in `catalog.test.ts` to include the six new
ladder-id/frontmatter pairs in their declared order:

```typescript
['claude-opus-5-thinking-low', 'claude-opus-5[effort=low]'],
['claude-opus-5-thinking-medium', 'claude-opus-5[effort=medium]'],
['claude-opus-5-thinking-high', 'claude-opus-5[effort=high]'],
['claude-opus-5-thinking-xhigh', 'claude-opus-5[effort=xhigh]'],
['claude-opus-5-thinking-max', 'claude-opus-5[effort=max]'],
['claude-opus-4-8-thinking-xhigh', 'claude-opus-4-8[effort=xhigh]'],
```

Update the catalogue-membership case: `SUPPORTED_CURSOR_ROLE_TARGETS` becomes
17, and `claude-sonnet-5-high` joins the existing `not.toContain` assertions
alongside `composer-2.5-fast`, `cursor-grok-4.5-high-fast`, and
`claude-fable-5-xhigh`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/cursor/codec/catalog.test.ts`
Expected: fails (RED)

**Step 2: Implement (GREEN)**

In `catalog.ts`, add the six `approvedMapping(...)` entries using the
`claude-effort` syntax family, and add `{ catalogue: false }` to the existing
`claude-sonnet-5-high` mapping.

Add a comment at the Opus 5 group citing the probe evidence from p01-t05 —
`references/g01-probe-results.md`, with its date — rather than asserting the
mapping is correct. Note the thinking-axis limitation of the bracket form and
that the probe is what resolved it.

Pass an explicit `probeName` per mapping matching the recorded probe rather than
relying on the `oat-pin-probe-<id>` default, so the code points at real
evidence.

Keep `claude-opus-4-8-thinking-xhigh` catalogued so the cyber-sensitive route in
`provider-cursor.md` is materializable, while leaving it out of the bundled
recommendation in p02-t02.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/cursor/codec/catalog.test.ts`
Expected: passes (GREEN)

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/cursor/codec/`
Expected: `catalog`, `materialize`, `shared`, and `sync-extension` suites all
pass. `materializeCursorAgents` must not raise the ambiguous-role-name error,
confirming all 17 targets produce distinct role names across both base roles.

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: no errors

**Step 4: Commit**

```bash
git add packages/cli/src/providers/cursor/codec/catalog.ts packages/cli/src/providers/cursor/codec/catalog.test.ts
git commit -m "feat(p02-t01): add Opus 5 and Opus 4.8 Cursor pin mappings"
```

---

### Task p02-t02: Rebalance the bundled dispatch-matrix recommendation

**Files:**

- Modify: `packages/cli/config/dispatch-matrix-recommendation.json`
- Modify: `packages/cli/assets/config/dispatch-matrix-recommendation.json` (generated by the bundle script)
- Modify: `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`
- Modify: `packages/cli/src/providers/cursor/codec/catalog.test.ts`

**Generated write set.** `bundle-assets.sh` recopies the whole bundled skill
tree, so running it produces churn under `packages/cli/assets/skills/`. That
churn is **not** committed: `.gitignore:21-22` ignores `packages/cli/assets/*`
except `public-package-versions.json`. Exactly three paths under `assets/` are
tracked — `config/dispatch-matrix-recommendation.json`,
`migration/pjm-restructure.md`, and `public-package-versions.json` — and only
the first is in this task's write set. Verify with
`git ls-files packages/cli/assets` if the diff looks larger than expected.

**Step 1: Write test (RED)**

Update the expected `providers.cursor` object in `bundle-consistency.test.ts`
and the candidate list in `config/index.test.ts` to the target matrix:

| Tier       | Candidates                                                                                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `economy`  | `composer-2.5`, `gpt-5.6-luna-high`, `gpt-5.6-luna-xhigh`                                                                                                             |
| `balanced` | `cursor-grok-4.5-high`, `gpt-5.6-terra-high`, `claude-opus-5-thinking-low`                                                                                            |
| `high`     | `gpt-5.6-sol-medium`, `gpt-5.6-sol-high`, `claude-opus-5-thinking-medium`, `claude-opus-5-thinking-high`                                                              |
| `frontier` | `claude-fable-5-thinking-high`, `claude-fable-5-thinking-xhigh`, `gpt-5.6-sol-xhigh`, `gpt-5.6-sol-max`, `claude-opus-5-thinking-xhigh`, `claude-opus-5-thinking-max` |

Update the version assertion from `2026-07-11.1` to `2026-07-24.1` in **all
three** files — `catalog.test.ts:76`, `bundle-consistency.test.ts:536`, and
`config/index.test.ts:1957`. The third is easy to miss because its candidate
list sits inside a nested `toMatchObject` rather than a standalone assertion.
Update the Cursor candidate count in `catalog.test.ts` from 12 to 16.

`sync-extension.test.ts:103-118` derives its expectations from
`SUPPORTED_CURSOR_ROLE_TARGETS.length` dynamically and needs no edit; confirm
rather than assume.

Note the count asymmetry is intentional and must not be "fixed": 17 catalogued
targets against 16 recommendation candidates, because
`claude-opus-4-8-thinking-xhigh` is catalogued without being recommended. The
surviving invariant is that every recommendation candidate resolves to a
catalogued mapping, which the existing loop already asserts.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts src/commands/config/index.test.ts src/providers/cursor/codec/catalog.test.ts`
Expected: fails (RED)

**Step 2: Implement (GREEN)**

Edit `packages/cli/config/dispatch-matrix-recommendation.json`: set `version` to
`2026-07-24.1`, remove `claude-sonnet-5-high` from `economy`, and add the five
Opus 5 rungs to their tiers. Leave the `codex` and `claude` provider blocks
untouched — the `claude` block takes only the four family scalars and cannot
express effort.

Regenerate the mirrored asset rather than hand-editing it:

```bash
bash packages/cli/scripts/bundle-assets.sh
```

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts src/commands/config/index.test.ts src/providers/cursor/codec/catalog.test.ts`
Expected: passes (GREEN), including the `recommendation`/`sourceRecommendation`/`checkedInAsset`
three-way equality check that guards the config-to-assets mirror.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/`
Expected: dispatch-matrix normalization and ceiling-preset suites still pass.

**Step 4: Commit**

Stage the exact declared paths, not the directories:

```bash
git add packages/cli/config/dispatch-matrix-recommendation.json \
        packages/cli/assets/config/dispatch-matrix-recommendation.json \
        packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts \
        packages/cli/src/commands/config/index.test.ts \
        packages/cli/src/providers/cursor/codec/catalog.test.ts
git status --porcelain   # expect nothing unexpected left staged
git commit -m "feat(p02-t02): place Opus 5 rungs in the Cursor dispatch recommendation"
```

---

## Phase 3: Sync, Release Contract, and Validation

### Task p03-t01: Materialize the new Cursor role files

**Files:**

- Modify: `.cursor/agents/**` (generated)
- Modify: `.oat/sync/manifest.json` (generated)

**Step 1: Run sync**

Role files are generated. Do not hand-write them.

```bash
pnpm run cli -- sync --scope all
```

**Step 2: Verify**

Run: `find .cursor/agents -maxdepth 1 -type f -name '*.md' | wc -l`
Expected: `34` materialized role files. Use `-type f` so the 4 symlinked base
roles are excluded; a bare `ls .cursor/agents/*.md | wc -l` would print `38`.

Confirm the specific deltas: six new `oat-reviewer-claude-opus-*` and six new
`oat-phase-implementer-claude-opus-*` files exist, and both
`*-claude-sonnet-5-high.md` files are gone.

Run: `pnpm run cli -- status --scope project`
Expected: no unmanaged provider files reported.

Spot-check one generated file for `model: claude-opus-5[effort=xhigh]` and the
`# oat-managed: true` / `# oat-owner: supported-catalogue` markers.

**Step 3: Commit**

```bash
git add .cursor .oat/sync/manifest.json
git commit -m "chore(p03-t01): sync Opus role variants"
```

---

### Task p03-t02: Lockstep public package version bump

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json` (generated by the bundle script from the five versions above; tracked despite living under `assets/`, via the `.gitignore:22` negation)

**Step 1: Edit**

Bump all five from `0.2.17` to `0.2.18` together. Bundled assets under
`.agents/skills` count as shipped CLI functionality, so the lockstep rule
applies even though most changed files are markdown and JSON.

Regenerate the derived asset rather than hand-editing it:

```bash
bash packages/cli/scripts/bundle-assets.sh
```

**Step 2: Verify**

Run: `pnpm release:validate`
Expected: passes, confirming the five versions moved in lockstep.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts`
Expected: passes, including the case that derives
`public-package-versions.json` from the shared inventory — this is what proves
the regenerated asset matches the five bumped versions.

**Step 3: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json \
        packages/docs-config/package.json packages/docs-theme/package.json \
        packages/docs-transforms/package.json \
        packages/cli/assets/public-package-versions.json
git commit -m "chore(p03-t02): bump public packages to 0.2.18"
```

---

### Task p03-t03: File the deferred-findings backlog item

**Files:**

- Create: `.oat/repo/pjm/backlog/items/<id>.md` (id returned by the CLI)
- Modify: `.oat/repo/pjm/backlog/index.md` (regenerated)

**Do not hardcode the date in the filename.** `oat backlog new` derives the
`BL-YYMMDD-slug` id from the current **UTC** date
(`packages/cli/src/commands/backlog/shared/generate-id.ts`), which can be a day
ahead of the operator's local date. Capture the id from the command output.

The active backlog root is `.oat/repo/pjm/backlog`, which is the CLI default and
uses `BL-YYMMDD-slug` identifiers. Do not write to `.oat/repo/reference/backlog`
— per the repo convention, `pjm/` holds active state and `reference/` holds
durable records.

**Step 1: Create**

Declare the canonical metadata on the creation command rather than editing it in
afterwards:

```bash
pnpm run cli -- backlog new "Rebalance the Cursor dispatch recommendation tiers" \
  --priority medium \
  --scope task \
  --scope-estimate M \
  --labels dispatch,cursor,model-guidance \
  --json
```

Capture the returned item path and reuse that exact value for the content edits
and every verification below.

Pass the body via `--description` or write it into the generated item file. The
command writes the item and regenerates the managed index in one step, so no
second mutation is needed.

Record the three deferred findings with their CursorBench 3.2 evidence:

- **Fable frontier inversion.** Both Fable candidates are strictly dominated,
  and `claude-fable-5-thinking-high` (66.5%, $8.77) was already beaten by
  `gpt-5.6-sol-max` (67.2%, $5.69) in the same tier before this project. Fable
  also provides no cross-family diversity from Opus, since both are Anthropic.
  Removal is a policy change against canon's exceptional-escalation
  designation, so it needs its own decision.
- **Economy tier composition.** With `claude-sonnet-5-high` removed, the
  remaining Composer and Luna placements were never re-examined.
- **`gpt-5.6-sol-low` as a latency route.** Dominated on score and cost by
  `gpt-5.6-luna-high`, but at 19 steps and 5,104 tokens it is far leaner than
  anything in economy. Worth adding only if a low-latency economy route is
  needed.

Note in the item that CursorBench measures Cursor-harness agentic coding on one
task distribution, and that the evidence policy warns against treating
leaderboard rank as a universal model order.

Replace the template acceptance-criteria placeholders with concrete criteria —
at minimum: a decision recorded on whether Fable keeps a frontier slot, the
economy tier's Composer and Luna placements re-examined against current
CursorBench data, and a stated position on `gpt-5.6-sol-low` as a latency route.

**Step 2: Verify**

Run: `rg -n "Rebalance the Cursor dispatch" .oat/repo/pjm/backlog/index.md`
Expected: one match — the creation command already regenerated the index, so
this confirms the result rather than re-running the mutation.

Run `rg -n "TBD|Acceptance Criteria" "$ITEM_PATH"` against the path the CLI
returned.
Expected: an `Acceptance Criteria` heading with no unresolved template
placeholders beneath it.

**Step 3: Commit**

```bash
git add .oat/repo/pjm/backlog
git commit -m "docs(p03-t03): backlog Cursor tier rebalance findings"
```

---

### Task p03-t04: Full repository validation

**Files:**

- None (verification only; fix-ups commit against their owning task scope)

**Step 1: Verify**

```bash
pnpm format
pnpm lint
pnpm type-check
pnpm test
pnpm release:validate
```

Expected: all pass.

**Step 2: Confirm the refresh invariant held**

Run: `git diff --stat main -- packages/cli/src/validation/skills.test.ts`
Expected: empty. The skill-validation suite must be untouched across the whole
PR. Any diff means a policy assertion was broken and the guidance edits
overstepped an incumbent refresh.

**Step 3: Commit**

Only if formatting or lint produced changes. Inspect the diff first and stage
the specific paths the formatter touched — do not use `git add -A`, which would
absorb unrelated or generated files into a validation-only commit:

```bash
git status --porcelain
git add <the specific formatter-touched paths>
git commit -m "chore(p03-t04): apply formatting and lint fixes"
```

Where a fix-up clearly belongs to an earlier task's scope, prefer committing it
under that task's scope instead.

---

### Task p03-t05: Emit the schema-complete reverification record

**Files:**

- Create: `.oat/projects/shared/opus-5-model-guidance/references/reverification.md`

**Step 1: Write the record**

Handoff item 6 requires a reverification entry conforming to the Reverification
Record schema in
`.agents/skills/subagent-orchestration/references/evidence-and-refresh.md`. It
is written last so it records the validated final state.

**Path matters.** Do **not** write this under the project's `pr/` directory —
`.gitignore:74` excludes `.oat/**/pr/`, so the file could never be committed
(confirm with `git ls-files '.oat/**/pr'`, which returns nothing). `references/`
is tracked. `oat-project-pr-final` has no reverification input and will not lift
this file automatically; whoever opens the PR copies its contents into the PR
body as an explicit step.

Every key in the schema must be present:

```yaml
verified_at: <RFC3339 timestamp>
provider: claude # plus a second entry for cursor
harness_context: <exact launching surface>
catalog_source: UI snapshot # operator Cursor catalog snapshot 2026-07-24
models_considered: <exact selectors>
controls_verified: effort, service tier, reasoning mode, context, tools
sources: <official docs and relevant benchmarks>
incumbent_changes: <additions, replacements, removals>
reason: <scheduled review or trigger>
```

Required content beyond the bare schema:

- `reason` is the newer-family trigger, not a scheduled review.
- `sources` cites both the operator Cursor catalog snapshot (2026-07-24) and
  CursorBench 3.2, plus the Anthropic release and platform documentation.
- `incumbent_changes` lists the Opus 4.8 to Opus 5 replacement, the five Opus 5
  Cursor pins, the Opus 4.8 cyber pin addition, and the `claude-sonnet-5-high`
  economy removal.
- **The thinking-mode assumption must appear explicitly**: the Cursor bracket
  syntax cannot express the thinking axis, so `claude-opus-5[effort=...]` is
  assumed to resolve to the thinking-enabled variant. Unverified by live probe.
- Record the Opus 5 classifier question and the retained Opus 4.8
  cyber-sensitive carve-out under `controls_verified` or `sources`.

**Step 2: Verify**

Assert each key independently rather than counting matching lines, so a missing
key fails loudly:

```bash
REC=.oat/projects/shared/opus-5-model-guidance/references/reverification.md
for k in verified_at provider harness_context catalog_source \
         models_considered controls_verified sources incumbent_changes reason; do
  rg -q "^\s*-?\s*${k}:" "$REC" || { echo "MISSING: $k"; exit 1; }
done
echo "all schema keys present"
```

Expected: `all schema keys present`.

Run: `rg -c "^\s*-?\s*provider:" $REC`
Expected: `2` — one entry for `claude`, one for `cursor`.

Run: `rg -n "thinking" $REC`
Expected: at least one match documenting the thinking-mode resolution and
whether the p01-t05 probe confirmed it.

Run: `pnpm exec oxfmt --check $REC`
Expected: no formatting diff.

**Step 3: Commit**

```bash
git add .oat/projects/shared/opus-5-model-guidance/references/reverification.md
git commit -m "docs(p03-t05): record Opus 5 reverification entry"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

| Scope | Type     | Status   | Date       | Artifact                                               |
| ----- | -------- | -------- | ---------- | ------------------------------------------------------ |
| p01   | code     | pending  | -          | -                                                      |
| p02   | code     | pending  | -          | -                                                      |
| p03   | code     | pending  | -          | -                                                      |
| final | code     | pending  | -          | -                                                      |
| plan  | artifact | passed   | 2026-07-25 | inline (planning parent) + bounded verification worker |
| plan  | artifact | received | 2026-07-25 | reviews/artifact-plan-review-2026-07-25T004651Z.md     |
| plan  | artifact | received | 2026-07-25 | reviews/artifact-plan-review-2026-07-25T005730Z.md     |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 5 tasks - Refresh the three dated guidance references, bump the canonical skill version, and run the G01 pin probes (HiLL checkpoint)
- Phase 2: 2 tasks - Add six Cursor pin mappings, demote Sonnet 5 high, and rebalance the bundled recommendation
- Phase 3: 5 tasks - Materialize role files, bump public packages in lockstep, file the backlog item, validate, and emit the reverification record

**Total: 12 tasks**

Ready for code review and merge.

---

## References

- Discovery: `discovery.md`
- Design: N/A (quick mode — no architecture decisions surfaced)
- Spec: N/A (quick mode)
- Evidence: CursorBench 3.2 (`https://cursor.com/cursorbench`, retrieved 2026-07-24); operator Cursor catalog snapshot 2026-07-24; Anthropic Opus 5 release materials
- Refresh contract: `.agents/skills/subagent-orchestration/references/evidence-and-refresh.md`
