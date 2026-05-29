---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-05-29
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p06'] # phases to pause AFTER completing (final phase only, from workflow.hillCheckpointDefault)
oat_auto_review_at_hill_checkpoints: true # auto-run lifecycle review at HiLL checkpoints (from workflow.autoReviewAtHillCheckpoints)
oat_plan_parallel_groups: [['p02', 'p03', 'p05']] # phases that execute concurrently in isolated worktrees
oat_plan_source: quick # spec-driven | quick | imported
oat_import_reference: null # e.g., references/imported-plan.md
oat_import_source_path: null # original source path provided by user
oat_import_provider: null # codex | cursor | claude | null
oat_generated: false
---

# Implementation Plan: remote-review

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Ship `oat-review-provide-remote` and `oat-project-review-provide-remote` so an agent on machine B can fetch a GitHub PR opened by machine A, review it, and post a single PR review back. Flip the minor-finding disposition default across all four receive skills so manual receive matches auto-receive behavior. Update `bl-9fb8` to record the scope split.

**Architecture:** Two new skills under `.agents/skills/` backed by shared helpers under `packages/cli/src/review-remote/`. GitHub is the source of truth: no local artifact, no `plan.md` bookkeeping on machine B. Hybrid read strategy (`gh pr checkout` into an ephemeral, repo-scoped worktree → `gh pr diff` fallback). Project rail uses the existing `oat-reviewer` subagent with a new structured-output mode.

**Tech Stack:** TypeScript (`packages/cli`), `vitest` for tests, `gh` CLI, optional `agent-reviews` for posting symmetry. SKILL.md files follow existing OAT skill conventions.

**Commit Convention:** `{type}({scope}): {description}` — e.g., `feat(p01-t01): add review-marker parser`. Phases p02/p03/p05 execute in isolated worktrees per the Parallelism section; their commits merge back in plan order.

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user (none required — quick mode)
- [x] Set `oat_plan_hill_phases` in frontmatter (`[]`)
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter (`[['p02', 'p03', 'p05']]`)

---

## Parallelism

Dependency + write-set analysis:

- **p01 (shared infrastructure)** must complete first — p02 and p04 import the helpers it ships; p03 and p05 do not depend on p01.
- **p02 (ad-hoc rail skill)** depends on p01 helpers (marker parser, posted-body builder, line-mapping validator, narrowing filter, project resolution helper is irrelevant for ad-hoc but in same package). Writes:
  - `.agents/skills/oat-review-provide-remote/SKILL.md` (new)
  - `packages/cli/src/review-remote/capability-probe.ts` + `.test.ts` (new, p02-t01)
  - `packages/cli/src/review-remote/worktree.ts` + `.test.ts` (new, p02-t02)
  - Integration tests under `packages/cli/src/review-remote/__integration__/ad-hoc/` (p02-t03)

  `packages/cli/src/review-remote/` is shared with p01 and p04 in terms of directory, but the file sets are disjoint — p01 owns parser/builder/line-mapper/narrowing/project-resolver; p02 owns capability-probe/worktree; p04 owns reviewer-dispatch + `__integration__/project/`. No file in `packages/cli/src/review-remote/` is written by more than one phase.

- **p03 (`oat-reviewer` extension)** touches `.agents/agents/oat-reviewer.md` only. Independent of p01.
- **p04 (project rail skill)** depends on p01 helpers AND p03's structured-output mode. Touches `.agents/skills/oat-project-review-provide-remote/SKILL.md` (new) + integration tests under `packages/cli/src/review-remote/__integration__/project/`. Different test subfolder from p02 → no test-file conflict with p02.
- **p05 (receive-skill minor-default flip)** touches only `.agents/skills/oat-(project-)review-receive(-remote)/SKILL.md` — write set fully disjoint from p01-p04.
- **p06 (backlog + release prep)** depends on p01-p05 (lockstep version bumps reflect all shipped changes; `release:validate` runs against the cumulative diff).

Parallel group declared: `[['p02', 'p03', 'p05']]`.

