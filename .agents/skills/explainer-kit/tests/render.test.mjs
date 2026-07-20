import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadRecipe } from '../scripts/lib/recipes.mjs';
import { renderArtifact, substituteTemplate } from '../scripts/lib/render.mjs';
import { resolveTheme } from '../scripts/lib/theme.mjs';

function content(artifactId, overrides = {}) {
  return {
    artifactId,
    slug: 'typed-demo',
    title: 'Typed <Explainer>',
    description: 'Safe "description" & context.',
    eyebrow: 'Engineering',
    footer: 'Built locally.',
    sections: [
      {
        id: 'overview',
        title: 'Overview <now>',
        content: 'Never trust <script>alert("x")</script> & raw markup.',
      },
      {
        id: 'details',
        title: 'Details',
        content: 'Second section.',
      },
    ],
    artifactLinks: [
      {
        id: 'architecture',
        type: 'diagram',
        label: 'Architecture & flow',
      },
      { id: 'briefing', type: 'deck', label: 'Briefing' },
    ],
    ...overrides,
  };
}

test('renders escaped content through every documented house template token', async () => {
  const recipeArtifact = loadRecipe('project-explainer', '1').artifacts[0];
  const { theme } = await resolveTheme();
  const rendered = await renderArtifact({
    recipeArtifact,
    content: content(recipeArtifact.id),
    theme,
    renderStrategy: 'default-only',
  });

  assert.equal(rendered.renderedPath, 'site/initiatives/typed-demo/index.html');
  assert.equal(rendered.publicUrl, undefined);
  assert.match(rendered.html, /<title>Typed &lt;Explainer&gt;<\/title>/);
  assert.match(rendered.html, /Safe &quot;description&quot; &amp; context\./);
  assert.match(rendered.html, /Overview &lt;now&gt;/);
  assert.match(
    rendered.html,
    /Never trust &lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; &amp; raw markup\./,
  );
  assert.doesNotMatch(rendered.html, /{{[A-Z_]+}}/);
});

