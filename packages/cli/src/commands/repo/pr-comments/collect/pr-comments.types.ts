export interface CollectOptions {
  readonly since: string;
  readonly until?: string;
  readonly outDir: string;
  readonly repo?: string;
  readonly ignoreBots: boolean;
}

export interface PrReviewComment {
  readonly id: string;
  readonly prNumber: number;
  readonly prTitle: string;
  readonly prAuthor: string;
  readonly prMergedAt: string;
  readonly filePath: string;
  readonly line: number | null;
  readonly author: string;
  readonly body: string;
  readonly createdAt: string;
  readonly url: string;
}

export interface CollectionChunk {
  readonly month: string;
  readonly comments: IndexedComment[];
}

export interface IndexedComment extends PrReviewComment {
  readonly rcId: string;
}

export interface GraphQLPageInfo {
  readonly hasNextPage: boolean;
  readonly endCursor: string | null;
}

export interface GraphQLReviewComment {
  readonly id: string;
  readonly body: string;
  readonly createdAt: string;
  readonly url: string;
  readonly path: string;
  readonly line: number | null;
  readonly author: {
    readonly login: string;
    readonly __typename: string;
  } | null;
}

export interface GraphQLPullRequest {
  readonly number: number;
  readonly title: string;
  readonly mergedAt: string;
  readonly author: { readonly login: string } | null;
  readonly reviewComments: {
    readonly nodes: GraphQLReviewComment[];
    readonly pageInfo: GraphQLPageInfo;
  };
}

export interface GraphQLSearchResult {
  readonly search: {
    readonly nodes: GraphQLPullRequest[];
    readonly pageInfo: GraphQLPageInfo;
  };
}
