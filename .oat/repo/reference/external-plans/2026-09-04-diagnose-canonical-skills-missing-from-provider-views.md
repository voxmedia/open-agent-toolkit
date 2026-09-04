---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/triage/2026-09-04-post-merge-cleanup.md
  - .oat/repo/pjm/backlog/items/BL-260904-diagnose-canonical-skills.md
oat_external_plan_commit: 6b9a15841dab949ed83fa174286396e063da721d
oat_external_plan_date: '2026-09-04'
oat_execution_status: READY
oat_backlog_items:
  - BL-260904-diagnose-canonical-skills
oat_issue_url: https://github.com/voxmedia/open-agent-toolkit/issues/203
created: '2026-09-04T06:20:00Z'
---

# Diagnose canonical skills missing from a provider view at resolution time

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency. Host the
> diagnostic in `oat tools info <name>`, the only name-addressable
> resolution seam, and keep `oat status` untouched: that module is owned by
> the W4 restamp and W6 provider-reachability lanes. Runs after the
> reachability lane because both edit `info-tool.ts`.

## Outcome

`oat tools info <name>` gains a provider-view section per active provider
and scope: the provider path, a drift class that distinguishes
`missing-additive` (never synced), `removed` (tracked, file gone), and
`modified` (content diverged), the canonical version and the view's version
where a copy exists, and the narrowest safe repair, one `oat sync --scope
<concrete>` suggestion per affected scope and never `--scope all`. An unknown
name keeps today's "not found" wording, so missing distribution is never
confused with an unknown skill. The command stays read-only, and a post-sync
integration check proves the view converges to the canonical version.

## Source and live evidence

- Source backlog item:
  [BL-260904-diagnose-canonical-skills — Diagnose canonical skills missing from a provider view at resolution time](../../pjm/backlog/items/BL-260904-diagnose-canonical-skills.md)
