---
oat_generated: true
oat_generated_at: 2026-09-09T16:37:11Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/recon-rework
---

# Artifact Review: plan

**Reviewed:** 2026-09-09T16:37:11Z
**Scope:** `plan.md` artifact review (quick mode) for `recon-rework`
**Worktree / head:** `/Users/tstang/orca/workspaces/open-agent-toolkit/recon-rework` @ `f0e0f190bebaa982214c7bf71d5f988212812caa` (branch `recon-rework`)
**Files reviewed:** 4 in-scope project artifacts (`plan.md`, `discovery.md`, `design.md`, `references/source-context.md`) plus `handoff.md`, `state.md`, `implementation.md`, the source backlog item, and 30+ live repository surfaces cited by the plan
**Reconnaissance:** not-attempted

## Summary

The plan is unusually disciplined for a pre-review draft: every path it names
exists at HEAD, every command it names is a real script, the eight-gate list is
byte-accurate against `AGENTS.md`, the phase ordering is genuinely sequential on
shared files, and its honesty guards (no fake review rows, no invented launch
provenance, no speculative version numbers) are consistent across discovery,
design, and plan. Premise verification found no fabricated citation in `plan.md`
itself. The gaps are coverage gaps, not correctness gaps: three of the backlog
item's six acceptance criteria are only partially mapped to task steps — one of
them is silently declined by a defensible design decision — and the first task
is the only one with no executable verification command.

Findings: 0 critical, 3 important, 5 medium, 4 minor

## Findings

### Critical

None.

### Important

- **Acceptance criterion "validates below-floor routing" is declined by design with no recorded deferral** (`.oat/repo/pjm/backlog/items/BL-260908-restore-recon-s-cheap-fan-out.md:33`, `.oat/projects/shared/recon-rework/design.md:302-305`)
  - Issue: AC5 requires `scripts/lib/contracts.mjs` to validate "per-wave
    targets, below-floor routing, target drift, and unapproved escalation".
    Design deliberately declines the below-floor clause: "`classFloor` records
    required capability, not a new global model rank... Do not add a misleading
    `BELOW_CLASS_FLOOR` model-name heuristic" (`design.md:302-305`). The plan
    follows design — `p01-t02` step 3 carries `class/floor/reason` as data and
    `p02-t01` step 5 says the tool "checks structure/identity, not model
    capability from names" (`plan.md:153`, `plan.md:206-207`). The refusal is
    correct engineering (a model string cannot prove capability), but no
    artifact records it as a deviation. `plan.md:530-532` then instructs the
    implementer to "reconcile #274" at shipping closeout, which will tick a
    criterion the work deliberately does not satisfy in the form written.
  - Fix: add an explicit interpretation/deferral note (plan `Before
Implementation`, or a design paragraph the plan cites) stating what
    below-floor validation concretely means here — `classFloor` enum validity,
    `taskClass`/`classFloor` consistency, and approved-vs-constructed target
    identity — and what is deliberately not validated (model-name capability
    ranking, which stays with provider guidance per
    `.agents/skills/oat-dispatch-subagents/SKILL.md:283,320`). Reference that
    note from the `p04-t02` closeout sentence so #274 is reconciled against the
    recorded interpretation rather than the literal clause.

