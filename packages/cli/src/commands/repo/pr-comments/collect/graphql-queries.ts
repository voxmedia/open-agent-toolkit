export const SEARCH_MERGED_PRS_QUERY = `
query($searchQuery: String!, $first: Int!, $after: String) {
  search(query: $searchQuery, type: ISSUE, first: $first, after: $after) {
    nodes {
      ... on PullRequest {
        number
        title
        mergedAt
        author { login }
        reviewComments(first: 100) {
          nodes {
            id
            body
            createdAt
            url
            path
            line
            author { login __typename }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
`;

export const REVIEW_COMMENTS_PAGE_QUERY = `
query($prNumber: Int!, $owner: String!, $name: String!, $first: Int!, $after: String) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $prNumber) {
      reviewComments(first: $first, after: $after) {
        nodes {
          id
          body
          createdAt
          url
          path
          line
          author { login __typename }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}
`;
