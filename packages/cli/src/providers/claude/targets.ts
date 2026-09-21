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

const ALIAS_DEFAULT_ENV: Record<ClaudeModelFamily, string> = {
  haiku: 'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  sonnet: 'ANTHROPIC_DEFAULT_SONNET_MODEL',
  opus: 'ANTHROPIC_DEFAULT_OPUS_MODEL',
  fable: 'ANTHROPIC_DEFAULT_FABLE_MODEL',
};

export interface ClaudeDispatchTarget {
  model: string;
  effort?: string;
  resolvedModel?: string;
}

export interface ClaudeTargetValidation {
  valid: boolean;
  reason?: string;
  resolvedModel?: ClaudeModelGeneration;
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

function builtInAliasGeneration(
  family: ClaudeModelFamily,
  env: NodeJS.ProcessEnv,
): ClaudeModelGeneration | null {
  if (family === 'haiku') return null;
  if (family === 'fable') return 'fable-5-1';
  if (isEnabled(env['CLAUDE_CODE_USE_FOUNDRY'])) {
    return family === 'opus' ? 'opus-4-6' : null;
  }
  if (
    isEnabled(env['CLAUDE_CODE_USE_BEDROCK']) ||
    isEnabled(env['CLAUDE_CODE_USE_VERTEX'])
  ) {
    return family === 'opus' ? 'opus-5' : null;
  }
  if (isEnabled(env['CLAUDE_CODE_USE_ANTHROPIC_AWS'])) {
    return family === 'opus' ? 'opus-5' : 'sonnet-4-6';
  }
  return family === 'opus' ? 'opus-5' : 'sonnet-5';
}

function ambiguousProviderEnvironment(env: NodeJS.ProcessEnv): boolean {
  return Boolean(env['ANTHROPIC_BASE_URL']);
}

/** Resolve an alias or model ID to the generation used for capability checks. */
export function resolveClaudeModelGeneration(
  target: Pick<ClaudeDispatchTarget, 'model' | 'resolvedModel'>,
  env: NodeJS.ProcessEnv = process.env,
): ClaudeTargetValidation {
  const requestedFamily = modelFamily(target.model);
  if (!requestedFamily) {
    return {
      valid: false,
      reason: `Unsupported Claude model ${JSON.stringify(target.model)}. Valid aliases: ${CLAUDE_MODEL_ORDER.join(', ')}; version-pinned Claude model IDs are also accepted.`,
    };
  }

  const explicitModel = target.resolvedModel ?? target.model;
  const explicitGeneration = claudeModelGeneration(explicitModel);
  if (explicitGeneration) {
    if (modelFamily(explicitGeneration) !== requestedFamily) {
      return {
        valid: false,
        reason: `Resolved Claude model ${JSON.stringify(explicitModel)} does not match requested family ${JSON.stringify(requestedFamily)}.`,
      };
    }
    return { valid: true, resolvedModel: explicitGeneration };
  }

  if (target.resolvedModel) {
    return {
      valid: false,
      reason: `Cannot establish a documented Claude effort capability for resolved model ${JSON.stringify(target.resolvedModel)}. Pin a recognized versioned model ID.`,
    };
  }

  const alias = target.model.toLowerCase().replace(/\[1m\]$/u, '');
  if (alias !== requestedFamily) {
    return {
      valid: false,
      reason: `Cannot establish a documented Claude effort capability for model ${JSON.stringify(target.model)}. Use a recognized versioned model ID.`,
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
    const pinnedGeneration = claudeModelGeneration(pinnedModel);
    if (
      !pinnedGeneration ||
      modelFamily(pinnedGeneration) !== requestedFamily
    ) {
      return {
        valid: false,
        reason: `Claude alias ${JSON.stringify(alias)} is pinned by ${pinName}=${JSON.stringify(pinnedModel)}, but OAT cannot establish its model generation and effort capability.`,
      };
    }
    return { valid: true, resolvedModel: pinnedGeneration };
  }

  if (ambiguousProviderEnvironment(env)) {
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

  const builtIn = builtInAliasGeneration(requestedFamily, env);
  if (!builtIn) {
    return {
      valid: false,
      reason: `Claude alias ${JSON.stringify(alias)} does not resolve to a model with documented effort support for this provider. Pin ${pinName} to a supported versioned model ID.`,
    };
  }
  return { valid: true, resolvedModel: builtIn };
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

/** Validate an effort-pinned target against its concrete model generation. */
export function validateClaudeDispatchCapability(
  target: ClaudeDispatchTarget,
  env: NodeJS.ProcessEnv = process.env,
): ClaudeTargetValidation {
  const route = validateClaudeDispatchTarget(target);
  if (!route.valid || target.effort === undefined) return route;

  const resolution = resolveClaudeModelGeneration(target, env);
  if (!resolution.valid || !resolution.resolvedModel) return resolution;
  const supported = CLAUDE_GENERATION_EFFORTS[resolution.resolvedModel];
  if (!(supported as readonly string[]).includes(target.effort)) {
    return {
      valid: false,
      reason: `Claude model ${JSON.stringify(resolution.resolvedModel)} does not support effort ${JSON.stringify(target.effort)}. Supported values: ${supported.join(', ')}.`,
      resolvedModel: resolution.resolvedModel,
    };
  }
  return { valid: true, resolvedModel: resolution.resolvedModel };
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
