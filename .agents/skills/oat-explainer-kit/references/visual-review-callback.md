# Browser and visual-review callbacks

Unattended project recaps require two provider-neutral executable seams. Supply
each seam either directly or through a module path, never both:

| Role             | Direct input   | Module-path input        | Required export |
| ---------------- | -------------- | ------------------------ | --------------- |
| Browser evidence | `browserProbe` | `browserProbeModulePath` | `browserProbe`  |
| Whole-set review | `visualCritic` | `visualCriticModulePath` | `visualCritic`  |

Do not route these callbacks through `coreOptions`. The adapter resolves and
validates both providers before core invocation and keeps callbacks and module
paths out of retained requests.

## Browser evidence

The browser probe receives one provider-neutral request for each artifact,
viewport, and required interaction scenario. The request includes the rendered
artifact, exact viewport dimensions, scenario, interaction expectations, and,
for the default scenario, an absolute `screenshotPath`. The provider writes a
PNG to that path and returns measured browser facts:

- `pageOverflowX` as a boolean;
- `clippedX`, `viewportClipped`, and `unreadableHeadings` as arrays;
- `reducedMotion` as a boolean;
- `keyboard` as an object describing observed key behavior; and
- applicable deck, theme-toggle, animation, and layout measurements.

For unattended project recaps the core chooses the canonical 320, 768, and 1440
widths. The retained PNG signature and IHDR dimensions must match the requested
viewport. The core writes paired metrics JSON itself; callback assertions do
not substitute for retained evidence.

## Whole-set visual review

The visual critic receives one
`explainer-kit.visual-review-request/v1` plus a confined evidence reader. The
request contains every rendered artifact, exact rendered-content hashes,
viewport-matched screenshot and metrics hashes, and observed cohesion claims.
Use the evidence reader to inspect the byte snapshot named by the request.

Return `explainer-kit.visual-review-result/v1` with:

- a safe `reviewId`;
- the request's exact `requestId` and `requestHash`;
- an ISO `reviewedAt`;
- `disposition` equal to `pass`, `correct`, or `fail`;
- the complete reviewed `artifactIds`; and
- structured `findings`.

The callback must not mutate rendered files, screenshots, or metrics. The core
revalidates all bound bytes after the callback returns.

## Correction and terminal behavior

`correct` permits one correction callback and exactly one final review. There
is never a second correction or third review. Missing evidence, invalid
contracts, thrown callbacks, byte mutation, unresolved correction, or a `fail`
disposition produces `built-needs-review`. Such a run retains available review
evidence but invokes neither durability nor publication.
