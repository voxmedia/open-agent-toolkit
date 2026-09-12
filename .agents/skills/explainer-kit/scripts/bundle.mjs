#!/usr/bin/env node

import { createHash } from 'node:crypto';
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
} from 'node:path';
import { pathToFileURL } from 'node:url';

import { normalizeClaimSubject } from './lib/claim-subject.mjs';
import { validateContract } from './lib/contracts.mjs';
import { isFlowFailureStage } from './lib/failure.mjs';
import { loadRecipe, recipeRequiredNarrative } from './lib/recipes.mjs';
import { validateSatisfiedRunPackage } from './lib/run-package.mjs';
import { sanitizeDiagnostic } from './lib/sanitize.mjs';

const HASH_PREFIX = 'sha256:';
const DOCUMENT_EXTENSIONS = new Set(['.md', '.txt', '.html', '.json']);
const PROJECT_INPUTS = [
  'summary.md',
  'implementation.md',
  'project-log.md',
  'plan.md',
  'discovery.md',
  'spec.md',
  'design.md',
  'orchestration-log.md',
];
const PROJECT_EXPLAINER_INPUTS = [
  'plan.md',
  'design.md',
  'spec.md',
  'discovery.md',
];
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

export async function collectInputs(recipe, inputs) {
  const { files } = await collectInputsWithUnresolved(recipe, inputs);
  return files;
}

async function collectInputsWithUnresolved(recipe, inputs) {
  const recipeId = typeof recipe === 'string' ? recipe : recipe?.id;
  if (inputs.project) {
    const names =
      recipeId === 'project-explainer'
        ? PROJECT_EXPLAINER_INPUTS
        : PROJECT_INPUTS;
    return {
      files: await collectAllowlistedFiles(inputs.project, names),
      unresolvedClaims: [],
    };
  }
  if (inputs.program) {
    return collectProgramInputs(inputs);
  }
  if (inputs.documents?.length) {
    const files = [];
    for (const input of inputs.documents) {
      files.push(...(await collectDocumentRoot(input)));
    }
    return { files: uniqueByLocator(files), unresolvedClaims: [] };
  }
  if (inputs.factBasePath) {
    const root = dirname(inputs.factBasePath);
    const file = await readConfinedFile(root, inputs.factBasePath);
    return {
      files: [{ ...file, suppliedFactBase: true }],
      unresolvedClaims: [],
    };
  }
  throw bundleError('Exactly one input mode is required.');
}

