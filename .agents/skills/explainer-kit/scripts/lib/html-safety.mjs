import { createHash } from 'node:crypto';

const ALLOWED_ELEMENTS = new Set([
  'a',
  'abbr',
  'address',
  'article',
  'aside',
  'audio',
  'b',
  'bdi',
  'bdo',
  'blockquote',
  'body',
  'br',
  'button',
  'caption',
  'cite',
  'code',
  'col',
  'colgroup',
  'data',
  'dd',
  'del',
  'details',
  'dfn',
  'dialog',
  'div',
  'dl',
  'dt',
  'em',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'header',
  'hgroup',
  'hr',
  'html',
  'i',
  'img',
  'input',
  'kbd',
  'label',
  'legend',
  'li',
  'main',
  'mark',
  'menu',
  'meta',
  'meter',
  'nav',
  'noscript',
  'ol',
  'optgroup',
  'option',
  'output',
  'p',
  'picture',
  'pre',
  'progress',
  'q',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'script',
  'search',
  'section',
  'select',
  'slot',
  'small',
  'source',
  'span',
  'strong',
  'style',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'template',
  'textarea',
  'tfoot',
  'th',
  'thead',
  'time',
  'title',
  'tr',
  'u',
  'ul',
  'var',
  'video',
  'wbr',
  // Inline SVG used by both artistic paths.
  'animate',
  'animatemotion',
  'animatetransform',
  'circle',
  'clippath',
  'defs',
  'desc',
  'ellipse',
  'feblend',
  'fecolormatrix',
  'fecomponenttransfer',
  'fecomposite',
  'feconvolvematrix',
  'fediffuselighting',
  'fedisplacementmap',
  'fedistantlight',
  'fedropshadow',
  'feflood',
  'fefunca',
  'fefuncb',
  'fefuncg',
  'fefuncr',
  'fegaussianblur',
  'feimage',
  'femerge',
  'femergenode',
  'femorphology',
  'feoffset',
  'fepointlight',
  'fespecularlighting',
  'fespotlight',
  'fetile',
  'feturbulence',
  'filter',
  'foreignobject',
  'g',
  'image',
  'line',
  'lineargradient',
  'marker',
  'mask',
  'metadata',
  'mpath',
  'path',
  'pattern',
  'polygon',
  'polyline',
  'radialgradient',
  'rect',
  'set',
  'stop',
  'svg',
  'switch',
  'symbol',
  'text',
  'textpath',
  'tspan',
  'use',
  'view',
]);

const BLOCKED_ACTIVE_ELEMENTS = new Set([
  'applet',
  'base',
  'embed',
  'frame',
  'frameset',
  'iframe',
  'object',
]);
const URL_ATTRIBUTES = new Set([
  'action',
  'cite',
  'data',
  'formaction',
  'href',
  'ping',
  'poster',
  'src',
  'srcset',
  'xlink:href',
]);
// Every element that can pull a subresource into the document, including the
// SVG reference elements that resolve `href`/`xlink:href` against another
// document.
const RESOURCE_ELEMENTS = new Set([
  'animate',
  'animatemotion',
  'animatetransform',
  'audio',
  'clippath',
  'embed',
  'feimage',
  'filter',
  'frame',
  'iframe',
  'image',
  'img',
  'lineargradient',
  'link',
  'marker',
  'mask',
  'mpath',
  'object',
  'pattern',
  'radialgradient',
  'script',
  'set',
  'source',
  'textpath',
  'track',
  'use',
  'video',
  'view',
]);
// Submission targets never have a legitimate use in a self-contained artifact,
// so they are rejected under every scheme rather than only when external.
const SUBMISSION_ATTRIBUTES = new Set(['action', 'formaction', 'ping']);
const DANGEROUS_SCHEMES = [
  'javascript:',
  'vbscript:',
  'file:',
  'data:text/html',
  'data:image/svg+xml',
];
const REQUIRED_THEME_TOKENS = [
  '--canvas',
  '--panel',
  '--border',
  '--ink',
  '--muted',
  '--accent',
  '--sans',
  '--mono',
];
const REQUIRED_ANCHORS = {
  'deck-shell': [
    ['class', 'deck'],
    ['class', 'deck-controls'],
    ['id', 'deck-counter'],
    ['class', 'deck-progress'],
    ['id', 'deck-progress'],
    ['class', 'deck-progress__bar'],
  ],
  'diagram-shell': [
    ['id', 'diagram-title'],
    ['id', 'diagram-description'],
    ['class', 'diagram-shell'],
    ['class', 'zoom-controls'],
    ['class', 'diagram-viewport'],
    ['class', 'diagram-canvas'],
    ['class', 'legend'],
  ],
  'engineer-tour': [
    ['class', 'layout'],
    ['class', 'toc'],
    ['class', 'tour-body'],
    ['class', 'diagram-rail'],
    ['class', 'diagram-card'],
  ],
};

