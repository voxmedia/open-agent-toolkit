# Completion And Closeout

This reference preserves the route-specific implementation contract. Load it only when the entry skill routes execution here.

### Step 10: Handle Blockers

If a task cannot be completed:

**Mark as blocked:**

```yaml
oat_blockers:
  - task_id: { task_id } # e.g., p01-t03
    reason: '{description}'
    since: { date }
```

**Update task status:**

```markdown
### Task {task_id}: {Task Name}

**Status:** blocked
**Blocker:** {description}
```

**Notify user:**

```
Task {task_id} blocked: {reason}

Options:
1. Resolve blocker and continue
2. Skip task (mark as deferred)
3. Modify plan to address blocker
```

### Step 11: Mark Implementation Complete

When all plan tasks are complete (i.e., there is no next incomplete `pNN-tNN` task):

**Update "Final Summary" (required):**

- Before requesting final review / running `oat-project-pr-final`, update the `## Final Summary (for PR/docs)` section in `"$PROJECT_PATH/implementation.md"`:
  - What shipped (capabilities, behavior-level)
  - Key files/modules touched
  - Verification performed (tests/lint/typecheck/build/manual)
  - Design deltas (if any)
- This should reflect **what was actually implemented**, including any deviations from design and any review-fix work.

Update frontmatter:

```yaml
---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: { today }
oat_current_task_id: null
---
```

**Important:** `oat_current_task_id` should never point at an already-completed task. If all tasks are done, set it to `null` and proceed to the final review gate.

### Step 12: Update Project State

Update `"$PROJECT_PATH/state.md"` so other skills reflect task completion and review gating:

**Frontmatter updates:**

- `oat_current_task: null`
- `oat_last_commit: {final_commit_sha}`
- `oat_blockers: []`
- `oat_phase: implement`
- `oat_phase_status: in_progress` (until final review passes)
- `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`
- **If** `"implement"` is in `oat_hill_checkpoints`: append `"implement"` to `oat_hill_completed` array

**Note:** Only append to `oat_hill_completed` when the phase is configured as a HiLL gate.

Update content:

```markdown
## Current Phase

Implementation - Tasks complete; awaiting final review.

## Progress

- ✓ Discovery complete
- ✓ Specification complete
- ✓ Design complete
- ✓ Plan complete
- ✓ Implementation tasks complete
- ⧗ Awaiting final review
```

**Bookkeeping commit (required):**

**DO NOT SKIP.** This commit prevents state drift across sessions.

After updating state.md to reflect implementation completion, refresh the repo dashboard when available and commit all modified project tracking files:

```bash
oat state refresh
git add "$PROJECT_PATH/implementation.md" "$PROJECT_PATH/state.md" "$PROJECT_PATH/plan.md"
git diff --cached --quiet || git commit -m "chore(oat): update tracking artifacts for implementation complete"
```

Do not use `git add -A` or glob patterns. Only commit the three project artifacts listed above; `.oat/state.md` is a generated, gitignored dashboard.

### Step 13: Final Verification

Run project-wide verification:

```bash
# Run tests
pnpm test

# Run lint
pnpm lint

# Run type check
pnpm type-check

# Run build
pnpm build
```

All must pass before proceeding.

### Step 14: Trigger Final Review

**At the final plan phase boundary, a code review is required before PR.**

An accepted reviewer `BLOCKED` terminal blocks final review. It does not invoke
fallback and must not be interpreted as a pass due to absent findings. Stop and
surface the review target and blocker reason.

Before requesting final review, ensure the latest project-artifact bookkeeping is already committed. Review should evaluate the implementation state as it actually stands on the branch, not a half-tracked working tree.

Check if final review already completed (preferred source of truth: plan.md Reviews table):

```bash
REVIEWS_SECTION=$(awk '
  /^## Reviews[[:space:]]*$/ { in_reviews = 1; next }
  in_reviews && /^##[[:space:]]/ { exit }
  in_reviews { print }
' "$PROJECT_PATH/plan.md" 2>/dev/null)
FINAL_ROW=$(printf '%s\n' "$REVIEWS_SECTION" | grep -E "^\\|\\s*final\\s*\\|\\s*code\\s*\\|" | tail -1)
echo "$FINAL_ROW"
```

