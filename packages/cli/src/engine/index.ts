export { computeSyncPlan } from './compute-plan';
export {
  type EngineScope,
  type RemovalSyncPlanEntry,
  SYNC_OPERATION_TYPES,
  type SyncOperationType,
  type SyncPlan,
  type SyncPlanEntry,
  type SyncResult,
} from './engine.types';
export { executeSyncPlan } from './execute-plan';
export {
  configureLocalHooksPath,
  getHookInstallInfo,
  HOOK_DRIFT_WARNING,
  HOOK_MARKER_END,
  HOOK_MARKER_START,
  installHook,
  isHookInstalled,
  REPO_GITHOOKS_PATH,
  runHookCheck,
  uninstallHook,
} from './hook';
export type { HookInstallInfo } from './hook';
export {
  hasMarker,
  insertMarker,
  OAT_DIRECTORY_SENTINEL,
  OAT_MARKER_PREFIX,
  writeDirectorySentinel,
} from './markers';
export type { CanonicalEntry } from './scanner';
export { scanCanonical } from './scanner';
