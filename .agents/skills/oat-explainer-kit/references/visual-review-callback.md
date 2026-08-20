# Browser and visual-review callbacks

Unattended project recaps require two provider-neutral executable seams. Supply
each seam either directly or through a module path, never both:

| Role             | Direct input     | Module-path input          | Required export  |
| ---------------- | ---------------- | -------------------------- | ---------------- |
| Browser evidence | `browserSession` | `browserSessionModulePath` | `browserSession` |
| Whole-set review | `visualCritic`   | `visualCriticModulePath`   | `visualCritic`   |

Do not route these callbacks through `coreOptions`. The adapter resolves and
validates both providers before core invocation and keeps callbacks and module
paths out of retained requests.

## Browser evidence

Create the direct descriptor with the compatible core's
`createBrowserProbeSession()`. A module-path provider exports that branded
descriptor as `browserSession`; it does not export a bare callback or a
caller-authored metadata object. The core derives Chromium type and version
from the launched `Browser` instance and validates the private session brand.
Callers remain responsible for closing the session.

The descriptor's probe receives one provider-neutral request for each artifact,
viewport, and required interaction scenario. The request includes the rendered
artifact, exact viewport dimensions, scenario, interaction expectations, and,
for the default scenario, an absolute `screenshotPath`. The probe writes a PNG
to that path and returns measured browser facts:

- `pageOverflowX` as a boolean;
- `clippedX`, `viewportClipped`, and `unreadableHeadings` as arrays;
- `reducedMotion` as a boolean;
- `keyboard` as an object describing observed key behavior; and
- applicable deck, theme-toggle, animation, and layout measurements.

For unattended project recaps the core chooses the canonical 320, 768, and 1440
widths. The retained PNG signature and IHDR dimensions must match the requested
viewport. The core writes paired metrics JSON itself; callback assertions do
not substitute for retained evidence. Those
`explainer-kit.browser-evidence/v2` records retain the launched Chromium name,
version, capture settings, and stable capture identity. Deterministic fixture
sessions are explicit test-only descriptors and are rejected by unattended
project-recap production paths.

## Whole-set visual review

The visual critic receives one
`explainer-kit.visual-review-request/v1` plus a confined evidence reader. The
request contains every rendered artifact, exact rendered-content hashes,
viewport-matched screenshot and metrics hashes, observed cohesion claims, and
the exact browser runtime and capture identity shared by every evidence record.
Use the evidence reader to inspect the byte snapshot named by the request.

Judge the rendered set as prose-led visual work. Cover typography, hierarchy,
composition, density, medium leverage, template repetition, diagram semantics,
and cross-artifact cohesion. Use the set plan and shared ledger to distinguish
intentional variation from drift. Do not turn those judgments into numeric
scores, geometry thresholds, or deterministic style checks.

Return `explainer-kit.visual-review-result/v1` with:

- a safe `reviewId`;
- the request's exact `requestId` and `requestHash`;
- an ISO `reviewedAt`;
- `disposition` equal to `pass`, `correct`, or `fail`;
- the complete reviewed `artifactIds`; and
- structured `findings`.

Return `pass` only when the full set needs no required correction. Return
`correct` when one bounded review round can address every finding, and give
each finding an actionable correction tied to an artifact and visible evidence.
The result shape and its `pass`/`correct`/`fail` dispositions remain unchanged.

The callback must not mutate rendered files, screenshots, or metrics. The core
revalidates all bound bytes after the callback returns.

## Correction and terminal behavior

`correct` permits one correction callback and exactly one final review. There
is never a second correction or third review. Missing evidence, invalid
contracts, thrown callbacks, byte mutation, unresolved correction, or a `fail`
disposition produces `built-needs-review`. Such a run retains available review
evidence but invokes neither durability nor publication.