export function extractClaims(input) {
  if (input.suppliedFactBase) {
    return { claims: [], unresolvedClaims: [] };
  }
  if (input.unresolvedOnly) {
    return { claims: [], unresolvedClaims: [input.unresolvedClaim] };
  }
  if (input.bytes.includes(0)) {
    return {
      claims: [],
      unresolvedClaims: [
        {
          id: claimId(input.locator, 1, 'unparseable'),
          text: `Could not parse ${input.locator}.`,
          reason: 'missing-evidence',
          citations: [{ sourceId: input.id, locator: `${input.locator}:1-1` }],
        },
      ],
    };
  }

  const claims = [];
  let heading = basename(input.locator);
  const lines = input.text.split(/\r?\n/);
  for (const [index, raw] of lines.entries()) {
    const text = raw.trim();
    if (!text) continue;
    const headingMatch = text.match(/^#{1,6}\s+(.+)$/);
    if (headingMatch) {
      heading = headingMatch[1].trim();
      continue;
    }
    if (/^(?:---|\|[\s:|-]+\|)$/.test(text)) continue;
    const line = index + 1;
    claims.push({
      id: claimId(input.locator, line, text),
      text,
      status: 'confirmed',
      citations: [
        { sourceId: input.id, locator: `${input.locator}:${line}-${line}` },
      ],
      _subject: normalizeClaimSubject({ text, sectionId: heading }),
      _section: heading,
    });
  }
  return { claims, unresolvedClaims: [] };
}

export function indexClaims(claims) {
  const indexed = [];
  const seen = new Set();
  for (const claim of claims) {
    const subject = claim._subject || claim._section || claim.id;
    for (const value of claim.text.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? []) {
      addIndexed(indexed, seen, {
        subject,
        value,
        kind: 'date',
        claimId: claim.id,
      });
    }
    const withoutDates = claim.text.replace(/\b\d{4}-\d{2}-\d{2}\b/g, '');
    for (const value of withoutDates.match(/\b\d+(?:\.\d+)?%?\b/g) ?? []) {
      addIndexed(indexed, seen, {
        subject,
        value,
        kind: 'number',
        claimId: claim.id,
      });
    }
    for (const token of claim.text.toLowerCase().match(/[a-z][a-z_-]*/g) ??
      []) {
      if (STATUS_VALUES.has(token)) {
        addIndexed(indexed, seen, {
          subject,
          value: token,
          kind: 'status',
          claimId: claim.id,
        });
      }
    }
  }
  return indexed;
}

export function selectAnchorLedger(claims, recipe) {
  const recipeId = typeof recipe === 'string' ? recipe : recipe.id;
  const name =
    claims
      .map(({ _subject }) => _subject)
      .find((subject) => subject && !/^(?:p\d+|w\d+)$/i.test(subject)) ??
    recipeId;
  const identifiers = [
    ...new Set(
      claims.flatMap(
        ({ text }) =>
          text.match(/\b(?:p\d{2}|w\d+|wave-\d+|BL-\d{6}-[a-z0-9-]+)\b/gi) ??
          [],
      ),
    ),
  ];
  const indexed = indexClaims(claims);
  return {
    terminology: [name, ...identifiers].slice(0, 12).map((term) => ({ term })),
    numbers: indexed
      .filter(({ kind }) => kind === 'number' || kind === 'date')
      .slice(0, 12)
      .map(({ subject, value }) => ({ subject, value })),
    statuses: indexed
      .filter(({ kind }) => kind === 'status')
      .slice(0, 12)
      .map(({ subject, value }) => ({ subject, value })),
    claims: indexed,
  };
}

export async function writeBundle(runRoot, factBase, ledger, theme) {
  await mkdir(runRoot, { recursive: true });
  const temporary = await mkdtemp(join(runRoot, '.bundle-'));
  const source = join(temporary, 'source');
  await mkdir(source, { recursive: true });
  await Promise.all([
    writeJson(join(source, 'fact-base.json'), factBase),
    writeFile(join(source, 'fact-base.md'), factBaseMarkdown(factBase)),
    writeJson(join(source, 'ledger.json'), ledger),
    writeJson(join(temporary, 'theme.resolved.json'), theme),
  ]);
  await rm(join(runRoot, 'source'), { recursive: true, force: true });
  await rename(source, join(runRoot, 'source'));
  await rename(
    join(temporary, 'theme.resolved.json'),
    join(runRoot, 'theme.resolved.json'),
  );
  await rm(temporary, { recursive: true, force: true });
}

export async function findReusableRun(outputRoot, recipe, inputHashes) {
  const candidates = [outputRoot];
  try {
    for (const entry of await readdir(outputRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) candidates.push(join(outputRoot, entry.name));
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  for (const runRoot of candidates) {
    try {
      await validateSatisfiedRunPackage(runRoot, recipe, { inputHashes });
      return runRoot;
    } catch {
      continue;
    }
  }
  return null;
}

export async function writeFailure(runRoot, stage, cause) {
  if (!isFlowFailureStage(stage)) {
    throw bundleError(`Unsupported failure stage: ${stage}`);
  }
  await mkdir(runRoot, { recursive: true });
  await rm(join(runRoot, 'manifest.json'), { force: true });
  await writeJson(join(runRoot, 'failure.json'), {
    schemaVersion: 'explainer-kit.failure/v1',
    runRootHash: hashBytes(await realpath(runRoot)),
    stage,
    cause: sanitizeDiagnostic(cause),
    at: new Date().toISOString(),
  });
}

export async function runBundle(argv, io = console) {
  const options = parseArgs(argv);
  if (!options.recipe || !options.theme || !options.out) {
    throw usageError();
  }
  const recipeVersion = options.recipe === 'project-recap' ? '2' : '1';
  const recipe = loadRecipe(options.recipe, recipeVersion);
  await rm(join(options.out, 'failure.json'), { force: true });

  try {
    const { files: collected, unresolvedClaims: collectionUnresolvedClaims } =
      await collectInputsWithUnresolved(recipe, {
        project: options.project,
        program: options.program,
        summaries: options.summaries,
        archive: options.archive,
        documents: options.inputs,
        factBasePath: options.factBase,
      });
    const inputHashes = Object.fromEntries(
      collected.map(({ locator, hash }) => [locator, hash]),
    );
    const reusable = await findReusableRun(options.out, recipe, inputHashes);
    if (reusable) {
      const result = { reuse: true, runRoot: reusable, inputHashes };
      io.log(JSON.stringify(result));
      return result;
    }
    await rm(join(options.out, 'manifest.json'), { force: true });

    const supplied = collected.find(({ suppliedFactBase }) => suppliedFactBase);
    let factBase;
    let ledger;
    if (supplied) {
      factBase = JSON.parse(supplied.text);
      const validation = validateContract('fact-base', factBase);
      if (!validation.valid) {
        throw bundleError('Supplied fact base is invalid.');
      }
      const existingInput = factBase.sources.find(
        ({ locator, hash }) =>
          locator === supplied.locator && hash === supplied.hash,
      );
      if (existingInput) {
        existingInput.role = 'bundle-input';
      } else {
        factBase.sources.push({
          id: `bundle-input-${createHash('sha256')
            .update(`${supplied.locator}\0${supplied.hash}`)
            .digest('hex')
            .slice(0, 12)}`,
          kind: 'file',
          locator: supplied.locator,
          hash: supplied.hash,
          role: 'bundle-input',
        });
      }
      const suppliedClaims = factBase.claims.map((claim) => {
        const section =
          claim.sections?.[0] ??
          claim.citations?.[0]?.locator?.split(':')[0] ??
          recipe.id;
        return {
          ...claim,
          _subject: normalizeClaimSubject({
            text: claim.text,
            sectionId: section,
          }),
          _section: section,
        };
      });
      const updatedValidation = validateContract('fact-base', factBase);
      if (!updatedValidation.valid) {
        throw bundleError('Supplied fact base input identity is invalid.');
      }
      ledger = selectAnchorLedger(suppliedClaims, recipe);
    } else {
      const extracted = collected.map(extractClaims);
      const internalClaims = extracted.flatMap(({ claims }) => claims);
      factBase = {
        schemaVersion: 'explainer-kit.fact-base/v1',
        generatedAt: new Date().toISOString(),
        mode: 'supplied',
        freshnessPolicy: 'live-wins',
        sources: collected.map(({ id, locator, hash }) => ({
          id,
          kind: 'file',
          locator,
          hash,
        })),
        claims: internalClaims.map(
          ({
            _subject: _discardedSubject,
            _section: _discardedSection,
            ...claim
          }) => claim,
        ),
        unresolvedClaims: [
          ...collectionUnresolvedClaims,
          ...extracted.flatMap(({ unresolvedClaims }) => unresolvedClaims),
        ],
        overrides: [],
      };
      const validation = validateContract('fact-base', factBase);
      if (!validation.valid) {
        throw bundleError(
          `Generated fact base is invalid: ${validation.errors
            .map(({ code }) => code)
            .join(', ')}`,
        );
      }
      ledger = selectAnchorLedger(internalClaims, recipe);
    }

    const theme = JSON.parse(await readFile(options.theme, 'utf8'));
    if (!validateContract('theme', theme).valid) {
      throw bundleError('Resolved theme is invalid.');
    }
    await writeBundle(options.out, factBase, ledger, theme);
    const result = {
      reuse: false,
      runRoot: options.out,
      inputHashes,
      requiredNarrative: recipeRequiredNarrative(recipe, recipe.floor[0].id),
    };
    io.log(JSON.stringify(result));
    return result;
  } catch (error) {
    await writeFailure(options.out, 'bundle', error);
    throw error;
  }
}

async function collectAllowlistedFiles(root, names) {
  const files = [];
  for (const name of names) {
    const path = join(root, name);
    try {
      files.push(await readConfinedFile(root, path));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  if (files.length === 0)
    throw bundleError('No allowlisted project inputs found.');
  return files;
}

async function collectProgramInputs({ program, summaries, archive }) {
  const files = [await readConfinedFile(dirname(program), program)];
  const unresolvedClaims = [];
  if (summaries) {
    const selected = new Map();
    for (const entry of await readdir(summaries)) {
      const match = entry.match(/^(\d{8})-(wave-\d+-execution)\.md$/);
      if (!match) continue;
      const prior = selected.get(match[2]);
      if (!prior || match[1] > prior.date) {
        selected.set(match[2], { date: match[1], entry });
      }
    }
    for (const { entry } of [...selected.values()].sort((a, b) =>
      a.entry.localeCompare(b.entry),
    )) {
      files.push(await readConfinedFile(summaries, join(summaries, entry)));
    }
  }
  if (archive) {
    try {
      const selected = new Map();
      for (const entry of await readdir(archive, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const dated = entry.name.match(/^(\d{8})-(wave-\d+-execution)$/);
        const direct = entry.name.match(/^(wave-\d+-execution)$/);
        const wave = dated?.[2] ?? direct?.[1];
        if (!wave) continue;
        const date = dated?.[1] ?? '';
        const prior = selected.get(wave);
        if (!prior || date > prior.date) {
          selected.set(wave, { date, entry: entry.name });
        }
      }
      for (const { entry } of [...selected.values()].sort((left, right) =>
        left.entry.localeCompare(right.entry),
      )) {
        const path = join(archive, entry, 'implementation.md');
        try {
          const input = await readConfinedFile(archive, path);
          const summary = finalSummaryInput(input);
          if (summary) {
            files.push(summary);
          } else {
            files.push({
              ...input,
              unresolvedOnly: true,
              unresolvedClaim: unreachableWrapperClaim(
                input.locator,
                'it has no Final Summary section',
                input.id,
              ),
            });
          }
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
          const locator = `${entry}/implementation.md`;
          unresolvedClaims.push(
            unreachableWrapperClaim(locator, 'implementation.md is missing'),
          );
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return { files: uniqueByLocator(files), unresolvedClaims };
}

async function collectDocumentRoot(root) {
  const rootStats = await lstat(root);
  if (rootStats.isSymbolicLink()) {
    await assertContained(dirname(root), root);
  }
  if (rootStats.isFile()) {
    if (!DOCUMENT_EXTENSIONS.has(extname(root).toLowerCase())) return [];
    return [await readConfinedFile(dirname(root), root)];
  }
  if (!rootStats.isDirectory()) return [];
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      const resolved = await assertContained(root, path);
      const resolvedStats = await stat(resolved);
      if (resolvedStats.isDirectory()) {
        await visit(path);
      } else if (
        resolvedStats.isFile() &&
        DOCUMENT_EXTENSIONS.has(extname(entry.name).toLowerCase())
      ) {
        files.push(await readConfinedFile(root, path));
      }
    }
  }
  await visit(root);
  return files;
}

async function readConfinedFile(root, path) {
  const resolved = await assertContained(root, path);
  const bytes = await readFile(resolved);
  const locator = relative(await realpath(root), resolved).replaceAll(
    '\\',
    '/',
  );
  return {
    id: `source-${createHash('sha256').update(locator).digest('hex').slice(0, 12)}`,
    locator,
    hash: hashBytes(bytes),
    bytes,
    text: bytes.toString('utf8'),
  };
}

async function assertContained(root, path) {
  const canonicalRoot = await realpath(root);
  const canonicalPath = await realpath(path);
  const child = relative(canonicalRoot, canonicalPath);
  if (
    child === '..' ||
    child.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) ||
    isAbsolute(child)
  ) {
    throw bundleError(`Input escapes its declared root: ${path}`);
  }
  return canonicalPath;
}

function addIndexed(indexed, seen, entry) {
  const key = `${entry.subject}\0${entry.value}\0${entry.kind}`;
  if (seen.has(key)) return;
  seen.add(key);
  indexed.push(entry);
}

function claimId(locator, line, text) {
  return `claim-${createHash('sha256')
    .update(`${locator}\0${line}\0${text}`)
    .digest('hex')
    .slice(0, 16)}`;
}

function factBaseMarkdown(factBase) {
  return [
    '# Fact base',
    '',
    ...factBase.claims.map(({ text }) => `- ${text}`),
    ...(factBase.unresolvedClaims.length
      ? [
          '',
          '## Unresolved claims',
          '',
          ...factBase.unresolvedClaims.map(({ text }) => `- ${text}`),
        ]
      : []),
    '',
  ].join('\n');
}

function parseArgs(argv) {
  const options = { inputs: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === '--inputs') {
      while (argv[index + 1] && !argv[index + 1].startsWith('--')) {
        options.inputs.push(argv[(index += 1)]);
      }
      continue;
    }
    const name = {
      '--recipe': 'recipe',
      '--project': 'project',
      '--program': 'program',
      '--summaries': 'summaries',
      '--archive': 'archive',
      '--fact-base': 'factBase',
      '--theme': 'theme',
      '--out': 'out',
    }[key];
    if (!name || !argv[index + 1]) throw usageError();
    options[name] = argv[(index += 1)];
  }
  const modes = [
    Boolean(options.project),
    Boolean(options.program),
    options.inputs.length > 0,
    Boolean(options.factBase),
  ].filter(Boolean).length;
  if (modes !== 1) throw usageError();
  return options;
}

function hashBytes(bytes) {
  return `${HASH_PREFIX}${createHash('sha256').update(bytes).digest('hex')}`;
}

function finalSummaryInput(input) {
  const lines = input.text.split(/\r?\n/);
  const start = lines.findIndex((line) =>
    /^#{1,6}\s+Final Summary(?:\s+\(for PR\/docs\))?\s*$/i.test(line.trim()),
  );
  if (start === -1) return null;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^#{1,2}\s+/.test(lines[index].trim())) {
      end = index;
      break;
    }
  }
  const text = `${lines.slice(start, end).join('\n').trim()}\n`;
  const bytes = Buffer.from(text);
  return { ...input, bytes, text, hash: hashBytes(bytes) };
}

function unreachableWrapperClaim(locator, detail, sourceId) {
  return {
    id: claimId(locator, 1, detail),
    text: `Archived wrapper input ${locator} is unreachable because ${detail}.`,
    reason: 'missing-evidence',
    citations: sourceId ? [{ sourceId, locator: `${locator}:1-1` }] : [],
  };
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function uniqueByLocator(files) {
  const unique = new Map();
  for (const file of files) {
    const existing = unique.get(file.locator);
    if (!existing) {
      unique.set(file.locator, file);
      continue;
    }
    if (existing.id === file.id && existing.hash === file.hash) continue;
    throw bundleError(
      `Ambiguous document locator collision: ${file.locator} resolves to different input identities.`,
    );
  }
  return [...unique.values()];
}

function usageError() {
  return bundleError(
    'Usage: bundle.mjs --recipe <id> (--project <dir> | --program <file> --summaries <dir> --archive <dir> | --inputs <path>... | --fact-base <path>) --theme <resolved-json> --out <run-root>',
  );
}

function bundleError(message) {
  const error = new Error(message);
  error.code = 'E_BUNDLE';
  return error;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  runBundle(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
