# Retro Promotion Apply Procedure

Use this procedure only for `RP-NN` items whose authoritative field is
`Disposition: apply`. Never mutate RP file-items or any UP item; those belong
to `oat-project-retro-file`.

## Classification and Routing

| Type                 | Default disposition | Apply behavior                                        |
| -------------------- | ------------------- | ----------------------------------------------------- |
| `docs`               | `apply`             | Edit canonical repository documentation               |
| `agents-instruction` | `apply`             | Edit the narrowest existing agent instruction surface |
| `rule`               | `apply`             | Edit the canonical scoped rule                        |
| `decision`           | `apply`             | Create a durable record with `oat decision new`       |
| `code-follow-up`     | `file`              | Leave for the filing skill                            |

`Disposition` is authoritative when it differs from the default. Apply mode
processes only apply-items with `Status: proposed | approved`. It skips
`applied` and `rejected` items, so interrupted or repeated runs resume
idempotently.

## Consent

- Interactive runs present each proposed item, target, rationale, and concrete
  edit. Apply only approved items.
- Non-interactive runs apply only when `workflow.retro.apply: auto`.
- A configured `auto` value authorizes the bounded register changes, not
  architecture, security, product-scope, credential, or destructive changes.
  Stop for explicit direction at those boundaries.

When approval occurs before editing, set `Status: approved`. If execution
continues immediately, this can be written back together with the final
`applied` state.

## Application by Type

