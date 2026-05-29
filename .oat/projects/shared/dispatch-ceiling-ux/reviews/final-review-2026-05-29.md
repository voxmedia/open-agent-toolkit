---
oat_generated: true
oat_generated_at: 2026-05-29
oat_review_scope: final
oat_review_type: code
oat_review_invocation: auto
oat_project: .oat/projects/shared/dispatch-ceiling-ux
---

# Code Review: final (dispatch-ceiling-ux, whole feature)

**Reviewed:** 2026-05-29
**Scope:** Final whole-feature review before PR — config schema (p01) → preset compiler (p01) → adapter registry (p02) → resolver (p02) → lifecycle skill copy (p03) → docs + lockstep release (p04)
**Files reviewed:** 24 source/test/skill/docs files in range (plus 2 untouched docs read for stale-reference check)
**Commits:** `97c54a06..61e9db7a` (feature commits; OAT bookkeeping commits/artifacts ignored)

## Summary

The provider-neutral dispatch-ceiling feature holds together end-to-end. The
`{ preset?, providers: { codex, claude }, source }` config/state shape and the
`{ value, mode, mechanism, dispatchArgs, verifyOnDispatch }` resolution shape are
identical across the config schema, preset compiler, adapter registry, resolver,
all three lifecycle skills, and the two updated docs pages. Every design invariant
verified by the phase reviews still holds at the final HEAD: runtime reads concrete
`providers.*` only (never the preset label), mode is computed fresh at resolve (never
persisted), verify-on-upgrade fires only for above-orchestrator Claude requests,
reviewer targets the ceiling / implementer caps at `min(preferred, ceiling)`,
`cost-conscious` never maps Claude to haiku, and the clean break leaves zero flat-key
reads in `packages/cli/src`. All three p03 nits are genuinely closed. Full
verification is green (1632/1632 CLI tests, lint 0/0, type-check clean, sync dry-run
clean, skill-version validator OK, `release:validate` passes for all five public
packages at 0.1.12).

One real gap blocks a clean pass: two docs pages outside the feature diff still
reference the **removed** flat config keys (`workflow.dispatchCeiling.codex` /
`.claude`). The authoritative config-key reference table
(`reference/oat-directory-structure.md`) lists them as live keys with full
descriptions and no mention of the new preset/providers shape — a user following it
would run `oat config set workflow.dispatchCeiling.codex high` and hit
`Unknown config key`. This is artifact (docs) drift against a defensible
implementation; the fix is a docs edit, not a code change.

## Findings

### Critical

None

### Important

- **Authoritative config-key reference still documents the removed flat dispatch-ceiling keys as live** (`apps/oat-docs/docs/reference/oat-directory-structure.md:108-109`)
  - Issue: The `.oat/config.json` config-key table lists
    `workflow.dispatchCeiling.codex` and `workflow.dispatchCeiling.claude` as current
    keys with full type/default/description rows. These keys were removed in p01-t01
    (clean break) and are no longer valid `ConfigKey` values — `isConfigKey` rejects
    them (`packages/cli/src/commands/config/index.ts:642`, `KEY_ORDER` at
    `:113-150`). The new keys (`workflow.dispatchCeiling.preset`,
    `workflow.dispatchCeiling.providers.codex`, `workflow.dispatchCeiling.providers.claude`)
    are absent from this reference entirely. The page was not touched by p04-t01
    (only `cli-utilities/configuration.md` and
    `workflows/projects/implementation-execution.md` were updated).
  - Why it matters: This is a reference page whose stated purpose is the live config
    schema. A user copying the documented key into `oat config set` gets a hard
    `Unknown config key` error, and there is no pointer to the replacement keys. It
    directly contradicts the feature's clean-break success criterion and final-review
    checklist item 6 (new config keys documented; docs match shipped behavior) and
    item 4 (no stale flat-key references in docs). This is stale-artifact drift, not a
    code defect — the implementation is source of truth; the docs lagged.
  - Suggested fix: Replace rows 108-109 with the three shipped keys, mirroring the
    table already written in `cli-utilities/configuration.md:166-179`
    (`workflow.dispatchCeiling.preset` → `balanced | maximum | cost-conscious`;
    `workflow.dispatchCeiling.providers.codex` → `low | medium | high | xhigh`;
    `workflow.dispatchCeiling.providers.claude` → `haiku | sonnet | opus`), and note
    that the flat keys were removed (no migration).

### Medium

