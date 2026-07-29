import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { assertBrowserProbeSession } from './browser-runtime.mjs';
import { writeJsonAtomic } from './fs-safe.mjs';
import { findUnpinnedResourceRefs } from './html-safety.mjs';
import { decodeBrowserPng } from './png.mjs';
import { recipeFloor, recipeRequiredNarrative } from './recipes.mjs';
import { cohesionEvidenceFromLedger } from './visual-review.mjs';

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);
const INLINE_ASSET_VIOLATION_PATTERN =
  /<link\b|@import\b|url\(\s*["']?(?!data:|#)/i;
const TOKEN_PATTERN = /{{\s*[A-Z][A-Z0-9_]*\s*}}/g;
const ARROW_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
const MAX_SCREENSHOT_BYTES = 20 * 1024 * 1024;
const INLINE_DIAGRAM_PATTERN =
  /<svg\b(?=[^>]*(?:\bclass\s*=\s*["'][^"']*\bdiagram\b|\baria-label\s*=\s*["'][^"']*(?:architecture|diagram)))[^>]*>/i;
const STRUCTURED_BLOCK_PATTERNS = [
  /<table\b/i,
  /<(?:ul|ol)\b/i,
  /<aside\b[^>]*\bclass\s*=\s*["'][^"']*\bcallout\b/i,
  /<blockquote\b/i,
  /<figure\b/i,
];

export const REPRESENTATIVE_WIDTHS = Object.freeze([320, 768, 1440]);
export const GUIDELINE_WARNING_IDS = Object.freeze({
  narrativeCoverage: 'guideline-narrative-coverage-missing',
  architectureDiagram: 'guideline-architecture-diagram-missing',
  structuredDepth: 'guideline-structured-depth-missing',
  expansionProfileLimit: 'expansion-profile-limit-exceeded',
  expansionArtifactLimit: 'expansion-artifact-limit-exceeded',
  expansionTypeLimit: 'expansion-type-limit-exceeded',
});
const EXPANSION_WARNING_BY_REJECTION_REASON = new Map([
  ['profile-limit', GUIDELINE_WARNING_IDS.expansionProfileLimit],
  ['recipe-limit', GUIDELINE_WARNING_IDS.expansionArtifactLimit],
  ['type-limit', GUIDELINE_WARNING_IDS.expansionTypeLimit],
]);
export const RENDER_WARNING_IDS = Object.freeze({
  unsupportedDiagram: 'render-unsupported-diagram',
  headingDepthJump: 'render-heading-depth-jump',
  timelineEntryShape: 'render-timeline-entry-shape',
  legacyRawHtmlEscaped: 'render-legacy-raw-html-escaped',
});
export const RENDER_QA_WARNING_IDS = Object.freeze({
  documentOverflow: 'render-qa-document-overflow',
  innerContainerOverflow: 'render-qa-inner-container-overflow',
  viewportClipping: 'render-qa-viewport-clipping',
  headingReadability: 'render-qa-heading-unreadable',
  animationsEnabled: 'render-qa-animations-enabled',
  reducedMotion: 'render-qa-reduced-motion',
  keyboardNavigation: 'render-qa-keyboard-navigation',
  themeToggle: 'render-qa-theme-toggle',
  deckNoJsLayout: 'render-qa-deck-no-js-layout',
  deckPrintLayout: 'render-qa-deck-print-layout',
  skippedNoProbe: 'render-qa-skipped-no-probe',
});
const RENDER_QA_WARNING_BY_CODE = new Map([
  ['viewport-overflow', RENDER_QA_WARNING_IDS.documentOverflow],
  ['inner-x-overflow', RENDER_QA_WARNING_IDS.innerContainerOverflow],
  ['viewport-clipping', RENDER_QA_WARNING_IDS.viewportClipping],
  ['heading-readability', RENDER_QA_WARNING_IDS.headingReadability],
  ['animations-enabled', RENDER_QA_WARNING_IDS.animationsEnabled],
  ['reduced-motion', RENDER_QA_WARNING_IDS.reducedMotion],
  ['keyboard-navigation', RENDER_QA_WARNING_IDS.keyboardNavigation],
  ['theme-toggle', RENDER_QA_WARNING_IDS.themeToggle],
  ['deck-no-js-layout', RENDER_QA_WARNING_IDS.deckNoJsLayout],
  ['deck-print-layout', RENDER_QA_WARNING_IDS.deckPrintLayout],
]);

export function renderQaWarningIds(issues) {
  if (!Array.isArray(issues)) {
    throw new TypeError('Render QA issues must be an array.');
  }
  return [
    ...new Set(
      issues
        .map(({ code }) => RENDER_QA_WARNING_BY_CODE.get(code))
        .filter(Boolean),
    ),
  ];
}

// Degradation findings are prefixed rather than looked up so a newly added
// render warning code surfaces instead of being silently dropped.
export function renderWarningIds(warnings) {
  if (!Array.isArray(warnings)) {
    throw new TypeError('Render warnings must be an array.');
  }
  if (warnings.some(({ code } = {}) => typeof code !== 'string' || !code)) {
    throw new TypeError('Every render warning requires a string code.');
  }
  return [...new Set(warnings.map(({ code }) => `render-${code}`))];
}

export function checkGuidelines({ recipe, artifacts, expansion } = {}) {
  if (!Array.isArray(artifacts)) {
    throw new TypeError('Guideline checker artifacts must be an array.');
  }
  if (
    artifacts.some(
      (artifact) =>
        !isPlainObject(artifact) ||
        typeof artifactId(artifact) !== 'string' ||
        typeof artifact.type !== 'string' ||
        typeof artifact.html !== 'string',
    )
  ) {
    throw new TypeError(
      'Guideline checker artifacts require id, type, and HTML.',
    );
  }

  const floor = recipeFloor(recipe);
  const builtById = new Map(
    artifacts.map((artifact) => [artifactId(artifact), artifact]),
  );
  const narrativeFloor = floor.filter(
    (artifact) => recipeRequiredNarrative(recipe, artifact.id).length > 0,
  );
  const warnings = new Set();

  const missesNarrative = narrativeFloor.some((floorArtifact) => {
    const built = builtById.get(floorArtifact.id);
    const required = recipeRequiredNarrative(recipe, floorArtifact.id);
    return (
      !built ||
      required.some((sectionId) => !hasElementId(built.html, sectionId))
    );
  });
  if (missesNarrative) {
    warnings.add(GUIDELINE_WARNING_IDS.narrativeCoverage);
  }

  const hasDiagram =
    artifacts.some(({ type }) => type === 'diagram') ||
    artifacts.some(({ html }) => INLINE_DIAGRAM_PATTERN.test(html));
  if (!hasDiagram) {
    warnings.add(GUIDELINE_WARNING_IDS.architectureDiagram);
  }

  const hasStructuredDepth = narrativeFloor.some((floorArtifact) => {
    const html = builtById.get(floorArtifact.id)?.html ?? '';
    return STRUCTURED_BLOCK_PATTERNS.some((pattern) => pattern.test(html));
  });
  if (narrativeFloor.length > 0 && !hasStructuredDepth) {
    warnings.add(GUIDELINE_WARNING_IDS.structuredDepth);
  }

  addExpansionWarnings(warnings, expansion);
  return { valid: true, warnings: [...warnings] };
}

export function checkSourceDumping({
  authoredText,
  authoredSections,
  sourceTexts,
  shingleSize = 8,
  maxOverlapRatio = 0.6,
  minMatchedShingles = 3,
}) {
  const sourceShingles = new Set(
    (Array.isArray(sourceTexts) ? sourceTexts : []).flatMap((text) =>
      shingles(text, shingleSize),
    ),
  );
  const sections = Array.isArray(authoredSections)
    ? authoredSections
    : [{ text: authoredText }];
  const issues = sections.flatMap(({ id, text }) => {
    const authoredShingles = shingles(text, shingleSize);
    const matchedShingles = authoredShingles.filter((value) =>
      sourceShingles.has(value),
    ).length;
    const overlapRatio =
      authoredShingles.length === 0
        ? 0
        : matchedShingles / authoredShingles.length;
    return matchedShingles >= minMatchedShingles &&
      overlapRatio > maxOverlapRatio
      ? [
          {
            code: 'source-dump',
            message:
              'Authored narrative contains too much verbatim source text; rewrite it as audience-ready prose.',
            details: {
              ...(typeof id === 'string' && { sectionId: id }),
              matchedShingles,
              authoredShingles: authoredShingles.length,
              overlapRatio,
            },
          },
        ]
      : [];
  });
  return { valid: issues.length === 0, issues };
}

function shingles(value, size) {
  const words =
    typeof value === 'string'
      ? (value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
      : [];
  if (words.length < size) return [];
  return Array.from({ length: words.length - size + 1 }, (_, index) =>
    words.slice(index, index + size).join(' '),
  );
}

export const BROWSER_PROBE_EVALUATE = `(() => {
  const root = document.documentElement;
  const elements = [...document.querySelectorAll('body *')];
  const selector = (element) => element.id ? '#' + CSS.escape(element.id) :
    element.classList.length ? '.' + [...element.classList].map(CSS.escape).join('.') :
    element.tagName.toLowerCase();
  const clippedX = elements
    .filter((element) => {
      const style = getComputedStyle(element);
      return element.scrollWidth > element.clientWidth + 2 &&
        ['hidden', 'clip'].includes(style.overflowX);
    })
    .map((element) => ({
      selector: selector(element),
      overflowX: getComputedStyle(element).overflowX,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth
    }))
    .slice(0, 20);
  // Ancestry inside a horizontal scroller is not reachability: scrollLeft only
  // ranges over 0..scrollWidth-clientWidth, so content sitting at a negative
  // content offset or past the scrollable extent can never be scrolled into
  // view and stays a genuine clipping defect.
  const TOLERANCE = 2;
  const scrollReachable = (element) => {
    const rect = element.getBoundingClientRect();
    for (let node = element.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (!['auto', 'scroll'].includes(style.overflowX)) continue;
      if (node.scrollWidth - node.clientWidth <= TOLERANCE) continue;
      const nodeRect = node.getBoundingClientRect();
      const contentLeft =
        rect.left - (nodeRect.left + node.clientLeft) + node.scrollLeft;
      if (contentLeft >= -TOLERANCE &&
        contentLeft + rect.width <= node.scrollWidth + TOLERANCE) return true;
    }
    return false;
  };
  const viewportClipped = elements
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 &&
        (rect.left < -TOLERANCE || rect.right > innerWidth + TOLERANCE) &&
        !scrollReachable(element);
    })
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        selector: selector(element),
        left: rect.left,
        right: rect.right,
        viewportWidth: innerWidth
      };
    })
    .slice(0, 20);
  // A heading in a collapsed panel or an aria-hidden subtree is deliberately
  // not presented, so it is out of scope rather than unreadable. Visually
  // hidden accessibility text still renders a box and stays in scope.
  const presented = (element) => {
    const rendered = typeof element.checkVisibility === 'function'
      ? element.checkVisibility({
          visibilityProperty: true,
          contentVisibilityAuto: true
        })
      : element.getClientRects().length > 0;
    return rendered && element.closest('[aria-hidden="true"]') === null;
  };
  const unreadableHeadings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
    .filter(presented)
    .filter((heading) => {
      const style = getComputedStyle(heading);
      const rect = heading.getBoundingClientRect();
      const fontSize = Number.parseFloat(style.fontSize);
      return !heading.textContent.trim() || rect.width <= 0 || rect.height <= 0 ||
        !Number.isFinite(fontSize) || fontSize < 12;
    })
    .map((heading) => ({
      selector: selector(heading),
      text: heading.textContent.trim(),
      fontSize: Number.parseFloat(getComputedStyle(heading).fontSize)
    }))
    .slice(0, 20);
  // Reduced-motion styling conventionally collapses transitions to a token
  // 0.01ms rather than 0s so transitionend still fires. That is suppressed
  // motion, not active motion, so anything under a millisecond counts as
  // disabled while a perceptible duration still reports.
  // Motion is just as visible on a generated ::before/::after box as on the
  // element itself, so all three are inspected. A pseudo-element that
  // generates no content cannot animate and is skipped.
  const PERCEPTIBLE_SECONDS = 0.001;
  const motionless = (element, pseudo) => {
    const style = getComputedStyle(element, pseudo);
    if (pseudo && ['none', 'normal'].includes(style.content)) return true;
    const durations = (style.animationDuration + ',' + style.transitionDuration)
      .split(',')
      .map((value) => Number.parseFloat(value) || 0);
    return style.animationName === 'none' &&
      durations.every((value) => value < PERCEPTIBLE_SECONDS);
  };
  const animationsDisabled = elements.every((element) =>
    [null, '::before', '::after'].every((pseudo) => motionless(element, pseudo)));
  return {
    pageOverflowX: root.scrollWidth > root.clientWidth + 2,
    clippedX,
    viewportClipped,
    unreadableHeadings,
    animationsDisabled,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    deckLayout: document.querySelector('.deck') ? {
      flow: getComputedStyle(document.querySelector('.deck')).display === 'block' ?
        'vertical' : 'horizontal',
      overflowX: getComputedStyle(document.querySelector('.slide__content')).overflowX
    } : null,
    themeToggle: document.querySelector('[data-theme-toggle]') ? {
      present: true,
      initialMode: root.dataset.themeMode
    } : null
  };
})()`;

export function checkHtmlStructure({
  id = 'artifact',
  type,
  html,
  denylist = [],
}) {
  if (typeof html !== 'string') {
    throw new TypeError(`QA artifact ${id} must provide HTML as a string.`);
  }
  if (
    !Array.isArray(denylist) ||
    denylist.some((item) => typeof item !== 'string')
  ) {
    throw new TypeError('QA denylist must be an array of strings.');
  }

  const issues = [];
  const add = (code, message, details) => {
    issues.push({ artifactId: id, code, message, ...(details && { details }) });
  };

  if (TOKEN_PATTERN.test(html)) {
    add('unresolved-token', 'Artifact contains an unresolved template token.');
  }
  TOKEN_PATTERN.lastIndex = 0;

  for (const denied of denylist.filter(Boolean)) {
    if (html.toLocaleLowerCase().includes(denied.toLocaleLowerCase())) {
      add(
        'denylisted-string',
        'Artifact contains a configured denylisted string.',
        {
          value: denied,
        },
      );
    }
  }

  const unpinnedRefs = findUnpinnedResourceRefs(html);
  if (unpinnedRefs.length > 0 || INLINE_ASSET_VIOLATION_PATTERN.test(html)) {
    add(
      'external-asset',
      'Final HTML assets must be inline and self-contained.',
      ...(unpinnedRefs.length > 0 ? [{ refs: unpinnedRefs.slice(0, 10) }] : []),
    );
  }

  for (const imbalance of findTagImbalances(html)) {
    add('tag-balance', imbalance);
  }

  checkHeadings(html, add);
  checkLinks(html, add);

  const hasMotion =
    /\b(?:animation(?:-name)?|transition|scroll-behavior)\s*:/i.test(html);
  if (
    hasMotion &&
    !/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i.test(html)
  ) {
    add(
      'reduced-motion',
      'Artifact must define a prefers-reduced-motion reduction.',
    );
  }

  const isDeck =
    type === 'deck' || /class\s*=\s*["'][^"']*\bdeck\b/i.test(html);
  if (isDeck) {
    const missing = ARROW_KEYS.filter(
      (key) => !new RegExp(`['"]${key}['"]`).test(html),
    );
    if (missing.length > 0) {
      add(
        'deck-keyboard',
        'Deck keyboard navigation must support both horizontal and vertical arrow pairs.',
        { missing },
      );
    }
  }

  return { valid: issues.length === 0, issues };
}

export function checkArtifactCohesion(artifacts, { ledger = null } = {}) {
  if (!Array.isArray(artifacts)) {
    throw new TypeError('Artifact cohesion input must be an array.');
  }
  const issues = [];
  const groups = ['terminology', 'numericClaims', 'statuses'];
  const expected = ledger
    ? {
        terminology: new Map(
          (ledger.terminology ?? []).map(({ term }) => [term, term]),
        ),
        numericClaims: new Map(
          (ledger.numbers ?? []).map(({ subject, value }) => [subject, value]),
        ),
        statuses: new Map(
          (ledger.statuses ?? []).map(({ subject, value }) => [subject, value]),
        ),
      }
    : null;

  if (expected && groups.some((group) => expected[group].size === 0)) {
    issues.push({
      code: 'cohesion-ledger-empty',
      message:
        'Adaptive recap cohesion requires non-empty terminology, numeric, and status ledger entries.',
    });
  }

  for (const group of groups) {
    const claims = new Map();
    for (const artifact of artifacts) {
      const values = artifact?.cohesion?.[group] ?? {};
      if (!isPlainObject(values)) {
        throw new TypeError(
          `Artifact ${String(artifact?.id)} cohesion.${group} must be an object.`,
        );
      }
      for (const [claim, value] of Object.entries(values)) {
        const normalized = normalizeClaim(value);
        const prior = claims.get(claim);
        if (!prior) {
          claims.set(claim, {
            normalized,
            value,
            artifactId: artifact.id,
          });
        } else if (prior.normalized !== normalized) {
          issues.push({
            code: `cohesion-${group}`,
            message: `Artifact set disagrees on ${group}.${claim}.`,
            claim,
            values: [
              { artifactId: prior.artifactId, value: prior.value },
              { artifactId: artifact.id, value },
            ],
          });
        }
      }
    }
    if (expected) {
      for (const [claim, expectedValue] of expected[group]) {
        const observed = claims.get(claim);
        if (
          !observed ||
          observed.normalized !== normalizeClaim(expectedValue)
        ) {
          issues.push({
            code: 'cohesion-claim-unobserved',
            message: `Rendered artifacts do not observably support ${group}.${claim}.`,
            claim,
          });
        }
      }
    }
  }

  if (expected) {
    for (const artifact of artifacts) {
      const count = groups.reduce(
        (total, group) =>
          total + Object.keys(artifact?.cohesion?.[group] ?? {}).length,
        0,
      );
      if (count === 0) {
        issues.push({
          code: 'cohesion-observations-empty',
          message: `Artifact ${String(artifact?.id)} has no observed shared-ledger evidence.`,
          artifactId: artifact?.id,
        });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

export async function runBrowserProbes({
  artifacts,
  probe,
  browserSession,
  widths = REPRESENTATIVE_WIDTHS,
  evidenceRoot,
  requireEvidence = false,
  onProbeResult,
}) {
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    throw new TypeError('Browser QA requires at least one artifact.');
  }
  if (browserSession !== undefined && probe !== undefined) {
    throw new TypeError(
      'Browser QA accepts either a trusted browser session or a bare non-retaining probe, not both.',
    );
  }
  const session =
    browserSession === undefined
      ? null
      : assertBrowserProbeSession(browserSession, { allowFixture: true });
  const resolvedProbe = session?.probe ?? probe;
  if (typeof resolvedProbe !== 'function') {
    throw new TypeError('Browser QA requires a probe callback.');
  }
  if (evidenceRoot && !session) {
    throw new TypeError(
      'A trusted browser session is required for retained evidence.',
    );
  }
  if (onProbeResult !== undefined && typeof onProbeResult !== 'function') {
    throw new TypeError('Browser QA probe observer must be a callback.');
  }
  if (
    !Array.isArray(widths) ||
    widths.length === 0 ||
    widths.some((width) => !Number.isInteger(width) || width < 240)
  ) {
    throw new TypeError('Browser QA widths must be viewport-sized integers.');
  }

  const issues = [];
  const evidence = [];
  let probes = 0;
  for (const artifact of artifacts) {
    const evidenceId = browserEvidenceId(artifact.id);
    for (const width of widths) {
      for (const scenario of browserScenarios(artifact)) {
        const viewport = viewportName(width);
        const screenshotPath =
          evidenceRoot && scenario === 'default'
            ? `qa/browser/${evidenceId}/${viewport}.png`
            : undefined;
        const metricsPath =
          evidenceRoot && scenario === 'default'
            ? `qa/browser/${evidenceId}/${viewport}.json`
            : undefined;
        const request = {
          artifact,
          scenario,
          viewport: { width, height: representativeHeight(width) },
          reducedMotion: 'reduce',
          disableAnimations: true,
          injectedCss:
            '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}',
          evaluate: BROWSER_PROBE_EVALUATE,
          keyboard:
            artifact.type === 'deck' && scenario === 'default'
              ? { tab: true, arrows: [...ARROW_KEYS] }
              : { tab: true },
          ...(screenshotPath && {
            screenshotPath: join(evidenceRoot, screenshotPath),
          }),
          ...(scenario === 'no-js' && { javascriptEnabled: false }),
          ...(scenario === 'print' && { media: 'print' }),
          ...(artifact.type === 'deck' &&
            scenario !== 'default' && {
              wideContent: {
                containerSelector: '.slide__content',
                width: 2048,
              },
            }),
          ...(artifact.html.includes(
            'data-render-strategy="user-switchable"',
          ) &&
            scenario === 'default' && {
              themeToggle: {
                selector: '[data-theme-toggle]',
                activate: 'keyboard',
                expectPersistence: true,
              },
            }),
        };
        let result;
        try {
          result = await resolvedProbe(request);
        } catch (cause) {
          const error = new Error(
            `Browser evidence callback failed: ${cause?.message ?? String(cause)}`,
            { cause },
          );
          error.code = 'E_VISUAL_REVIEW';
          throw error;
        }
        probes += 1;
        validateProbeResult(result, artifact.id, width, request);
        if (onProbeResult) {
          try {
            await onProbeResult(
              structuredClone({
                artifactId: artifact.id,
                artifactType: artifact.type,
                scenario,
                viewport: request.viewport,
                result,
              }),
            );
          } catch (cause) {
            const error = new Error(
              `Browser evidence observer failed: ${cause?.message ?? String(cause)}`,
              { cause },
            );
            error.code = 'E_VISUAL_REVIEW';
            throw error;
          }
        }

        const context = { artifactId: artifact.id, width, scenario };
        if (screenshotPath && metricsPath) {
          const retained = await retainBrowserEvidence({
            evidenceRoot,
            artifactId: artifact.id,
            viewport,
            viewportSize: request.viewport,
            screenshotPath,
            metricsPath,
            result,
            browserSession: session,
          });
          if (retained.valid) {
            evidence.push(retained.evidence);
          } else if (requireEvidence) {
            issues.push({
              ...context,
              code: 'browser-evidence-missing',
              message: retained.message,
            });
          }
        }
        if (result.pageOverflowX) {
          issues.push({
            ...context,
            code: 'viewport-overflow',
            message: 'Page exceeds the representative viewport width.',
          });
        }
        if (result.clippedX.length > 0) {
          issues.push({
            ...context,
            code: 'inner-x-overflow',
            message: 'An inner container clips content on the x axis.',
            details: result.clippedX,
          });
        }
        if ((result.viewportClipped ?? []).length > 0) {
          issues.push({
            ...context,
            code: 'viewport-clipping',
            message: 'Rendered content is clipped outside the viewport.',
            details: result.viewportClipped,
          });
        }
        if ((result.unreadableHeadings ?? []).length > 0) {
          issues.push({
            ...context,
            code: 'heading-readability',
            message: 'A heading is not visibly readable.',
            details: result.unreadableHeadings,
          });
        }
        if (result.animationsDisabled === false) {
          issues.push({
            ...context,
            code: 'animations-enabled',
            message:
              'Render QA observed active animation or transition timing.',
          });
        }
        if (!result.reducedMotion) {
          issues.push({
            ...context,
            code: 'reduced-motion',
            message: 'Browser did not observe reduced-motion mode.',
          });
        }
        if (
          !keyboardPassed(
            artifact.type,
            result.keyboard,
            scenario === 'default',
          )
        ) {
          issues.push({
            ...context,
            code: 'keyboard-navigation',
            message: 'Browser keyboard navigation probe failed.',
          });
        }
        if (
          request.themeToggle &&
          (!result.themeToggle.present ||
            !result.themeToggle.keyboardOperable ||
            result.themeToggle.initialMode === result.themeToggle.toggledMode ||
            !result.themeToggle.persisted)
        ) {
          issues.push({
            ...context,
            code: 'theme-toggle',
            message:
              'Switchable theme control must operate by keyboard and persist the alternate mode.',
          });
        }
        if (
          scenario === 'no-js' &&
          (result.deckLayout.flow !== 'vertical' ||
            result.deckLayout.overflowX !== 'auto')
        ) {
          issues.push({
            ...context,
            code: 'deck-no-js-layout',
            message:
              'No-JS deck must use vertical flow with x-axis auto containment.',
          });
        }
        if (
          scenario === 'print' &&
          (result.deckLayout.flow !== 'vertical' ||
            result.deckLayout.overflowX !== 'visible')
        ) {
          issues.push({
            ...context,
            code: 'deck-print-layout',
            message: 'Print deck must use its separate vertical print cascade.',
          });
        }
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    probes,
    ...(evidenceRoot && { evidence }),
  };
}

export async function auditArtifactSet({
  artifacts,
  denylist = [],
  browserProbe,
  browserSession,
  widths,
  evidenceRoot,
  requireBrowserEvidence = false,
  onProbeResult,
  setPlan,
}) {
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    throw new TypeError('Render QA requires at least one artifact.');
  }

  const artifactsWithCohesion = cohesionEvidenceFromLedger(artifacts, setPlan);
  const structural = artifactsWithCohesion.map((artifact) => ({
    id: artifact.id,
    ...checkHtmlStructure({ ...artifact, denylist }),
  }));
  const cohesion = checkArtifactCohesion(artifactsWithCohesion, {
    ...(setPlan?.recipe?.id === 'project-recap' &&
      Object.values(setPlan.ledger ?? {}).some(
        (entries) => Array.isArray(entries) && entries.length > 0,
      ) && {
        ledger: setPlan.ledger,
      }),
  });
  const browserProvider = browserSession ?? browserProbe;
  const browser = browserProvider
    ? await runBrowserProbes({
        artifacts,
        ...(browserSession ? { browserSession } : { probe: browserProbe }),
        ...(widths && { widths }),
        ...(evidenceRoot && { evidenceRoot }),
        ...(requireBrowserEvidence && { requireEvidence: true }),
        ...(onProbeResult !== undefined && { onProbeResult }),
      })
    : null;
  const issues = [
    ...structural.flatMap((artifact) => artifact.issues),
    ...cohesion.issues,
    ...(browser?.issues ?? []),
  ];

  return {
    valid: issues.length === 0,
    issues,
    artifacts: structural,
    cohesion,
    browser,
  };
}

async function retainBrowserEvidence({
  evidenceRoot,
  artifactId,
  viewport,
  viewportSize,
  screenshotPath,
  metricsPath,
  result,
  browserSession,
}) {
  let screenshot;
  try {
    screenshot = await stat(join(evidenceRoot, screenshotPath));
  } catch {
    return {
      valid: false,
      message: `Browser screenshot evidence is missing for ${artifactId} at ${viewportSize.width}px.`,
    };
  }
  if (
    !screenshot.isFile() ||
    screenshot.size === 0 ||
    screenshot.size > MAX_SCREENSHOT_BYTES
  ) {
    return {
      valid: false,
      message: `Browser screenshot evidence for ${artifactId} at ${viewportSize.width}px is empty or exceeds ${MAX_SCREENSHOT_BYTES} bytes.`,
    };
  }
  const screenshotBytes = await readFile(join(evidenceRoot, screenshotPath));
  const decoded = decodedPng(screenshotBytes);
  if (
    !decoded ||
    decoded.width !== viewportSize.width ||
    decoded.height !== viewportSize.height
  ) {
    return {
      valid: false,
      message: `Browser screenshot evidence for ${artifactId} at ${viewportSize.width}px must be a viewport-matched PNG.`,
    };
  }
  await writeJsonAtomic(evidenceRoot, metricsPath, {
    schemaVersion: 'explainer-kit.browser-evidence/v2',
    artifactId,
    viewport,
    viewportSize,
    scenario: 'default',
    runtime: structuredClone(browserSession.runtime),
    capture: structuredClone(browserSession.capture),
    captureIdentity: browserSession.captureIdentity,
    screenshotPath,
    metrics: structuredClone(result),
  });
  return {
    valid: true,
    evidence: {
      artifactId,
      viewport,
      width: viewportSize.width,
      height: viewportSize.height,
      screenshotPath,
      decodedScreenshotHash: decoded.decodedHash,
      metricsPath,
      runtime: structuredClone(browserSession.runtime),
      captureIdentity: browserSession.captureIdentity,
    },
  };
}

export function pngDimensions(bytes) {
  const decoded = decodedPng(bytes);
  return decoded ? { width: decoded.width, height: decoded.height } : null;
}

function decodedPng(bytes) {
  try {
    return decodeBrowserPng(bytes);
  } catch {
    return null;
  }
}

function browserEvidenceId(value) {
  if (
    typeof value !== 'string' ||
    !/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(value)
  ) {
    throw new TypeError('Browser evidence requires a safe artifact id.');
  }
  return value;
}

function viewportName(width) {
  return (
    {
      320: 'mobile',
      768: 'tablet',
      1440: 'desktop',
    }[width] ?? `viewport-${width}`
  );
}

function checkHeadings(html, add) {
  const headings = [
    ...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi),
  ].map((match) => ({
    level: Number(match[1]),
    text: visibleText(match[2]),
  }));

  if (
    headings.length === 0 ||
    headings.filter(({ level }) => level === 1).length > 1
  ) {
    add(
      'heading-text',
      'Artifact must contain readable headings and no more than one h1.',
    );
  }
  if (headings.some(({ text }) => text.length === 0)) {
    add('heading-text', 'Heading text must not be empty.');
  }
  for (let index = 1; index < headings.length; index += 1) {
    if (headings[index].level > headings[index - 1].level + 1) {
      add('heading-order', 'Heading levels must not skip hierarchy levels.');
      break;
    }
  }
}

function checkLinks(html, add) {
  const ids = new Set(
    [...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map(
      (match) => match[1],
    ),
  );
  for (const match of html.matchAll(/<a\b([^>]*)>/gi)) {
    const href = match[1].match(/\bhref\s*=\s*["']([^"']*)["']/i)?.[1];
    const invalid =
      !href ||
      href.startsWith('/') ||
      href.startsWith('//') ||
      /^(?:javascript|data|file):/i.test(href) ||
      (href.startsWith('#') && !ids.has(href.slice(1)));
    if (invalid) {
      add(
        'link-form',
        'Links require a safe absolute HTTPS, relative, or valid fragment href.',
        { href: href ?? null },
      );
    }
  }
}

function findTagImbalances(html) {
  const normalized = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b([^>]*)>[\s\S]*?<\/\1\s*>/gi, '<$1$2></$1>');
  const stack = [];
  const issues = [];
  for (const match of normalized.matchAll(/<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi)) {
    const full = match[0];
    const tag = match[1].toLowerCase();
    if (
      full.startsWith('<!') ||
      VOID_ELEMENTS.has(tag) ||
      /\/\s*>$/.test(full)
    ) {
      continue;
    }
    if (!full.startsWith('</')) {
      stack.push(tag);
      continue;
    }
    const expected = stack.pop();
    if (expected !== tag) {
      issues.push(
        `Closing </${tag}> does not match ${expected ? `<${expected}>` : 'an open tag'}.`,
      );
    }
  }
  for (const tag of stack.reverse()) {
    issues.push(`Tag <${tag}> is not closed.`);
  }
  return issues;
}

function visibleText(value) {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&(?:nbsp|#160);/gi, ' ')
    .trim();
}

function normalizeClaim(value) {
  if (typeof value === 'number') return `number:${value}`;
  if (typeof value === 'string') {
    const compact = value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
    if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(compact)) {
      return `number:${Number(compact)}`;
    }
    return `string:${compact}`;
  }
  if (typeof value === 'boolean') return `boolean:${value}`;
  throw new TypeError('Cohesion claims must be strings, numbers, or booleans.');
}

function validateProbeResult(result, id, width, request) {
  if (
    !isPlainObject(result) ||
    typeof result.pageOverflowX !== 'boolean' ||
    !Array.isArray(result.clippedX) ||
    typeof result.reducedMotion !== 'boolean' ||
    !isPlainObject(result.keyboard)
  ) {
    throw new TypeError(
      `Browser probe for ${id} at ${width}px returned an invalid result.`,
    );
  }
  if (
    (result.viewportClipped !== undefined &&
      !Array.isArray(result.viewportClipped)) ||
    (result.unreadableHeadings !== undefined &&
      !Array.isArray(result.unreadableHeadings)) ||
    (result.animationsDisabled !== undefined &&
      typeof result.animationsDisabled !== 'boolean')
  ) {
    throw new TypeError(
      `Browser layout probe for ${id} at ${width}px returned an invalid result.`,
    );
  }
  if (request.themeToggle && !isPlainObject(result.themeToggle)) {
    throw new TypeError(
      `Browser theme probe for ${id} at ${width}px returned an invalid result.`,
    );
  }
  if (request.scenario !== 'default' && !isPlainObject(result.deckLayout)) {
    throw new TypeError(
      `Browser deck probe for ${id} at ${width}px returned an invalid result.`,
    );
  }
}

function keyboardPassed(type, keyboard, requireDeckArrows) {
  if (keyboard.tab !== true) return false;
  if (type !== 'deck' || !requireDeckArrows) return true;
  return (
    isPlainObject(keyboard.arrows) &&
    ARROW_KEYS.every((key) => keyboard.arrows[key] === true)
  );
}

function browserScenarios(artifact) {
  return artifact.type === 'deck' ? ['default', 'no-js', 'print'] : ['default'];
}

function representativeHeight(width) {
  if (width <= 480) return 640;
  if (width <= 900) return 1024;
  return 900;
}

function artifactId(artifact) {
  return artifact?.id ?? artifact?.artifactId;
}

function hasElementId(html, id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\bid\\s*=\\s*["']${escaped}["']`, 'i').test(html);
}

function addExpansionWarnings(warnings, expansion) {
  if (expansion === undefined) return;
  if (
    !isPlainObject(expansion) ||
    !Array.isArray(expansion.errors) ||
    !Array.isArray(expansion.rejected) ||
    !Array.isArray(expansion.warnings)
  ) {
    throw new TypeError(
      'Guideline checker expansion must be an evaluated proposal result.',
    );
  }
  if (expansion.valid !== true || expansion.errors.length > 0) {
    throw new TypeError(
      'Guideline checker cannot convert expansion proposal errors into warnings.',
    );
  }

  const knownWarnings = new Set(EXPANSION_WARNING_BY_REJECTION_REASON.values());
  for (const warning of expansion.warnings) {
    if (knownWarnings.has(warning)) warnings.add(warning);
  }
  for (const rejected of expansion.rejected) {
    const warning = EXPANSION_WARNING_BY_REJECTION_REASON.get(rejected?.reason);
    if (warning) warnings.add(warning);
  }
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
