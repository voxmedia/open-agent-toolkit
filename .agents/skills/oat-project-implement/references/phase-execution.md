# Phase Execution

This reference preserves the route-specific implementation contract. Load it only when the entry skill routes execution here.

### Step 5: Per-Phase Execution

For each phase `pNN` in the plan (or each phase in a plan-declared parallel
worktree group), dispatch exactly one phase coordinator. The coordinator reads
the phase once and dispatches one exact task worker per task. It must not
implement ordinary plan tasks in its own context.

#### Resolve the Task Maximum

Before coordinator dispatch, read the project named ceiling from
`state.md:oat_dispatch_policy.policy`. Then inspect the optional plan
`## Dispatch Profile` row for this phase:

1. An explicit phase `economy`, `balanced`, `high`, or `frontier` narrows the
   project maximum and sets `task_ceiling_source: phase`.
2. Blank, absent, or `auto` uses the project maximum and sets
   `task_ceiling_source: project`.
3. Reject an unknown tier or a phase tier above the project tier.
4. `uncapped` and explicit inherit/default retain their existing policy
   semantics and have no named `--ceiling-tier`; never synthesize one.

The project or phase named ceiling is a maximum, not the coordinator target or
an exact family preference. Under High, lower configured Economy, Balanced, and
High candidates remain available for different tasks.

#### Capture the Immutable Review-Ceiling Envelope

Before coordinator dispatch, resolve the configured reviewer once with
`--role reviewer --preflight --non-interactive --json` and the phase's
`--report-scope`, `--report-action review`, and `--project-path`. Do not pass
`--ceiling-tier`. Copy this immutable envelope into Phase Scope:

- top-level `policy` and resolver-vocabulary `source` (for example,
  `project-state`);
- `providers.$ACTIVE_PROVIDER.selection.ceilingTier`;
- the exact `providers.$ACTIVE_PROVIDER.selection.target`; and
- the complete `providers.$ACTIVE_PROVIDER.dispatchArgs`, `modelAxis`, and
  `effortAxis`.

This preflight snapshot does not select native/CLI execution mechanics and does
not launch a reviewer. The coordinator independently re-resolves the reviewer,
validates the live result byte-for-byte against this envelope, then owns route
selection and launch. An unresolved snapshot blocks coordinator dispatch.

#### Build and Dispatch Phase Scope

```yaml
project: {PROJECT_PATH}
phase: {pNN}
mode: implement
artifact_paths:
  plan: {PROJECT_PATH}/plan.md
  design: {PROJECT_PATH}/design.md
  spec: {PROJECT_PATH}/spec.md
  implementation: {PROJECT_PATH}/implementation.md
  discovery: {PROJECT_PATH}/discovery.md
workflow_mode: {spec-driven|quick|import}
active_provider: {codex|claude|cursor|other}
project_ceiling_tier: {named project maximum; omit when none}
phase_ceiling_tier: {explicit narrower phase maximum; omit for auto/blank}
task_ceiling_tier: {effective project or phase named ceiling}
task_ceiling_source: {project|phase}
review_ceiling_tier: {review envelope selection.ceilingTier; implementation review is not narrowed by phase task ceiling}
review_expected_policy: {review envelope policy}
review_ceiling_source: {review envelope source in resolver vocabulary}
review_expected_target: {review envelope providers.$ACTIVE_PROVIDER.selection.target}
review_expected_dispatch_args: {review envelope providers.$ACTIVE_PROVIDER.dispatchArgs}
review_expected_model_axis: {review envelope providers.$ACTIVE_PROVIDER.modelAxis}
review_expected_effort_axis: {review envelope providers.$ACTIVE_PROVIDER.effortAxis}
commit_convention: {from plan.md}
coordinator_target: {resolver-selected coordinator target}
```

Tier 1 uses the already resolved exact coordinator role/model payload and sends
the Phase Scope. A concrete Codex coordinator uses
`providers.codex.dispatchArgs.variant` first as native `agent_type`. After the
host accepts the spawn, record the coordinator `target`, `model_axis`, and
`effort_axis` from resolver output and that constructed launcher payload; do not
wait for or accept a coordinator self-report as proof. Only an actual native
role-selection rejection permits the fresh child pinned to the resolver's model
and effort with canonical coordinator instructions. An accepted coordinator
that later returns `BLOCKED` has produced a coordinator outcome and cannot
trigger fallback. Claude and Cursor coordinator calls pass their exact resolver
model argument.

