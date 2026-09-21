export const CLAUDE_MODEL_ORDER = ['haiku', 'sonnet', 'opus', 'fable'] as const;

export const CLAUDE_EFFORT_ORDER = [
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
] as const;

const CLAUDE_GENERATION_EFFORTS = {
  'fable-5-1': CLAUDE_EFFORT_ORDER,
  'fable-5': CLAUDE_EFFORT_ORDER,
  'opus-5': CLAUDE_EFFORT_ORDER,
  'sonnet-5': CLAUDE_EFFORT_ORDER,
  'opus-4-8': CLAUDE_EFFORT_ORDER,
  'opus-4-7': CLAUDE_EFFORT_ORDER,
  'opus-4-6': ['low', 'medium', 'high', 'max'],
  'sonnet-4-6': ['low', 'medium', 'high', 'max'],
} as const satisfies Record<string, readonly string[]>;

type ClaudeModelFamily = (typeof CLAUDE_MODEL_ORDER)[number];
export type ClaudeModelGeneration = keyof typeof CLAUDE_GENERATION_EFFORTS;
export type ClaudeCapabilitySource =
  | 'explicit-model-id'
  | 'family-pin-model-id'
  | 'family-pin-declaration'
  | 'alias-capability-equivalence';

export interface ClaudeCapabilityEvidence {
  source: ClaudeCapabilitySource;
  modelReference: string;
  exactModel: boolean;
  generation?: ClaudeModelGeneration;
  possibleGenerations?: ClaudeModelGeneration[];
  capabilitiesSource: string;
  supportedEfforts: string[];
}

const ALIAS_DEFAULT_ENV: Record<ClaudeModelFamily, string> = {
  haiku: 'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  sonnet: 'ANTHROPIC_DEFAULT_SONNET_MODEL',
  opus: 'ANTHROPIC_DEFAULT_OPUS_MODEL',
  fable: 'ANTHROPIC_DEFAULT_FABLE_MODEL',
};

export interface ClaudeDispatchTarget {
  model: string;
  effort?: string;
  capabilityEvidence?: ClaudeCapabilityEvidence;
}

export interface ClaudeTargetValidation {
  valid: boolean;
  reason?: string;
  capabilityEvidence?: ClaudeCapabilityEvidence;
}

function modelFamily(model: string): ClaudeModelFamily | null {
  const normalized = model.toLowerCase().replace(/\[1m\]$/u, '');
  for (const family of CLAUDE_MODEL_ORDER) {
    if (
      normalized === family ||
      new RegExp(`(?:^|[./:_-])claude-${family}(?:-|$)`, 'u').test(
        normalized,
      ) ||
      new RegExp(`(?:^|[./:_-])${family}(?:-|$)`, 'u').test(normalized)
    ) {
      return family;
    }
  }
  return null;
}

/** Extract a documented effort-capability generation from a provider model ID. */
export function claudeModelGeneration(
  model: string,
): ClaudeModelGeneration | null {
  const normalized = model.toLowerCase().replace(/\[1m\]$/u, '');
  for (const generation of Object.keys(
    CLAUDE_GENERATION_EFFORTS,
  ) as ClaudeModelGeneration[]) {
    const [family, ...versionParts] = generation.split('-');
    const version = versionParts.join('[-.]');
    const pattern = new RegExp(
      `(?:^|[./:_-])(?:claude-)?${family}-${version}(?=$|[-@.:/[])`,
      'u',
    );
    if (pattern.test(normalized)) return generation;
  }
  return null;
}

function isEnabled(value: string | undefined): boolean {
  return value === '1' || value?.toLowerCase() === 'true';
}

function generationEvidence(
  generation: ClaudeModelGeneration,
  source: Extract<
    ClaudeCapabilitySource,
    'explicit-model-id' | 'family-pin-model-id'
  >,
  modelReference: string,
  capabilitiesSource: string,
): ClaudeCapabilityEvidence {
  return {
    source,
    modelReference,
    exactModel: source === 'explicit-model-id',
    generation,
    capabilitiesSource,
    supportedEfforts: [...CLAUDE_GENERATION_EFFORTS[generation]],
  };
}

