import { readFile } from 'node:fs/promises';
import { posix } from 'node:path';

import { canonicalHash, validateContract } from './contracts.mjs';

const RENDER_STRATEGIES = new Set(['default-only', 'user-switchable']);
const TEMPLATE_BY_TYPE = new Map([
  ['hub', 'house-style'],
  ['diagram', 'diagram-shell'],
  ['explainer', 'engineer-tour'],
  ['deck', 'deck-shell'],
]);
const TYPE_DIRECTORIES = new Map([
  ['hub', 'initiatives'],
  ['diagram', 'diagrams'],
  ['explainer', 'explainers'],
  ['deck', 'decks'],
]);
const CONTENT_KEYS = new Set([
  'artifactId',
  'artifactLinks',
  'description',
  'eyebrow',
  'footer',
  'sections',
  'slug',
  'title',
]);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TOKEN_PATTERN = /{{([A-Z][A-Z_]*)}}/g;

export async function renderArtifact({
  recipeArtifact,
  content,
  theme,
  renderStrategy,
  publicBaseUrl,
}) {
  assertRecipeArtifact(recipeArtifact);
  assertContent(content, recipeArtifact);
  assertTheme(theme);
  assertRenderStrategy(renderStrategy);

  const baseUrl = normalizePublicBaseUrl(publicBaseUrl);
  const renderedPath = artifactPath(recipeArtifact, content.slug);
  const template = await readFile(
    new URL(`../../templates/${recipeArtifact.template}.html`, import.meta.url),
    'utf8',
  );
  const sections = content.sections.map((section) => ({
    ...section,
    anchor: section.id,
  }));
  const links = content.artifactLinks ?? [];
  const values = templateValues({
    recipeArtifact,
    content,
    sections,
    links,
    theme,
    renderedPath,
    baseUrl,
  });

  let html = substituteTemplate(template, values);
  html = html.replace(
    '<html lang="en">',
    `<html lang="en" data-render-strategy="${renderStrategy}" data-theme-mode="${theme.defaultMode}">`,
  );
  if (renderStrategy === 'user-switchable') {
    html = html
      .replace('</head>', `${switchableThemeStyle(theme)}\n  </head>`)
      .replace('</body>', `${switchableThemeControl(theme)}\n  </body>`);
  }

  return {
    artifactId: recipeArtifact.id,
    type: recipeArtifact.type,
    renderedPath,
    publicUrl: baseUrl
      ? `${baseUrl}/${renderedPath.slice('site/'.length)}`
      : undefined,
    mediaType: 'text/html',
    html,
  };
}

export function substituteTemplate(template, values) {
  if (typeof template !== 'string' || !isObject(values)) {
    throw new TypeError('Template substitution requires a string and values.');
  }

  const expected = new Set(
    [...template.matchAll(TOKEN_PATTERN)].map(([, key]) => key),
  );
  const unknown = Object.keys(values).filter((key) => !expected.has(key));
  if (unknown.length > 0) {
    throw new Error(`Unknown template token: ${unknown[0]}.`);
  }

  const missing = [...expected].filter(
    (key) => !Object.hasOwn(values, key) || typeof values[key] !== 'string',
  );
  if (missing.length > 0) {
    throw new Error(`Unresolved template token: ${missing[0]}.`);
  }

  const rendered = template.replace(TOKEN_PATTERN, (_, key) => values[key]);
  const unresolved = rendered.match(TOKEN_PATTERN)?.[1];
  if (unresolved) {
    throw new Error(`Unresolved template token: ${unresolved}.`);
  }
  return rendered;
}

function templateValues({
  recipeArtifact,
  content,
  sections,
  links,
  theme,
  renderedPath,
  baseUrl,
}) {
  const title = escapeHtml(content.title ?? humanize(recipeArtifact.id));
  const description = escapeHtml(content.description ?? '');
  const eyebrow = escapeHtml(content.eyebrow ?? recipeArtifact.type);
  const footer = [
    escapeHtml(content.footer ?? ''),
    renderRelatedLinks(links, content.slug, renderedPath, baseUrl),
  ]
    .filter(Boolean)
    .join(' ');
  const common = {
    THEME_CSS: themeDeclarations(theme.modes[theme.defaultMode], theme),
    TITLE: title,
    DESCRIPTION: description,
  };

  switch (recipeArtifact.template) {
    case 'house-style':
      return {
        ...common,
        EYEBROW: eyebrow,
        NAVIGATION: renderNavigation(
          sections,
          links,
          content.slug,
          renderedPath,
          baseUrl,
        ),
        CONTENT: renderSections(sections),
        FOOTER: footer,
      };
    case 'engineer-tour':
      return {
        ...common,
        EYEBROW: eyebrow,
        NAVIGATION: renderNavigation(
          sections,
          links,
          content.slug,
          renderedPath,
          baseUrl,
        ),
        CONTENT: renderSections(sections, { tour: true }),
        DIAGRAM: renderDiagram(sections),
        FOOTER: footer,
      };
    case 'deck-shell':
      return {
        ...common,
        SLIDES: renderSlides(
          sections,
          links,
          content.slug,
          renderedPath,
          baseUrl,
        ),
      };
    case 'diagram-shell':
      return {
        ...common,
        DIAGRAM: renderDiagram(sections),
        LEGEND: [
          sections
            .map(
              (section) =>
                `<span>${escapeHtml(section.title ?? humanize(section.id))}</span>`,
            )
            .join(''),
          renderRelatedLinks(links, content.slug, renderedPath, baseUrl),
        ].join(''),
      };
    default:
      throw new Error(`Unknown bundled template: ${recipeArtifact.template}.`);
  }
}

