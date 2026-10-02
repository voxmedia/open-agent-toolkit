---
oat_generated: true
oat_generated_at: 2026-10-02T13:36:46Z
oat_review_scope: p02-format
oat_review_type: artifact
oat_review_invocation: auto
oat_project: .oat/projects/shared/docs-improvement-overhaul
oat_review_request_id: docs-overhaul-run1-p02-table-format-review01
---

# Artifact Review: Narrow Table-Formatting Proposal

**Reviewed:** 2026-10-02T13:36:46Z
**Scope:** Only the proposed mechanical formatter exception for `reference/cli-reference.md::Command Groups::1`; not a reopened map review, complete conservation sweep or p02 code/phase acceptance.
**Reviewed Head:** `-` — the proposal and current p02-t02 source are uncommitted. Root released this review at bookkeeping HEAD `566a20a5d161940c74873b5c26796daeab11c055`; exact original source baseline remains `8b78d9a935b31ef50e65713b03a022a5d022aa59`.
**Dispatch:** request=docs-overhaul-run1-p02-table-format-review01; scope=p02-format; action=review; role=reviewer; model_axis=selected:gpt-6.1-sol; effort_axis=selected:high; target=oat-reviewer-gpt-6-1-sol-high.
**Reconnaissance:** not-attempted

## Summary

The exact 16-span formatter exception is mechanically justified and approved in scope, subject to the implementation/control conditions below. Independent reconstruction and real oxfmt execution confirm identical payload/topology/alignment and exact preservation of every page byte outside those spans after approved href edits. One Low proof-wording correction remains; it does not broaden the exception or imply that the not-yet-implemented guard has passed verification.

Findings by severity: 0 critical, 0 high, 0 medium, 1 low

## Exact Binding

| Evidence                                                         | SHA-256                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `references/p02-table-formatting-proposal.json`                  | `eb00351b46b7a7234f9b489877b34d2735016047c53376a094c3ba29516cc4af` |
| `references/p02-table-formatting-proposal.md`                    | `b945887e4f888dd1b34295c15aeb88b321cc99c2955cb52d91a3a6eb9f997865` |
| Immutable `references/route-migration.json`                      | `ff02a3ebec2373f88cb47917bd6aeafeb35149b7e9680e768d0a4e0a5674a438` |
| Original baseline `reference/cli-reference.md`                   | `139f2966ced3e580e07a13b74ab18f6069db1f14a7dfb3811e908bac7f551872` |
| Independently derived approved-href-only expected page           | `71af550f395546a1c4d849482ba5d550753947f65289f259c0823236e100ea71` |
| Actual formatted `apps/oat-docs/docs/reference/cli-reference.md` | `ece5cd5d53296943c4aa6838f10062f2a60693ce58987d38f0772ca6b7a56932` |

The `references/` paths are project-relative. Proposal/map/current-page hashes were captured and independently matched, then rechecked unchanged after the read-only probe. The original baseline page hash also equals its immutable map entry. The href-only expected page was derived solely from original git bytes and the approved map's destination-token edits, not from the actual formatted page or a formatter round trip.

## Findings

### Critical

None

### High

None

### Medium

None

### Low

- **L1: Neutralization instruction targets the wrong independent guard** (`.oat/projects/shared/docs-improvement-overhaul/references/p02-table-formatting-proposal.md:21`)
  - Issue: This bullet asks for a payload mutation to become accepted when only the new exact-span guard is neutralized. The same proposal correctly retains separate raw-payload/AST protection, which can still reject that mutation. This can lead to an incapable control or unnecessary weakening of additional guards merely to force a failure. Root's governing review instruction and explicit clarification already select an unlisted cell-edge-padding violation instead; the prose should match that interpretation.
  - Fix: Change the bullet to use a padding violation uniquely protected by the new exact allowlist decision, while leaving payload/AST/topology/syntax guards active. Demonstrate rejection with the new guard, intended acceptance at the neutralized boundary, then restore and rerun both valid controls. Keep payload mutations as separate rejection tests; do not disable independent payload guards to manufacture guard-neutralization evidence. This is a verification-target wording correction, not a request for broader normalization or different source content.

## Decision and Alignment

