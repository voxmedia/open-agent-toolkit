#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { posix, resolve } from 'node:path';

import { isDirectExecution } from './lib/cli-entry.mjs';
import {
  authorityLevels,
  isObject,
  issue,
  SCHEMA_VERSION,
  taskClasses,
  waveModes,
  workerModes,
} from './lib/contracts.mjs';

/**
 * Deterministic pre-launch validation of a recon-worker assignment envelope.
 *
 * A controller runs this before recording an accepted launch. Once a launch is
 * accepted, a replacement is unavailable, so an envelope the worker would
 * reject at its Assignment Gate must fail here instead, and it must name every
 * missing or invalid field at once so a single correction pass can fix it.
 */

export const ASSIGNMENT_KIND = 'recon.assignment';

const waveModeToWorkerMode = Object.freeze({
  map: 'map',
  gather: 'gather',
  compile: 'compile',
  'semantic-verification': 'verify',
  adversarial: 'adversary',
  coverage: 'coverage',
  'redundant-gather': 'gather',
  'redundant-verification': 'verify',
  'contradiction-resolution': 'adversary',
});

// Kinds a worker may write. The manifest and review briefs are
// controller-owned and never a lane's output.
export const WORKER_ARTIFACT_KINDS = [
  'recon.raw-dossier',
  'recon.claim-ledger',
  'recon.review-result',
];

const failureRecordings = ['required', 'optional', 'conditional'];

// A recon lane reads only; a tool that edits files is never read authority.
// Recon is provider-neutral, so names are compared case-insensitively with
// `-` folded to `_`, and the list spans the providers' file-editing tools.
const mutatingTools = new Set([
  'apply_patch',
  'applypatch',
  'create_file',
  'delete_file',
  'edit',
  'edit_file',
  'multiedit',
  'notebookedit',
  'str_replace_based_edit_tool',
  'str_replace_editor',
  'write',
  'write_file',
]);

// Shell and execution tools can write the filesystem, so they are never read
// authority however the command is described.
const executionTools = new Set([
  'bash',
  'exec',
  'exec_command',
  'powershell',
  'run_command',
  'run_terminal_cmd',
  'shell',
  'terminal',
]);

// Read authority is an allowlist: only these read-only tools, spanning the
// Claude (`Read`, `Grep`, `Glob`, `WebFetch`, `WebSearch`) and Cursor/Codex
// (`read_file`, `list_dir`, `grep_search`, ...) spellings. `WebFetch` and
// `WebSearch` stay because URL sources are read sources and the recon-worker
// role declares them. Anything else is rejected rather than trusted.
export const READ_ONLY_TOOLS = Object.freeze([
  'codebase_search',
  'file_search',
  'glob',
  'grep',
  'grep_search',
  'list_dir',
  'ls',
  'read',
  'read_file',
  'web_fetch',
  'web_search',
  'webfetch',
  'websearch',
]);

function normalizeTool(tool) {
  return typeof tool === 'string'
    ? tool.trim().toLowerCase().replaceAll('-', '_')
    : '';
}

function toolIssue(tool, path) {
  const name = normalizeTool(tool);
  if (READ_ONLY_TOOLS.includes(name)) return null;
  if (mutatingTools.has(name)) {
    return issue(
      'MUTATING_TOOL',
      `${tool} can modify files and is not read-only authority`,
      path,
    );
  }
  if (executionTools.has(name)) {
    return issue(
      'EXECUTION_TOOL',
      `${tool} executes commands that can modify files and is not read-only authority`,
      path,
    );
  }
  return issue(
    'UNKNOWN_TOOL',
    `${tool} is not a supported read-only tool; use one of: ${READ_ONLY_TOOLS.join(', ')}`,
    path,
  );
}

// Every lane of one array shares these, so an array is one homogeneous wave:
// mixed runs, waves, modes, or task classes need separate waves.
const waveFields = ['runId', 'waveId', 'waveMode', 'mode', 'taskClass'];