`REVIEWS_SECTION` is strictly the `## Reviews` section through the next
level-two heading. `FINAL_ROW` is the latest appended event in that ledger
matching Scope `final` and Type `code`. Earlier events remain history and must
not override the latest event. When fixes advance this event, match its artifact
filename and never move its status backward.

**If final review row exists and status is `passed`:**

- Example row:
  - `| final | code | passed | 2026-01-28 | reviews/final-review-2026-01-28T140322Z.md |`
- Check:

  ```bash
  echo "$FINAL_ROW" | grep -qE "^\\|\\s*final\\s*\\|.*\\|\\s*passed\\s*\\|" && echo "passed"
  ```

  - Continue to Step 15 (final closeout)

**If final review is not marked `passed`:**

- Tell user: "All tasks complete. Final review required before PR."

**Autonomous final-review path (before prompting):**

If `OAT_AUTONOMOUS=1`, do not present a review-execution choice. Resolve the
exact reviewer target through the project dispatch substrate, select the
highest target-preserving route before launch, and run
`oat-project-review-provide code final` followed immediately by
`oat-project-review-receive`.

- If receive creates fix tasks, return through the normal bounded implement and
  re-review loop.
- Continue to Step 15 only when the final Reviews row is `passed`.
- A failed blocking review, unresolved Critical finding, exhausted route, or
  missing credential with no adequate fallback is an autonomy boundary. Persist
  the review state and report the exact resume action instead of falling
  through to the prompt.
- Record gate `IMPLEMENT-11`, the selected route, achieved independence, and
  dispatch-record reference in `implementation.md`.

After this autonomous branch succeeds, skip the workflow preference,
fresh-session guidance, and standard prompt below. When `OAT_AUTONOMOUS` is not
exactly `1`, this branch is inert.

**Workflow preference check (before prompting):**

First resolve the final reviewer target with the same target-first contract as
per-phase review. A concrete managed Codex target must first send its exact
registered reviewer as native `agent_type`; only a native role-selection
rejection permits an explicitly pinned fresh child. Spawn acceptance plus the
launcher payload supplies configured invocation evidence, so missing telemetry,
missing self-report, or a later `BLOCKED` result cannot trigger fallback. Record
the final review `target`, `model_axis`, and `effort_axis` from resolver output
and the constructed launcher payload, never from reviewer self-report. A
concrete managed Claude or Cursor target must put
`providers.claude.dispatchArgs.model` or
`providers.cursor.dispatchArgs.model` respectively into the actual provider
invocation as the exact `model` argument; Cursor strings remain opaque. Before
acceptance, a transport retry preserves the exact payload. After acceptance,
poll, nudge, or continue only through the existing reviewer handle. A terminal
timeout stops or escalates without another launch; a fresh pinned-child route
is eligible only after explicit pre-start role-selection rejection. If the host
cannot apply the required role or model argument, fail closed or block unless
verified equivalent current-host controls permit inline execution. The preference below chooses only among
routes that preserve that target; it cannot authorize generic inline or base
execution. Inline remains available only with verified equivalent current-host
controls or an allowed explicit inherit/default or managed-uncapped reviewer
base-role exception.

```bash
REVIEW_MODEL=$(oat config get workflow.reviewExecutionModel 2>/dev/null || true)
```

- **If `REVIEW_MODEL` is `subagent`:** Print `Review execution: subagent (from workflow.reviewExecutionModel).` Dispatch the review subagent directly via the Task tool. No prompt.
- **If `REVIEW_MODEL` is `inline`:** Honor it only when the inline route satisfies the verified-equivalent-controls or documented-exception guard. Otherwise use the exact/pinned route or block. When allowed, print `Review execution: inline (from workflow.reviewExecutionModel).` and run the review in-context per `oat-project-review-provide`.
- **If `REVIEW_MODEL` is `fresh-session`:** This is a **soft preference with escape hatch** because the agent cannot run the review in a fresh session on the user's behalf. Print the guidance block below, then handle the user's response per the three outcomes listed after it.
- **If unset or invalid:** Fall through to the standard 3-tier prompt below.

