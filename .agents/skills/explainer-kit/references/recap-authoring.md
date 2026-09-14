# Agent-authored recap mechanics

Use this reference with the recipe's bundled author brief. The brief defines
the audience, voice, and narrative intent; this reference defines how to turn a
prepared run into one verifiable HTML artifact.

## Read the run inputs

Read these files before authoring:

- `source/fact-base.json` for confirmed and unresolved claims and their source
  locators;
- `source/fact-base.md` for a readable rendering of the same fact base;
- `source/ledger.json` for the bounded terminology, number, date, and status
  anchors verification expects;
- `theme.resolved.json` for the resolved palette and typography; and
- the selected recipe's `floor[0]`, including `template`,
  `requiredNarrative`, and `briefRef`.

Read the bundled file named by `briefRef` verbatim. Do not replace its
audience or editorial instructions with generic recap prose.

## Preserve recipe anchors

Write each `requiredNarrative` value as a non-empty `<section id="…">`:

| Recipe              | Required section IDs                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `project-recap`     | `original-request`, `key-agent-decisions`, `as-built-architecture`, `implementation-record`, `validation-evidence`, `outcome` |
| `program-recap`     | `program-overview`, `wave-map`, `per-wave-outcomes`, `convention-evolution`, `aggregate-numbers`, `follow-up-ledger`          |
| `project-explainer` | `planned-architecture`, `decisions`, `risks`, `phases`, `validation-approach`                                                 |
| `engineer-tour`     | `orientation`, `architecture`, `execution-flow`, `key-code`, `validation`                                                     |

Navigation should link to these IDs with descriptive labels. Keep every
section useful without JavaScript.

## Build from the recipe shell

Copy `templates/<floor[0].template>.html` to `site/index.html`, then replace its
tokens:

- `THEME_CSS`: CSS derived from `theme.resolved.json`;
- `TITLE`, `DESCRIPTION`, and `EYEBROW`: concise framing grounded in the fact
  base;
- `NAVIGATION`: links to every required section;
- `CONTENT`: the authored sections and their source-grounded visuals; and
- `FOOTER`: provenance or reading guidance that does not dump source text.

The `engineer-tour` shell also has a `DIAGRAM` token. Fill it only with
source-grounded inline SVG markup. Preserve every bundled script byte-for-byte;
do not add scripts or event-handler attributes.

## Keep the artifact self-contained

Produce one `site/index.html` with inline CSS and inline, shell-approved
scripts only. Do not load fonts, images, styles, scripts, or other resources
from external URLs. Do not paste source documents or the fact base into the
page. Summarize and structure the evidence for the reader.

## Trace every machine-checkable claim

Spell terms, identifiers, numbers, dates, and closed-vocabulary statuses
exactly as the fact base spells them. Keep each number, date, or status in the
same sentence, list item, or table row as its subject so verification can match
the `(subject, value)` pair in `source/ledger.json`.
For cards, definition lists, and other non-paragraph elements, verification
uses the nearest bold or definition label or preceding heading as the subject,
with the enclosing section ID as fallback.

Treat `unresolvedClaims` as unresolved. Label uncertainty as
`needs confirmation`; do not turn it into a confirmed narrative bridge.
Citations remain in the fact base and should inform the prose without becoming
a source dump.

## Review visual composition

Follow `references/visual-authoring.md` for hierarchy, responsive navigation,
tables, diagrams, and the final composition check. The page itself must not
overflow horizontally. Put intrinsically wide content inside a bounded,
scrollable container.

## Submit host-rung evidence

When the host has browser capability:

1. Open `file://<run-root>/site/index.html`.
2. Capture the page at widths 320, 768, and 1440 into
   `<run-root>/qa/320.png`, `768.png`, and `1440.png`.
3. Inspect all three screenshots. Confirm no horizontal page overflow, every
   required section is visible, headings remain readable at 320 pixels, and no
   text overlaps.
4. Compute the SHA-256 of the exact `site/index.html` bytes captured.
5. Run `verify.mjs` with `--rung host`, `--screenshots <run-root>/qa`,
   `--artifact-sha256 <sha256:hex>`, `--visual-verdict pass|findings`, and
   concise `--visual-notes`.

A screenshot capture without inspection is not verification. If the artifact
hash or any PNG binding is invalid, verification records the browser rung as
`none`.
