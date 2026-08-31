import type { OatPjmRemoteDescriptionMode } from '@config/oat-config';

import type { FieldDirection, SharedRemoteField } from './purpose-policy';

export type ReconciliationClass =
  | 'no-change'
  | 'local-only'
  | 'remote-only'
  | 'converged'
  | 'disjoint'
  | 'conflict'
  | 'remote-anomaly'
  | 'uncertain-operation';

export type ReconciliationDirection =
  | 'inbound'
  | 'outbound'
  | 'none'
  | 'choice-required';

export type RemoteLifecycleCondition =
  | 'active'
  | 'archived'
  | 'moved'
  | 'missing-or-invisible'
  | 'deleted-confirmed'
  | 'temporarily-unavailable';

export interface SharedFieldValues {
  title: string | null;
  description: string | null;
  priority: string | null;
}

export interface ReconciliationInput {
  base: SharedFieldValues;
  local: SharedFieldValues;
  remote: SharedFieldValues;
  fieldDirections: Record<SharedRemoteField, readonly FieldDirection[]>;
  descriptionMode: OatPjmRemoteDescriptionMode;
  priorityMapping: boolean;
  remoteLifecycle: RemoteLifecycleCondition;
  uncertainOperation: boolean;
}

export interface FieldReconciliation {
  field: SharedRemoteField;
  base: string | null;
  local: string | null;
  remote: string | null;
  classification: Exclude<
    ReconciliationClass,
    'disjoint' | 'remote-anomaly' | 'uncertain-operation'
  >;
  proposedDirection: ReconciliationDirection;
}

export interface BindingReconciliationPreview {
  classification: ReconciliationClass;
  fields: {
    title: FieldReconciliation;
    description: FieldReconciliation & {
      scope: 'none' | 'managed-section' | 'full';
    };
    priority?: FieldReconciliation;
  };
  choiceRequired: boolean;
  blockedBy: string[];
}

export function reconcileBinding(
  input: ReconciliationInput,
): BindingReconciliationPreview {
  const blockedBy: string[] = [];
  if (!input.priorityMapping) {
    blockedBy.push('priority-mapping-unavailable');
  }

  const title = reconcileField('title', input);
  const description = {
    ...reconcileField('description', input),
    scope: descriptionScope(input.descriptionMode),
  };
  if (
    input.descriptionMode === 'none' &&
    description.proposedDirection === 'outbound'
  ) {
    description.proposedDirection = 'none';
  }
  const priority = input.priorityMapping
    ? reconcileField('priority', input)
    : undefined;
  const fieldList = [title, description, ...(priority ? [priority] : [])];

  let classification = classifyBinding(fieldList);
  if (input.uncertainOperation) {
    classification = 'uncertain-operation';
    blockedBy.unshift('uncertain-operation');
    blockDirections(fieldList);
  } else if (input.remoteLifecycle !== 'active') {
    classification = 'remote-anomaly';
    blockedBy.unshift(`remote-lifecycle:${input.remoteLifecycle}`);
    blockDirections(fieldList);
  }

  return {
    classification,
    fields: {
      title,
      description,
      ...(priority ? { priority } : {}),
    },
    choiceRequired: fieldList.some(
      (field) => field.proposedDirection === 'choice-required',
    ),
    blockedBy,
  };
}

function reconcileField(
  field: SharedRemoteField,
  input: ReconciliationInput,
): FieldReconciliation {
  const base = input.base[field];
  const local = input.local[field];
  const remote = input.remote[field];
  const classification = classifyField(base, local, remote);

  return {
    field,
    base,
    local,
    remote,
    classification,
    proposedDirection: proposedDirection(
      classification,
      input.fieldDirections[field],
    ),
  };
}

function classifyField(
  base: string | null,
  local: string | null,
  remote: string | null,
): FieldReconciliation['classification'] {
  if (local === remote) return local === base ? 'no-change' : 'converged';
  const localChanged = local !== base;
  const remoteChanged = remote !== base;
  if (localChanged && remoteChanged) return 'conflict';
  if (localChanged) return 'local-only';
  if (remoteChanged) return 'remote-only';
  return 'no-change';
}

function proposedDirection(
  classification: FieldReconciliation['classification'],
  allowed: readonly FieldDirection[],
): ReconciliationDirection {
  if (classification === 'conflict') return 'choice-required';
  if (classification === 'local-only' && allowed.includes('outbound')) {
    return 'outbound';
  }
  if (classification === 'remote-only' && allowed.includes('inbound')) {
    return 'inbound';
  }
  return 'none';
}

function classifyBinding(
  fields: readonly FieldReconciliation[],
): ReconciliationClass {
  const classes = new Set(fields.map((field) => field.classification));
  if (classes.has('conflict')) return 'conflict';
  if (classes.has('local-only') && classes.has('remote-only'))
    return 'disjoint';
  if (classes.has('local-only')) return 'local-only';
  if (classes.has('remote-only')) return 'remote-only';
  if (classes.has('converged')) return 'converged';
  return 'no-change';
}

function descriptionScope(
  mode: OatPjmRemoteDescriptionMode,
): 'none' | 'managed-section' | 'full' {
  if (mode === 'replace') return 'full';
  return mode;
}

function blockDirections(fields: FieldReconciliation[]): void {
  for (const field of fields) field.proposedDirection = 'none';
}
