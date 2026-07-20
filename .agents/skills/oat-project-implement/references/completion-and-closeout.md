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

### Step 11: Prepare Final Closeout Baseline

When all plan tasks are complete (i.e., there is no next incomplete `pNN-tNN` task):

**Update "Final Summary" (required):**

- Before requesting final review / running `oat-project-pr-final`, update the `## Final Summary (for PR/docs)` section in `"$PROJECT_PATH/implementation.md"`:
  - What shipped (capabilities, behavior-level)
  - Key files/modules touched
  - Verification performed (tests/lint/typecheck/build/manual)
  - Design deltas (if any)
- This should reflect **what was actually implemented**, including any deviations from design and any review-fix work.

Keep implementation in progress while clearing the completed task pointer:

```yaml
---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: { today }
oat_current_task_id: null
---
```

**Important:** `oat_current_task_id` should never point at an already-completed
task. If all tasks are done, set it to `null`, but do not mark implementation
complete before final verification, final review, the configured implementation
exit gate, and the approval-aware closeout sequence finish.

Update `"$PROJECT_PATH/state.md"` so other skills reflect task completion while
closeout remains in progress:

**Frontmatter updates:**

- `oat_current_task: null`
- `oat_last_commit: {final_commit_sha}`
- `oat_blockers: []`
- `oat_phase: implement`
- `oat_phase_status: in_progress` (until all closeout boundaries pass)
- `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`
- Do not append `"implement"` to `oat_hill_completed` yet.

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

**Baseline bookkeeping commit (required):**

**DO NOT SKIP.** This commit prevents state drift across sessions.

After updating state.md to reflect task completion and pending closeout, refresh
the repo dashboard when available and commit all modified project tracking
files:

```bash
oat state refresh
git add "$PROJECT_PATH/implementation.md" "$PROJECT_PATH/state.md" "$PROJECT_PATH/plan.md"
git diff --cached --quiet || git commit -m "chore(oat): prepare final implementation closeout"
```

Do not use `git add -A` or glob patterns. Only commit the three project artifacts listed above; `.oat/state.md` is a generated, gitignored dashboard.

### Step 12: Final Verification

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

### Step 13: Trigger Final Review

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

  - Continue to Step 14 (configured implementation exit gate)

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
- Continue to Step 14 only when the final Reviews row is `passed`.
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
concrete managed Claude target must put
`providers.claude.dispatchArgs.model` into the actual provider invocation as
the exact `model` argument. A concrete managed Cursor target must launch
`providers.cursor.dispatchArgs.variant` as the exact resolver-selected native
reviewer variant first; Cursor model strings remain opaque inside the mapping
and resolver. Before acceptance, a transport retry preserves the exact
payload. After acceptance, poll, nudge, or continue only through the existing
reviewer handle. A terminal timeout stops or escalates without another launch;
a fresh pinned-child route is eligible only after explicit pre-start native
role-selection rejection. If the host cannot apply the required role, variant,
or model argument, fail closed or block unless verified equivalent
current-host controls permit inline execution. The preference below chooses
only among routes that preserve that target; it cannot authorize generic
inline or base execution. Inline remains available only with verified
equivalent current-host controls or an allowed explicit inherit/default or
managed-uncapped reviewer base-role exception.

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
- Continue to **Gate Execution**.

### Step 14: Gate Execution

The configured implementation exit gate is independent from the optional
`oat_phase_review_gate`, the root-owned phase reviews, and the mandatory final
lifecycle review. A missing, disabled, or unconfigured phase gate never disables
or satisfies this configured exit gate.

**Persisted transition contract:**

`"$PROJECT_PATH/state.md"` is the routing source of truth. Store one closeout
generation as a sibling of `oat_post_implement_sequence`:

