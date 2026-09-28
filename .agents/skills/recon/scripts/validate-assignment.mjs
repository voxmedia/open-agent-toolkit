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
const workerArtifactKinds = [
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

function isMutatingTool(tool) {
  return (
    typeof tool === 'string' &&
    mutatingTools.has(tool.trim().toLowerCase().replaceAll('-', '_'))
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
  for (const [index, entry] of (Array.isArray(value[includedKey])
    ? value[includedKey]
    : []
  ).entries()) {
    if (isNonEmptyString(entry) && excluded.includes(entry)) {
      errors.push(
        issue(
          'INPUT_OVERLAPS_EXCLUSION',
          `${key}.${includedKey} entry ${entry} is also excluded`,
          `${path}.${key}.${includedKey}[${index}]`,
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
  checkEnum(value, 'kind', workerArtifactKinds, errors, artifactPath);
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
  const schema = value.outputSchema;
  if (
    !isNonEmptyString(schema) &&
    !(isObject(schema) && Object.keys(schema).length > 0)
  ) {
    errors.push(
      missing(
        `${artifactPath}.outputSchema`,
        'artifact.outputSchema (a schema reference or closed schema object)',
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

  checkIncludedExcluded(
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
    const sources = checkStringList(
      readSources.sources,
      'readSources.sources',
      `${readPath}.sources`,
      errors,
      { nonEmpty: true },
    );
    for (const [index, source] of sources.entries()) {
      if (inputs?.excluded.includes(source)) {
        errors.push(
          issue(
            'INPUT_OVERLAPS_EXCLUSION',
            `readSources.sources entry ${source} is an excluded input`,
            `${readPath}.sources[${index}]`,
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
      if (isMutatingTool(tool)) {
        errors.push(
          issue(
            'MUTATING_TOOL',
            `${tool} can modify files and is not read-only authority`,
            `${readPath}.tools[${index}]`,
          ),
        );
      }
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