function renderNavigation(sections, links, slug, renderedPath, baseUrl) {
  const sectionLinks = sections
    .map(
      (section) =>
        `<a href="#${escapeAttribute(section.anchor)}" data-target="${escapeAttribute(section.anchor)}">${escapeHtml(section.title ?? humanize(section.id))}</a>`,
    )
    .join('');
  return `${sectionLinks}${renderRelatedLinks(links, slug, renderedPath, baseUrl)}`;
}

function renderSections(sections, { tour = false } = {}) {
  return sections
    .map((section, index) => {
      const tourAttributes = tour
        ? ` data-active-nodes="node-${index + 1}" data-active-edges=""`
        : '';
      return `<section id="${escapeAttribute(section.anchor)}"${tourAttributes}><div class="section-number">${index + 1}</div><h2>${escapeHtml(section.title ?? humanize(section.id))}</h2><p>${escapeHtml(section.content)}</p></section>`;
    })
    .join('');
}

function renderSlides(sections, links, slug, renderedPath, baseUrl) {
  const slides = sections
    .map(
      (section) =>
        `<section class="slide" id="${escapeAttribute(section.anchor)}"><div class="slide__content"><h2>${escapeHtml(section.title ?? humanize(section.id))}</h2><p>${escapeHtml(section.content)}</p></div></section>`,
    )
    .join('');
  const related = renderRelatedLinks(links, slug, renderedPath, baseUrl);
  return related
    ? `${slides}<section class="slide"><div class="slide__content"><h2>Related artifacts</h2>${related}</div></section>`
    : slides;
}

function renderDiagram(sections) {
  return sections
    .map((section, index) => {
      const y = 80 + index * 120;
      return `<g data-node="node-${index + 1}" class="node"><rect x="80" y="${y}" width="360" height="72" rx="8"></rect><text x="104" y="${y + 43}">${escapeHtml(section.title ?? humanize(section.id))}</text></g>`;
    })
    .join('');
}

function renderRelatedLinks(links, slug, renderedPath, baseUrl) {
  if (links.length === 0) return '';
  return links
    .map((link) => {
      const targetPath = artifactPath(link, slug);
      const href = baseUrl
        ? `${baseUrl}/${targetPath.slice('site/'.length)}`
        : posix.relative(posix.dirname(renderedPath), targetPath);
      return `<a href="${escapeAttribute(href)}">${escapeHtml(link.label)}</a>`;
    })
    .join(' ');
}

function artifactPath(artifact, slug) {
  const directory = TYPE_DIRECTORIES.get(artifact.type);
  if (!directory)
    throw new Error(`Unsupported artifact type: ${artifact.type}.`);
  const parts = ['site', directory, slug];
  if (['diagram', 'deck'].includes(artifact.type)) parts.push(artifact.id);
  parts.push('index.html');
  return parts.join('/');
}

function themeDeclarations(mode, theme) {
  return [
    ['canvas', mode.surface.canvas],
    ['panel', mode.surface.panel],
    ['panel-muted', mode.surface.elevated],
    ['border', mode.surface.elevated],
    ['ink', mode.ink.primary],
    ['muted', mode.ink.muted],
    ['accent', mode.accent.primary],
    ['success', mode.status.success],
    ['warning', mode.status.warning],
    ['danger', mode.status.danger],
    ['sans', theme.typography.sans.join(', ')],
    ['serif', theme.typography.serif.join(', ')],
    ['mono', theme.typography.mono.join(', ')],
    ['radius', `${theme.geometry.radius.md}px`],
  ]
    .map(([name, value]) => `--${name}: ${value};`)
    .join('\n        ');
}

function switchableThemeStyle(theme) {
  return `<style data-theme-mode="${oppositeMode(theme.defaultMode)}">
      :root[data-theme-mode="${oppositeMode(theme.defaultMode)}"] {
        ${themeDeclarations(theme.modes[oppositeMode(theme.defaultMode)], theme)}
      }
      [data-theme-toggle] {
        position: fixed;
        z-index: 10;
        inset: 1rem 1rem auto auto;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--panel);
        color: var(--ink);
        padding: 0.55rem 0.75rem;
        font: 0.875rem var(--sans);
        cursor: pointer;
      }
      [data-theme-toggle]:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }
    </style>`;
}

