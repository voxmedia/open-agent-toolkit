---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-06-28
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: [] # phases to pause AFTER completing (empty = every phase)
oat_plan_parallel_groups: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: workflow-gate-improvements

> Execute this plan using `oat-project-implement` — sequential by default,
> parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Make cross-provider review gates enforce blocking review findings,
carry review provenance/handoff state, run for quick/import plan paths, and
document explicit high-effort target configuration without adding a read-only
review mode.

**Architecture:** Add a review-specific gate command on top of the existing
`oat gate cross-provider-exec` executor. The wrapper invokes the configured
cross-provider review prompt, resolves the review artifact that was produced,
parses a machine-checkable verdict/counts contract, reports the artifact handoff,
and returns a nonzero exit when configured severity thresholds are met.

**Tech Stack:** TypeScript CLI (`packages/cli`), canonical OAT skills under
`.agents/skills`, docs app content under `apps/oat-docs`, Vitest, oxlint/oxfmt,
and OAT release validation.

**Commit Convention:** `{type}({scope}): {description}` - e.g.,
`feat(p01-t01): add review gate verdict parsing`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

This plan is sequential. The CLI gate wrapper, review artifact contract, skill
Gate Execution instructions, docs, generated provider views, and release package
metadata are coupled enough that parallel phases would create avoidable merge
and review drift. Keep all phases on one branch and verify after each commit.

---

## Phase 1: Review Gate CLI Semantics

### Task p01-t01: Add Review Artifact Verdict Parsing

**Files:**

- Create: `packages/cli/src/commands/gate/review-verdict.ts`
- Create: `packages/cli/src/commands/gate/review-verdict.test.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Step 1: Write tests (RED)**

Create parser tests for review artifacts with:

- frontmatter containing `oat_review_type`, `oat_review_scope`,
  `oat_review_invocation`, and optional explicit verdict/count fields
- Findings sections with `### Critical`, `### Important`, `### Medium`, and
  `### Minor`
- clean artifacts where every blocking section is `None`
- artifacts with one Important finding and no nonzero child process status
- malformed/missing artifacts that return an actionable parse error

Expected parser contract:

```ts
interface ReviewGateVerdict {
  artifactPath: string;
  reviewType: 'code' | 'artifact' | 'unknown';
  scope: string | null;
  invocation: string | null;
  counts: {
    critical: number;
    important: number;
    medium: number;
    minor: number;
  };
  blocking: boolean;
}
```

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/review-verdict.test.ts
```

Expected: tests fail because the parser does not exist.

**Step 2: Implement (GREEN)**

Implement a conservative parser:

- Prefer explicit machine-readable frontmatter counts/verdict if present.
- Fall back to parsing the standard Findings section headings.
- Treat `None`, `None.`, empty section content, and whitespace-only content as
  zero findings.
- Count markdown list items or numbered findings in each severity section.
- Default the blocking threshold to Critical+Important.
- Return an error instead of guessing when the artifact cannot be read or has no
  recognizable findings structure.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/review-verdict.test.ts
```

Expected: parser tests pass.

**Step 3: Refactor**

Keep the parser independent of process execution so it can be unit tested and
used by any future review-gate wrapper without spawning providers.

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/review-verdict.test.ts src/commands/gate/index.test.ts
pnpm --filter @open-agent-toolkit/cli exec tsc --noEmit
```

Expected: scoped tests and type check pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/gate/review-verdict.ts \
  packages/cli/src/commands/gate/review-verdict.test.ts \
  packages/cli/src/commands/gate/index.test.ts
git commit -m "feat(p01-t01): add review gate verdict parsing"
```

---

### Task p01-t02: Add Review-Specific Gate Command

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Write tests (RED)**

Add `oat gate review` command tests covering:

- dispatch uses the existing target registry/cross-provider execution behavior
- the review prompt is passed to the selected target
- after a zero child exit, the command resolves the produced review artifact and
  returns exit `1` when Critical or Important findings exist
