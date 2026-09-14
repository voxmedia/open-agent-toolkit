# Fact-base contract

`bundle.mjs` writes the authoring inputs under `<run-root>/source/`. The
machine contract is `fact-base.json`; `fact-base.md` is its readable rendering;
`ledger.json` is the bounded verification index.

## Fact-base record

`source/fact-base.json` is an `explainer-kit.fact-base/v1` object with exactly
these eight required keys:

| Key                | Flow value or meaning                                                        |
| ------------------ | ---------------------------------------------------------------------------- |
| `schemaVersion`    | `explainer-kit.fact-base/v1`                                                 |
| `generatedAt`      | ISO date-time for this bundle                                                |
| `mode`             | `supplied`; the agent-authored flow assembles the fact base before authoring |
| `freshnessPolicy`  | `live-wins`                                                                  |
| `sources`          | Hash-bound allowlisted input files                                           |
| `claims`           | Confirmed source-backed claims                                               |
| `unresolvedClaims` | Inputs or claims that cannot be stated as confirmed                          |
| `overrides`        | Explicit claim decisions; normally empty                                     |

The record is canonical JSON and must pass
`validateContract('fact-base', value)` before authoring starts. It carries no
claims index or browser evidence.

## Sources and citations

Each selected input is represented by a source:

```json
{
  "id": "source-1",
  "kind": "file",
  "locator": "plan.md",
  "hash": "sha256:…"
}
```

The flow may add the `role: "bundle-input"` marker used when the manifest
copies input hashes. Every claim citation has exactly the source identity and
the source-relative location:

```json
{ "sourceId": "source-1", "locator": "plan.md:40-44" }
```

Do not add `path`, `lineRange`, repository, or URL backlink fields to
agent-authored-flow citations. Every citation must name a declared source.

## Claims

Confirmed claims have `{ id, text, status: "confirmed", citations }`.
Unresolved claims retain their text and citations with one schema-defined
reason: `contradictory`, `stale`, `missing-evidence`, or
`needs-confirmation`. Inputs that cannot be parsed are represented here rather
than silently omitted.

The author may summarize confirmed claims but must not invent a connective
fact. An unresolved claim remains visibly uncertain in the artifact.

## Anchor ledger

`source/ledger.json` is derived from the same claims and has four keys:

```json
{
  "terminology": [{ "term": "agent-authored-recap" }],
  "numbers": [{ "subject": "p02", "value": "4" }],
  "statuses": [{ "subject": "p02", "value": "in_progress" }],
  "claims": [
    {
      "subject": "p02",
      "value": "4",
      "kind": "number",
      "claimId": "claim-1"
    }
  ]
}
```

`terminology`, `numbers`, and `statuses` are the bounded anchor groups used by
the ledger-to-page cohesion check. Each group contains at most 12 entries; an
individual group may be empty, but all three may not be empty together.

`claims` is the page-to-ledger index for numeric, date, and closed-vocabulary
status tokens. Its subject comes from the source table row, sentence
identifier, or heading. The authored page keeps each token with that subject
so `verify.mjs` can match the exact `(subject, value, kind)` tuple.

## Consumers

- The host agent reads `fact-base.json`, `fact-base.md`, and `ledger.json`
  while authoring.
- `verify.mjs` checks ledger anchors against the page and machine-readable page
  claims against `ledger.claims`.
- `record.mjs` carries the fact-base hash and source input hashes into
  `manifest.json`.
- A human uses source locators and claim IDs to diagnose verification findings.