**Evidence sources used:** Current conditional formatter amendments in `design.md:61` and plan p02-t02; exact proposal Markdown/JSON; immutable original map and source git object; actual formatted page; current strict verifier source and its recorded failure; app formatter script/root oxfmt configuration; previously loaded root/app and `deliberate-testing` review guidance. Existing broader project/map coverage is inherited and deliberately not repeated.

**Approved scope:** Exactly one existing table in the named protected unit: the 15 inventoried third-column outer ASCII-space suffix spans and one third-column delimiter dash run changing from **82 to 91 dashes**. The suffix evidence includes an unchanged closing pipe; only its ASCII padding changes. No other row/column/table/unit, prefix, delimiter character, colon, pipe, newline, internal payload, code/emphasis/escape byte, heading or surrounding prose receives an exemption. The original map and baseline records stay immutable; approval/applied evidence is append-only and separate.

**Required common comparison:** Start from the baseline and already approved href changes, without formatting/trimming the expected unit. Bind exact table identity and inventoried before/after bytes; identify actual cells and payload/token boundaries through the real parser, not blind pipe splitting. Restore only the authorized formatting spans to their expected before bytes, apply the existing approved URL-identity normalization, and require equality to the original complete-unit normalized hash. All other 815 protected units keep their existing comparison path. AST equivalence supplements raw-byte checks; it never replaces them or allows semantic paraphrase.

**Independent factual results:**

- Reconstructed the href-only expected page from baseline git bytes and approved destination-token edits; all three baseline/expected/actual page hashes match the exact proposal.
- Ran the installed **real oxfmt via stdin**, in the docs app with its normal inherited configuration. Exit **0**; stdout is byte-for-byte the actual formatted page. No source file was formatted or written by this review.
- Parsed the expected and actual page with installed remark-parse/remark-gfm. Both contain exactly one table, **15 rows × three columns**, the same position-free cell-child AST and alignment `[null, null, null]`.
- Independently compared **all 45 raw cell payloads**, including internal whitespace and markup: identical. Each of the 15 declared suffix spans begins precisely at its third-cell payload end and ends at the row end; its literal before/after bytes and payload SHA-256 match the proposal. Prefixes remain identical.
- Checked the delimiter row's exact unchanged prefix/suffix and pure-dash third run. Restoring these **16 spans only** makes the **entire actual page byte-for-byte identical to the independently derived href-only expected page**. Thus the existing table pipes, colons, row newlines and all bytes outside the allowlist are preserved, not merely semantically equivalent.

**Post-implementation proof still required:** Both valid formatted and href-only controls; raw payload/internal-space/code/emphasis/escaped-pipe/newline rejection; row/column/alignment/pipe/delimiter-syntax rejection; wrong table/unit and unlisted edge/width rejection; and the isolated capable exact-allowlist guard-neutralization control clarified above. Use the same guarded restoration/comparison boundary for acceptance and negative probes. Proof must not call oxfmt on a candidate and compare its result to itself, normalize all whitespace, or add permanent project-artifact CI dependencies. These implementation controls were not run because the guard is not implemented yet.

## Verification Commands and Limits

The independent probe invoked the real formatter read-only using this interface, passing its freshly derived href-only expected page on stdin:

```bash
pnpm exec oxfmt --stdin-filepath docs/reference/cli-reference.md
```

Working directory: `apps/oat-docs`. This is not the write-mode `docs:format` command and does not mutate the live source. The independent baseline/map/hash/AST/payload/span-reversal probe exits **0**.

The recorded original strict verifier exits **1** at the named changed protected unit; that failure is expected and retained, not a preservation pass. The proposal's 816-unit guard-neutralized diagnostic sweep was read as author evidence only, not independently rerun or promoted to a guarded pass. No whole-map/source conservation rerun, new guard implementation, full gates, build, browser work, generated-output regeneration, source changes, commits or core tracking occurred in this review.

## Recommended Next Step

Root may authorize the existing p02 owner to implement only this approved 16-span exception, align L1's control wording, and provide append-only applied evidence plus the required capable guarded controls. Return for implementation verification before treating t02 preservation as passed; this proposal approval is not code/phase acceptance.