const knownFields = [
  'kind',
  'schemaVersion',
  'runId',
  'waveId',
  'laneId',
  'waveMode',
  'mode',
  'taskClass',
  'objective',
  'scope',
  'inputs',
  'readSources',
  'writePath',
  'artifact',
  'enforcement',
  'deadlineSeconds',
  'failureRecording',
  'escalation',
];

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

// Any `scheme:` prefix is a URL to a URL parser (`http:/evil.com/x` reads as
// `http://evil.com/x`), so it is never treated as a repository path. Only
// well-formed http(s) URLs are comparable: `file:` and other schemes carry no
// host-bearing origin, and files use repository-relative paths instead.
const schemePrefix = /^[A-Za-z][A-Za-z0-9+.-]*:/;
const httpLocator = /^https?:\/\/[^/]/i;

/**
 * Binds a declared input, scope entry, or read source to a comparable locator
 * before launch, following the packet contract's locator kinds: a
 * repository-relative path, or a canonical http(s) URL. Anything else — an
 * absolute or drive path, a home-relative path, a backslash path, a `..`
 * segment, any other `scheme:` string, or a URL carrying credentials — cannot be bound to the lane's authority without
 * touching the filesystem, so it returns null and is rejected as unverifiable.
 * The check is lexical: symlinks and realpaths stay with source preflight and
 * the worker's own gate.
 */
function toLocator(entry) {
  if (!isNonEmptyString(entry)) return null;
  const value = entry.trim();
  if (schemePrefix.test(value)) {
    if (!httpLocator.test(value)) return null;
    let url;
    try {
      url = new URL(value);
    } catch {
      return null;
    }
    if (url.username || url.password) return null;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    // `origin` is scheme, host, and port for http(s).
    return {
      origin: url.origin.toLowerCase(),
      segments: url.pathname.split('/').filter(Boolean),
    };
  }
  if (
    value.includes('\\') ||
    posix.isAbsolute(value) ||
    /^[A-Za-z]:/.test(value) ||
    value.startsWith('~') ||
    value.split('/').includes('..')
  ) {
    return null;
  }
  const normalized = posix.normalize(value);
  return {
    origin: '',
    segments: normalized === '.' ? [] : normalized.split('/').filter(Boolean),
  };
}

/**
 * True when `child` is `parent` or a descendant of it, segment-wise. Inclusion
 * compares segments exactly; exclusion folds case, because a case-insensitive
 * filesystem (the macOS default) reads `Reviews/x` and `reviews/x` as one
 * file. Both directions therefore fail closed.
 */
function isWithin(child, parent) {
  return (
    child.origin === parent.origin &&
    parent.segments.length <= child.segments.length &&
    parent.segments.every((segment, index) => child.segments[index] === segment)
  );
}

function isExcludedBy(child, parent) {
  return (
    child.origin === parent.origin &&
    parent.segments.length <= child.segments.length &&
    parent.segments.every(
      (segment, index) =>
        child.segments[index].toLowerCase() === segment.toLowerCase(),
    )
  );
}

function locators(entries) {
  return entries.map(toLocator).filter((locator) => locator !== null);
}

function unverifiable(path, label, entry) {
  return issue(
    'UNVERIFIABLE_SOURCE',
    `${label} entry ${entry} is not a repository-relative path or canonical URL, so it cannot be bound to the lane's authority before launch`,
    path,
  );
}

function missing(path, label) {
  return issue('MISSING_FIELD', `${label} is required`, path);
}

function checkString(envelope, key, errors, path) {
  const value = envelope[key];
  if (value === undefined || value === null || value === '') {
    errors.push(missing(`${path}.${key}`, key));
    return false;
  }
  if (!isNonEmptyString(value)) {
    errors.push(
      issue(
        'INVALID_FIELD',
        `${key} must be a non-empty string`,
        `${path}.${key}`,
      ),
    );
    return false;
  }
  return true;
}

function checkEnum(envelope, key, allowed, errors, path) {
  if (!checkString(envelope, key, errors, path)) return false;
  if (!allowed.includes(envelope[key])) {
    errors.push(
      issue(
        'INVALID_FIELD',
        `${key} must be one of: ${allowed.join(', ')}`,
        `${path}.${key}`,
      ),
    );
    return false;
  }
  return true;
}