function switchableThemeControl(theme) {
  const defaultMode = theme.defaultMode;
  const alternateMode = oppositeMode(defaultMode);
  return `<button type="button" data-theme-toggle aria-pressed="${defaultMode === 'dark'}" aria-label="Switch color theme">Theme: ${humanize(defaultMode)}</button>
    <script>
      (() => {
        const root = document.documentElement;
        const toggle = document.querySelector('[data-theme-toggle]');
        const storageKey = 'explainer-theme-mode:' + location.pathname;
        const supported = new Set(['${defaultMode}', '${alternateMode}']);
        const apply = (mode, persist = true) => {
          root.dataset.themeMode = mode;
          toggle.setAttribute('aria-pressed', String(mode === 'dark'));
          toggle.textContent = 'Theme: ' + mode[0].toUpperCase() + mode.slice(1);
          if (persist) {
            try { localStorage.setItem(storageKey, mode); } catch {}
          }
        };
        let saved;
        try { saved = localStorage.getItem(storageKey); } catch {}
        if (supported.has(saved)) apply(saved, false);
        toggle.addEventListener('click', () =>
          apply(root.dataset.themeMode === '${defaultMode}' ? '${alternateMode}' : '${defaultMode}')
        );
      })();
    </script>`;
}

function assertRecipeArtifact(artifact) {
  if (
    !isObject(artifact) ||
    !hasExactKeys(artifact, ['id', 'type', 'template', 'required']) ||
    !SLUG_PATTERN.test(artifact.id ?? '') ||
    typeof artifact.required !== 'boolean'
  ) {
    throw new TypeError(
      'Recipe artifact is not a validated artifact descriptor.',
    );
  }
  const expectedTemplate = TEMPLATE_BY_TYPE.get(artifact.type);
  if (!expectedTemplate || artifact.template !== expectedTemplate) {
    throw new Error(
      `Unknown or incompatible bundled template: ${String(artifact.template)}.`,
    );
  }
}

function assertContent(content, recipeArtifact) {
  if (!isObject(content))
    throw new TypeError('Render content must be an object.');
  const unknown = Object.keys(content).filter((key) => !CONTENT_KEYS.has(key));
  if (unknown.length > 0) {
    throw new TypeError(`Unknown render content field: ${unknown[0]}.`);
  }
  if (
    content.artifactId !== recipeArtifact.id ||
    !SLUG_PATTERN.test(content.slug ?? '') ||
    !Array.isArray(content.sections) ||
    content.sections.length === 0
  ) {
    throw new TypeError('Render content does not match the recipe artifact.');
  }
  for (const field of ['title', 'description', 'eyebrow', 'footer']) {
    if (content[field] !== undefined && typeof content[field] !== 'string') {
      throw new TypeError(`Render content ${field} must be a string.`);
    }
  }
  for (const section of content.sections) {
    if (
      !isObject(section) ||
      !hasOnlyKeys(section, ['id', 'title', 'content']) ||
      !SLUG_PATTERN.test(section.id ?? '') ||
      typeof section.content !== 'string' ||
      (section.title !== undefined && typeof section.title !== 'string')
    ) {
      throw new TypeError('Render sections require safe ids and text content.');
    }
  }
  const links = content.artifactLinks ?? [];
  if (!Array.isArray(links)) {
    throw new TypeError('Artifact links must be an array.');
  }
  for (const link of links) {
    if (
      !isObject(link) ||
      !hasExactKeys(link, ['id', 'type', 'label']) ||
      !SLUG_PATTERN.test(link.id ?? '') ||
      !TYPE_DIRECTORIES.has(link.type) ||
      typeof link.label !== 'string'
    ) {
      throw new TypeError(
        'Artifact cross-links must use typed artifact targets.',
      );
    }
  }
}

function assertTheme(theme) {
  const validation = validateContract('theme', theme);
  const identity = isObject(theme) ? structuredClone(theme) : {};
  delete identity.bundleHash;
  if (!validation.valid || theme.bundleHash !== canonicalHash(identity)) {
    throw new Error('Renderer requires a validated resolved theme.');
  }
}

function assertRenderStrategy(renderStrategy) {
  if (!RENDER_STRATEGIES.has(renderStrategy)) {
    throw new Error(`Unsupported render strategy: ${String(renderStrategy)}.`);
  }
}

function normalizePublicBaseUrl(value) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new TypeError('Public base URL must be an HTTPS URL.');
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError('Public base URL must be an HTTPS URL.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new TypeError(
      'Public base URL must be an HTTPS URL without credentials.',
    );
  }
  return url.href.replace(/\/+$/, '');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function humanize(value) {
  return value
    .split('-')
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function oppositeMode(mode) {
  return mode === 'light' ? 'dark' : 'light';
}

function hasExactKeys(value, keys) {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function hasOnlyKeys(value, keys) {
  return Object.keys(value).every((key) => keys.includes(key));
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