Tier 2 may run the coordinator instructions in the current context only when
that context can still dispatch every exact task worker. Tier 2 never permits
the coordinator to edit ordinary task files. If no exact worker route exists,
block before phase work.

#### Per-Task Coordinator Contract

For each task in dependency order, the coordinator must:

1. Classify only that bounded task and choose one configured candidate at or
   below `task_ceiling_tier`.
2. Call the exact candidate resolver with the invocation-only named maximum:

   ```bash
   oat project dispatch-ceiling resolve \
     --provider <active-provider> \
     --role implementer \
     --ceiling-tier <project-or-phase-named-tier> \
     --candidate-model <exact-model> \
     --report-scope <task-id> \
     --report-action implementation \
     --project-path "$PROJECT_PATH" \
     --json
   ```

   Codex also passes `--candidate-effort <exact-effort>`. The returned top-level
   `source` must be `invocation`; `providers.<provider>.cellSource` continues to
   identify the config layer that owns the candidate definition. This command
   is read-only and must never persist its override.

3. Build the actual provider invocation before logging:
   - Codex first uses `providers.codex.dispatchArgs.variant` as native
     `agent_type`. Spawn acceptance establishes the configured invocation; only
     a native role-selection rejection permits the exact fresh pinned-child
     model/effort route.
   - Claude passes `providers.claude.dispatchArgs.model` as the actual Task
     `model`.
   - Cursor passes `providers.cursor.dispatchArgs.model` byte-for-byte as the
     actual invocation model. Treat the string as opaque and never normalize or
     infer capability from it.
   - After construction, record the task-worker `target`, `model_axis`, and
     `effort_axis` from resolver output and the launcher payload. Missing worker
     telemetry or self-report is not unavailability, and self-report cannot
     replace those launcher-owned values.
4. Send one bounded Task Scope, never the full phase task list:

   ```yaml
   mode: task-worker
   task_id: { one pNN-tNN ID }
   task_name: { task title }
   task_plan: { only this task's steps }
   file_boundary: { only this task's files }
   verification: { only this task's verification commands }
   commit_convention: { exact expected task commit }
   ceiling_tier: { effective named maximum }
   ceiling_source: { project|phase }
   dispatch_target: { resolver-returned exact target }
   dispatch_args: { complete actual provider payload }
   ```

5. Dispatch one exact task worker and wait for its terminal result before the
   next task. Workers in the same worktree run serially; task fan-out is
   forbidden. Parallelism remains limited to plan-declared phase/worktree
   groups.
6. Verify the worker's task ID, result, tests, file boundary, clean worktree,
   and reported commit against `git rev-parse HEAD` and the pre-task HEAD. A
   worker must contribute exactly one verified task commit.
7. Record each task's exact target, result, and commit in the returned **Task
   Dispatch Summary**, then perform phase-wide verification and integration
   self-review without editing ordinary task files.

If a candidate is missing or absent, exceeds or is above the named ceiling, or
cannot be invoked with exact controls, fail closed and block the phase. Never
fall back or downgrade to the coordinator target, base role, or inferred
provider default. A pre-start transport retry reuses the same complete provider
payload. After acceptance, continuation uses only the existing child handle; a
terminal outcome cannot launch a replacement. A separately authorized
substantive escalation re-resolves within the same named maximum and bounded
retry limit.

#### Handling Coordinator Status

- **DONE:** verify the Task Dispatch Summary and passing Review Dispatch
  Summary, then proceed to review disposition.
- **DONE_WITH_CONCERNS:** verify the passing review; record only non-blocking
  Medium/Minor concerns.
- **REVIEW_FAILED:** verify the review artifact and convert its
  Critical/Important findings into bounded fix scopes.
- **NEEDS_CONTEXT:** supply only the missing context and retry within the bound.
- **BLOCKED:** stop and surface the phase, task, exact target, and reason. Do not
  proceed to later phases.

