---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-06-28
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p04']
oat_auto_review_at_hill_checkpoints: true
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
document explicit trusted-target configuration without adding a read-only review
mode or making dangerous provider flags built-in defaults.

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

- [x] Deferred HiLL checkpoint selection to `oat-project-implement`
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
- project resolution is explicit: the command uses the active project when it is
  unambiguous, accepts an explicit project path/name option, and errors clearly
  when no project or multiple project candidates are resolvable
- the review prompt is passed to the selected target
- after a zero child exit, the command resolves the produced review artifact and
  returns exit `1` when Critical or Important findings exist
- the dispatched prompt includes a standardized gate context note instructing
  the review provider to write `oat_review_invocation: gate`
- clean review artifacts return exit `0`
- nonzero child exits stay nonzero and are not masked by artifact parsing
- child stdout/stderr from the selected provider is streamed or captured and
  surfaced so permission denials do not look like silent hangs
- output includes the produced review path and a handoff message to run
  `oat-project-review-receive`
- command help snapshot includes the new subcommand

Recommended command shape for implementation:

```bash
oat gate review \
  --target codex-5.5-xhigh \
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
- resolves the project before dispatch using the same active-project semantics
  as `oat review latest`; if no project or more than one plausible project can
  be resolved, fail with an actionable error before running the provider
- wraps or prefixes the user prompt with a concise gate context note:
  "This review is gate-originated. If you run `oat-project-review-provide`, set
  `oat_review_invocation: gate` in the review artifact."
- executes the child target first and preserves nonzero child exit codes
- streams provider child output by default, or captures and prints buffered
  output on failure, so Claude permission prompts and similar provider denials
  are visible to the host
- records a before/after review-artifact discovery window using the resolved
  project and `oat review latest --project <PROJECT_PATH> --json` semantics or
  equivalent internal scanning of active top-level project reviews
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
  packages/cli/src/commands/help-snapshots.test.ts
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
- `oat-project-review-provide` remains model-invokable with
  `disable-model-invocation: false` and retains its prose Model Invocation Gate
  so Claude can invoke it only for explicit review requests
- `oat-project-review-provide` has allowed-tools broad enough for its actual
  workflow: reading files, writing review artifacts, running `oat` commands,
  running verification commands such as `pnpm`, and committing review
  bookkeeping
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
- Preserve `disable-model-invocation: false` on
  `oat-project-review-provide`; do not re-disable model invocation.
- Keep the existing prose Model Invocation Gate that restricts model invocation
  to explicit review asks or confirmed review steps.
- Expand `oat-project-review-provide` `allowed-tools` as needed so Claude gate
  reviews can run the skill end-to-end without failing immediately after skill
  invocation is allowed.
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

### Task p02-t02: Normalize Gate-Aware Skill Handoff

**Files:**

- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`
- Modify: `.agents/skills/oat-project-import-plan/SKILL.md`
- Modify: `.agents/skills/oat-project-plan/SKILL.md`
- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Write/adjust validation tests (RED)**

Add tests that assert:

- `oat-project-quick-start` frontmatter includes `oat_gateable: true`
- `oat-project-import-plan` frontmatter includes `oat_gateable: true`
- quick-start and import-plan contain a Gate Execution step
- all four gate-aware lifecycle skills (`oat-project-plan`,
  `oat-project-implement`, `oat-project-quick-start`, and
  `oat-project-import-plan`) surface the same review-artifact handoff contract:
  when a gate reports a produced review artifact, the host must receive and
  disposition it with `oat-project-review-receive` before treating the review as
  consumed
- skill version bump expectations remain untouched in this content task; p04-t01
  owns every changed skill/agent `version:` bump and matching expectation update

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
```

Expected: tests fail before the skill updates.

**Step 2: Implement (GREEN)**

Update the gate-aware skill files:

- Add `oat_gateable: true` to frontmatter.
- Add a final Gate Execution step to quick-start/import-plan after artifact
  review, state sync, dashboard refresh, and artifact commit.
- Update existing `oat-project-plan` and `oat-project-implement` Gate Execution
  steps with the same review-artifact + `oat-project-review-receive` handoff
  wording.
- Ensure gate command examples use `oat gate review ...` or `oat gate ...`, not
  absolute dev-build paths.
- Preserve existing quick-start/import-plan artifact review loops.
- Do not bump skill versions in this task. p04-t01 is the single owner for all
  skill/agent version bumps in this PR.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
```

Expected: validation tests pass.

**Step 3: Refactor**

Keep the Gate Execution wording consistent across all four gate-aware lifecycle
skills. The command output owns the exact artifact path, while skill prose owns
the lifecycle rule that gate-produced reviews must be received/dispositioned.

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
  .agents/skills/oat-project-plan/SKILL.md \
  .agents/skills/oat-project-implement/SKILL.md \
  packages/cli/src/validation/skills.test.ts
