#!/usr/bin/env node
// p08 parser-identity before/after controls (rgi-p08-impl-20261107-01, p08-t01).
//
// Usage: node p08-parser-identity-controls.mjs <cli-dist-dir> [<repo-root>]
//
// Parses one control artifact per deferred parser-identity item with the
// `parseReviewGateVerdict` of the given CLI build and prints one JSON line per
// control: the categorical outcome (accepted with ids/titles/locations, or the
// refusal code and message head). Run it once against a build of the phase
// base (2c7ab359b) and once against the branch build; the journal records both.
//
// Inputs: the real m02 exit-gate run-1 fixture and the real wave-5 returned
// message fixture (captured reviewer output, provenance in their headers),
// plus minimal synthetic section bodies for the order-, duplicate- and
// prefix-dependent ID cases, which are parser-rule controls, not provider
// output.

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const distDir = resolve(process.argv[2] ?? 'packages/cli/dist');
const repoRoot = resolve(process.argv[3] ?? '.');
const fixtures = join(repoRoot, 'packages/cli/src/commands/gate/__fixtures__');
const { parseReviewGateVerdict } = await import(
  pathToFileURL(join(distDir, 'commands/gate/review-verdict.js')).href
);

const sections = ({
  critical = 'None',
  high = 'None',
  medium = 'None',
  low = 'None',
}) =>
  [
    '## Findings',
    '',
    '### Critical',
    '',
    critical,
    '',
    '### High',
    '',
    high,
    '',
    '### Medium',
    '',
    medium,
    '',
    '### Low',
    '',
    low,
    '',
  ].join('\n');

function stripHeader(text) {
  // Fixture headers are HTML comments or YAML comments; the parser input is
  // the artifact text the fixture preserves.
  return text.replace(/^<!--[\s\S]*?-->\n\n?/, '');
}

const waveFive = await readFile(
  join(fixtures, 'backlog-wave-5-exit-gate-r1-return.md'),
  'utf8',
);
const waveFiveLows = waveFive
  .split('\n')
  .filter((line) => /^- \*\*L[12]:\*\*/.test(line))
  .join('\n');

let m02Run1 = null;
try {
  m02Run1 = stripHeader(
    await readFile(
      join(
        fixtures,
        'convergence/m02-exit-r1-range-review-2026-11-03T215601Z.md',
      ),
      'utf8',
    ),
  );
} catch {
  m02Run1 = null;
}

const controls = [
  {
    name: 'L2-colon-id-list-items (wave-5 captured Lows in a Low section)',
    body: sections({ low: waveFiveLows }),
  },
  {
    name: 'r2-L2-order: plain list finding before **M1 — …**',
    body: sections({
      medium:
        '- A plain list finding.\n**M1 — Explicit after a plain finding**',
    }),
  },
  {
    name: 'C1-duplicate-explicit-id: two **H1 — …** titles',
    body: sections({ high: '**H1 — First use**\n**H1 — Duplicate use**' }),
  },
  {
    name: 'C1-prefix-mismatch: **H1 — …** under Medium',
    body: sections({ medium: '**H1 — A High-prefixed title in Medium**' }),
  },
  {
    name: 'r2-L1-wrapped-detail: indented continuation under a detail',
    body: sections({
      medium:
        '**M1 — Wrapped detail**\n\n- Issue: first line\n  wrapped continuation\n- Fix: second detail',
    }),
  },
];
if (m02Run1) {
  controls.push({
    name: 'L2-colon-id-in-bold-title: real m02 exit-gate run 1',
    body: m02Run1,
  });
}

const dir = await mkdtemp(join(tmpdir(), 'rgi-p08-controls-'));
try {
  for (const [index, control] of controls.entries()) {
    const path = join(dir, `control-${index}.md`);
    await writeFile(path, control.body, 'utf8');
    try {
      const verdict = await parseReviewGateVerdict(path);
      console.log(
        JSON.stringify({
          control: control.name,
          outcome: 'accepted',
          counts: verdict.counts,
          findingsComplete: verdict.findingsComplete,
          findings: verdict.findings.map((f) => [f.id, f.title, f.location]),
        }),
      );
    } catch (error) {
      console.log(
        JSON.stringify({
          control: control.name,
          outcome: 'refused',
          code: error?.code ?? null,
          errorFields: {
            kind: error?.kind ?? null,
            status: error?.status ?? null,
            receiveEligible: error?.receiveEligible ?? null,
          },
          message: String(error?.message ?? error)
            .replace(dir, '<tmp>')
            .slice(0, 240),
        }),
      );
    }
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}