None

### Minor

- **Lifecycle workflow doc references the removed flat-key form** (`apps/oat-docs/docs/workflows/projects/lifecycle.md:139`)
  - Issue: "planning resolves the current provider's dispatch ceiling from
    `workflow.dispatchCeiling.<provider>` ..." names the removed flat-key shape. It is
    a prose placeholder (not a code-accurate key table) and the surrounding behavior
    description is still correct, so it is lower-impact than the reference-table gap,
    but it still points at a key path that no longer exists and predates the preset
    model. This page was not in the p04-t01 diff.
  - Suggestion: Update to `workflow.dispatchCeiling.providers.<provider>` (compiled
    from a preset or set directly), matching
    `workflows/projects/implementation-execution.md:50`.

- **Codex `advisory` log-example wording is slightly misleading (now non-contradictory)** (`.agents/skills/oat-project-implement/SKILL.md:431`, `:449-451`)
  - Issue: The p03 Medium nit is closed — the example now reads `Dispatch ceiling:
unresolved (codex, advisory — ceiling set but no value resolved)`, so the value is
    no longer a self-contradictory concrete `high`. The residual nuance: for a
    supported provider (codex/claude), `mode: 'advisory'` only occurs when
    `value === null` (`packages/cli/src/commands/project/dispatch-ceiling/index.ts:304-311`),
    i.e. when **no** ceiling resolved at all — so the gloss "ceiling set but no value
    resolved" is imprecise (nothing was set; nothing resolved). This is documentation
    wording only and does not affect dispatch behavior.
  - Suggestion: Optional — reword to "no ceiling value resolved for this supported
    provider" or fold the example into the more realistic Claude not-honored-upgrade
    advisory case already shown at line 442. Not blocking.

- **Stray untracked `index.md` at repo root** (`index.md`)
  - Issue: An untracked, never-committed `index.md` sits at the repo root (a docs
    index generated without `--output`, distinct from the canonical
    `apps/oat-docs/index.md`). It is not part of the feature diff and would not land
    in the PR on its own, but it is not gitignored, so a careless `git add -A` could
    sweep it in.
  - Suggestion: Delete it (`rm index.md`) before opening the PR, or add it to
    `.gitignore`. Housekeeping only.

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `design.md`, `discovery.md`,
`implementation.md` (quick mode — no `spec.md`), and the three phase reviews
(`reviews/p01-review-2026-05-29.md`, `reviews/p02-review-2026-05-29.md`,
`reviews/p03-review-2026-05-29.md`). Read all in-range source/test/skill/docs files
plus the two untouched ceiling-referencing docs and `providers/codex` sync output
(via `sync --scope project --dry-run`) to confirm variant-name parity.

### Whole-feature integrity checklist