function checkStringList(value, label, path, errors, { nonEmpty }) {
  if (value === undefined || value === null) {
    errors.push(missing(path, label));
    return [];
  }
  if (!Array.isArray(value)) {
    errors.push(issue('INVALID_FIELD', `${label} must be an array`, path));
    return [];
  }
  if (nonEmpty && value.length === 0) {
    errors.push(missing(path, `${label} (at least one entry)`));
    return [];
  }
  const valid = [];
  for (const [index, entry] of value.entries()) {
    if (isNonEmptyString(entry)) {
      valid.push(entry);
    } else {
      errors.push(
        issue(
          'INVALID_FIELD',
          `${label} entries must be non-empty strings`,
          `${path}[${index}]`,
        ),
      );
    }
  }
  return valid;
}

function checkIncludedExcluded(
  envelope,
  key,
  [includedKey, excludedKey],
  errors,
  path,
) {
  const value = envelope[key];
  if (value === undefined || value === null) {
    errors.push(missing(`${path}.${key}`, key));
    return null;
  }
  if (!isObject(value)) {
    errors.push(
      issue(
        'INVALID_FIELD',
        `${key} must be an object with ${includedKey} and ${excludedKey}`,
        `${path}.${key}`,
      ),
    );
    return null;
  }
  const included = checkStringList(
    value[includedKey],
    `${key}.${includedKey}`,
    `${path}.${key}.${includedKey}`,
    errors,
    { nonEmpty: true },
  );
  const excluded = checkStringList(
    value[excludedKey],
    `${key}.${excludedKey}`,
    `${path}.${key}.${excludedKey}`,
    errors,
    { nonEmpty: false },
  );
  const excludedLocators = locators(excluded);
  for (const [index, entry] of (Array.isArray(value[includedKey])
    ? value[includedKey]
    : []
  ).entries()) {
    if (!isNonEmptyString(entry)) continue;
    const locator = toLocator(entry);
    const entryPath = `${path}.${key}.${includedKey}[${index}]`;
    if (locator === null) {
      errors.push(unverifiable(entryPath, `${key}.${includedKey}`, entry));
    } else if (
      excludedLocators.some((parent) => isExcludedBy(locator, parent))
    ) {
      errors.push(
        issue(
          'INPUT_OVERLAPS_EXCLUSION',
          `${key}.${includedKey} entry ${entry} is also excluded`,
          entryPath,
        ),
      );
    }
  }
  for (const [index, entry] of (Array.isArray(value[excludedKey])
    ? value[excludedKey]
    : []
  ).entries()) {
    if (isNonEmptyString(entry) && toLocator(entry) === null) {
      errors.push(
        unverifiable(
          `${path}.${key}.${excludedKey}[${index}]`,
          `${key}.${excludedKey}`,
          entry,
        ),
      );
    }
  }
  return { included, excluded };
}

function checkWritePath(envelope, errors, path) {
  if (!checkString(envelope, 'writePath', errors, path)) return;
  const writePath = envelope.writePath;
  const normalized = posix.normalize(writePath);
  if (
    writePath.includes('\\') ||
    posix.isAbsolute(writePath) ||
    /^[A-Za-z]:/.test(writePath) ||
    normalized !== writePath ||
    writePath
      .split('/')
      .some((segment) => segment === '..' || segment === '.') ||
    writePath.endsWith('/')
  ) {
    errors.push(
      issue(
        'UNSAFE_WRITE_PATH',
        'writePath must be a normalized relative file path contained by the packet directory',
        `${path}.writePath`,
      ),
    );
  }
}

function checkArtifact(envelope, errors, path) {
  const value = envelope.artifact;
  const artifactPath = `${path}.artifact`;
  if (value === undefined || value === null) {
    errors.push(missing(artifactPath, 'artifact'));
    return;
  }
  if (!isObject(value)) {
    errors.push(
      issue('INVALID_FIELD', 'artifact must be an object', artifactPath),
    );
    return;
  }
  checkEnum(value, 'kind', WORKER_ARTIFACT_KINDS, errors, artifactPath);
  if (value.schemaVersion === undefined || value.schemaVersion === null) {
    errors.push(
      missing(`${artifactPath}.schemaVersion`, 'artifact.schemaVersion'),
    );
  } else if (value.schemaVersion !== SCHEMA_VERSION) {
    errors.push(
      issue(
        'INVALID_FIELD',
        `artifact.schemaVersion must be ${SCHEMA_VERSION}`,
        `${artifactPath}.schemaVersion`,
      ),
    );
  }
  checkOutputSchema(value, errors, `${artifactPath}.outputSchema`);
}

