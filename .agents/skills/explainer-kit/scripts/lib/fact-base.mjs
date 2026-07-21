import { canonicalHash, validateContract } from './contracts.mjs';

const FACT_BASE_VERSION = 'explainer-kit.fact-base/v1';
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const SECTION_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FINDING_REASONS = new Set([
  'contradictory',
  'stale',
  'missing-evidence',
  'needs-confirmation',
]);

export async function processFactBase(binding, options = {}) {
  assertBinding(binding);
  const now = options.now ?? new Date().toISOString();

  if (binding.mode === 'supplied') {
    return processSupplied(binding, {
      now,
      maxAgeMs: options.maxAgeMs ?? DEFAULT_MAX_AGE_MS,
    });
  }

  if (typeof options.critic !== 'function') {
    throw new Error(
      'Federated fact-base processing requires a provider-neutral critic callback.',
    );
  }

  return processFederated(binding, { critic: options.critic, now });
}

function processSupplied(binding, { now, maxAgeMs }) {
  const factBase = structuredClone(binding.factBase);
  if (!factBase || typeof factBase !== 'object') {
    throw new Error('Supplied mode requires a factBase object.');
  }
  if (
    factBase.mode !== 'supplied' ||
    factBase.freshnessPolicy !== binding.freshnessPolicy
  ) {
    throw new Error(
      'Supplied fact base mode and freshness policy must match its binding.',
    );
  }

  assertValidFactBase(factBase);
  assertCitationConsistency(factBase);

  const nowMs = Date.parse(now);
  const staleInputs = [
    { label: 'fact base', timestamp: factBase.generatedAt },
    ...factBase.sources
      .filter(({ observedAt }) => observedAt)
      .map(({ id, observedAt }) => ({
        label: `source ${id}`,
        timestamp: observedAt,
      })),
  ].filter(({ timestamp }) => {
    const ageMs = nowMs - Date.parse(timestamp);
    return Number.isFinite(ageMs) && ageMs > maxAgeMs;
  });

  return {
    factBase,
    checks: {
      kind: 'lightweight-consistency-freshness',
      consistency: 'passed',
      freshness: staleInputs.length > 0 ? 'warned' : 'passed',
      warnings: staleInputs.map(
        ({ label, timestamp }) =>
          `Supplied ${label} is stale: ${timestamp} exceeds the ${maxAgeMs}ms freshness window.`,
      ),
    },
    critic: {
      invoked: false,
      reason: 'supplied-mode-lightweight-check-only',
    },
  };
}

async function processFederated(binding, { critic, now }) {
  const documents = binding.sourceDocuments;
  if (!Array.isArray(documents) || documents.length === 0) {
    throw new Error(
      'Federated mode requires at least one source document with claims.',
    );
  }

  const sources = documents.map(({ source }) => structuredClone(source));
  assertUniqueNonEmptyIds(sources, 'source');
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const observations = collectObservations(documents, sourceById);
  const overrides = normalizeOverrides(binding.overrides ?? []);
  const overrideByClaim = new Map(
    overrides.map((override) => [override.claimId, override]),
  );

  const claims = [];
  const unresolvedClaims = [];
  for (const [claimId, entries] of [...observations].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const override = overrideByClaim.get(claimId);
    if (override) {
      claims.push({
        id: claimId,
        text: override.decision,
        status: 'overridden',
        citations: citationsFor(entries),
        ...sectionMetadata(entries),
      });
      continue;
    }

    const resolved = resolveObservations(claimId, entries);
    if (resolved.status === 'confirmed') {
      claims.push(resolved.claim);
    } else {
      unresolvedClaims.push(resolved.claim);
    }
  }

  for (const override of overrides) {
    if (!observations.has(override.claimId)) {
      throw new Error(
        `Operator override references unknown claim ${override.claimId}.`,
      );
    }
  }

  const criticRequest = {
    freshnessPolicy: binding.freshnessPolicy,
    sources: structuredClone(sources),
    claims: structuredClone(claims),
    overrides: structuredClone(overrides),
  };
  const criticResult = await critic(criticRequest);
  const criticProvenance = validateCriticResult(criticResult, now, sources);
  sources.push(criticProvenance.source);

  integrateCriticFindings({
    findings: criticResult.findings,
    claims,
    unresolvedClaims,
    overrides: overrideByClaim,
    sourceById: new Map(sources.map((source) => [source.id, source])),
    criticSourceId: criticProvenance.source.id,
  });

  const factBase = {
    schemaVersion: FACT_BASE_VERSION,
    generatedAt: now,
    mode: 'federated',
    freshnessPolicy: binding.freshnessPolicy,
    sources,
    claims: claims.sort(byId),
    unresolvedClaims: unresolvedClaims.sort(byId),
    overrides,
  };
  assertValidFactBase(factBase);
  assertCitationConsistency(factBase);

  return {
    factBase,
    checks: {
      kind: 'federated-reconciliation',
      consistency: 'passed',
      freshness: 'passed',
      warnings: [],
    },
    critic: criticProvenance.record,
  };
}

