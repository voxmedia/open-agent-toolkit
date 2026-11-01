export const CLERICAL_SETTLEMENT_SCHEMA_VERSION = 1 as const;

export const REPAIR_KINDS = [
  'review-row metadata',
  'archived-artifact reference',
  'descriptive prose',
] as const;

export type RepairKind = (typeof REPAIR_KINDS)[number];

export const REVIEW_ROW_FIELDS = [
  'Date',
  'Artifact',
  'Reviewed Head',
  'Invocation',
  'Gate Target',
] as const;

export type ReviewRowField = (typeof REVIEW_ROW_FIELDS)[number];

export interface SettlementEvent {
  scope: string;
  type: string;
  artifact: string;
}

export interface RepairRange {
  base: string;
  head: string;
}

export type AuthoritativeSource =
  | {
      kind: 'review-artifact';
      field: 'generatedAt' | 'reviewedHead' | 'invocation' | 'gateTarget';
    }
  | {
      kind: 'gate-proof';
      path: string;
      field: 'runId' | 'target' | 'reviewedHead' | 'artifact';
    }
  | {
      kind: 'archived-artifact';
      sourcePath: string;
      archivedPath: string;
    }
  | {
      kind: 'review-row';
      field: ReviewRowField;
    };

export interface ProposalFinding {
  id: string;
  repairKind: RepairKind;
  correctedField: ReviewRowField;
  record:
    | {
        kind: 'reviews-row';
        path: 'plan.md';
      }
    | {
        kind: 'journal-field';
        path: 'implementation.md';
        heading: string;
      };
  authoritativeSource: AuthoritativeSource;
}

export interface ClericalSettlementProposal {
  schemaVersion: 1;
  mode: 'first-settlement' | 'replay';
  event: SettlementEvent;
  repairRange: RepairRange;
  receipt: string;
  findings: ProposalFinding[];
  gateProof?: string;
  goal?: {
    subject: string;
    publishedHead: string;
  };
}

export interface SettlementCheck {
  id: string;
  status: 'passed' | 'failed' | 'skipped';
  reason: string;
}

export interface SettlementFindingRecord extends ProposalFinding {
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  location: string;
}

export interface ClericalSettlementEntry {
  schemaVersion: 1;
  settlementId: string;
  event: SettlementEvent;
  receipt: {
    heading: string;
    sha256: string;
  };
  findingsComplete: true;
  findings: SettlementFindingRecord[];
  counts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  reviewedRevision: string;
  repairRange: RepairRange;
  proof: {
    artifact: {
      path: string;
      sha256: string;
      generatedAt: string;
      reviewType: 'code';
      scope: string;
      reviewedHead: string;
      invocation: string | null;
      gateRunId: string | null;
      gateTarget: string | null;
    };
    gate: {
      path: string;
      sha256: string;
      runId: string;
      target: string;
      reviewedHead: string;
      artifact: string;
    } | null;
  };
}

export interface ClericalSettlementReport {
  schemaVersion: 1;
  status: 'verified' | 'refused' | 'error';
  mode: 'first-settlement' | 'replay' | null;
  event: SettlementEvent | null;
  repairRange: RepairRange | null;
  checks: SettlementCheck[];
  settlement: ClericalSettlementEntry | null;
  reason: string | null;
}