export function validateHtmlSafety({ html, shell, shellName } = {}) {
  if (typeof html !== 'string' || typeof shell !== 'string') {
    return {
      valid: false,
      errors: ['invalid-html-safety-input'],
      warnings: [],
    };
  }

  const authored = tokenizeHtml(html);
  const core = tokenizeHtml(shell);
  const errors = new Set();

  if (authored.errors.length > 0) errors.add('malformed-html');
  if (core.errors.length > 0) errors.add('invalid-core-shell');

  inspectElements(authored, errors);
  compareCoreScripts(core.scripts, authored.scripts, errors);

  const resolvedShellName =
    normalizeShellName(shellName) ?? inferShellName(core);
  const warnings = styleWarnings(authored, resolvedShellName);

  return {
    valid: errors.size === 0,
    errors: [...errors],
    warnings,
  };
}

export function coreScriptHashes(shell) {
  if (typeof shell !== 'string') return [];
  return tokenizeHtml(shell).scripts.map(hash);
}

function inspectElements(document, errors) {
  for (const element of document.elements) {
    if (
      BLOCKED_ACTIVE_ELEMENTS.has(element.name) ||
      !ALLOWED_ELEMENTS.has(element.name)
    ) {
      errors.add(`disallowed-element:${element.name}`);
    }

    for (const attribute of element.attributes) {
      if (attribute.name.startsWith('on')) {
        errors.add('inline-event-handler');
      }
      if (attribute.name === 'srcdoc') {
        errors.add('external-active-content');
      }
      if (attribute.name === 'style' && containsExternalCss(attribute.value)) {
        errors.add('external-active-content');
      }
      if (
        URL_ATTRIBUTES.has(attribute.name) &&
        isUnsafeUrl(attribute.value, element.name, attribute.name)
      ) {
        errors.add('external-active-content');
      }
    }

    if (
      element.name === 'meta' &&
      attributeValue(element, 'http-equiv')?.toLowerCase() === 'refresh'
    ) {
      errors.add('external-active-content');
    }
  }

  for (const css of document.styles) {
    if (containsExternalCss(css)) errors.add('external-active-content');
  }
}

function compareCoreScripts(expected, actual, errors) {
  if (expected.length !== actual.length) {
    errors.add('core-script-count-mismatch');
  }

  const length = Math.min(expected.length, actual.length);
  for (let index = 0; index < length; index += 1) {
    if (hash(expected[index]) !== hash(actual[index])) {
      errors.add(`core-script-hash-mismatch:${index}`);
    }
  }
}

function styleWarnings(document, shellName) {
  const warnings = [];
  const styleText = document.styles.join('\n');

  for (const token of REQUIRED_THEME_TOKENS) {
    if (!new RegExp(`${escapeRegExp(token)}\\s*:`).test(styleText)) {
      warnings.push(`missing-theme-token:${token}`);
    }
  }

  for (const [attribute, value] of REQUIRED_ANCHORS[shellName] ?? []) {
    const present = document.elements.some((element) => {
      const candidate = attributeValue(element, attribute);
      return attribute === 'class'
        ? candidate?.split(/\s+/).includes(value)
        : candidate === value;
    });
    if (!present) warnings.push(`missing-required-anchor:${value}`);
  }

  return warnings;
}

