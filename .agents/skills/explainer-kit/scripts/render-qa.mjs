#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';

import { auditArtifactSet } from './lib/qa.mjs';
import { renderArtifact } from './lib/render.mjs';
import { resolveTheme } from './lib/theme.mjs';

export const RELEASE_PALETTES = Object.freeze([
  'neutral',
  'ocean',
  'ember',
  'forest',
  'violet',
]);
export const RELEASE_MODES = Object.freeze(['light', 'dark']);
export const RELEASE_PROFILES = Object.freeze([
  'clean',
  'editorial',
  'technical',
]);
export const RELEASE_VIEWPORTS = Object.freeze([320, 768, 1440]);
export const RELEASE_ARTIFACTS = Object.freeze([
  Object.freeze({
    id: 'release-hub',
    type: 'hub',
    template: 'house-style',
    required: true,
  }),
  Object.freeze({
    id: 'release-diagram',
    type: 'diagram',
    template: 'diagram-shell',
    required: true,
  }),
  Object.freeze({
    id: 'release-explainer',
    type: 'explainer',
    template: 'engineer-tour',
    required: true,
  }),
  Object.freeze({
    id: 'release-deck',
    type: 'deck',
    template: 'deck-shell',
    required: true,
  }),
]);

export function selectReleaseVisualMatrix() {
  const paletteModeCases = RELEASE_PALETTES.flatMap((palette, paletteIndex) =>
    RELEASE_MODES.map((mode, modeIndex) => ({
      id: `palette-${palette}-${mode}`,
      axis: 'palette-mode',
      palette,
      mode,
      visualProfile: 'clean',
      renderStrategy:
        (paletteIndex + modeIndex) % 2 === 0
          ? 'default-only'
          : 'user-switchable',
      artifact: {
        ...RELEASE_ARTIFACTS[0],
        id: `palette-${palette}-${mode}`,
      },
      viewports: [RELEASE_VIEWPORTS[0], RELEASE_VIEWPORTS[2]],
      scenarios: ['default'],
    })),
  );
  const profileArtifactCases = RELEASE_PROFILES.flatMap(
    (visualProfile, profileIndex) =>
      RELEASE_ARTIFACTS.map((artifact, artifactIndex) => {
        const mode =
          RELEASE_MODES[(profileIndex + artifactIndex) % RELEASE_MODES.length];
        return {
          id: `profile-${visualProfile}-${artifact.type}`,
          axis: 'profile-artifact',
          palette:
            RELEASE_PALETTES[
              (profileIndex + artifactIndex) % RELEASE_PALETTES.length
            ],
          mode,
          visualProfile,
          renderStrategy:
            (profileIndex + artifactIndex) % 2 === 0
              ? 'default-only'
              : 'user-switchable',
          artifact: {
            ...artifact,
            id: `profile-${visualProfile}-${artifact.type}`,
          },
          viewports:
            artifact.type === 'deck'
              ? [...RELEASE_VIEWPORTS]
              : [RELEASE_VIEWPORTS[0], RELEASE_VIEWPORTS[2]],
          scenarios:
            artifact.type === 'deck'
              ? ['horizontal', 'no-js', 'print']
              : ['default'],
        };
      }),
  );

  return [...paletteModeCases, ...profileArtifactCases];
}

export async function runReleaseVisualMatrix({
  matrix = selectReleaseVisualMatrix(),
  browserProbe,
} = {}) {
  if (!Array.isArray(matrix) || matrix.length === 0) {
    throw new TypeError('Release visual QA requires a non-empty matrix.');
  }
  if (typeof browserProbe !== 'function') {
    throw new TypeError('Release visual QA requires a browser probe callback.');
  }

  const issues = [];
  const cases = [];
  for (const entry of matrix) {
    const { theme } = await resolveTheme({
      palette: entry.palette,
      visualProfile: entry.visualProfile,
      defaultMode: entry.mode,
      renderStrategy: entry.renderStrategy,
    });
    const rendered = await renderArtifact({
      recipeArtifact: entry.artifact,
      content: releaseContent(entry.artifact.id),
      theme,
      renderStrategy: entry.renderStrategy,
    });
    const report = await auditArtifactSet({
      artifacts: [
        {
          id: entry.id,
          type: entry.artifact.type,
          html: rendered.html,
        },
      ],
      widths: entry.viewports,
      browserProbe: async (request) => {
        const result = await browserProbe(request);
        if (
          entry.artifact.type === 'deck' &&
          request.scenario === 'default' &&
          result?.deckLayout?.flow !== 'horizontal'
        ) {
          issues.push({
            artifactId: entry.id,
            width: request.viewport.width,
            scenario: 'default',
            code: 'deck-horizontal-layout',
            message: 'Interactive deck must page horizontally by default.',
          });
        }
        return result;
      },
    });
    issues.push(...report.issues);
    cases.push({
      id: entry.id,
      artifactType: entry.artifact.type,
      palette: entry.palette,
      mode: entry.mode,
      visualProfile: entry.visualProfile,
      renderStrategy: entry.renderStrategy,
      probes: report.browser?.probes ?? 0,
    });
  }

  return { valid: issues.length === 0, issues, cases };
}

export async function runRenderQaCli(
  argv = process.argv.slice(2),
  io = console,
  options = {},
) {
  try {
    const parsed = parseArguments(argv);
    const denylist = [...parsed.denylist, ...(options.denylist ?? [])];
    if (parsed.paths.length === 0) {
      throw new Error(
        'Usage: render-qa.mjs [--deny <string>] [--type <type>] <html-path> [...]',
      );
    }

    const artifacts = await Promise.all(
      parsed.paths.map(async ({ path, type }, index) => ({
        id: `${basename(path)}-${index + 1}`,
        type,
        html: await readFile(path, 'utf8'),
      })),
    );
    const report = await auditArtifactSet({
      artifacts,
      denylist,
      ...(options.browserProbe && { browserProbe: options.browserProbe }),
      ...(options.widths && { widths: options.widths }),
    });
    io.log(JSON.stringify(report, null, 2));
    return report.valid ? 0 : 1;
  } catch (error) {
    io.log(
      JSON.stringify(
        {
          valid: false,
          issues: [
            {
              code: 'input',
              message: error instanceof Error ? error.message : String(error),
            },
          ],
        },
        null,
        2,
      ),
    );
    return 1;
  }
}

function parseArguments(argv) {
  const paths = [];
  const denylist = [];
  let nextType;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--deny') {
      const denied = argv[index + 1];
      if (!denied) throw new Error('--deny requires a string.');
      denylist.push(denied);
      index += 1;
    } else if (value === '--type') {
      nextType = argv[index + 1];
      if (!['hub', 'diagram', 'explainer', 'deck'].includes(nextType)) {
        throw new Error('--type requires hub, diagram, explainer, or deck.');
      }
      index += 1;
    } else if (value.startsWith('--')) {
      throw new Error(`Unknown option: ${value}.`);
    } else {
      paths.push({ path: value, ...(nextType && { type: nextType }) });
      nextType = undefined;
    }
  }
  if (nextType) throw new Error('--type must precede an HTML path.');
  return { paths, denylist };
}

function releaseContent(artifactId) {
  return {
    artifactId,
    slug: 'release-qa',
    title: 'Release QA',
    description: 'Representative release artifact.',
    sections: [
      { id: 'overview', title: 'Overview', content: 'Release candidate.' },
      { id: 'evidence', title: 'Evidence', content: 'Checks are complete.' },
    ],
  };
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  process.exitCode = await runRenderQaCli();
}
