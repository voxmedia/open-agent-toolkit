import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { validatePortablePath } from './safe-paths.mjs';
import {
  parseCanonicalGithubBlobUrl,
  validateCanonicalGithubBlobTuple,
} from './source-backlinks.mjs';

const SCHEMA_FILES = {
  'run-request': 'run-request.schema.json',
  'fact-base': 'fact-base.schema.json',
  theme: 'theme.schema.json',
  manifest: 'manifest.schema.json',
  'build-record': 'build-record.schema.json',
  'durability-evidence': 'durability-evidence.schema.json',
  'publish-request': 'publish-request.schema.json',
  'publish-receipt': 'publish-receipt.schema.json',
  'author-request/v2': 'author-request.v2.schema.json',
  'author-result/v2': 'author-result.v2.schema.json',
  'set-plan': 'set-plan.v1.schema.json',
  'visual-review-request': 'visual-review-request.v1.schema.json',
  'visual-review-result': 'visual-review-result.v1.schema.json',
};
const DEFAULT_SCHEMA_KEYS = {
  'author-request': 'author-request/v2',
  'author-result': 'author-result/v2',
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
const SET_PLAN_RECORD_PATHS = [
  'source/set-plan/request.json',
  'source/set-plan/result.json',
  'source/set-plan/ledger.json',
  'source/set-plan/portfolio.json',
  'source/set-plan/drafts.json',
];

export function validateContract(kind, value, context = {}) {
  const schema = resolveContractSchema(kind, value);
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
  validateSourceBacklinks(kind, value, errors);
  return { valid: errors.length === 0, errors };
}

function validateSourceBacklinks(kind, value, errors) {
  if (kind === 'fact-base' || kind === 'explainer-kit.fact-base/v1') {
    const tuples = [
      ...(value.sources ?? []),
      ...(value.claims ?? []).flatMap((claim) => claim.citations ?? []),
      ...(value.unresolvedClaims ?? []).flatMap(
        (claim) => claim.citations ?? [],
      ),
    ];
    tuples.forEach((tuple, index) => {
      const declaresBacklink = [
        'repository',
        'revision',
        'path',
        'lineRange',
        'url',
      ].some((field) => tuple[field] !== undefined);
      if (declaresBacklink && !validateCanonicalGithubBlobTuple(tuple)) {
        add(
          errors,
          `$.sourceBacklinks[${index}]`,
          'source-backlink',
          'Must declare one complete canonical GitHub blob backlink tuple.',
        );
      }
    });
    return;
  }
  if (kind !== 'manifest' && kind !== 'explainer-kit.manifest/v1') return;
  (value.source?.backlinks ?? []).forEach((entry, index) => {
    try {
      parseCanonicalGithubBlobUrl(entry.url);
    } catch (error) {
      add(
        errors,
        `$.source.backlinks[${index}].url`,
        'source-backlink',
        error instanceof Error
          ? error.message
          : 'Must be a canonical GitHub blob backlink.',
      );
    }
  });
}

function resolveContractSchema(kind, value) {
  if (SCHEMAS[kind]) {
    return SCHEMAS[kind];
  }
  if (SCHEMAS_BY_ID.has(kind)) {
    return SCHEMAS_BY_ID.get(kind);
  }

  const defaultKey = DEFAULT_SCHEMA_KEYS[kind];
  if (!defaultKey) {
    return null;
  }

  const declared = isObject(value)
    ? SCHEMAS_BY_ID.get(value.schemaVersion)
    : undefined;
  return declared?.$id.startsWith(`explainer-kit.${kind}/`)
    ? declared
    : SCHEMAS[defaultKey];
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

    if (value.recapMode !== undefined && value.recipe?.id !== 'project-recap') {
      add(
        errors,
        '$.recapMode',
        'recap-mode-recipe',
        'recapMode is allowed only for the project-recap recipe.',
      );
    }
  }

  if (kind === 'set-plan') {
    validateSetPlan(value, errors);
  }

  if (
    ['author-request', 'author-request/v2'].includes(kind) ||
    value.schemaVersion === 'explainer-kit.author-request/v2'
  ) {
    validateAuthorSetContext(value, errors);
    validateVisualAuthoringGuidance(value, errors);
    validateAuthorGraphSemantics(value, errors);
  }

  if (kind === 'visual-review-request') {
    if (
      typeof value.requestHash === 'string' &&
      value.requestHash !== canonicalHash(visualReviewRequestPayload(value))
    ) {
      add(
        errors,
        '$.requestHash',
        'request-hash-mismatch',
        'Visual review request hash does not match its canonical evidence payload.',
      );
    }
    if (
      typeof value.requestHash === 'string' &&
      typeof value.requestId === 'string' &&
      value.requestId !== visualReviewRequestId(value.requestHash)
    ) {
      add(
        errors,
        '$.requestId',
        'request-id-mismatch',
        'Visual review request identity does not match its canonical request hash.',
      );
    }
    const plannedArtifactIds = Array.isArray(value.plan?.portfolio)
      ? value.plan.portfolio.map(({ artifactId }) => artifactId)
      : [];
    const plannedIds = new Set(plannedArtifactIds);
    const renderedIds = new Set();
    const requiresObservedCohesion = value.plan?.recipe?.id === 'project-recap';
    const expectedCohesion = expectedLedgerClaims(value.plan?.ledger);
    const observedCohesion = new Set();
    if (
      requiresObservedCohesion &&
      ['terminology', 'statuses', 'numericClaims'].some(
        (group) => expectedCohesion[group].size === 0,
      )
    ) {
      add(
        errors,
        '$.plan.ledger',
        'cohesion-ledger-empty',
        'Adaptive recap review requires non-empty terminology, status, and numeric ledger entries.',
      );
    }
    for (const [index, artifact] of (Array.isArray(value.renderedArtifacts)
      ? value.renderedArtifacts
      : []
    ).entries()) {
      for (const [evidenceIndex, evidence] of (Array.isArray(artifact?.evidence)
        ? artifact.evidence
        : []
      ).entries()) {
        if (evidence?.captureIdentity !== value.captureIdentity) {
          add(
            errors,
            `$.renderedArtifacts[${index}].evidence[${evidenceIndex}].captureIdentity`,
            'browser-runtime-mismatch',
            'Every visual-review evidence record must bind the request browser capture identity.',
          );
        }
      }
      if (!plannedIds.has(artifact?.artifactId)) {
        add(
          errors,
          `$.renderedArtifacts[${index}].artifactId`,
          'unknown-artifact',
          'Rendered artifact is not present in the shared set plan.',
        );
      }
      if (renderedIds.has(artifact?.artifactId)) {
        add(
          errors,
          `$.renderedArtifacts[${index}].artifactId`,
          'duplicate-artifact',
          'Rendered artifact IDs must be unique.',
        );
      }
      renderedIds.add(artifact?.artifactId);
      const observations = Array.isArray(artifact?.cohesionObservations)
        ? artifact.cohesionObservations
        : [];
      if (requiresObservedCohesion && observations.length === 0) {
        add(
          errors,
          `$.renderedArtifacts[${index}].cohesionObservations`,
          'cohesion-observations-empty',
          'Every adaptive recap artifact must expose observed shared-ledger evidence.',
        );
      }
      for (const [observationIndex, observation] of observations.entries()) {
        if (
          observation?.artifactId !== artifact?.artifactId ||
          observation?.contentHash !== artifact?.renderedHash
        ) {
          add(
            errors,
            `$.renderedArtifacts[${index}].cohesionObservations[${observationIndex}]`,
            'cohesion-binding-mismatch',
            'Cohesion observations must bind to their artifact and exact rendered content hash.',
          );
          continue;
        }
        const expected = expectedCohesion[observation.group]?.get(
          observation.claim,
        );
        if (
          expected === undefined ||
          normalizeComparable(expected) !==
            normalizeComparable(observation.value)
        ) {
          add(
            errors,
            `$.renderedArtifacts[${index}].cohesionObservations[${observationIndex}]`,
            'cohesion-contradiction',
            'Observed cohesion evidence must match an applicable shared-ledger value.',
          );
          continue;
        }
        observedCohesion.add(`${observation.group}:${observation.claim}`);
      }
    }
    for (const artifactId of plannedArtifactIds) {
      if (!renderedIds.has(artifactId)) {
        add(
          errors,
          '$.renderedArtifacts',
          'missing-artifact',
          `Rendered review set is missing planned artifact ${artifactId}.`,
        );
      }
    }
    if (requiresObservedCohesion) {
      for (const [group, claims] of Object.entries(expectedCohesion)) {
        for (const claim of claims.keys()) {
          if (!observedCohesion.has(`${group}:${claim}`)) {
            add(
              errors,
              '$.renderedArtifacts',
              'cohesion-claim-unobserved',
              `Shared-ledger claim ${group}.${claim} is not observable in the rendered set.`,
            );
          }
        }
      }
    }
  }

  if (kind === 'visual-review-result') {
    const reviewRequest = context.visualReviewRequest;
    if (!isObject(reviewRequest)) {
      add(
        errors,
        '$',
        'review-request-required',
        'Visual review results must be validated with their reviewed request.',
      );
      return;
    }

    const requestValidation = validateContract(
      'visual-review-request',
      reviewRequest,
    );
    if (!requestValidation.valid) {
      add(
        errors,
        '$',
        'invalid-review-request',
        'Visual review result cannot bind to an invalid reviewed request.',
      );
    }
    if (
      value.requestId !== reviewRequest.requestId ||
      value.requestHash !== reviewRequest.requestHash
    ) {
      add(
        errors,
        '$.requestHash',
        'review-binding-mismatch',
        'Visual review result must echo the exact reviewed request identity and hash.',
      );
    }

    const reviewedArtifactIds = Array.isArray(reviewRequest.renderedArtifacts)
      ? reviewRequest.renderedArtifacts.map(({ artifactId }) => artifactId)
      : [];
    const reviewedIds = new Set(reviewedArtifactIds);
    const resultArtifactIds = Array.isArray(value.artifactIds)
      ? value.artifactIds
      : [];
    const resultIds = new Set(resultArtifactIds);
    if (
      resultIds.size !== reviewedIds.size ||
      reviewedArtifactIds.some((artifactId) => !resultIds.has(artifactId))
    ) {
      add(
        errors,
        '$.artifactIds',
        'review-set-mismatch',
        'Visual review result artifact IDs must equal the complete reviewed request set.',
      );
    }
    for (const [index, finding] of (Array.isArray(value.findings)
      ? value.findings
      : []
    ).entries()) {
      if (!reviewedIds.has(finding?.artifactId)) {
        add(
          errors,
          `$.findings[${index}].artifactId`,
          'detached-finding',
          'Visual review findings must reference an artifact in the reviewed request.',
        );
      }
    }
    const findingCount = Array.isArray(value.findings)
      ? value.findings.length
      : 0;
    if (
      (value.disposition === 'pass' && findingCount > 0) ||
      (['correct', 'fail'].includes(value.disposition) && findingCount === 0)
    ) {
      add(
        errors,
        '$.disposition',
        'disposition-findings-mismatch',
        'Pass requires no findings; correct and fail require at least one correction finding.',
      );
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
    const recordedImmutable = isObject(value.immutableHashes)
      ? new Set(Object.keys(value.immutableHashes))
      : new Set();
    const retainsSetPlan =
      value.recipe?.id === 'project-recap' ||
      SET_PLAN_RECORD_PATHS.some((path) => recordedImmutable.has(path));
    const expectedImmutable = new Set([
      ...requiredProvenance,
      value.source?.factBasePath,
      'source/fact-base.md',
      ...(retainsSetPlan ? SET_PLAN_RECORD_PATHS : []),
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
    if ([...expectedImmutable].some((path) => !recordedImmutable.has(path))) {
      add(
        errors,
        '$.immutableHashes',
        'immutable-package-incomplete',
        'Manifest immutable hashes must cover the complete retained fact-base, set plan, content, theme, and required built artifact package.',
      );
    }
    const hasVisualEvidence = [...recordedImmutable].some((path) =>
      path.startsWith('qa/visual-review/'),
    );
    if (
      hasVisualEvidence &&
      [
        'qa/visual-review/attempt-1/request.json',
        'qa/visual-review/attempt-1/result.json',
      ].some((path) => !recordedImmutable.has(path))
    ) {
      add(
        errors,
        '$.immutableHashes',
        'visual-review-chain-incomplete',
        'Retained visual review evidence requires its bound attempt request and result.',
      );
    }
    for (const path of recordedImmutable) {
      if (
        (path.startsWith('qa/browser/') ||
          path.includes('/visual-review/attempt-')) &&
        path.endsWith('.png') &&
        !recordedImmutable.has(path.replace(/\.png$/, '.json'))
      ) {
        add(
          errors,
          '$.immutableHashes',
          'visual-review-chain-incomplete',
          `Screenshot evidence ${path} is missing its immutable metrics record.`,
        );
      }
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
      if (
        isObject(artifact) &&
        artifact.status === 'built' &&
        typeof artifact.renderedPath === 'string'
      ) {
        expected.set(artifact.renderedPath, artifact.hash);
      }
    }
    if (
      isObject(context.catalogArtifact) &&
      typeof context.catalogArtifact.relativePath === 'string'
    ) {
      expected.set(
        context.catalogArtifact.relativePath,
        context.catalogArtifact.hash,
      );
    }
    const received = new Set();
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
      if (received.has(artifact?.relativePath)) {
        add(
          errors,
          '$.artifacts',
          'receipt-artifact-parity',
          'Publish receipt artifact paths must be unique.',
        );
      }
      received.add(artifact?.relativePath);
    }
    if (
      received.size !== expected.size ||
      [...expected.keys()].some((path) => !received.has(path))
    ) {
      add(
        errors,
        '$.artifacts',
        'receipt-artifact-parity',
        'Publish receipt must exactly cover every manifest artifact and the generated catalog.',
      );
    }
  }
}

export function visualReviewRequestPayload(request) {
  const {
    requestId: _requestId,
    requestHash: _requestHash,
    ...payload
  } = request;
  return payload;
}

export function visualReviewRequestId(requestHash) {
  return `visual-review-${String(requestHash).replace(/^sha256:/, '')}`;
}

function expectedLedgerClaims(ledger) {
  return {
    terminology: new Map(
      (ledger?.terminology ?? []).map(({ term }) => [term, term]),
    ),
    statuses: new Map(
      (ledger?.statuses ?? []).map(({ subject, value }) => [subject, value]),
    ),
    numericClaims: new Map(
      (ledger?.numbers ?? []).map(({ subject, value }) => [subject, value]),
    ),
  };
}

function normalizeComparable(value) {
  return String(value).trim().toLocaleLowerCase();
}

function validateSetPlan(value, errors) {
  const sourceIds = new Set(
    Array.isArray(value.sourceIds) ? value.sourceIds : [],
  );
  const artifactIds = new Set();
  for (const [index, artifact] of (Array.isArray(value.portfolio)
    ? value.portfolio
    : []
  ).entries()) {
    if (artifactIds.has(artifact?.artifactId)) {
      add(
        errors,
        `$.portfolio[${index}].artifactId`,
        'duplicate-artifact',
        'Set-plan artifact IDs must be unique.',
      );
    }
    artifactIds.add(artifact?.artifactId);
    for (const sourceId of Array.isArray(artifact?.sourceIds)
      ? artifact.sourceIds
      : []) {
      if (!sourceIds.has(sourceId)) {
        add(
          errors,
          `$.portfolio[${index}].sourceIds`,
          'unknown-source',
          `Artifact source ${sourceId} is not declared by the set plan.`,
        );
      }
    }
    if (artifact?.required === false && !isObject(artifact.justification)) {
      add(
        errors,
        `$.portfolio[${index}].justification`,
        'optional-justification-required',
        'Optional artifacts require a source-backed justification.',
      );
    }
    for (const sourceId of Array.isArray(artifact?.justification?.sourceIds)
      ? artifact.justification.sourceIds
      : []) {
      if (!sourceIds.has(sourceId) || !artifact.sourceIds?.includes(sourceId)) {
        add(
          errors,
          `$.portfolio[${index}].justification.sourceIds`,
          'unknown-source',
          `Justification source ${sourceId} must be declared by the plan and artifact.`,
        );
      }
    }
  }

  for (const [field, identity] of [
    ['terminology', (entry) => entry?.term],
    ['statuses', (entry) => entry?.subject],
    ['numbers', (entry) => entry?.subject],
  ]) {
    const seen = new Map();
    for (const [index, entry] of (Array.isArray(value.ledger?.[field])
      ? value.ledger[field]
      : []
    ).entries()) {
      const key = identity(entry);
      if (
        seen.has(key) &&
        canonicalStringify(seen.get(key)) !== canonicalStringify(entry)
      ) {
        add(
          errors,
          `$.ledger.${field}[${index}]`,
          'ledger-conflict',
          `Shared ledger contains conflicting values for ${key}.`,
        );
      }
      seen.set(key, entry);
    }
  }
}

function validateAuthorSetContext(value, errors) {
  if (!isObject(value.setContext) || !isObject(value.plannedArtifact)) {
    return;
  }
  const planned = Array.isArray(value.setContext.portfolio)
    ? value.setContext.portfolio.find(
        ({ artifactId }) => artifactId === value.artifactId,
      )
    : undefined;
  if (
    !planned ||
    value.plannedArtifact.artifactId !== value.artifactId ||
    value.plannedArtifact.artifactType !== value.artifactType
  ) {
    add(
      errors,
      '$.plannedArtifact',
      'set-artifact-mismatch',
      'Author request identity must match one artifact in the shared set plan.',
    );
    return;
  }
  if (!deepEqual(planned, value.plannedArtifact)) {
    add(
      errors,
      '$.plannedArtifact',
      'set-plan-drift',
      'Author request planned artifact must be identical to the shared set plan entry.',
    );
  }
}

function validateVisualAuthoringGuidance(value, errors) {
  if (typeof value.visualAuthoringGuidance !== 'string') {
    return;
  }
  const guidance = value.visualAuthoringGuidance.toLowerCase();
  const missing = [
    'representation',
    'hierarchy',
    'responsive navigation',
    'table',
    'diagram',
    'deck',
  ].filter((topic) => !guidance.includes(topic));
  if (missing.length > 0) {
    add(
      errors,
      '$.visualAuthoringGuidance',
      'malformed-authoring-guidance',
      `Visual authoring guidance is missing bundled topics: ${missing.join(', ')}.`,
    );
  }
}

function validateAuthorGraphSemantics(value, errors) {
  if (value.graphSemantics === undefined) {
    return;
  }
  if (value.authoring !== 'html' || !Array.isArray(value.graphSemantics)) {
    add(
      errors,
      '$.graphSemantics',
      'graph-semantics',
      'Planner-owned graph semantics are allowed only for artistic HTML authoring.',
    );
    return;
  }
  for (const [graphIndex, graph] of value.graphSemantics.entries()) {
    if (!isObject(graph)) continue;
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const nodeIds = nodes.map(({ id }) => id);
    const edgeIds = edges.map(({ from, to }) => `${from}\0${to}`);
    if (
      new Set(nodeIds).size !== nodeIds.length ||
      new Set(edgeIds).size !== edgeIds.length ||
      edges.some(
        ({ from, to }) => !nodeIds.includes(from) || !nodeIds.includes(to),
      )
    ) {
      add(
        errors,
        `$.graphSemantics[${graphIndex}]`,
        'graph-semantics',
        'Graph semantics require unique nodes and edges with declared endpoints.',
      );
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
