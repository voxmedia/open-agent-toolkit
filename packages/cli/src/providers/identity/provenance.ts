export type IdentityProvenance =
  | 'declared'
  | 'observed'
  | 'inferred'
  | 'unknown';

export type IdentityConfidence = 'high' | 'medium' | 'low' | 'unknown';

export interface IdentityRecord {
  value: string;
  provenance: IdentityProvenance;
  /**
   * True when the harness has been proven to reject invalid model selections
   * instead of silently falling back to another model.
   */
  rejectOnInvalid?: boolean;
}

export interface ResolvedIdentity {
  value: string;
  provenance: IdentityProvenance;
  confidence: IdentityConfidence;
  mismatch: boolean;
  diversityClaimable: boolean;
  records: IdentityRecord[];
}

const PROVENANCE_PRIORITY: Record<IdentityProvenance, number> = {
  declared: 4,
  observed: 3,
  inferred: 2,
  unknown: 1,
};

function normalizedValue(value: unknown): string {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : 'unknown';
}

function normalizeRecord(record: IdentityRecord): IdentityRecord {
  return {
    ...record,
    value: normalizedValue(record.value),
  };
}

function strongestRecord(
  records: IdentityRecord[],
  provenance: IdentityProvenance,
): IdentityRecord | undefined {
  return records.find((record) => record.provenance === provenance);
}

function strongestKnownRecord(
  records: IdentityRecord[],
): IdentityRecord | undefined {
  return records
    .filter((record) => record.value !== 'unknown')
    .sort(
      (left, right) =>
        PROVENANCE_PRIORITY[right.provenance] -
        PROVENANCE_PRIORITY[left.provenance],
    )[0];
}

function resolved(
  record: IdentityRecord,
  confidence: IdentityConfidence,
  mismatch: boolean,
  records: IdentityRecord[],
): ResolvedIdentity {
  const value = record.value;
  return {
    value,
    provenance: record.provenance,
    confidence,
    mismatch,
    diversityClaimable: value !== 'unknown',
    records,
  };
}

export function resolveIdentityConfidence(
  records: IdentityRecord[],
): ResolvedIdentity {
  const normalizedRecords = records.map(normalizeRecord);
  const declared = strongestRecord(normalizedRecords, 'declared');
  const observed = strongestRecord(normalizedRecords, 'observed');

  if (declared && observed) {
    if (declared.value === observed.value) {
      return resolved(declared, 'high', false, normalizedRecords);
    }
    return resolved(observed, 'low', true, normalizedRecords);
  }

  if (declared) {
    return resolved(
      declared,
      declared.rejectOnInvalid === true ? 'high' : 'medium',
      false,
      normalizedRecords,
    );
  }

  if (observed) {
    return resolved(observed, 'low', false, normalizedRecords);
  }

  const inferred = strongestRecord(normalizedRecords, 'inferred');
  if (inferred) {
    return resolved(inferred, 'low', false, normalizedRecords);
  }

  const fallback = strongestKnownRecord(normalizedRecords) ?? {
    value: 'unknown',
    provenance: 'unknown',
  };
  return resolved(fallback, 'unknown', false, normalizedRecords);
}