**Fresh-session guidance block (print when `REVIEW_MODEL` is `fresh-session`):**

```
Per your config (workflow.reviewExecutionModel: fresh-session), your
preference is to run the review in a fresh session.

Run `oat-project-review-provide code final` in a separate session, then
resume this session when the review is complete.

If you'd like to review here instead:
  1) subagent
  2) inline

Enter 1 or 2 to run the review here, or press Enter to wait.
```

**Fresh-session response outcomes:**

- User enters `1` → dispatch the subagent review (same behavior as `REVIEW_MODEL=subagent`).
- User enters `2` → apply the same guarded inline behavior as `REVIEW_MODEL=inline`; this choice does not waive managed target controls.
- User presses Enter (or equivalent no-input confirmation) → pause the session and wait for the fresh-session review to complete before continuing.

**Standard prompt (when preference is unset):**

Offer review options (3-tier capability model):

```
Implementation complete. Final review required.

Review options:
1. Run review in this session via a subagent (recommended if provider supported)
2. Run review in a fresh session and return to this session to receive review
3. Run review inline when current-host controls are verified equivalent

To run in a separate session use: oat-project-review-provide code final
```

**After user chooses:**

- If subagent (option 1): Agent spawns the review via Task tool — no command needed from user
- If fresh session (option 2): User runs `oat-project-review-provide code final` in a separate session, then returns here
- If inline (option 3): Agent first verifies equivalent current-host controls or an allowed exception, then executes the review per `oat-project-review-provide`; otherwise it uses the exact/pinned route or blocks
- After review: User runs `oat-project-review-receive` to process findings
- If Critical/Important findings: Fix tasks added, re-run the `oat-project-implement` skill
- Loop until final review passes (max 3 cycles per oat-project-review-receive)

**After final review is marked `passed`:**

- Record the passed final review and keep the project in implementation closeout.
- Do not append `"implement"` to `oat_hill_completed`, set
  `oat_phase_status: complete`, or offer the normal next-step prompt yet.
- Continue to **Final HiLL Closeout Sequence**.

### Step 15: Final HiLL Closeout Sequence

The final-closeout orchestrator owns this sequence after the phase implementer
and root-owned phase review have finished. Do not move lifecycle sequencing
into phase or optional nested workers or weaken exact target selection for
child dispatches.

Identify the final implementation phase from the plan. A final HiLL checkpoint
exists when `oat_plan_hill_phases` is `[]` (every phase) or when it explicitly
contains that final phase ID. Defer only a checkpoint on the final implementation
phase; non-final checkpoint behavior remains unchanged.

Run final verification (Step 13). Final review must be `passed` before any
pre-approval dispatch. If final checkpoint auto-review is enabled, Step 8 has
already run `oat-project-review-provide code final`; do not run a duplicate
final review here.

Read the effective `workflow.postImplementSequence` once. For a configured
legacy or structured preference, normalize legacy values before snapshotting:
`wait` → `{ preApproval: [], postApproval: [] }`, `summary` →
`{ preApproval: ["summary"], postApproval: [] }`, `pr` → `{ preApproval:
["summary", "pr"], postApproval: [] }`, and `docs-pr` → `{ preApproval:
["summary", "document", "pr"], postApproval: [] }`.

If `OAT_AUTONOMOUS=1` and the preference is unset, use the inventory's
autonomous lifecycle-tail default:

```yaml
preApproval: [summary, document, pr]
postApproval: []
```

Treat this as an in-memory effective preference and create the same immutable
sequence snapshot as a configured structured value. Add
`source: autonomous-default` to that snapshot. A configured legacy or
structured preference remains authoritative and uses `source: configured`;
preserve its normalized arrays and stored order exactly.

Persist this immutable state before dispatching a child:

```yaml
oat_post_implement_sequence:
  status: pre_approval # pre_approval | awaiting_approval | post_approval | failed | complete
  source: configured # configured | autonomous-default
  final_phase: pNN
  pre_approval: [summary, document, pr]
  pre_approval_completed: []
  approval: pending # pending | approved | not_required
  approval_source: null # null | user | oat-autonomous
  post_approval: []
  post_approval_completed: []
  failure: null
```

