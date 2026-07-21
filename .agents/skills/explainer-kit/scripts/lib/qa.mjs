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
const EXTERNAL_ASSET_PATTERN =
  /<(?:script|iframe|source|img|audio|video|object|embed)\b[^>]*(?:src|data)\s*=\s*["'](?!data:)[^"']+/i;
const INLINE_ASSET_VIOLATION_PATTERN =
  /<link\b|@import\b|url\(\s*["']?(?!data:|#)/i;
const TOKEN_PATTERN = /{{\s*[A-Z][A-Z0-9_]*\s*}}/g;
const ARROW_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

export const REPRESENTATIVE_WIDTHS = Object.freeze([320, 768, 1440]);

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
  const clippedX = [...document.querySelectorAll('body *')]
    .filter((element) => {
      const style = getComputedStyle(element);
      return element.scrollWidth > element.clientWidth + 2 &&
        ['hidden', 'clip'].includes(style.overflowX);
    })
    .map((element) => ({
      selector: element.id ? '#' + CSS.escape(element.id) :
        element.classList.length ? '.' + [...element.classList].map(CSS.escape).join('.') :
        element.tagName.toLowerCase(),
      overflowX: getComputedStyle(element).overflowX,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth
    }))
    .slice(0, 20);
  return {
    pageOverflowX: root.scrollWidth > root.clientWidth + 2,
    clippedX,
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

  if (
    EXTERNAL_ASSET_PATTERN.test(html) ||
    INLINE_ASSET_VIOLATION_PATTERN.test(html)
  ) {
    add(
      'external-asset',
      'Final HTML assets must be inline and self-contained.',
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

export function checkArtifactCohesion(artifacts) {
  if (!Array.isArray(artifacts)) {
    throw new TypeError('Artifact cohesion input must be an array.');
  }
  const issues = [];
  const groups = ['terminology', 'numericClaims', 'statuses'];

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
  }

  return { valid: issues.length === 0, issues };
}

export async function runBrowserProbes({
  artifacts,
  probe,
  widths = REPRESENTATIVE_WIDTHS,
}) {
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    throw new TypeError('Browser QA requires at least one artifact.');
  }
  if (typeof probe !== 'function') {
    throw new TypeError('Browser QA requires a probe callback.');
  }
  if (
    !Array.isArray(widths) ||
    widths.length === 0 ||
    widths.some((width) => !Number.isInteger(width) || width < 240)
  ) {
    throw new TypeError('Browser QA widths must be viewport-sized integers.');
  }

  const issues = [];
  let probes = 0;
  for (const artifact of artifacts) {
    for (const width of widths) {
      for (const scenario of browserScenarios(artifact)) {
        const request = {
          artifact,
          scenario,
          viewport: { width, height: representativeHeight(width) },
          reducedMotion: 'reduce',
          evaluate: BROWSER_PROBE_EVALUATE,
          keyboard:
            artifact.type === 'deck' && scenario === 'default'
              ? { tab: true, arrows: [...ARROW_KEYS] }
              : { tab: true },
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
        const result = await probe(request);
        probes += 1;
        validateProbeResult(result, artifact.id, width, request);

        const context = { artifactId: artifact.id, width, scenario };
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

  return { valid: issues.length === 0, issues, probes };
}

export async function auditArtifactSet({
  artifacts,
  denylist = [],
  browserProbe,
  widths,
}) {
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    throw new TypeError('Render QA requires at least one artifact.');
  }

  const structural = artifacts.map((artifact) => ({
    id: artifact.id,
    ...checkHtmlStructure({ ...artifact, denylist }),
  }));
  const cohesion = checkArtifactCohesion(artifacts);
  const browser = browserProbe
    ? await runBrowserProbes({
        artifacts,
        probe: browserProbe,
        ...(widths && { widths }),
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

function validateProbeResult(result, artifactId, width, request) {
  if (
    !isPlainObject(result) ||
    typeof result.pageOverflowX !== 'boolean' ||
    !Array.isArray(result.clippedX) ||
    typeof result.reducedMotion !== 'boolean' ||
    !isPlainObject(result.keyboard)
  ) {
    throw new TypeError(
      `Browser probe for ${artifactId} at ${width}px returned an invalid result.`,
    );
  }
  if (request.themeToggle && !isPlainObject(result.themeToggle)) {
    throw new TypeError(
      `Browser theme probe for ${artifactId} at ${width}px returned an invalid result.`,
    );
  }
  if (request.scenario !== 'default' && !isPlainObject(result.deckLayout)) {
    throw new TypeError(
      `Browser deck probe for ${artifactId} at ${width}px returned an invalid result.`,
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

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
