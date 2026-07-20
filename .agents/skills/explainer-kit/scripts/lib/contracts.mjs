import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { validatePortablePath } from './safe-paths.mjs';

const SCHEMA_FILES = {
  'run-request': 'run-request.schema.json',
  'fact-base': 'fact-base.schema.json',
  theme: 'theme.schema.json',
  manifest: 'manifest.schema.json',
  'build-record': 'build-record.schema.json',
  'durability-evidence': 'durability-evidence.schema.json',
  'publish-request': 'publish-request.schema.json',
  'publish-receipt': 'publish-receipt.schema.json',
  'author-request': 'author-request.schema.json',
  'author-result': 'author-result.schema.json',
};

const SCHEMAS = Object.fromEntries(
  Object.entries(SCHEMA_FILES).map(([kind, file]) => [
    kind,
    JSON.parse(
      readFileSync(new URL(`../../schemas/${file}`, import.meta.url), 'utf8'),
    ),
  ]),
);
const SCHEMAS_BY_ID = new Map(
  Object.values(SCHEMAS).map((schema) => [schema.$id, schema]),
);
const RAW_SECRET_KEYS = new Set([
  'accesskey',
  'accesskeyid',
  'awsaccesskeyid',
  'awssecretaccesskey',
  'awssessiontoken',
  'clientsecret',
  'credentials',
  'password',
  'privatekey',
  'secretkey',
  'sessiontoken',
  'token',
]);
const DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function validateContract(kind, value, context = {}) {
  const schema = SCHEMAS[kind];
  if (!schema) {
    return {
      valid: false,
      errors: [
        {
          path: '$',
          code: 'unknown-kind',
          message: `Unknown contract kind: ${kind}`,
        },
      ],
    };
  }

  const errors = [];
  findRawSecrets(value, '$', errors);
  validateSchema(schema, value, '$', schema, errors);
  validateContractPaths(kind, value, errors);
  validateCrossRecord(kind, value, context, errors);
  return { valid: errors.length === 0, errors };
}

export function canonicalHash(value) {
  return `sha256:${createHash('sha256')
    .update(canonicalStringify(value))
    .digest('hex')}`;
}