```yaml
oat_implement_exit_gate:
  status: pending # pending | allowed | blocked | stale
  resolution: configured # configured | no_gate
  disposition: null # null | passed | warned | prompt_approved | no_gate
  config_fingerprint: '<stable hash of the resolved declaration>'
  resolved_command: null
  resolved_description: null
  on_failure: block # block | prompt | warn | null
  max_attempts: 2
  attempts_completed: 0
  reviewed_head: null
  implementation_base_ref: null
  implementation_fingerprint: null
  freshness_head: null
  freshness_fingerprint: null
  launch_state: not_started # not_started | intent_persisted | accepted | result_persisted | not_accepted
  launch_attempt_id: null
  launch_started_at: null
  launch_result_receipt: null
  gate_run_marker: null
  gate_run_id: null
  envelope_status: null
  artifact: null
  handoff: null
  receive_state: not_started # not_started | intent_persisted | completed | reconciliation_required
  receive_correlation: null
  receive_source_artifact: null
  receive_archived_artifact: null
  receive_event_identity: null
  receive_pre_head: null
  receive_commit: null
  receive_eligible: false
  receive_completed: false
  failure: null
  updated_at: '2026-07-18T00:00:00Z'
```

At the start of a new closeout generation, require a current passed final
lifecycle review, capture `reviewed_head`, and compute a deterministic
`implementation_fingerprint` from the gate-reviewed basis. Resolve
`workflow.gates.skills.oat-project-implement` once. Canonically serialize the
resolved command, description, `onFailure`, and `maxAttempts` to derive
`config_fingerprint`; persist the complete resolved inputs with `status:
pending` before any gate launch. Missing state means unresolved, never no gate.
A `null` resolution persists `allowed/no_gate` with `disposition: no_gate`,
null run/artifact/receive provenance, and the current implementation basis.

New generations persist `implementation_fingerprint` as
`sha256:effective-delta-v1:<digest>`. Resolve the logical integration base from
the tracked PR's exact base ref, then the repository's configured remote default
branch; missing or ambiguous resolution fails closed. Persist the logical base
ref as `implementation_base_ref`; require exactly one merge base between that
ref and each compared HEAD.

Prefix the fingerprint input with the bytes `effective-delta-v1\0`. Hash the
exact NUL-delimited byte stream from Git
`--raw -z --no-renames --no-abbrev` output, which includes both base and final
modes and full object IDs for blobs, symlinks, deletions, and gitlinks. Run with
`LC_ALL=C` from the unique merge base to the compared HEAD. Git's raw `-z`
format owns path framing and byte ordering; do not parse and reserialize it,
abbreviate object IDs, enable rename detection, or hash human patch output.

Exclude only the exact `$PROJECT_PATH/state.md` checkpoint carrier to avoid a
self-referential digest. Use Git's literal exclusion pathspec, not a glob.
Validate that file independently as the structured transition above. Every
other path remains fingerprinted. Set `freshness_head` to `reviewed_head` and
`freshness_fingerprint` to `implementation_fingerprint` when the generation
starts. These rolling fields preserve the accepted tree outcome after later
authorized closeout transitions without changing the immutable reviewed basis.

An in-flight `pending` or `blocked` generation reuses its persisted resolved
configuration and never re-resolves it. Recompute the fingerprint from those
persisted inputs before resume. If the persisted resolved configuration does
not reproduce `config_fingerprint`, mark the generation `stale` and fail
closed. External configuration changes are considered only when a new
generation starts; they never rewrite an in-flight snapshot.

**Launch acceptance and reconciliation:**

The launch state advances only as `not_started` → `intent_persisted` →
`accepted` → `result_persisted`; an explicit pre-start rejection instead
records `not_accepted`. Before invoking the configured command, generate and
persist `launch_attempt_id`, `launch_started_at`, and
`launch_result_receipt` before invoking the command. The receipt is a
closeout-owned path selected before launch; capture the command's stdout there
without changing its configured argv.

For `oat --json gate review`, the gate CLI run marker is acceptance evidence
established before its reviewer child launch. Observe the marker that uniquely
matches the normalized project and starts no earlier than
`launch_started_at`; persist its path as `gate_run_marker`, its run ID as
`gate_run_id`, and `launch_state: accepted`. More than one matching marker is
ambiguous and blocks reconciliation.

On resume from `intent_persisted` or `accepted`, reconcile the exact
`gate_run_marker`, durable result receipt, and run-correlated active or archived
artifact before deciding the next transition:

- A still-present matching marker proves an accepted run may be active. Preserve
  `accepted`, wait for that run, and never launch a replacement.
- A complete result receipt must parse as exactly one structured envelope whose
  run ID matches the marker and artifact. Persist its envelope fields and
  `launch_state: result_persisted` before receive or policy handling.
- A matching artifact without its result receipt proves acceptance but not the
  terminal outcome. Persist
  `blocked/launch_result_reconciliation_required`; do not infer `ok` or
  `blocked` from findings or exit status.
