import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseDiagram, renderDiagram } from '../scripts/lib/diagram.mjs';
import { resolveTheme } from '../scripts/lib/theme.mjs';

const COMPLETE_DIAGRAM = `%% supported grammar fixture
graph LR
start[Start]
review("Review, with context")
decision{"Ship <now>?"}
done
start --> review
review --- decision
decision -->|approved & signed| done`;

test('parses every supported D7 diagram construct', () => {
  const parsed = parseDiagram(COMPLETE_DIAGRAM);

  assert.equal(parsed.valid, true);
  assert.equal(parsed.direction, 'LR');
  assert.deepEqual(
    parsed.nodes.map(({ id, label, shape }) => [id, label, shape]),
    [
      ['start', 'Start', 'rectangle'],
      ['review', 'Review, with context', 'rounded'],
      ['decision', 'Ship <now>?', 'diamond'],
      ['done', 'done', 'rectangle'],
    ],
  );
  assert.deepEqual(
    parsed.edges.map(({ from, to, kind, label }) => [from, to, kind, label]),
    [
      ['start', 'review', 'arrow', ''],
      ['review', 'decision', 'line', ''],
      ['decision', 'done', 'arrow', 'approved & signed'],
    ],
  );
  assert.deepEqual(parsed.warnings, []);
});

test('renders deterministic, escaped inline SVG for both graph directions', async () => {
  const { theme } = await resolveTheme({ style: 'clean-neutral' });
  const first = renderDiagram(COMPLETE_DIAGRAM, { theme });
  const second = renderDiagram(COMPLETE_DIAGRAM, { theme });
  const vertical = renderDiagram(`graph TD
a --> b`);

  assert.deepEqual(first, second);
  assert.equal(first.degraded, false);
  assert.deepEqual(first.warnings, []);
  assert.match(first.html, /^<svg\b/);
  assert.match(first.html, /data-direction="LR"/);
  assert.match(first.html, /class="diagram-node-shape"/);
  assert.match(first.html, /rx="24"/);
  assert.match(first.html, /<polygon\b/);
  assert.match(first.html, /marker-end="url\(#diagram-arrow-[a-f0-9]{8}\)"/);
  assert.match(first.html, /approved &amp; signed/);
  assert.match(first.html, /Ship &lt;now&gt;\?/);
  assert.doesNotMatch(first.html, /<script|Ship <now>/);
  assert.match(vertical.html, /data-direction="TD"/);
});

test('uses resolved light and dark theme values as SVG fallbacks', async () => {
  const light = await resolveTheme({
    style: 'clean-neutral',
    defaultMode: 'light',
  });
  const dark = await resolveTheme({
    style: 'dark-edgy',
    defaultMode: 'dark',
  });
  const source = `graph TD
input --> output`;
  const lightSvg = renderDiagram(source, { theme: light.theme });
  const darkSvg = renderDiagram(source, { theme: dark.theme });

  assert.match(
    lightSvg.html,
    new RegExp(light.theme.modes.light.surface.panel),
  );
  assert.match(darkSvg.html, new RegExp(dark.theme.modes.dark.surface.panel));
  assert.notEqual(lightSvg.html, darkSvg.html);
});

for (const [name, source, feature] of [
  [
    'branch',
    `graph TD
source --> accepted
source --> rejected`,
    'branch',
  ],
  [
    'fan-in',
    `graph TD
primary --> merged
secondary --> merged`,
    'fan-in',
  ],
  [
    'cycle',
    `graph LR
queued --> running
running --> queued`,
    'cycle',
  ],
]) {
  test(`detects ${name} topology before inline rendering and preserves its graph for artistic rerouting`, () => {
    const parsed = parseDiagram(source);
    const rendered = renderDiagram(source);

    assert.equal(parsed.valid, true);
    assert.equal(parsed.inlineSupported, false);
    assert.equal(parsed.topology.kind, 'non-linear');
    assert.ok(parsed.topology.features.includes(feature));
    assert.equal(rendered.degraded, true);
    assert.equal(rendered.warnings[0].code, 'non-linear-diagram-reroute');
    assert.doesNotMatch(rendered.html, /<svg\b/);
    assert.equal(rendered.reroute.target, 'artistic');
    assert.equal(rendered.reroute.source, source);
    assert.deepEqual(rendered.reroute.graph.nodes, parsed.nodes);
    assert.deepEqual(rendered.reroute.graph.edges, parsed.edges);
  });
}

test('lays out a supported linear flow in graph order instead of declaration order', () => {
  const source = `graph LR
finish[Finish]
start[Start]
middle[Middle]
start --> middle
middle --> finish`;
  const parsed = parseDiagram(source);
  const rendered = renderDiagram(source);

  assert.equal(parsed.inlineSupported, true);
  assert.equal(parsed.topology.kind, 'linear');
  assert.deepEqual(parsed.topology.order, ['start', 'middle', 'finish']);
  assert.equal(rendered.degraded, false);
  assert.ok(
    rendered.html.indexOf('data-node="start"') <
      rendered.html.indexOf('data-node="middle"'),
  );
  assert.ok(
    rendered.html.indexOf('data-node="middle"') <
      rendered.html.indexOf('data-node="finish"'),
  );
  assert.match(rendered.html, /data-from="start" data-to="middle"/);
  assert.match(rendered.html, /data-from="middle" data-to="finish"/);
});

for (const [name, source] of [
  [
    'subgraphs',
    `graph TD
subgraph cluster
a --> b
end`,
  ],
  [
    'class definitions',
    `graph TD
a --> b
classDef hot fill:red`,
  ],
  [
    'non-graph diagram types',
    `sequenceDiagram
participant A
A->>B: hello`,
  ],
]) {
  test(`degrades unsupported ${name} to a warning and escaped source`, () => {
    const rendered = renderDiagram(source);

    assert.equal(rendered.degraded, true);
    assert.equal(rendered.warnings[0].code, 'unsupported-diagram');
    assert.match(rendered.html, /class="diagram-warning"/);
    assert.match(rendered.html, /<pre><code>/);
    assert.doesNotMatch(rendered.html, /<svg\b/);
    assert.ok(rendered.html.includes(source.replaceAll('>', '&gt;')));
  });
}