- Source issue: [#203](https://github.com/voxmedia/open-agent-toolkit/issues/203)
- Planned at: `origin/main` commit `6b9a15841dab949ed83fa174286396e063da721d` on `2026-09-04`.
- Verified evidence:
  - `packages/cli/src/drift/drift.types.ts:1-12` — `DriftReport` is
    `{ canonical, provider, providerPath, state }` with
    `in_sync | drifted(modified|broken|replaced) | missing | stray`; no skill
    name and no version.
  - `packages/cli/src/drift/detector.ts:26-129` — `detectDrift` is the
    reusable per-entry primitive (`missing` on ENOENT at `:63`, symlink
    classes at `:68-101`, hash compare and transform re-derivation at
    `:106-124`).
  - `packages/cli/src/commands/status/index.ts:1058-1085` — canonical entries
    with no manifest entry already render as `missing`, indistinguishable from
    a tracked entry whose provider file was deleted.
  - `status/index.ts:136,1274` — the only remediation string is
    `Run "oat init" to adopt stray entries.`; status never suggests
    `oat sync --scope`.
  - `status/index.ts:257-261,405-430` — `providerRefreshAdvice` is catalog
    refresh policy, not per-skill drift.
  - `packages/cli/src/commands/tools/info/info-tool.ts:104-155` — the
    resolution-time seam: resolves a name across scopes, prints version,
    bundled version, pack, and status, warns on `outdated` (`:140-144`), and
    prints `Tool '<name>' not found.` (`:152`). No `oat skill` command exists.
  - `packages/cli/src/manifest/manifest.types.ts:23-30,57-60` — manifest
    entries carry the canonical and provider path pair, strategy, and hash;
    no version. Versions come from `getSkillVersion` on the SKILL.md files
    (`tools/shared/scan-tools.ts:20,60-77`).
  - `packages/cli/src/commands/shared/scope-option.ts:22-33` and
    `commands/sync/index.ts:333` — concrete scopes are `project | user`; the
    narrowest safe suggestion is the single concrete scope where the drift
    was observed.
- Constraining decisions: none govern drift naming;
  [DR-260701-provider-verification-happens](../decisions/DR-260701-provider-verification-happens.md)
  is adjacent to provider verification timing and should be read before
  choosing where the check runs.

## Dependencies

| Type          | Dependency                                                                                                      | Required state                                                                                    | Current state |
| ------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------- |
| Soft ordering | [Populate provider reachability evidence](./2026-09-03-populate-provider-reachability-evidence.md) (W6 group 1) | Land first; it edits `info-tool.ts` and `list-tools.ts`; this plan then extends the settled seam. | Pending.      |
| Soft boundary | [Warn on non-sync manifest restamps](./2026-08-30-warn-on-non-sync-manifest-restamps.md) (W4)                   | Owns `status/index.ts` and `manifest/manager.ts`; this plan touches neither.                      | Pending.      |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                         | Affected | Files in common                   | Required update |
| --------------------------------------------- | -------- | --------------------------------- | --------------- |
| `review-plan-workflow` (draft PR #190) merges | No       | Only the five lockstep manifests. | None.           |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 6b9a15841dab949ed83fa174286396e063da721d..origin/main -- packages/cli/src/drift packages/cli/src/commands/tools/info packages/cli/src/commands/tools/list/list-tools.ts packages/cli/src/commands/tools/shared/types.ts packages/cli/src/commands/tools/shared/scan-tools.ts packages/cli/src/manifest/manifest.types.ts packages/cli/src/manifest/manager.ts packages/cli/src/commands/shared/scope-option.ts packages/cli/src/commands/sync/index.ts packages/cli/src/commands/status/index.ts apps/oat-docs/docs/cli-utilities/tool-packs.md apps/oat-docs/docs/provider-sync/manifest-and-drift.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
```

The reachability lane is expected to change `info-tool.ts`; that diff is the
prerequisite, not drift. A changed `DriftReport` shape or manifest entry
schema is a STOP.

## Repository conventions

- Focused tests: from `packages/cli`,
  `pnpm exec vitest run src/drift src/commands/tools/info/info-tool.test.ts`.
- Lint/format/docs: `pnpm check` → passes (markdownlint over the two docs
  pages).
- Implementation pattern: injectable dependencies as in
  `InfoToolDependencies`; fixture-dir drift assertions as in
  `drift/detector.test.ts`.
- Shipped CLI behavior: five-package lockstep bump above current
  `origin/main`; help snapshots (`help-snapshots.test.ts`) if option text
  changes.

## Scope

### In scope

- New `packages/cli/src/drift/skill-view-diagnostic.ts` and test — pure
  mapper `(skillName, scope, manifest, canonicalVersion, DriftReport | null)
→ diagnostic` adding the additive/removed/modified classification as a
  new field beside the unchanged `DriftState`.
- `packages/cli/src/drift/index.ts` — export the mapper.
- `packages/cli/src/commands/tools/info/info-tool.ts`, `index.ts`, and
  `info-tool.test.ts` — additive provider-view section in human and JSON
  output; manifest load and `detectDrift` injected through
  `InfoToolDependencies`.
- One post-sync convergence integration case.
- Docs: `apps/oat-docs/docs/cli-utilities/tool-packs.md` (`oat tools info`
  section, `:505`) and `apps/oat-docs/docs/provider-sync/manifest-and-drift.md`
  ("Drift states", `:67`).
- Five public package manifests.

### Out of scope

- `drift/detector.ts` classification, `strays.ts`, `ui/output.ts`
  (`formatStatusTable` columns), and everything under `commands/sync/` — the
  diagnostic never mutates and never reshapes status output.
- `status/index.ts`, including `providerRefreshAdvice` — owned by the W4
  restamp and W6 reachability lanes.
- Any new manifest field; versions are read from the SKILL.md files.

## Current state

`oat tools info` knows the canonical toolkit but not the manifest or
provider views; `oat status` knows drift but not names or versions and
never suggests a sync. The detector already classifies every state the
diagnostic needs except additive-versus-removed, which is derivable from
whether a manifest entry exists. For `symlink` and `collection` strategies
the view is the canonical file, so the version comparison applies only to
`copy` entries and must say so.

## Implementation steps

### 1. Add the pure mapper

Create `skill-view-diagnostic.ts` and its test with no CLI wiring; classify
additive, removed, modified, in-sync, and unknown; compute the concrete-scope
suggestion.

**Verify:** `pnpm exec vitest run src/drift/skill-view-diagnostic.test.ts` →
all classification cases pass.

### 2. Wire into `oat tools info`

Inject manifest loading and `detectDrift` through `InfoToolDependencies`;
add the provider-view block to human output and an additive JSON field; keep
the "not found" path unchanged.

**Verify:** `pnpm exec vitest run src/commands/tools/info/info-tool.test.ts`
→ existing cases unchanged; new cases assert the block and the suggestion
string.

### 3. Prove read-only

Spy on the manifest save and file-write dependencies; assert none are called
on the diagnostic path.

**Verify:** same command → passes.

### 4. Prove post-sync convergence

Integration case: diagnose → `oat sync --scope <scope>` in a temp scope →
re-diagnose → `in_sync` with equal versions.

**Verify:** `pnpm exec vitest run src/commands/tools/tool-pack-lifecycle.integration.test.ts`
(or a new sibling) → passes.

### 5. Docs, snapshots, bump, gates

Update both docs pages; re-run help snapshots if option text changed; bump
the five packages; run the eight AGENTS.md gates in order with captured exit
codes.

## Test plan

- `skill-view-diagnostic.test.ts` (pattern `drift/detector.test.ts`):
  additive; removed; modified with both versions; unknown skill distinct from
  missing distribution; suggests the concrete scope, never `all`; symlink and
  collection entries report no version comparison.
- `info-tool.test.ts`: project-scope missing view; user-scope stale view;
  unknown name keeps the existing wording; JSON keeps every current field.
- Integration: post-sync convergence.
- `status/index.test.ts`: one negative case asserting the status JSON keys
  are unchanged, enforcing the read-only promise.

## Done criteria

- [ ] `oat tools info` names the stale or missing skill, its provider view,
      the drift class, and versions where applicable.
- [ ] Missing distribution and unknown skill are distinct outputs.
- [ ] One concrete-scope sync suggestion per affected scope; never `all`.
- [ ] No mutation on the diagnostic path; post-sync convergence proven.
- [ ] Status output unchanged; lockstep bump and all gates pass; clean tree.

## STOP conditions

Stop and report instead of improvising when:

- the design needs edits to `status/index.ts`'s provider section (record the
  decision explicitly first);
- a new manifest field appears necessary (schema migration; out of size);
- the additive/removed split would change `DriftState` rather than add a
  field;
- the reachability lane has not landed and `info-tool.ts` is being edited
  concurrently; or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidate against current `origin/main`, the backlog item, issue #203, the
drift detector, `info-tool.ts` after the reachability lane, and the manifest
schema when substantial time passes, main advances materially from
`6b9a15841dab949ed83fa174286396e063da721d`, either sibling plan lands, or a load-bearing claim cannot be
reproduced.

## Review focus

- The additive/removed distinction is a new field, not a state change.
- Scope suggestions are concrete and per-scope.
- No status or sync surface was touched.