1. **Docs:** update the canonical existing page. Avoid duplicate documents.
   Route a docs item to the append-only correction special case only when its
   target canonical path passes this matcher:
   1. Parse the `Target` field value, removing at most one matching pair of
      Markdown backticks.
   2. Reject an empty value, NUL, an absolute POSIX path, a Windows drive or UNC
      path, a trailing separator, or any unresolved `..` segment.
   3. Convert `\` separators to `/`, remove leading `./`, remove interior `.`
      segments, and collapse repeated separators.
   4. Route only when the normalized target's exact, case-sensitive final path
      component is `project-log.md`. A lookalike is an ordinary docs target,
      not a correction. Any ambiguous normalization stops with no write.

   | Scenario            | Target                                     | Disposition   |
   | ------------------- | ------------------------------------------ | ------------- |
   | Repo-relative POSIX | `.oat/projects/shared/demo/project-log.md` | route         |
   | Windows separators  | `.oat\projects\shared\demo\project-log.md` | route         |
   | Exact basename      | `project-log.md`                           | route         |
   | Lookalike suffix    | `project-log.md.bak`                       | ordinary-docs |
   | Prefixed basename   | `my-project-log.md`                        | ordinary-docs |
   | Nested child        | `project-log.md/child`                     | ordinary-docs |
   | Ambiguous traversal | `.oat/projects/../demo/project-log.md`     | stop          |
   | Absolute path       | `/tmp/project-log.md`                      | stop          |

   For a routed item:
   - Use `oat project log append`; never directly edit `project-log.md`.
   - Require the immutable proposal body to identify the prior heading or
     event being corrected, preserve the original entry, and supply a stable
     `ORIGINAL_ENTRY_ANCHOR`. Set `RP_ID` to the item's stable `RP-NN` ID.
   - Construct `CORRECTION_BODY` with the exact stable identity first line
     `Retro correction id=$RP_ID original=$ORIGINAL_ENTRY_ANCHOR`, followed by
     the immutable correction text. The ID, anchor, and correction text must
     match exactly during recovery.
   - Perform semantic post-side-effect recovery before appending: search the
     project log and Git state for the exact identity first line. Zero matches
     permits one append. Exactly one match permits recovery only when the
     original-entry anchor and full correction body are semantically exact; do
     not append again. Multiple, partial, or divergent matches stop for
     direction without appending.
   - Only when recovery finds zero matches, run the complete judgment append
     invocation exactly once:

     Define `parse_synced_push_receipt` once before applying records:

     ```bash
     parse_synced_push_receipt() {
       node -e '
     let value;
     try { value = JSON.parse(process.argv[1]); } catch { process.exit(1); }
     if (!["pushed", "up-to-date"].includes(value.status) || !/^[0-9a-f]{40}$/.test(value.sha)) process.exit(1);
     process.stdout.write(value.sha);
     ' "$1"
     }

     oat project log append --project "$PROJECT_PATH" \
       --type feedback \
       --scope project \
       --area "retro correction $RP_ID" \
       --body "$CORRECTION_BODY"
     ```

   - Commit the project-log append without retro writeback using the scope
     guard below. Verify the commit contains the normalized project-log path
     and exact correction body. Capture its full 40-character SHA and exact
     generated heading.

     ```bash
     PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || { echo "oat: cannot resolve project scope for $PROJECT_PATH; refusing to commit artifacts" >&2; exit 1; }
     # fail closed: never fall back to branch bookkeeping when scope resolution fails
     if [ "$PROJECT_SCOPE" = "synced" ]; then
       CORRECTION_PUSH=$(oat project push "$PROJECT_PATH" --message "chore(oat): apply retro correction $RP_ID" --json)
       CORRECTION_COMMIT=$(parse_synced_push_receipt "$CORRECTION_PUSH") || { printf '%s\n' "$CORRECTION_PUSH" >&2; echo "Recovery: run oat project pull \"$PROJECT_PATH\", resolve conflicts, then retry this push." >&2; exit 1; }
     else
       git add "$PROJECT_PATH/project-log.md"
       git commit -m "chore(oat): apply retro correction $RP_ID"
       CORRECTION_COMMIT=$(git rev-parse HEAD)
     fi
     ```

   - In a later retro-only writeback commit, set the RP status and
     `Applied-ref`. The reference names the full 40-character correction commit
     plus the exact generated heading, serialized as
     `<40-character-sha> :: <exact-generated-heading>`. Consider `Applied-ref`
     recorded only after that writeback commit succeeds; at that point the
     correction and retro writeback are durably committed.

   The transition table is authoritative:

   | Scenario                  | Starting state                                    | Required transition                                                                              |
   | ------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
   | Fresh                     | No exact correction                               | Append once; commit project log; write back retro in a later commit                              |
   | Uncommitted append        | One exact uncommitted correction                  | Do not append; commit the recovered project-log mutation; then write back                        |
   | Committed append          | One exact committed correction and RP not applied | Do not append; verify full commit, path, and body; then write back                               |
   | Append failure            | Command fails                                     | No correction commit or writeback; retain prior RP status                                        |
   | Correction commit failure | Append exists but commit fails                    | No writeback; retain prior RP status; recover exact append on retry                              |
   | Writeback commit failure  | Correction commit succeeds but retro commit fails | Preserve correction commit; restore non-applied artifact; retry writeback from recovered receipt |
   | Ambiguous recovery        | Multiple or divergent matches                     | Stop with no append, commit, or writeback                                                        |

   This special case is limited to normalized `project-log.md` targets and does
   not add or change the public RP type vocabulary. All other docs items
   continue to update the canonical existing page under the normal docs apply
   contract.

2. **Agent instruction:** choose the narrowest existing applicable
   `AGENTS.md`, skill, or provider-neutral instruction. Do not create nested
   instruction files solely for discoverability.
3. **Rule:** update the canonical rule whose scope matches the finding. Preserve
   provider-neutral guidance and existing precedence.
4. **Decision:** ensure the decision scaffold exists, then run:

   ```bash
   oat decision new "<title>" --status accepted --context "<context>" --decision "<decision>" --consequences "<consequences>"
   ```

   Before creating it, compute the slug with the CLI's lowercase,
   ASCII-folded, hyphen-collapsed, 30-character whole-word rule (including
   trailing stop-word trimming). Perform a **date-independent exact-slug**
   lookup for `DR-<6 digits>-<slug>.md`; never use a loose suffix glob.

   Use the granted `Glob` tool, rooted at the repository, with this pattern
   after substituting the computed slug:

   ```text
   .oat/repo/reference/decisions/DR-??????-<slug>.md
   ```

   The six `?` characters anchor the date segment to exactly six characters,
   and the remaining slug must match exactly. Handle the returned paths
   deterministically:
   - **Zero matches:** create the record with `oat decision new`, capture its
     reported ID/path, and verify it represents the current proposal before
     writeback.
   - **Exactly one match:** read it and verify its normalized title, context,
     decision, and consequences represent the current proposal. On a match,
     treat this as interrupted post-side-effect recovery: do not create a
     duplicate, and recover `Applied-ref` from that record's ID/path. On a
     proposal mismatch, stop for direction and perform no write.
   - **Multiple matches:** stop with an ambiguity error and perform no write;
     never choose a record by date, ordering, or convenience.

   Use only the generated or verified record and managed index. Never
   hand-author a decision ID or edit the managed index.

5. **Code follow-up:** do not implement it here, even when technically small.
   A code follow-up defaults to `Disposition: file`.

## Per-Item Writeback

After a successful application:

- set `Status: applied`;
- set `Applied-ref` to the resulting commit/path reference; and
- clear `Disposition-note` to `—`; and
- recompute `oat_retro_promotions` from all RP apply-items; and
- refresh the bounded `## Current State` contents from register fields and
  frontmatter rollups.