### Per-Phase Review

The phase coordinator owns implementation self-review. Do not dispatch a second
outer reviewer. Require its Coordination Report to include:

- the authoritative phase commit range and review artifact;
- a `Review Dispatch Summary` with ordered candidates, reason, route, exact
  target, launch status, and child outcome;
- proof that the reviewer used the project review ceiling, not a narrower phase
  task ceiling;
- for a Cursor CLI route, current nested-catalog mismatch plus exact
  `cursor-agent --list-models` validation before launch;
- no replacement launch after acceptance.

Verify the artifact exists, its scope and commit range match, and the summary is
consistent with the shared dispatch contract. Missing or contradictory evidence
blocks the phase.

**Verdict outcomes:**

Parse the coordinator-owned review artifact and Review Dispatch Summary for
verdict + finding severities. Map to pass / fail:

- **pass:** zero Critical and zero Important findings.
- **fail:** one or more Critical or Important findings.
- **blocked:** An accepted reviewer `BLOCKED` terminal blocks this phase review.
  It does not invoke fallback and must not be interpreted as a pass due to
  absent findings. Stop and surface the review target and blocker reason.

Medium / Minor findings do not block the phase but are recorded.

#### Bounded Fix Loop

On reviewer verdict `fail`, run a bounded fix loop.

1. Read `oat_orchestration_retry_limit` from `state.md` frontmatter (default: `2`, range 0–5).
2. For each retry (up to the limit):
   a. Convert Critical/Important findings into bounded fix scopes associated with one planned task/file boundary at a time. Do not hand one worker the full phase finding list.
   b. Reuse the phase coordinator in `fix` mode. It selects an exact candidate under the same project or phase named ceiling with `--ceiling-tier`, then emits one Task Scope per bounded fix. Codex first uses `providers.codex.dispatchArgs.variant` as native `agent_type`; only a native role-selection rejection permits the exact fresh-child fallback. Claude and Cursor pass their exact `providers.<provider>.dispatchArgs.model` value on the actual invocation. After constructing the launcher payload, record the fix `target`, `model_axis`, and `effort_axis` from that payload and resolver output. Missing fix-worker telemetry or self-report is not unavailability, and an accepted fix worker — including one that returns `BLOCKED` — cannot trigger fallback. Every fix worker writes the formal `Dispatch: scope=<phase-or-task> action=fix role=fix producer=<slug|unknown> provenance=<declared|observed|inferred|unknown> model_axis=<axis> effort_axis=<axis> dispatch_policy=<policy|unknown> dispatch_ceiling=<value|none> target=<target|unknown>` stamp before execution.
   c. Receive and verify each fix result and commit. The coordinator must not apply fixes itself, and Tier 2 does not authorize inline task edits.
   d. Require the fix-mode coordinator to dispatch the coordinator-owned
   reviewer with the updated commit range and return the new artifact and
   Review Dispatch Summary. The outer workflow never launches a duplicate
   reviewer.
   e. Parse the new verdict.
   f. If pass → exit the loop successfully.
   g. If fail and retries remain → continue.
   h. If fail and retries exhausted → exit the loop with terminal verdict `failed`.

**Terminal `failed` handling:**

- **Sequential mode:** STOP the run. Surface to user with phase ID, unresolved findings, review artifact path. Do not proceed to subsequent phases.
- **Parallel group mode:** mark the phase `excluded`. Do not merge its worktree. Continue the remaining phases in the group. Report in Outstanding Items after the group completes.

### Optional External Phase Review Gate

After the standard per-phase reviewer passes and after the required phase bookkeeping commit is cleanly recorded, check `oat_phase_review_gate`.

If the gate is enabled and the current phase is selected:

1. Run the gate from the orchestration branch with the active project path:

   ```bash
   oat --json gate review \
     --project "$PROJECT_PATH" \
     --review-type code \
     --review-scope "{pNN}" \
     --exit-nonzero-on "{threshold}" \
     '$oat-project-review-provide code {pNN}'
   ```

   - `{threshold}` comes from `oat_phase_review_gate.exit_nonzero_on` (default: `important`).
   - `{pNN}` is the completed phase ID.
   - Do not pass `--target` in normal execution; the existing gate config selects the cross-provider target.
   - The gate CLI injects gate context into the review prompt. The produced review artifact must use `oat_review_invocation: gate`.

