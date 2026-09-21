export const CLAUDE_MODEL_ORDER = ['haiku', 'sonnet', 'opus', 'fable'] as const;

export const CLAUDE_EFFORT_ORDER = [
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
] as const;

const CLAUDE_MODEL_EFFORTS: Record<string, readonly string[]> = {
  haiku: [],
  sonnet: ['medium', 'high'],
  opus: ['medium', 'high', 'xhigh', 'max'],
  fable: ['high', 'xhigh', 'max'],
};

export interface ClaudeDispatchTarget {
  model: string;
  effort?: string;
}

export interface ClaudeTargetValidation {
  valid: boolean;
  reason?: string;
}

export function validateClaudeDispatchTarget(
  target: ClaudeDispatchTarget,
): ClaudeTargetValidation {
  if (!(CLAUDE_MODEL_ORDER as readonly string[]).includes(target.model)) {
    return {
      valid: false,
      reason: `Unsupported Claude model ${JSON.stringify(target.model)}. Valid values: ${CLAUDE_MODEL_ORDER.join(', ')}.`,
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

  if (!CLAUDE_MODEL_EFFORTS[target.model]!.includes(target.effort)) {
    return {
      valid: false,
      reason: `Claude model ${JSON.stringify(target.model)} does not support effort ${JSON.stringify(target.effort)}.`,
    };
  }

  return { valid: true };
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

  return `${agentName}-claude-${options.model}-${options.effort}`;
}

export function claudeTargetRank(
  target: ClaudeDispatchTarget,
): [number, number] {
  return [
    CLAUDE_MODEL_ORDER.indexOf(target.model as never),
    target.effort === undefined
      ? -1
      : CLAUDE_EFFORT_ORDER.indexOf(target.effort as never),
  ];
}
