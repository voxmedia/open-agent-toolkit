---
title: API Documentation
description: Standards for REST, GraphQL, webhook, event-driven, and schema documentation.
---

# API Documentation

API docs must help consumers integrate correctly without reading implementation code.

The consumer should understand:

- what the API does
- how to authenticate
- what they can safely call
- what request shape to send
- what response shape to expect
- how errors behave
- how to handle retries, pagination, limits, and versioning
- what compatibility promises exist

## Required API docs

Every API should document:

- overview and use cases
- base URL or service location
- environments
- authentication
- authorization and permissions
- versioning
- request format
- response format
- error format
- pagination
- filtering and sorting
- rate limits or quotas
- idempotency
- retries
- timeouts
- webhooks or events if applicable
- SDKs or generated clients if applicable
- examples
- deprecation policy
- support or ownership

## API overview template

```md
# API overview

This API lets <consumer> <do what>.

## Use cases

- Use case 1
- Use case 2
- Use case 3

## Base URLs

| Environment | URL                     |
| ----------- | ----------------------- |
| Local       | `http://localhost:3000` |
| Staging     | `<staging-url>`         |
| Production  | `<production-url>`      |

## Authentication

Describe auth method, token source, headers, and scopes.

## Versioning

Describe URL, header, schema, or release-based versioning.

## Common workflows

- Link to first request tutorial
- Link to common integration guide
- Link to webhook guide

## Reference

- Link to endpoint reference
- Link to error reference
- Link to schema reference
```

## REST endpoint template

````md
# `POST /examples`

Creates an example resource.

## Authentication

Requires a bearer token with the `examples:write` scope.

## Request

```json
{
  "name": "Example",
  "status": "draft"
}
```

| Field    | Type   | Required | Description                                        |
| -------- | ------ | -------: | -------------------------------------------------- |
| `name`   | string |      Yes | Human-readable name.                               |
| `status` | string |       No | Initial status. Allowed values: `draft`, `active`. |

## Response

```json
{
  "id": "ex_123",
  "name": "Example",
  "status": "draft",
  "createdAt": "2026-06-05T12:00:00Z"
}
```

| Field       | Type   | Description                  |
| ----------- | ------ | ---------------------------- |
| `id`        | string | Unique example identifier.   |
| `name`      | string | Human-readable name.         |
| `status`    | string | Current status.              |
| `createdAt` | string | ISO 8601 creation timestamp. |

## Errors

| Status | Code              | Meaning                      | Fix                                       |
| -----: | ----------------- | ---------------------------- | ----------------------------------------- |
|    400 | `invalid_request` | The request body is invalid. | Check required fields and allowed values. |
|    401 | `unauthorized`    | Authentication failed.       | Check the bearer token.                   |
|    403 | `forbidden`       | The token lacks permission.  | Request the required scope.               |

## Example

```sh
curl -X POST "$BASE_URL/examples" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Example","status":"draft"}'
```
````

## REST documentation checklist

For every operation, include:

- method and path
- summary
- side effects
- auth requirement
- required permissions or scopes
- path parameters
- query parameters
- request headers
- request body
- response body
- status codes
- error codes
- example request
- example response
- retry behavior
- idempotency behavior for writes
- pagination behavior for list endpoints
- deprecation notes

## Error documentation

Document errors as a stable contract.

Recommended shape:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "The `name` field is required.",
    "requestId": "req_123"
  }
}
```

Error reference template:

```md
# Error reference

| HTTP status | Code              | Meaning                                        | Retry? | Fix                              |
| ----------: | ----------------- | ---------------------------------------------- | -----: | -------------------------------- |
|         400 | `invalid_request` | The request is malformed.                      |     No | Check required fields.           |
|         401 | `unauthorized`    | Authentication failed.                         |     No | Provide a valid token.           |
|         403 | `forbidden`       | The caller lacks permission.                   |     No | Request the required scope.      |
|         404 | `not_found`       | The resource does not exist.                   |     No | Check the resource ID.           |
|         409 | `conflict`        | The resource state conflicts with the request. |  Maybe | Refresh state and retry if safe. |
|         429 | `rate_limited`    | Too many requests.                             |    Yes | Back off and retry.              |
|         500 | `internal_error`  | Unexpected server error.                       |    Yes | Retry with backoff or escalate.  |
```

## Pagination

Document:

- pagination type: cursor, offset, page, link header
- request parameters
- response fields
- ordering guarantees
- maximum page size
- empty page behavior
- stability while data changes