2. Parse the JSON result. Before invoking review-receive, all three receive-eligibility conditions must hold: `status` is `ok` or `blocked`, the envelope explicitly sets `receiveEligible: true`, and `handoff` is non-null. A missing or contradictory field is an operational failure even when `artifactPath` is present. The gate verdict (`exit_nonzero_on: {threshold}`) decides whether the phase **stops**; it does not decide whether sub-threshold findings are ignored. Once eligibility is established, the produced artifact must be **consumed** — passing gate artifacts are not left unprocessed at the top level of `reviews/`.
   - With eligibility established, `status: "ok"` / exit code `0` means the phase gate passed at the configured threshold, so the phase does not stop. Run `oat-project-review-receive` for the reported artifact path in non-pausing **judgment-sweep** mode (pass gate-passed context so receive selects sweep disposition). The sweep makes a per-finding judgment for each Medium/Minor — defer to final (default), address now (small/contained/low-risk fixes only), or reject with rationale — writes those durable dispositions into `implementation.md`, and archives the artifact. Then continue without pausing. Address-now fixes from a passing gate do **not** re-trigger the standard reviewer or re-gate the phase.
   - With eligibility established, `status: "blocked"` / non-zero exit due to review findings means blocking findings exist. Run `oat-project-review-receive` for the reported artifact path (blocking disposition) before treating the gate review as consumed.
   - Any other status, or a non-zero exit caused by target execution failure, artifact validation failure, or missing review artifact, is an operational failure. Stop and surface the gate output; do not continue as if the gate passed.

3. If `oat-project-review-receive` adds fix tasks (blocking gate, or a sweep address-now fix that revealed a Critical/Important concern):
   - Return to task execution for the newly added review-fix tasks.
   - After fixes land, re-run the standard per-phase reviewer and this external phase gate for the same phase.
   - Continue only after both the standard reviewer and the external phase gate pass.
   - Bound these gate block → fix → re-gate rounds by `oat_orchestration_retry_limit` (from `state.md`, default `2`). If the limit is exhausted with the gate still blocking, apply the same terminal handling as the standard bounded fix loop: **sequential mode** stops the run and surfaces the phase ID, unresolved findings, and artifact path; **parallel group mode** marks the phase `excluded` and reports it in Outstanding Items.

4. If the judgment sweep (passing gate) records only deferrals/rejections and no blocking fix tasks, record the receive result and continue.

For a parallel group, run selected phase gates after fan-in and bookkeeping, one gate per successfully merged phase in plan order. If a phase gate blocks, stop the schedule and process that gate's review before starting later schedule entries.

### Parallel Group Execution

When the current schedule entry is a multi-phase group, execute as follows.

**Tier 2 degradation:** If Tier 2 was selected at skill start, Tier 2 cannot run concurrent subagents. Degrade the group to sequential target-preserving execution on the orchestration branch. Do not create worktrees. For every phase, retain the exact role or pinned fresh child; inline is permitted only by the verified-equivalent-controls or documented-exception guard. Proceed through the per-phase loop in plan order.

**Tier 1 parallel execution:**

1.  **Bootstrap worktrees:** for each phase in the group, invoke `oat-worktree-bootstrap-auto` with branch name `{project-name}/{pNN}` and base = orchestration branch.

    > ⚠️ **CRITICAL — DO NOT substitute host-native worktree primitives.** Bootstrap MUST go through `oat-worktree-bootstrap-auto` with an explicit `--base` set to the current orchestration branch HEAD (capture `EXPECTED_HEAD=$(git rev-parse HEAD)` from the orchestration cwd before dispatching). Do not use Claude Code's `Agent({ isolation: "worktree" })`, Cursor's equivalent, or any other host-native isolation primitive in lieu of this skill — those mechanisms may use the primary repo's checkout (often `main`) as the base regardless of the orchestrator's current branch, silently producing a worktree that cannot see prior phase commits and forcing the entire group to degrade to sequential.
    - If **any** bootstrap fails, cancel any worktrees that bootstrapped successfully for this group and degrade the whole group to sequential target-preserving execution. Log the degradation reason to `implementation.md` Outstanding Items.