`source` and `approval_source` are additive provenance fields. A resumable
snapshot created by an older skill version remains valid when either field is
absent; do not rewrite its stored pre/post arrays merely to backfill provenance.

The snapshot is immutable for this closeout: never re-resolve
`workflow.postImplementSequence` while it is incomplete. Iterate
`pre_approval` and `post_approval` in their stored array order; do not sort or
substitute a vocabulary order. Resume from the first incomplete stored step,
including a partially completed noncanonical order.

For every pending `summary`, `document`, or `pr`, dispatch respectively
`oat-project-summary`, `oat-project-document`, or `oat-project-pr-final`.
Every `summary`, `document`, and `pr` child receives the authoritative snapshot
and must merge state updates without replacing `oat_post_implement_sequence`.
Re-read and verify the snapshot after every child returns before recording step
success. If a child removed or altered it, restore the authoritative snapshot,
record that step as failed, and stop with the boundary, failed step, and exact
resume command: `oat-project-implement`.

Commit each completed step before dispatching the next step. On failure, persist
`status: failed`, the boundary, the failed step, and concise recovery context.
A pre-approval failure leaves `approval: pending`; a post-approval failure
retains `approval: approved`. Fail fast with the boundary, failed step, and
exact resume command: `oat-project-implement`.

1. Dispatch incomplete `pre_approval` steps in stored order.
2. When they succeed and a final checkpoint exists, commit `status:
awaiting_approval` with `approval: pending` before asking for final HiLL
   approval.
3. Record explicit approval as `approval: approved` and `status: post_approval`
   before any post-approval dispatch. Record `approval_source: user` in the same
   commit. Then dispatch incomplete `post_approval` steps in stored order.
4. A decline or defer keeps `status: awaiting_approval` and `approval: pending`;
   record neither approval nor failure and run no post-approval step. State the
   boundary and exact resume command: `oat-project-implement`.
5. If no final checkpoint exists, commit `approval: not_required` before
   post-approval dispatch. `approval: not_required` is valid only when no final
   checkpoint exists.
6. After all stored steps finish, commit `status: complete`. Only then complete
   implementation state, append the configured final HiLL completion, and
   continue to the existing next-step behavior.

**Autonomous final HiLL approval:**

When `OAT_AUTONOMOUS=1`, gate `IMPLEMENT-16` replaces only the approval question
in steps 2-4:

1. Require the final review row to be `passed` and verify its review artifact
   and dispatch record. A failed blocking review or unresolved Critical finding
   stops before approval.
2. After all `pre_approval` steps succeed, commit `status: awaiting_approval`
   with `approval: pending` exactly as above.
3. Without waiting for input, commit `approval: approved`,
   `approval_source: oat-autonomous`, and `status: post_approval`, referencing
   the passing final review and dispatch record in `implementation.md`.
4. Dispatch incomplete `post_approval` steps in stored order, then finish the
   snapshot normally.

The policy approval occurs after pre-approval work and before any post-approval
work. It does not waive a failed review, child failure, repository-policy
approval, destructive-change risk, or missing-credential boundary. When
autonomy is inactive, the explicit user approval/decline/defer behavior above
is unchanged.

If the preference is unset and autonomy is inactive, do not create a sequence
snapshot. Retain the existing next-step prompt only after final approval when a
final checkpoint is configured. Under autonomy, the default snapshot above
always resolves the unset case.

### Step 16: Prompt for Next Steps

Run the standard next-step prompt only when `OAT_AUTONOMOUS` is not `1`,
`workflow.postImplementSequence` was unset, and no sequence snapshot was
created. It occurs after final approval when a final checkpoint is configured.
A configured legacy or structured preference has already completed through
**Final HiLL Closeout Sequence**; do not re-dispatch its steps here. When the
completed snapshot came from configured `wait`, print
`Post-implementation: wait (from workflow.postImplementSequence). Run
follow-up skills manually when ready.` and exit without auto-chaining.

**Standard prompt (when preference is unset):**

