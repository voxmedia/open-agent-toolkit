# External Action Protocol

The CLI emits a versioned provider-neutral action containing a durable
operation ID, step ID, action digest, provider context, semantic intent,
expected observation contract, and (for mutation) the exact outbound
projection and safety-result digests.

Before execution:

1. Confirm the action belongs to the current durable operation and step.
2. Discover a currently granted capability from its live description.
3. Confirm semantic operation and exact provider context.
4. For a mutation, confirm the projection and safety digests are present. Do
   not reconstruct, enrich, or reinterpret the projection.

Execute at most once. Return only one observation with:

- the unchanged operation ID, step ID, and action digest;
- observation time and host-surface kind;
- bounded capability evidence digest and exact provider context;
- sanitized classification, durable identity/aliases when observed,
  allowlisted fields, revision evidence, and a diagnostic code.

Do not return a native request, raw response, captured catalog, live help text,
process environment, authentication data, or provider-generated success claim.
Use:

```bash
oat pjm remote operation continue \
  --operation <operation-id> \
  --observation-stdin \
  --json
```

A repeated, stale, mismatched, oversized, or unsanitized observation must be
rejected by the CLI. An ambiguous post-attempt outcome remains uncertain and
must be reconciled before any new execution choice or retry.