On explicit rejection, set `Status: rejected` and write the reason to the
mutable `Disposition-note` field. On transient failure, leave
`Status: proposed` (or `approved` when approval remains valid), record bounded
execution context in `Disposition-note`, report the failure, and continue only
when safe.

Apply mode may mutate only `Status`, `Applied-ref`, `Disposition-note`, and the
promotions rollup inside the artifact, plus the contents of `## Current State`.
It must not alter file-items, UP items, `oat_retro_filing`, item IDs,
dispositions, proposal bodies, or any other narrative. Refresh `Current State`
without rewriting proposal bodies. Proposal bodies are stable and immutable
after generation.

Compute `oat_retro_promotions` exactly:

- `none` when no apply items exist;
- `proposed` when apply items exist and none are settled;
- `partial` for a mix of settled and unsettled apply items; and
- `complete` when all apply items are settled.

`proposed` and `approved` are unsettled; `applied` and `rejected` are settled.

## Commit and Resume Strategy

- Use one commit per item when targets are independent, review boundaries
  differ, or one item may fail without invalidating the rest.
- Use one reviewed batch when the items are inseparable edits to the same
  canonical surface.
- Include the target edit and its artifact status writeback in the same commit
  for shared and local projects whenever possible. Synced projects and the
  project-log correction route are explicit two-commit transactions: the
  repository target commit must precede the retro-only project-ref writeback
  commit so `Applied-ref` can name an already durable target.
- Before each commit, format touched files, run surface-relevant checks, and
  verify the item still has the expected pre-apply status.
- Before applying a non-project-log item, build `RETRO_TARGET_PATHS` from the
  exact repository files owned by that proposal. A docs, agent-instruction, or
  rule item lists every exact edited canonical file. A decision item lists the
  exact generated or verified decision record and includes the managed decision
  index only when this application changed it. Never stage a target directory.
- Fail if any owned target or the retro artifact was staged before this item,
  then snapshot unrelated staged state with
  `UNRELATED_STAGED_PATCH_BEFORE=$(git diff --cached --binary)`. After every
  commit, require `git diff --cached --binary` to remain byte-for-byte equal to
  that snapshot.