Example:

````md
## Pagination

List endpoints use cursor pagination.

Request:

```txt
GET /examples?limit=50&starting_after=ex_123
```

Response:

```json
{
  "data": [],
  "hasMore": false,
  "nextCursor": null
}
```
````

## Idempotency

For write operations, document whether duplicate requests are safe.

Include:

- idempotency key header if supported
- key lifetime
- matching behavior
- conflict behavior
- recommended retry behavior

Example:

```md
## Idempotency

`POST /payments` supports idempotency through the `Idempotency-Key` header. Use the same key when retrying the same logical request.
```

## Rate limits

Document:

- limit scope: user, token, organization, IP, endpoint
- window size
- headers
- retry guidance
- burst behavior if known

If the limit is not documented, say so.

## GraphQL documentation

GraphQL docs should include:

- endpoint
- auth
- schema source
- explorer or playground if available
- common queries
- common mutations
- fragments
- pagination model
- error shape
- nullability behavior
- query cost or depth limits
- deprecation policy
- generated schema reference

GraphQL operation template:

````md
# Get an article

Use this query to fetch an article by ID.

## Query

```graphql
query GetArticle($id: ID!) {
  article(id: $id) {
    id
    title
    status
  }
}
```

## Variables

```json
{
  "id": "article_123"
}
```

## Response

```json
{
  "data": {
    "article": {
      "id": "article_123",
      "title": "Example",
      "status": "PUBLISHED"
    }
  }
}
```

## Errors

Document possible GraphQL errors and authorization behavior.
````

## Event-driven API documentation

For events, document producers and consumers as a contract.

Include:

- event name
- producer
- consumers if known
- transport
- topic, queue, stream, or bus
- schema
- example payload
- ordering guarantees
- delivery guarantees
- retry behavior
- dead-letter behavior
- idempotency requirements
- versioning
- backward compatibility rules

Event template:

````md
# `article.published`

Published when an article transitions to the published state.

## Producer

`publishing-service`

## Transport

| Field    | Value          |
| -------- | -------------- |
| Bus      | `<event-bus>`  |
| Topic    | `<topic-name>` |
| Delivery | At least once  |

## Payload

```json
{
  "type": "article.published",
  "version": 1,
  "articleId": "article_123",
  "publishedAt": "2026-06-05T12:00:00Z"
}
```

## Fields

| Field         | Type   | Required | Description                 |
| ------------- | ------ | -------: | --------------------------- |
| `type`        | string |      Yes | Event type.                 |
| `version`     | number |      Yes | Event schema version.       |
| `articleId`   | string |      Yes | Published article ID.       |
| `publishedAt` | string |      Yes | ISO 8601 publish timestamp. |

## Consumer requirements

Consumers must treat this event as at-least-once delivery and deduplicate by `articleId` plus `publishedAt`.
````

## Webhook documentation

For webhooks, include:

- event types
- endpoint expectations
- signing and verification
- retry schedule
- timeout
- payload schema
- idempotency
- ordering
- testing tools
- replay behavior
- security considerations

Webhook guide template:

````md
# Webhooks

Use webhooks to receive asynchronous updates when <event> occurs.

## Configure an endpoint

Explain where to register the endpoint.

## Verify signatures

Document signing headers and verification algorithm.

## Handle retries

Document retry behavior, timeout, and idempotency expectations.

## Event types

| Event             | Description                      |
| ----------------- | -------------------------------- |
| `example.created` | Sent when an example is created. |

## Example payload

```json
{
  "id": "evt_123",
  "type": "example.created",
  "data": {}
}
```
````

## Schema-driven docs

Prefer machine-readable schemas when possible:

- OpenAPI for REST and HTTP APIs
- GraphQL schema descriptions for GraphQL APIs
- AsyncAPI for event-driven APIs
- JSON Schema for config and payloads
- Protocol Buffers for gRPC or event payloads when used

Generated reference docs should be paired with hand-written guides.

## Public API docs

Public API docs need additional polish:

- onboarding path
- auth setup
- support model
- compatibility guarantees
- deprecation policy
- realistic examples
- SDK samples
- security guidance
- public-safe error messages
- no internal-only details

## Internal API docs

Internal API docs should include:

- owning team
- Slack channel
- service dependencies
- staging and production URLs
- dashboards
- alerts
- runbooks
- migration notes
- known consumers
- internal auth and permission model

Internal docs can include operational context, but never secrets.