function assertBinding(binding) {
  if (!binding || typeof binding !== 'object') {
    throw new Error('Fact-base binding must be an object.');
  }
  if (!['supplied', 'federated'].includes(binding.mode)) {
    throw new Error(`Unsupported fact-base mode: ${binding.mode}`);
  }
  if (binding.freshnessPolicy !== 'live-wins') {
    throw new Error('Fact-base freshnessPolicy must be live-wins.');
  }
}

function assertValidFactBase(factBase) {
  const validation = validateContract('fact-base', factBase);
  if (!validation.valid) {
    throw new Error(
      `Invalid fact-base contract: ${validation.errors
        .map(({ path, message }) => `${path}: ${message}`)
        .join('; ')}`,
    );
  }
}

function assertCitationConsistency(factBase) {
  const sourceIds = new Set(factBase.sources.map(({ id }) => id));
  assertUniqueNonEmptyIds(factBase.sources, 'source');
  assertUniqueNonEmptyIds(
    [...factBase.claims, ...factBase.unresolvedClaims],
    'claim',
  );

  for (const claim of [...factBase.claims, ...factBase.unresolvedClaims]) {
    for (const citation of claim.citations) {
      if (!sourceIds.has(citation.sourceId)) {
        throw new Error(
          `Claim ${claim.id} cites unknown source ${citation.sourceId}.`,
        );
      }
    }
  }

  for (const override of factBase.overrides) {
    if (!factBase.claims.some(({ id }) => id === override.claimId)) {
      throw new Error(
        `Override references unknown confirmed claim ${override.claimId}.`,
      );
    }
  }
}

function assertUniqueNonEmptyIds(values, label) {
  const ids = values.map(({ id }) => id);
  if (
    ids.some((id) => typeof id !== 'string' || id.length === 0) ||
    new Set(ids).size !== ids.length
  ) {
    throw new Error(`${label} IDs must be non-empty and unique.`);
  }
}

function collectObservations(documents, sourceById) {
  const observations = new Map();
  for (const document of documents) {
    if (
      !document ||
      typeof document !== 'object' ||
      !document.source ||
      !sourceById.has(document.source.id)
    ) {
      throw new Error('Every source document requires a valid source.');
    }
    if (!Array.isArray(document.claims)) {
      throw new Error(`Source ${document.source.id} requires a claims array.`);
    }
    for (const claim of document.claims) {
      if (
        !claim ||
        typeof claim.id !== 'string' ||
        claim.id.length === 0 ||
        typeof claim.text !== 'string' ||
        claim.text.length === 0 ||
        !validSections(claim.sections)
      ) {
        throw new Error(
          `Source ${document.source.id} contains an invalid claim.`,
        );
      }
      const entries = observations.get(claim.id) ?? [];
      entries.push({
        claimId: claim.id,
        text: claim.text,
        source: sourceById.get(document.source.id),
        locator: claim.locator ?? document.source.locator,
        ...(claim.sections && { sections: [...claim.sections] }),
      });
      observations.set(claim.id, entries);
    }
  }
  return observations;
}

function normalizeOverrides(overrides) {
  const normalized = structuredClone(overrides);
  const claimIds = normalized.map(({ claimId }) => claimId);
  if (new Set(claimIds).size !== claimIds.length) {
    throw new Error('Operator overrides must have unique claim IDs.');
  }
  for (const override of normalized) {
    if (
      typeof override.claimId !== 'string' ||
      override.claimId.length === 0 ||
      typeof override.decision !== 'string' ||
      override.decision.length === 0 ||
      Number.isNaN(Date.parse(override.confirmedAt))
    ) {
      throw new Error('Operator override is invalid.');
    }
  }
  return normalized.sort((left, right) =>
    left.claimId.localeCompare(right.claimId),
  );
}

function resolveObservations(claimId, entries) {
  const byText = new Map();
  for (const entry of entries) {
    const values = byText.get(entry.text) ?? [];
    values.push(entry);
    byText.set(entry.text, values);
  }
  if (byText.size === 1) {
    return {
      status: 'confirmed',
      claim: {
        id: claimId,
        text: entries[0].text,
        status: 'confirmed',
        citations: citationsFor(entries),
        ...sectionMetadata(entries),
      },
    };
  }

  const ranked = entries
    .map((entry, index) => ({
      entry,
      index,
      authoritative:
        entry.source.authoritativeFor?.includes(claimId) === true ? 1 : 0,
      observedAt: Date.parse(entry.source.observedAt ?? '') || 0,
    }))
    .sort(
      (left, right) =>
        right.authoritative - left.authoritative ||
        right.observedAt - left.observedAt ||
        left.index - right.index,
    );
  const winner = ranked[0];
  const runnerUp = ranked[1];
  const decisive =
    winner.authoritative > runnerUp.authoritative ||
    winner.observedAt > runnerUp.observedAt;

  if (decisive) {
    return {
      status: 'confirmed',
      claim: {
        id: claimId,
        text: winner.entry.text,
        status: 'confirmed',
        citations: citationsFor(
          entries.filter(({ text }) => text === winner.entry.text),
        ),
        ...sectionMetadata(
          entries.filter(({ text }) => text === winner.entry.text),
        ),
      },
    };
  }

  return {
    status: 'unresolved',
    claim: {
      id: claimId,
      text: `Conflicting values: ${[...byText.keys()].sort().join(' | ')}`,
      reason: 'contradictory',
      citations: citationsFor(entries),
      ...sectionMetadata(entries),
    },
  };
}