function familyPinCapabilityEvidence(
  family: ClaudeModelFamily,
  pinName: string,
  pinnedModel: string,
  env: NodeJS.ProcessEnv,
): ClaudeTargetValidation {
  const generation = claudeModelGeneration(pinnedModel);
  if (generation) {
    if (modelFamily(generation) !== family) {
      return {
        valid: false,
        reason: `Claude alias ${JSON.stringify(family)} is pinned by ${pinName}=${JSON.stringify(pinnedModel)}, but the pin belongs to another model family.`,
      };
    }
    return {
      valid: true,
      capabilityEvidence: generationEvidence(
        generation,
        'family-pin-model-id',
        pinnedModel,
        pinName,
      ),
    };
  }

  const capabilityName = `${pinName}_SUPPORTED_CAPABILITIES`;
  const declaration = env[capabilityName];
  if (!declaration) {
    return {
      valid: false,
      reason: `Claude alias ${JSON.stringify(family)} uses custom pin ${pinName}=${JSON.stringify(pinnedModel)}, but ${capabilityName} does not establish effort support.`,
    };
  }
  const capabilities = new Set(
    declaration
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
  if (!capabilities.has('effort')) {
    return {
      valid: false,
      reason: `${capabilityName} must include effort before xhigh_effort or max_effort can establish Claude effort support.`,
    };
  }
  const supportedEfforts = ['low', 'medium', 'high'];
  if (capabilities.has('xhigh_effort')) supportedEfforts.push('xhigh');
  if (capabilities.has('max_effort')) supportedEfforts.push('max');
  return {
    valid: true,
    capabilityEvidence: {
      source: 'family-pin-declaration',
      modelReference: pinnedModel,
      exactModel: false,
      capabilitiesSource: capabilityName,
      supportedEfforts,
    },
  };
}

function aliasCapabilityEvidence(
  family: ClaudeModelFamily,
  env: NodeJS.ProcessEnv,
): ClaudeTargetValidation {
  let possibleGenerations: ClaudeModelGeneration[] = [];
  let capabilitiesSource = 'claude-model-alias-and-substitution-tables';
  if (family === 'fable') {
    // Claude Code does not expose an apps-gateway discriminator to subprocesses.
    // Both documented alias destinations have the same effort capabilities.
    possibleGenerations = ['fable-5-1', 'fable-5'];
  } else if (isEnabled(env['CLAUDE_CODE_USE_FOUNDRY'])) {
    possibleGenerations = family === 'opus' ? ['opus-4-6'] : [];
    capabilitiesSource = 'claude-model-alias-table:foundry';
  } else if (
    isEnabled(env['CLAUDE_CODE_USE_BEDROCK']) ||
    isEnabled(env['CLAUDE_CODE_USE_VERTEX'])
  ) {
    possibleGenerations = family === 'opus' ? ['opus-5'] : [];
    capabilitiesSource = 'claude-model-alias-table:bedrock-agent-platform';
  } else if (isEnabled(env['CLAUDE_CODE_USE_ANTHROPIC_AWS'])) {
    possibleGenerations =
      family === 'opus'
        ? ['opus-5']
        : family === 'sonnet'
          ? ['sonnet-4-6']
          : [];
    capabilitiesSource = 'claude-model-alias-table:claude-platform-aws';
  } else if (family === 'sonnet') {
    possibleGenerations = ['sonnet-5', 'sonnet-4-6'];
  } else if (family === 'opus') {
    possibleGenerations = ['opus-5', 'opus-4-8', 'opus-4-7', 'opus-4-6'];
  }
  if (possibleGenerations.length === 0) {
    return {
      valid: false,
      reason: `Claude alias ${JSON.stringify(family)} has no documented effort-capability equivalence class. Use a versioned model ID or family pin with declared capabilities.`,
    };
  }
  const supportedEfforts = CLAUDE_EFFORT_ORDER.filter((effort) =>
    possibleGenerations.every((generation) =>
      (CLAUDE_GENERATION_EFFORTS[generation] as readonly string[]).includes(
        effort,
      ),
    ),
  );
  return {
    valid: true,
    capabilityEvidence: {
      source: 'alias-capability-equivalence',
      modelReference: `${family}-documented-substitutions`,
      exactModel: false,
      possibleGenerations,
      capabilitiesSource,
      supportedEfforts,
    },
  };
}

/** Resolve capability evidence without claiming an unobserved exact model. */
function deriveClaudeCapabilityEvidence(
  model: string,
  env: NodeJS.ProcessEnv = process.env,
): ClaudeTargetValidation {
  const requestedFamily = modelFamily(model);
  if (!requestedFamily) {
    return {
      valid: false,
      reason: `Unsupported Claude model ${JSON.stringify(model)}. Valid aliases: ${CLAUDE_MODEL_ORDER.join(', ')}; version-pinned Claude model IDs are also accepted.`,
    };
  }

  const explicitGeneration = claudeModelGeneration(model);
  if (explicitGeneration) {
    return {
      valid: true,
      capabilityEvidence: generationEvidence(
        explicitGeneration,
        'explicit-model-id',
        model,
        'dispatch-target-model',
      ),
    };
  }

  const alias = model.toLowerCase().replace(/\[1m\]$/u, '');
  if (alias !== requestedFamily) {
    return {
      valid: false,
      reason: `Cannot establish a documented Claude effort capability for model ${JSON.stringify(model)}. Use a recognized versioned model ID.`,
    };
  }

  const pinName = ALIAS_DEFAULT_ENV[requestedFamily];
  if (env['CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST']) {
    return {
      valid: false,
      reason: `Claude alias ${JSON.stringify(alias)} has a host-managed provider-dependent generation. Host-managed model configuration takes precedence over ${pinName}; use a versioned model ID in the dispatch target to establish capability.`,
    };
  }

  const pinnedModel = env[pinName];
  if (pinnedModel) {
    return familyPinCapabilityEvidence(
      requestedFamily,
      pinName,
      pinnedModel,
      env,
    );
  }

  if (env['ANTHROPIC_BASE_URL']) {
    return {
      valid: false,
      reason: `Claude alias ${JSON.stringify(alias)} has an ambiguous provider-dependent generation. Pin ${pinName} to a versioned model ID before selecting effort.`,
    };
  }

  if (isEnabled(env['CLAUDE_CODE_USE_MANTLE'])) {
    return {
      valid: false,
      reason: `Claude alias ${JSON.stringify(alias)} has no documented built-in Mantle generation mapping. Pin ${pinName} to a versioned model ID before selecting effort.`,
    };
  }

  return aliasCapabilityEvidence(requestedFamily, env);
}

/** Resolve capability evidence without claiming an unobserved exact model. */
export function resolveClaudeCapabilityEvidence(
  target: Pick<ClaudeDispatchTarget, 'model' | 'capabilityEvidence'>,
  env: NodeJS.ProcessEnv = process.env,
): ClaudeTargetValidation {
  const derived = deriveClaudeCapabilityEvidence(target.model, env);
  if (!derived.valid || !derived.capabilityEvidence) return derived;
  if (
    target.capabilityEvidence &&
    JSON.stringify(target.capabilityEvidence) !==
      JSON.stringify(derived.capabilityEvidence)
  ) {
    return {
      valid: false,
      reason:
        'Provided Claude capability evidence does not match the capability derived from the model and active provider configuration.',
      capabilityEvidence: derived.capabilityEvidence,
    };
  }
  return derived;
}

export function validateClaudeDispatchTarget(
  target: ClaudeDispatchTarget,
): ClaudeTargetValidation {
  if (!modelFamily(target.model)) {
    return {
      valid: false,
      reason: `Unsupported Claude model ${JSON.stringify(target.model)}. Valid aliases: ${CLAUDE_MODEL_ORDER.join(', ')}; version-pinned Claude model IDs are also accepted.`,
    };
  }

  if (target.effort === undefined) {
    return { valid: true };
  }

  if (!(CLAUDE_EFFORT_ORDER as readonly string[]).includes(target.effort)) {
    return {
      valid: false,
      reason: `Unsupported Claude effort ${JSON.stringify(target.effort)}. Valid values: ${CLAUDE_EFFORT_ORDER.join(', ')}.`,
    };
  }

  return { valid: true };
}

/** Validate an effort-pinned target against explicit capability evidence. */
export function validateClaudeDispatchCapability(
  target: ClaudeDispatchTarget,
  env: NodeJS.ProcessEnv = process.env,
): ClaudeTargetValidation {
  const route = validateClaudeDispatchTarget(target);
  if (!route.valid || target.effort === undefined) return route;

  const resolution = resolveClaudeCapabilityEvidence(target, env);
  if (!resolution.valid || !resolution.capabilityEvidence) return resolution;
  const evidence = resolution.capabilityEvidence;
  if (!evidence.supportedEfforts.includes(target.effort)) {
    return {
      valid: false,
      reason: `Claude capability evidence ${JSON.stringify(evidence.modelReference)} does not support effort ${JSON.stringify(target.effort)}. Supported values: ${evidence.supportedEfforts.join(', ')}.`,
      capabilityEvidence: evidence,
    };
  }
  return { valid: true, capabilityEvidence: evidence };
}

export function normalizeClaudeRoleName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\.md$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildClaudeEffortVariantName(options: {
  agentName: string;
  model: string;
  effort: string;
}): string {
  const validation = validateClaudeDispatchTarget({
    model: options.model,
    effort: options.effort,
  });
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  const agentName = normalizeClaudeRoleName(options.agentName);
  if (!agentName) {
    throw new Error('Cannot build Claude effort variant: missing agent name.');
  }

  return `${agentName}-claude-${normalizeClaudeRoleName(options.model)}-${options.effort}`;
}

export function claudeTargetRank(
  target: ClaudeDispatchTarget,
): [number, number] {
  const family = modelFamily(target.model);
  return [
    family ? CLAUDE_MODEL_ORDER.indexOf(family) : -1,
    target.effort === undefined
      ? -1
      : CLAUDE_EFFORT_ORDER.indexOf(target.effort as never),
  ];
}
