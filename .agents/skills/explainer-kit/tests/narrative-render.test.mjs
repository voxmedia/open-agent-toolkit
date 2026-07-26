import assert from 'node:assert/strict';
import { test } from 'node:test';

import { renderArtifact } from '../scripts/lib/render.mjs';
import { resolveTheme } from '../scripts/lib/theme.mjs';

const TEMPLATE_BY_TYPE = {
  hub: 'house-style',
  diagram: 'diagram-shell',
  explainer: 'engineer-tour',
  deck: 'deck-shell',
};

function descriptor(id, type, origin = 'floor') {
  return {
    id,
    type,
    template: TEMPLATE_BY_TYPE[type],
    required: true,
    origin,
  };
}

function content(artifactId, overrides = {}) {
  return {
    artifactId,
    slug: 'narrative-demo',
    title: 'Narrative demo',
    description: 'A deterministic renderer fixture.',
    eyebrow: 'Engineering',
    footer: 'Built locally.',
    sections: [
      {
        id: 'overview',
        title: 'Overview',
        content: 'Safe narrative.',
      },
    ],
    ...overrides,
  };
}

test('renders the themed narrative block library deterministically', async () => {
  const { theme } = await resolveTheme({ style: 'clean-neutral' });
  const recipeArtifact = descriptor('initiative', 'hub');
  const narrative = `# Internal heading

Paragraph with **strong**, *emphasis*, \`inline code\`, ~~removed~~ text, and an [HTTPS link](https://example.com).

| Signal | Meaning |
| --- | --- |
| green | ready |

- [x] parsed
- [ ] reviewed

> Quoted context.

> [!IMPORTANT]
> Preserve the invariant.

\`\`\`timeline
2025-01 — Prototype
2025-06 — Launch
\`\`\`

\`\`\`js
const ready = true;
\`\`\`

\`\`\`diagram
graph LR
source[Source] -->|validated| output("Rendered output")
\`\`\`

![Architecture reference](https://example.com/architecture.svg "System map")`;

  const input = {
    recipeArtifact,
    content: content(recipeArtifact.id, {
      sections: [
        { id: 'overview', title: 'Overview', content: narrative },
        { id: 'details', title: 'Details', content: 'Second section.' },
      ],
    }),
    theme,
    renderStrategy: 'default-only',
  };
  const first = await renderArtifact(input);
  const second = await renderArtifact(input);

  assert.equal(first.html, second.html);
  assert.deepEqual(first.warnings, []);
  assert.match(first.html, /<section id="overview">/);
  assert.match(first.html, /<div class="section-number">1<\/div>/);
  assert.match(first.html, /<h1>Internal heading<\/h1>/);
  assert.match(first.html, /<strong>strong<\/strong>/);
  assert.match(first.html, /<em>emphasis<\/em>/);
  assert.match(first.html, /<del>removed<\/del>/);
  assert.match(first.html, /<div class="table-scroll"><table>/);
  assert.match(first.html, /<ul class="task-list">/);
  assert.match(first.html, /type="checkbox" disabled checked/);
  assert.match(first.html, /<blockquote>/);
  assert.match(first.html, /class="callout callout--important"/);
  assert.match(first.html, /<ol class="timeline">/);
  assert.match(first.html, /<pre><code class="language-js">/);
  // The scroll wrapper and intrinsic size keep wide diagrams at legible type
  // instead of downscaling them to fit the column.
  assert.match(
    first.html,
    /<div class="diagram-scroll"><svg class="narrative-diagram"/,
  );
  assert.match(first.html, /<svg class="narrative-diagram"[^>]*width="\d+"/);
  assert.match(first.html, /data-direction="LR"/);
  assert.match(first.html, /validated/);
  assert.match(first.html, /<figure>/);
  assert.match(first.html, /href="#overview"/);
  assert.doesNotMatch(first.html, /<img\b|src="https:/);
});

test('uses theme modes without changing narrative structure', async () => {
  const recipeArtifact = descriptor('initiative', 'hub');
  const light = await resolveTheme({
    style: 'clean-neutral',
    defaultMode: 'light',
  });
  const dark = await resolveTheme({
    style: 'dark-edgy',
    defaultMode: 'dark',
  });
  const input = {
    recipeArtifact,
    content: content(recipeArtifact.id),
    renderStrategy: 'default-only',
  };
  const lightRender = await renderArtifact({ ...input, theme: light.theme });
  const darkRender = await renderArtifact({ ...input, theme: dark.theme });

  assert.match(lightRender.html, /data-theme-mode="light"/);
  assert.match(darkRender.html, /data-theme-mode="dark"/);
  assert.match(lightRender.html, /<p>Safe narrative\.<\/p>/);
  assert.match(darkRender.html, /<p>Safe narrative\.<\/p>/);
  assert.notEqual(lightRender.html, darkRender.html);
});

test('degrades unsupported diagram syntax visibly without failing the narrative', async () => {
  const { theme } = await resolveTheme();
  const recipeArtifact = descriptor('initiative', 'hub');
  const source = `graph TD
subgraph unsafe
a --> b
end`;
  const rendered = await renderArtifact({
    recipeArtifact,
    content: content(recipeArtifact.id, {
      sections: [
        {
          id: 'overview',
          title: 'Overview',
          content: `\`\`\`diagram
${source}
\`\`\``,
        },
      ],
    }),
    theme,
    renderStrategy: 'default-only',
  });

  assert.equal(rendered.warnings[0].code, 'unsupported-diagram');
  assert.match(rendered.html, /class="diagram-warning"/);
  assert.match(rendered.html, /Unsupported diagram construct/);
  assert.match(rendered.html, /<pre><code>graph TD/);
  assert.doesNotMatch(rendered.html, /<svg class="narrative-diagram"/);
});

test('preserves every floor path and gives every expansion an ID-bearing path', async () => {
  const { theme } = await resolveTheme();
  const floorCases = [
    ['initiative', 'hub', 'site/initiatives/narrative-demo/index.html'],
    [
      'architecture',
      'diagram',
      'site/diagrams/narrative-demo/architecture/index.html',
    ],
    ['tour', 'explainer', 'site/explainers/narrative-demo/index.html'],
    ['briefing', 'deck', 'site/decks/narrative-demo/briefing/index.html'],
  ];

  for (const [id, type, expected] of floorCases) {
    const rendered = await renderArtifact({
      recipeArtifact: descriptor(id, type),
      content: content(id),
      theme,
      renderStrategy: 'default-only',
    });
    assert.equal(rendered.renderedPath, expected, type);
  }

  for (const id of ['deep-dive', 'operations']) {
    const rendered = await renderArtifact({
      recipeArtifact: descriptor(id, 'explainer', 'expansion'),
      content: content(id),
      theme,
      renderStrategy: 'default-only',
      publicBaseUrl: 'https://docs.example.com/kit',
    });
    assert.equal(
      rendered.renderedPath,
      `site/explainers/narrative-demo/${id}/index.html`,
    );
    assert.equal(
      rendered.publicUrl,
      `https://docs.example.com/kit/explainers/narrative-demo/${id}/index.html`,
    );
  }
});

test('resolves expansion hub links through the same origin-aware rule', async () => {
  const { theme } = await resolveTheme();
  const recipeArtifact = descriptor('initiative', 'hub');
  const artifactLinks = [
    {
      id: 'deep-dive',
      type: 'explainer',
      label: 'Deep dive',
      origin: 'expansion',
    },
    {
      id: 'operations',
      type: 'explainer',
      label: 'Operations',
      origin: 'expansion',
    },
  ];
  const relative = await renderArtifact({
    recipeArtifact,
    content: content(recipeArtifact.id, { artifactLinks }),
    theme,
    renderStrategy: 'default-only',
  });
  const published = await renderArtifact({
    recipeArtifact,
    content: content(recipeArtifact.id, { artifactLinks }),
    theme,
    renderStrategy: 'default-only',
    publicBaseUrl: 'https://docs.example.com/kit/',
  });

  assert.match(
    relative.html,
    /href="\.\.\/\.\.\/explainers\/narrative-demo\/deep-dive\/index\.html"/,
  );
  assert.match(
    relative.html,
    /href="\.\.\/\.\.\/explainers\/narrative-demo\/operations\/index\.html"/,
  );
  assert.match(
    published.html,
    /href="https:\/\/docs\.example\.com\/kit\/explainers\/narrative-demo\/deep-dive\/index\.html"/,
  );
});

test('defaults transitional descriptors and links to floor origin', async () => {
  const { theme } = await resolveTheme();
  const recipeArtifact = {
    id: 'initiative',
    type: 'hub',
    template: 'house-style',
    required: true,
  };
  const rendered = await renderArtifact({
    recipeArtifact,
    content: content(recipeArtifact.id, {
      artifactLinks: [
        { id: 'tour', type: 'explainer', label: 'Legacy floor tour' },
      ],
    }),
    theme,
    renderStrategy: 'default-only',
  });

  assert.equal(
    rendered.renderedPath,
    'site/initiatives/narrative-demo/index.html',
  );
  assert.match(
    rendered.html,
    /href="\.\.\/\.\.\/explainers\/narrative-demo\/index\.html"/,
  );
});

test('rejects invalid or wider origin-aware descriptors', async () => {
  const { theme } = await resolveTheme();
  const recipeArtifact = descriptor('initiative', 'hub');
  const input = {
    recipeArtifact,
    content: content(recipeArtifact.id),
    theme,
    renderStrategy: 'default-only',
  };

  await assert.rejects(
    renderArtifact({
      ...input,
      recipeArtifact: { ...recipeArtifact, origin: 'inferred' },
    }),
    /descriptor/i,
  );
  await assert.rejects(
    renderArtifact({
      ...input,
      recipeArtifact: { ...recipeArtifact, extra: true },
    }),
    /descriptor/i,
  );
  await assert.rejects(
    renderArtifact({
      ...input,
      content: content(recipeArtifact.id, {
        artifactLinks: [
          {
            id: 'tour',
            type: 'explainer',
            label: 'Tour',
            origin: 'inferred',
          },
        ],
      }),
    }),
    /cross-links/i,
  );
});