- Persist each target and retro writeback under this fail-closed scope guard:

  ```bash
  PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || { echo "oat: cannot resolve project scope for $PROJECT_PATH; refusing to commit artifacts" >&2; exit 1; }
  # fail closed: never fall back to branch bookkeeping when scope resolution fails
  for OWNED_PATH in "${RETRO_TARGET_PATHS[@]}" "$PROJECT_PATH/references/project-retro.md"; do
    git diff --cached --quiet -- "$OWNED_PATH" || { echo "oat: owned retro path was already staged: $OWNED_PATH" >&2; exit 1; }
  done
  UNRELATED_STAGED_PATCH_BEFORE=$(git diff --cached --binary)

  if [ "$PROJECT_SCOPE" = "synced" ]; then
    # RETRO_TARGET_PATHS contains exact ordinary-doc, agent-instruction, rule,
    # or decision-record paths; include the managed decision index only when changed.
    git add -- "${RETRO_TARGET_PATHS[@]}"
    git commit --only -m "chore(oat): apply retro target $RP_ID" -- "${RETRO_TARGET_PATHS[@]}"
    RETRO_TARGET_COMMIT=$(git rev-parse HEAD) || exit 1
    RETRO_TARGET_COMMIT_PATHS=$(git diff-tree --no-commit-id --name-only -r "$RETRO_TARGET_COMMIT") || exit 1
    # Require RETRO_TARGET_COMMIT_PATHS to equal the complete normalized
    # RETRO_TARGET_PATHS set exactly. Missing or additional paths stop writeback.
    APPLIED_REF="$RETRO_TARGET_COMMIT :: ${RETRO_TARGET_PATHS[*]}"

    # Only now write Status: applied, Applied-ref: $APPLIED_REF, the cleared
    # disposition note, promotions, and Current State into project-retro.md.
    RETRO_PUSH=$(oat project push "$PROJECT_PATH" --message "chore(oat): record retro application $RP_ID" --json) || exit 1
    RETRO_WRITEBACK_COMMIT=$(parse_synced_push_receipt "$RETRO_PUSH") || { printf '%s\n' "$RETRO_PUSH" >&2; echo "Recovery: run oat project pull \"$PROJECT_PATH\", resolve conflicts, then retry this push." >&2; exit 1; }
  else
    # Write back the artifact before this commit, then preserve the single-commit
    # shared/local route with only the exact target and retro paths.
    APPLIED_REF="${RETRO_TARGET_PATHS[*]}"
    RETRO_COMMIT_PATHS=("${RETRO_TARGET_PATHS[@]}" "$PROJECT_PATH/references/project-retro.md")
    git add -- "${RETRO_COMMIT_PATHS[@]}"
    git commit --only -m "chore(oat): apply retro item $RP_ID" -- "${RETRO_COMMIT_PATHS[@]}"
    RETRO_TARGET_COMMIT=$(git rev-parse HEAD) || exit 1
  fi

  UNRELATED_STAGED_PATCH_AFTER=$(git diff --cached --binary)
  [ "$UNRELATED_STAGED_PATCH_AFTER" = "$UNRELATED_STAGED_PATCH_BEFORE" ] || { echo "oat: unrelated staged state changed during retro application" >&2; exit 1; }
  ```

  The shown writeback comments are ordered operations, not permission to edit
  fields before the synced target receipt exists. Format and verify every exact
  repository target before `git add`. For a newly created decision, verify the
  reported record and managed index before the parent commit. For an existing
  matching decision, recover its existing durable commit and exact path receipt
  rather than creating or recommitting it; if durability cannot be proven, stop.

- On re-run, rescan the artifact and process only remaining
  `proposed | approved` apply-items. Never repeat an `applied` item.

For **every apply type**, perform post-side-effect recovery before repeating an
eligible item: inspect the declared target for the exact proposed semantic
change, verify the existing result represents the current proposal, and
recover `Applied-ref` when it does. This includes docs, agent-instruction,
rule, and decision items. A matching side effect plus missing writeback is an
interrupted success, not permission to apply twice. A partial, divergent, or
unverifiable target requires direction; never overwrite or claim it
automatically.

For synced projects, classify interruption recovery at the two-commit boundary:

| Interruption point                                    | Required recovery                                                                                                                                                                                                                            |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Before the parent target commit                       | The repository target is not durable. Leave the RP item unsettled, restore or finish only its exact target paths, rerun formatting and verification, then create the parent target commit. Do not write back or push the retro artifact yet. |
| Between the parent target commit and project-ref push | Verify the durable parent commit contains exactly the complete target-path set and represents the proposal. Recover `Applied-ref` from its full SHA and paths, do not reapply the target, then write back and push the retro artifact.       |
| After both commits                                    | Verify both the exact parent target receipt and the project-ref writeback receipt. Treat a matching `Status: applied` and `Applied-ref` as complete and skip the item; repair only a missing idempotent writeback from the two receipts.     |

If the parent target commit succeeds but retro writeback or project-ref push
fails, preserve that immutable parent commit, leave the artifact unsettled, and
retry only writeback from the recovered receipt. Any partial, extra-path,
divergent, or ambiguous receipt requires direction without another commit.
