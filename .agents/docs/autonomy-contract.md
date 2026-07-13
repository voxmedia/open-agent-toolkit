---
title: OAT Autonomy Contract
status: canonical
last_updated: 2026-07-13
---

# OAT Autonomy Contract

This document is the canonical policy for running OAT project workflows without
mid-run user input. It defines the activation signal, boundary behavior,
provenance requirements, and the inventory of interactive gates that an
autonomous caller must resolve.

## Activation and lifetime

Autonomy is active only when the current process environment contains the exact
signal:

```bash
export OAT_AUTONOMOUS=1
export OAT_NON_INTERACTIVE=1
```

`OAT_AUTONOMOUS=1` implies `OAT_NON_INTERACTIVE=1`. The activating orchestrator
must set both variables before invoking a lifecycle skill and must pass them to
child processes and bounded subagents that participate in the same run.
`OAT_NON_INTERACTIVE=1` by itself keeps its existing, narrower meaning: use a
documented non-interactive default for the current skill. It does not authorize
lifecycle chaining or autonomy-specific approvals.

Both signals are session-scoped. They may be inherited by processes in the
current run, but must never be written to `state.md`, `plan.md`,
`implementation.md`, repository or user config, shell profiles, environment
files, or any other persisted project artifact. A restarted session is
interactive unless autonomy is deliberately activated again. Durable artifacts
may record what decision was made and why, but not an active autonomy mode.

## Resolution rules

1. Preserve explicit project and configuration choices unless they are invalid.
2. Apply an existing `OAT_NON_INTERACTIVE` branch before adding an
   autonomy-specific resolution.
3. Auto-resolve only decisions bounded by the user's original goal, the plan,
   repository instructions, and the current run's declared write authority.
4. Do not treat autonomy as authority to delete data, rewrite history, widen
   scope, bypass protected-branch policy, disclose credentials, or accept an
   unresolved Critical review finding.
5. When the inventory says `boundary`, stop without waiting for input. Persist
   safe bookkeeping, then report: the gate, why it cannot be auto-resolved, the
   evidence, the exact operator action, and the resume command.
6. A prompt reached without an inventory entry is a defect. Stop as an
   `inventory-gap` boundary and record enough context to add the missing row.

Configured lifecycle gates keep their declared `onFailure` behavior:

- `warn`: record the failure and continue.
- `block`: perform only the configured bounded remediation attempts, then stop
  at a boundary if the gate still fails.
- `prompt`: stop at a boundary after surfacing the failure; autonomy must not
  reinterpret `prompt` as permission to continue.

## Boundary classes

| Class | Required behavior |
| --- | --- |
| `destructive-change-risk` | Stop before deletion, overwrite of irreplaceable state, force-push/history rewrite, or another destructive action not explicitly authorized by the project contract. |
| `unresolved-critical-findings` | Stop while any Critical finding is unresolved or a blocking review cannot produce a passing result. Important findings follow the configured gate policy; they never silently disappear. |
| `repository-policy-approval` | Stop when a protected branch, required reviewer, merge policy, ownership boundary, or equivalent repository rule requires a human or external approval. |
| `missing-credentials` | Stop when a required credential is absent and no integrity-preserving offline or lower-tier route exists. Name the variable or credential class, never its value. |
| `product-judgment` | Stop when available evidence does not support a choice within the approved goal and choosing would materially change product scope or behavior. |

## Provenance

Every autonomous resolution must leave durable, secret-free evidence in the
artifact already owned by the calling workflow:

- planning and artifact decisions: the relevant artifact plus its review row;
- implementation and boundary decisions: `implementation.md`;
- review and dispatch decisions: the dispatch record schema and the referenced
  review artifact;
- gate execution: structured gate result, attempt count, and disposition;
- documentation and completion decisions: `state.md` and the normal summary or
  PR artifact.

Record the gate ID from this inventory, the selected outcome, the evidence or
configuration source, and whether the result was auto-resolved or stopped at a
boundary. Do not record tokens, secret values, signed URLs, or an active
autonomy flag.

## Gate inventory

`classification` is either `auto-resolve` or `boundary:<class>`. A boundary row
may first perform safe, bounded work and stop only if the stated condition
remains.

