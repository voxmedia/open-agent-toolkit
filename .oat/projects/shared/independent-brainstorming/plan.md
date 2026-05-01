---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-05-01
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: [] # phases to pause AFTER completing (empty = every phase)
oat_plan_parallel_groups: [] # groups of phases that run concurrently in worktrees; [] = fully sequential
oat_plan_source: quick # spec-driven | quick | imported
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: independent-brainstorming

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Ship `oat-brainstorm`, a new always-on user-invocable skill in a new dedicated `brainstorm` pack, that turns OAT into a first-class destination for project-independent brainstorming conversations and routes to existing OAT skills (idea capture, backlog item, project promotion, active-project fold-back, doc-to-path, inline) based on installed packs and the conversation outcome.

**Architecture:** New dedicated skill (`oat-brainstorm`) shipped in a new dedicated pack (`brainstorm`, user-eligible with default user scope, default-on in `oat init`). Always-on activation; conversation runs Superpowers-style cadence; destination identified via opportunistic trigger-phrase surfacing or convergence cue; pack-aware terminal-state picker filters by `oat config get tools.<pack>`; handoffs inline-execute downstream skills. Visual-companion bundle is a port of MIT-licensed `superpowers:brainstorming` companion with OAT-side persistence-path alignment.

**Tech Stack:** TypeScript 5.8.3 (Node 22.17.0); pnpm workspaces + Turborepo; vitest for tests; oxlint/oxfmt; existing OAT pack-lifecycle infrastructure under `packages/cli/src/commands/`; markdown skill files under `.agents/skills/`.

**Commit Convention:** `{type}({scope}): {description}` — e.g., `feat(p01-t01): introduce PackMetadata mechanism`.

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user (default: pause after every phase)
- [x] Set `oat_plan_hill_phases` in frontmatter (`[]` = pause after every phase)
- [x] Evaluated phases for parallelism opportunities (see `## Parallelism` section)
- [x] Set `oat_plan_parallel_groups` in frontmatter (`[]` — fully sequential, see reasoning below)

---

## Parallelism

This plan is fully sequential — no `oat_plan_parallel_groups` declared. The phases form a strict dependency chain on shared write boundaries:

- **Phase 1 → Phase 2.** Phase 1 introduces the `PACK_METADATA` mechanism in `packages/cli/src/commands/init/tools/shared/skill-manifest.ts` and wires the installer to consult it. Phase 2 adds `BRAINSTORM_SKILLS` to the same manifest file and adds a `brainstorm` entry to `PACK_METADATA`. Same write boundary on the manifest module — concurrent edits would produce merge conflicts.
- **Phase 2 → Phase 3.** Phase 2 creates `.agents/skills/oat-brainstorm/SKILL.md` as a scaffold. Phase 3 fills in the same SKILL.md with mode assertion, progress indicators, and process steps. Same file, sequential edits required.
- **Phase 3 → Phase 4.** Phase 4 dogfood scenarios (p04-t02) require Phase 3's flow implementation to be functional end-to-end. Documentation (p04-t01) references the completed skill and pack. Lockstep version bumps (p04-t03) and `pnpm release:validate` (p04-t04) gate on the full feature being present in canonical asset locations.

Splitting any phase into a parallel group would force a coordination commit between phases — net negative. Sequential execution with HiLL pause after every phase is the right shape.

---

## Phase 1: Pack-metadata mechanism

**Goal:** Establish the generalized pack-default-scope mechanism (`PackMetadata` interface + `PACK_METADATA` map), wire it into both the interactive picker and the non-interactive scope resolver, and prove migration safety. No `brainstorm`-specific wiring in this phase — `brainstorm` is added to the metadata in Phase 2 once the skill file exists.

### Task p01-t01: Introduce PackMetadata interface and PACK_METADATA map

**Files:**

- Modify: `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`
- Create: `packages/cli/src/commands/init/tools/shared/pack-metadata.test.ts`

**Step 1: Write test (RED)**

```typescript
// pack-metadata.test.ts
import { describe, it, expect } from 'vitest';
import { resolvePackDefaultScope, PACK_METADATA } from './skill-manifest';

describe('resolvePackDefaultScope', () => {
  it("returns 'project' when pack name is absent from metadata", () => {
    expect(resolvePackDefaultScope('definitely-not-a-pack')).toBe('project');
  });

  it('returns the configured defaultScope when present', () => {
    // PACK_METADATA is an empty map at this task — add a fixture entry inline
    // or via a test-only spec helper. Verify the lookup returns 'user' for the
    // fixture and 'project' for absent entries.
  });
});
```

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/init/tools/shared/pack-metadata.test.ts`
Expected: tests fail (RED) — `resolvePackDefaultScope` and `PACK_METADATA` are not yet exported.

**Step 2: Implement (GREEN)**

```typescript
// skill-manifest.ts (additions)
export interface PackMetadata {
  name: string;
  defaultScope: 'user' | 'project';
}

export const PACK_METADATA: Record<string, PackMetadata> = {
  // Existing user-eligible packs (ideas, docs, utility, research) are
  // intentionally absent — absence falls back to 'project', preserving
  // current behavior. New packs that want user-default scope add an entry.
};

export function resolvePackDefaultScope(packName: string): 'user' | 'project' {
  return PACK_METADATA[packName]?.defaultScope ?? 'project';
}
```

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/init/tools/shared/pack-metadata.test.ts`
Expected: tests pass (GREEN).