2.  **Verify worktree HEAD before dispatch (base-mismatch gate):** After bootstrap, verify each worktree is at the expected orchestration HEAD. From the orchestration cwd, capture `EXPECTED_HEAD=$(git rev-parse HEAD)` _before_ invoking bootstrap. After bootstrap, for each new worktree path, run `git -C {worktree-path} rev-parse HEAD` and confirm it matches `EXPECTED_HEAD`, or run `git -C {worktree-path} merge-base --is-ancestor "$EXPECTED_HEAD" HEAD` and confirm it succeeds (exit 0). If either check fails for any phase, treat the bootstrap as failed for that phase, cancel any successful sibling worktrees in this group, and degrade the entire group to sequential target-preserving execution — same mechanism as a primary bootstrap failure. Log the mismatch to `implementation.md` Outstanding Items, including the observed and expected SHAs (`expected={EXPECTED_HEAD}, observed={observed-head-sha}, phase={pNN}, worktree={path}`).

3.  **Concurrent phase dispatch:** for each successfully bootstrapped worktree (passing the base-mismatch gate above), dispatch one `oat-phase-implementer` coordinator with the worktree as its working directory. Coordinators may run concurrently across these plan-declared phase worktrees, but every coordinator dispatches its own task workers serially in that one worktree. The outer orchestration loop retains review and bounded-fix handling.

4.  **Wait for all phases:** do not proceed until every phase in the group reports a terminal verdict (pass or excluded).

5.  **Fan-in reconciliation (merge back in plan order):**

    For each phase in the group, in plan order (p02 before p03, etc.), if its verdict is pass:

    a. Attempt `git merge --no-ff {project-name}/{pNN} -m "merge({pNN}): {summary from implementer}"`.
    b. If merge produces conflicts, abort the merge and attempt cherry-pick of the phase's commits.
    c. If cherry-pick also produces conflicts, dispatch an inline conflict-resolution subagent via the Task tool. The orchestrator MUST NOT read the conflicted files itself — delegate to the subagent. Use this dispatch shape:

        ```
        Task (general-purpose subagent):
          description: "Resolve merge conflict for phase {pNN}"
          prompt: |
            You are resolving a git merge conflict during parallel-phase fan-in.

            Phase: {pNN}
            Orchestration branch: {orchestration-branch}
            Worktree: {worktree-path}
            Conflicted files: {list from git status}
            Project artifacts:
              plan:   {PROJECT_PATH}/plan.md
              design: {PROJECT_PATH}/design.md
              spec:   {PROJECT_PATH}/spec.md

            Steps:
            1. Read each conflicted file. Parse conflict markers (<<<<<<<, =======, >>>>>>>).
            2. Read the project artifacts to understand intent from both sides.
            3. Apply a resolution that preserves intent from both sides where possible.
            4. Remove conflict markers. Save files.
            5. Stage resolved files with `git add <files>`.
            6. Run integration verification: `pnpm test && pnpm lint && pnpm type-check`.
            7. If all pass: commit with `merge({pNN}): resolved conflict during fan-in`.
            8. If any step fails: do NOT commit. Return with the appropriate status.

            Return format (end of response):
              status: RESOLVED | UNRESOLVABLE | VERIFICATION_FAILED
              reasoning: <2-4 sentence summary of what you did or why you stopped>
              commit: <sha if RESOLVED, else null>
        ```

    d. Parse the subagent's return status: - `RESOLVED` → subagent has committed the merge; orchestrator proceeds to integration verification (Step 6) and the next phase in the group. - `UNRESOLVABLE` or `VERIFICATION_FAILED` → STOP the run. Surface to user with phase ID, conflicting files, worktree path, subagent's reasoning summary. Do not merge remaining phases.

    **Tier 2 conflict exception:** In Tier 2 runs, parallel groups already degrade to sequential, so fan-in conflicts do not arise from this code path. If a conflict surfaces from another operation, inline resolution is allowed only when the current-host controls satisfy the same verified-equivalence or documented-exception guard; otherwise stop for a target-preserving route.

