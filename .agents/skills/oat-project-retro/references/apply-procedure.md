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
2. **Agent instruction:** choose the narrowest existing applicable
   `AGENTS.md`, skill, or provider-neutral instruction. Do not create nested
   instruction files solely for discoverability.
3. **Rule:** update the canonical rule whose scope matches the finding. Preserve
   provider-neutral guidance and existing precedence.
4. **Decision:** ensure the decision scaffold exists, then run:

   ```bash
   oat decision new "<title>" --status accepted --context "<context>" --decision "<decision>" --consequences "<consequences>"
   ```

   Use the generated record and index. Never hand-author a decision ID or edit
   the managed index.

5. **Code follow-up:** do not implement it here, even when technically small.
   A code follow-up defaults to `Disposition: file`.

## Per-Item Writeback

After a successful application:

- set `Status: applied`;
- set `Applied-ref` to the resulting commit/path reference; and
- recompute `oat_retro_promotions` from all RP apply-items.

On explicit rejection, set `Status: rejected` and preserve the reason in item
prose. On transient failure, leave `Status: proposed` (or `approved` when
approval remains valid), report the failure, and continue only when safe.

Apply mode may mutate only `Status`, `Applied-ref`, and the promotions rollup
inside the artifact. It must not alter file-items, UP items,
`oat_retro_filing`, item IDs, dispositions, or proposal bodies.

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