- Relaunch only after durable `not_accepted` evidence proves that no gate
  process or reviewer child was accepted. This requires an explicit pre-start
  launcher rejection plus absence of a matching marker, result receipt, and
  active or archived artifact.
- Absent or ambiguous evidence persists
  `blocked/launch_reconciliation_required` and never relaunches automatically.
  Surface the persisted attempt ID, marker/receipt paths, and exact recovery
  action so a human can reconcile or explicitly retire that attempt.

Persist and commit every state transition before crossing its launch, receive,
stop, approval-aware sequence, completion, or output boundary. Append a concise
audit event to `implementation.md`; that prose and review ledger rows are
evidence, not routing state.

**Structured outcomes, receive, and policy:**

- Accept only a complete structured envelope whose status and correlation
  fields are internally consistent. Receive is eligible only for `ok` or
  `blocked` with `receiveEligible: true` and a corroborated non-null `handoff`.
  Ineligible, null, or contradictory handoffs, unknown statuses,
  `review_failed`, `artifact_validation_failed`, and
  `targeting_correlation_failed` persist `blocked`, remain outside receive, and
  cannot produce an allowed disposition. They ignore `on_failure`, including
  `warn`; policy handling is unavailable without a validated, receive-eligible
  `blocked` envelope whose eligible receive completed durably.
- Manual review provenance is rejected: only `oat_review_invocation: gate` with
  the matching `oat_gate_run_id` may satisfy the configured gate. A normal
  final review, phase review, or manually produced independent-review artifact
  cannot populate configured-gate provenance.

**Receive intent and reconciliation:**

The receive state advances only as `not_started` → `intent_persisted` →
`completed` or `reconciliation_required`. For a receive-eligible `ok` or
`blocked` envelope, first resolve the receiver's collision-safe archive
destination. Then persist the receive correlation, source and expected archived
artifact paths, exact Reviews event identity, and `receive_pre_head` before
invoking receive. `receive_correlation` binds the gate run ID, handoff, source
artifact, scope, type, and source filename; set `receive_state:
intent_persisted` and commit it before calling `oat-project-review-receive`.

On normal return or resume from `intent_persisted`, reconcile all three durable
receipt components:

1. the exact archived artifact at `receive_archived_artifact`, carrying the
   matching `oat_gate_run_id`;
2. the bound Reviews event identified by Scope + Type + original source
   filename, with its artifact set to that archived path and a monotonic
   received/fix/passed status; and
3. the receive bookkeeping commit after `receive_pre_head`, whose bounded diff
   contains that archive move and the matching project tracking updates.

When the exact archived artifact, the bound Reviews event, and the receive
bookkeeping commit all corroborate the persisted correlation, store that commit
as `receive_commit`, set `receive_state: completed`, and set
`receive_completed: true` from that corroborated durable receipt without
invoking receive again. An already-completed receive is idempotent and must not
run again.

If any component is missing, contradictory, or cannot be uniquely correlated,
persist `blocked/receive_reconciliation_required` and stop with the recovery
command `oat-project-review-receive`; do not invoke it automatically. Surface
the expected source/archive paths, event identity, pre-receive HEAD, and
candidate commit so a human can repair or confirm the durable receipt before
resume. A receive failure persists `blocked` and cannot become an allowed
disposition.

- After successful receive, `ok` persists `allowed/passed`. Apply the persisted
  `on_failure` policy only to a validated, receive-eligible `blocked` envelope
  after its eligible receive is durably completed.
- `block` outcomes consume remediation attempts only after a valid configured
  gate result and its eligible receive disposition are durably processed.
  Increment `attempts_completed` before remediation/rerun. Below
  `maxAttempts`, remediate, mark the changed implementation basis `stale`, rerun
  Steps 12-13 for that basis, and return to `pending` with updated
  `reviewed_head` and `implementation_fingerprint` while preserving the
  persisted configuration and consumed attempt count. At `maxAttempts`,
  persist `blocked` and stop without another gate launch.
- Launch failures, missing CLIs, unavailable runtimes, and transport failures
  do not increment `attempts_completed`. Persist failure context and
  `status: blocked`, then stop or escalate without treating infrastructure
  recovery as a remediation attempt or applying `on_failure`.
