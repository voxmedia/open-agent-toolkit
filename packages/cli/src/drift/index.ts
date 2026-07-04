export { detectDrift } from './detector';
export type { CopyTransform } from './detector';
export type { DriftReport, DriftState } from './drift.types';
export { filterKnownStrays } from './known-strays';
export type {
  FilterKnownStraysOptions,
  FilterKnownStraysResult,
  KnownStrayCandidate,
  KnownStraySources,
} from './known-strays';
export { detectStrays } from './strays';
