export { computeSyncPlan } from './compute-plan';
export {
  type EngineScope,
  SYNC_OPERATION_TYPES,
  type SyncOperationType,
  type SyncPlan,
  type SyncPlanEntry,
  type SyncResult,
} from './engine.types';
export { executeSyncPlan } from './execute-plan';
export {
  HOOK_DRIFT_WARNING,
  HOOK_MARKER_END,
  HOOK_MARKER_START,
  installHook,
  isHookInstalled,
  runHookCheck,
  uninstallHook,
} from './hook';
export { hasMarker, insertMarker, OAT_MARKER_PREFIX } from './markers';
export type { CanonicalEntry } from './scanner';
export { scanCanonical } from './scanner';
