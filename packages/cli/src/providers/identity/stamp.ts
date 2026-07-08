import type { IdentityProvenance } from './provenance';

export type DispatchAction = 'implementation' | 'fix' | 'review';
export type DispatchRole = 'implementer' | 'fix' | 'reviewer';

export interface DispatchStampRecord {
  scope: string;
  action: DispatchAction;
  role: DispatchRole;
  producer: string;
  provenance: IdentityProvenance;
  modelAxis: string;
  effortAxis: string;
  dispatchPolicy: string;
  dispatchCeiling: string;
  target: string;
}

export interface DispatchStamp extends DispatchStampRecord {
  line: string;
  lineNumber: number;
  legacy: boolean;
}

export interface ProducerIdentity {
  scope: string;
  action: DispatchAction;
  role: DispatchRole;
  producer: string;
  provenance: IdentityProvenance;
  target: string;
}

export interface ParseDispatchStampsOptions {
  onWarning?: (warning: string) => void;
}

const ACTIONS = new Set<DispatchAction>(['implementation', 'fix', 'review']);
const ROLES = new Set<DispatchRole>(['implementer', 'fix', 'reviewer']);
const PROVENANCES = new Set<IdentityProvenance>([
  'declared',
  'observed',
  'inferred',
  'unknown',
]);

const FIELD_ORDER: Array<[keyof DispatchStampRecord, string]> = [
  ['scope', 'scope'],
  ['action', 'action'],
  ['role', 'role'],
  ['producer', 'producer'],
  ['provenance', 'provenance'],
  ['modelAxis', 'model_axis'],
  ['effortAxis', 'effort_axis'],
  ['dispatchPolicy', 'dispatch_policy'],
  ['dispatchCeiling', 'dispatch_ceiling'],
  ['target', 'target'],
];

function singleToken(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 && /^\S+$/.test(trimmed) ? trimmed : fallback;
}

function normalizeAction(
  value: string | undefined,
): DispatchAction | undefined {
  return ACTIONS.has(value as DispatchAction)
    ? (value as DispatchAction)
    : undefined;
}

function normalizeRole(value: string | undefined): DispatchRole | undefined {
  return ROLES.has(value as DispatchRole) ? (value as DispatchRole) : undefined;
}

function normalizeProvenance(value: string | undefined): IdentityProvenance {
  return PROVENANCES.has(value as IdentityProvenance)
    ? (value as IdentityProvenance)
    : 'unknown';
}

function inferRole(action: DispatchAction): DispatchRole {
  if (action === 'review') {
    return 'reviewer';
  }
  if (action === 'fix') {
    return 'fix';
  }
  return 'implementer';
}

export function formatDispatchStamp(record: DispatchStampRecord): string {
  const normalized: DispatchStampRecord = {
    scope: singleToken(record.scope, 'unknown'),
    action: record.action,
    role: record.role,
    producer: singleToken(record.producer, 'unknown'),
    provenance: normalizeProvenance(record.provenance),
    modelAxis: singleToken(record.modelAxis, 'unknown'),
    effortAxis: singleToken(record.effortAxis, 'unknown'),
    dispatchPolicy: singleToken(record.dispatchPolicy, 'unknown'),
    dispatchCeiling: singleToken(record.dispatchCeiling, 'none'),
    target: singleToken(record.target, 'unknown'),
  };

  return `Dispatch: ${FIELD_ORDER.map(
    ([property, key]) => `${key}=${normalized[property]}`,
  ).join(' ')}`;
}

function tokenMap(tokens: string[]): Map<string, string> {
  const fields = new Map<string, string>();
  for (const token of tokens) {
    const sanitized = token.replace(/,$/, '');
    const match = sanitized.match(/^([a-z_]+)=(.+)$/);
    const key = match?.[1];
    const value = match?.[2];
    if (key && value) {
      fields.set(key, value);
    }
  }
  return fields;
}

