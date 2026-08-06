const MAX_HTML_BYTES = 1_000_000;
const MAX_ELEMENTS = 10_000;
const MAX_REFERENCES = 20_000;
const MAX_ERRORS = 100;
const RAW_TEXT_ELEMENTS = new Set(['script', 'style']);
const REFERENCE_ATTRIBUTES = new Set([
  'href',
  'poster',
  'src',
  'srcset',
  'xlink:href',
]);
const SAFE_DATA_REFERENCE =
  /^data:image\/(?:gif|jpeg|png|webp);base64,[a-z0-9+/]+={0,2}$/i;

export function validateInternalReferences({ artifacts, manifestPaths } = {}) {
  const errors = [];
  const add = (artifactId, code, message, detail = {}) => {
    if (errors.length >= MAX_ERRORS) return;
    errors.push({ artifactId, code, message, ...detail });
  };
  if (!Array.isArray(artifacts) || !Array.isArray(manifestPaths)) {
    add(
      null,
      'invalid-site-tree',
      'Internal-reference validation requires artifacts and manifest paths.',
    );
    return { valid: false, errors };
  }
  const declaredPaths = new Set(manifestPaths);
  if (
    declaredPaths.size !== manifestPaths.length ||
    manifestPaths.some((path) => !isCanonicalSitePath(path))
  ) {
    add(
      null,
      'invalid-site-tree',
      'Manifest paths must be unique canonical site-relative files.',
    );
  }

  const idsByPath = new Map();
  const tokenized = [];
  const boundPaths = new Set();
  let referenceCount = 0;
  for (const artifact of artifacts) {
    if (
      !isObject(artifact) ||
      typeof artifact.artifactId !== 'string' ||
      typeof artifact.renderedPath !== 'string' ||
      typeof artifact.html !== 'string' ||
      !declaredPaths.has(artifact.renderedPath)
    ) {
      add(
        artifact?.artifactId ?? null,
        'invalid-site-tree',
        'Every rendered artifact must bind to one manifest-declared site path.',
      );
      continue;
    }
    if (boundPaths.has(artifact.renderedPath)) {
      add(
        artifact.artifactId,
        'invalid-site-tree',
        'Rendered artifact paths must be unique.',
        { renderedPath: artifact.renderedPath },
      );
      continue;
    }
    boundPaths.add(artifact.renderedPath);
    if (Buffer.byteLength(artifact.html, 'utf8') > MAX_HTML_BYTES) {
      add(
        artifact.artifactId,
        'validation-bound',
        `Rendered artifact exceeds the ${MAX_HTML_BYTES}-byte validation bound.`,
      );
      continue;
    }
    const parsed = tokenizeBoundedHtml(artifact.html);
    if (!parsed.valid) {
      add(artifact.artifactId, parsed.code, parsed.message, {
        renderedPath: artifact.renderedPath,
      });
      continue;
    }
    const ids = new Set();
    for (const element of parsed.elements) {
      for (const attribute of element.attributes) {
        if (attribute.name === 'id') {
          if (!attribute.value || ids.has(attribute.value)) {
            add(
              artifact.artifactId,
              'malformed-fragment-target',
              'Fragment target IDs must be non-empty and unique per document.',
              { renderedPath: artifact.renderedPath },
            );
          }
          ids.add(attribute.value);
        }
        if (REFERENCE_ATTRIBUTES.has(attribute.name)) {
          referenceCount += 1;
        }
      }
    }
    idsByPath.set(artifact.renderedPath, ids);
    tokenized.push({ artifact, elements: parsed.elements });
  }
  if (referenceCount > MAX_REFERENCES) {
    add(
      null,
      'validation-bound',
      `Rendered site exceeds the ${MAX_REFERENCES}-reference validation bound.`,
    );
    return { valid: false, errors };
  }

  for (const { artifact, elements } of tokenized) {
    for (const element of elements) {
      for (const attribute of element.attributes) {
        if (!REFERENCE_ATTRIBUTES.has(attribute.name)) continue;
        const references =
          attribute.name === 'srcset'
            ? parseSrcset(attribute.value)
            : { valid: true, values: [attribute.value] };
        if (!references.valid) {
          add(
            artifact.artifactId,
            'malformed-srcset',
            'srcset must contain bounded URL candidates with valid descriptors.',
            referenceDetail(artifact, element, attribute, attribute.value),
          );
          continue;
        }
        for (const reference of references.values) {
          validateReference({
            artifact,
            element,
            attribute,
            reference,
            declaredPaths,
            idsByPath,
            add,
          });
        }
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

function validateReference({
  artifact,
  element,
  attribute,
  reference,
  declaredPaths,
  idsByPath,
  add,
}) {
  const detail = referenceDetail(artifact, element, attribute, reference);
  if (
    typeof reference !== 'string' ||
    reference.length === 0 ||
    hasUnsafeRawReferenceBytes(reference)
  ) {
    add(
      artifact.artifactId,
      'unsafe-reference',
      'References must use a non-empty canonical raw form.',
      detail,
    );
    return;
  }
  const scheme = reference.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  if (scheme === 'data') {
    if (
      !isResourceAttribute(element.name, attribute.name) ||
      !SAFE_DATA_REFERENCE.test(reference)
    ) {
      add(
        artifact.artifactId,
        'unsafe-scheme',
        'Only bounded base64 image data references are allowed inline.',
        detail,
      );
    }
    return;
  }
  if (scheme) {
    let external;
    try {
      external = new URL(reference);
    } catch {
      add(
        artifact.artifactId,
        'malformed-reference',
        'Absolute reference is malformed.',
        detail,
      );
      return;
    }
    if (
      scheme !== 'https' ||
      external.username ||
      external.password ||
      (element.name !== 'a' && element.name !== 'area') ||
      attribute.name !== 'href'
    ) {
      add(
        artifact.artifactId,
        scheme === 'https' && isResourceAttribute(element.name, attribute.name)
          ? 'external-resource'
          : 'unsafe-scheme',
        'External resources and unsafe navigation schemes are not allowed.',
        detail,
      );
    }
    return;
  }
  if (reference.startsWith('//')) {
    add(
      artifact.artifactId,
      'unsafe-reference',
      'Protocol-relative references are ambiguous.',
      detail,
    );
    return;
  }
  if (reference.includes('?')) {
    add(
      artifact.artifactId,
      'query-reference',
      'Internal references cannot contain queries.',
      detail,
    );
    return;
  }
  const [pathPart, rawFragment, ...extraFragments] = reference.split('#');
  if (extraFragments.length > 0) {
    add(
      artifact.artifactId,
      'malformed-reference',
      'Internal references can contain at most one fragment delimiter.',
      detail,
    );
    return;
  }
  if (pathPart.endsWith('/')) {
    add(
      artifact.artifactId,
      'directory-reference',
      'Internal links must name an explicit file such as index.html.',
      detail,
    );
    return;
  }
  if (pathPart.startsWith('/')) {
    add(
      artifact.artifactId,
      'site-root-escape',
      'Internal references must be relative to the current artifact.',
      detail,
    );
    return;
  }
  const base = new URL(artifact.renderedPath, 'https://explainer.invalid/');
  let resolved;
  try {
    resolved = new URL(reference, base);
  } catch {
    add(
      artifact.artifactId,
      'malformed-reference',
      'Relative reference is malformed.',
      detail,
    );
    return;
  }
  if (
    resolved.origin !== base.origin ||
    resolved.protocol !== 'https:' ||
    !resolved.pathname.startsWith('/site/')
  ) {
    add(
      artifact.artifactId,
      'site-root-escape',
      'Internal reference resolves outside the generated site root.',
      detail,
    );
    return;
  }
  const targetPath = resolved.pathname.slice(1);
  if (!declaredPaths.has(targetPath)) {
    add(
      artifact.artifactId,
      'missing-target',
      'Internal reference does not resolve to a manifest-declared file.',
      { ...detail, targetPath },
    );
    return;
  }
  if (rawFragment !== undefined) {
    let fragment;
    try {
      fragment = decodeURIComponent(rawFragment);
    } catch {
      add(
        artifact.artifactId,
        'malformed-reference',
        'Reference fragment is not valid percent-encoded text.',
        detail,
      );
      return;
    }
    if (!fragment || !idsByPath.get(targetPath)?.has(fragment)) {
      add(
        artifact.artifactId,
        'missing-fragment',
        'Internal reference fragment does not exist in the target document.',
        { ...detail, targetPath, fragment },
      );
    }
  }
}

function tokenizeBoundedHtml(html) {
  const elements = [];
  let cursor = 0;
  while (cursor < html.length) {
    const open = html.indexOf('<', cursor);
    if (open < 0) break;
    if (html.startsWith('<!--', open)) {
      const close = html.indexOf('-->', open + 4);
      if (close < 0) return malformedHtml();
      cursor = close + 3;
      continue;
    }
    const close = findTagEnd(html, open + 1);
    if (close < 0) return malformedHtml();
    const source = html.slice(open + 1, close);
    if (/^\s*[!/]/.test(source)) {
      cursor = close + 1;
      continue;
    }
    const parsed = parseStartTag(source);
    if (!parsed.valid) return malformedHtml();
    elements.push(parsed.element);
    if (elements.length > MAX_ELEMENTS) {
      return {
        valid: false,
        code: 'validation-bound',
        message: `Rendered artifact exceeds the ${MAX_ELEMENTS}-element validation bound.`,
      };
    }
    cursor = close + 1;
    if (RAW_TEXT_ELEMENTS.has(parsed.element.name)) {
      const closing = indexOfCaseInsensitive(
        html,
        `</${parsed.element.name}`,
        cursor,
      );
      if (closing < 0) return malformedHtml();
      const closingEnd = findTagEnd(html, closing + 2);
      if (closingEnd < 0) return malformedHtml();
      cursor = closingEnd + 1;
    }
  }
  return { valid: true, elements };
}

function findTagEnd(html, start) {
  let quote = null;
  for (let index = start; index < html.length; index += 1) {
    const char = html[index];
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '>') {
      return index;
    }
  }
  return -1;
}

function parseStartTag(source) {
  const nameMatch = source.match(/^\s*([a-z][a-z0-9:-]*)/i);
  if (!nameMatch) return { valid: false };
  const name = nameMatch[1].toLowerCase();
  const attributes = [];
  let cursor = nameMatch[0].length;
  while (cursor < source.length) {
    while (/\s/.test(source[cursor] ?? '')) cursor += 1;
    if (cursor >= source.length || source[cursor] === '/') break;
    const attributeMatch = source
      .slice(cursor)
      .match(/^([^\s"'<>/=]+)(?:\s*=\s*)?/);
    if (!attributeMatch) return { valid: false };
    const attributeName = attributeMatch[1].toLowerCase();
    cursor += attributeMatch[0].length;
    const hasValue = attributeMatch[0].includes('=');
    let value = '';
    if (hasValue) {
      const quote = source[cursor];
      if (quote !== '"' && quote !== "'") return { valid: false };
      const end = source.indexOf(quote, cursor + 1);
      if (end < 0) return { valid: false };
      value = decodeHtmlReferences(source.slice(cursor + 1, end));
      cursor = end + 1;
    }
    attributes.push({ name: attributeName, value });
  }
  return { valid: true, element: { name, attributes } };
}

function parseSrcset(value) {
  const values = [];
  let cursor = 0;
  while (cursor < value.length) {
    while (/\s/.test(value[cursor] ?? '')) cursor += 1;
    if (cursor >= value.length || value[cursor] === ',') {
      return { valid: false, values: [] };
    }
    const dataReference =
      value.slice(cursor, cursor + 'data:'.length).toLowerCase() === 'data:';
    const urlStart = cursor;
    if (dataReference) {
      while (cursor < value.length && !/\s/.test(value[cursor])) {
        cursor += 1;
      }
    } else {
      while (cursor < value.length && !/[\s,]/.test(value[cursor])) {
        cursor += 1;
      }
    }
    const url = value.slice(urlStart, cursor);
    if (!url) return { valid: false, values: [] };
    values.push(url);
    if (value[cursor] === ',') {
      cursor += 1;
      continue;
    }
    while (/\s/.test(value[cursor] ?? '')) cursor += 1;
    const descriptorStart = cursor;
    while (cursor < value.length && !/[\s,]/.test(value[cursor])) {
      cursor += 1;
    }
    const descriptor = value.slice(descriptorStart, cursor);
    if (descriptor && !/^(?:\d+w|(?:\d+(?:\.\d+)?|\.\d+)x)$/.test(descriptor)) {
      return { valid: false, values: [] };
    }
    while (/\s/.test(value[cursor] ?? '')) cursor += 1;
    if (cursor < value.length) {
      if (value[cursor] !== ',') return { valid: false, values: [] };
      cursor += 1;
    }
  }
  return {
    valid: values.length > 0,
    values,
  };
}

function hasUnsafeRawReferenceBytes(value) {
  if (
    value !== value.trim() ||
    value.includes('\\') ||
    value.includes('\0') ||
    /%(?:2e|2f|5c)/i.test(value)
  ) {
    return true;
  }
  for (const char of value) {
    const code = char.codePointAt(0);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

function isResourceAttribute(elementName, attributeName) {
  return (
    ['poster', 'src', 'srcset'].includes(attributeName) ||
    (['href', 'xlink:href'].includes(attributeName) &&
      !['a', 'area'].includes(elementName))
  );
}

function isCanonicalSitePath(value) {
  if (
    typeof value !== 'string' ||
    !/^site\/[a-z0-9._-]+(?:\/[a-z0-9._-]+)*$/i.test(value)
  ) {
    return false;
  }
  return value.split('/').every((segment) => !['.', '..'].includes(segment));
}

function referenceDetail(artifact, element, attribute, reference) {
  return {
    renderedPath: artifact.renderedPath,
    element: element.name,
    attribute: attribute.name,
    reference,
  };
}

function malformedHtml() {
  return {
    valid: false,
    code: 'malformed-html',
    message: 'Rendered HTML cannot be tokenized safely.',
  };
}

function indexOfCaseInsensitive(source, search, fromIndex) {
  return source.toLowerCase().indexOf(search.toLowerCase(), fromIndex);
}

function decodeHtmlReferences(value) {
  return value.replace(
    /&(?:amp|quot|apos|#39|#x27);/gi,
    (entity) =>
      ({
        '&amp;': '&',
        '&quot;': '"',
        '&apos;': "'",
        '&#39;': "'",
        '&#x27;': "'",
      })[entity.toLowerCase()] ?? entity,
  );
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