function tokenizeHtml(html) {
  const elements = [];
  const errors = [];
  const scripts = [];
  const styles = [];
  let cursor = 0;

  while (cursor < html.length) {
    const opening = html.indexOf('<', cursor);
    if (opening === -1) break;

    if (html.startsWith('<!--', opening)) {
      const end = html.indexOf('-->', opening + 4);
      if (end === -1) {
        errors.push('unclosed-comment');
        break;
      }
      cursor = end + 3;
      continue;
    }

    if (html[opening + 1] === '!' || html[opening + 1] === '?') {
      const end = findTagEnd(html, opening + 2);
      if (end === -1) {
        errors.push('unclosed-declaration');
        break;
      }
      cursor = end + 1;
      continue;
    }

    if (html[opening + 1] === '/') {
      const end = findTagEnd(html, opening + 2);
      if (end === -1) {
        errors.push('unclosed-end-tag');
        break;
      }
      cursor = end + 1;
      continue;
    }

    const end = findTagEnd(html, opening + 1);
    if (end === -1) {
      errors.push('unclosed-start-tag');
      break;
    }

    const rawTag = html.slice(opening, end + 1);
    const match = rawTag.match(/^<\s*([^\s/>]+)/);
    if (!match) {
      errors.push('invalid-start-tag');
      cursor = end + 1;
      continue;
    }

    const name = match[1].toLowerCase();
    const attributeSource = rawTag.slice(match[0].length, -1);
    const parsedAttributes = parseAttributes(attributeSource);
    if (parsedAttributes.error) errors.push(parsedAttributes.error);
    elements.push({ name, attributes: parsedAttributes.attributes });

    if ((name === 'script' || name === 'style') && !/\/\s*>$/.test(rawTag)) {
      const closing = findRawTextClosingTag(html, end + 1, name);
      if (!closing) {
        errors.push(`unclosed-${name}`);
        break;
      }
      const body = html.slice(end + 1, closing.start);
      const rawElement = html.slice(opening, closing.end);
      if (name === 'script') scripts.push(rawElement);
      else styles.push(body);
      cursor = closing.end;
      continue;
    }

    cursor = end + 1;
  }

  return { elements, errors, scripts, styles };
}

function findTagEnd(html, start) {
  let quote = null;
  for (let index = start; index < html.length; index += 1) {
    const character = html[index];
    if (quote) {
      if (character === quote) quote = null;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return index;
    }
  }
  return -1;
}

function findRawTextClosingTag(html, start, name) {
  const pattern = new RegExp(`<\\/\\s*${name}\\s*>`, 'gi');
  pattern.lastIndex = start;
  const match = pattern.exec(html);
  return match ? { start: match.index, end: pattern.lastIndex } : null;
}

function parseAttributes(source) {
  const attributes = [];
  let cursor = 0;

  while (cursor < source.length) {
    while (/\s/.test(source[cursor])) cursor += 1;
    if (cursor >= source.length) break;
    if (source[cursor] === '/') {
      cursor += 1;
      continue;
    }

    const nameStart = cursor;
    while (cursor < source.length && !/[\s=/>]/.test(source[cursor])) {
      cursor += 1;
    }
    if (nameStart === cursor) {
      return { attributes, error: 'invalid-attribute' };
    }

    const name = source.slice(nameStart, cursor).toLowerCase();
    while (/\s/.test(source[cursor])) cursor += 1;
    let value = '';

    if (source[cursor] === '=') {
      cursor += 1;
      while (/\s/.test(source[cursor])) cursor += 1;
      const quote = source[cursor];
      if (quote === '"' || quote === "'") {
        cursor += 1;
        const valueStart = cursor;
        while (cursor < source.length && source[cursor] !== quote) cursor += 1;
        if (cursor >= source.length) {
          return { attributes, error: 'unclosed-attribute-value' };
        }
        value = source.slice(valueStart, cursor);
        cursor += 1;
      } else {
        const valueStart = cursor;
        while (cursor < source.length && !/[\s>]/.test(source[cursor])) {
          cursor += 1;
        }
        value = source.slice(valueStart, cursor);
      }
    }

    attributes.push({ name, value: decodeHtmlReferences(value) });
  }

  return { attributes, error: null };
}

function isUnsafeUrl(value, elementName, attributeName) {
  if (
    DANGEROUS_SCHEMES.some((scheme) => compactUrl(value).startsWith(scheme))
  ) {
    return true;
  }
  if (SUBMISSION_ATTRIBUTES.has(attributeName)) return true;
  return isUnpinnedResourceRef(value, elementName, attributeName);
}