6.  **Integration verification after each merge:**

    After each successful merge, run project verification (tests, lint, type-check). If verification fails:
    - Attempt a tractable fix (missing import, trivial type error). If the fix succeeds and verification passes, commit the fix.
    - If the fix is not tractable → revert the merge, STOP the run. Surface to user.

7.  **Worktree cleanup:**

    For phases that merged successfully and passed integration verification, clean up the worktree using the existing worktree cleanup mechanism (e.g., `git worktree remove`).

    For phases that were excluded (fix-loop exhausted), preserve the worktree and log its path in `implementation.md` Outstanding Items.

8.  **Bookkeeping commit** after the group completes. Then run any selected external phase review gates. After those gates pass, perform the HiLL checkpoint check.

### Step 7: Artifact Updates After Each Phase (or Group)

After each phase (sequential) or each parallel group (multi-phase) completes, update the tracking artifacts before moving on.

**`implementation.md`:**

Append a new entry to the `## Orchestration Runs` section between the `<!-- orchestration-runs-start -->` and `<!-- orchestration-runs-end -->` markers. Format:

```markdown
### Run {N} — {YYYY-MM-DD HH:MM}

**Branch:** {orchestration-branch}
**Tier:** {1 | 2}
**Policy:** merge-strategy=merge, retry-limit={N}
**Phases:** {N} executed, {N} passed, {N} failed, {N} stopped

#### Phase Outcomes

| Phase | Implementer | Review | Fix Iterations | Disposition |
| ----- | ----------- | ------ | -------------- | ----------- | ------- | -------- | -------- |
| pNN   | {status}    | {pass  | fail}          | N/{limit}   | {merged | excluded | stopped} |

#### Parallel Groups

- Group {N} [{phase list}]: worktree-based, merged in order
- {singleton phases}: sequential

#### Dispatch Notes

- Dispatch stamps: {formal `Dispatch: ...` records, plus route level and escalation rationale when applicable}
- `selection_reason`: {`native-catalog` | `native-catalog-unsatisfying` | `pre-start-rejection` | `inherit` | `gate-target`}
- `candidates_considered`: {exact ordered provider strings considered before launch}

#### Outstanding Items

- {None | list of excluded phases with review paths and worktree paths}

#### Artifact / Design Deltas

Run-scoped snapshot only. The durable record is `## Deviations from Plan / Design`; consolidate any non-`None` entries there at the next phase boundary.