test('keeps runtime assets local and theme assets inline', async () => {
  const recipeArtifact = loadRecipe('project-explainer', '1').artifacts[0];
  const { theme } = await resolveTheme();
  const { html } = await renderArtifact({
    recipeArtifact,
    content: content(recipeArtifact.id),
    theme,
    renderStrategy: 'default-only',
  });

  assert.match(html, /<style>[\s\S]*--canvas:\s*#[0-9a-f]{6}/i);
  assert.match(html, /<script>[\s\S]*IntersectionObserver/);
  assert.doesNotMatch(html, /<(?:link|img|iframe)\b/i);
  assert.doesNotMatch(html, /<(?:script|source)\b[^>]+\bsrc\s*=/i);
  assert.doesNotMatch(html, /@import\b|url\(\s*['"]?https?:/i);
});

test('renders only the default mode unless user-switchable mode is requested', async () => {
  const recipeArtifact = loadRecipe('project-explainer', '1').artifacts[0];
  const { theme } = await resolveTheme({ defaultMode: 'dark' });
  const defaultOnly = await renderArtifact({
    recipeArtifact,
    content: content(recipeArtifact.id),
    theme,
    renderStrategy: 'default-only',
  });
  const switchable = await renderArtifact({
    recipeArtifact,
    content: content(recipeArtifact.id),
    theme,
    renderStrategy: 'user-switchable',
  });

  assert.match(defaultOnly.html, /data-render-strategy="default-only"/);
  assert.match(defaultOnly.html, /data-theme-mode="dark"/);
  assert.doesNotMatch(defaultOnly.html, /data-theme-mode="light"/);
  assert.doesNotMatch(defaultOnly.html, /data-theme-toggle/);
  assert.match(switchable.html, /data-render-strategy="user-switchable"/);
  assert.match(switchable.html, /data-theme-mode="dark"/);
  assert.match(switchable.html, /data-theme-mode="light"/);
  assert.match(
    switchable.html,
    /<button[^>]+data-theme-toggle[^>]+aria-pressed="true"/,
  );
  assert.match(switchable.html, /addEventListener\(['"]click['"]/);
  assert.match(switchable.html, /setAttribute\(['"]aria-pressed['"]/);
  assert.match(switchable.html, /localStorage/);
});

test('uses typed site paths and explicit index URLs for artifact cross-links', async () => {
  const { theme } = await resolveTheme();
  const cases = [
    ['hub', 'house-style', 'site/initiatives/typed-demo/index.html'],
    [
      'diagram',
      'diagram-shell',
      'site/diagrams/typed-demo/architecture/index.html',
    ],
    ['explainer', 'engineer-tour', 'site/explainers/typed-demo/index.html'],
    ['deck', 'deck-shell', 'site/decks/typed-demo/briefing/index.html'],
  ];

  for (const [type, template, expectedPath] of cases) {
    const id =
      type === 'diagram'
        ? 'architecture'
        : type === 'deck'
          ? 'briefing'
          : 'artifact';
    const rendered = await renderArtifact({
      recipeArtifact: { id, type, template, required: true },
      content: content(id),
      theme,
      renderStrategy: 'default-only',
      publicBaseUrl: 'https://docs.example.com/explainers/',
    });
    assert.equal(rendered.renderedPath, expectedPath, type);
    assert.equal(
      rendered.publicUrl,
      `https://docs.example.com/explainers/${expectedPath.slice('site/'.length)}`,
      type,
    );
    assert.match(
      rendered.html,
      /href="https:\/\/docs\.example\.com\/explainers\/diagrams\/typed-demo\/architecture\/index\.html"/,
      type,
    );
    assert.match(
      rendered.html,
      /href="https:\/\/docs\.example\.com\/explainers\/decks\/typed-demo\/briefing\/index\.html"/,
      type,
    );
  }
});

test('build-only cross-links are relative explicit index URLs', async () => {
  const recipeArtifact = loadRecipe('project-explainer', '1').artifacts[0];
  const { theme } = await resolveTheme();
  const { html } = await renderArtifact({
    recipeArtifact,
    content: content(recipeArtifact.id),
    theme,
    renderStrategy: 'default-only',
  });

  assert.match(
    html,
    /href="\.\.\/\.\.\/diagrams\/typed-demo\/architecture\/index\.html"/,
  );
});

test('deck substitution preserves horizontal paging, no-JS, and print behavior', async () => {
  const { theme } = await resolveTheme();
  const { html } = await renderArtifact({
    recipeArtifact: {
      id: 'briefing',
      type: 'deck',
      template: 'deck-shell',
      required: true,
    },
    content: content('briefing'),
    theme,
    renderStrategy: 'default-only',
  });

  assert.match(html, /scroll-snap-type:\s*x mandatory/);
  assert.match(html, /html:not\(\.js\) \.deck/);
  assert.match(html, /<noscript>/);
  assert.match(html, /@media print/);
  assert.match(html, /break-after:\s*page/);
  assert.match(html, /<section class="slide"/);
  assert.match(html, /id="deck-progress"/);
  assert.match(html, /role="progressbar"/);
  assert.match(html, /history\.replaceState/);
  assert.match(html, /location\.hash/);
});

test('rejects unknown templates, invalid themes and render strategies', async () => {
  const recipeArtifact = loadRecipe('project-explainer', '1').artifacts[0];
  const { theme } = await resolveTheme();

  await assert.rejects(
    renderArtifact({
      recipeArtifact: { ...recipeArtifact, template: 'remote-shell' },
      content: content(recipeArtifact.id),
      theme,
      renderStrategy: 'default-only',
    }),
    /template/i,
  );
  await assert.rejects(
    renderArtifact({
      recipeArtifact,
      content: content(recipeArtifact.id),
      theme: { ...theme, name: 'forged' },
      renderStrategy: 'default-only',
    }),
    /theme/i,
  );
  await assert.rejects(
    renderArtifact({
      recipeArtifact,
      content: content(recipeArtifact.id),
      theme,
      renderStrategy: 'automatic',
    }),
    /render strategy/i,
  );
});

test('rejects unknown and unresolved template tokens', () => {
  assert.throws(
    () =>
      substituteTemplate('<p>{{TITLE}}</p>', {
        TITLE: 'Known',
        SURPRISE: 'Unknown',
      }),
    /unknown template token/i,
  );
  assert.throws(
    () =>
      substituteTemplate('<p>{{TITLE}} {{DESCRIPTION}}</p>', { TITLE: 'x' }),
    /unresolved template token/i,
  );
});
