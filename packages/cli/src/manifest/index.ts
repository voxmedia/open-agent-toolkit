export { computeDirectoryHash } from './hash';
export {
  addEntry,
  createEmptyManifest,
  findEntry,
  loadManifest,
  removeEntry,
  saveManifest,
} from './manager';
export type { Manifest, ManifestEntry } from './manifest.types';
export { ManifestEntrySchema, ManifestSchema } from './manifest.types';
