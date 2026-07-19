import { z } from 'zod';
export declare const ManifestEntrySchema: z.ZodEffects<
  z.ZodObject<
    {
      canonicalPath: z.ZodEffects<z.ZodString, string, string>;
      providerPath: z.ZodEffects<z.ZodString, string, string>;
      provider: z.ZodString;
      contentType: z.ZodEnum<['skill', 'agent', 'rule']>;
      strategy: z.ZodEnum<['symlink', 'copy']>;
      contentHash: z.ZodNullable<z.ZodString>;
      isFile: z.ZodDefault<z.ZodBoolean>;
      lastSynced: z.ZodString;
    },
    'strip',
    z.ZodTypeAny,
    {
      provider: string;
      strategy: 'symlink' | 'copy';
      canonicalPath: string;
      providerPath: string;
      contentType: 'skill' | 'agent' | 'rule';
      contentHash: string | null;
      isFile: boolean;
      lastSynced: string;
    },
    {
      provider: string;
      strategy: 'symlink' | 'copy';
      canonicalPath: string;
      providerPath: string;
      contentType: 'skill' | 'agent' | 'rule';
      contentHash: string | null;
      lastSynced: string;
      isFile?: boolean | undefined;
    }
  >,
  {
    provider: string;
    strategy: 'symlink' | 'copy';
    canonicalPath: string;
    providerPath: string;
    contentType: 'skill' | 'agent' | 'rule';
    contentHash: string | null;
    isFile: boolean;
    lastSynced: string;
  },
  {
    provider: string;
    strategy: 'symlink' | 'copy';
    canonicalPath: string;
    providerPath: string;
    contentType: 'skill' | 'agent' | 'rule';
    contentHash: string | null;
    lastSynced: string;
    isFile?: boolean | undefined;
  }
>;
export declare const ManifestSchema: z.ZodEffects<
  z.ZodObject<
    {
      version: z.ZodLiteral<1>;
      oatVersion: z.ZodString;
      entries: z.ZodArray<
        z.ZodEffects<
          z.ZodObject<
            {
              canonicalPath: z.ZodEffects<z.ZodString, string, string>;
              providerPath: z.ZodEffects<z.ZodString, string, string>;
              provider: z.ZodString;
              contentType: z.ZodEnum<['skill', 'agent', 'rule']>;
              strategy: z.ZodEnum<['symlink', 'copy']>;
              contentHash: z.ZodNullable<z.ZodString>;
              isFile: z.ZodDefault<z.ZodBoolean>;
              lastSynced: z.ZodString;
            },
            'strip',
            z.ZodTypeAny,
            {
              provider: string;
              strategy: 'symlink' | 'copy';
              canonicalPath: string;
              providerPath: string;
              contentType: 'skill' | 'agent' | 'rule';
              contentHash: string | null;
              isFile: boolean;
              lastSynced: string;
            },
            {
              provider: string;
              strategy: 'symlink' | 'copy';
              canonicalPath: string;
              providerPath: string;
              contentType: 'skill' | 'agent' | 'rule';
              contentHash: string | null;
              lastSynced: string;
              isFile?: boolean | undefined;
            }
          >,
          {
            provider: string;
            strategy: 'symlink' | 'copy';
            canonicalPath: string;
            providerPath: string;
            contentType: 'skill' | 'agent' | 'rule';
            contentHash: string | null;
            isFile: boolean;
            lastSynced: string;
          },
          {
            provider: string;
            strategy: 'symlink' | 'copy';
            canonicalPath: string;
            providerPath: string;
            contentType: 'skill' | 'agent' | 'rule';
            contentHash: string | null;
            lastSynced: string;
            isFile?: boolean | undefined;
          }
        >,
        'many'
      >;
      lastUpdated: z.ZodString;
    },
    'strip',
    z.ZodTypeAny,
    {
      entries: {
        provider: string;
        strategy: 'symlink' | 'copy';
        canonicalPath: string;
        providerPath: string;
        contentType: 'skill' | 'agent' | 'rule';
        contentHash: string | null;
        isFile: boolean;
        lastSynced: string;
      }[];
      version: 1;
      oatVersion: string;
      lastUpdated: string;
    },
    {
      entries: {
        provider: string;
        strategy: 'symlink' | 'copy';
        canonicalPath: string;
        providerPath: string;
        contentType: 'skill' | 'agent' | 'rule';
        contentHash: string | null;
        lastSynced: string;
        isFile?: boolean | undefined;
      }[];
      version: 1;
      oatVersion: string;
      lastUpdated: string;
    }
  >,
  {
    entries: {
      provider: string;
      strategy: 'symlink' | 'copy';
      canonicalPath: string;
      providerPath: string;
      contentType: 'skill' | 'agent' | 'rule';
      contentHash: string | null;
      isFile: boolean;
      lastSynced: string;
    }[];
    version: 1;
    oatVersion: string;
    lastUpdated: string;
  },
  {
    entries: {
      provider: string;
      strategy: 'symlink' | 'copy';
      canonicalPath: string;
      providerPath: string;
      contentType: 'skill' | 'agent' | 'rule';
      contentHash: string | null;
      lastSynced: string;
      isFile?: boolean | undefined;
    }[];
    version: 1;
    oatVersion: string;
    lastUpdated: string;
  }
>;
export type ManifestEntry = z.infer<typeof ManifestEntrySchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
//# sourceMappingURL=manifest.types.d.ts.map