- p01 runs first (sequential).
- p02, p03, p05 then execute concurrently in isolated worktrees and merge back after all three pass.
- p04 runs after the merge (it needs both p01 helpers and p03's reviewer-agent extension).
- p06 runs last.

Why these phases are safely parallel:

- p02 writes the new ad-hoc `SKILL.md`, two new helper modules (`capability-probe`, `worktree`) under `packages/cli/src/review-remote/`, and integration tests under a phase-specific `__integration__/ad-hoc/` subdirectory.
- p03 only writes to `.agents/agents/oat-reviewer.md` (and bumps its `version:`).
- p05 only writes to four existing receive `SKILL.md` files plus their test fixtures.
- No shared mutable file is touched by more than one of {p02, p03, p05}. In particular, `packages/cli/src/review-remote/` is touched only by p02 within this parallel group (p03 and p05 stay in `.agents/`).
- No phase in the group depends on another's runtime output for its tests (p02 stubs the reviewer; p05 tests the receive defaults independently).

Why p04 is not in the parallel group:

- p04 imports the structured-output mode from p03's modified `oat-reviewer` agent. Running p04 concurrently with p03 risks p04 referencing a contract the agent hasn't been updated to satisfy yet. Sequential after the merge is the safe shape.

Why p06 is not in the parallel group:

- The lockstep public package version bump must reflect every shipped change in {p01, p02, p03, p04, p05}. `pnpm release:validate` runs against the cumulative diff. Both require the prior phases' merges to be present.

---

## Dispatch Profile

_No phase-level overrides. Runtime selection chooses the lowest confident tier per phase._

---

## Phase 1: Shared infrastructure helpers

**Goal:** Land the pure-logic helpers that both provide-remote skills depend on, with full unit-test coverage. No GitHub or git side effects in this phase.

All Phase 1 modules live under `packages/cli/src/review-remote/`. Tests are colocated (`.test.ts` files next to sources, per `packages/cli/src/agents/canonical/` precedent).

### Task p01-t01: Add review-marker parser

**Files:**

- Create: `packages/cli/src/review-remote/marker-parser.ts`
- Create: `packages/cli/src/review-remote/marker-parser.test.ts`

**Step 1: Write test (RED)**

Author tests covering the validation rules from `design.md` → Data Models → Posted-review-body:

- Valid block parses to typed object with all expected fields.
- Returns `null` when the marker block is absent (not present on non-OAT reviews).
- Tolerates extra whitespace, mixed casing in marker keys, and unknown extra keys (forward-compat).
- Rejects markers where `oat_review_head_sha` is not a 40-char hex SHA (returns parse error or null per chosen contract — document the choice in the test).
- Treats `oat_project: <value>` (present) and key-omitted differently (project rail vs ad-hoc rail discrimination).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/marker-parser.test.ts`
Expected: Test fails (RED).

**Step 2: Implement (GREEN)**

Implement `parseMarkerBlock(body: string): MarkerBlock | null` returning the typed shape from `design.md` (Posted-review-body Data Models). Use a tolerant HTML-comment + YAML-ish parser; do NOT bring in a full YAML dependency for this — single-line scalar parsing is sufficient.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/marker-parser.test.ts`
Expected: Test passes (GREEN).

**Step 3: Refactor**

Extract any shared regex constants. Confirm typed shape mirrors design Data Models exactly.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/marker-parser.test.ts && pnpm lint && pnpm type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/review-remote/marker-parser.ts packages/cli/src/review-remote/marker-parser.test.ts
git commit -m "feat(p01-t01): add review-marker parser"
```

---

### Task p01-t02: Add posted-review-body builder + verdict mapper

**Files:**

- Create: `packages/cli/src/review-remote/body-builder.ts`
- Create: `packages/cli/src/review-remote/body-builder.test.ts`

**Step 1: Write test (RED)**

- Produces a body matching `design.md` Posted-review-body schema for ad-hoc (no `oat_project` key) and project rail (with `oat_project`, `oat_review_scope` keys).
- Severity counts match the input findings.
- Minor-fix nudge ("Notes" subsection) is included when minor findings are present; omitted when severity counts are all zero.
- Marker block is the first element of the body (before any prose headings).
- Verdict mapping (separate exported function `mapVerdict(findings)`): `REQUEST_CHANGES` when any critical or important finding is present; `COMMENT` otherwise (including zero findings).
- `oat_review_invocation` value is round-trippable via the parser (cross-link test exercises the parser too).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/body-builder.test.ts`
Expected: Test fails (RED).

**Step 2: Implement (GREEN)**

Implement `buildReviewBody(input: BuildInput): { body: string; verdict: ReviewVerdict }` (or two exports — `buildReviewBody` + `mapVerdict`).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/body-builder.test.ts`
Expected: Test passes (GREEN).

**Step 3: Refactor**

Pull the marker block emission into a small helper that mirrors the parser's expected input — that's how we earn the round-trip test cheaply.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/body-builder.test.ts && pnpm lint && pnpm type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/review-remote/body-builder.ts packages/cli/src/review-remote/body-builder.test.ts
git commit -m "feat(p01-t02): add posted-review-body builder + verdict mapper"
```

---

### Task p01-t03: Add inline-comment line-mapping validator

**Files:**

- Create: `packages/cli/src/review-remote/line-mapper.ts`
- Create: `packages/cli/src/review-remote/line-mapper.test.ts`

**Step 1: Write test (RED)**

Test the validator against fixtures derived from real `gh api /pulls/<N>/files` output AND from synthetic `gh pr diff` unified diffs:

- Given hunk ranges + finding `file` + `line`, classifies as in-diff or out-of-diff with the correct side (`RIGHT` for additions/context, `LEFT` for explicit removed-code findings).
- Returns out-of-diff status without mutating the finding.
- Handles renamed files (path before vs after rename) per `gh api` `previous_filename` field.
- Handles binary files (no inline comments possible — always out-of-diff).
- Out-of-diff findings carry the original `file:line` reference into the returned classification (so the caller can downgrade them to a top-level "Findings outside the PR diff" subsection per design Error Handling).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/line-mapper.test.ts`
Expected: Test fails (RED).

**Step 2: Implement (GREEN)**

Two parsers + one validator:

- `parsePullFilesPatch(patch: string): HunkRange[]` for the `gh api files` case (per-file `patch` field).
- `parseUnifiedDiff(diff: string): Record<string, HunkRange[]>` for the `gh pr diff` fallback case (hunk headers `@@ -a,b +c,d @@`).
- `classifyFinding(finding, ranges): InDiffClassification | OutOfDiffClassification`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/line-mapper.test.ts`
Expected: Test passes (GREEN).

**Step 3: Refactor**

Confirm a single shared `HunkRange` shape for both parsers so `classifyFinding` doesn't need overloads.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/line-mapper.test.ts && pnpm lint && pnpm type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/review-remote/line-mapper.ts packages/cli/src/review-remote/line-mapper.test.ts
git commit -m "feat(p01-t03): add inline-comment line-mapping validator"
```

---

### Task p01-t04: Add re-review narrowing filter + stale-SHA guard

**Files:**

- Create: `packages/cli/src/review-remote/narrowing.ts`
- Create: `packages/cli/src/review-remote/narrowing.test.ts`

**Step 1: Write test (RED)**

- Given a list of reviews + `(rail, project, scope)` tuple, returns the most recent matching review or `null`.
- `(ad-hoc, null, "ad-hoc")` matches only reviews with `oat_review_scope == "ad-hoc"` AND no `oat_project` key.
- `(project, "<path>", "p02")` matches only reviews with matching project AND scope; rejects same project / different scope; rejects same scope / different project.
- Sort order is by review submitted timestamp, descending — newest matching review wins.
- **Stale-SHA guard** (from design Error Handling): given a stub `git` invoker, the filter calls existence + ancestry checks before declaring a narrowing range. Test cases:
  - Existence + ancestry both pass → returns narrow range.
  - Existence fails → returns `{ kind: "full-scope-fallback", reason: "stale-sha" }`.
  - Existence passes, ancestry fails → returns same fallback.
  - `--narrow` flag set AND guard fails → returns `{ kind: "hard-error", reason: "stale-sha" }` (caller stops).
  - `workflow.autoNarrowReReviewScope == true` → no prompt regardless of outcome.
- Diff-only mode (no ephemeral worktree available) → existence check goes through the stub's "fetch single ref" path; if fetch fails, fall back as for unreachable.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/narrowing.test.ts`
Expected: Test fails (RED).

**Step 2: Implement (GREEN)**

Implement `pickNarrowingTarget(...)` returning a discriminated-union result (`narrow-range` | `full-scope-fallback` | `hard-error`). Take a `GitInvoker` interface as a parameter so callers can pass either a worktree-bound invoker or a stub.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/narrowing.test.ts`
Expected: Test passes (GREEN).

**Step 3: Refactor**

Keep the `GitInvoker` interface narrow (existence check, ancestry check, optional single-ref fetch). Skill code will provide the real implementation; tests pass stubs.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/narrowing.test.ts && pnpm lint && pnpm type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/review-remote/narrowing.ts packages/cli/src/review-remote/narrowing.test.ts
git commit -m "feat(p01-t04): add re-review narrowing filter + stale-SHA guard"
```

---

### Task p01-t05: Add project resolution helper

**Files:**

- Create: `packages/cli/src/review-remote/project-resolver.ts`
- Create: `packages/cli/src/review-remote/project-resolver.test.ts`

**Step 1: Write test (RED)**

- Given a list of changed files from a PR diff, finds `.oat/projects/*/*/state.md` entries (two-level glob: scope/project).
- Returns single project path when exactly one matches.
- Returns error with candidate list when multiple match.
- Returns error when zero match.
- `--project <path>` override takes precedence over diff scan.
- Override validates that the path resolves to a directory containing `state.md`; returns clear error otherwise (covers the m1 review fix in design Manual Verification).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/project-resolver.test.ts`
Expected: Test fails (RED).

**Step 2: Implement (GREEN)**

Implement `resolveProject(diffFiles: string[], options: { overridePath?: string; pathExists?: (p: string) => boolean }): ResolveResult`. Pass `pathExists` so tests don't touch the real filesystem.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/project-resolver.test.ts`
Expected: Test passes (GREEN).

**Step 3: Refactor**

Confirm `ResolveResult` is a discriminated union mirroring narrowing's pattern.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/project-resolver.test.ts && pnpm lint && pnpm type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/review-remote/project-resolver.ts packages/cli/src/review-remote/project-resolver.test.ts
git commit -m "feat(p01-t05): add project resolution helper"
```

---

## Phase 2: `oat-review-provide-remote` (ad-hoc rail) — _parallel with p03, p05_

**Goal:** Ship the ad-hoc skill end-to-end.

**Worktree note:** This phase runs in a worktree per the Parallelism declaration. Its writes are confined to `.agents/skills/oat-review-provide-remote/` and `packages/cli/src/review-remote/__integration__/ad-hoc/`.

### Task p02-t01: Probe and capability matrix for `agent-reviews`

**Files:**

- Create: `packages/cli/src/review-remote/capability-probe.ts`
- Create: `packages/cli/src/review-remote/capability-probe.test.ts`

**Step 1: Write test (RED)**

- With a stubbed shell invoker returning a `--help` text that exposes a posting flag (exact name resolved via this task), probe returns `{ posting: "supported", flag: <name> }`.
- With stub returning unrelated help text → `{ posting: "not-supported" }`.
- With stub erroring on probe → `{ posting: "unknown" }` (caller falls back to `gh api`).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/capability-probe.test.ts`
Expected: Test fails (RED).

**Step 2: Implement (GREEN)**

Empirically probe `npx agent-reviews --help` once during this task — record the canonical flag (if any) and the exact text pattern in the test fixture. If no posting capability exists today, ship the probe + fallback wiring with `"not-supported"` as the expected current-state result; the probe is forward-compat for when `agent-reviews` gains the capability.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/capability-probe.test.ts`
Expected: Test passes (GREEN).

**Step 3: Refactor**

Cache the probe result on the invoker context so subsequent calls within a run don't re-probe.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/capability-probe.test.ts && pnpm lint && pnpm type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/review-remote/capability-probe.ts packages/cli/src/review-remote/capability-probe.test.ts
git commit -m "feat(p02-t01): add agent-reviews capability probe with gh api fallback"
```

---

### Task p02-t02: Worktree lifecycle helper

**Files:**

- Create: `packages/cli/src/review-remote/worktree.ts`
- Create: `packages/cli/src/review-remote/worktree.test.ts`

**Step 1: Write test (RED)**

Integration-style test against a temp git repo (use `mktemp -d` + `git init` in test setup):

- `acquireWorktree({ repoRoot })` creates an ephemeral path outside `repoRoot`, runs `git -C "$repoRoot" worktree add --detach`, and returns a handle.
- `runInWorktree(handle, async () => …)` resolves any callback inside the worktree.
- `releaseWorktree(handle)` runs `git -C "$repoRoot" worktree remove --force` AND removes the temp directory.
- Caller's `cwd` is unchanged after release.
- Release runs in a `finally` even when the inner callback throws.
- If `oat-worktree-bootstrap-auto` reuse is chosen, document the chosen contract in a code comment and gate the helper behind it — otherwise hand-roll per design.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/worktree.test.ts`
Expected: Test fails (RED).

**Step 2: Implement (GREEN)**

Implement the three exports above. Use the repo-scoped commands exactly as in design Data Flow step 2 (`git -C "$repo_root" …`).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/worktree.test.ts`
Expected: Test passes (GREEN).

**Step 3: Refactor**

Keep the helper agnostic to PR-checkout — `gh pr checkout` lives in the skill, not the helper. The helper just creates and cleans up an ephemeral worktree.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/worktree.test.ts && pnpm lint && pnpm type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/review-remote/worktree.ts packages/cli/src/review-remote/worktree.test.ts
git commit -m "feat(p02-t02): add ephemeral worktree lifecycle helper"
```

---

### Task p02-t03: Author `oat-review-provide-remote` SKILL.md and wire process

**Files:**

- Create: `.agents/skills/oat-review-provide-remote/SKILL.md`
- Create: `packages/cli/src/review-remote/__integration__/ad-hoc/round-trip.test.ts`

**Step 1: Write test (RED)**

Integration test exercising the round-trip:

- Build a posted-review-body for a known finding set via `body-builder`.
- Pass the produced body string through `marker-parser`.
- Assert parsed markers equal the input markers.
- Assert the verdict (`REQUEST_CHANGES` vs `COMMENT`) matches design rules.
- Assert minor-fix "Notes" subsection presence matches design rules.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/__integration__/ad-hoc/round-trip.test.ts`
Expected: Test fails (RED).

**Step 2: Implement (GREEN)**

Author `SKILL.md`:

- Frontmatter: `name: oat-review-provide-remote`, `version: 1.0.0`, `description` matching the pattern of `oat-review-receive-remote`, `disable-model-invocation: true`, `user-invocable: true`, `allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion`.
- Argument hint mirroring design Component Design interface.
- Mode assertion + BLOCKED / ALLOWED / Self-Correction per OAT skill convention.
- Process steps mirroring design Component Design + Data Flow + Error Handling: PR resolution → hybrid read (worktree mechanics from design) → marker-based re-review narrowing → inline review → `body-builder` → posting (`agent-reviews` if probed supported, else `gh api`) → cleanup.
- Output contract + success criteria.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/__integration__/ad-hoc/round-trip.test.ts && pnpm oat:validate-skills`
Expected: Tests pass; skill validates clean.

**Step 3: Refactor**

Confirm `SKILL.md` matches the style + section ordering of `oat-review-receive-remote` for consistency.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/__integration__/ad-hoc/ && pnpm oat:validate-skills && pnpm lint && pnpm type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add .agents/skills/oat-review-provide-remote/SKILL.md packages/cli/src/review-remote/__integration__/ad-hoc/round-trip.test.ts
git commit -m "feat(p02-t03): ship oat-review-provide-remote skill"
```

---

## Phase 3: `oat-reviewer` subagent contract extension — _parallel with p02, p05_

**Goal:** Add a structured-output mode to the existing `oat-reviewer` agent so the project-rail provide-remote skill's Tier 1 dispatch can request findings without writing an artifact.

**Worktree note:** Confined to `.agents/agents/oat-reviewer.md` only.

### Task p03-t01: Extend `oat-reviewer` with structured-output mode

**Files:**

- Modify: `.agents/agents/oat-reviewer.md`

**Step 1: Write test (RED)**

Documentation-as-test for an agent file: capture the prompt-flag name and structured-output contract in a new fixture under `packages/cli/src/review-remote/__integration__/reviewer-contract.test.ts` (this test runs in p04 — for p03 itself, the verification is the skill-validate step + a manual fixture review).

For p03's own verification, author or update an agent-validation snapshot test if one exists in the repo; otherwise rely on `pnpm oat:validate-skills` (which validates agent files in the same pass).

**Step 2: Implement (GREEN)**

Read existing `.agents/agents/oat-reviewer.md`. Decide flag name (recommended: `oat_output_mode: structured` in the dispatch payload, paralleling existing `oat_review_invocation` naming). Add a section describing structured-output mode:

- When dispatched with `oat_output_mode: structured`, the agent SHALL return a `StructuredFindings` object (schema in design Data Models) instead of writing an artifact file.
- Review logic (checklist, severity model, alignment checks) is unchanged.
- Verification commands are returned as an array, not appended to a file.
- The agent does NOT write to any path under `reviews/` when in this mode.

Bump `version:` in the agent frontmatter per the per-shipped-content rule.

Run: `pnpm oat:validate-skills`
Expected: Agent validates clean.

**Step 3: Refactor**

Confirm the prose for structured-output mode is short, unambiguous, and links to design's Data Models section.

**Step 4: Verify**

Run: `pnpm oat:validate-skills && pnpm lint`
Expected: No errors.

**Step 5: Commit**

```bash
git add .agents/agents/oat-reviewer.md
git commit -m "feat(p03-t01): add structured-output mode to oat-reviewer"
```

---

## Phase 4: `oat-project-review-provide-remote` (project rail)

**Goal:** Ship the project-aware skill. Depends on p01 helpers + p03 reviewer extension.

### Task p04-t01: Tier-1 dispatch wrapper for `oat-reviewer` structured-output mode

**Files:**

- Create: `packages/cli/src/review-remote/reviewer-dispatch.ts`
- Create: `packages/cli/src/review-remote/reviewer-dispatch.test.ts`

**Step 1: Write test (RED)**

- Wrapper accepts review context (project path, scope, posted-body schema reference, prior-narrowing result) and a dispatcher interface.
- Builds the dispatch payload with `oat_output_mode: structured` (or whatever flag name p03 chose — fixture asserts the chosen flag).
- On a stub dispatcher returning a well-formed `StructuredFindings`, the wrapper returns those findings unchanged.
- On dispatcher error, wrapper surfaces error to caller without retry (Tier 2/3 fallback decision lives in the skill).
- Schema validation: malformed `StructuredFindings` from dispatcher → wrapper raises typed error.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/reviewer-dispatch.test.ts`
Expected: Test fails (RED).

**Step 2: Implement (GREEN)**

Implement the wrapper. Use `zod` (if already a dep) or a hand-rolled validator for `StructuredFindings`. Reference the agent-prompt flag name from p03.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/reviewer-dispatch.test.ts`
Expected: Test passes (GREEN).

**Step 3: Refactor**

Keep the dispatcher interface narrow (`spawn(payload): Promise<RawAgentResponse>`). Skill code provides the real Claude Code / Cursor / Codex dispatcher; tests pass stubs.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/reviewer-dispatch.test.ts && pnpm lint && pnpm type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/review-remote/reviewer-dispatch.ts packages/cli/src/review-remote/reviewer-dispatch.test.ts
git commit -m "feat(p04-t01): add oat-reviewer Tier-1 dispatch wrapper"
```

---

### Task p04-t02: Author `oat-project-review-provide-remote` SKILL.md and wire process

**Files:**

- Create: `.agents/skills/oat-project-review-provide-remote/SKILL.md`
- Create: `packages/cli/src/review-remote/__integration__/project/project-rail.test.ts`

**Step 1: Write test (RED)**

Integration test:

- Synthetic PR-diff file list including `.oat/projects/foo/bar/state.md` mods → `project-resolver` returns `.oat/projects/foo/bar`.
- Multi-project synthetic diff → resolver errors with candidate list.
- Marker filter scoped to `(project=.oat/projects/foo/bar, scope=p02)` rejects markers for the same project with `scope=p03` and for different projects with `scope=p02`.
- End-to-end round-trip: build body with project markers via `body-builder`; parse via `marker-parser`; assert markers match including `oat_project` + `oat_review_scope`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/__integration__/project/project-rail.test.ts`
Expected: Test fails (RED).

**Step 2: Implement (GREEN)**

Author `SKILL.md`:

- Frontmatter mirroring `oat-project-review-provide` (project-scoped skill conventions).
- Mode assertion + BLOCKED / ALLOWED / Self-Correction.
- Argument hint per design Component Design interface: `[code <scope>|artifact <scope>] [--pr <N>] [--project <path>] [--no-checkout] [--narrow|--no-narrow]`.
- Process steps: PR resolution → project resolution (diff scan + `--project` override) → hybrid read (worktree) → re-review narrowing (project + scope filter + stale-SHA guard) → Tier 1/2/3 dispatch (Tier 1 calls `reviewer-dispatch` from p04-t01) → `body-builder` with project markers → posting.
- Output contract + success criteria.
- Read-only contract explicit: no `plan.md` updates, no commits, no pushes from this skill.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/__integration__/project/ && pnpm oat:validate-skills`
Expected: Tests pass; skill validates clean.

**Step 3: Refactor**

Cross-check the skill's process step naming against `oat-project-review-provide` for consistency (Tier 1/2/3 phrasing matches).

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/__integration__/project/ && pnpm oat:validate-skills && pnpm lint && pnpm type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-review-provide-remote/SKILL.md packages/cli/src/review-remote/__integration__/project/project-rail.test.ts
git commit -m "feat(p04-t02): ship oat-project-review-provide-remote skill"
```

---

## Phase 5: Receive-skill minor-default flip — _parallel with p02, p03_

**Goal:** Bring manual receive disposition defaults into line with auto-receive across all four receive skills.

**Worktree note:** Confined to the four receive `SKILL.md` files.

### Task p05-t01: Flip minor default in `oat-review-receive`

**Files:**

- Modify: `.agents/skills/oat-review-receive/SKILL.md`

**Step 1: Write test (RED)**

If receive-skill behavior tests exist under `packages/cli/src/.../oat-review-receive/`, extend them to cover:

- Default disposition for a minor finding is `convert`, not `defer`.
- User-supplied `defer` at minor severity triggers the rationale-required gate.
- If no such tests exist, document this verification as a manual check in `implementation.md` for this task and rely on `pnpm oat:validate-skills`.

**Step 2: Implement (GREEN)**

Edit the disposition section + rationale-gate language to flip minor default and extend the rationale-required rule to all severities. Bump `version:` per the per-shipped-content rule.

Run: `pnpm oat:validate-skills`
Expected: Skill validates clean.

**Step 3: Refactor**

Diff-check that the only changes are disposition-default + rationale-gate wording + `version:` bump.

**Step 4: Verify**

Run: `pnpm oat:validate-skills && pnpm lint`
Expected: No errors.

**Step 5: Commit**

```bash
git add .agents/skills/oat-review-receive/SKILL.md
git commit -m "feat(p05-t01): flip minor-default to convert in oat-review-receive"
```

---

### Task p05-t02: Flip minor default in `oat-review-receive-remote`

**Files:**

- Modify: `.agents/skills/oat-review-receive-remote/SKILL.md`

Steps 1-5: identical pattern to p05-t01, applied to `.agents/skills/oat-review-receive-remote/SKILL.md`. Bump `version:`.

```bash
git add .agents/skills/oat-review-receive-remote/SKILL.md
git commit -m "feat(p05-t02): flip minor-default to convert in oat-review-receive-remote"
```

---

### Task p05-t03: Flip minor default in `oat-project-review-receive`

**Files:**

- Modify: `.agents/skills/oat-project-review-receive/SKILL.md`

Steps 1-5: identical pattern to p05-t01, applied to `.agents/skills/oat-project-review-receive/SKILL.md`. Bump `version:`.

```bash
git add .agents/skills/oat-project-review-receive/SKILL.md
git commit -m "feat(p05-t03): flip minor-default to convert in oat-project-review-receive"
```

---

### Task p05-t04: Flip minor default in `oat-project-review-receive-remote`

**Files:**

- Modify: `.agents/skills/oat-project-review-receive-remote/SKILL.md`

Steps 1-5: identical pattern to p05-t01, applied to `.agents/skills/oat-project-review-receive-remote/SKILL.md`. Bump `version:`.

```bash
git add .agents/skills/oat-project-review-receive-remote/SKILL.md
git commit -m "feat(p05-t04): flip minor-default to convert in oat-project-review-receive-remote"
```

---

## Phase 6: Backlog update + lockstep release prep

**Goal:** Record the scope split in `bl-9fb8` and satisfy the lockstep public-package version + `pnpm release:validate` contract.

### Task p06-t01: Update `bl-9fb8` backlog item

**Files:**

- Modify: `.oat/repo/reference/backlog/items/pr-review-skill-set.md`
- Regenerate: `.oat/repo/reference/backlog/index.md` (via `oat backlog regenerate-index` or equivalent)

**Step 1: Write test (RED)**

No code test. The verification is `oat backlog regenerate-index` exits clean and the regenerated index reflects the updated item.

**Step 2: Implement (GREEN)**

Update `pr-review-skill-set.md` body:

- Note `oat-review-provide-remote` and `oat-project-review-provide-remote` shipped under project `remote-review`.
- Keep `oat-review-respond-remote`, `oat-project-review-respond-remote`, `oat-review-summarize-remote`, `oat-project-review-summarize-remote` as still-open work.
- Adjust acceptance criteria to scope to the remaining four skills.
- Update `priority_reviewed` and `updated` dates to today.

Regenerate the backlog index.

**Step 3: Refactor**

Confirm `status: open` remains correct (work is partially shipped but not done).

**Step 4: Verify**

Run: `oat backlog list --json | head -20`
Expected: `bl-9fb8` still listed as open; updated date reflects today.

**Step 5: Commit**

```bash
git add .oat/repo/reference/backlog/items/pr-review-skill-set.md .oat/repo/reference/backlog/index.md
git commit -m "chore(p06-t01): record provide-remote ship in bl-9fb8"
```

---

### Task p06-t02: Lockstep public-package version bump

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`

**Step 1: Write test (RED)**

No code test. Verification is `pnpm release:validate` (Step 4 below).

**Step 2: Implement (GREEN)**

Decide the version bump tier (likely minor: new skills + new helpers add shipped functionality). Bump all five `package.json` `version:` fields in lockstep to the same target version.

Run: `pnpm install --lockfile-only` to update the lockfile.

**Step 3: Refactor**

Confirm all five packages match exact version strings.

**Step 4: Verify**

Run: `pnpm release:validate`
Expected: Exits clean. Resolve any reported drift before committing.

**Step 5: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml
git commit -m "chore(p06-t02): lockstep version bump for remote-review release"
```

---

### Task p06-t03: Final `release:validate` + handoff

**Files:**

- None mutated in this task (validation only).

**Step 1: Write test (RED)**

N/A — validation task.

**Step 2: Implement (GREEN)**

Run the full validate sweep against the cumulative branch diff:

- `pnpm release:validate`
- `pnpm oat:validate-skills`
- `pnpm lint`
- `pnpm type-check`
- `pnpm test`

**Step 3: Refactor**

N/A.

**Step 4: Verify**

All five commands exit clean.

**Step 5: Commit**

No commit (validation only). If any validate step requires a fix-up commit (e.g., a missed version bump elsewhere), open it as `chore(p06-t03): fix-up for release validation` and re-run the sweep.

---

## Reviews

| Scope  | Type     | Status   | Date       | Artifact                                              |
| ------ | -------- | -------- | ---------- | ----------------------------------------------------- |
| p01    | code     | passed   | 2026-05-29 | reviews/p01-review-2026-05-29.md                      |
| p02    | code     | passed   | 2026-05-29 | reviews/p02-review-2026-05-29-v2.md                   |
| p03    | code     | pending  | -          | -                                                     |
| p04    | code     | pending  | -          | -                                                     |
| p05    | code     | pending  | -          | -                                                     |
| p06    | code     | pending  | -          | -                                                     |
| final  | code     | pending  | -          | -                                                     |
| design | artifact | passed   | 2026-05-29 | reviews/archived/artifact-design-review-2026-05-29.md |
| plan   | artifact | received | 2026-05-29 | reviews/artifact-plan-review-2026-05-29.md            |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 5 tasks — shared helpers (marker parser, body builder + verdict, line mapper, narrowing + stale-SHA guard, project resolver)
- Phase 2: 3 tasks — ad-hoc rail skill + capability probe + worktree helper
- Phase 3: 1 task — `oat-reviewer` structured-output mode
- Phase 4: 2 tasks — Tier-1 dispatch wrapper + project rail skill
- Phase 5: 4 tasks — minor-default flip across the four receive skills
- Phase 6: 3 tasks — `bl-9fb8` update + lockstep bump + final validate

**Total: 18 tasks**

After these tasks complete, the project will be ready for code review and merge.

---

## References

- Design: `design.md`
- Discovery: `discovery.md`
- Spec: N/A (quick mode)
- Backlog item: `.oat/repo/reference/backlog/items/pr-review-skill-set.md` (`bl-9fb8`)
