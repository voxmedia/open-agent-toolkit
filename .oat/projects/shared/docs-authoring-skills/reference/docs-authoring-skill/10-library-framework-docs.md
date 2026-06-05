---
title: Library and Framework Documentation
description: Standards for documenting packages, SDKs, internal libraries, and frameworks.
---

# Library and Framework Documentation

Library and framework docs should help users decide whether to use the tool, install it, learn the mental model, apply it correctly, and avoid misuse.

Internal packages deserve the same clarity as public packages. Internal libraries often become de facto platforms, and bad docs multiply confusion across teams.

## Required docs for libraries and packages

Every library or package should document:

- purpose
- when to use it
- when not to use it
- installation
- version compatibility
- quick start
- core concepts
- public API
- examples
- configuration
- extension points
- error behavior
- testing guidance
- migration guides
- release policy
- ownership

## Package overview template

````md
# `<package-name>`

`<package-name>` helps <audience> <do what>.

## When to use this package

Use this package when:

- Use case 1
- Use case 2

## When not to use this package

Do not use this package when:

- Non-use case 1
- Non-use case 2

## Install

```sh
pnpm add <package-name>
```

## Quick start

```ts
import { example } from '<package-name>';

example();
```

## Core concepts

- Concept 1
- Concept 2

## API reference

Link to generated or hand-written API docs.

## Examples

Link to common recipes.

## Compatibility

Document supported runtimes, peer dependencies, and version constraints.
````

## Public API docs

Document only the supported public API.

For each exported function, class, component, hook, or type, include:

- purpose
- signature
- parameters
- return value
- errors
- examples
- side effects
- stability or deprecation notes

Function template:

````md
## `createClient(options)`

Creates a client for calling the API.

### Signature

```ts
function createClient(options: CreateClientOptions): Client;
```

### Parameters

| Parameter         | Type   | Required | Description   |
| ----------------- | ------ | -------: | ------------- |
| `options.baseUrl` | string |      Yes | API base URL. |
| `options.token`   | string |      Yes | Bearer token. |

### Returns

`Client`, configured with the provided options.

### Example

```ts
const client = createClient({
  baseUrl: 'https://api.example.com',
  token: process.env.API_TOKEN!,
});
```
````

## Framework docs

Frameworks require stronger conceptual docs than small libraries.

Framework docs should include:

- design goals
- mental model
- conventions
- lifecycle
- extension points
- plugin model
- file structure
- configuration model
- defaults
- escape hatches
- anti-patterns
- migration guides
- examples

## Framework overview template

````md
# Framework overview

This framework helps teams build <kind of system> using shared conventions.

## Design goals

- Goal 1
- Goal 2
- Goal 3

## Non-goals

- Non-goal 1
- Non-goal 2

## Mental model

Explain the core model in plain language.

## Project structure

```txt
src/
├── routes/
├── components/
└── config/
```

## Extension points

| Extension point | Purpose          | Stability           |
| --------------- | ---------------- | ------------------- |
| `<name>`        | Explain purpose. | Stable/Experimental |

## Anti-patterns

List common misuse and safer alternatives.
````

## Component library docs

Component libraries should document:

- purpose
- import path
- props
- examples
- states
- accessibility
- design tokens
- composition patterns
- when not to use a component

Component template:

````md
# `<ComponentName>`

`<ComponentName>` is used for <purpose>.

## Usage

```tsx
<ComponentName title='Example' />
```

## Props

| Prop    | Type   | Required | Default | Description   |
| ------- | ------ | -------: | ------- | ------------- |
| `title` | string |      Yes | none    | Heading text. |

## States

- Loading
- Empty
- Error
- Success

## Accessibility

Describe keyboard, screen reader, semantic HTML, and focus behavior.

## Related components

- Link to related component
````

## SDK docs

SDK docs should include:

- install
- auth
- client creation
- common workflows
- error handling
- retries
- pagination
- async behavior
- type generation
- version compatibility
- API parity with the underlying service

SDK example:

````md
# JavaScript SDK

## Install

```sh
pnpm add @example/sdk
```

## Create a client

```ts
import { ExampleClient } from '@example/sdk';

const client = new ExampleClient({
  token: process.env.EXAMPLE_TOKEN!,
});
```

## Handle errors

```ts
try {
  await client.examples.create({ name: 'Example' });
} catch (error) {
  if (error.code === 'rate_limited') {
    // retry with backoff
  }
}
```
````

## Examples and recipes

Libraries and frameworks need examples beyond API reference.

Good examples:

- minimal usage
- common production usage
- error handling
- integration with app framework
- testing pattern
- migration pattern
- advanced composition

Each example should include:

- when to use it
- complete code
- required config
- expected behavior
- limitations

## Compatibility docs

Document compatibility explicitly.

```md
# Compatibility

| Package version | Node.js | React  | Notes                   |
| --------------- | ------- | ------ | ----------------------- |
| `2.x`           | `>=20`  | `>=18` | Current stable version. |
| `1.x`           | `>=18`  | `>=17` | Maintenance only.       |
```

## Migration guides

Migration guides are how-to guides with special structure.

Include:

- who needs to migrate
- what changed
- breaking changes
- automated codemods if available
- before and after examples
- verification
- rollback or fallback
- timeline

Template:

````md
# Migrate from v1 to v2

Use this guide to migrate from `<package>@1` to `<package>@2`.

## Who needs this

Explain affected users.

## What changed

Summarize major changes.

## Before

```ts
oldExample();
```

## After

```ts
newExample();
```

## Steps

1. Update package version.
2. Update imports.
3. Replace deprecated APIs.
4. Run tests.

## Verify

```sh
pnpm test
```
````

## Release notes and changelog

Release docs should distinguish:

- breaking changes
- new features
- bug fixes
- deprecations
- migration steps
- compatibility changes
- security fixes

Avoid changelogs that only repeat commit messages.

## Internal library ownership

Internal packages should make ownership and support explicit.

Include:

- owner
- support channel
- release process
- compatibility expectations
- how to request changes
- how to contribute

## Library docs anti-patterns

Avoid:

- only generated API docs
- no “when not to use” section
- examples that omit error handling
- undocumented peer dependencies
- undocumented breaking changes
- internal package docs that assume everyone knows the owning team
- framework docs that list APIs without explaining the mental model