- the dispatched prompt includes a standardized gate context note instructing
  the review provider to write `oat_review_invocation: gate`
- clean review artifacts return exit `0`
- nonzero child exits stay nonzero and are not masked by artifact parsing
- output includes the produced review path and a handoff message to run
  `oat-project-review-receive`
- command help snapshot includes the new subcommand

Recommended command shape for implementation:

```bash
oat gate review \
  --target codex-review-xhigh \
  --review-scope plan \
  --review-type artifact \
  --exit-nonzero-on important \
  "Use oat-project-review-provide artifact plan to review the current project plan. Use project state to determine the most appropriate review scope. Return blocking findings clearly, or say no blocking findings."
```

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts src/commands/help-snapshots.test.ts
```

Expected: tests fail because `gate review` does not exist.

**Step 2: Implement (GREEN)**

Add a `review` subcommand that:

- reuses the existing target registry, runtime detection, avoidance, and
  explicit `--target` behavior
- defaults to `--avoid same-runtime`
- wraps or prefixes the user prompt with a concise gate context note:
  "This review is gate-originated. If you run `oat-project-review-provide`, set
  `oat_review_invocation: gate` in the review artifact."
- executes the child target first and preserves nonzero child exit codes
- records a before/after review-artifact discovery window using
  `oat review latest --project <activeProject> --json` semantics or equivalent
  internal scanning of active top-level project reviews
- loads the newest active review artifact produced by the dispatch
- parses the verdict with the parser from p01-t01
- exits nonzero when the configured severity threshold is met
- prints the artifact path, verdict summary, and receive handoff

Do not change generic `cross-provider-exec`; it must continue to exit with the
child status for arbitrary non-review commands.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts src/commands/help-snapshots.test.ts
```

Expected: tests pass.

**Step 3: Refactor**

If artifact resolution duplicates `oat review latest` logic, extract only the
small shared helper needed for active project review selection. Avoid expanding
ad-hoc review behavior in this task.

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts src/commands/review/__tests__/latest.test.ts src/commands/help-snapshots.test.ts
pnpm --filter @open-agent-toolkit/cli exec tsc --noEmit
```

Expected: gate, latest-review, help snapshot, and type-check verification pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/gate/index.ts \
  packages/cli/src/commands/gate/index.test.ts \
  packages/cli/src/commands/help-snapshots.test.ts \
  packages/cli/src/commands/gate/review-verdict.ts \
  packages/cli/src/commands/gate/review-verdict.test.ts
git commit -m "feat(p01-t02): add review gate command"
```

---

### Task p01-t03: Add Dev-Build Command Warning Polish

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Step 1: Write tests (RED)**

Add `oat gate set` tests covering:

- commands beginning with `oat gate ...` are accepted without warning
- commands containing `node .../packages/cli/dist/index.js gate ...` are still
  accepted but emit a warning in human output
- JSON output includes a non-fatal warning array for dev-build absolute gate
  commands
- the warning explains that durable docs/config should reference `oat`, with
  absolute dev-build paths reserved for local development of unmerged behavior

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts
```

Expected: tests fail because the warning does not exist.

**Step 2: Implement (GREEN)**

Add a lightweight detector for gate command strings that look like absolute
dev-build CLI paths. Keep it advisory only; do not reject the command.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts
```

Expected: tests pass.

**Step 3: Refactor**

Keep the detector narrow. It should catch obvious `node .../packages/cli/dist/index.js gate`
usage without warning on unrelated absolute paths used inside provider target
commands.

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts
pnpm --filter @open-agent-toolkit/cli exec tsc --noEmit
```

Expected: scoped tests and type check pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/gate/index.ts packages/cli/src/commands/gate/index.test.ts
git commit -m "feat(p01-t03): warn on dev-build gate commands"
```

---

## Phase 2: Lifecycle Skill Integration

### Task p02-t01: Tag Gate-Produced Review Artifacts

**Files:**

- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`
- Modify: `.agents/skills/oat-project-review-receive/SKILL.md`
- Modify: `.agents/agents/oat-reviewer.md`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Write/adjust contract checks (RED)**

Add or update skill validation tests so:

- `oat-project-review-provide` documents
  `oat_review_invocation: manual|auto|gate`
- `oat-project-review-receive` recognizes `gate` review invocation
- `oat-reviewer` documents that gate review artifacts should expose verdict
  counts or standard Findings sections compatible with the gate parser

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
```

Expected: tests fail until skill docs are updated.

**Step 2: Implement (GREEN)**

Update the review skills and reviewer agent:

- Add `gate` as a first-class `oat_review_invocation` value.
- Specify that gate-originated reviews use normal stateful review-provide
  behavior: artifact write, Reviews row update, and bookkeeping commit.
- Require the review artifact summary to include enough severity counts or
  standard Findings sections for `oat gate review` to parse.
- In receive, treat `gate` as standard/manual disposition unless a later
  implementation explicitly designs an autonomous receive path.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
```

Expected: validation tests pass.

**Step 3: Refactor**

Keep gate provenance language aligned between provide, receive, and reviewer
instructions. Do not add read-only/inline-only gate behavior.

**Step 4: Verify**

Run:

```bash
pnpm run oat:validate-skills
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
```

Expected: skill validation passes.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-review-provide/SKILL.md \
  .agents/skills/oat-project-review-receive/SKILL.md \
  .agents/agents/oat-reviewer.md \
  packages/cli/src/validation/skills.test.ts
git commit -m "feat(p02-t01): tag gate review provenance"
```

---

### Task p02-t02: Make Quick-Start and Import-Plan Gate-Aware

**Files:**

- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`
- Modify: `.agents/skills/oat-project-import-plan/SKILL.md`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Write/adjust validation tests (RED)**

Add tests that assert:

- `oat-project-quick-start` frontmatter includes `oat_gateable: true`
- `oat-project-import-plan` frontmatter includes `oat_gateable: true`
- both skills contain a Gate Execution step matching the standard semantics used
  by `oat-project-plan`/`oat-project-implement`
- quick-start/import-plan skill version expectations are bumped

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
```

Expected: tests fail before the skill updates.

**Step 2: Implement (GREEN)**

Update both skill files:

- Add `oat_gateable: true` to frontmatter.
- Add a final Gate Execution step after artifact review, state sync, dashboard
  refresh, and artifact commit.
- Ensure gate command examples use `oat gate review ...` or `oat gate ...`, not
  absolute dev-build paths.
- Preserve existing quick-start/import-plan artifact review loops.
- Bump each changed skill's frontmatter `version:` once for this PR.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
```

Expected: validation tests pass.

**Step 3: Refactor**

Keep the Gate Execution wording consistent with `oat-project-plan` and
`oat-project-implement`, but mention the review gate handoff: if `oat gate
review` reports a produced review artifact, the host must receive/disposition it
before proceeding.

**Step 4: Verify**

Run:

```bash
pnpm run oat:validate-skills
```

Expected: skill validation passes with no new gateability warnings.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-quick-start/SKILL.md \
  .agents/skills/oat-project-import-plan/SKILL.md \
  packages/cli/src/validation/skills.test.ts
git commit -m "feat(p02-t02): make quick and import plan gates gate-aware"
```

---

### Task p02-t03: Sync Provider Views for Changed Skills and Agents

**Files:**

- Modify: `.oat/sync/manifest.json`
- Modify: provider-generated views under `.claude/`, `.cursor/`, and `.codex/`
  as produced by `oat sync --scope all`

**Step 1: Run sync**

Run:

```bash
oat sync --scope all
```

Expected: provider views update for changed canonical skills/agents.

**Step 2: Inspect generated changes**

Run:

```bash
git status --short
git diff -- .oat/sync/manifest.json .claude .cursor .codex
```

Expected: generated changes correspond only to changed canonical skills/agents.