| Task / Review                 | Source Artifact                     | Planned / Documented            | Actual / Accepted                      | Reason                       | Source of Truth           | Follow-up                                   |
| ----------------------------- | ----------------------------------- | ------------------------------- | -------------------------------------- | ---------------------------- | ------------------------- | ------------------------------------------- |
| {task_id/review_id or `None`} | {spec.md/design.md/plan.md section} | {planned behavior/taxonomy/API} | {actual shipped behavior/taxonomy/API} | {why divergence is accepted} | {implementation/artifact} | {artifact update task or explicit deferral} |
```

Append only — never overwrite prior run entries.

**`plan.md` review table:**

For each phase that completed:

- Pass on first try → set phase row to `passed` with date + review artifact path.
- Pass after fixes → set to `fixes_added` → `fixes_completed` → `passed` (match existing lifecycle).
- Fix-loop exhausted → leave at `fixes_added` with "excluded" note in the artifact link.
- `final` review row is never touched by this skill.

**`state.md`:**

- Update `oat_current_task` to the next un-run task ID (or the final task if run complete).
- Update `oat_last_commit` to the bookkeeping commit SHA about to be made.
- Update `oat_project_state_updated` to current ISO 8601 UTC timestamp.
- If `oat_execution_mode: subagent-driven` is present, remove the key.
- If the user supplied a `--retry-limit` override, persist as `oat_orchestration_retry_limit`.

**Bookkeeping commit (mandatory):**

```bash
oat state refresh
git add {PROJECT_PATH}/implementation.md {PROJECT_PATH}/state.md {PROJECT_PATH}/plan.md
git commit -m "chore(oat): bookkeeping after {pNN} {pass|fail}"
```

Then run the optional external phase review gate for the completed phase when `oat_phase_review_gate` selects it. After the gate passes or is skipped, check the HiLL checkpoint. A non-final checkpoint pauses at this boundary; defer a final-phase checkpoint to **Final HiLL Closeout Sequence** after final verification, final review, and any configured pre-approval steps succeed.

### Step 8: Check Plan Phase Completion

When all tasks in current plan phase complete (e.g., all p01-\* tasks done):

**Update frontmatter:**

```yaml
oat_current_task_id: { first_task_of_next_phase } # e.g., p02-t01
```

**Plan phase checkpoint:**
At the end of each plan phase (p01, p02, etc.), check `oat_plan_hill_phases` in plan.md to decide whether to pause:

- **If `oat_plan_hill_phases` is empty (`[]`):** Pause after every phase (default behavior after confirmation).
- **If `oat_plan_hill_phases` has values:** Pause only after completing a listed phase.
  - Example: `["p01", "p04"]` → pause after p01 completes and after p04 completes; skip p02, p03.
  - Example: `["p03"]` where p03 is the last phase → run all phases without pausing, then pause after p03 (end of implementation).
- **If `oat_plan_hill_phases` is missing at a phase boundary:** treat this as bookkeeping drift and stop to repair it before continuing, because the confirmation should already have been written during the first implementation run.

**Key semantic: listed phases are where you stop AFTER completing them, not before.** `["p03"]` means "complete p03, then pause" — not "pause before starting p03."

**Auto-review at HiLL checkpoints (Touchpoint B):**

Before pausing at a checkpoint, check if auto-review is enabled:

1. Read `oat_auto_review_at_hill_checkpoints` from plan.md frontmatter. If not present, fall back to legacy `oat_auto_review_at_checkpoints`. If neither is present, fall back to `oat config get workflow.autoReviewAtHillCheckpoints` (which itself falls back to legacy `.oat/config.json` `autoReviewAtCheckpoints` when unset).

2. If enabled and this is a checkpoint phase:
   a. **Determine review scope:** Find the highest completed implementation phase already covered by a **`passed`** code-review row in plan.md Reviews table. Count only whole-phase scopes: `pNN` or `pNN-pMM`. Ignore task scopes (`pNN-tNN`) and rows with `fixes_added` or `fixes_completed` because those reviews did not pass and must be re-covered. Scope = every implementation phase after that passed coverage through the current phase, inclusive. If no earlier passed whole-phase review exists, start from the first implementation phase. Use `pNN-pMM` when the scope spans multiple phases. If this is the final implementation phase checkpoint, run `oat-project-review-provide code final`; use scope `final` and do not run a duplicate final phase-only lifecycle review, because Tier 1 already runs the standard per-phase reviewer before the final checkpoint branch.
   - Example: prior passed row `p01`, current checkpoint `p03` → review `p02-p03`
   - Example: no prior passed whole-phase review, current checkpoint `p03` → review `p01-p03`
   - Example: current checkpoint is the last implementation phase → review `final`
     b. **Spawn subagent review:** `oat-project-review-provide code {scope}` — instruct it to include `oat_review_invocation: auto` in the review artifact frontmatter.
     c. **Auto-invoke review-receive:** `oat-project-review-receive` — operates in auto-disposition mode when `oat_review_invocation: auto` is present:
   - Critical/Important/Medium: convert to fix tasks (same as manual)
   - Minor: auto-convert to fix tasks unless clearly out of scope
   - No user prompts for disposition
     d. **If fix tasks added:** continue implementing automatically (no checkpoint pause — return to Step 5 for the new fix tasks)
     e. **If scope passed:** proceed to the checkpoint pause below

3. If disabled: skip directly to the checkpoint pause.

When pausing at a non-final checkpoint:

- Output phase summary (tasks completed, commits made)
- Ask user: "Phase {N} ({phase_name}) complete. Continue to next phase?"
- Wait for user approval before proceeding to next plan phase

**Final checkpoint deferral:** If the current phase is the final implementation
phase and it is configured as a HiLL checkpoint, do not ask the generic
"Continue to next phase?" question. Final checkpoint auto-review above still
runs exactly as written, including `oat-project-review-provide code final` and
its no-duplicate-final-review rule. Then continue through Steps 9–14. Final
approval occurs only in **Final HiLL Closeout Sequence**, after final review and
the stored pre-approval sequence complete.

**Restart safety (required):**

- At the end of each task and at each phase boundary, ensure `implementation.md` is persisted and internally consistent:
  - `oat_current_task_id` points at the next task to do (or `null` when complete)
  - Phase status sections match the progress overview table
  - The implementation log reflects what was actually completed

**Phase summaries (required):**

- When a plan phase completes (p01, p02, etc.), update the "Phase Summary" section in `implementation.md` for that phase:
  - Outcome (behavior-level)
  - Key files touched (paths)
  - Verification run
  - Notable decisions/deviations

**Design/artifact deltas (required when present):**

- If a completed task intentionally diverged from `spec.md`, `design.md`, or `plan.md`, update the `## Deviations from Plan / Design` table in `implementation.md`.
- For existing project artifacts, treat any `## Deviations...` heading as the deviations section; migrate to the preferred `## Deviations from Plan / Design` heading and table shape when already touching the section.
- Each delta must include: the affected source artifact/section, the planned/documented expectation, the actual shipped implementation, the reason the divergence is accepted, the current source of truth, and any follow-up artifact update task or explicit deferral.
- If the implementation is now source of truth and the design/spec/plan is stale, write that directly. Do not treat the stale artifact as a no-op just because code is correct.
- If no deltas exist for the phase, do not invent one; leave the table unchanged.