// The approved schema references are the packet-contract schemas the bundled
// artifact validator enforces, one per worker-producible kind. Each fragment is
// a real anchor (`<a id="<kind>"></a>`) in references/packet-contract.md.
export const PACKET_CONTRACT_SCHEMA_PREFIX = 'references/packet-contract.md#';

function checkOutputSchema(artifact, errors, schemaPath) {
  const schema = artifact.outputSchema;
  if (
    schema === undefined ||
    schema === null ||
    schema === '' ||
    (isObject(schema) && Object.keys(schema).length === 0)
  ) {
    errors.push(
      missing(
        schemaPath,
        `artifact.outputSchema (${PACKET_CONTRACT_SCHEMA_PREFIX}<artifact.kind>)`,
      ),
    );
    return;
  }
  // The artifact kind already fixes the schema the bundled artifact validator
  // enforces, so an inline schema could only disagree with it: an open nested
  // object or a kind enum naming another kind would pass the envelope and
  // then fail packet validation. Only the kind's reference is accepted.
  if (typeof schema !== 'string') {
    errors.push(
      issue(
        'UNSUPPORTED_OUTPUT_SCHEMA',
        `inline output schemas are not accepted; use ${PACKET_CONTRACT_SCHEMA_PREFIX}<artifact.kind>`,
        schemaPath,
      ),
    );
    return;
  }
  const kind = WORKER_ARTIFACT_KINDS.includes(artifact.kind)
    ? artifact.kind
    : null;
  if (
    kind === null ||
    schema.trim() !== `${PACKET_CONTRACT_SCHEMA_PREFIX}${kind}`
  ) {
    errors.push(
      issue(
        'UNKNOWN_OUTPUT_SCHEMA',
        `outputSchema must be ${PACKET_CONTRACT_SCHEMA_PREFIX}<artifact.kind> for a worker artifact kind`,
        schemaPath,
      ),
    );
  }
}