- **Acceptance criterion for documenting the `quick` profile has no task step** (`.oat/repo/pjm/backlog/items/BL-260908-restore-recon-s-cheap-fan-out.md:35`, `.oat/projects/shared/recon-rework/plan.md:350-351`)
  - Issue: AC6 requires that "the `quick` profile is documented as an evidence
    packet for an intelligent consumer (no independent semantic pass by
    design)". The only related step is `p03-t01` item 6, which says _preserve_
    quick's supported assurance (`plan.md:350-351`), and `p03-t02` item 4, which
    lists what the public docs must document (`plan.md:397-398`) without naming
    the quick framing. `references/profiles.md:8-18` today states the mechanics
    ("Assurance ceiling: `supported`"; "no semantic, adversarial, or coverage
    worker is implied") but not the _by design, for an intelligent consumer_
    rationale, and `apps/oat-docs/docs/workflows/skills/recon.md:69-73` presents
    quick only as a claim-ceiling row. Nothing in the plan requires the change,
    and `p03-t01`'s verification is prose pins the task itself authors, so the
    criterion would go unmet without anything failing.
  - Fix: add an explicit step to `p03-t01` (edit `references/profiles.md`'s
    `## quick` section) and to `p03-t02` (edit the docs profile table/prose)
    requiring the "evidence packet for an intelligent consumer; no independent
    semantic pass by design" framing, and add a matching prose assertion to
    `.agents/skills/recon/tests/skill-contract.test.mjs` so the wording is
    pinned rather than merely intended.

- **`p01-t01` has no executable verification command and no defined pass condition** (`.oat/projects/shared/recon-rework/plan.md:131-133`)
  - Issue: `p01-t01` is the only one of the nine tasks whose **Verify** is prose
    with no command block: "Run the decision index regeneration command and PJM
    doctor. Confirm the new record/index link resolves..." The receiving agent
    must improvise the command names. They are unambiguous and verifiable —
    `oat decision new`, `oat decision regenerate-index`, and `pjm doctor --json`
    all exist (`pnpm run --silent cli:source -- decision --help`, exit 0).
    Worse, the named gate is currently red for unrelated reasons: `pjm doctor
--json` returns `"status": "warn"` and **exit 1** at this head, exactly as
    `references/source-context.md:111-113` predicted. `p01-t01` says "Capture
    any inherited PJM warnings separately" (`plan.md:132-133`) but never says
    what a _pass_ looks like, so the task's exit criterion is undefined for the
    task that writes a durable governing decision record.
  - Fix: replace the prose with a fenced block naming
    `pnpm run --silent cli:source -- pjm doctor --json`,
    `pnpm run --silent cli:source -- decision new <title> ...`, and
    `pnpm run --silent cli:source -- decision regenerate-index`, and state the
    pass condition as a delta: doctor's inherited completed-ledger warnings and
    exit 1 are the accepted baseline, and the task passes when the check set is
    unchanged apart from the new record appearing in
    `.oat/repo/reference/decisions/index.md`.

### Medium

- **AC1's four-party responsibility split is not required by any task step** (`.oat/repo/pjm/backlog/items/BL-260908-restore-recon-s-cheap-fan-out.md:29`, `.oat/projects/shared/recon-rework/plan.md:340-345`)
  - Issue: AC1 requires the skill to open with the intent statement **and**
    state "the responsibility split among recon, `subagent-orchestration`,
    `oat-dispatch-subagents`, and the caller". `p03-t01` item 1 covers only
    "Put confirmed intent near the opening"; item 3 is about which references to
    load, not about declaring ownership. `design.md:39-46` has the full
    four-party ownership table, but no task instructs anyone to land it.
    `.agents/skills/recon/SKILL.md:15-18` today names only two parties
    ("controller" vs "installed dispatch dependencies") and never mentions the
    caller's ownership of conclusions.
  - Fix: extend `p03-t01` item 1 to require the SKILL.md opening to carry the
    `design.md:39-46` ownership split by name (recon controller /
    subagent-orchestration / oat-dispatch-subagents / calling agent), and pin it
    in `skill-contract.test.mjs`.

- **No task instructs the controller to emit `schemaVersion: 2`** (`.oat/projects/shared/recon-rework/design.md:135`, `.oat/projects/shared/recon-rework/plan.md:152-153,340-341`)
  - Issue: `design.md:135` states "New `recon.packet-manifest` writers emit
    schemaVersion 2." The only writer is the controller skill — no script under
    `.agents/skills/recon/scripts/` constructs a manifest (verified: the only
    `schemaVersion: N` literals are output-artifact constants in
    `create-review-brief.mjs`, `reconcile-ledger.mjs`, and
    `validate-artifact.mjs`; `SKILL.md:158` tells the agent to write
    `manifest.execution` by hand). `p01-t02` makes the validator _accept_ v2 and
    `p03-t01` replaces the same-target rules, but no step says the authored
    manifest must declare version 2 with the per-wave fields. Because every test
    builds fixtures directly, a shipped state where the validator accepts v2 and
    the controller keeps writing v1 would be fully green and completely inert.
  - Fix: add a step to `p03-t01` requiring `SKILL.md`'s manifest-preparation
    step (currently Step 4, `SKILL.md:125-171`) to name `schemaVersion: 2` and
    the per-wave `target`/`taskClass`/`classFloor`/`selectionReason`/`conditions`
    fields, and add a `skill-contract.test.mjs` assertion for the version
    literal.

- **The ten wave modes and the seven worker modes are distinct vocabularies the plan never distinguishes** (`.agents/skills/recon/scripts/lib/contracts.mjs:44-55`, `.agents/agents/recon-worker.md:11-13`, `.agents/skills/recon/references/worker-contract.md:23-40`)
  - Issue: `contracts.mjs:44-55` defines ten manifest wave modes (`map`,
    `gather`, `compile`, `semantic-verification`, `adversarial`, `coverage`,
    `reconciliation`, `redundant-gather`, `redundant-verification`,
    `contradiction-resolution`) while the worker role and worker contract define
    a deliberately different seven-mode assignment vocabulary (`map`, `gather`,
    `compile`, `verify`, `adversary`, `coverage`, `reconcile`) closed with "No
    other mode is valid". `p02-t01` item 1 requires defaults "for all ten wave
    modes" and `design.md:77-88` tabulates ten modes with worker-style
    assignment descriptions, while `p03-t01` edits both `worker-contract.md` and
    `.agents/agents/recon-worker.md` (`plan.md:331,334`). Nothing states the two
    vocabularies are separate, so a plausible implementation either widens the
    worker role to ten modes (breaking a closed contract that is not in this
    project's scope) or emits an invalid worker mode from the new preview.
  - Fix: add one sentence to `p03-t01` (or the Common Execution Rules) stating
    that the ten manifest wave modes map onto the seven worker assignment modes
    (`redundant-gather`→`gather`, `semantic-verification`/
    `redundant-verification`→`verify`, `adversarial`→`adversary`,
    `reconciliation`/`contradiction-resolution`→`reconcile`), and that the
    worker vocabulary is not to be widened by this project.

- **`p04-t02`'s Turbo instruction contradicts the repository's documented evidence-grade command** (`.oat/projects/shared/recon-rework/plan.md:502-505`, `AGENTS.md:71-79`)
  - Issue: `plan.md:502-505` says "use `pnpm exec turbo run test --force` with
    isolated test-home behavior supplied by fixtures/test harness, never
    repurpose the shell HOME variable. If a test resolves maintainer templates,
    inject a temporary home through that test's supported API". `AGENTS.md:73`
    documents the opposite command — `HOME=$(mktemp -d) pnpm exec turbo run test
--force` — and explains at `AGENTS.md:81-88` exactly why: the bundle-tier
    template resolution order means tests that do not inject `home` resolve
    against the maintainer's real `~/.oat/templates/` and fail locally while
    passing in CI. A per-command `HOME=` prefix does not mutate the session's
    HOME. As written, the plan bans the documented remedy and points the
    implementer at editing unrelated existing tests, which is out of scope for
    every task in this plan.
  - Fix: replace those two sentences with the `AGENTS.md` command
    (`HOME=$(mktemp -d) pnpm exec turbo run test --force`), noting it is a
    per-invocation environment override rather than a change to the session or
    to any global install, and drop the instruction to add home injection to
    tests this project does not own.

- **The generated, tracked `apps/oat-docs/index.md` is not in any task's write set** (`.oat/projects/shared/recon-rework/plan.md:384-386,406-409`, `apps/oat-docs/AGENTS.md:47`)
  - Issue: `p03-t02` owns `apps/oat-docs/docs/workflows/skills/recon.md` and
    conditionally `docs/workflows/skills/index.md`, but not the repo-root
    `apps/oat-docs/index.md`, which is tracked (`git ls-files` confirms) and
    regenerated on every docs build — `apps/oat-docs/package.json`'s `prebuild`
    runs `docs generate-index`, and `apps/oat-docs/index.md:80` embeds the recon
    page's frontmatter `description` verbatim. If `p03-t02` changes the page's
    title, description, or the skills `## Contents` entry, `pnpm build:docs`
    (gate 8 in `p04-t02`) rewrites that tracked file, producing an unowned
    modification after the `p03-t02` commit — which `p04-t02` explicitly forbids
    absorbing into bookkeeping (`plan.md:483-484`).
  - Fix: add `apps/oat-docs/index.md` to `p03-t02`'s **Files** as "Generated if
    the page's title/description or the skills `## Contents` entry changes;
    regenerate with `pnpm --filter oat-docs exec ...`/`pnpm -w run cli:source --
docs generate-index --docs-dir apps/oat-docs/docs --output
apps/oat-docs/index.md` and stage it in the same commit; never hand-edit".

### Minor

- **Canonical `## Planning Checklist` is replaced by prose and its unresolved items are untracked** (`.oat/projects/shared/recon-rework/plan.md:39-49`, `.oat/templates/plan.md:31-38`)
  - Issue: the canonical template carries four checkboxes (confirm HiLL
    checkpoints, set `oat_plan_hill_phases`, evaluate parallelism, set
    `oat_plan_parallel_groups`). The plan replaces them with a prose `##
Planning Status`. Two of the four are genuinely resolved
    (`oat_plan_parallel_groups: []` with the `## Parallelism` rationale at
    `plan.md:63-73`), but `oat_plan_hill_phases` is absent from frontmatter and
    only mentioned in `handoff.md:127-128`. The absence is defensible and
    verified harmless — no code consumer reads the key (only
    `.agents/skills/oat-project-quick-start/SKILL.md:1117` mentions it) and `[]`
    really would mean every phase per `.oat/templates/plan.md:8` — but the
    receiving agent has no checkbox telling it to decide.
  - Suggestion: restore the four-item `## Planning Checklist` with the two
    resolved items checked and the two deferred items unchecked, keeping the
    `## Planning Status` prose beneath it.

- **A cited anchor in the in-scope source map no longer resolves** (`.oat/projects/shared/recon-rework/references/source-context.md:61`)
  - Issue: the row cites `packages/cli/src/validation/skills.test.ts:6187-6319,
:8218-8234` for "CLI prose pins". At the stated baseline
    `bb93ad233befc75d0da9bd699ffc57db80dfe393` both resolve exactly (6187 =
    `loads generic guidance and exactly one active-provider mechanics
reference`; 8218 = `describe('recon canonical contracts')`). At this head
    the file has grown 9643 → 10684 lines across nine commits and those blocks
    are now at **6326** and **8390-8407** respectively; line 8218 today lands in
    an unrelated lite-promotion test. Every other anchor in the table was
    re-verified and still resolves (`contracts.mjs:44-62`, `:223-397`,
    `:1936-1968`; `validate-packet.mjs:682-790`, `:793-846`, `:1922-1942`,
    `:2050-2085`; `render-packet.mjs:255-360`; `SKILL.md:114-171`;
    `profiles.md:8-58`; `oat-dispatch-subagents/SKILL.md:413-432`;
    `bundle-consistency.test.ts:458`). The file itself says anchors "must be
    re-anchored if the implementation base changes"
    (`source-context.md:5-6`), so this is the declared refresh coming due.
  - Suggestion: update that one row to `:6326-6420` and `:8390-8407`, and
    re-stamp the header's inspection commit to the implementation base.

- **`p03-t01`'s "including tools/smoke" pin sweep points at nothing; the real `tools/smoke` coupling is unverified** (`.oat/projects/shared/recon-rework/plan.md:355-357,367-371`)
  - Issue: no `tools/smoke` file pins a recon, `subagent-orchestration`, or
    `recon-worker` version — the only two `1.1.1` pins in the repository are
    `packages/cli/src/validation/skills.test.ts:8398` and
    `.agents/skills/recon/tests/skill-contract.test.mjs:26`, both already in
    `p03-t01`'s file list, and `subagent-orchestration` (1.0.3) and
    `recon-worker` (1.0.0) have no numeric pin outside a synthetic fixture in
    `install-research.test.ts:39`. The real coupling is different:
    `tools/smoke/skill-version/reader-sameness.test.mjs:26` requires
    `.agents/skills/recon/tests/skill-contract.test.mjs`'s local
    `readSkillVersion` helper to stay byte-identical with two other copies —
    and `p03-t01` edits that file while its **Verify** block runs neither
    `pnpm test:smoke` nor that test.
  - Suggestion: replace "Sweep existing version pins, including tools/smoke"
    with the two exact pin sites, and add `node --test
tools/smoke/skill-version/reader-sameness.test.mjs` to `p03-t01`'s Verify so
    an accidental edit to the shared helper fails in the task that caused it
    rather than four tasks later at gate 3.

- **`p03-t01` bundles the shared-guidance edit with the controller rewrite in one commit** (`.oat/projects/shared/recon-rework/plan.md:325-376`)
  - Issue: one atomic commit carries four recon prose files, two
    `subagent-orchestration` files, the canonical role, two pin files, and two
    skill version bumps. It is genuinely coupled (`skills.test.ts` pins prose in
    both skills, so the pin file must move with them), so this is not wrong —
    but it is the plan's largest blast radius on the repository's most
    heavily-pinned shared file, and a later revert cannot separate the narrow
    classification clarification from the recon controller rewrite.
  - Suggestion: consider splitting the `subagent-orchestration` clarification
    (plus only its pins) into `p03-t01a`, keeping the recon controller/role
    rewrite in `p03-t01b`; if kept as one task, say explicitly in the task body
    why the coupling is required so a reviewer does not read it as scope drift.

## Spec/Design Alignment

**Evidence sources used (quick mode):** `discovery.md` (required upstream, read
in full), `plan.md` (artifact under review), `design.md` (lightweight design,
optional in quick mode — reviewed as an upstream contract),
`references/source-context.md`, `handoff.md`, `state.md`, `implementation.md`,
and `.oat/repo/pjm/backlog/items/BL-260908-restore-recon-s-cheap-fan-out.md`
(issue #274). `spec.md` is absent by design and is not a finding.

### Requirements Coverage

| Requirement                                                                                               | Status                 | Notes                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 — intent statement opens the skill; responsibility split among the four parties                       | partial                | `p03-t01`:1 covers the intent opening; the four-party split exists only in `design.md:39-46` with no task step (Medium)                                                      |
| AC2 — per-wave independent class floor, no run-wide maximum, cheapest qualified default, mechanical synth | implemented            | `p02-t01`:1 (ten-mode defaults), `p03-t01`:1-2 (removes `SKILL.md:117-122` run-wide maximum and `profiles.md:6,54`), `p01-t02`:3 (per-wave override in the schema)           |
| AC3 — per-wave escalation on a named trigger inside one fingerprinted envelope; model/effort separate     | implemented            | `p01-t02`:3, `p02-t01`:2-5, `p02-t02`:1,6; `ExactTarget` keeps `model`/`effort`/`reasoningMode`/`serviceTier` independent (`design.md:234-242`)                              |
| AC4 — guarantee is approved per-wave selection; no self-attested launch provenance                        | implemented            | `p02-t01`:4, `p02-t03`:7, `p03-t02`:3; DR-260904 receipt boundary preserved by `p01-t01`:3                                                                                   |
| AC5 — packet contract gains per-wave `classFloor`/`target` + version bump + v1 normalization              | implemented            | `p01-t02` (contract doc, `contracts.mjs`, fixtures), `p03-t01` (`skill-contract.test.mjs` pins), `p03-t02` (docs), `p04-t01` (bundled mirror)                                |
| AC5 — `contracts.mjs` validates **below-floor routing**                                                   | declined               | Deliberately refused at `design.md:302-305`; defensible but unrecorded as a deviation (Important)                                                                            |
| AC5 — `contracts.mjs` validates target drift and unapproved escalation                                    | implemented            | `p02-t01`:4 (approved-target check), `p02-t02`:1,6 (topology, single activation, fingerprint coverage)                                                                       |
| AC6 — `quick` profile documented as an evidence packet for an intelligent consumer                        | missing                | No task step; `p03-t01`:6 only preserves the assurance ceiling (Important)                                                                                                   |
| D1 — economical default policy for all ten modes in `routing.mjs`; narrow shared-guidance clarification   | implemented            | `p02-t01`:1, `p03-t01`:2-3,7; the ten modes match `contracts.mjs:44-55` exactly                                                                                              |
| D2 — `prepare-routing.mjs` preview + check mode; no approval write, no launch                             | implemented            | `p02-t01`:2-6, including subprocess CLI tests and nonzero exits                                                                                                              |
| D3 — manifest-only v2, evidence kinds stay v1, fail-closed on unknown combinations, original-bytes first  | implemented            | `p01-t02`:1-7; blast radius verified small — `SCHEMA_VERSION` is referenced only in `contracts.mjs:1,1953-1957` and `packet-validation.test.mjs:686`, both owned by the task |
| D3 — v1 evidence producers keep their contract; audit their consumers                                     | implemented            | `p02-t03` (mixed-version controls); verified `create-review-brief.mjs` reads only `manifest.sources/run/request`, never `execution`, so no producer change is needed         |
| D3 — new writers emit `schemaVersion: 2`                                                                  | missing                | The only writer is the controller skill; no task step names the version (Medium)                                                                                             |
| D4 — predeclared conditional waves, forward-only DAG, single activation, caps, no accepted-failure retry  | implemented            | `p02-t02`:1,5; `p01-t02`:3 carries `conditions` into the versioned shape                                                                                                     |
| D5 — condition dispositions outside immutable approval; required passes and assurance unchanged           | implemented            | `p02-t02`:2-4,6; the legacy skip at `validate-packet.mjs:775` is preserved for v1 by the "valid old conditional omission fixture" control                                    |
| D6 — supersede DR-260831, amend DR-260904, cite the DR-260719 pair; skill/role/package version policy     | implemented            | `p01-t01`:2-5, `p03-t01`:8, `p04-t01`:1,5; all five decision records and both pin sites verified present                                                                     |
| D7 — closed v2 field sets, whole-target replacement, explicit nullable effort, `classFloor` enum only     | implemented            | `p01-t02`:3,5,6; `p02-t01`:4-5 (no normalization of opaque selectors)                                                                                                        |
| D8 — API/error handling: distinct diagnostic categories; no validation-bypass option at publication       | implemented (implicit) | `p02-t01`:3 and `p02-t02` describe the behaviors; no task enumerates the new diagnostic codes as a named deliverable, though both tasks own `references/packet-contract.md`  |
| D9 — testing strategy: exhaustive modes, v1/v2 controls, guard neutralization, honest fixture labelling   | implemented            | `p01-t02`/`p02-t01`/`p02-t02`/`p02-t03` control lists plus `plan.md:95-99` and `p04-t02`                                                                                     |
| Repo DoD — the eight CI gates in CI order, plus lint/format for skills                                    | implemented            | `plan.md:491-500` matches `AGENTS.md:47-54` exactly, including the origin/main refresh note and the skills lint/format rule at `AGENTS.md:100-101`                           |

### Extra Work (not in declared requirements)

None. Every task maps to at least one acceptance criterion or design decision.
Three scope guards were checked and hold: `p03-t01`:7 forbids rewriting the
dispatch engine (correct — `oat-dispatch-subagents/SKILL.md:413-432` already
separates unlike wave targets, so no change is needed);
`p04-t01`'s "pack manifests only if the existing directory-copy contract does
not include the new script" is correctly conditional (`pack-manifest.ts:330`
declares `skill('recon')` as a whole-skill entry, so new scripts ship
automatically); and `p04-t01`'s "Generated if changed: ... configured provider
views" correctly owns `.codex/agents/recon-worker.toml`, the one materialized
(non-symlink) provider copy of the role that `p03-t01` edits.

### Premise verification performed

Every path, script, command, and symbol named in `plan.md` was re-anchored at
`f0e0f190bebaa982214c7bf71d5f988212812caa`. All 37 cited paths exist. All 18
cited pnpm scripts exist in `package.json` / `apps/oat-docs/package.json`. The
`cli` vs `cli:source` distinction at `plan.md:78-80` is accurate (`cli` runs
`bundle-assets.sh` first). The `oxfmt --write` derivation at `plan.md:82-83` is
accurate against `format:fix` → `format:root:fix`. Formatting the project
tracking files is a verified no-op at this state (probe under `mktemp -d`: no
diff on `state.md` or `plan.md`). `oat decision new` and `oat decision
regenerate-index` both exist. The pre-commit hook runs only `lint-staged` plus a
non-blocking `oat status --hook`, so the nine-commit sequence is not blocked by
the PR-scoped skill-bump gate. The one anchor that no longer resolves is in
`source-context.md`, not in `plan.md` (see Minor).

## Verification Commands

Commands run for this review (read-only; the only write was this artifact):

```bash
git -C /Users/tstang/orca/workspaces/open-agent-toolkit/recon-rework rev-parse HEAD                       # 0 -> f0e0f190be...
git -C <worktree> diff --name-only bb93ad233befc75d0da9bd699ffc57db80dfe393 HEAD                          # 0 -> recon/orchestration sources unchanged since baseline
pnpm run --silent cli:source -- project status                                                            # 0 -> "Quick plan is not implementation-ready"; routes to oat-project-quick-start
pnpm run --silent cli:source -- pjm doctor --json                                                         # 1 -> status "warn" (inherited completed-ledger warnings; see Important #3)
pnpm run --silent cli:source -- decision --help                                                           # 0 -> new / regenerate-index / migrate / init all present
T=$(mktemp -d); cp .oat/projects/shared/recon-rework/{state,plan}.md "$T"; pnpm exec oxfmt --write "$T"/*.md; diff ...   # 0 -> no diff (formatting is a no-op)
```

Commands the receiving agent can run to confirm the findings:

```bash
grep -rn "1\.1\.1" packages/cli/src/validation/skills.test.ts .agents/skills/recon/tests/skill-contract.test.mjs
grep -n "recon canonical contracts" packages/cli/src/validation/skills.test.ts    # 8390, not 8218
grep -rn "schemaVersion: *[0-9]\|SCHEMA_VERSION" .agents/skills/recon/scripts
sed -n '23,40p' .agents/skills/recon/references/worker-contract.md                # seven worker modes
sed -n '44,55p' .agents/skills/recon/scripts/lib/contracts.mjs                    # ten wave modes
git ls-files --error-unmatch apps/oat-docs/index.md && sed -n '80p' apps/oat-docs/index.md
sed -n '71,79p' AGENTS.md                                                         # HOME=$(mktemp -d) turbo run test --force
```

## Recommended Next Step

Run the `oat-project-review-receive` skill in the `recon-rework` worktree to
convert these findings into plan tasks. The three Important findings are all
plan-text corrections (add a recorded deferral for AC5's below-floor clause, add
the AC6 documentation step, and give `p01-t01` real commands and a pass
condition); none requires reopening discovery or changing the product boundary,
so they can be received as plan revisions rather than escalated to Thomas.