| ID | Skill | Gate | Interactive behavior | Autonomous resolution | Classification | Provenance |
| --- | --- | --- | --- | --- | --- | --- |
| NEW-01 | `oat-project-new` | Inherited dirty tree | Commit, proceed, or abort | Proceed without staging unrelated files; a required destructive cleanup stops | `auto-resolve` / `boundary:destructive-change-risk` | New-project preflight note |
| NEW-02 | `oat-project-new` | Missing project name | Ask for a slug | Derive a valid slug from the explicit autonomous goal; stop if identity or collision handling is ambiguous | `auto-resolve` / `boundary:product-judgment` | Scaffold output and project path |
| QS-01 | `oat-project-quick-start` | Inherited dirty tree | Commit, proceed, or abort | Proceed without staging unrelated files; a required destructive cleanup stops | `auto-resolve` / `boundary:destructive-change-risk` | Quick-start preflight note |
| QS-02 | `oat-project-quick-start` | Missing name or description | Ask for required startup input | Derive a slug from the explicit goal and use the goal as the description; stop if the goal is not substantive | `auto-resolve` / `boundary:product-judgment` | Discovery initial request |
| QS-03 | `oat-project-quick-start` | Discovery questions and approach buy-in | Ask clarifying questions and confirm the chosen direction | Answer from repository evidence, select the supported recommendation, and record assumptions; material product ambiguity stops | `auto-resolve` / `boundary:product-judgment` | `discovery.md` decisions and assumptions |
| QS-04 | `oat-project-quick-start` | Design-depth choice | Choose plan, lightweight design, or spec-driven promotion | Use agent judgment from the documented heuristic and record the rationale | `auto-resolve` | `discovery.md` mode-choice rationale |
| QS-05 | `oat-project-quick-start` | Requirements gate | Confirm, add a minor requirement, or redirect scope | Use the existing non-interactive auto-confirm path; contradictory or materially incomplete requirements stop | `auto-resolve` / `boundary:product-judgment` | Requirements-gate note in discovery/plan handoff |
| QS-06 | `oat-project-quick-start` | Lightweight-design mode | Choose collaborative or draft | Use the existing non-interactive draft-and-review path | `auto-resolve` | `design.md` non-interactive banner |
| QS-07 | `oat-project-quick-start` | Collaborative section approval | Approve or revise each section | Unreachable under the autonomous draft path; if explicitly preselected collaborative mode is encountered, switch to draft before authoring | `auto-resolve` | Design mode and review record |
| QS-08 | `oat-project-quick-start` | Dispatch-ladder ownership | Choose shared, local, user, or no adoption | Do not choose a persistence scope; an incomplete ladder remains a readiness boundary | `boundary:repository-policy-approval` | Resolver diagnostic |
| QS-09 | `oat-project-quick-start` | Project dispatch policy | Choose a named ceiling, uncapped, inherit, or unresolved | Preserve an explicit/configured value; unresolved non-interactive state blocks | `boundary:repository-policy-approval` | `state.md` policy or resolver diagnostic |
| QS-10 | `oat-project-quick-start` | Optional phase-gate setup | Choose all, selected, or disabled | Use the shared non-interactive contract: leave absent and disabled unless an explicit value already exists | `auto-resolve` | Phase-gate setup status |
| QS-11 | `oat-project-quick-start` | Plan artifact-review findings | Accept offered Medium/Minor fixes | Apply in-bundle, unambiguous fixes and re-review; preserve residuals and stop on unresolved Critical or material ambiguity | `auto-resolve` / `boundary:unresolved-critical-findings` | Plan review row and residual-finding note |
| QS-12 | `oat-project-quick-start` | Configured exit gate | `block`, `prompt`, or `warn` after failure | Apply the configured failure semantics; `prompt` becomes a reported boundary | `auto-resolve` / `boundary:repository-policy-approval` | Structured gate result and disposition |
| DISC-01 | `oat-project-discover` | Active-project confirmation or switch | Confirm the active project or choose another | Use only an explicitly supplied or valid active project; otherwise stop without guessing | `boundary:product-judgment` | Resolved project path |
| DISC-02 | `oat-project-discover` | Stale knowledge | Continue or refresh | Refresh through the canonical knowledge workflow when available; otherwise record staleness and continue only when it does not create material ambiguity | `auto-resolve` / `boundary:product-judgment` | Discovery evidence note |
| DISC-03 | `oat-project-discover` | Gray areas and clarifying questions | Select areas and answer questions | Select risk-relevant areas from evidence and record supported answers/assumptions; material ambiguity stops | `auto-resolve` / `boundary:product-judgment` | `discovery.md` Q&A and assumptions |
| DISC-04 | `oat-project-discover` | Solution approach buy-in | Select or redirect the recommended approach | Select the evidence-backed recommendation and record tradeoffs; unsupported product choice stops | `auto-resolve` / `boundary:product-judgment` | `discovery.md` chosen direction |
| DISC-05 | `oat-project-discover` | Mid-stream split choice | Split, continue broad discovery, or keep one project | Use the existing non-interactive behavior: record a high/soft split recommendation and stop; below threshold continues | `auto-resolve` / `boundary:product-judgment` | Detected Split Recommendation |
| DISC-06 | `oat-project-discover` | Convergence split confirmation | Proceed as one project or split | Use the existing non-interactive behavior: below proceeds; high/soft records and stops | `auto-resolve` / `boundary:product-judgment` | Final split evaluation |
| DISC-07 | `oat-project-discover` | Discovery HiLL approval | Approve artifact or wait | Run autonomous review/receive; approve only after passing review and no unresolved Critical finding | `auto-resolve` / `boundary:unresolved-critical-findings` | Review artifact, dispatch record, HiLL bookkeeping |
| DISC-08 | `oat-project-discover` | Configured exit gate | `block`, `prompt`, or `warn` after failure | Apply configured failure semantics; `prompt` becomes a reported boundary | `auto-resolve` / `boundary:repository-policy-approval` | Structured gate result and disposition |
| DES-01 | `oat-project-design` | Missing active project | Ask for project name | Use only an explicitly supplied or valid active project; otherwise stop | `boundary:product-judgment` | Resolved project path |
| DES-02 | `oat-project-design` | Incomplete existing spec | Finish it or delete/regenerate | Never delete or overwrite it autonomously; stop for direction | `boundary:destructive-change-risk` | Incomplete-spec diagnostic |
| DES-03 | `oat-project-design` | Design interaction mode | Choose collaborative, selective, or draft | `OAT_NON_INTERACTIVE=1` forces the existing draft-and-review path | `auto-resolve` | Design mode banner |
| DES-04 | `oat-project-design` | Requirements completeness | Revise until the user confirms | Reconcile against discovery/evidence and self-confirm only when complete; material ambiguity stops | `auto-resolve` / `boundary:product-judgment` | `spec.md` and review evidence |
| DES-05 | `oat-project-design` | Approach reaffirmation | Confirm or revisit the approach | Preserve a supported discovery choice; otherwise choose the evidence-backed recommendation and record rationale | `auto-resolve` / `boundary:product-judgment` | Design Overview and alternatives |
| DES-06 | `oat-project-design` | Selective plan and section approvals | Approve/revise review plan and sections | Unreachable in forced draft mode; do not simulate live approvals | `auto-resolve` | Design mode and review record |
| DES-07 | `oat-project-design` | Design/spec HiLL approval | Approve, revise, or wait | Run autonomous review/receive and approve only after passing; unresolved Critical findings stop | `auto-resolve` / `boundary:unresolved-critical-findings` | Review artifact, dispatch record, HiLL bookkeeping |
| DES-08 | `oat-project-design` | Configured exit gate | `block`, `prompt`, or `warn` after failure | Apply configured failure semantics; unresolved Critical findings are always a boundary and `prompt` cannot silently continue | `auto-resolve` / `boundary:unresolved-critical-findings` | Structured gate result and disposition |
| PLAN-01 | `oat-project-plan` | Missing design detail | Ask whether to update design | Stop and return to design; do not invent a design decision | `boundary:product-judgment` | Planning blocker |
| PLAN-02 | `oat-project-plan` | Missing active project | Ask for project name | Use only an explicitly supplied or valid active project; otherwise stop | `boundary:product-judgment` | Resolved project path |
| PLAN-03 | `oat-project-plan` | Incomplete design | Ask user to finish design | Stop and route to design | `boundary:product-judgment` | Design-readiness diagnostic |
| PLAN-04 | `oat-project-plan` | Existing draft plan | Resume, view, or overwrite | Resume in place; never overwrite autonomously | `auto-resolve` | Plan continuation note |
| PLAN-05 | `oat-project-plan` | Dispatch-ladder ownership | Choose persistence scope | Do not choose a persistence scope; incomplete ladder blocks readiness | `boundary:repository-policy-approval` | Resolver diagnostic |
| PLAN-06 | `oat-project-plan` | Project dispatch policy | Choose a runnable policy | Preserve explicit/configured policy; unresolved non-interactive state blocks | `boundary:repository-policy-approval` | `state.md` policy or resolver diagnostic |
| PLAN-07 | `oat-project-plan` | Plan breakdown confirmation | Confirm tasks or request changes | Complete the independent plan artifact-review loop, apply unambiguous fixes, and confirm only a clean executable plan | `auto-resolve` / `boundary:unresolved-critical-findings` | Plan review row |
| PLAN-08 | `oat-project-plan` | Optional phase-gate setup | Choose all, selected, or disabled | Use the shared non-interactive contract: preserve explicit state or leave disabled | `auto-resolve` | Phase-gate setup status |
| PLAN-09 | `oat-project-plan` | Plan artifact-review findings | Accept offered Medium/Minor fixes | Apply unambiguous artifact-local fixes and re-review; unresolved Critical or material ambiguity stops | `auto-resolve` / `boundary:unresolved-critical-findings` | Plan review row and residuals |
| PLAN-10 | `oat-project-plan` | Parallel-group proposal | Confirm a candidate group | Accept only when write-set and dependency evidence proves independence; otherwise keep sequential and record why | `auto-resolve` | Plan Parallelism section |
| PLAN-11 | `oat-project-plan` | Configured exit gate | `block`, `prompt`, or `warn` after failure | Apply configured failure semantics; `prompt` becomes a reported boundary | `auto-resolve` / `boundary:repository-policy-approval` | Structured gate result and disposition |
| IMPORT-01 | `oat-project-import-plan` | Inherited dirty tree | Commit, proceed, or abort | Proceed without staging unrelated files; destructive cleanup stops | `auto-resolve` / `boundary:destructive-change-risk` | Import preflight note |
| IMPORT-02 | `oat-project-import-plan` | Missing project | Ask for project identity | Use explicit invocation context; otherwise stop rather than guess | `boundary:product-judgment` | Resolved project path |
| IMPORT-03 | `oat-project-import-plan` | Source plan selection or extension exception | Choose a candidate/path or confirm nonstandard Markdown | Use an explicit unique source; ambiguity or nonstandard content stops | `auto-resolve` / `boundary:product-judgment` | Import reference metadata |
| IMPORT-04 | `oat-project-import-plan` | Existing source snapshot | Confirm overwrite | Never overwrite; create the documented timestamped copy | `auto-resolve` | Imported reference path |
| IMPORT-05 | `oat-project-import-plan` | Dispatch-ladder ownership | Choose persistence scope | Do not choose a persistence scope; incomplete ladder blocks readiness | `boundary:repository-policy-approval` | Resolver diagnostic |
| IMPORT-06 | `oat-project-import-plan` | Project dispatch policy | Choose a runnable policy | Preserve explicit/configured policy; unresolved non-interactive state blocks | `boundary:repository-policy-approval` | `state.md` policy or resolver diagnostic |
| IMPORT-07 | `oat-project-import-plan` | Optional phase-gate setup | Choose all, selected, or disabled | Preserve explicit imported state; otherwise use the shared non-interactive disabled behavior | `auto-resolve` | Phase-gate setup status |
| IMPORT-08 | `oat-project-import-plan` | Import-aware artifact-review findings | Accept offered Medium/Minor fixes | Apply only unambiguous canonicalization fixes; never rewrite source intent; unresolved Critical or ambiguity stops | `auto-resolve` / `boundary:unresolved-critical-findings` | Plan review row and import disposition |
| IMPORT-09 | `oat-project-import-plan` | Configured exit gate | `block`, `prompt`, or `warn` after failure | Apply configured failure semantics; `prompt` becomes a reported boundary | `auto-resolve` / `boundary:repository-policy-approval` | Structured gate result and disposition |
| IMPLEMENT-01 | `oat-project-implement` | Missing active project | Ask for project name | Use only an explicitly supplied or valid active project; otherwise stop | `boundary:product-judgment` | Resolved project path |
| IMPLEMENT-02 | `oat-project-implement` | Prior-run worktrees | Resume or clean up | Resume and reconcile non-destructively; cleanup that could discard work stops | `auto-resolve` / `boundary:destructive-change-risk` | Orchestration run reconciliation |
| IMPLEMENT-03 | `oat-project-implement` | Unconfirmed HiLL phases | Choose every, selected, or final | When absent on an autonomous first run, take `hillCheckpointDefault: final`: write the explicit final phase array and enable auto-review; preserve valid `[]` and explicit arrays | `auto-resolve` | `plan.md` frontmatter and implementation log |
| IMPLEMENT-04 | `oat-project-implement` | Auto-review preference | Enable or disable checkpoint review | Set `oat_auto_review_at_hill_checkpoints: true` for the autonomous default path | `auto-resolve` | `plan.md` frontmatter |
| IMPLEMENT-05 | `oat-project-implement` | Malformed phase-review setting | Ask user to repair | Stop before task execution | `boundary:repository-policy-approval` | Validation diagnostic |
| IMPLEMENT-06 | `oat-project-implement` | Stale bookkeeping reconciliation | Approve generated repair | Repair only when plan, log, and git evidence agree; conflicting evidence stops | `auto-resolve` / `boundary:product-judgment` | Bookkeeping repair commit |
| IMPLEMENT-07 | `oat-project-implement` | Existing tracker overwrite | Require explicit confirmation | Never overwrite in autonomy; resume or stop on corruption | `boundary:destructive-change-risk` | Tracker diagnostic |
| IMPLEMENT-08 | `oat-project-implement` | Subagent delegation authorization | Authorize implementer and reviewer for this run | Approve once for the bounded run and both declared roles; do not widen file or command authority | `auto-resolve` | Dispatch authorization scope |
| IMPLEMENT-09 | `oat-project-implement` | Unresolved dispatch policy | Choose a runnable policy | Preserve configured/project policy; unresolved non-interactive preflight stops | `boundary:repository-policy-approval` | Resolver report |
| IMPLEMENT-10 | `oat-project-implement` | Non-final checkpoint pause | Wait after review | Run auto-review, auto-receive, record provenance, and continue after a passing disposition | `auto-resolve` / `boundary:unresolved-critical-findings` | Review artifact, receive commit, dispatch record |
| IMPLEMENT-11 | `oat-project-implement` | Final-review execution route | Choose subagent, fresh session, or guarded inline | Select the highest policy-compliant target-preserving route and launch without prompting | `auto-resolve` | Final-review dispatch record |
| IMPLEMENT-12 | `oat-project-implement` | Failed or unavailable final review | Retry/fix or wait for user | Apply bounded fix/re-review cycles; a failed blocking review or no adequate route stops | `boundary:unresolved-critical-findings` / `boundary:missing-credentials` | Review rows and blocker report |
| IMPLEMENT-13 | `oat-project-implement` | Post-implement sequence unset | Choose summary/docs/PR or exit | Snapshot the autonomous default `{preApproval: [summary, document, pr], postApproval: []}`; do not prompt | `auto-resolve` | `oat_post_implement_sequence` with source `autonomous-default` |
| IMPLEMENT-14 | `oat-project-implement` | Legacy post-implement sequence | Execute `wait`, `summary`, `pr`, or `docs-pr` | Normalize through the documented legacy mapping and preserve the resulting arrays; do not reinterpret an explicit value | `auto-resolve` | Immutable sequence snapshot |
| IMPLEMENT-15 | `oat-project-implement` | Structured pre/post sequence | Execute ordered pre- and post-approval steps | Preserve exact array order and resume from the first incomplete step | `auto-resolve` | Immutable sequence snapshot and per-step commits |
| IMPLEMENT-16 | `oat-project-implement` | Final HiLL approval | Approve, decline, or defer between pre/post steps | After passing auto-review and successful pre-approval steps, record approval and continue post-approval steps; otherwise stop | `auto-resolve` / `boundary:unresolved-critical-findings` | Sequence snapshot, review artifact, dispatch record |
| IMPLEMENT-17 | `oat-project-implement` | Next-step prompt | Choose lifecycle tail actions | Unreachable when the autonomous sequence snapshot exists; never present the prompt | `auto-resolve` | Completed sequence snapshot |
| IMPLEMENT-18 | `oat-project-implement` | Configured exit gate | `block`, `prompt`, or `warn` after failure | Apply configured failure semantics; `prompt` becomes a reported boundary | `auto-resolve` / `boundary:repository-policy-approval` | Structured gate result and disposition |
| DOCUMENT-01 | `oat-project-document` | Missing project path | Ask for a path | Use explicit/active project only; otherwise stop | `boundary:product-judgment` | Resolved project path |
| DOCUMENT-02 | `oat-project-document` | Documentation delta approval | Apply all, individual, or skip | Invoke the existing `--auto` path and apply all non-destructive recommendations | `auto-resolve` | Documentation delta and state update |
| DOCUMENT-03 | `oat-project-document` | Delete or restructure docs | Require explicit approval | Stop before destructive or broad restructuring not already authorized by the plan | `boundary:destructive-change-risk` | Documentation blocker |
| SUMMARY-01 | `oat-project-summary` | Missing active project | Ask for project name | Use explicit/active project only; otherwise stop | `boundary:product-judgment` | Resolved project path |
| PRFINAL-01 | `oat-project-pr-final` | Missing active project | Ask for project name | Use explicit/active project only; otherwise stop | `boundary:product-judgment` | Resolved project path |
| PRFINAL-02 | `oat-project-pr-final` | Missing title/base | Ask for title and resolve base | Use the documented ticket/conventional-title and base-branch resolution chains | `auto-resolve` | PR artifact frontmatter and command |
| PRFINAL-03 | `oat-project-pr-final` | Final review not passed | Ask whether to proceed anyway | Never proceed in autonomy; stop and route to final review/re-review | `boundary:unresolved-critical-findings` | Final review row and blocker report |
| PRFINAL-04 | `oat-project-pr-final` | Push/PR policy or credentials | Ask operator to authorize or authenticate | Stop when repository policy or missing credentials prevent push/PR creation | `boundary:repository-policy-approval` / `boundary:missing-credentials` | PR state and redacted command error |
| COMPLETE-01 | `oat-project-complete` | Batched completion/archive/summary/PR choices | Confirm completion and choose optional actions | Confirm only after gates pass; honor explicit config, refresh missing/stale summary, avoid duplicate PR, and archive only when configured | `auto-resolve` | Completion state and summary |
| COMPLETE-02 | `oat-project-complete` | Required documentation missing | Run document or explicitly skip | Run autonomous documentation; do not silently skip a required gate | `auto-resolve` / `boundary:repository-policy-approval` | Documentation state |
| COMPLETE-03 | `oat-project-complete` | Unsatisfied completion gates | Continue anyway | Never continue silently; unresolved final review is a review boundary and other hard policies remain boundaries | `boundary:unresolved-critical-findings` / `boundary:repository-policy-approval` | Combined gate report |
| COMPLETE-04 | `oat-project-complete` | Archive/PR external access | Ask for access or manual action | Stop when required credentials or repository policy prevent the selected action | `boundary:missing-credentials` / `boundary:repository-policy-approval` | Completion blocker |
| REVIEWPROVIDE-01 | `oat-project-review-provide` | Resolved target confirmation | Confirm project/review target | Autonomous callers pass an exact project, type, and scope; continue without prompting | `auto-resolve` | Review Scope metadata |
| REVIEWPROVIDE-02 | `oat-project-review-provide` | Missing type or scope | Infer then ask for confirmation | Use caller-provided scope or deterministic project-state inference; ambiguity stops | `auto-resolve` / `boundary:product-judgment` | Review Scope metadata |
| REVIEWPROVIDE-03 | `oat-project-review-provide` | Detached branch | Ask which branch to review | Resolve only from authoritative worktree metadata; otherwise stop | `boundary:repository-policy-approval` | Branch-resolution diagnostic |
| REVIEWPROVIDE-04 | `oat-project-review-provide` | Different branch without worktree | Switch, inline-only, or cancel | Do not switch branches or discard context autonomously; stop for a correct checkout/worktree | `boundary:repository-policy-approval` | Branch/worktree diagnostic |
| REVIEWPROVIDE-05 | `oat-project-review-provide` | Re-review narrowing | Narrow to fixes or review full scope | Use configured preference; when unset, narrow to completed fix commits | `auto-resolve` | Review Scope metadata |
| REVIEWPROVIDE-06 | `oat-project-review-provide` | Commit-range fallback | Supply a range or accept merge-base | Use a verified merge-base-to-HEAD range when it covers the declared scope; otherwise stop | `auto-resolve` / `boundary:product-judgment` | Review Scope metadata |
| REVIEWPROVIDE-07 | `oat-project-review-provide` | Reviewer delegation authorization | Authorize `oat-reviewer` | Approve once for the exact bounded review scope | `auto-resolve` | Dispatch authorization and record |
| REVIEWPROVIDE-08 | `oat-project-review-provide` | Fresh-session or inline fallback | Choose execution route | Use the pre-launch-selected target-preserving route; a blocking review with no adequate route stops | `auto-resolve` / `boundary:missing-credentials` | Dispatch record |
| REVIEWPROVIDE-09 | `oat-project-review-provide` | Defer review bookkeeping commit | Confirm proceeding uncommitted | Never defer; commit the bounded review files or stop on commit failure | `auto-resolve` / `boundary:repository-policy-approval` | Bookkeeping commit |
| REVIEWRECEIVE-01 | `oat-project-review-receive` | Artifact edit approval | Confirm proposed artifact edits | Apply unambiguous in-scope edits and re-review; `needs_user_direction` stops | `auto-resolve` / `boundary:product-judgment` | Finding disposition map |
| REVIEWRECEIVE-02 | `oat-project-review-receive` | Review-cycle limit | Choose manual review, proceed, or override | Stop at the configured cycle limit; never self-authorize an override or proceed to PR | `boundary:repository-policy-approval` | Cycle-count blocker |
| REVIEWRECEIVE-03 | `oat-project-review-receive` | Final deferred Medium findings | Convert or accept deferral | Convert valid findings to fix tasks; preserve only an already explicit, evidence-backed deferral; ambiguity stops | `auto-resolve` / `boundary:product-judgment` | Deferred Medium ledger |
| REVIEWRECEIVE-04 | `oat-project-review-receive` | New Medium deferral request | Approve deferral per finding | Default to conversion; do not create a new autonomous deferral for material work | `auto-resolve` | Finding disposition map |
| REVIEWRECEIVE-05 | `oat-project-review-receive` | Final Minor disposition | Defer selected/all or convert all | Convert in-scope Minors by default; reject only with concrete evidence | `auto-resolve` | Finding disposition map |
| REVIEWRECEIVE-06 | `oat-project-review-receive` | Code-review next action | Execute fixes, inspect plan, or exit | Execute added fix tasks through implement, then re-review | `auto-resolve` | State pointer and receive summary |
| REVIEWRECEIVE-07 | `oat-project-review-receive` | Artifact-review next action | Resolve direction, re-review, or continue | Re-review applied edits; continue only after passing; user-direction findings stop | `auto-resolve` / `boundary:product-judgment` | Artifact disposition and review row |
| REVIEWRECEIVE-08 | `oat-project-review-receive` | Defer receive bookkeeping commit | Confirm proceeding uncommitted | Never defer; commit bounded bookkeeping or stop on commit failure | `auto-resolve` / `boundary:repository-policy-approval` | Bookkeeping commit |
| REVIEWRECEIVE-09 | `oat-project-review-receive` | Unresolved Critical finding | Fix, reject, or seek direction | Convert valid findings and re-review; never pass while a Critical remains unresolved | `boundary:unresolved-critical-findings` | Review row and finding disposition |
| DISPATCH-01 | `oat-dispatch-subagents` | Launch-surface authorization | Ask once for a user approval or scope grant | Approve once for the current run's exact bounded request and authority; re-probe and record the scope | `auto-resolve` | Generic dispatch record |
| DISPATCH-02 | `oat-dispatch-subagents` | Agent-improvised alternate route | Approve named target and scope | Do not convert autonomy into standing route policy; use a policy-resolved/native route or stop | `boundary:repository-policy-approval` | Blocking dispatch record |
| PDISPATCH-01 | `oat-project-dispatch-subagents` | Per-task route reauthorization | Reauthorize a configured route | No prompt: configured project policy is already standing, scope-bound authorization | `auto-resolve` | `selection_source: policy-resolved` |