function validateEnvelope(envelope, path) {
  const errors = [];
  if (!isObject(envelope)) {
    return [
      issue(
        'INVALID_ENVELOPE',
        'An assignment envelope must be a JSON object',
        path,
      ),
    ];
  }

  for (const key of Object.keys(envelope)) {
    if (!knownFields.includes(key)) {
      errors.push(
        issue(
          'UNKNOWN_FIELD',
          `${key} is not an assignment envelope field`,
          `${path}.${key}`,
        ),
      );
    }
  }

  if (envelope.kind !== ASSIGNMENT_KIND) {
    errors.push(
      envelope.kind === undefined
        ? missing(`${path}.kind`, 'kind')
        : issue(
            'INVALID_FIELD',
            `kind must be ${ASSIGNMENT_KIND}`,
            `${path}.kind`,
          ),
    );
  }
  if (envelope.schemaVersion !== SCHEMA_VERSION) {
    errors.push(
      envelope.schemaVersion === undefined
        ? missing(`${path}.schemaVersion`, 'schemaVersion')
        : issue(
            'INVALID_FIELD',
            `schemaVersion must be ${SCHEMA_VERSION}`,
            `${path}.schemaVersion`,
          ),
    );
  }

  checkString(envelope, 'runId', errors, path);
  checkString(envelope, 'waveId', errors, path);
  checkString(envelope, 'laneId', errors, path);
  const waveModeValid = checkEnum(
    envelope,
    'waveMode',
    waveModes,
    errors,
    path,
  );
  const modeValid = checkEnum(envelope, 'mode', workerModes, errors, path);
  if (
    waveModeValid &&
    modeValid &&
    waveModeToWorkerMode[envelope.waveMode] !== envelope.mode
  ) {
    errors.push(
      issue(
        'MODE_MISMATCH',
        `wave mode ${envelope.waveMode} maps to worker mode ${waveModeToWorkerMode[envelope.waveMode]}, not ${envelope.mode}`,
        `${path}.mode`,
      ),
    );
  }
  checkEnum(envelope, 'taskClass', taskClasses, errors, path);
  checkString(envelope, 'objective', errors, path);

  const scope = checkIncludedExcluded(
    envelope,
    'scope',
    ['included', 'excluded'],
    errors,
    path,
  );
  const inputs = checkIncludedExcluded(
    envelope,
    'inputs',
    ['allowed', 'excluded'],
    errors,
    path,
  );

  const readSources = envelope.readSources;
  const readPath = `${path}.readSources`;
  if (readSources === undefined || readSources === null) {
    errors.push(missing(readPath, 'readSources (source-read authority)'));
  } else if (!isObject(readSources)) {
    errors.push(
      issue(
        'INVALID_FIELD',
        'readSources must be an object with sources and tools',
        readPath,
      ),
    );
  } else {
    checkStringList(
      readSources.sources,
      'readSources.sources',
      `${readPath}.sources`,
      errors,
      { nonEmpty: true },
    );
    // Every read source must bind to a locator inside an allowed input and an
    // included scope entry, and outside every excluded input and scope entry.
    // Exclusions cover descendants: excluding `reviews/` excludes
    // `reviews/private.json`.
    const allowedInputs = locators(inputs?.included ?? []);
    const excludedInputs = locators(inputs?.excluded ?? []);
    const includedScope = locators(scope?.included ?? []);
    const excludedScope = locators(scope?.excluded ?? []);
    for (const [index, entry] of (Array.isArray(readSources.sources)
      ? readSources.sources
      : []
    ).entries()) {
      if (!isNonEmptyString(entry)) continue;
      const sourcePath = `${readPath}.sources[${index}]`;
      const source = toLocator(entry);
      if (source === null) {
        errors.push(unverifiable(sourcePath, 'readSources.sources', entry));
        continue;
      }
      const inside = (parent) => isWithin(source, parent);
      const excludedBy = (parent) => isExcludedBy(source, parent);
      if (inputs && !allowedInputs.some(inside)) {
        errors.push(
          issue(
            'SOURCE_OUTSIDE_AUTHORITY',
            `readSources.sources entry ${entry} is not within any allowed input`,
            sourcePath,
          ),
        );
      }
      if (
        scope &&
        (!includedScope.some(inside) || excludedScope.some(excludedBy))
      ) {
        errors.push(
          issue(
            'SOURCE_OUTSIDE_SCOPE',
            `readSources.sources entry ${entry} is not within the included scope, or is within the excluded scope`,
            sourcePath,
          ),
        );
      }
      if (excludedInputs.some(excludedBy)) {
        errors.push(
          issue(
            'INPUT_OVERLAPS_EXCLUSION',
            `readSources.sources entry ${entry} is within an excluded input`,
            sourcePath,
          ),
        );
      }
    }
    const tools = Array.isArray(readSources.tools) ? readSources.tools : [];
    checkStringList(
      readSources.tools,
      'readSources.tools',
      `${readPath}.tools`,
      errors,
      { nonEmpty: true },
    );
    for (const [index, tool] of tools.entries()) {
      // Non-string entries are already reported by checkStringList.
      if (!isNonEmptyString(tool)) continue;
      const problem = toolIssue(tool, `${readPath}.tools[${index}]`);
      if (problem) errors.push(problem);
    }
  }

  checkWritePath(envelope, errors, path);
  checkArtifact(envelope, errors, path);

  if (envelope.enforcement === 'unavailable') {
    errors.push(
      issue(
        'UNLAUNCHABLE_ENFORCEMENT',
        'enforcement unavailable means the read-only boundary cannot be held; do not launch',
        `${path}.enforcement`,
      ),
    );
  } else {
    checkEnum(envelope, 'enforcement', authorityLevels, errors, path);
  }

  if (
    envelope.deadlineSeconds === undefined ||
    envelope.deadlineSeconds === null
  ) {
    errors.push(missing(`${path}.deadlineSeconds`, 'deadlineSeconds'));
  } else if (
    !Number.isInteger(envelope.deadlineSeconds) ||
    envelope.deadlineSeconds < 1
  ) {
    errors.push(
      issue(
        'INVALID_FIELD',
        'deadlineSeconds must be an integer of at least 1',
        `${path}.deadlineSeconds`,
      ),
    );
  }

  checkEnum(envelope, 'failureRecording', failureRecordings, errors, path);
  checkString(envelope, 'escalation', errors, path);

  return errors;
}

