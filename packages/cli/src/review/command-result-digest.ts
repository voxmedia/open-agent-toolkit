import { hashCanonicalJson } from './canonical-json';
import type { ReviewCommandEvidenceV1 } from './types';

export type CommandResultDigestInput = Pick<
  ReviewCommandEvidenceV1,
  'scopeRefs' | 'provenance' | 'result'
>;

export function commandResultDigest(command: CommandResultDigestInput): string {
  return hashCanonicalJson({
    scopeRefs: command.scopeRefs,
    provenance: command.provenance,
    result: command.result,
  });
}
