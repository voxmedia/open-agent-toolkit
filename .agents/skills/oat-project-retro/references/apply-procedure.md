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
   A docs item whose target canonical path is `project-log.md` is an
   append-only correction special case:
   - Use `oat project log append`; never directly edit `project-log.md`.
   - Require the immutable proposal body to identify the prior heading or event
     being corrected, and preserve the original entry.
   - Perform semantic post-side-effect recovery before appending again: inspect
     later entries for the exact correction, verify that any match represents
     the proposal, and recover it instead of repeating the append. A partial,
     divergent, or ambiguous match requires direction.
   - Record `Applied-ref` only after the correction and retro writeback are
     durably committed.

   This special case is limited to `project-log.md` targets and does not add or
   change the public RP type vocabulary. All other docs items continue to
   update the canonical existing page under the normal docs apply contract.

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
  whenever possible.
- Before each commit, format touched files, run surface-relevant checks, and
  verify the item still has the expected pre-apply status.
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