export function canonicalStringify(value) {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (isObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function validateSchema(schema, value, path, rootSchema, errors) {
  if (schema.$ref) {
    if (schema.$ref.endsWith('/safeRelativePath')) {
      addLexicalPathErrors(value, path, errors, false);
    } else if (schema.$ref.endsWith('/relativeOrAbsolutePath')) {
      addLexicalPathErrors(value, path, errors, true);
    }
    const resolved = resolveReference(schema.$ref, rootSchema);
    if (!resolved) {
      add(
        errors,
        path,
        'invalid-schema-ref',
        `Unknown schema ref ${schema.$ref}`,
      );
      return;
    }
    validateSchema(resolved.schema, value, path, resolved.root, errors);
  }

  if (schema.allOf) {
    for (const child of schema.allOf) {
      validateSchema(child, value, path, rootSchema, errors);
    }
  }

  if (schema.oneOf) {
    const matches = schema.oneOf.filter((child) => {
      const branchErrors = [];
      validateSchema(child, value, path, rootSchema, branchErrors);
      return branchErrors.length === 0;
    });
    if (matches.length !== 1) {
      add(
        errors,
        path,
        'one-of',
        'Value must match exactly one allowed shape.',
      );
    }
  }

  if ('const' in schema && !deepEqual(value, schema.const)) {
    add(
      errors,
      path,
      path.endsWith('.schemaVersion') ? 'schema-version' : 'const',
      `Value must equal ${JSON.stringify(schema.const)}.`,
    );
  }
  if (schema.enum && !schema.enum.some((entry) => deepEqual(value, entry))) {
    add(
      errors,
      path,
      'enum',
      `Value must be one of ${schema.enum.map(JSON.stringify).join(', ')}.`,
    );
  }

  if (schema.type && !matchesType(value, schema.type)) {
    add(errors, path, 'type', `Value must be ${schema.type}.`);
    return;
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      add(errors, path, 'min-length', 'String is shorter than allowed.');
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      add(
        errors,
        path,
        'pattern',
        'String does not match the required pattern.',
      );
    }
    if (schema.format === 'date-time' && !isDateTime(value)) {
      add(errors, path, 'format', 'String must be an ISO 8601 timestamp.');
    }
    if (schema.format === 'uri' && !isUri(value)) {
      add(errors, path, 'format', 'String must be an absolute URI.');
    }
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      add(errors, path, 'number', 'Number must be finite.');
    }
    if (schema.minimum !== undefined && value < schema.minimum) {
      add(
        errors,
        path,
        'minimum',
        `Number must be at least ${schema.minimum}.`,
      );
    }
    if (
      schema.exclusiveMinimum !== undefined &&
      value <= schema.exclusiveMinimum
    ) {
      add(
        errors,
        path,
        'exclusive-minimum',
        `Number must be greater than ${schema.exclusiveMinimum}.`,
      );
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      add(errors, path, 'maximum', `Number must be at most ${schema.maximum}.`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      add(errors, path, 'min-items', 'Array has too few items.');
    }
    if (schema.uniqueItems) {
      const identities = value.map(canonicalStringify);
      if (new Set(identities).size !== identities.length) {
        add(errors, path, 'unique-items', 'Array items must be unique.');
      }
    }
    if (schema.items) {
      value.forEach((item, index) =>
        validateSchema(
          schema.items,
          item,
          `${path}[${index}]`,
          rootSchema,
          errors,
        ),
      );
    }
  }

  if (isObject(value)) {
    const properties = schema.properties ?? {};
    for (const required of schema.required ?? []) {
      if (!(required in value)) {
        add(
          errors,
          `${path}.${required}`,
          'required',
          `Required property ${required} is missing.`,
        );
      }
    }
    for (const [key, child] of Object.entries(properties)) {
      if (key in value) {
        validateSchema(child, value[key], `${path}.${key}`, rootSchema, errors);
      }
    }
    for (const [key, childValue] of Object.entries(value)) {
      if (key in properties) {
        continue;
      }
      if (schema.additionalProperties === false) {
        add(
          errors,
          `${path}.${key}`,
          'unknown-key',
          `Unknown property ${key}.`,
        );
      } else if (isObject(schema.additionalProperties)) {
        validateSchema(
          schema.additionalProperties,
          childValue,
          `${path}.${key}`,
          rootSchema,
          errors,
        );
      }
    }
    if (schema.propertyNames) {
      for (const key of Object.keys(value)) {
        validateSchema(
          schema.propertyNames,
          key,
          `${path}.${key}`,
          rootSchema,
          errors,
        );
      }
    }
  }
}

function validateContractPaths(kind, value, errors) {
  if (!isObject(value)) {
    return;
  }

  if (kind === 'run-request') {
    addLexicalPathErrors(value.outputRoot, '$.outputRoot', errors, true);
    if (isObject(value.factBase)) {
      addLexicalPathErrors(
        value.factBase.path,
        '$.factBase.path',
        errors,
        true,
      );
    }
    if (isObject(value.theme)) {
      addLexicalPathErrors(
        value.theme.suppliedBundlePath,
        '$.theme.suppliedBundlePath',
        errors,
        true,
      );
    }
    if (isObject(value.durability) && isObject(value.durability.publish)) {
      validateContractPaths(
        'publish-request',
        value.durability.publish,
        errors,
      );
    }
  }

  if (kind === 'publish-request') {
    addLexicalPathErrors(value.siteRoot, '$.siteRoot', errors, true);
    addLexicalPathErrors(value.manifestPath, '$.manifestPath', errors, true);
  }

  if (kind === 'durability-evidence') {
    addLexicalPathErrors(value.manifestPath, '$.manifestPath', errors, true);
    if (isObject(value.evidence)) {
      addLexicalPathErrors(
        value.evidence.repoRoot,
        '$.evidence.repoRoot',
        errors,
        true,
      );
      addLexicalPathErrors(
        value.evidence.receiptPath,
        '$.evidence.receiptPath',
        errors,
        true,
      );
      if (Array.isArray(value.evidence.paths)) {
        value.evidence.paths.forEach((candidate, index) =>
          addLexicalPathErrors(
            candidate,
            `$.evidence.paths[${index}]`,
            errors,
            false,
          ),
        );
      }
    }
  }

  if (kind === 'manifest' && Array.isArray(value.artifacts)) {
    value.artifacts.forEach((artifact, index) => {
      if (isObject(artifact) && isObject(artifact.rebuild)) {
        addLexicalPathErrors(
          artifact.rebuild.cwd,
          `$.artifacts[${index}].rebuild.cwd`,
          errors,
          true,
        );
      }
    });
  }
}

function addLexicalPathErrors(value, path, errors, allowAbsolute) {
  if (value === undefined) {
    return;
  }
  if (typeof value !== 'string') {
    return;
  }

  const result = validatePortablePath(value, { allowAbsolute });
  if (!result.valid) {
    add(errors, path, 'unsafe-path', result.errors[0].message);
  }
}

function resolveReference(reference, rootSchema) {
  if (reference.startsWith('#/')) {
    const parts = reference
      .slice(2)
      .split('/')
      .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'));
    let schema = rootSchema;
    for (const part of parts) {
      schema = schema?.[part];
    }
    return schema ? { schema, root: rootSchema } : null;
  }
  const external = SCHEMAS_BY_ID.get(reference);
  return external ? { schema: external, root: external } : null;
}

function validateCrossRecord(kind, value, context, errors) {
  if (!isObject(value)) {
    return;
  }

  if (kind === 'run-request') {
    const factBase = value.factBase;
    if (isObject(factBase)) {
      const hasPath = typeof factBase.path === 'string';
      const hasSources = Array.isArray(factBase.sources);
      if (
        (factBase.mode === 'supplied' && (!hasPath || hasSources)) ||
        (factBase.mode === 'federated' && (!hasSources || hasPath))
      ) {
        add(
          errors,
          '$.factBase',
          'fact-base-fields',
          'Supplied fact bases require only path; federated fact bases require only sources.',
        );
      }
    }

    const durability = value.durability;
    if (
      isObject(durability) &&
      durability.strategy === 'publish' &&
      !isObject(durability.publish)
    ) {
      add(
        errors,
        '$.durability.publish',
        'incomplete-publish',
        'Publish durability requires a complete publish request.',
      );
    }
    if (
      isObject(durability) &&
      durability.strategy !== 'publish' &&
      'publish' in durability
    ) {
      add(
        errors,
        '$.durability.publish',
        'unexpected-publish',
        'Publish settings are allowed only for publish durability.',
      );
    }

    if (
      isObject(value.privacy) &&
      value.privacy.retainRawArtDirection === true &&
      (!isObject(value.theme) ||
        typeof value.theme.artDirection !== 'string' ||
        value.theme.artDirection.length === 0)
    ) {
      add(
        errors,
        '$.privacy.retainRawArtDirection',
        'art-direction-required',
        'Retaining raw art direction requires theme.artDirection.',
      );
    }
  }

  if (kind === 'author-request') {
    const requiredNarrative = Array.isArray(value.recipe?.requiredNarrative)
      ? value.recipe.requiredNarrative
      : [];
    const outlineIds = Array.isArray(value.narrativeOutline)
      ? value.narrativeOutline.map((section) => section?.id)
      : [];
    if (
      requiredNarrative.length !== outlineIds.length ||
      requiredNarrative.some((id, index) => outlineIds[index] !== id)
    ) {
      add(
        errors,
        '$.narrativeOutline',
        'narrative-outline-mismatch',
        'Author request narrative outline must exactly match recipe requiredNarrative order.',
      );
    }
  }

  if (kind === 'author-result') {
    for (const [index, section] of (Array.isArray(value.content?.sections)
      ? value.content.sections
      : []
    ).entries()) {
      if (
        isObject(section) &&
        typeof section.prose === 'string' &&
        section.prose.trim().length === 0
      ) {
        add(
          errors,
          `$.content.sections[${index}].prose`,
          'empty-prose',
          'Authored section prose must contain non-whitespace text.',
        );
      }
    }
  }

  if (kind === 'manifest') {
    const paths = [];
    for (const artifact of Array.isArray(value.artifacts)
      ? value.artifacts
      : []) {
      if (!isObject(artifact)) {
        continue;
      }
      for (const field of ['contentPath', 'renderedPath']) {
        if (typeof artifact[field] === 'string') {
          paths.push(artifact[field]);
        }
      }
      if (artifact.status === 'built' && typeof artifact.hash !== 'string') {
        add(
          errors,
          '$.artifacts',
          'built-artifact-hash-required',
          'Built artifacts require a canonical hash.',
        );
      }
      if (artifact.rebuildable === true && !isObject(artifact.rebuild)) {
        add(
          errors,
          '$.artifacts',
          'rebuild-metadata-required',
          'Rebuildable artifacts require rebuild metadata.',
        );
      }
      if (
        value.outcome === 'built-durable' &&
        artifact.status === 'built' &&
        (!Array.isArray(artifact.durableEvidence) ||
          artifact.durableEvidence.length === 0)
      ) {
        add(
          errors,
          '$.artifacts',
          'durability-evidence-required',
          'Durable built artifacts require durability evidence.',
        );
      }
    }
    if (new Set(paths).size !== paths.length) {
      add(
        errors,
        '$.artifacts',
        'duplicate-artifact-path',
        'Artifact content and rendered paths must be unique.',
      );
    }

    const requiredProvenance = [
      'run-request.json',
      'source/content-approval.json',
    ];
    const expectedImmutable = new Set([
      ...requiredProvenance,
      value.source?.factBasePath,
      'source/fact-base.md',
      ...(Array.isArray(value.source?.authorResultPaths)
        ? value.source.authorResultPaths
        : []),
      value.theme?.path,
      ...(Array.isArray(value.artifacts)
        ? value.artifacts.flatMap((artifact) => [
            artifact?.contentPath,
            ...(artifact?.status === 'built' &&
            typeof artifact?.renderedPath === 'string'
              ? [artifact.renderedPath]
              : []),
          ])
        : []),
    ]);
    expectedImmutable.delete(undefined);
    const recordedImmutable = isObject(value.immutableHashes)
      ? new Set(Object.keys(value.immutableHashes))
      : new Set();
    const missingLegacyPaths = requiredProvenance.filter(
      (path) => !recordedImmutable.has(path),
    );
    if (missingLegacyPaths.length > 0) {
      add(
        errors,
        '$.immutableHashes',
        'legacy-manifest-incomplete',
        `Legacy manifest is missing immutable coverage for ${missingLegacyPaths.join(', ')}; regenerate the recap package before archival.`,
      );
    }
    if (
      expectedImmutable.size !== recordedImmutable.size ||
      [...expectedImmutable].some((path) => !recordedImmutable.has(path))
    ) {
      add(
        errors,
        '$.immutableHashes',
        'immutable-package-incomplete',
        'Manifest immutable hashes must cover the complete retained fact-base, content, theme, and required built artifact package.',
      );
    }

    const record = context.buildRecord;
    if (isObject(record)) {
      if (value.runId !== record.runId || value.outcome !== record.outcome) {
        add(
          errors,
          '$',
          'cross-record-mismatch',
          'Manifest and build record identity or outcome do not match.',
        );
      }
      if (
        isObject(value.buildRecord) &&
        value.buildRecord.hash !== canonicalHash(record)
      ) {
        add(
          errors,
          '$.buildRecord.hash',
          'hash-mismatch',
          'Build record hash does not match canonical content.',
        );
      }
    }
    if (
      isObject(context.theme) &&
      isObject(value.theme) &&
      value.theme.hash !== canonicalHash(context.theme)
    ) {
      add(
        errors,
        '$.theme.hash',
        'hash-mismatch',
        'Theme hash does not match canonical content.',
      );
    }
    if (isObject(context.runRequest) && isObject(record)) {
      const expected =
        isObject(context.runRequest.theme) &&
        typeof context.runRequest.theme.renderStrategy === 'string'
          ? context.runRequest.theme.renderStrategy
          : 'default-only';
      if (record.renderStrategy !== expected) {
        add(
          errors,
          '$.renderStrategy',
          'cross-record-mismatch',
          'Build render strategy does not match the run request.',
        );
      }
    }
  }

  if (
    kind === 'publish-receipt' &&
    isObject(context.manifest) &&
    Array.isArray(value.artifacts)
  ) {
    const expected = new Map();
    for (const artifact of context.manifest.artifacts ?? []) {
      if (isObject(artifact) && typeof artifact.renderedPath === 'string') {
        expected.set(artifact.renderedPath, artifact.hash);
      }
    }
    for (const artifact of value.artifacts) {
      if (
        isObject(artifact) &&
        expected.get(artifact.relativePath) !== artifact.hash
      ) {
        add(
          errors,
          '$.artifacts',
          'cross-record-mismatch',
          'Publish receipt artifact does not match the manifest.',
        );
      }
    }
  }
}

function findRawSecrets(value, path, errors) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      findRawSecrets(item, `${path}[${index}]`, errors),
    );
    return;
  }
  if (!isObject(value)) {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase().replaceAll(/[^a-z0-9]/g, '');
    if (RAW_SECRET_KEYS.has(normalized)) {
      add(
        errors,
        `${path}.${key}`,
        'raw-secret-field',
        `Raw secret field ${key} is forbidden.`,
      );
    }
    findRawSecrets(child, `${path}.${key}`, errors);
  }
}

function matchesType(value, type) {
  switch (type) {
    case 'object':
      return isObject(value);
    case 'array':
      return Array.isArray(value);
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'integer':
      return Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'null':
      return value === null;
    default:
      return false;
  }
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDateTime(value) {
  return DATE_TIME_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
}

function isUri(value) {
  try {
    return Boolean(new URL(value).protocol);
  } catch {
    return false;
  }
}

function deepEqual(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function add(errors, path, code, message) {
  errors.push({ path, code, message });
}