function dispatchPayload(line: string): string | undefined {
  const match = line.match(/\bDispatch:\s*(.+)$/);
  return match?.[1]?.trim();
}

function warn(
  options: ParseDispatchStampsOptions,
  lineNumber: number,
  reason: string,
): void {
  options.onWarning?.(
    `Skipped malformed Dispatch line ${lineNumber}: ${reason}`,
  );
}

function parseModernStamp(
  line: string,
  lineNumber: number,
  fields: Map<string, string>,
  options: ParseDispatchStampsOptions,
): DispatchStamp | undefined {
  const action = normalizeAction(fields.get('action'));
  if (!action) {
    warn(options, lineNumber, 'missing or invalid action');
    return undefined;
  }
  const role = normalizeRole(fields.get('role'));
  if (!role) {
    warn(options, lineNumber, 'missing or invalid role');
    return undefined;
  }
  const scope = singleToken(fields.get('scope'), '');
  if (!scope) {
    warn(options, lineNumber, 'missing scope');
    return undefined;
  }

  return {
    scope,
    action,
    role,
    producer: singleToken(fields.get('producer'), 'unknown'),
    provenance: normalizeProvenance(fields.get('provenance')),
    modelAxis: singleToken(fields.get('model_axis'), 'unknown'),
    effortAxis: singleToken(fields.get('effort_axis'), 'unknown'),
    dispatchPolicy: singleToken(fields.get('dispatch_policy'), 'unknown'),
    dispatchCeiling: singleToken(fields.get('dispatch_ceiling'), 'none'),
    target: singleToken(fields.get('target'), 'unknown'),
    line,
    lineNumber,
    legacy: false,
  };
}

function parseLegacyStamp(
  line: string,
  lineNumber: number,
  tokens: string[],
  fields: Map<string, string>,
  options: ParseDispatchStampsOptions,
): DispatchStamp | undefined {
  const scope = singleToken(tokens[0], '');
  const action = normalizeAction(tokens[1]);
  if (!scope || !action) {
    warn(options, lineNumber, 'missing legacy scope/action');
    return undefined;
  }

  return {
    scope,
    action,
    role: inferRole(action),
    producer: 'unknown',
    provenance: 'unknown',
    modelAxis: singleToken(fields.get('model_axis'), 'unknown'),
    effortAxis: singleToken(fields.get('effort_axis'), 'unknown'),
    dispatchPolicy: singleToken(fields.get('dispatch_policy'), 'unknown'),
    dispatchCeiling: singleToken(fields.get('dispatch_ceiling'), 'none'),
    target: singleToken(fields.get('target'), 'unknown'),
    line,
    lineNumber,
    legacy: true,
  };
}

export function parseDispatchStamps(
  markdown: string,
  options: ParseDispatchStampsOptions = {},
): DispatchStamp[] {
  const stamps: DispatchStamp[] = [];
  const lines = markdown.split(/\r?\n/);

  lines.forEach((line, index) => {
    const payload = dispatchPayload(line);
    if (!payload) {
      return;
    }

    const tokens = payload.split(/\s+/);
    const fields = tokenMap(tokens);
    const stamp = fields.has('scope')
      ? parseModernStamp(line, index + 1, fields, options)
      : parseLegacyStamp(line, index + 1, tokens, fields, options);
    if (stamp) {
      stamps.push(stamp);
    }
  });

  return stamps;
}

export function getProducerIdentitiesByScope(
  markdown: string,
  options: ParseDispatchStampsOptions = {},
): Record<string, ProducerIdentity[]> {
  const grouped: Record<string, ProducerIdentity[]> = {};
  for (const stamp of parseDispatchStamps(markdown, options)) {
    const identities = grouped[stamp.scope] ?? [];
    identities.push({
      scope: stamp.scope,
      action: stamp.action,
      role: stamp.role,
      producer: stamp.producer,
      provenance: stamp.provenance,
      target: stamp.target,
    });
    grouped[stamp.scope] = identities;
  }
  return grouped;
}
