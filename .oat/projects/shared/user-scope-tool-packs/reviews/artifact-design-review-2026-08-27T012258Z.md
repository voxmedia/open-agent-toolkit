---
oat_generated: true
oat_generated_at: 2026-08-27T01:22:58Z
oat_review_scope: design
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/user-scope-tool-packs
oat_gate_run_id: 7f84614a-bfa9-475d-9247-48f06f0c9456
oat_gate_target: claude-fable-skip-permissions
oat_gate_runtime: claude
oat_invocation_model: fable
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: design

**Reviewed:** 2026-08-27T01:22:58Z
**Scope:** `design.md` for `user-scope-tool-packs` (spec-driven mode; upstream
`spec.md` and `discovery.md` read for alignment)
**Files reviewed:** 2 artifacts (`design.md`, `spec.md`) plus `discovery.md`,
`plan.md`, `state.md`, and the CLI sources the design names
**Commits:** n/a (artifact review)

**Dispatch:** gate route `inline` (runtime=claude,
cliRoot=/Users/tstang/orca/workspaces/open-agent-toolkit/oat-plugin);
reviewer resolver returned `unresolvedReason: policy` with a complete ladder,
so `selection_reason: inherit (pre-plan; no project policy)` applies.
`runtimeIdentity` not-reported.

## Summary

The design is architecturally coherent and maps every spec requirement to a
component, a data flow, and a test scenario; the manifest → scoped intent →
inventory → reconcile plan decomposition is the right shape and matches the
existing code seams (`skill-manifest.ts`, `scan-tools.ts`,
`project-tools-config.ts`, `auto-sync.ts`, `fs/paths.ts`). Verification
against the codebase surfaced four Important contract gaps that would cause
implementation to diverge or regress compatibility if carried into the plan
as written: the "explicit `false` is authoritative" intent rule collides with
the derived all-eight-packs booleans the current reconciler writes; the
manifest schema cannot express the per-scope template ownership policy the
design itself requires; the core pack's `~/.oat/docs` tree has no asset kind;
and shared scripts referenced repo-relatively by docs-pack skills have no
user-scope resolution rule. The remaining findings are bounded clarifications.

Findings: 0 critical, 4 important, 7 medium, 4 minor

## Findings

### Critical

None

### Important

- **Legacy derived `tools.<pack>: false` is treated as an authoritative opt-out**
  (`design.md:229-234`)
  - Issue: The design states "An explicit `false` is authoritative and is never
    overridden by inference." Today's reconciler writes _all eight_ packs as
    `true`/`false` whenever any pack is present at project scope
    (`packages/cli/src/commands/tools/shared/project-tools-config.ts:46-64`),
    so every existing repo config contains derived `false` entries that never
    expressed a user decision (`core: false` always; any pack installed only
    at user scope; packs placed by an older CLI, a teammate's branch, or a
    manual copy without a reconcile). Under the new rule those entries
    suppress `inferred-legacy` discovery, so `has`, `outdated`, `update
--all`, and inventory would report such packs absent while their files
    exist. This conflicts with FR9 ("legacy installs remain discoverable")
    and NFR3, and the same boolean shape gives the new store no way to tell a
    deliberate `tools remove` from the derived value.
  - Fix: Do not overload the legacy boolean. Simplest consistent contract:
    the intent store writes `true` on install/adoption and _deletes the key_
    on removal (absent = no intent); any `false` encountered is treated as
    legacy-derived and equivalent to absent, so physical assets still yield
    `source: 'inferred-legacy'` (with a `legacy-false-conflict` diagnostic).
    No spec requirement calls for a persistent pack-level opt-out (FR3 AC 4
    explicitly rejects member exclusions), so authoritative-false is
    unnecessary scope. If a durable opt-out is wanted later, gate it on a
    provenance marker (e.g. `toolsIntentVersion`) rather than the bare
    boolean. Update the "Legacy adoption" bullets and the Risks entry
    accordingly.
  - Requirement: FR3, FR9, NFR3