**Step 3: Verify**

Run:

```bash
pnpm run oat:validate-skills
```

Expected: validation still passes after sync.

**Step 4: Commit**

```bash
git add .oat/sync/manifest.json .claude .cursor .codex
git commit -m "chore(p02-t03): sync provider views"
```

---

## Phase 3: Documentation and Config Examples

### Task p03-t01: Document Stateful Review Gates and Handoff

**Files:**

- Modify: `apps/oat-docs/docs/cli-utilities/workflow-gates.md`
- Modify: `apps/oat-docs/docs/cli-utilities/config-and-local-state.md`
- Modify: `apps/oat-docs/docs/reference/cli-reference.md`
- Modify: `apps/oat-docs/index.md` only via generated index if required

**Step 1: Draft docs**

Update docs to explain:

- `cross-provider-exec` remains a generic child-status executor.
- `oat gate review` is the review-specific gate path that maps review findings
  to blocking exit status.
- Gate reviews are intentionally stateful and equivalent to running
  `oat-project-review-provide` in another terminal/provider.
- Review artifacts, Reviews row updates, and bookkeeping commits are expected.
- Gate-produced review artifacts use `oat_review_invocation: gate`.
- After a gate review produces an artifact, the host must run or hand off to
  `oat-project-review-receive` before treating the review as dispositioned.

Use `oat gate ...` in every durable command example.

**Step 2: Add explicit high-effort target examples**

Document user-level target setup examples that express review effort/model in
target config rather than dispatch ceiling inference. For Codex, prefer the
generated reviewer variant/profile mechanism already used by OAT where possible,
and include the locally verified CLI override shape only if it is accurate:

```bash
oat gate target set codex-review-xhigh \
  --runtime codex \
  --base-command-json '["codex","exec","-c","model_reasoning_effort=\"xhigh\""]' \
  --availability-json '["codex","--version"]' \
  --priority 110 \
  --layer user
```

Then show gate setup with `oat gate review --target codex-review-xhigh ...`.

**Step 3: Verify docs locally**

Run:

```bash
pnpm build:docs
```

Expected: docs build passes.

**Step 4: Commit**

```bash
git add apps/oat-docs/docs/cli-utilities/workflow-gates.md \
  apps/oat-docs/docs/cli-utilities/config-and-local-state.md \
  apps/oat-docs/docs/reference/cli-reference.md \
  apps/oat-docs/index.md
git commit -m "docs(p03-t01): document review gate handoff"
```

---

### Task p03-t02: Refresh Repo Reference Notes

**Files:**

- Modify: `.oat/repo/reference/current-state.md`
- Modify: `.oat/repo/reference/decision-record.md`
- Modify: `.oat/repo/reference/project-summaries/20260628-workflow-end-triggers.md`
- Modify: `.oat/repo/reference/backlog/items/gate-same-target-execution.md` only
  if wording must clarify that same-target V2 remains separate

**Step 1: Update reference docs**

Record that the follow-up narrows V1 fixes to semantic review gates and lifecycle
handoff. Preserve the Gates V2 boundary:

- V1 review-gate semantics and handoff are fixed here.
- Same-target/model-level target detection stays deferred.
- Dispatch ceilings remain separate from gate target config.

**Step 2: Verify**

Run:

```bash
pnpm run oat:validate-skills
```

Expected: no skill validation regressions.

**Step 3: Commit**

```bash
git add .oat/repo/reference/current-state.md \
  .oat/repo/reference/decision-record.md \
  .oat/repo/reference/project-summaries/20260628-workflow-end-triggers.md \
  .oat/repo/reference/backlog/items/gate-same-target-execution.md
git commit -m "docs(p03-t02): refresh workflow gate reference notes"
```

---

## Phase 4: Release Readiness and Full Verification

