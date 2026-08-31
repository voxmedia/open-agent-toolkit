---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-08-31
oat_generated: false
---

# Discovery: retire-archived-synced-project

## Initial Request

Create a high-priority quick-workflow project for
`BL-260831-retire-archived-synced-project`. Once a synced project has completed
and its archive is durable, remove its tracked JSON record from the active
synced namespace just as shared project sources are removed. Preserve durable
history and recovery guarantees rather than converting cleanup into destructive
project-history deletion.

## Request Assessment

The product requirement is well-understood. Prior discussion selected the
L-sized terminal lifecycle contract rather than a display-only fix: active
records and active discovery refs should disappear after successful archive,
while archived identity, commit reachability, migration, and retry safety remain
available.

## Current Behavior

- Synced records combine active discovery identity, completion state, and
  archive retry bindings in `.oat/projects/synced/<slug>.json`.
- Archive marks that record complete, removes the nested checkout, and retains
  `refs/oat/projects/<slug>`.
- Listing classifies any record without a checkout as `recorded-absent`, without
  considering completion or archive state, and recommends `oat project pull`.
- Pull and open can then rematerialize the archived project. Remote discovery
  also treats every `refs/oat/projects/*` ref as potentially active.
- SHA-pinned GitHub artifact links use the commit SHA and can remain durable as
  long as a non-active ref continues to make that commit reachable.

## Solution Space

### Approach 1: Terminal namespace transition (selected)

After archive durability is established, remove the active synced record and
move or copy the retained history to a completed-only ref namespace such as
`refs/oat/completed/<slug>`. Active discovery ignores completed refs, while the
completed ref, archive metadata, and durable summary preserve terminal identity
and commit reachability.

This is the right choice when completed projects must disappear from active
surfaces without deleting their durable history. It requires an explicit,
idempotent transition protocol across Git refs, the parent-branch lifecycle
commit, local archive state, and optional S3 synchronization.

### Approach 2: Relocate the JSON tombstone

Move the record to a separate tracked completed-record directory and teach all
readers about that namespace. This preserves a single metadata object but leaves
per-project lifecycle tombstones in source control indefinitely and adds a
second record inventory to maintain.

### Approach 3: Reader-only suppression

Keep the current record and ref, but hide completed archived rows and block
pull/open. This is smaller, but it does not satisfy the requested cleanup model
and leaves active-discovery state permanently overloaded with terminal projects.

### Chosen Direction

Use the terminal namespace transition. The active JSON record is transaction
state, not the permanent completion receipt. On success, durable terminal
evidence lives in the archive metadata, project summary, and completed ref (or
an equivalent terminal representation), while active list/pull/open discovery
has no claim on the project.

## Key Decisions

1. **Active record cleanup:** Successful synced archival deletes
   `.oat/projects/synced/<slug>.json` in the exact lifecycle commit.
2. **History retention:** Completion reclassifies the project ref outside
   `refs/oat/projects/*` instead of pruning project history. Full-SHA links must
   remain reachable.
3. **Discovery semantics:** Completed refs and terminal archive evidence are not
   candidates for active remote discovery, pull, open, or continuation advice.
4. **Durable identity:** Archive snapshot identity, source-ref SHA, completion
   time, and project slug remain recoverable without the active record.
5. **Transaction safety:** Every interruption point must be retryable without a
   second archive seal, a changed snapshot identity, a mismatched source ref, or
   accidental project resurrection.
6. **Configured archive durability:** When S3 synchronization is configured for
   completion, terminal record/ref cleanup cannot claim success until that
   synchronization succeeds; unconfigured S3 remains outside the required
   durability set.
7. **Compatibility:** Existing complete records and retained active refs need an
   explicit migration or compatibility path; active and incomplete projects
   must retain their current behavior.

## Constraints

- Preserve the exact source-ref SHA binding already used by archive retries.
- Preserve local archive and summary exports across transition and recovery.
- Keep parent-branch lifecycle commits exact-path and independently verifiable.
- Do not make `project prune` the normal completion path; prune intentionally
  destroys ref reachability and remains a separate destructive operation.
- Do not silently regenerate malformed or missing lifecycle metadata.
- Maintain the existing shared-project completion behavior.
- Include shipped CLI documentation and lockstep public package versioning
  required by repository policy.

## Success Criteria

- A completed and successfully archived synced project leaves no JSON record in
  the active synced namespace and no ref in the active project-ref namespace.
- Its archive metadata, durable summary, source commit, and full-SHA links remain
  recoverable and reachable through terminal state.
- Project list, remote list, pull, open, links, prune, dashboard, archive sync,
  and retry/recovery paths agree on the terminal classification.
- Legacy completed records and retained refs can be migrated or handled safely
  without rematerializing archived projects.
- Transaction-level tests cover failures before, during, and after ref
  reclassification and record deletion, proving idempotent recovery and one
  archive seal.
- Documentation describes the active-to-completed transition and the difference
  between retained terminal history and destructive pruning.

## Out of Scope

- Changing active synced-project collaboration or nested-worktree behavior.
- General Git ref garbage collection or destructive history retention policy.
- Redesigning archive package contents, recap structure, or unrelated S3 sync
  behavior.
- General project/review/gate integrity, receipt/event redesign, ReviewPlan, or
  bookkeeping-only re-review policy.

## Deferred Ideas

- A general completed-project browsing command or dashboard is deferred until
  usage evidence shows that terminal archives need a first-class interactive
  surface beyond archive sync and summaries.

## Open Questions

No product question blocks planning. Implementation must validate the safest
remote ref-transition primitive and encode an explicit recovery state if the
Git remote cannot make the completed-ref creation and active-ref deletion one
atomic operation.

## Assumptions

- `origin` supports custom refs for both active and completed namespaces.
- Existing SHA-pinned links remain valid when the commit stays reachable from a
  completed ref.
- The existing archive metadata and summary surfaces can carry the terminal
  identity needed after record deletion, with additive fields if required.

## Risks

- **Cross-boundary partial completion:** Git ref updates and parent-branch
  commits cannot be assumed to share one transaction.
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation:** Model explicit transition states and test every durable
    boundary with idempotent retries.
- **Legacy resurrection:** Old complete records or retained active refs could be
  rediscovered and pulled.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Add compatibility classification and a bounded migration
    path before enabling automatic cleanup.
- **Link regression:** Deleting or moving the only reachability root could allow
  archived commits to be garbage-collected.
  - **Likelihood:** Low
  - **Impact:** High
  - **Mitigation:** Create and verify completed ref reachability before removing
    the active ref, then test rendered full-SHA links.

## Next Steps

Confirm the requirement set, then generate an execution-ready quick plan with
separate terminal-state, discovery/action, and integration phases.