function citationsFor(entries) {
  const citations = entries.map(({ source, locator }) => ({
    sourceId: source.id,
    locator,
  }));
  return uniqueCitations(citations);
}

function validateCriticResult(result, now, sources) {
  if (
    !result ||
    typeof result !== 'object' ||
    typeof result.criticId !== 'string' ||
    !/^[a-z0-9][a-z0-9._-]*$/.test(result.criticId) ||
    !Array.isArray(result.findings)
  ) {
    throw new Error(
      'Critic callback must return criticId and a findings array.',
    );
  }
  const executedAt = result.executedAt ?? now;
  if (Number.isNaN(Date.parse(executedAt))) {
    throw new Error('Critic executedAt must be an ISO timestamp.');
  }
  const sourceId = `critic:${result.criticId}`;
  if (sources.some(({ id }) => id === sourceId)) {
    throw new Error(`Critic provenance source ID collides: ${sourceId}.`);
  }
  const resultHash = canonicalHash(result);
  return {
    source: {
      id: sourceId,
      kind: 'other',
      locator: `critic-callback:${result.criticId}`,
      hash: resultHash,
      observedAt: executedAt,
    },
    record: {
      invoked: true,
      criticId: result.criticId,
      executedAt,
      sourceId,
      resultHash,
    },
  };
}

function integrateCriticFindings({
  findings,
  claims,
  unresolvedClaims,
  overrides,
  sourceById,
  criticSourceId,
}) {
  for (const finding of findings) {
    validateFinding(finding, sourceById);
    if (overrides.has(finding.claimId)) {
      continue;
    }

    const citations = uniqueCitations([
      {
        sourceId: criticSourceId,
        locator: `critic-finding:${finding.claimId}`,
      },
      ...finding.sourceIds.map((sourceId) => ({
        sourceId,
        locator: sourceById.get(sourceId).locator,
      })),
    ]);
    const existingUnresolved = unresolvedClaims.find(
      ({ id }) => id === finding.claimId,
    );
    if (existingUnresolved) {
      existingUnresolved.reason = finding.classification;
      existingUnresolved.text = finding.text;
      existingUnresolved.citations = uniqueCitations([
        ...existingUnresolved.citations,
        ...citations,
      ]);
      continue;
    }

    const claimIndex = claims.findIndex(({ id }) => id === finding.claimId);
    const existingClaim = claimIndex >= 0 ? claims[claimIndex] : null;
    if (claimIndex >= 0) {
      claims.splice(claimIndex, 1);
    }
    unresolvedClaims.push({
      id: finding.claimId,
      text: finding.text,
      reason: finding.classification,
      citations,
      ...(existingClaim?.sections && { sections: existingClaim.sections }),
    });
  }
}

function validateFinding(finding, sourceById) {
  if (
    !finding ||
    typeof finding.claimId !== 'string' ||
    finding.claimId.length === 0 ||
    typeof finding.text !== 'string' ||
    finding.text.length === 0 ||
    !FINDING_REASONS.has(finding.classification) ||
    !Array.isArray(finding.sourceIds)
  ) {
    throw new Error('Critic returned an invalid finding.');
  }
  for (const sourceId of finding.sourceIds) {
    if (!sourceById.has(sourceId)) {
      throw new Error(`Critic finding cites unknown source ${sourceId}.`);
    }
  }
}

function uniqueCitations(citations) {
  return [
    ...new Map(
      citations
        .sort(
          (left, right) =>
            left.sourceId.localeCompare(right.sourceId) ||
            left.locator.localeCompare(right.locator),
        )
        .map((citation) => [
          `${citation.sourceId}\0${citation.locator}`,
          citation,
        ]),
    ).values(),
  ];
}

function validSections(sections) {
  return (
    sections === undefined ||
    (Array.isArray(sections) &&
      sections.length > 0 &&
      new Set(sections).size === sections.length &&
      sections.every(
        (section) =>
          typeof section === 'string' && SECTION_ID_PATTERN.test(section),
      ))
  );
}

function sectionMetadata(entries) {
  if (entries.some(({ sections }) => sections === undefined)) {
    return {};
  }
  const sections = [
    ...new Set(entries.flatMap((entry) => entry.sections ?? [])),
  ].sort();
  return sections.length > 0 ? { sections } : {};
}

function byId(left, right) {
  return left.id.localeCompare(right.id);
}