- Envelope validation/correlation failures and receive failures likewise remain
  `blocked` regardless of `on_failure`; they cannot persist `allowed/warned`,
  `allowed/prompt_approved`, or any other allowed disposition.
- An explicit prompt continuation persists `allowed/prompt_approved`; defer or
  no response persists `blocked` and stops. A warn continuation persists
  `allowed/warned` before closeout proceeds.

**Interruption, resume, and freshness:**

- Resume `pending` or `blocked` from the persisted transition without replacing
  its generation. Continue from the first incomplete launch, envelope, receive,
  policy, or persistence boundary.
- A fresh `allowed` result resumes after the gate without executing the gate or
  receive a second time. Reuse requires a valid disposition, complete
  configured-gate provenance when configured, an unchanged immutable
  implementation fingerprint, a valid rolling freshness checkpoint, and any
  eligible receive marked complete.
- Closeout-only descendants include configured gate artifacts and receipts,
  project tracking, `project-log.md` appends, summary/documentation/PR sequence
  outputs, final HiLL bookkeeping, and completion bookkeeping. Classify
  gate-owned `oat project log append` mutations introduced with PR #156 as
  closeout-only. A path category alone is insufficient: the corresponding
  persisted gate or sequence transition must own that descendant boundary;
  unknown or mixed work is substantive.
- For a qualified `sha256:effective-delta-v1:<digest>` value, require the
  persisted `implementation_base_ref`, `freshness_head`, one current merge base,
  and 64-character lowercase hexadecimal implementation and freshness digests.
  Missing or malformed inputs fail closed. Walk descendants after
  `freshness_head` in commit order. Ignore a checkpoint-persistence commit only
  after verifying its diff changes the exact state carrier and nothing else.
  After a corroborated closeout-only transition, hash the complete current
  effective delta and persist the rolling freshness checkpoint. Record the
  transition's last non-checkpoint commit as `freshness_head`; the following
  state-only persistence commit is the verified carrier exception above. For a
  merge, rebase, or base-update boundary, recompute the complete effective delta
  against the current merge base. A merge, rebase, or base update is not
  substantive by itself. When it matches the rolling fingerprint, preserve the
  allowed generation and persist an advanced rolling checkpoint without
  rerunning gate or receive. A mismatch, unknown commit, or mixed
  closeout/substantive boundary marks the generation `stale`.
  Conflict resolution or branch-owned implementation, test, skill, template, or
  workflow changes that alter the effective delta are substantive.
- Legacy unqualified `sha256:<digest>` values keep the descendant-path policy
  and are never reinterpreted or migrated in place. Determine freshness from
  every path changed after `reviewed_head`, and require each descendant commit
  to contain only recognized closeout work. An unknown changed path fails closed
  as substantive implementation change. Implementation, test, skill, template,
  or workflow configuration changes make the prior result `stale`.
- Every stale transition preserves prior provenance for audit, requires a
  current final lifecycle review for the changed basis, and starts a new
  generation using the qualified fingerprint format.

Before approval-aware sequencing, final HiLL approval, implementation
completion, or success output, run the configured gate:

1. Classify persisted state. A fresh allowed generation proceeds to Step 15
   without duplicate gate or receive execution. A valid `pending` or `blocked`
   generation resumes its first incomplete boundary with its persisted
   configuration. For absent or stale state, start a new generation and resolve
   the gate for this skill:

   ```bash
   oat gate resolve oat-project-implement --json
   ```

   Persist the resolution and configuration fingerprint before launch. If the
   command returns JSON `null`, persist the allowed no-gate transition; no gate
   is configured; proceed directly to the completion steps in Step 15 below.

2. Export the resolved project path into the command shell:

   ```bash
   export PROJECT_PATH
   ```

   If the resolved command invokes review, parse its argv before launch and
   require the canonical global-JSON shape
   `oat --json gate review --project "$PROJECT_PATH" ...`. The configured review
   command must place the global `--json` before `gate review`, must already
   include `--project "$PROJECT_PATH"`, and must not include `--target <id>`. Reject
   `oat gate review ...` without the global `--json` flag before launch because
   it emits human-oriented output rather than the structured envelope. For any
   invalid shape, stop and require the user to migrate the stored declaration
   before execution; never rewrite user or local configuration during closeout,
   and never inject, reorder, or append arguments at execution time.

