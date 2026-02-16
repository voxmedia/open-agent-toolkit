import { ContentTypeSchema } from '@shared/types';
import { z } from 'zod';

const RelativePathSchema = z
  .string()
  .min(1)
  .refine(
    (value) => !value.startsWith('/') && !value.startsWith('~'),
    'Path must be relative',
  );

export const ManifestEntrySchema = z
  .object({
    canonicalPath: RelativePathSchema,
    providerPath: RelativePathSchema,
    provider: z.string().min(1),
    contentType: ContentTypeSchema,
    strategy: z.enum(['symlink', 'copy']),
    contentHash: z.string().nullable(),
    lastSynced: z.string().datetime(),
  })
  .superRefine((entry, ctx) => {
    if (entry.strategy === 'copy' && entry.contentHash === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'copy strategy requires non-null contentHash',
        path: ['contentHash'],
      });
    }

    if (entry.strategy === 'symlink' && entry.contentHash !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'symlink strategy requires null contentHash',
        path: ['contentHash'],
      });
    }
  });

export const ManifestSchema = z
  .object({
    version: z.literal(1),
    oatVersion: z.string().min(1),
    entries: z.array(ManifestEntrySchema),
    lastUpdated: z.string().datetime(),
  })
  .superRefine((manifest, ctx) => {
    const seen = new Set<string>();

    for (const [index, entry] of manifest.entries.entries()) {
      const key = `${entry.canonicalPath}::${entry.provider}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'duplicate (canonicalPath, provider) pair',
          path: ['entries', index],
        });
      } else {
        seen.add(key);
      }
    }
  });

export type ManifestEntry = z.infer<typeof ManifestEntrySchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
