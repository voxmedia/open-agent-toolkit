import { ContentTypeSchema } from '@shared/types';
import { z } from 'zod';

const RelativePathSchema = z
  .string()
  .min(1)
  .refine(
    (value) => !value.startsWith('/') && !value.startsWith('~'),
    'Path must be relative',
  );

const CollectionRelativePathSchema = RelativePathSchema.refine(
  (value) =>
    !value.includes('\\') &&
    value
      .split('/')
      .every(
        (segment) => segment !== '' && segment !== '.' && segment !== '..',
      ),
  'Collection path must be a normalized relative POSIX path',
);

const ManifestEntryBaseSchema = z.object({
  canonicalPath: RelativePathSchema,
  providerPath: RelativePathSchema,
  provider: z.string().min(1),
  contentType: ContentTypeSchema,
  contentHash: z.string().nullable(),
  isFile: z.boolean().default(false),
  lastSynced: z.string().datetime(),
});

function validateEntryHash(
  entry: { strategy: string; contentHash: string | null },
  ctx: z.RefinementCtx,
): void {
  if (entry.strategy === 'copy' && entry.contentHash === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'copy strategy requires non-null contentHash',
      path: ['contentHash'],
    });
  }

  if (entry.strategy !== 'copy' && entry.contentHash !== null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${entry.strategy} strategy requires null contentHash`,
      path: ['contentHash'],
    });
  }
}

export const ManifestEntryV1Schema = ManifestEntryBaseSchema.extend({
  strategy: z.enum(['symlink', 'copy']),
}).superRefine(validateEntryHash);

export const ManifestEntrySchema = ManifestEntryBaseSchema.extend({
  strategy: z.enum(['symlink', 'copy', 'collection']),
  collectionId: z.string().min(1).optional(),
}).superRefine((entry, ctx) => {
  validateEntryHash(entry, ctx);

  if (entry.strategy === 'collection' && entry.collectionId === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'collection strategy requires collectionId',
      path: ['collectionId'],
    });
  }

  if (entry.strategy !== 'collection' && entry.collectionId !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'collectionId is only valid for collection strategy',
      path: ['collectionId'],
    });
  }

  if (entry.strategy === 'collection') {
    for (const field of ['canonicalPath', 'providerPath'] as const) {
      const parsed = CollectionRelativePathSchema.safeParse(entry[field]);
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Inherited collection paths must be normalized relative POSIX paths',
          path: [field],
        });
      }
    }
  }
});

const ManifestCollectionLinkIdentitySchema = z.object({
  device: z.string().min(1),
  inode: z.string().min(1),
  linkText: z.string().min(1),
});

export const ManifestCollectionEntrySchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1),
  contentType: ContentTypeSchema,
  canonicalDir: CollectionRelativePathSchema,
  providerDir: CollectionRelativePathSchema,
  linkTarget: CollectionRelativePathSchema,
  ownership: z.enum(['oat-created', 'adopted-exact']),
  createdLink: ManifestCollectionLinkIdentitySchema.optional(),
  lastVerified: z.string().datetime(),
});

function isStrictPathDescendant(parent: string, candidate: string): boolean {
  const parentSegments = parent.split('/');
  const candidateSegments = candidate.split('/');
  return (
    candidateSegments.length > parentSegments.length &&
    parentSegments.every(
      (segment, index) => candidateSegments[index] === segment,
    )
  );
}

function validateUniqueEntries(
  entries: readonly { canonicalPath: string; provider: string }[],
  ctx: z.RefinementCtx,
): void {
  const seen = new Set<string>();

  for (const [index, entry] of entries.entries()) {
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
}

export const ManifestV1Schema = z
  .object({
    version: z.literal(1),
    oatVersion: z.string().min(1),
    entries: z.array(ManifestEntryV1Schema),
    lastUpdated: z.string().datetime(),
  })
  .superRefine((manifest, ctx) => validateUniqueEntries(manifest.entries, ctx));

export const ManifestV2Schema = z
  .object({
    version: z.literal(2),
    oatVersion: z.string().min(1),
    entries: z.array(ManifestEntrySchema),
    collections: z.array(ManifestCollectionEntrySchema),
    lastUpdated: z.string().datetime(),
  })
  .superRefine((manifest, ctx) => {
    validateUniqueEntries(manifest.entries, ctx);

    const collections = new Map<
      string,
      (typeof manifest.collections)[number]
    >();
    for (const [index, collection] of manifest.collections.entries()) {
      if (collections.has(collection.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'duplicate collection id',
          path: ['collections', index, 'id'],
        });
      } else {
        collections.set(collection.id, collection);
      }

      if (collection.linkTarget !== collection.canonicalDir) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'collection linkTarget must exactly reference canonicalDir',
          path: ['collections', index, 'linkTarget'],
        });
      }
    }

    for (const [index, entry] of manifest.entries.entries()) {
      if (entry.strategy !== 'collection') {
        continue;
      }

      const collection = collections.get(entry.collectionId ?? '');
      if (collection === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'collection entry must reference exactly one collection',
          path: ['entries', index, 'collectionId'],
        });
        continue;
      }

      if (
        entry.provider !== collection.provider ||
        entry.contentType !== collection.contentType ||
        !isStrictPathDescendant(collection.canonicalDir, entry.canonicalPath) ||
        !isStrictPathDescendant(collection.providerDir, entry.providerPath)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'collection entry provider, content type, and ancestry must match its collection',
          path: ['entries', index],
        });
      }
    }
  });

export const ManifestSchema = z.union([ManifestV1Schema, ManifestV2Schema]);

export type ManifestEntryV1 = z.infer<typeof ManifestEntryV1Schema>;
export type ManifestEntryV2 = z.infer<typeof ManifestEntrySchema>;
/** Per-entry compatibility view used until collection plans are projected. */
export type ManifestEntry = ManifestEntryV1;
export type ManifestCollectionEntry = z.infer<
  typeof ManifestCollectionEntrySchema
>;
export type ManifestCollectionLinkIdentity = z.infer<
  typeof ManifestCollectionLinkIdentitySchema
>;
export type ManifestV1 = z.infer<typeof ManifestV1Schema>;
export type ManifestV2 = z.infer<typeof ManifestV2Schema>;
export type Manifest = Omit<ManifestV2, 'entries'> & {
  entries: ManifestEntry[];
};