```
Final review passed for {project-name}.

All tasks complete and verified. Next steps:

1. Generate project summary (oat-project-summary)
2. Sync documentation (oat-project-document) — if applicable
3. Create final PR (oat-project-pr-final)

Options:
a. Run all three in sequence now
b. Run summary + PR only (skip docs)
c. Exit (run individually later)

Choose:
```

**If user chooses sequence (a or b):**

1. Invoke `oat-project-summary` to generate summary.md
2. If docs selected: invoke `oat-project-document`
3. Invoke `oat-project-pr-final` — this sets `oat_phase_status: pr_open` and guides to revise/complete

Do not route directly to `oat-project-complete`. The `pr_open` status set by pr-final is the proper entry to the revision/completion flow.

**If user chooses exit (c):**

Tell user: "Run the skills individually when ready: oat-project-summary → oat-project-document → oat-project-pr-final"

### Step 17: Output Summary

```
Implementation complete for {project-name}.

Summary:
- Phases: {N} completed
- Tasks: {N} completed
- Commits: {N} created

Final verification:
- Tests: ✓ passing
- Lint: ✓ clean
- Types: ✓ valid
- Build: ✓ success

Final review:
- Status: ✓ passed
- Artifact: reviews/final-review-{timestamp}.md

Next: Create PR or run the oat-project-pr-final skill (when available)
```

### Gate Execution

Before reporting this skill as complete, run the configured gate as the final step:

1. Resolve the gate for this skill:

   ```bash
   oat gate resolve <this-skill> --json
   ```

   If the command returns JSON `null`, no gate is configured; the skill is complete.

2. Export the resolved project path into the command shell:

   ```bash
   export PROJECT_PATH
   ```

   If the resolved command invokes `oat gate review`, the configured review command must already include `--project "$PROJECT_PATH"` and must not include `--target <id>`. A valid reusable shape is `oat gate review --project "$PROJECT_PATH" ...`. If the declaration is missing, stop and migrate the stored gate command; do not inject or append arguments at execution time.

3. Execute the resolved command exactly as configured. Capture stdout, stderr, the exit code, and the structured JSON result. A zero exit code means the review passed its threshold, but it does not by itself authorize artifact receipt or complete the handoff.

4. Review-artifact handoff:
   - Parse the structured gate result. An exit code or artifact path alone never authorizes `oat-project-review-receive`.
   - Invoke receive only when all three conditions hold: `status` is `ok` or `blocked`, the envelope explicitly sets `receiveEligible: true`, and a non-null `handoff` confirms the artifact was corroborated.
   - `receiveEligible: false` is a hard stop even when `artifactPath` is present. Never receive `targeting_correlation_failed`; correct the project/run routing and run a new gate.
   - Keep `artifact_validation_failed` outside receive until the artifact is corrected and the gate successfully revalidates it. Treat `review_failed`, unknown statuses, null handoffs, and contradictory eligibility fields as operational failures.
   - `blocked` exits nonzero but is receive-eligible; `ok` exits zero and still requires durable receive disposition. Route by structured status and eligibility, not by exit code.

5. If the command exits nonzero, use `description` to orient the next steps and handle `onFailure`:
   - `block`: read gate feedback, remediate, and re-run the gate up to `maxAttempts` attempts (default `2`). If attempts are exhausted, escalate to the human with accumulated feedback and append that feedback to `implementation.md`. Treat a launch failure, missing CLI, or no eligible runtime as escalation-biased and do not spend it as a remediation attempt.
   - `prompt`: surface the gate failure and ask the human how to proceed.
   - `warn`: record the gate failure and continue.

6. Runtime selection note (V1): the step runs the gate `command` as-is and reads no OAT runtime env var. By default, `oat gate review` and `oat gate cross-provider-exec` resolve the current host from built-in `hostDetectionCommand`s and avoid the same runtime when no exact target is supplied. Reusable lifecycle skill-gate commands must not include `--target <id>` so independent review stays provider-neutral. Use explicit targets only for manual/debug commands or deliberate local/user-specific overrides; do not hardcode provider/model targets in bundled skill guidance or shared lifecycle gate examples.