// A resource element may only reference payloads that travel with the
// document: an allowed inline `data:` payload or a same-document fragment.
function isUnpinnedResourceRef(value, elementName, attributeName) {
  if (
    !RESOURCE_ELEMENTS.has(elementName) ||
    !URL_ATTRIBUTES.has(attributeName)
  ) {
    return false;
  }
  const candidates =
    attributeName === 'srcset' ? srcsetCandidates(value) : [value];
  return candidates.length === 0 || !candidates.every(isSelfContainedRef);
}

function isSelfContainedRef(value) {
  const compact = compactUrl(value);
  if (compact.startsWith('#')) return true;
  return (
    compact.startsWith('data:') &&
    !DANGEROUS_SCHEMES.some((scheme) => compact.startsWith(scheme))
  );
}

// `srcset` candidates are whitespace-delimited URL/descriptor pairs separated
// by commas, and a `data:` URL may itself contain commas, so candidates are
// split on the trailing comma of a token rather than on every comma.
function srcsetCandidates(value) {
  const urls = [];
  let expectUrl = true;
  for (const token of value.split(/\s+/).filter(Boolean)) {
    const terminated = token.endsWith(',');
    if (expectUrl) {
      urls.push(terminated ? token.slice(0, -1) : token);
    }
    expectUrl = terminated;
  }
  return urls.filter(Boolean);
}

function compactUrl(value) {
  return value.replace(/[\u0000-\u0020\u007f]+/g, '').toLowerCase();
}

// Shared with the render QA structural check so both call sites enforce one
// self-contained-resource policy.
export function findUnpinnedResourceRefs(html) {
  if (typeof html !== 'string') return [];
  const refs = [];
  for (const element of tokenizeHtml(html).elements) {
    for (const attribute of element.attributes) {
      if (
        isUnpinnedResourceRef(attribute.value, element.name, attribute.name)
      ) {
        refs.push({
          element: element.name,
          attribute: attribute.name,
          value: attribute.value,
        });
      }
    }
  }
  return refs;
}

function containsExternalCss(value) {
  const normalized = value
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\\([\da-f]{1,6})\s?/gi, (_, digits) =>
      decodeCodePoint(Number.parseInt(digits, 16)),
    )
    .replace(/\\([^\r\n\f])/g, '$1');
  return (
    /@import\b/i.test(normalized) ||
    /url\(\s*(['"]?)(?:(?:https?:)?\/\/|data:text\/html|data:image\/svg\+xml)/i.test(
      normalized,
    )
  );
}

function decodeHtmlReferences(value) {
  const named = {
    amp: '&',
    colon: ':',
    newline: '\n',
    quot: '"',
    tab: '\t',
  };
  return value.replace(
    /&(?:#(\d+)|#x([\da-f]+)|([a-z]+));?/gi,
    (reference, decimal, hexadecimal, name) => {
      if (decimal) return decodeCodePoint(Number(decimal));
      if (hexadecimal) return decodeCodePoint(Number.parseInt(hexadecimal, 16));
      return named[name.toLowerCase()] ?? reference;
    },
  );
}

function decodeCodePoint(value) {
  if (
    !Number.isInteger(value) ||
    value < 0 ||
    value > 0x10ffff ||
    (value >= 0xd800 && value <= 0xdfff)
  ) {
    return '\uFFFD';
  }
  return String.fromCodePoint(value);
}

function attributeValue(element, name) {
  return element.attributes.find((attribute) => attribute.name === name)?.value;
}

function normalizeShellName(shellName) {
  if (typeof shellName !== 'string') return null;
  const normalized = shellName.replace(/\.html$/i, '');
  return REQUIRED_ANCHORS[normalized] ? normalized : null;
}

function inferShellName(document) {
  const classes = new Set(
    document.elements.flatMap(
      (element) => attributeValue(element, 'class')?.split(/\s+/) ?? [],
    ),
  );
  if (classes.has('deck')) return 'deck-shell';
  if (classes.has('diagram-shell')) return 'diagram-shell';
  if (classes.has('layout') && classes.has('tour-body')) return 'engineer-tour';
  return null;
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