/**
 * Validates one envelope, or one homogeneous wave of envelopes: every lane
 * shares the first lane's run, wave, wave mode, worker mode, and task class,
 * and no two lanes share a lane ID or a write path. Every error is reported;
 * nothing short-circuits.
 */
export function validateAssignmentValue(value) {
  if (!Array.isArray(value)) {
    const errors = validateEnvelope(value, '$');
    return { valid: errors.length === 0, errors };
  }
  if (value.length === 0) {
    const errors = [
      issue(
        'INVALID_ENVELOPE',
        'A wave must contain at least one assignment envelope',
        '$',
      ),
    ];
    return { valid: false, errors };
  }
  const errors = [];
  const laneIds = new Set();
  const writePaths = new Set();
  for (const [index, envelope] of value.entries()) {
    const path = `$[${index}]`;
    errors.push(...validateEnvelope(envelope, path));
    if (!isObject(envelope)) continue;
    const reference = value.find(isObject);
    if (reference !== envelope) {
      for (const field of waveFields) {
        if (envelope[field] !== reference[field]) {
          errors.push(
            issue(
              'WAVE_MISMATCH',
              `${field} differs from the wave's first lane; one array is one homogeneous wave`,
              `${path}.${field}`,
            ),
          );
        }
      }
    }
    if (isNonEmptyString(envelope.laneId)) {
      if (laneIds.has(envelope.laneId)) {
        errors.push(
          issue(
            'DUPLICATE_LANE_ID',
            `laneId ${envelope.laneId} is already assigned in this wave`,
            `${path}.laneId`,
          ),
        );
      }
      laneIds.add(envelope.laneId);
    }
    if (isNonEmptyString(envelope.writePath)) {
      const normalized = posix.normalize(envelope.writePath);
      if (writePaths.has(normalized)) {
        errors.push(
          issue(
            'DUPLICATE_WRITE_PATH',
            `writePath ${envelope.writePath} is already owned by another lane`,
            `${path}.writePath`,
          ),
        );
      }
      writePaths.add(normalized);
    }
  }
  return { valid: errors.length === 0, errors };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

export async function validateAssignmentFile(path) {
  const source = path === '-' ? '-' : resolve(path);
  let text;
  try {
    text = path === '-' ? await readStdin() : await readFile(path, 'utf8');
  } catch (error) {
    // A wrong path is not a malformed envelope; callers branch on the code.
    return {
      valid: false,
      unreadable: true,
      path: source,
      errors: [
        issue(
          'UNREADABLE_ENVELOPE',
          error instanceof Error ? error.message : 'Unreadable envelope',
          '$',
        ),
      ],
    };
  }
  try {
    return { ...validateAssignmentValue(JSON.parse(text)), path: source };
  } catch (error) {
    return {
      valid: false,
      path: source,
      errors: [
        issue(
          'INVALID_JSON',
          error instanceof Error ? error.message : 'Invalid JSON',
          '$',
        ),
      ],
    };
  }
}

async function main(argv) {
  const [path] = argv;
  if (!path) {
    throw new Error(
      'Usage: validate-assignment.mjs <assignment.json | -> (one envelope or a JSON array for one wave)',
    );
  }
  const result = await validateAssignmentFile(path);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  // 0 valid, 1 invalid envelope, 2 usage or unreadable input.
  process.exitCode = result.valid ? 0 : result.unreadable ? 2 : 1;
}

if (isDirectExecution(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exitCode = 2;
  });
}