3. If launch reconciliation does not already prove an accepted or completed
   attempt, persist the launch intent and preselected result receipt, then
   execute the resolved command exactly as configured. Capture stdout directly
   into that durable receipt while separately retaining stderr and the exit
   code; the capture wrapper must not alter the configured command argv.
   Observe and persist the gate run marker before treating the reviewer child as
   accepted. A zero exit code means the review passed its threshold, but it does
   not by itself authorize artifact receipt or complete the handoff. Validate
   the receipt as one structured envelope, then persist the run ID, envelope
   status, artifact, eligibility, handoff correlation, failure details, and
   `launch_state: result_persisted` before receive or policy handling.

4. Review-artifact handoff:
   - Parse the structured gate result. An exit code or artifact path alone never
     authorizes `oat-project-review-receive`.
   - Invoke receive only when all three conditions hold: `status` is `ok` or
     `blocked`, the envelope explicitly sets `receiveEligible: true`, and a
     non-null `handoff` confirms the artifact was corroborated.
   - `receiveEligible: false` is a hard stop even when `artifactPath` is present.
     Never receive `targeting_correlation_failed`; correct the project/run
     routing and run a new gate.
   - Keep `artifact_validation_failed` outside receive until the artifact is
     corrected and the gate successfully revalidates it. Treat `review_failed`,
     unknown statuses, null handoffs, and contradictory eligibility fields as
     operational failures.
   - `blocked` exits nonzero but is receive-eligible; `ok` exits zero and still
     requires durable receive disposition. Route by structured status and
     eligibility, not by exit code.
   - After eligible receive succeeds, persist `receive_completed: true` before
     applying the terminal disposition. Never invoke receive again for that
     persisted run.

5. Do not route policy from a generic nonzero exit. Apply persisted
   `on_failure` and `max_attempts` only after Step 4 validates a
   receive-eligible `blocked` envelope and its eligible receive is durably
   completed. Use `description` to orient these validated blocking-finding
   outcomes:
   - `block`: read gate feedback, remediate, and re-run the gate up to
     `maxAttempts` attempts (default `2`). Persist each consumed remediation
     attempt. If the gate ends in `block` after attempts are exhausted,
     escalate to the human with accumulated feedback and append that feedback
     to `implementation.md`.
   - `prompt`: persist the blocked boundary, surface the gate failure, and ask
     the human how to proceed. Continue only after an explicit persisted
     approval.
   - `warn`: persist the warned allowance and failure details before continuing.

   Any nonzero result without that validated and durably received `blocked`
   envelope remains blocked and skips all three policies. In particular,
   `warn` plus `review_failed` remains `blocked`, and `warn` plus an invalid,
   malformed, or contradictory envelope remains `blocked`. Launch failures,
   missing CLIs, unavailable runtimes, transport failures, validation or
   correlation failures, and receive failures cannot continue to sequencing,
   final HiLL, completion, or success output regardless of `on_failure`.

   When the gate ends in `block` after attempts are exhausted or remains at an
   unresolved `prompt` boundary, the completion steps below MUST NOT run. The
   project stays `in_progress` and resumable through `oat-project-implement`.

6. Runtime selection note: the step runs the gate `command` as-is and reads no
   OAT runtime env var. By default, `oat gate review` avoids the resolved
   producer family. Exact review scopes use a claimable producer identity from
   the matching dispatch stamp. Final/range reviews aggregate in-scope
   implementer/fix stamps; when a stamp's producer is not claimable or has an
   unknown family, its launcher-owned configured target may contribute a
   lower-confidence family exclusion without becoming runtime identity. If no
   claimable family remains, selection degrades to same-runtime avoidance.
   Reusable lifecycle skill-gate commands must not include `--target <id>` so
   independent review stays provider-neutral. Use explicit targets only for
   manual/debug commands or deliberate local/user-specific overrides; do not
   hardcode provider/model targets in bundled skill guidance or shared
   lifecycle gate examples.

### Step 15: Final HiLL Closeout Sequence

The final-closeout orchestrator owns this sequence after the phase implementer
and root-owned phase review have finished. Do not move lifecycle sequencing
into phase or optional nested workers or weaken exact target selection for
child dispatches.

