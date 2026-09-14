#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { writeFailure } from './bundle.mjs';
import {
  createBrowserProbeSession,
  RUNTIME_UNAVAILABLE_REASONS,
} from './lib/browser-runtime.mjs';
import { normalizeClaimSubject } from './lib/claim-subject.mjs';
import { validateHtmlSafety } from './lib/html-safety.mjs';
import {
  BROWSER_PROBE_EVALUATE,
  checkArtifactCohesion,
  checkHtmlStructure,
  checkSourceDumping,
  pngDimensions,
  REPRESENTATIVE_WIDTHS,
  runBrowserProbes,
} from './lib/qa.mjs';
import { loadRecipe, recipeRequiredNarrative } from './lib/recipes.mjs';
import { sanitizeDiagnostic } from './lib/sanitize.mjs';

const STATUS_VALUES = new Set([
  'complete',
  'in_progress',
  'merged',
  'deferred',
  'parked',
  'wont_do',
  'closed',
  'open',
  'built',
  'built-needs-review',
  'failed',
  'incomplete',
  'skipped',
]);
const COVERED_CLAIM_BLOCKS = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'tr',
  'li',
  'p',
]);
const CLAIM_LABEL_ELEMENTS = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'dt',
  'label',
  'b',
  'strong',
]);
const IGNORED_RESIDUAL_ELEMENTS = new Set(['script', 'style']);
const VOID_HTML_ELEMENTS = new Set([
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

export function extractRenderedClaims(html) {
  const terminology = {};
  const numericClaims = {};
  const statuses = {};
  const claims = [];
  const seenClaims = new Set();
  const sections = extractSections(html);

  function harvestValues(valuesText, subject) {
    const addClaim = (value, kind) => {
      const key = `${subject}\0${value}\0${kind}`;
      if (seenClaims.has(key)) return;
      seenClaims.add(key);
      if (kind === 'status') {
        statuses[subject] = value;
      } else {
        numericClaims[subject] = value;
      }
      claims.push({ subject, value, kind });
    };

    for (const value of valuesText.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? []) {
      addClaim(value, 'date');
    }
    const withoutDates = valuesText.replace(/\b\d{4}-\d{2}-\d{2}\b/g, '');
    for (const value of withoutDates.match(/\b\d+(?:\.\d+)?%?\b/g) ?? []) {
      addClaim(value, 'number');
    }
    for (const token of valuesText.toLowerCase().match(/[a-z][a-z_-]*/g) ??
      []) {
      if (STATUS_VALUES.has(token)) addClaim(token, 'status');
    }
  }

  for (const section of sections) {
    const blockPattern = /<(h[1-6]|tr|li|p)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    for (const match of section.html.matchAll(blockPattern)) {
      const [, tag, blockHtml] = match;
      const text = htmlText(blockHtml);
      if (!text) continue;
      const isHeading = tag.toLowerCase().startsWith('h');
      if (isHeading) {
        terminology[text] = text;
      }
      const rowCells =
        tag.toLowerCase() === 'tr'
          ? [...blockHtml.matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)]
              .map((cell) => htmlText(cell[1]))
              .filter(Boolean)
          : [];
      const subject = normalizeClaimSubject({
        text,
        rowSubject: isHeading ? text : rowCells[0],
        sectionId: section.id,
      });
      const valuesText =
        rowCells.length > 1 ? rowCells.slice(1).join(' ') : text;
      harvestValues(valuesText, subject);
    }

    for (const residual of extractResidualClaimSegments(
      section.html,
      section.id,
    )) {
      harvestValues(residual.text, residual.subject);
    }
  }
  return { terminology, numericClaims, statuses, claims };
}

export function containsLedgerTerm(text, term) {
  if (
    typeof text !== 'string' ||
    typeof term !== 'string' ||
    term.length === 0
  ) {
    return false;
  }
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![A-Za-z0-9_-])${escaped}(?![A-Za-z0-9_-])`).test(text);
}

function extractResidualClaimSegments(html, sectionId) {
  const segments = [];
  const stack = [
    {
      tag: '#section',
      subject: null,
      labelText: null,
      coveredContext: false,
    },
  ];
  let coveredDepth = 0;
  let ignoredDepth = 0;

  const nearestSubject = () =>
    stack.findLast((frame) => frame.subject)?.subject ?? sectionId;
  const addSegment = (text, subject = nearestSubject()) => {
    const normalized = htmlText(text);
    if (normalized) {
      segments.push({ text: normalized, subject });
    }
  };
  const closeFrame = () => {
    const frame = stack.pop();
    if (!frame || frame.tag === '#section') return;

    if (frame.labelText !== null) {
      const labelText = htmlText(frame.labelText);
      const subject = normalizeClaimSubject({
        text: labelText,
        sectionId: null,
      });
      if (subject) {
        stack.at(-1).subject = subject;
        if (!frame.coveredContext && ignoredDepth === 0) {
          addSegment(frame.labelText, subject);
        }
      } else if (!frame.coveredContext && ignoredDepth === 0) {
        addSegment(frame.labelText);
      }
    }
    if (frame.covered) coveredDepth -= 1;
    if (frame.ignored) ignoredDepth -= 1;
  };

  for (const match of String(html).matchAll(
    /<!--[\s\S]*?-->|<![^>]*>|<\/?[a-z][^>]*>|[^<]+/gi,
  )) {
    const token = match[0];
    const close = token.match(/^<\/([a-z][\w:-]*)\s*>/i);
    if (close) {
      while (stack.length > 1 && stack.at(-1).tag !== close[1].toLowerCase()) {
        closeFrame();
      }
      if (stack.length > 1) closeFrame();
      continue;
    }

    const open = token.match(/^<([a-z][\w:-]*)\b/i);
    if (open) {
      const tag = open[1].toLowerCase();
      const covered = COVERED_CLAIM_BLOCKS.has(tag);
      const ignored = IGNORED_RESIDUAL_ELEMENTS.has(tag);
      stack.push({
        tag,
        subject: null,
        labelText: CLAIM_LABEL_ELEMENTS.has(tag) ? '' : null,
        covered,
        ignored,
        coveredContext: coveredDepth > 0 || covered,
      });
      if (covered) coveredDepth += 1;
      if (ignored) ignoredDepth += 1;
      if (VOID_HTML_ELEMENTS.has(tag) || /\/\s*>$/.test(token)) closeFrame();
      continue;
    }

    if (ignoredDepth > 0) continue;
    const labels = stack.filter((frame) => frame.labelText !== null);
    if (labels.length > 0) {
      for (const label of labels) label.labelText += token;
    } else if (coveredDepth === 0) {
      addSegment(token);
    }
  }

  while (stack.length > 1) closeFrame();
  return segments;
}

export async function verifyRun({
  runRoot,
  recipe,
  rung = 'none',
  screenshots,
  artifactSha256,
  visualVerdict,
  visualNotes,
  headlessRuntimeOptions,
}) {
  const pagePath = join(runRoot, 'site/index.html');
  let html;
  try {
    html = await readFile(pagePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      await rm(join(runRoot, 'qa/result.json'), { force: true });
      await writeFailure(runRoot, 'authoring', 'site/index.html is missing.');
      throw verifyError(
        'verify-authoring-missing',
        'site/index.html is missing.',
      );
    }
    throw error;
  }

  try {
    const recipeVersion = recipe === 'project-recap' ? '2' : '1';
    const recipeContract = loadRecipe(recipe, recipeVersion);
    const artifact = recipeContract.floor[0];
    const [ledger, factBase, shell] = await Promise.all([
      readJson(join(runRoot, 'source/ledger.json')),
      readJson(join(runRoot, 'source/fact-base.json')),
      readFile(
        new URL(`../templates/${artifact.template}.html`, import.meta.url),
        'utf8',
      ),
    ]);
    const requiredSections = recipeRequiredNarrative(
      recipeContract,
      artifact.id,
    );
    const sections = extractSections(html);
    const sectionById = new Map(
      sections.map((section) => [section.id, section]),
    );
    const structure = checkHtmlStructure({
      id: artifact.id,
      type: artifact.type,
      html,
    });
    const safety = validateHtmlSafety({
      html,
      shell,
      shellName: artifact.template,
    });
    const sourceDumping = checkSourceDumping({
      authoredText: htmlText(html),
      authoredSections: sections.map(({ id, html: sectionHtml }) => ({
        id,
        text: htmlText(sectionHtml),
      })),
      sourceTexts: [
        ...factBase.claims.map(({ text }) => text),
        ...factBase.unresolvedClaims.map(({ text }) => text),
      ],
    });
    const renderedClaims = extractRenderedClaims(html);
    const plainText = htmlText(html);
    for (const { term } of ledger.terminology ?? []) {
      if (containsLedgerTerm(plainText, term)) {
        renderedClaims.terminology[term] = term;
      }
    }
    const cohesion = checkArtifactCohesion(
      [{ id: artifact.id, cohesion: renderedClaims }],
      { ledger },
    );
    const expectedClaims = new Set(
      (ledger.claims ?? []).map(
        ({ subject, value, kind }) => `${subject}\0${value}\0${kind}`,
      ),
    );
    const untracedClaims = renderedClaims.claims.filter(
      ({ subject, value, kind }) =>
        !expectedClaims.has(`${subject}\0${value}\0${kind}`),
    );
    const missingSections = requiredSections.filter((id) => {
      const section = sectionById.get(id);
      return !section || htmlText(section.html).length === 0;
    });
    const parseIssues = [
      ...structure.issues.filter(({ code }) => code === 'tag-balance'),
      ...safety.errors.filter((code) => code === 'malformed-html'),
    ];
    const checks = {
      parse: checkResult(parseIssues),
      requiredNarrative: checkResult(
        missingSections.map((id) => `required-section-missing-or-empty:${id}`),
      ),
      structure: checkResult(
        structure.issues.filter(({ code }) => code !== 'tag-balance'),
      ),
      sourceDumping: checkResult(sourceDumping.issues),
      shellScripts: checkResult(
        safety.errors.filter((code) => code !== 'malformed-html'),
      ),
      ledgerToPage: checkResult(cohesion.issues),
      pageToLedger: checkResult(
        untracedClaims.map(
          ({ subject, value }) => `verify-claim-untraced:${subject}:${value}`,
        ),
      ),
    };
    const pageHash = hashText(html);
    const browserSafetyPassed = ['parse', 'structure', 'shellScripts'].every(
      (check) => checks[check].status === 'pass',
    );
    const browserResult =
      !browserSafetyPassed && rung !== 'none'
        ? await downgradeToNone(
            runRoot,
            'browser-blocked-by-static-safety-checks',
          )
        : rung === 'host'
          ? await verifyHostRung({
              runRoot,
              screenshots,
              expectedArtifactHash: pageHash,
              artifactSha256,
              visualVerdict,
              visualNotes,
            })
          : rung === 'playwright'
            ? await verifyPlaywrightRung({
                runRoot,
                artifact: { ...artifact, html },
                headlessRuntimeOptions,
              })
            : await downgradeToNone(
                runRoot,
                RUNTIME_UNAVAILABLE_REASONS.disabled,
              );
    const result = {
      artifactSha256: pageHash,
      checks,
      ...browserResult,
    };
    await mkdir(join(runRoot, 'qa'), { recursive: true });
    await rm(join(runRoot, 'failure.json'), { force: true });
    await writeFile(
      join(runRoot, 'qa/result.json'),
      `${JSON.stringify(result, null, 2)}\n`,
    );
    return result;
  } catch (error) {
    if (error.code?.startsWith('verify-')) throw error;
    await writeFailure(runRoot, 'verify', error);
    throw error;
  }
}

export async function runVerify(argv, io = console) {
  const options = parseArgs(argv);
  const result = await verifyRun(options);
  io.log(JSON.stringify({ runRoot: options.runRoot, rung: result.rung }));
  return result;
}

function extractSections(html) {
  const sections = [];
  for (const match of html.matchAll(
    /<section\b[^>]*\bid\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/section>/gi,
  )) {
    sections.push({ id: match[1], html: match[2] });
  }
  return sections;
}

function htmlText(html) {
  return String(html)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|#160);/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function checkResult(issues) {
  return issues.length === 0
    ? { status: 'pass' }
    : {
        status: 'fail',
        cause: issues
          .map((issue) =>
            typeof issue === 'string'
              ? issue
              : `${issue.code}:${issue.message}`,
          )
          .join('; '),
      };
}

async function verifyHostRung({
  runRoot,
  screenshots,
  expectedArtifactHash,
  artifactSha256,
  visualVerdict,
  visualNotes,
}) {
  if (!['pass', 'findings'].includes(visualVerdict)) {
    throw verifyError(
      'verify-host-visual-verdict-required',
      'The host rung requires --visual-verdict pass|findings after screenshot inspection.',
    );
  }
  if (artifactSha256 !== expectedArtifactHash) {
    return downgradeToNone(runRoot, 'host-artifact-hash-mismatch');
  }

  const captures = await readHostScreenshots(screenshots);
  if (!captures) {
    return downgradeToNone(runRoot, 'host-screenshot-invalid');
  }
  await clearCanonicalScreenshots(runRoot);
  await mkdir(join(runRoot, 'qa'), { recursive: true });
  await Promise.all(
    captures.map(({ path, bytes }) => writeFile(join(runRoot, path), bytes)),
  );

  const notes =
    visualNotes?.trim() ||
    `Host inspection reported ${visualVerdict} at 320, 768, and 1440 pixels.`;
  return {
    rung: 'host',
    screenshots: captures.map(({ path }) => path),
    visual: {
      verdict: visualVerdict,
      ...(visualVerdict === 'findings' && { findings: [notes] }),
      notes,
    },
  };
}

async function verifyPlaywrightRung({
  runRoot,
  artifact,
  headlessRuntimeOptions,
}) {
  let session;
  try {
    session = await createBrowserProbeSession(headlessRuntimeOptions);
  } catch (error) {
    return downgradeToNone(
      runRoot,
      `playwright-launch-failed:${sanitizeDiagnostic(error)}`,
    );
  }
  if (!session.available) return downgradeToNone(runRoot, session.reason);

  try {
    await clearCanonicalScreenshots(runRoot);
    const probes = await runBrowserProbes({
      artifacts: [artifact],
      probe: (request) =>
        session.probe({
          ...request,
          evaluate: BROWSER_PROBE_EVALUATE,
          ...(request.scenario === 'default' && {
            screenshotPath: join(runRoot, `qa/${request.viewport.width}.png`),
          }),
        }),
    });
    const screenshots = REPRESENTATIVE_WIDTHS.map((width) => `qa/${width}.png`);
    const findings = probes.issues.map(formatBrowserFinding);
    return {
      rung: 'playwright',
      screenshots,
      visual:
        findings.length === 0
          ? {
              verdict: 'pass',
              notes: 'Playwright probes passed at all representative widths.',
            }
          : { verdict: 'findings', findings },
    };
  } catch (error) {
    return downgradeToNone(
      runRoot,
      `playwright-probe-failed:${sanitizeDiagnostic(error)}`,
    );
  } finally {
    await session.close();
  }
}

function formatBrowserFinding({ code, width, scenario, message }) {
  return [code, width && `${width}px`, scenario, message]
    .filter(Boolean)
    .join(':');
}

async function readHostScreenshots(screenshots) {
  if (typeof screenshots !== 'string' || screenshots.length === 0) return null;
  try {
    const captures = await Promise.all(
      REPRESENTATIVE_WIDTHS.map(async (width) => {
        const bytes = await readFile(join(screenshots, `${width}.png`));
        const dimensions = pngDimensions(bytes);
        if (!dimensions || dimensions.width !== width) {
          throw new Error('invalid screenshot');
        }
        return { path: `qa/${width}.png`, bytes };
      }),
    );
    return captures;
  } catch {
    return null;
  }
}

async function clearCanonicalScreenshots(runRoot) {
  await Promise.all(
    REPRESENTATIVE_WIDTHS.map((width) =>
      rm(join(runRoot, `qa/${width}.png`), { force: true }),
    ),
  );
}

async function downgradeToNone(runRoot, reason) {
  await clearCanonicalScreenshots(runRoot);
  return {
    rung: 'none',
    reason,
    visual: { verdict: 'none' },
  };
}

function parseArgs(argv) {
  const options = { rung: 'none' };
  for (let index = 0; index < argv.length; index += 2) {
    const field = {
      '--run-root': 'runRoot',
      '--recipe': 'recipe',
      '--rung': 'rung',
      '--screenshots': 'screenshots',
      '--artifact-sha256': 'artifactSha256',
      '--visual-verdict': 'visualVerdict',
      '--visual-notes': 'visualNotes',
    }[argv[index]];
    if (!field || !argv[index + 1]) throw usageError();
    options[field] = argv[index + 1];
  }
  if (!options.runRoot || !options.recipe) throw usageError();
  if (!['none', 'host', 'playwright'].includes(options.rung))
    throw usageError();
  return options;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function hashText(text) {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function usageError() {
  return verifyError(
    'verify-usage',
    'Usage: verify.mjs --run-root <dir> --recipe <id> [--rung none|playwright | --rung host --screenshots <dir> --artifact-sha256 <hash> --visual-verdict pass|findings [--visual-notes <text>]]',
  );
}

function verifyError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  runVerify(process.argv.slice(2)).catch((error) => {
    console.error(`${error.code ?? 'verify-error'}: ${error.message}`);
    process.exitCode = 1;
  });
}