## Prompt-scan comparison

The verification scan is:

```bash
rg -n -i "AskUserQuestion|ask (the user|once)|approval|confirm|prompt|choose|wait for" \
  .agents/skills/<root>/ --glob '*.md'
```

It was run recursively for each of the fifteen roots below. Every discovered
site is listed. `NG` means the phrase is metadata, output text, a no-prompt
assertion, a prompt payload, or another non-interactive occurrence rather than
a reachable gate. A range such as `38-39` accounts for both matching lines.

| Skill root / file | `file:line -> inventory row` comparison |
| --- | --- |
| `oat-project-new/SKILL.md` | `8 -> NG`; `38-39,43 -> NEW-01`; `58 -> NEW-02`; `74,76 -> NG` |
| `oat-project-quick-start/SKILL.md` | `9,52 -> NG`; `36,203,211,213,215 -> QS-04`; `88-89,93 -> QS-01`; `109 -> QS-02`; `236 -> NG`; `241,245,249,251,253,282,288 -> QS-05`; `306,315,326-328,331,333 -> QS-06`; `384 -> QS-07`; `393,452,464 -> NG`; `511 -> QS-08`; `532,535,543 -> QS-09`; `573 -> QS-10`; `728 -> NG`; `735 -> QS-12`; `750 -> NG` |
| `oat-project-discover/SKILL.md` | `4,7,27-28,40 -> NG`; `246,277 -> DISC-03`; `318,320,329 -> DISC-05`; `389,392,394,398 -> DISC-06`; `405,407,423 -> DISC-07`; `476 -> NG` |
| `oat-project-design/SKILL.md` | `4,7,16,26 -> NG`; `55 -> DES-01`; `67,84 -> NG`; `88,90,97,105,111,118,120-121,125,154,156,160 -> DES-03`; `162,165,248,250 -> DES-04`; `325 -> NG`; `330,339-340,352,355,361 -> DES-05`; `446-447,449,451,488,502 -> DES-06`; `534,547 -> NG`; `560-561,564,587,589,591,596,599,606,608,610,615,619,622,624,652 -> DES-07`; `671,700 -> NG` |
| `oat-project-design/references/selective-review-pass.md` | `55,111 -> DES-06`; `112 -> DES-07` |
| `oat-project-plan/SKILL.md` | `8,27,37 -> NG`; `74 -> PLAN-01`; `97 -> PLAN-02`; `170 -> NG`; `179 -> PLAN-04`; `207,326,328,332-334 -> NG`; `348 -> PLAN-05`; `374,403 -> PLAN-06`; `414 -> NG`; `418 -> PLAN-07`; `422,427 -> PLAN-08`; `488 -> NG`; `516,519 -> PLAN-10`; `606 -> NG`; `613 -> PLAN-11`; `625 -> NG` |
| `oat-project-import-plan/SKILL.md` | `9,21,58 -> NG`; `86-87,91 -> IMPORT-01`; `141,147 -> IMPORT-03`; `159 -> IMPORT-04`; `183,196 -> NG`; `276 -> IMPORT-06`; `288-289 -> IMPORT-07`; `453 -> NG`; `460 -> IMPORT-09` |
| `oat-project-implement/SKILL.md` | `9,29,55 -> NG`; `113 -> IMPLEMENT-01`; `158 -> NG` |
| `oat-project-implement/references/plan-and-resume.md` | `47 -> IMPLEMENT-02`; `108,113,121,123,129-131,135,137,139,141,159,161,163 -> IMPLEMENT-03`; `168,171-172 -> IMPLEMENT-04`; `211 -> IMPLEMENT-05`; `235 -> NG`; `238 -> IMPLEMENT-06`; `255 -> IMPLEMENT-07` |
| `oat-project-implement/references/dispatch-and-dry-run.md` | `52,69 -> IMPLEMENT-08`; `154,179 -> IMPLEMENT-09`; `198,225,244,332 -> NG`; `414,418,420-422,435,440,453,477-478,514 -> NG` |
| `oat-project-implement/references/completion-and-closeout.md` | `165,184,194,197,219,221,236 -> IMPLEMENT-11`; `249 -> NG`; `265 -> IMPLEMENT-12`; `271-274 -> IMPLEMENT-14`; `280,282-286,292,307-308,311,313-316,318-319,321-322,329-330 -> IMPLEMENT-13, IMPLEMENT-14, IMPLEMENT-15, IMPLEMENT-16`; `332,334,336,343,359,362,370 -> IMPLEMENT-17`; `421 -> NG`; `428 -> IMPLEMENT-18` |
| `oat-project-implement/references/phase-execution.md` | `199 -> NG`; `260-261 -> IMPLEMENT-10` |
| `oat-project-document/SKILL.md` | `4,8,13 -> NG`; `46 -> DOCUMENT-03`; `54,76 -> DOCUMENT-02`; `106 -> DOCUMENT-01`; `200,238 -> NG`; `384,416 -> DOCUMENT-02`; `546 -> NG` |
| `oat-project-summary/SKILL.md` | `4,7,30 -> NG`; `86 -> SUMMARY-01`; `201,203,209-210,249,257,297 -> NG` |
| `oat-project-pr-final/SKILL.md` | `4,7,26,43 -> NG`; `104 -> PRFINAL-01` |
| `oat-project-complete/SKILL.md` | `7,16 -> NG`; `57,61,63,80,89,92,95,103,105,114,124 -> COMPLETE-01`; `140 -> NG`; `205,214 -> COMPLETE-02`; `219,223 -> COMPLETE-03`; `283,468 -> NG` |
| `oat-project-review-provide/SKILL.md` | `4,7,28,34,44,93 -> NG`; `166 -> REVIEWPROVIDE-02`; `236,239-240,261 -> REVIEWPROVIDE-04`; `308,314-316,318 -> REVIEWPROVIDE-05`; `370,373 -> REVIEWPROVIDE-06`; `621 -> REVIEWPROVIDE-07`; `632,664 -> REVIEWPROVIDE-08`; `645,647,751,770-772,778 -> NG`; `869 -> REVIEWPROVIDE-09`; `911,927 -> NG` |
| `oat-project-review-receive/SKILL.md` | `4,7,26,40,71,128,178,211,215,252,259 -> NG`; `267 -> REVIEWRECEIVE-01`; `273-274,278 -> NG`; `482 -> REVIEWRECEIVE-08`; `517 -> REVIEWRECEIVE-02`; `548 -> REVIEWRECEIVE-04`; `590 -> REVIEWRECEIVE-05`; `614 -> REVIEWRECEIVE-06`; `647 -> REVIEWRECEIVE-07`; `721,724 -> NG` |
| `oat-dispatch-subagents/SKILL.md` | `94,98 -> DISPATCH-01`; `110 -> PDISPATCH-01`; `117,123 -> DISPATCH-02`; `126 -> PDISPATCH-01` |
| `oat-dispatch-subagents/references/provider-cursor.md` | `40,49 -> NG` |
| `oat-dispatch-subagents/references/record-schema.md` | `74 -> NG` |
| `oat-dispatch-subagents/references/provider-claude.md` | `44 -> NG` |
| `oat-dispatch-subagents/references/provider-codex.md` | `64 -> NG` |
| `oat-project-dispatch-subagents/SKILL.md` | `97,105 -> PDISPATCH-01` |

Zero discovered prompt sites are unmapped. The broad scan's `NG` sites are
accounted for explicitly and do not represent user-input waits.