| Check                                                                               | Status      | Notes                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Cross-module coherence (schema ↔ compiler ↔ registry ↔ resolver ↔ skills ↔ docs) | implemented | Identical `{ preset?, providers: { codex, claude }, source }` and `{ value, mode, mechanism, dispatchArgs, verifyOnDispatch }` shapes throughout. One docs exception (Important: directory-structure.md lists removed flat keys).                   |
| 2. Runtime reads concrete `providers.*`, never preset label                         | implemented | `readResolvedConfigCeiling` (`index.ts:274`) + `readProjectDispatchCeiling` (`index.ts:217-225`) read `providers.<provider>`; preset surfaced as provenance only. Test `reads concrete providers and never the preset label` (`index.test.ts:379`). |
| 2. Mode computed at resolve, never persisted                                        | implemented | `buildProviderResolution` (`index.ts:296-334`) computes mode from adapter; test feeds bogus `mode: unsupported` in state and asserts `enforced` (`index.test.ts:414`).                                                                              |
| 2. Verify-on-upgrade only above-orchestrator                                        | implemented | Claude `isAboveOrchestrator` (`registry.ts:86-99`); codex always false. Tests: upgrade=true, cap-down/lateral/unknown=false (`registry.test.ts:73-93`, `index.test.ts:451-492`).                                                                    |
| 2. Reviewer at ceiling / implementer min(preferred,ceiling)                         | implemented | Adapter role-aware variants (`registry.ts:71-78`); skill rules implement:307-323. Test `reports the reviewer variant when role is reviewer` (`index.test.ts:495`).                                                                                  |
| 2. No haiku reviewer default                                                        | implemented | `DISPATCH_CEILING_PRESETS` cost-conscious → claude `sonnet` (`dispatch-ceiling-preset.ts:20`); all 3 skill prompts + docs tables show sonnet.                                                                                                       |
| 2. Clean break — zero flat-key reads in src                                         | implemented | grep for `dispatchCeiling.codex`/`.claude` / `dispatchCeiling.${provider}` (non-nested) in `packages/cli/src`: none.                                                                                                                                |
| 3. p03 nit — codex advisory example                                                 | implemented | Now `unresolved` value (`SKILL.md:431`), no longer the contradictory `high`. (Residual wording note → Minor.)                                                                                                                                       |
| 3. p03 nit — Claude `--orchestrator-tier`                                           | implemented | `SKILL.md:323` passes `--orchestrator-tier <current-orchestrator-tier>` so `verifyOnDispatch` can fire; docs resolver example updated (`configuration.md:280`).                                                                                     |
| 3. p03 nit — JSON `status`                                                          | implemented | `SKILL.md:193` JSON example now includes `"status": "resolved"`.                                                                                                                                                                                    |
| 4. No regressions / dead / contradictory code                                       | implemented | 1632/1632 CLI tests pass; lint 0/0; type-check clean. The two defensive resolver branches (p02 Minors) remain forward-looking, not bugs.                                                                                                            |
| 5. Five lockstep packages at 0.1.12; sync dry-run clean                             | implemented | cli/control-plane/docs-config/docs-theme/docs-transforms all 0.1.12 (from 0.1.11); `release:validate` passes; `sync --scope project --dry-run` → "No changes to apply".                                                                             |
| 6. Docs accuracy; no provider-prescriptive framing; new keys documented             | partial     | Updated docs are accurate, neutral, and document the new keys. BUT `reference/oat-directory-structure.md` (Important) and `lifecycle.md` (Minor) still name the removed flat keys.                                                                  |
| Codex variant names match sync output                                               | implemented | Registry emits `oat-phase-implementer-<v>` / `oat-reviewer-<v>`; sync dry-run lists exactly `oat-phase-implementer-{low,medium,high,xhigh}` + `oat-reviewer-{low,medium,high,xhigh}`.                                                               |

### Extra Work (not in declared requirements)

- `packages/cli/src/validation/skills.test.ts:637` — one fixture assertion bumped
  `2.1.3 → 2.1.4` to track the quick-start skill version bump. In-scope and required
  (the existing test pins the version). Not scope creep.

## Verification Commands

```bash
# Full CLI suite (observed: 1632 pass, 0 fail; 183 files)
pnpm --filter @open-agent-toolkit/cli test

# Targeted ceiling tests (observed: 39 pass — registry 17, resolver 14, preset 8)
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/providers/ceiling/ src/commands/project/dispatch-ceiling/ \
  src/config/dispatch-ceiling-preset.test.ts

# Gates (observed: clean)
pnpm lint
pnpm type-check

# Release readiness (observed: all pass / clean)
pnpm run cli -- sync --scope project --dry-run
pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main
pnpm release:validate

# Stale flat-key sweep (observed: only the 2 docs hits below remain)
grep -rn "dispatchCeiling\.codex\|dispatchCeiling\.claude" \
  packages/cli/src apps/oat-docs/docs .agents/skills | grep -v "dispatchCeiling.providers"
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks. The
single Important finding is a docs-alignment fix in
`reference/oat-directory-structure.md` (replace the two removed flat-key rows with the
three shipped keys); the `lifecycle.md` reference is a paired Minor cleanup. Both are
artifact drift against a defensible implementation, so receive should create a small
docs-fix task (e.g. `p05-t01`) rather than a code change. The remaining Minors (skill
advisory wording, stray root `index.md`) are optional.

---

## Re-review (post-fix 31564a01)

**Re-reviewed:** 2026-05-29
**Mode:** Bounded fix loop — verify prior final-review findings are closed, confirm no regression.
**Fix commit:** `31564a01` — "fix(p04-t01): align docs to provider-neutral ceiling keys; drop stray root index.md"
**Full range re-checked:** `97c54a06..31564a01` (HEAD now at the fix commit)
**Working tree:** clean at HEAD (only this untracked review artifact present).

### Verdict: PASS

Zero Critical, zero Important remaining. The one Important and two of the three Minor
findings from the prior final review are closed by `31564a01`; the third Minor (implement
SKILL.md advisory gloss) was intentionally deferred and is not a blocker. No regression:
all release gates green.

### Closure confirmation

| Prior finding                                                                         | Severity  | Status                    | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------- | --------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reference/oat-directory-structure.md` listed removed flat keys as live               | Important | **Closed**                | Diff replaces the two flat-key rows (`workflow.dispatchCeiling.codex` / `.claude`) with the three shipped keys: `workflow.dispatchCeiling.preset` (preset gloss + provider mappings + "runtime reads compiled `providers.*`, never the preset label"), `workflow.dispatchCeiling.providers.codex`, and `workflow.dispatchCeiling.providers.claude` (which carries the removal note "The flat keys ... were removed (no migration)"). Mirrors the table in `cli-utilities/configuration.md`. |
| `lifecycle.md:139` flat-key prose                                                     | Minor     | **Closed**                | Line now reads "resolves ... from `workflow.dispatchCeiling.providers.<provider>` (compiled from a preset or set directly)"; surrounding behavior prose unchanged and still correct.                                                                                                                                                                                                                                                                                                        |
| Stray untracked root `index.md`                                                       | Minor     | **Closed**                | File absent from repo root (`ls` → No such file); `git status` clean; not gitignore-dependent because it is simply gone.                                                                                                                                                                                                                                                                                                                                                                    |
| Codex `advisory` log-example gloss imprecision (`oat-project-implement/SKILL.md:431`) | Minor     | **Deferred (not closed)** | Intentionally deferred per fix-loop scope; documentation wording only, no dispatch-behavior impact. Not a blocker; not counted against the verdict.                                                                                                                                                                                                                                                                                                                                         |