**Step 3: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: no errors.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/shared/skill-manifest.ts packages/cli/src/commands/init/tools/shared/pack-metadata.test.ts
git commit -m "feat(p01-t01): introduce PackMetadata mechanism"
```

---

### Task p01-t02: Wire interactive picker to consult PACK_METADATA defaultScope

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts` (around the user-scope precheck logic, ~line 357 neighborhood per the design's installer-touchpoint analysis)
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`

**Step 1: Write test (RED)**

Add a test case using a fixture pack name (added to `PACK_METADATA` test-only via spy/mock or a fixture entry) to verify the interactive picker prechecks user scope when `defaultScope: 'user'` is set, even when no prior install exists at user scope.

```typescript
// index.test.ts (additions)
it('interactive picker prechecks user scope for packs with defaultScope=user', async () => {
  // Stub PACK_METADATA to include a fixture pack with defaultScope: 'user'
  // Run the picker with no prior install state for the fixture pack
  // Assert the picker default value is 'user'
});

it('interactive picker uses default project scope when pack has no metadata entry', async () => {
  // Verify existing eligible-pack behavior is preserved for packs absent from PACK_METADATA
});
```

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/init/tools/index.test.ts`
Expected: new tests fail (RED) — picker still uses old precheck logic.

**Step 2: Implement (GREEN)**

Update the picker scope-precheck branch in `index.ts` to consult `resolvePackDefaultScope(packName)` when no prior install state exists at user scope. Existing-install precedence is preserved (this task does not change migration behavior — that's covered in p01-t04).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/init/tools/index.test.ts`
Expected: tests pass (GREEN).

**Step 3: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: no errors.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/index.ts packages/cli/src/commands/init/tools/index.test.ts
git commit -m "feat(p01-t02): wire interactive picker to PACK_METADATA defaultScope"
```

---

### Task p01-t03: Wire non-interactive scope resolver to consult PACK_METADATA defaultScope

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts` (non-interactive scope resolution branch, ~line 462 neighborhood per the design)
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`

**Step 1: Write test (RED)**

```typescript
// index.test.ts (additions)
it('non-interactive install resolves to user scope for packs with defaultScope=user', async () => {
  // Stub PACK_METADATA with a fixture pack defaultScope='user'
  // Invoke install command without --scope flag in non-interactive mode
  // Assert scope resolves to 'user'
});

it('non-interactive install defaults to project scope for packs without metadata', async () => {
  // Verify existing behavior is preserved for packs absent from PACK_METADATA
});
```

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/init/tools/index.test.ts`
Expected: new tests fail (RED).

**Step 2: Implement (GREEN)**

Update the non-interactive eligible-pack branch in `index.ts` to consult `resolvePackDefaultScope(packName)`. The existing "default to project" branch becomes the fallback when the resolved default is `'project'`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/init/tools/index.test.ts`
Expected: tests pass (GREEN).

**Step 3: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: no errors.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/index.ts packages/cli/src/commands/init/tools/index.test.ts
git commit -m "feat(p01-t03): wire non-interactive scope resolver to PACK_METADATA defaultScope"
```

---

### Task p01-t04: Migration safety — existing-install detection wins over defaultScope

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts` (verify ordering of existing-install detection vs `resolvePackDefaultScope` consultation)
- Modify: `packages/cli/src/commands/init/tools/index.test.ts` (or a sibling install-state test file)

**Step 1: Write test (RED)**

```typescript
it('existing-install detection takes precedence over defaultScope', async () => {
  // Stub PACK_METADATA with a fixture pack defaultScope='user'
  // Simulate existing project-scope install state for the fixture pack
  // Re-run install (interactive picker AND non-interactive)
  // Assert resolved scope is 'project' (preserves existing install) — defaultScope is ignored
});
```

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/init/tools/index.test.ts`
Expected: tests fail (RED) if scope-resolution ordering is wrong, or pass without changes if existing-install detection already runs before metadata consultation.

**Step 2: Implement (GREEN)**

If the test fails, reorder the scope-resolution flow so existing-install detection short-circuits before `resolvePackDefaultScope` is consulted. If the test passes without changes, document the ordering with an inline comment in `index.ts` and add the test as an explicit guard against regression.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/init/tools/index.test.ts`
Expected: tests pass (GREEN).

**Step 3: Verify**

Run: `pnpm lint && pnpm type-check && pnpm --filter @open-agent-toolkit/cli test`
Expected: no errors; full CLI test suite passes.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/index.ts packages/cli/src/commands/init/tools/index.test.ts
git commit -m "feat(p01-t04): existing-install detection wins over PACK_METADATA defaultScope"
```

---

## Phase 2: Brainstorm pack registration + skill scaffolding + bundle

**Goal:** Register the `brainstorm` pack across pack-lifecycle command paths, scaffold the `oat-brainstorm` skill directory with frontmatter and section stubs (so bundle-consistency tests pass), port the visual-companion bundle from `superpowers:brainstorming` (MIT) with OAT-side persistence-path alignment, ship the destinations playbook and the doc-to-path output template, and update `NOTICES.md` attribution.

### Task p02-t01: Register brainstorm pack in manifest constants and PACK_METADATA + scaffold skill directory

**Files:**

- Modify: `packages/cli/src/commands/init/tools/shared/skill-manifest.ts` (add `BRAINSTORM_SKILLS = ['oat-brainstorm'] as const`; add `brainstorm` entry to `PACK_METADATA` with `defaultScope: 'user'`)
- Create: `.agents/skills/oat-brainstorm/SKILL.md` (frontmatter + section headers — empty process body, content fills in Phase 3)
- Modify: `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts` (extend the manifest constants traversal to include `BRAINSTORM_SKILLS`)

**Step 1: Implement**

`SKILL.md` frontmatter:

```yaml
---
name: oat-brainstorm
version: 1.0.0
description: <plan-time TBD; design specifies tight always-on description tuned for exploratory-intent triggers — actual string drafted in Phase 3 task p03-t01>
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---
```

Section stubs (empty bodies, content fills in Phase 3): `# Brainstorm`, `## Mode Assertion`, `## Progress Indicators`, `## Process`, `## Success Criteria`.

**Step 2: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts`
Expected: bundle-consistency test recognizes `oat-brainstorm` as an existing canonical asset under `.agents/skills/`.

Run: `pnpm oat:validate-skills`
Expected: skill validates against frontmatter contract (placeholder description acceptable at scaffold stage).

**Step 3: Commit**

```bash
git add packages/cli/src/commands/init/tools/shared/skill-manifest.ts packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts .agents/skills/oat-brainstorm/SKILL.md
git commit -m "feat(p02-t01): register brainstorm pack and scaffold oat-brainstorm skill"
```

---

### Task p02-t02: Wire brainstorm into install/update/remove pack-name unions and default-on set

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts` (add `'brainstorm'` to pack-name unions; add picker description: "Always-on brainstorming entry point with visual companion"; add to default-on set in `oat init tools` guided setup)
- Modify: `packages/cli/src/commands/tools/update/update-tools.ts` (add `brainstorm: BRAINSTORM_SKILLS.map(...)` and `brainstorm: { ... }` entries)
- Modify: corresponding remove handlers
- Modify: `packages/cli/src/commands/init/tools/index.test.ts` and `packages/cli/src/commands/tools/update/update-tools.test.ts` and remove tests
- Modify: `packages/cli/src/commands/help-snapshots.test.ts` if pack-name unions appear in help snapshots

**Step 1: Write test (RED)**

```typescript
// index.test.ts additions
it('install command recognizes brainstorm as a pack name', async () => {
  // Verify install handler accepts 'brainstorm' and routes through standard pack-install flow
});

it('non-interactive install of brainstorm resolves to user scope by default', async () => {
  // End-to-end-ish: invoke install command with 'brainstorm' and no --scope flag
  // Assert: tools.brainstorm config set to true, asset placement at user scope (~/.agents/skills/oat-brainstorm/)
});

it('oat init tools default-on set includes brainstorm', () => {
  // Read default-on configuration; assert 'brainstorm' is in the default-checked set
});
```

Plus parallel additions to `update-tools.test.ts` (brainstorm pack updates `oat-brainstorm` skill) and remove-tools tests (brainstorm removal flips `tools.brainstorm` config to false and removes asset directory).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/init/tools packages/cli/src/commands/tools`
Expected: new tests fail (RED).

**Step 2: Implement (GREEN)**

Add `'brainstorm'` to all pack-name unions, picker descriptions, and the `oat init tools` default-on set. Populate update and remove handlers with the appropriate pack ↔ skill list and asset paths.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/init/tools packages/cli/src/commands/tools`
Expected: tests pass (GREEN).

**Step 3: Verify**

Run: `pnpm lint && pnpm type-check && pnpm --filter @open-agent-toolkit/cli test`
Expected: full CLI test suite passes including help-snapshot tests.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/ packages/cli/src/commands/tools/
git commit -m "feat(p02-t02): register brainstorm in install/update/remove pack lifecycle"
```

---

### Task p02-t03: Visual-companion script bundle (verbatim from Superpowers)

**Files:**

- Create: `.agents/skills/oat-brainstorm/scripts/server.cjs` (verbatim copy from `~/.claude/plugins/cache/claude-plugins-official/superpowers/5.0.7/skills/brainstorming/scripts/server.cjs`)
- Create: `.agents/skills/oat-brainstorm/scripts/stop-server.sh` (verbatim copy)
- Create: `.agents/skills/oat-brainstorm/scripts/frame-template.html` (verbatim copy)
- Create: `.agents/skills/oat-brainstorm/scripts/helper.js` (verbatim copy)
- Create: `.agents/skills/oat-brainstorm/scripts/start-server.sh` (verbatim copy — patched in p02-t04)

**Step 1: Implement**

Copy all five files exactly as they appear in the Superpowers cache. No content modifications. Preserve executable bits on the `.sh` files via `chmod +x`. The `start-server.sh` is copied verbatim here and patched in the next task to keep the verbatim copy auditable in git history.

**Step 2: Verify**

Smoke test:

```bash
.agents/skills/oat-brainstorm/scripts/start-server.sh --foreground &
SERVER_PID=$!
sleep 2
# Verify server-info written to expected state dir; verify URL is reachable via curl
kill $SERVER_PID 2>/dev/null
```

Smoke test alternative (cleaner): write a vitest integration test that spawns the server, polls for `server-info`, asserts URL responds 200, then stops the server.

```typescript
// Create: packages/cli/src/integration/visual-companion-smoke.test.ts (or under skill-test fixtures)
it('visual companion server starts and serves frame-template', async () => {
  // spawn start-server.sh under a /tmp project dir
  // poll for server-info JSON
  // GET http://localhost:<port>/ — assert response includes frame-template scaffolding
  // run stop-server.sh
});
```

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/integration/visual-companion-smoke.test.ts`
Expected: server starts, URL responds, frame-template wraps content; clean shutdown.

**Step 3: Commit**

```bash
git add .agents/skills/oat-brainstorm/scripts/
git commit -m "feat(p02-t03): import visual-companion script bundle from superpowers (MIT)"
```

---

### Task p02-t04: Patch start-server.sh persistence paths to OAT-managed prefixes

**Files:**

- Modify: `.agents/skills/oat-brainstorm/scripts/start-server.sh` (replace `.superpowers/brainstorm/` defaults with OAT-managed prefix resolution)

**Step 1: Implement**

Update the persistence-path resolution in `start-server.sh`:

- If `--project-dir <path>` passed: session dir under `<path>/.oat/brainstorm/<session-id>/`
- Else if invoked inside an OAT-initialized repo (detected via `.oat/` directory walk-up): session dir under `<repo-root>/.oat/brainstorm/<session-id>/`
- Else: session dir under `~/.oat/brainstorm/<session-id>/`

Preserve all other Superpowers script behavior (host/port options, foreground/background flags, platform detection).

**Step 2: Verify**

Add persistence-path tests:

```typescript
// Extend visual-companion-smoke.test.ts or add a dedicated persistence-path test
it('start-server.sh resolves to .oat/brainstorm/ when invoked in an OAT repo', async () => {
  // Create a tmp dir with `.oat/`; invoke start-server.sh with no --project-dir
  // Read server-info; assert screen_dir / state_dir paths fall under <tmp>/.oat/brainstorm/
});

it('start-server.sh respects --project-dir override', async () => {
  // Invoke with explicit --project-dir; assert paths land under that directory
});

it('start-server.sh falls back to ~/.oat/brainstorm/ when not in an OAT repo', async () => {
  // Create a tmp dir without `.oat/`; invoke from there
  // Assert paths fall under HOME/.oat/brainstorm/
});
```

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/integration/visual-companion-smoke.test.ts`
Expected: persistence-path tests pass.

**Step 3: Commit**

```bash
git add .agents/skills/oat-brainstorm/scripts/start-server.sh packages/cli/src/integration/visual-companion-smoke.test.ts
git commit -m "feat(p02-t04): align visual-companion persistence paths with OAT prefixes"
```

---

### Task p02-t05: Port visual-companion.md guide and update NOTICES.md attribution

**Files:**

- Create: `.agents/skills/oat-brainstorm/references/visual-companion.md` (port from Superpowers source with OAT-side path edits)
- Modify: `NOTICES.md` (extend the existing Superpowers entry with a new `### \`brainstorming\` skill — visual companion` subsection per design Component C)

**Step 1: Implement**

Port the visual-companion guide. Edits vs Superpowers source:

- Persistence-path references: `.superpowers/brainstorm/` → `.oat/brainstorm/` (repo-scope) or `~/.oat/brainstorm/` (user-scope)
- Example invocations: paths reflect bundled location relative to skill (`scripts/start-server.sh` etc.)
- Brand references: keep "the visual companion" as a generic name; the skill that consumes it is `oat-brainstorm`

`NOTICES.md` addition (per design Component C "Attribution"):

```markdown
### `brainstorming` skill — visual companion

Source files: `skills/brainstorming/scripts/{server.cjs, start-server.sh,
  stop-server.sh, frame-template.html, helper.js}` and
`skills/brainstorming/visual-companion.md`.

Files lifted into OAT (under `.agents/skills/oat-brainstorm/`):

- `scripts/server.cjs`, `scripts/stop-server.sh`, `scripts/frame-template.html`,
  `scripts/helper.js` — verbatim from upstream.
- `scripts/start-server.sh` — verbatim except for default persistence-path
  changes (`.superpowers/brainstorm/` → OAT-managed prefixes).
- `references/visual-companion.md` — adapted prose: persistence paths and
  example invocations updated to OAT conventions.

Consumer OAT skills: `oat-brainstorm`.
```

**Step 2: Verify**

Run: `pnpm format` and `pnpm lint` to confirm formatting.
Manual: skim the ported `visual-companion.md` for any missed `.superpowers` references.

```bash
grep -n "superpowers" .agents/skills/oat-brainstorm/references/visual-companion.md
```

Expected: any remaining mentions are intentional (e.g., explicit references to the upstream project name in attribution context); no broken path references to `.superpowers/brainstorm/`.

**Step 3: Commit**

```bash
git add .agents/skills/oat-brainstorm/references/visual-companion.md NOTICES.md
git commit -m "docs(p02-t05): port visual-companion guide and update NOTICES attribution"
```

---

### Task p02-t06: Create destinations playbook with per-destination stanzas

**Files:**

- Create: `.agents/skills/oat-brainstorm/references/destinations.md`

**Step 1: Implement**

Create the destinations playbook with one stanza per terminal state. Stanzas follow the structure defined in design Component D:

- Destination name + short description
- Pack required (or "always available")
- Trigger phrases (paraphrase-tolerant string list)
- Required template fields (linked to source template paths under `.oat/templates/`)
- Optional template fields
- Confirmation pattern: `full` | `minimal` | `none` (with example wording when `full`)
- Handoff target: skill name + entry step, or "no downstream skill"
- "If user wants to keep brainstorming after this is offered" rule

Stanzas to include (one per row of the per-destination handoff matrix in design.md):

1. Inline only
2. Doc-to-path
3. Capture as new idea (ideas pack)
4. Extend existing idea (ideas pack)
5. Summarize idea directly (ideas pack)
6. Scoped backlog item (project-management pack) — full confirmation pattern with example wording
7. Promote to new OAT project (workflows pack)
8. Active project: fold-back (workflows pack)
9. Active project: brainstorming reference file (workflows pack)

The scoped-backlog-item stanza uses the worked example from the design conversation as the canonical confirmation-pattern wording.

**Step 2: Verify**

Manual review checklist:

- Every row of `design.md`'s per-destination handoff matrix appears as a stanza
- Trigger phrases are concrete substring/paraphrase patterns, not regex
- Each stanza references the source template path it consumes
- Confirmation patterns match `full`/`minimal`/`none` per the design

Run: `pnpm oat:validate-skills` (validates skill bundle including references).

**Step 3: Commit**

```bash
git add .agents/skills/oat-brainstorm/references/destinations.md
git commit -m "feat(p02-t06): add destinations playbook with per-destination stanzas"
```

---

### Task p02-t07: Create brainstorm-doc.md output template

**Files:**

- Create: `.agents/skills/oat-brainstorm/templates/brainstorm-doc.md`

**Step 1: Implement**

Create the doc-to-path output template. Sections: Title, Overview, Approaches Considered (with recommendation flag per approach), Chosen Direction (or "no direction selected"), Open Questions, Next Steps, Transcript Session Note (collapsible appendix-style).

The template is rendered from the synthesized payload (per design Data Models). Frontmatter is minimal — the template lands in user-chosen paths, possibly outside any OAT-managed directory, so frontmatter cannot rely on OAT conventions.

**Step 2: Verify**

Run: `pnpm format`
Manual: open template; verify section structure aligns with the synthesized-payload field set.

**Step 3: Commit**

```bash
git add .agents/skills/oat-brainstorm/templates/brainstorm-doc.md
git commit -m "feat(p02-t07): add brainstorm-doc output template"
```

---

## Phase 3: Skill flow implementation

**Goal:** Fill in `oat-brainstorm/SKILL.md` with the complete process flow per design Architecture and Component A. Each task in this phase modifies a different section of the same file; sequential execution within the phase is implicit (commits land on the same branch in order).

### Task p03-t01: Mode Assertion and Progress Indicators sections + final description string

**Files:**

- Modify: `.agents/skills/oat-brainstorm/SKILL.md` (replace placeholder description in frontmatter; fill `## Mode Assertion` and `## Progress Indicators` sections)

**Step 1: Implement**

**Final description** — replace the plan-time-TBD placeholder with a tight, exploratory-intent-tuned description. Reference: `superpowers:brainstorming` description as starting point. Adapted draft:

> "You MUST use this when starting any project-independent brainstorming — exploratory phrasing like 'I've been thinking about', 'what if we did', open-ended design questions, or any moment where the user is thinking out loud about an idea, feature, or change without a chosen destination yet. Routes to inline/doc/idea/backlog/project handoffs based on installed packs and conversation outcome."

Description string is plan-time-validated against over-fire risk: agent should not fire on routine implementation requests, code-review questions, or known-destination work (which would invoke a destination skill directly).

**Mode Assertion section:**

- Purpose
- Blocked: no implementation code; no formal requirements/spec; no auto-routing to a destination before convergence; no skipping the visual-companion offer when content is visual
- Allowed: free-form exploratory conversation; per-question visual-companion routing; pack detection; destination handoff inline-execution; doc-to-path artifact rendering; active-project fold-back commit (with safety contract from design Architecture)
- Self-correction protocol: if writing implementation code → STOP; if forcing destination before convergence → STOP; if running fold-back commit on dirty tree without preflight → STOP and re-route through dirty-tree handler
- Recovery: acknowledge, return to brainstorming flow, re-route per the missed step

**Progress Indicators section:**

- Banner: `OAT ▸ BRAINSTORM`
- Step counters: `[1/N]` style — one line per major process step (activation, mode, visual-companion offer, pack detect, conversation, satisfaction check, synthesis, handoff)

**Step 2: Verify**

Run: `pnpm oat:validate-skills`
Expected: skill validates with the new description and mode-assertion structure.

**Step 3: Commit**

```bash
git add .agents/skills/oat-brainstorm/SKILL.md
git commit -m "feat(p03-t01): add mode assertion, progress indicators, and final description"
```

---

### Task p03-t02: Process steps 1-4 — activation, mode banner, visual-companion offer, pack/active-project detection

**Files:**

- Modify: `.agents/skills/oat-brainstorm/SKILL.md` (add `## Process` step bodies for activation through pack detection)

**Step 1: Implement**

Process steps per design Data Flow:

- **Step 1: Activate.** Always-on description fires; agent invokes the skill.
- **Step 2: Mode banner.** Print `OAT ▸ BRAINSTORM`; assert mode (per `## Mode Assertion`).
- **Step 3: Visual companion offer.** Per Superpowers convention: own message, no other content. Pre-flight check: confirm `node` on PATH; if missing, suppress the offer and log a `oat-doctor`-discoverable note. Wait for user accept/decline.
- **Step 4: Pack and active-project detection.**
  ```bash
  IDEAS_INSTALLED=$(oat config get tools.ideas 2>/dev/null || echo "false")
  PJM_INSTALLED=$(oat config get tools.project-management 2>/dev/null || echo "false")
  WORKFLOWS_INSTALLED=$(oat config get tools.workflows 2>/dev/null || echo "false")
  ACTIVE_PROJECT=$(oat config get activeProject 2>/dev/null || echo "")
  if [ -n "$ACTIVE_PROJECT" ] && [ -f "$ACTIVE_PROJECT/state.md" ]; then
    # Read oat_workflow_mode, oat_phase, oat_pr_status from state.md frontmatter
  fi
  ```

**Step 2: Verify**

Run: `pnpm oat:validate-skills`
Expected: skill validates; process structure complete through step 4.

Manual: re-read steps; verify pack-detection bash matches `oat-project-document`'s convention (the canonical reference cited in design).

**Step 3: Commit**

```bash
git add .agents/skills/oat-brainstorm/SKILL.md
git commit -m "feat(p03-t02): add activation, visual-companion offer, and pack-detection process steps"
```

---

### Task p03-t03: Process steps 5-6 — conversation cadence and destination signal-watching

**Files:**

- Modify: `.agents/skills/oat-brainstorm/SKILL.md` (add Process steps 5 and 6)

**Step 1: Implement**

- **Step 5: Free brainstorming.** Superpowers cadence:
  - Ask questions one at a time
  - Prefer multiple-choice when possible, open-ended when not
  - Propose 2-3 distinct approaches with recommendation
  - Per-question visual-companion routing: visual content → push HTML fragment to `screen_dir`; text content → terminal
  - Read browser interactions from `state_dir/events` on each turn
- **Step 6: Destination identification.** Two convergence paths:
  - **Trigger phrase fires.** Skill loads `references/destinations.md` and matches user message against trigger phrases (loose substring + paraphrase tolerance, not regex). On match: surface the matched destination immediately (per design "Destination identification" rule). Ask before committing if multiple destinations match.
  - **Convergence cue.** User signals done ("I'm done", "let's wrap", repetition, sustained absence of new questions). Skill presents pack-filtered terminal-state picker.

**Step 2: Verify**

Run: `pnpm oat:validate-skills`
Manual: verify reference to `destinations.md` is correct and trigger-phrase matching rule is unambiguous.

**Step 3: Commit**

```bash
git add .agents/skills/oat-brainstorm/SKILL.md
git commit -m "feat(p03-t03): add conversation cadence and destination signal-watching steps"
```

---

### Task p03-t04: Process steps 7-8 — satisfaction check and synthesis with confirmation

**Files:**

- Modify: `.agents/skills/oat-brainstorm/SKILL.md` (add Process steps 7 and 8)

**Step 1: Implement**

- **Step 7: Satisfaction check.** Whichever path triggered convergence: ask "Feel good about where we landed, or want to keep brainstorming and add more detail?" If keep going: return to step 5 with destination noted; skill may proactively probe for required template fields not yet covered. If wrap up: continue.
- **Step 8: Synthesis with confirmation.** Build the canonical payload (per design Data Models `SynthesizedPayload`). For each destination, consult `references/destinations.md` for confirmation pattern:
  - `full` (currently only scoped-backlog-item): present payload field-by-field with example wording from the playbook stanza; user confirms or revises before write
  - `minimal`: confirm slug / path / which artifact, then write
  - `none`: write directly (e.g., summarize-idea path — downstream skill shows summary for review)

**Step 2: Verify**

Run: `pnpm oat:validate-skills`
Manual: re-read steps; verify the synthesis payload field list matches the design's `SynthesizedPayload` interface exactly.

**Step 3: Commit**

```bash
git add .agents/skills/oat-brainstorm/SKILL.md
git commit -m "feat(p03-t04): add satisfaction check and synthesis-with-confirmation steps"
```

---

### Task p03-t05: Process step 9 — non-fold-back handoffs (idea, pjm, project-promote, doc-to-path, inline)

**Files:**

- Modify: `.agents/skills/oat-brainstorm/SKILL.md` (add Process step 9 for the non-fold-back handoff branches)

**Step 1: Implement**

- **Step 9 (non-fold-back branches):**
  - **Inline only:** print one-paragraph closing summary; end mode assertion
  - **Doc-to-path:** path validation per design Error Handling (path is file not dir; parent exists or offer to create — explicit confirmation if outside repo; file already exists → ask overwrite vs different name; unwritable → surface OS error). Render `templates/brainstorm-doc.md` with payload values; write
  - **Capture as new idea:** read `.agents/skills/oat-idea-new/SKILL.md`; execute its Steps 3-7 inline (initialize ideas dir, scaffold discovery, update backlog, check scratchpad, set active-idea pointer); seed the scaffolded `discovery.md` with payload contents (What's the Idea?, Why Is It Interesting?, What Would It Look Like?, first session in Notes & Discussion); offer to chain into `oat-idea-ideate` Step 4 or stop
  - **Extend existing idea:** read `.agents/skills/oat-idea-ideate/SKILL.md`; execute its Step 4 (Start New Session) with the resolved idea path; append `transcript_session_note` from payload
  - **Summarize idea directly:** capture-as-new-idea path (silent), then read `.agents/skills/oat-idea-summarize/SKILL.md` and run end-to-end (which surfaces the summary for accept/refine)
  - **Scoped backlog item:** read `.agents/skills/oat-pjm-add-backlog-item/SKILL.md`; execute its process from Step 1; pre-fill its early-prompt answers from the confirmed payload (title, description, acceptance criteria, scope estimate, priority); downstream skill owns ID generation, file writing, and index regeneration
  - **Promote to new OAT project:** confirm slug + mode (`quick` vs `spec-driven` — proposed default based on `chosen_direction` and scope signals from the conversation); run `oat project new <slug> --mode <mode>` to scaffold; write field-filled `discovery.md` only (Initial Request, Solution Space with approaches, Chosen Direction, Key Decisions, Open Questions); mark `oat_status: complete`, `oat_ready_for: oat-project-quick-start` (or `oat-project-design`); update project `state.md` (phase=discovery, status=complete); print pointer to next skill; **stop — do NOT inline-execute the next phase** (per design)

**Step 2: Verify**

Run: `pnpm oat:validate-skills`
Manual: verify each non-fold-back branch references the correct downstream `SKILL.md` path and entry step. Cross-check with design's per-destination handoff matrix.

**Step 3: Commit**

```bash
git add .agents/skills/oat-brainstorm/SKILL.md
git commit -m "feat(p03-t05): add non-fold-back terminal-state handoffs"
```

---

### Task p03-t06: Process step 9 — active-project router and fold-back commit safety contract

**Files:**

- Modify: `.agents/skills/oat-brainstorm/SKILL.md` (add Process step 9 active-project branches)

**Step 1: Implement**

- **Active-project 3-way router** (only when active project exists, fires before pack-filtered picker per design):
  - Question 1: "Is this brainstorm related to the active project?"
    - **Related → fold-back rule** (next bullet)
    - **Independent → all other terminal states** (active project ignored from this point; route through standard pack-filtered picker)
    - **Related but supplementary → brainstorming reference file** at `<project>/brainstorming/YYYY-MM-DD-<topic>.md` (always available regardless of project phase; minimal confirmation on filename)
- **Fold-back rule** (uniform across spec-driven and quick modes per design):
  1. **Pick upstream artifact:** `design.md` if exists (any mode), else `discovery.md`. User signal can override toward `discovery.md` for foundational changes
  2. **Preflight `git status` check:**
     ```bash
     git status --porcelain -- "$ARTIFACT_PATH"
     ```
  3. **Clean → append + scoped commit.** Append `## Brainstorming Update: YYYY-MM-DD — <topic>` section with chosen-direction, key-decisions, transcript appendix. Then `git add -- "$ARTIFACT_PATH"` (explicit `--` form, never `-A`, never globs) followed by `git commit -m "chore(oat): integrate brainstorm into <artifact> for <project-name>"`
  4. **Dirty → user picker:** present three options
     - Commit current artifact changes first (recommended when prior changes are unrelated) — separate commit, then fold-back as new scoped commit on top
     - Include current changes in the fold-back commit — warn that prior edits are mixed in; user accepts; commit message reflects both
     - Abort fold-back; capture as reference file instead — switch destination to brainstorming reference file
  5. **Handoff prompt printed only after scoped commit succeeds.** Template:

     ```
     Run `<skill-name>` with this context:

     "A brainstorming session surfaced changes that needed to be folded
     into <artifact>. I've committed the update (commit <hash>: <subject>).
     Integrate the new content into the existing plan as new tasks (or a
     new phase if substantial). Don't refresh the existing plan — preserve
     review tables and any in-progress task state."
     ```

     Skill name resolved per workflow mode + PR status:

     | Mode        | PR status                    | Handoff target            |
     | ----------- | ---------------------------- | ------------------------- |
     | spec-driven | none / closed                | `oat-project-plan`        |
     | quick       | none / closed                | `oat-project-quick-start` |
     | either      | open (`oat_pr_status: open`) | `oat-project-revise`      |

  6. **If `git commit` fails** (pre-commit hooks reject, signing fails, etc.): surface error, do NOT print handoff prompt. User resolves before fold-back can complete.

**Step 2: Verify**

Run: `pnpm oat:validate-skills`
Manual: verify the fold-back contract matches design "Fold-back commit safety contract" subsection word-for-word at the level of preflight, scoped staging discipline (`git add --`), and conditional handoff print.

**Step 3: Commit**

```bash
git add .agents/skills/oat-brainstorm/SKILL.md
git commit -m "feat(p03-t06): add active-project router and fold-back commit safety contract"
```

---

### Task p03-t07: Skill self-review and validation pass

**Files:**

- Modify: `.agents/skills/oat-brainstorm/SKILL.md` (Success Criteria section + any inline cleanup discovered during self-review)

**Step 1: Implement**

Fill in `## Success Criteria` section. Items:

- ✅ Always-on description fires only on exploratory phrasing (not routine implementation requests)
- ✅ Visual-companion offer is its own message
- ✅ Pack and active-project detection runs once per session
- ✅ Destination identified via trigger phrases or convergence cue
- ✅ Synthesis payload built per design Data Models
- ✅ Handoffs follow per-destination playbook
- ✅ Fold-back commit safety contract honored (preflight, scoped staging, conditional handoff print)
- ✅ Doc-to-path validation handles in-repo / off-repo / overwrite / unwritable cases

Self-review (4-check):

1. **Placeholder scan:** any `{TBD}`, `{...}`, incomplete sections? Fix inline.
2. **Internal consistency:** do steps reference correct downstream skill paths? Does the description match the activation rules?
3. **Scope check:** does the skill stay within design scope, no scope creep into idea-ideation or project-lifecycle behavior?
4. **Ambiguity check:** any rule that could be read two ways? Especially the trigger-phrase matching and the dirty-tree branch.

**Step 2: Verify**

Run: `pnpm oat:validate-skills`
Run: `pnpm lint` and `pnpm format`
Run: `pnpm --filter @open-agent-toolkit/cli test` (full CLI suite, including bundle-consistency)

Expected: all green; skill ready for end-to-end dogfood in Phase 4.

**Step 3: Commit**

```bash
git add .agents/skills/oat-brainstorm/SKILL.md
git commit -m "feat(p03-t07): finalize Success Criteria and self-review skill flow"
```

---

## Phase 4: Documentation, dogfood, release validation

**Goal:** Ship-ready: documentation under `apps/oat-docs`, end-to-end dogfood across all 10 scenarios, lockstep public-package version bumps, `pnpm release:validate` passing.

### Task p04-t01: Document brainstorm pack in apps/oat-docs

**Files:**

- Modify: `apps/oat-docs/docs/cli-utilities/tool-packs.md` (add `brainstorm` to "Bundled packs at a glance" + a dedicated "Brainstorm pack" section parallel to "Core pack" / "Docs pack")
- Create: `apps/oat-docs/docs/skills/oat-brainstorm.md` (or equivalent location for skill-specific docs — match existing skill-doc layout if one exists; otherwise document the skill's purpose, when-to-use, terminal states, visual companion, attribution)

**Step 1: Implement**

`tool-packs.md` additions:

- "Bundled packs at a glance" list: add `brainstorm` — "Always-on brainstorming entry point with visual companion"
- New "Brainstorm pack" section after "Docs pack": describe the single skill, default user scope behavior driven by `PACK_METADATA`, install/update/remove behavior, default-on in `oat init` guided setup

Skill-specific docs page: describe `oat-brainstorm`'s purpose, the activation model, the terminal-state picker behavior, the visual companion (linking to bundled `references/visual-companion.md`), and the destinations playbook.

**Step 2: Verify**

Run: `pnpm build:docs`
Expected: docs site builds without errors; new pages render.

Run: `pnpm --filter oat-docs lint` (or equivalent docs lint)
Expected: no broken links, no missing nav entries.

**Step 3: Commit**

```bash
git add apps/oat-docs/docs/cli-utilities/tool-packs.md apps/oat-docs/docs/skills/oat-brainstorm.md
git commit -m "docs(p04-t01): document brainstorm pack and oat-brainstorm skill"
```

---

### Task p04-t02: Run dogfood scenarios end-to-end and capture results

**Files:**

- Create: `.agents/skills/oat-brainstorm/references/dogfood-results.md` (capture results of the 10 scenarios)

**Step 1: Implement**

Run all 10 dogfood scenarios from design Testing Strategy against this repo (which has all packs installed). For each scenario:

1. Inline only — exploratory conversation that resolves with a one-paragraph summary
2. Doc-to-path (in-repo) — write to `docs/scratchpad/<topic>.md`
3. Doc-to-path (off-repo) — write to `~/vault/notes/<topic>.md` with explicit confirmation
4. Capture as new idea — produce a fresh idea with seeded discovery first session
5. Extend existing idea — append a session to an existing idea
6. Summarize idea directly — fast-path capture + summarize
7. Scoped backlog item — produce a `bl-XXXX.md` file with full confirmation pattern
8. Promote to new OAT project — scaffold a project with seeded `discovery.md` (no `design.md`)
9. Active project: fold-back — append synthesis, commit, print handoff prompt; verify the handoff prompt's commit hash is correct
10. Active project: brainstorming reference file — write to `<project>/brainstorming/<topic>.md`

For each scenario record: setup, the brainstorming flow taken, the artifact(s) produced, any issues encountered, and the resolution.

**Step 2: Verify**

All 10 scenarios complete without skill self-correction-protocol triggers (i.e., the skill stayed in mode the whole time). All produced artifacts validate per their templates.

**Step 3: Commit**

```bash
git add .agents/skills/oat-brainstorm/references/dogfood-results.md
git commit -m "test(p04-t02): record dogfood results for all 10 brainstorm scenarios"
```

---

### Task p04-t03: Lockstep public-package version bumps

**Files:**

- Modify: `packages/cli/package.json` (bump version)
- Modify: `packages/control-plane/package.json` (bump version, lockstep)
- Modify: `packages/docs-config/package.json` (bump version, lockstep)
- Modify: `packages/docs-theme/package.json` (bump version, lockstep)
- Modify: `packages/docs-transforms/package.json` (bump version, lockstep)

**Step 1: Implement**

Per AGENTS.md: "Publishable package guardrail: the lockstep public package set is `packages/cli`, `packages/control-plane`, `packages/docs-config`, `packages/docs-theme`, and `packages/docs-transforms`. If a PR changes shipped functionality for any of them, bump all five public package versions together in the same PR."

This project changes `packages/cli/src` (Phase 1, Phase 2), `.agents/skills/` (Phase 2, Phase 3), and `apps/oat-docs/docs/` (Phase 4). All three categories trigger the lockstep bump per AGENTS.md.

Bump all five package versions by the same SemVer increment (decide minor vs patch based on user-visible behavior; this project ships a new always-on skill + new pack, which is a feature add → minor bump if pre-1.0 conventions allow, otherwise patch).

**Step 2: Verify**

Run: `pnpm install` (refresh lockfile after version changes)
Expected: lockfile updates; no version-mismatch errors.

Manual: confirm all five `package.json` files are at the same new version.

**Step 3: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml
git commit -m "chore(p04-t03): lockstep version bump for brainstorm pack release"
```

---

### Task p04-t04: pnpm release:validate

**Files:** none modified — validation only.

**Step 1: Implement**

Per AGENTS.md: "Definition of done for publishable package changes: run `pnpm release:validate` before finishing. A publishable-package PR is not done until that command passes."

Run: `pnpm release:validate`
Expected: passes. If it fails, identify the failing check (skill validation, lockstep version mismatch, docs build, license headers, etc.) and address before completion.

**Step 2: Verify**

If `pnpm release:validate` passes, also run as a final cross-check:

```bash
pnpm lint && pnpm type-check && pnpm format && pnpm test && pnpm build
```

Expected: all green.

**Step 3: Commit**

No source changes here — this task is a verification gate. If any earlier task left fixable issues that surface here, address with a small follow-up commit:

```bash
# Only if release:validate uncovered an issue requiring a fix
git add <fixed files>
git commit -m "fix(p04-t04): address release:validate finding"
```

If no issues, this task is recorded by `oat-project-implement` as complete via the implementation tracker — no commit needed.

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows (p03, p04, etc.) as needed, but do not delete `spec`/`design`.}

| Scope  | Type     | Status          | Date       | Artifact                                              |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------- |
| p01    | code     | pending         | -          | -                                                     |
| p02    | code     | pending         | -          | -                                                     |
| p03    | code     | pending         | -          | -                                                     |
| p04    | code     | pending         | -          | -                                                     |
| final  | code     | pending         | -          | -                                                     |
| spec   | artifact | pending         | -          | -                                                     |
| design | artifact | fixes_completed | 2026-05-01 | reviews/archived/artifact-design-review-2026-05-01.md |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 4 tasks — establish `PackMetadata` mechanism (interface, map, interactive picker wiring, non-interactive resolver wiring, migration safety)
- Phase 2: 7 tasks — register `brainstorm` pack in install/update/remove paths, scaffold `oat-brainstorm` skill directory, port visual-companion bundle from Superpowers (5 files; 1 patched for OAT persistence paths), port visual-companion guide, update `NOTICES.md` attribution, ship destinations playbook and brainstorm-doc output template
- Phase 3: 7 tasks — fill in `oat-brainstorm/SKILL.md` end-to-end (mode assertion, progress indicators, activation, pack detection, conversation cadence, destination signal-watching, satisfaction check, synthesis with confirmation, non-fold-back terminal-state handoffs, active-project router + fold-back commit safety contract, success criteria + self-review)
- Phase 4: 4 tasks — document brainstorm pack and skill in `apps/oat-docs`, run all 10 dogfood scenarios end-to-end, lockstep public-package version bumps, `pnpm release:validate`

**Total: 22 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md`
- Discovery: `discovery.md`
- Backlog item: `.oat/repo/reference/backlog/items/project-independent-brainstorming-mode.md` (bl-53f0)
- Related backlog: `.oat/repo/reference/backlog/items/idea-promotion-auto-discovery.md` (bl-b3f7) — adjacent, not duplicative
- Tool packs documentation: `apps/oat-docs/docs/cli-utilities/tool-packs.md`
- Pack-detection precedent: `.agents/skills/oat-project-document/SKILL.md` (uses `oat config get tools.project-management`)
- Existing Superpowers attribution: `NOTICES.md`
- Superpowers brainstorming source (visual companion): `~/.claude/plugins/cache/claude-plugins-official/superpowers/5.0.7/skills/brainstorming/`