### Task p04-t01: Apply Required Version Bumps

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json`
- Modify: frontmatter `version:` in every changed canonical skill/agent that
  requires version tracking
- Modify: any test expectation that pins a changed skill version

**Step 1: Determine bump target**

Because this PR changes CLI behavior, docs, and bundled skills/assets, bump the
lockstep public package set together. Choose the next patch version after the
current package version.

**Step 2: Update versions**

Update all five public package manifests and the generated public package
versions asset. Update skill-version test expectations for any changed skills.

**Step 3: Verify release metadata**

Run:

```bash
pnpm release:check-versions
```

Expected: release version check passes.

**Step 4: Commit**

```bash
git add packages/cli/package.json \
  packages/control-plane/package.json \
  packages/docs-config/package.json \
  packages/docs-theme/package.json \
  packages/docs-transforms/package.json \
  packages/cli/assets/public-package-versions.json \
  .agents/skills \
  .agents/agents \
  packages/cli/src/validation/skills.test.ts
git commit -m "chore(p04-t01): bump workflow gate release versions"
```

---

### Task p04-t02: Run Final Validation Sweep

**Files:**

- Modify: `.oat/projects/shared/workflow-gate-improvements/implementation.md`
  during implementation bookkeeping only

**Step 1: Run scoped checks**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts src/commands/gate/review-verdict.test.ts src/commands/review/__tests__/latest.test.ts src/validation/skills.test.ts src/commands/help-snapshots.test.ts
```

Expected: all scoped tests pass.

**Step 2: Run workspace checks**

Run:

```bash
pnpm lint
pnpm type-check
pnpm test
pnpm build:docs
pnpm release:validate
```

Expected: all required checks pass.

**Step 3: Manual smoke test**

Create a temporary test project/review fixture or use a temp repo directory to
verify:

- `oat gate review` exits `1` when the produced/latest review artifact has an
  Important finding.
- `oat gate review` exits `0` for a clean artifact.
- `oat gate set` warns for a dev-build absolute command but accepts it.
- `oat gate set` does not warn for `oat gate ...` commands.

Do not leave temp fixtures in the repo.

**Step 4: Commit final bookkeeping**

```bash
git add .oat/projects/shared/workflow-gate-improvements/implementation.md
git diff --cached --quiet || git commit -m "chore(p04-t02): record workflow gate validation"
```

---

## Reviews

| Scope  | Type     | Status   | Date       | Artifact                                   |
| ------ | -------- | -------- | ---------- | ------------------------------------------ |
| p01    | code     | pending  | -          | -                                          |
| p02    | code     | pending  | -          | -                                          |
| p03    | code     | pending  | -          | -                                          |
| p04    | code     | pending  | -          | -                                          |
| final  | code     | pending  | -          | -                                          |
| spec   | artifact | pending  | -          | -                                          |
| design | artifact | pending  | -          | -                                          |
| plan   | artifact | received | 2026-06-28 | reviews/artifact-plan-review-2026-06-28.md |

**Status values:** `pending` → `received` → `fixes_added` →
`fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks - add review verdict parsing, review-specific gate command,
  and dev-build command warning polish
- Phase 2: 3 tasks - tag gate review provenance, make quick/import gate-aware,
  and sync provider views
- Phase 3: 2 tasks - update workflow gate docs and repo reference notes
- Phase 4: 2 tasks - apply release/version bumps and run final validation

**Total: 10 tasks**

Ready for implementation.

---

## References

- Discovery: `discovery.md`
- Workflow gates docs: `apps/oat-docs/docs/cli-utilities/workflow-gates.md`
- Gate CLI: `packages/cli/src/commands/gate/index.ts`
- Review latest CLI: `packages/cli/src/commands/review/latest.ts`
- Review provider skill: `.agents/skills/oat-project-review-provide/SKILL.md`
- Review receive skill: `.agents/skills/oat-project-review-receive/SKILL.md`
- Quick-start skill: `.agents/skills/oat-project-quick-start/SKILL.md`
- Import-plan skill: `.agents/skills/oat-project-import-plan/SKILL.md`