git commit -m "feat(p02-t02): normalize gate-aware handoff"
```

---

### Task p02-t03: Sync Provider Views for Changed Skills and Agents

**Files:**

- Modify: `.oat/sync/manifest.json`
- Modify: provider-generated views under `.claude/`, `.cursor/`, and `.codex/`
  as produced by `oat sync --scope all`

**Step 1: Run sync**

Provider views in this repo are normally symlink-backed. Existing skill content
edits may therefore produce no `.claude/`, `.cursor/`, or `.codex/` content
diffs. This step is hygiene: refresh the manifest, catch added/removed entries,
and verify sync health.

Run:

```bash
oat sync --scope all
```

Expected: sync completes. Provider-view diffs are not required when existing
views are symlinks.

**Step 2: Inspect generated changes**

Run:

```bash
git status --short
git diff -- .oat/sync/manifest.json .claude .cursor .codex
```

Expected: any generated changes correspond only to changed canonical
skills/agents; an empty diff is acceptable.

**Step 3: Verify**

Run:

```bash
pnpm run oat:validate-skills
```

Expected: validation still passes after sync.

**Step 4: Commit**

```bash
git add .oat/sync/manifest.json .claude .cursor .codex
git diff --cached --quiet || git commit -m "chore(p02-t03): sync provider views"
```

---

## Phase 3: Documentation and Config Examples

### Task p03-t01: Document Stateful Review Gates and Trusted Targets

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
- Built-in targets are conservative defaults. Trusted noninteractive gates that
  need to run tools without hanging on provider approval prompts should be
  configured by the user in `workflow.gates.execTargets`, not baked into OAT
  built-ins.
- Claude default permission mode can block on `Skill(oat-project-review-provide)`,
  `oat`, `pnpm`, and shell/tool calls. Docs should show how a trusted user can
  opt into `--dangerously-skip-permissions` or
  `--permission-mode bypassPermissions`.
- Codex examples should make sandbox/approval bypass explicit for trusted gate
  automation with `--dangerously-bypass-approvals-and-sandbox`, even if the
  user's default profile currently makes it work.
- Cursor examples should show `--force` and mention `--yolo` as its documented
  alias.

Use `oat gate ...` in every durable command example.

**Step 2: Add explicit trusted-target examples**

Document user-level target setup examples that express review model, effort, and
provider permission behavior in target config rather than dispatch ceiling
inference or built-in defaults. Mark these as trusted-environment examples; users
must choose them deliberately.

```bash
oat gate target set codex-5.5-xhigh \
  --runtime codex \
  --base-command-json '["codex","exec","--model","gpt-5.5","-c","model_reasoning_effort=\"xhigh\"","--dangerously-bypass-approvals-and-sandbox"]' \
  --availability-json '["codex","--version"]' \
  --priority 120 \
  --layer user

oat gate target set claude-opus-skip-permissions \
  --runtime claude \
  --base-command-json '["claude","-p","--model","opus","--dangerously-skip-permissions"]' \
  --availability-json '["claude","--version"]' \
  --priority 115 \
  --layer user

oat gate target set cursor-force \
  --runtime cursor \
  --base-command-json '["cursor-agent","-p","--force"]' \
  --availability-json '["cursor-agent","--version"]' \
  --priority 90 \
  --layer user
```

Then show gate setup with `oat gate review --target codex-5.5-xhigh ...`, and
explain that leaving `--target` unset lets target priority choose the highest
available non-host runtime.

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
- Trusted provider permission flags are user-level gate target configuration and
  documentation guidance, not new built-in defaults.

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
versions asset. Bump every changed canonical skill/agent frontmatter `version:`
exactly once for the final PR diff, including files changed by p02-t01 and
p02-t02. Update skill-version test expectations for every bumped skill/agent.
This is the single owner for skill/agent version bumps; earlier content tasks do
not bump versions.

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
pnpm check
pnpm type-check
pnpm build
pnpm test
pnpm build:docs
pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main
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
- A Claude trusted target using `--dangerously-skip-permissions` can invoke
  `oat-project-review-provide` without stalling on permission prompts.
- Provider permission-denial output is visible when a target cannot run the
  requested gate.

Do not leave temp fixtures in the repo.

**Step 4: Commit final bookkeeping**

```bash
git add .oat/projects/shared/workflow-gate-improvements/implementation.md
git diff --cached --quiet || git commit -m "chore(p04-t02): record workflow gate validation"
```

---

## Reviews

| Scope  | Type     | Status   | Date       | Artifact                                               |
| ------ | -------- | -------- | ---------- | ------------------------------------------------------ |
| p01    | code     | passed   | 2026-06-29 | reviews/archived/p01-review-2026-06-29-v2.md           |
| p02    | code     | passed   | 2026-06-29 | reviews/archived/p02-review-2026-06-29.md              |
| p03    | code     | passed   | 2026-06-29 | reviews/archived/p03-review-2026-06-29-v2.md           |
| p04    | code     | passed   | 2026-06-29 | reviews/archived/p04-review-2026-06-29.md              |
| final  | code     | received | 2026-06-29 | reviews/final-review-2026-06-29-v3.md                  |
| spec   | artifact | pending  | -          | -                                                      |
| design | artifact | pending  | -          | -                                                      |
| plan   | artifact | passed   | 2026-06-28 | reviews/archived/artifact-plan-review-2026-06-28-v2.md |

**Status values:** `pending` → `received` → `fixes_added` →
`fixes_completed` → `passed`

Spec/design artifact review rows are retained for canonical table shape. They
are not applicable in this quick-mode project unless a later workflow promotion
adds those artifacts.

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
- Phase 2: 3 tasks - tag gate review provenance, normalize gate-aware handoff,
  and sync provider views
- Phase 3: 2 tasks - update workflow gate docs/trusted-target guidance and repo
  reference notes
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
