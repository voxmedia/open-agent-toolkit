export type ReviewInvocation = 'manual' | 'auto' | 'gate';
export type ReviewSink = 'artifact' | 'structured';
export type ReviewProgress =
  | 'prepared'
  | 'artifacts_loaded'
  | 'plan_validated'
  | 'evidence_started'
  | 'accounting_repair'
  | 'accepted'
  | 'terminal';
export type ReviewErrorCategory =
  | 'input'
  | 'contract'
  | 'validation'
  | 'system';

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface ReviewCliError {
  category: ReviewErrorCategory;
  code: string;
  message: string;
  details: JsonValue;
}

export type ReviewCliEnvelope<T> =
  | {
      ok: true;
      result: T;
    }
  | {
      ok: false;
      error: ReviewCliError;
      result?: T;
    };