- **`PackAssetDefinition.ownership` is per-asset, but the template policy is per-scope**
  (`design.md:144-162`, `design.md:332-342`)
  - Issue: The interface declares one `ownership: 'managed' |
'seed-if-missing'` per asset, yet the reconcile section requires
    templates to be managed defaults at user scope and a seed-only override
    surface at project scope ("update/removal never overwrites or deletes an
    existing repository override"). The schema cannot express this, and the
    downstream consequences are left implicit: (a) completeness rule
    (`design.md:278-279`) — do project-scope templates count toward
    `partial`? (b) FR2 removal ("only assets declared managed at the selected
    scope") and FR8 migration source removal — are project templates left
    behind, and is the user told? (c) NFR3 — today `tools update` force
    refreshes project templates/scripts on every run
    (`packages/cli/src/commands/tools/update/update-tools.ts:236-247`), so
    this is a deliberate behavior change that needs an explicit carve-out and
    a user-facing diagnostic, not just a risk entry.
  - Fix: Make ownership scope-keyed (e.g. `ownership: Partial<Record<ConcreteScope, PackAssetOwnership>>` with a default) or emit
    separate asset entries per scope. Then state explicitly: project-scope
    templates are `seed-if-missing` (never make a pack partial; excluded from
    update, removal, and migration source removal; reported as "repository
    override retained"), and add byte-identical-to-bundled detection so a
    pristine copy can be safely refreshed or removed. Record the `tools
update` behavior change under NFR3 with its rationale.
  - Requirement: FR2, FR7, FR8, NFR3

- **Core pack `~/.oat/docs` directory has no representable asset kind**
  (`design.md:144`, `design.md:478-480`)
  - Issue: `PackAssetKind` is `'skill' | 'agent' | 'template' | 'script' |
'seed'`. The core installer copies the whole bundled `docs/` tree to
    `~/.oat/docs` (`packages/cli/src/commands/init/tools/core/install-core.ts:100-110`),
    `tools update` force-refreshes it
    (`packages/cli/src/commands/tools/update/index.ts:156-170`), and the
    `oat-docs` skill hard-depends on it
    (`.agents/skills/oat-docs/SKILL.md:13-17`). The design's own invariant
    "every pack-owned bundled asset is represented, enforced by consistency
    tests" would either fail for core or silently drop the docs tree out of
    inventory/update/remove — the exact "installed but invisible to
    lifecycle" failure discovery flagged as high-likelihood/high-impact.
  - Fix: Add a directory-valued kind (e.g. `'directory'`) with
    non-versioned content comparison (see Medium finding on comparison
    contract), declare it under `core` at user scope as `managed`, and cover
    it in the manifest ↔ bundle consistency test.
  - Requirement: FR2, FR4, FR5

- **No user-scope resolution rule for shared scripts referenced by skills**
  (`design.md:453-462`)
  - Issue: "Skill-Local Resource Resolution" covers skill-private
    `references/`, and says shared templates/scripts "remain independently
    declared manifest assets" — but four docs-pack skills hardcode the
    repo-relative path `TRACKING_SCRIPT=".oat/scripts/resolve-tracking.sh"`
    (`.agents/skills/oat-docs-analyze/SKILL.md:114`,
    `.agents/skills/oat-docs-apply/SKILL.md:304`,
    `.agents/skills/oat-agent-instructions-analyze/SKILL.md:82`,
    `.agents/skills/oat-agent-instructions-apply/SKILL.md:159`). At user
    scope the script lands in `~/.oat/scripts/`, so a user-scope docs pack is
    installed but not operable unless the repo also carries the script. The
    existing fallback pattern in
    `.agents/skills/oat-cursor-cloud-projects/SKILL.md:187-206` shows the
    intended shape but the design does not adopt it.
  - Fix: Either (preferred, consistent with the design's own principle) move
    `resolve-tracking.sh` into each consuming skill's `scripts/` directory so
    it is skill-local, or define a shared-asset lookup rule (repo
    `.oat/scripts/<file>` → `~/.oat/scripts/<file>`) and require it in every
    skill that references `.oat/scripts` or `.oat/templates`. Add a bundle
    contract test that fails on bare repo-relative `.oat/scripts` references.
  - Requirement: FR1, FR2

### Medium

- **"Existing copy comparison contract" for non-versioned assets does not exist**
  (`design.md:280-282`)
  - Issue: Inventory status for templates, scripts, and directories is
    described as "presence plus the existing copy comparison contract where
    available". `copyFileWithStatus`/`copyDirWithStatus`
    (`packages/cli/src/commands/init/tools/shared/copy-helpers.ts:44-79`)
    compare nothing — they skip unless `force`, and `force` is rm+copy — so
    `current`/`outdated` cannot be computed for these kinds and NFR2's "second
    install/update reports no changes" cannot hold (update marks every
    template `refreshed` each run).
  - Fix: Specify content-hash (or byte) comparison for non-versioned assets in
    `PackAssetInventory` and make apply skip identical content.

- **PJM adoption marker and existing `backlog init`/`decision` init paths are unspecified**
  (`design.md:411-419`)
  - Issue: "inspect the canonical PJM adoption markers" does not name a
    marker. Today `oat backlog new` silently scaffolds via `initializeBacklog`
    (`packages/cli/src/commands/backlog/new.ts:246`), and `oat backlog init`
    is a separate command (`packages/cli/src/commands/backlog/index.ts:115-131`).
    The design says only `oat pjm init` may scaffold from uninitialized
    state, which contradicts those commands unless reconciled.
  - Fix: Name the marker(s) (e.g. `.oat/repo/AGENTS.md` and
    `.oat/repo/pjm/AGENTS.md`, cf. `CANONICAL_REPO_REFERENCE_PATHS` in
    `packages/cli/src/commands/pjm/init.ts:55-59`), define partial-init
    handling, and state whether `backlog init`/decision init count as explicit
    adoption actions or are gated behind `pjm init`.
  - Requirement: FR6

- **`oat tools has --pack` exit semantics change without a compatibility note**
  (`design.md:283-284`)
  - Issue: Current `has` succeeds when any member is present
    (`packages/cli/src/commands/tools/has/has-pack.ts:56-58`) and is consumed
    by `oat-project-document` and docs
    (`apps/oat-docs/docs/workflows/projects/lifecycle.md:21`,
    `apps/oat-docs/docs/reference/troubleshooting.md:115-121`). The design
    makes success complete-only, which is right, but NFR3 requires the change
    be called out and consumers updated.
  - Fix: Document the semantic change, add `completeness`/`missing` to the JSON
    result, and list the skill/doc consumers to update in Phase 5.
  - Requirement: FR4, NFR3

- **Symlinked managed roots under `$HOME` and not-yet-existing destinations**
  (`design.md:327-330`, `design.md:521`)
  - Issue: `validateRealPathWithinScope` (`packages/cli/src/fs/paths.ts:66-92`)
    requires the path to exist and its real path to sit under the scope root.
    With the user scope root being `$HOME`, dotfiles-managed `~/.agents` or
    `~/.oat` symlinked outside home would be refused for every user-scope
    operation, and fresh-install destinations fail `realpath`. The design's
    "never follow a managed-path symlink outside the selected scope root"
    needs a concrete policy rather than reuse of the helper as-is.
  - Fix: Validate against the real path of the managed root (`~/.agents`,
    `~/.oat`) resolved once, validate the nearest existing ancestor for new
    destinations, and emit a diagnostic with a recovery action when refused.
  - Requirement: NFR1

- **AGENTS.md guidance lifecycle vs. migration/removal is unspecified**
  (`design.md:367-368`)
  - Issue: Project-scope PJM install upserts AGENTS.md sections describing
    repository adoption (`packages/cli/src/commands/init/tools/project-management/index.ts:111-122`,
    body at `agents-guidance.ts:3-13`). The design ties guidance updates to
    project-scope intent changes; migrating PJM to user scope clears that
    intent, but the guidance remains valid for an adopted repo. Whether
    migration/removal strips, keeps, or flags these sections is not stated.
  - Fix: Own guidance sections by repository adoption (`oat pjm init` /
    explicit repo setup), never by pack placement; migration and removal
    leave them untouched and say so.
  - Requirement: FR6, FR8

- **Provider sync after removal has no defined mechanism**
  (`design.md:110`, `design.md:373-374`)
  - Issue: The only sync filter is `--install-canonical`
    (`packages/cli/src/commands/sync/index.ts:98-116`); there is no removal
    filter, and the design does not state whether an unfiltered sync prunes
    provider views of deleted canonical items or only reports strays.
  - Fix: Specify the removal sync path (unfiltered `oat sync --scope <scope>`
    with confirmed pruning behavior, or a new `--remove-canonical` filter) and
    cover it in the FR5 sync-parity test.
  - Requirement: FR5

- **Default `--scope all` outside a Git repository is undefined**
  (`design.md:86`, `design.md:364-366`)
  - Issue: `update`/`remove` default to `--scope all`
    (`packages/cli/src/commands/shared/scope-option.ts:24-31`) and today call
    `resolveProjectRoot` unconditionally
    (`packages/cli/src/commands/tools/update/index.ts:175`). The design fixes
    user-only operations but does not say whether `all` outside a repo skips
    project scope with a diagnostic or errors.
  - Fix: State that project scope is skipped with a structured diagnostic when
    no repository resolves, and that project scope root means the Git
    toplevel (not `cwd`, which is what `resolveScopeRoot` returns today at
    `packages/cli/src/fs/paths.ts:28-38`).
  - Requirement: FR5, NFR4

### Minor

- **`oat remove skills` keeps an independent pack authority**
  (`design.md:349-356`, `design.md:186-187`)
  - Issue: `packages/cli/src/commands/remove/skills/remove-skills.ts:26-28`
    defines its own five-pack `PackName` subset; it is not among the affected
    surfaces, so the "tests prohibit independent authoritative arrays" rule
    would miss it.
  - Suggestion: Add it to affected surfaces and derive its list from the
    manifest.

- **Seed assets are listed generically**
  (`design.md:172-174`)
  - Issue: Workflows at project scope also seed `.oat/projects-root`,
    `config.projects.root`, and projects `.gitkeep` files
    (`packages/cli/src/commands/init/tools/workflows/install-workflows.ts:147-186`);
    ideas seeds `.oat/ideas/*.md`
    (`packages/cli/src/commands/init/tools/ideas/install-ideas.ts:11-14`).
  - Suggestion: Enumerate the seed set per pack so the manifest consistency
    test has a concrete target.

- **`config.local.json` is not mentioned in the intent read rule**
  (`design.md:222-225`)
  - Suggestion: State that scope-specific intent reads consult only
    `.oat/config.json` (not the local overlay).

- **User config schema needs a `tools` key**
  (`design.md:218-222`)
  - Issue: `UserConfig` and `USER_CONFIG_OWNED_KEYS`
    (`packages/cli/src/config/oat-config.ts:918-924`, `1400-1406`) have no
    `tools`; unknown keys are preserved on write but not parsed, so "the
    existing boolean shape remains compatible" is true for project config
    only.
  - Suggestion: Note the `UserConfig` normalizer/owned-key extension and the
    interaction with `user-sync-config.ts`'s legacy rewrite of the same file.

## Requirements/Design Alignment

**Evidence sources used:** `spec.md`, `design.md`, `discovery.md`, `plan.md`
(template state), `state.md`; CLI sources under `packages/cli/src/commands/tools`,
`commands/init/tools`, `commands/pjm`, `commands/backlog`, `commands/sync`,
`config/oat-config.ts`, `fs/paths.ts`, `providers/*/paths.ts`; skills under
`.agents/skills/oat-pjm-*`, `oat-docs*`, `oat-agent-instructions-*`.

### Requirements Coverage

| Requirement | Status  | Notes                                                                                                   |
| ----------- | ------- | ------------------------------------------------------------------------------------------------------- |
| FR1         | partial | Scope model and defaults covered; user-scope operability of docs pack blocked by shared-script gap (I4) |
| FR2         | partial | Asset kinds miss core docs tree (I3); per-scope template ownership unexpressed (I2)                     |
| FR3         | partial | Intent model sound; legacy `false` rule conflicts with derived config (I1)                              |
| FR4         | covered | Inventory model complete; `has` semantic change needs compat note (M3)                                  |
| FR5         | partial | Shared planner covered; removal sync path and `--scope all` outside Git undefined (M6, M7)              |
| FR6         | partial | Guard contract present; adoption marker and existing init commands unspecified (M2)                     |
| FR7         | covered | Repo → user → bundle precedence and shared resolver defined                                             |
| FR8         | covered | Ordering, confirmation, and failure boundaries defined; template disposition depends on I2              |
| FR9         | partial | Read-only inference covered; legacy `false` handling (I1)                                               |
| FR10        | covered | Phase 5 and docs/help scenarios mapped                                                                  |
| NFR1        | covered | Path/symlink policy needs the concrete rule in M4                                                       |
| NFR2        | partial | Pure planning covered; non-versioned comparison contract missing (M1)                                   |
| NFR3        | partial | Compat preserved except template refresh and `has` changes that need explicit carve-outs (I2, M3)       |
| NFR4        | covered | Typed `CliError`, structured JSON result                                                                |
| NFR5        | covered | Canonical-path inspection only                                                                          |

### Extra Work (not in declared requirements)

None. The `oat tools migrate` command is the direct realization of FR8.

## Verification Commands

Run these after the design fix pass to confirm the artifact addresses the
findings and stays well-formed:

```bash
grep -n "inferred-legacy\|legacy-false\|deletes the key\|authoritative" .oat/projects/shared/user-scope-tool-packs/design.md
grep -n "ownership" .oat/projects/shared/user-scope-tool-packs/design.md
grep -n "directory\|\.oat/docs" .oat/projects/shared/user-scope-tool-packs/design.md
grep -n "resolve-tracking\|\.oat/scripts" .oat/projects/shared/user-scope-tool-packs/design.md
pnpm exec oxfmt --check .oat/projects/shared/user-scope-tool-packs/design.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into the
bounded design fix pass, then mark design complete and continue to
`oat-project-plan`.
