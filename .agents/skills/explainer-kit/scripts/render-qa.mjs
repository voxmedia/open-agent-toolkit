#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { basename, posix, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  RUNTIME_UNAVAILABLE_REASONS,
  createBrowserProbeSession,
} from './lib/browser-runtime.mjs';
import {
  RENDER_QA_WARNING_IDS,
  auditArtifactSet,
  renderQaWarningIds,
  runBrowserProbes,
} from './lib/qa.mjs';
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

export async function runRenderQaStage({
  siteDir,
  artifacts,
  browserProbe,
  widths,
  createProbeSession = createBrowserProbeSession,
} = {}) {
  assertStageInput(siteDir, artifacts);
  let probe = browserProbe;
  let closeSession;
  if (typeof probe !== 'function') {
    // Attempt a real runtime before conceding; the skip must describe machine
    // capability rather than the absence of an injected callback.
    const session = await createProbeSession();
    if (!session?.available) {
      return {
        valid: true,
        skipped: true,
        warnings: [
          session?.reason === RUNTIME_UNAVAILABLE_REASONS.disabled
            ? RENDER_QA_WARNING_IDS.disabledByConfiguration
            : RENDER_QA_WARNING_IDS.skippedNoRuntime,
        ],
        issues: [],
        probes: 0,
        ...(session?.reason && { reason: session.reason }),
      };
    }
    probe = session.probe;
    closeSession = session.close;
  }

  try {
    return await probeSiteArtifacts({ siteDir, artifacts, probe, widths });
  } finally {
    await closeSession?.();
  }
}

async function probeSiteArtifacts({ siteDir, artifacts, probe, widths }) {
  return withSiteServer(siteDir, async (origin) => {
    const probeArtifacts = await Promise.all(
      artifacts.map(async (artifact) => {
        const relativePath = siteRelativePath(artifact.renderedPath);
        return {
          id: artifact.id,
          type: artifact.type,
          html: await readFile(
            resolve(siteDir, ...relativePath.split('/')),
            'utf8',
          ),
          url: `${origin}/${relativePath
            .split('/')
            .map(encodeURIComponent)
            .join('/')}`,
        };
      }),
    );
    const browser = await runBrowserProbes({
      artifacts: probeArtifacts,
      probe,
      ...(widths && { widths }),
    });
    return {
      valid: true,
      skipped: false,
      warnings: renderQaWarningIds(browser.issues),
      issues: browser.issues,
      probes: browser.probes,
    };
  });
}

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

function assertStageInput(siteDir, artifacts) {
  if (typeof siteDir !== 'string' || siteDir.length === 0) {
    throw new TypeError('Render QA stage requires a built site directory.');
  }
  if (
    !Array.isArray(artifacts) ||
    artifacts.length === 0 ||
    artifacts.some(
      (artifact) =>
        typeof artifact?.id !== 'string' ||
        typeof artifact?.type !== 'string' ||
        typeof artifact?.renderedPath !== 'string',
    )
  ) {
    throw new TypeError(
      'Render QA stage requires artifacts with id, type, and renderedPath.',
    );
  }
  for (const artifact of artifacts) siteRelativePath(artifact.renderedPath);
}

function siteRelativePath(renderedPath) {
  const withoutPrefix = renderedPath.startsWith('site/')
    ? renderedPath.slice('site/'.length)
    : renderedPath;
  const normalized = posix.normalize(withoutPrefix);
  if (
    normalized === '.' ||
    normalized.startsWith('../') ||
    posix.isAbsolute(normalized)
  ) {
    throw new TypeError(`Unsafe render QA artifact path: ${renderedPath}`);
  }
  return normalized;
}

async function withSiteServer(siteDir, callback) {
  const root = resolve(siteDir);
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(
        new URL(request.url ?? '/', 'http://127.0.0.1').pathname,
      );
      const candidate = resolve(root, `.${pathname}`);
      if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
        response.writeHead(403).end();
        return;
      }
      const body = await readFile(candidate);
      response.writeHead(200, {
        'content-type': candidate.endsWith('.html')
          ? 'text/html; charset=utf-8'
          : 'application/octet-stream',
        'cache-control': 'no-store',
      });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    await closeServer(server);
    throw new Error('Render QA server did not expose a TCP address.');
  }

  try {
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await closeServer(server);
  }
}

function closeServer(server) {
  return new Promise((resolveClose, rejectClose) => {
    server.close((error) => (error ? rejectClose(error) : resolveClose()));
  });
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  process.exitCode = await runRenderQaCli();
}
