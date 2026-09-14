import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { validatePortablePath } from './safe-paths.mjs';

const SCHEMA_FILES = {
  'fact-base': 'fact-base.schema.json',
  manifest: 'manifest.schema.json',
  theme: 'theme.schema.json',
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
const DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
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

export function validateContract(kind, value) {
  const schema = SCHEMAS[kind] ?? SCHEMAS_BY_ID.get(kind);
  if (!schema) {
    throw new Error(`Unknown contract kind: ${kind}`);
  }

  const errors = [];
  findRawSecrets(value, '$', errors);
  validateSchema(schema, value, '$', schema, errors);
  validateContractPaths(kind, value, errors);
  if (schema === SCHEMAS['fact-base']) {
    rejectRetiredCitationKeys(value, errors);
  }
  if (schema === SCHEMAS.manifest) {
    validateManifest(value, errors);
  }
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
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function rejectRetiredCitationKeys(value, errors) {
  for (const [group, claims] of [
    ['claims', value?.claims],
    ['unresolvedClaims', value?.unresolvedClaims],
  ]) {
    for (const [claimIndex, claim] of (claims ?? []).entries()) {
      for (const [citationIndex, citation] of (
        claim?.citations ?? []
      ).entries()) {
        for (const key of [
          'repository',
          'revision',
          'path',
          'lineRange',
          'url',
        ]) {
          if (citation?.[key] !== undefined) {
            add(
              errors,
              `$.${group}[${claimIndex}].citations[${citationIndex}].${key}`,
              'unknown-key',
              `Unknown property ${key}.`,
            );
          }
        }
      }
    }
  }
}

function validateManifest(value, errors) {
  const immutableHashes = isObject(value?.immutableHashes)
    ? value.immutableHashes
    : {};
  if (
    typeof value?.theme?.path === 'string' &&
    !(value.theme.path in immutableHashes)
  ) {
    add(
      errors,
      '$.theme.path',
      'immutable-package-incomplete',
      'Theme path must be covered by immutable hashes.',
    );
  }
  if (
    typeof value?.theme?.hash === 'string' &&
    value.theme.hash !== immutableHashes['theme.resolved.json']
  ) {
    add(
      errors,
      '$.theme.hash',
      'hash-mismatch',
      'Theme hash must match theme.resolved.json.',
    );
  }
  for (const [index, artifact] of (value?.artifacts ?? []).entries()) {
    if (
      typeof artifact?.contentPath === 'string' &&
      !(artifact.contentPath in immutableHashes)
    ) {
      add(
        errors,
        `$.artifacts[${index}].contentPath`,
        'immutable-package-incomplete',
        'Artifact content path must be covered by immutable hashes.',
      );
    }
    if (
      typeof artifact?.hash === 'string' &&
      artifact.hash !== immutableHashes[artifact.contentPath]
    ) {
      add(
        errors,
        `$.artifacts[${index}].hash`,
        'hash-mismatch',
        'Artifact hash must match its immutable content hash.',
      );
    }
  }
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

  for (const child of schema.allOf ?? []) {
    validateSchema(child, value, path, rootSchema, errors);
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
      if (key in properties) continue;
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
  if (
    !isObject(value) ||
    (kind !== 'manifest' && kind !== 'explainer-kit.manifest/v1')
  ) {
    return;
  }
  for (const [path, hash] of Object.entries(value.immutableHashes ?? {})) {
    addLexicalPathErrors(path, `$.immutableHashes.${path}`, errors, false);
    if (typeof hash !== 'string') continue;
  }
}

function addLexicalPathErrors(value, path, errors, allowAbsolute) {
  if (value === undefined || typeof value !== 'string') return;
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
    for (const part of parts) schema = schema?.[part];
    return schema ? { schema, root: rootSchema } : null;
  }
  const external = SCHEMAS_BY_ID.get(reference);
  return external ? { schema: external, root: external } : null;
}

function findRawSecrets(value, path, errors) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      findRawSecrets(item, `${path}[${index}]`, errors),
    );
    return;
  }
  if (!isObject(value)) return;
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