Before creating or resuming `oat_post_implement_sequence`, and again before
every dispatch, final HiLL transition, completion mutation, and success output,
require `oat_implement_exit_gate` to remain allowed and fresh. If it becomes
stale, malformed, pending, or blocked, persist/retain that state, stop the
sequence, and resume through `oat-project-implement`.

Identify the final implementation phase from the plan. A final HiLL checkpoint
exists when `oat_plan_hill_phases` is `[]` (every phase) or when it explicitly
contains that final phase ID. Defer only a checkpoint on the final implementation
phase; non-final checkpoint behavior remains unchanged.

Run final verification (Step 12). Final review must be `passed` and the
configured implementation exit gate in Step 14 must be allowed before any
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

For qualified gate state, treat each committed sequence step as a corroborated
closeout boundary. Recompute the complete effective delta, record that step
commit as `freshness_head`, and persist `freshness_fingerprint` in a separate
state-only checkpoint commit before dispatching the next step. Apply the same
checkpoint protocol to gate bookkeeping, final HiLL bookkeeping, and completion
bookkeeping. A mixed commit, missing child transition, or non-state path in the
checkpoint-persistence commit fails closed as stale.

**Implementation-Tail Project Recap:**

The final-closeout orchestrator owns one project-recap gate. Run this recap gate after the final code review has passed and configured pre-approval summary/document steps have completed, but before final HiLL approval. Preserve the stored order of all other pre-approval steps and the existing final review sequence; the recap gate does not replace or repeat either.

Before generating, inspect the active project's explainer runs. A fresh `project-recap` manifest for the current completed implementation deduplicates the lifecycle-tail run: reuse it and do not invoke the adapter again. Fresh means the manifest identifies recipe `project-recap`, belongs to this project, has a terminal outcome, and its recorded source hashes match the current approved implementation inputs. A merely present, incomplete, wrong-recipe, or stale manifest does not satisfy this check.

Resolve recap intent through `oat-explainer-kit`. When `OAT_AUTONOMOUS=1` and no fresh recap exists, attempt `project-recap` exactly once; missing or stale persisted intent cannot suppress this autonomous attempt. Interactive mode honors the adapter's resolved persisted or workflow intent.

Invoke the `oat-explainer-kit` adapter first, then run its shared tracked-run finalizer in `dedicated` mode for a successful build. Use the adapter result and finalizer result as returned; do not improvise commits, durability evidence, or reruns. Outcomes `failed` and `built-not-durable` are recorded warnings, never blockers for final HiLL approval, completion reporting, or later PR steps.
Supply the provider-neutral critic callback (or validated critic module entry point for JSON/CLI invocation) on every federated adapter run.

Always include the selected or attempted recap's outcome and run path in the
implementation completion report. If `summary.md` exists, append or refresh its
single concise `Explainer Outcome` section using the manifest and build record;
never append a second outcome section. If no recap was attempted or reused,
leave the summary unchanged.

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

### Step 16: Mark Implementation Complete

Run this step only after the configured gate passes or resolves to a
policy-allowed disposition, including an allowed no-gate outcome, and the Step
15 closeout sequence has reached its terminal allowed state. A configured gate
that is blocked, unresolved, malformed, or stale leaves implementation in
progress.

Update `"$PROJECT_PATH/implementation.md"` frontmatter:

```yaml
---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: { today }
oat_current_task_id: null
---
```

Update `"$PROJECT_PATH/state.md"`:

- `oat_current_task: null`
- `oat_last_commit: {final_commit_sha}`
- `oat_blockers: []`
- `oat_phase: implement`
- `oat_phase_status: complete`
- `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`
- If `"implement"` is in `oat_hill_checkpoints`, append `"implement"` to
  `oat_hill_completed`; otherwise leave it unchanged.

Update the current phase and progress content to record that implementation,
final review, the configured exit gate, and closeout sequencing are complete.
Then refresh the dashboard and create the required completion bookkeeping
commit:

```bash
oat state refresh
git add "$PROJECT_PATH/implementation.md" "$PROJECT_PATH/state.md" "$PROJECT_PATH/plan.md"
git diff --cached --quiet || git commit -m "chore(oat): mark implementation complete"
```

Do not use `git add -A` or glob patterns. Only commit the three project
artifacts listed above; `.oat/state.md` is a generated, gitignored dashboard.

### Step 17: Prompt for Next Steps

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

### Step 18: Output Summary

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