**Bookkeeping commit (required):**

**DO NOT SKIP.** This commit prevents state drift across sessions.

After phase summary and task pointer advancement, refresh the repo dashboard when available and commit all modified project tracking files:

```bash
oat state refresh
git add "$PROJECT_PATH/implementation.md" "$PROJECT_PATH/state.md" "$PROJECT_PATH/plan.md"
git diff --cached --quiet || git commit -m "chore(oat): update tracking artifacts for {phase} completion"
```

Do not use `git add -A` or glob patterns. Only commit the three project artifacts listed above; `.oat/state.md` is a generated, gitignored dashboard.

**Note on HiLL types:**

- **Workflow HiLL** (`oat_hill_checkpoints` in state.md): Gates between workflow phases (discovery → spec → design → plan → implement). Checked by oat-project-progress router.
- **Plan phase checkpoints** (`oat_plan_hill_phases` in plan.md): Gates at plan phase boundaries during implementation. `[]` means pause after every phase; a populated array pauses only after listed phases. The field may be absent only before the first implementation-run confirmation. Listed phases are where you stop AFTER completing them. A checkpoint on the final implementation phase is deferred to final closeout so final verification, final review, and configured pre-approval work finish before explicit approval.
- **Phase review gate** (`oat_phase_review_gate` in plan.md): Optional non-pausing external review gate after a completed phase passes the standard reviewer. Missing/disabled means skip; `phases: []` means gate every implementation phase. Passing gates continue automatically; blocking gates are received/fixed before execution proceeds.

**Revision phase completion handling:**

When all tasks in a `p-revN` phase complete (revision phases created by `oat-project-revise`):

1. Set `oat_phase_status: pr_open` (not `complete` — the PR is still open for further review)
2. Set `oat_current_task: null`
3. Invoke `oat-project-summary` to update summary.md if it exists (implement owns summary re-generation at revision phase completion, not the revise skill)
4. Update next milestone: "Revision complete. Push changes to update PR. Run `oat-project-revise` for more feedback or `oat-project-complete` when approved."
5. Push changes to update the PR branch

This is different from regular phase completion — revision phases return to `pr_open` instead of continuing to the next phase, because the user needs to decide whether more revisions are needed.

### Step 9: Repeat Until Complete

Continue Steps 5-8 until all plan phases complete.

**Batch execution:**

- Default: Execute tasks one at a time
- If user requests: Execute N tasks before checking in
- Stop at configured plan phase boundaries for review