### Verification (re-run, observed results)

| Gate                                                                                               | Result                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git show 31564a01 --stat` + diff inspection                                                       | 2 files changed (oat-directory-structure.md, lifecycle.md), +23/-22. Root `index.md` deletion realized as an absent untracked file (was never tracked), consistent with the prior Minor. All three doc edits confirmed present. |
| Docs flat-key sweep (`grep -rn "dispatchCeiling\.(codex                                            | claude)\b\|dispatchCeiling\.<provider>" apps/oat-docs/docs/`)                                                                                                                                                                   | Only 2 intentional "removed" notes remain — `cli-utilities/configuration.md:210-211` (Clean break section) and the removal sentence inside the new `providers.claude` row at `oat-directory-structure.md:110`. **Zero live flat-key references.** |
| CLI src flat-key reads (`grep -rn` for flat / `${provider}` / bracket forms in `packages/cli/src`) | **None** — all reads go through nested `dispatchCeiling.providers.codex` / `.claude` (`config/oat-config.ts:166-180`, resolver/registry). Clean break holds.                                                                    |
| `pnpm --filter @open-agent-toolkit/cli test`                                                       | **1632/1632 pass**, 183 files, 0 fail. No regression.                                                                                                                                                                           |
| `pnpm lint`                                                                                        | 10/10 tasks; CLI + all packages **0 warnings / 0 errors** (oxlint).                                                                                                                                                             |
| `pnpm type-check`                                                                                  | 10/10 tasks successful; `tsc --noEmit` clean across packages.                                                                                                                                                                   |
| `pnpm build:docs`                                                                                  | 6/6 tasks successful; docs site prerendered (52+ paths) without error.                                                                                                                                                          |
| `pnpm run cli -- sync --scope project --dry-run`                                                   | Clean — "No changes to apply". Pinned variants `oat-phase-implementer-{low,medium,high,xhigh}` + `oat-reviewer-{low,medium,high,xhigh}` all already in sync.                                                                    |
| `pnpm release:validate`                                                                            | **Passes for 5 public packages**; all at **0.1.12** (cli, control-plane, docs-config, docs-theme, docs-transforms). Lockstep intact.                                                                                            |

### Notes

- The session-start working-tree snapshot showed `config/index.ts`, `config/index.test.ts`,
  `config/resolve.ts`, `resolve.test.ts` as modified; these are committed within the
  re-checked range (HEAD is clean), not stray uncommitted work. No out-of-scope drift.
- No new findings introduced by `31564a01`. The deferred SKILL.md wording Minor remains the
  only open (non-blocking) item and can be picked up opportunistically.

### Re-review recommended next step

Feature is clear for PR. The single remaining Minor (deferred SKILL.md advisory gloss) is
optional polish — close it in a follow-up commit or carry it forward; it does not gate merge.
