# Fact-base processing contract

`processFactBase(binding, options)` produces one
`explainer-kit.fact-base/v1` record plus processing diagnostics. It has no
provider-specific dispatch logic and reads no ambient configuration.

## Result

The function resolves to:

```js
{
  factBase, // valid explainer-kit.fact-base/v1
  checks,   // consistency/freshness diagnostics
  critic,   // critic invocation and provenance metadata
}
```

All claims are cited. Claims that cannot be reconciled remain in
`unresolvedClaims` with one of the contract's closed reason values.

## Supplied mode

Use:

```js
await processFactBase({
  mode: 'supplied',
  freshnessPolicy: 'live-wins',
  factBase,
});
```

The processor validates the supplied v1 record, verifies unique source and
claim IDs, verifies that every citation names a declared source, verifies that
every override names a confirmed claim, and compares `generatedAt` plus each
available source `observedAt` with the freshness window. Staleness produces a
warning; structural or citation inconsistency rejects the input.

Supplied mode never invokes the adversarial critic. Its `critic` result is
`{ invoked: false, reason: 'supplied-mode-lightweight-check-only' }`.

## Federated mode

Each source document contains a schema-compatible source and extracted claims:

```js
{
  mode: 'federated',
  freshnessPolicy: 'live-wins',
  sourceDocuments: [{
    source: {
      id,
      kind,
      locator,
      revision,
      hash,
      observedAt,
      authoritativeFor,
    },
    claims: [{ id, text, locator, sections }],
  }],
  overrides: [{ claimId, decision, confirmedAt }],
}
```

Optional `sections` entries are recipe `requiredNarrative` IDs. Tagged claims
are routed only to those sections; untagged claims remain shared context for
every required section. Federated reconciliation preserves shared scope when
any agreeing selected observation is untagged.

For conflicting text under one claim ID, an `authoritativeFor` declaration
wins first. Otherwise the newest `observedAt` wins. A tie remains
`contradictory`. Operator overrides take final precedence, produce an
`overridden` claim, remain explicit in `overrides`, and suppress critic
findings for that claim.

Federated processing requires `options.critic`, an asynchronous,
provider-neutral callback. The callback receives only data:

```js
async function critic({ freshnessPolicy, sources, claims, overrides }) {
  return {
    criticId: 'stable-callback-id',
    executedAt: new Date().toISOString(),
    findings: [
      {
        claimId: 'status',
        classification: 'contradictory',
        text: 'The status sources disagree.',
        sourceIds: ['snapshot', 'live'],
      },
    ],
  };
}
```

The seam deliberately contains no provider, model, command, or dispatch
field. The caller owns critic execution; the core only invokes the callback
and integrates its returned data.

## Critic provenance

Every federated invocation adds one source:

```js
{
  id: `critic:${criticId}`,
  kind: 'other',
  locator: `critic-callback:${criticId}`,
  hash: canonicalHash(criticResult),
  observedAt: executedAt,
}
```

The result's `critic` metadata repeats the stable critic ID, execution time,
source ID, and canonical result hash. Integrated findings cite both this
synthetic critic source and every declared source named by the finding. This
makes the critic's contribution auditable without exposing or depending on a
provider-specific implementation.

Critic classifications map directly to unresolved-claim reasons. A finding
removes a previously confirmed claim and creates an unresolved claim, or
updates an already unresolved claim while preserving its existing citations.
