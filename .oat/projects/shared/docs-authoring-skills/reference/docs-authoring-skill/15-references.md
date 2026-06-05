---
title: Documentation References
description: Examples of excellent technical documentation to study by category.
---

# Documentation References

Use this page as a reference shelf for humans and agents writing technical documentation.

The point is not to copy another site's structure exactly. The point is to study what each docs site does well and steal the right pattern for the job.

## Documentation systems and writing guides

| Reference                                                                               | Category                 | Why study it                                                                    | Steal this                                                       |
| --------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [Diátaxis](https://diataxis.fr/)                                                        | Documentation framework  | Defines tutorials, how-to guides, reference, and explanation as distinct forms. | Use it as the mental model for docs IA.                          |
| [Diátaxis in five minutes](https://diataxis.fr/start-here/)                             | Documentation framework  | Short explanation of the four doc types.                                        | Use it as onboarding material for docs writers.                  |
| [Google developer documentation style guide](https://developers.google.com/style)       | Writing style            | Editorial rules for clear developer docs.                                       | Use as baseline style reference.                                 |
| [Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/welcome/) | Writing style            | Practical guidance for technical writing and terminology.                       | Use for voice, clarity, and formatting conventions.              |
| [Command Line Interface Guidelines](https://clig.dev/)                                  | CLI design and docs      | Modern CLI UX guidance grounded in UNIX conventions.                            | Use for help text, output, errors, interactivity, and scripting. |
| [Fumadocs Markdown docs](https://www.fumadocs.dev/docs/markdown)                        | Docs platform            | Documents Markdown and MDX support in Fumadocs.                                 | Keep docs Markdown-first unless MDX is needed.                   |
| [MDX](https://mdxjs.com/)                                                               | Markdown plus components | Shows how Markdown can embed JSX components.                                    | Use only when docs need interactive or custom components.        |

## API documentation examples

| Reference                                                                     | Category                | Why study it                                                                                 | Steal this                                                             |
| ----------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [Stripe API Reference](https://docs.stripe.com/api)                           | REST API docs           | Canonical resource-oriented API reference with strong examples.                              | Endpoint structure, request/response examples, error docs, SDK parity. |
| [Stripe Docs](https://docs.stripe.com/)                                       | Product and API docs    | Combines integration guides with API reference.                                              | Workflow-first guides supported by precise reference.                  |
| [Twilio Docs](https://www.twilio.com/docs)                                    | API platform docs       | Strong quickstarts and product-specific API docs.                                            | Language examples and task-oriented onboarding.                        |
| [GitHub REST API docs](https://docs.github.com/rest)                          | REST API docs           | Good quickstart, auth docs, and endpoint reference.                                          | Clear separation between getting started and reference.                |
| [GitHub GraphQL API docs](https://docs.github.com/en/graphql)                 | GraphQL API docs        | Explains GraphQL use cases and schema reference.                                             | Query examples, schema reference, and conceptual overview.             |
| [Shopify Dev Docs](https://shopify.dev/docs)                                  | Developer platform docs | Large ecosystem docs across apps, themes, storefronts, APIs, and CLI.                        | Product-area organization and integration paths.                       |
| [OpenAI API Reference](https://developers.openai.com/api/reference/overview/) | API docs                | Modern AI API reference with operational details such as request IDs and rate-limit headers. | Troubleshooting and production guidance in API reference.              |
| [AWS API Gateway docs](https://docs.aws.amazon.com/apigateway/)               | Cloud service API docs  | Combines conceptual overview, developer guide, and API references.                           | Separate user guide from API operation reference.                      |

## API specification and schema references

| Reference                                                                              | Category               | Why study it                                                       | Steal this                                                         |
| -------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| [OpenAPI Specification](https://swagger.io/specification/)                             | REST API specification | Standard machine-readable interface for HTTP APIs.                 | Generate reference docs from source-of-truth schemas.              |
| [OpenAPI learning docs](https://learn.openapis.org/)                                   | OpenAPI education      | Guides API designers and writers on writing OpenAPI descriptions.  | Schema authoring guidance for humans and generators.               |
| [JSON Schema docs](https://json-schema.org/docs)                                       | Schema documentation   | Documents JSON structure, constraints, and validation.             | Use for config, event, and payload schemas.                        |
| [GraphQL schema docs](https://graphql.org/learn/schema/)                               | GraphQL schemas        | Shows how type, field, and argument descriptions document schemas. | Put documentation in schema descriptions, not just prose pages.    |
| [GraphQL introspection](https://graphql.org/learn/introspection/)                      | GraphQL tooling        | Explains schema discovery through introspection.                   | Use introspection for generated docs and tool support.             |
| [AsyncAPI Docs](https://www.asyncapi.com/docs)                                         | Event-driven APIs      | Focused on event-driven architectures.                             | Use for events, topics, channels, messages, and payload contracts. |
| [AsyncAPI Specification](https://www.asyncapi.com/docs/reference/specification/latest) | Event-driven API spec  | Machine-readable format for message-driven APIs.                   | Use when documenting event contracts across services.              |

## CLI documentation examples

| Reference                                                                                    | Category              | Why study it                                                                    | Steal this                                              |
| -------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [GitHub CLI Manual](https://cli.github.com/manual/)                                          | CLI reference         | Clean command hierarchy, usage, aliases, flags, examples, and related commands. | Generated command manual shape.                         |
| [GitHub CLI docs](https://docs.github.com/en/github-cli)                                     | CLI guides            | Combines quickstart, conceptual docs, and reference.                            | Separate product docs from generated command reference. |
| [kubectl reference](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands) | CLI reference         | Huge generated command surface with consistent structure.                       | Command taxonomy and generated completeness.            |
| [kubectl quick reference](https://kubernetes.io/docs/reference/kubectl/quick-reference/)     | CLI quick reference   | Common operational commands in one scannable page.                              | Cheat sheet for experienced operators.                  |
| [Terraform CLI docs](https://developer.hashicorp.com/terraform/cli)                          | CLI and workflow docs | Documents CLI commands and workflows for infrastructure provisioning.           | Pair command reference with lifecycle workflow docs.    |
| [Vercel CLI docs](https://vercel.com/docs/cli)                                               | Product CLI docs      | Explains CLI as platform interface and automation tool.                         | Workflow-oriented CLI docs for deployment platforms.    |

## Framework and language documentation examples

| Reference                                                                                     | Category                  | Why study it                                                                | Steal this                                              |
| --------------------------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------- |
| [React Learn](https://react.dev/learn)                                                        | Framework learning docs   | Teaches core mental models through progressive examples.                    | Conceptual onboarding before API surface.               |
| [React Reference](https://react.dev/reference/react)                                          | Framework reference       | Organized API reference for hooks, components, and APIs.                    | Separate learn path from exact reference.               |
| [Django documentation](https://docs.djangoproject.com/en/stable/)                             | Mature framework docs     | Explicitly organizes tutorials, how-to guides, topic guides, and reference. | Mature IA for long-lived framework docs.                |
| [Laravel documentation](https://laravel.com/docs)                                             | Framework docs            | Clear, practical prose across a large framework surface.                    | Linear, readable guides with strong examples.           |
| [Vue guide](https://vuejs.org/guide/introduction)                                             | Framework docs            | Approachable conceptual guide and examples.                                 | Gentle onboarding with clear API reference split.       |
| [Vue API reference](https://vuejs.org/api/)                                                   | Framework reference       | Clean API taxonomy.                                                         | Reference navigation for large framework APIs.          |
| [Svelte docs](https://svelte.dev/docs)                                                        | Framework docs            | Routes readers by intent and includes agent-readable docs affordances.      | Intent-based entry points and interactive learning.     |
| [Svelte tutorial](https://svelte.dev/tutorial)                                                | Interactive tutorial      | Teaches by doing in the browser.                                            | Interactive tutorial pattern for learning-first docs.   |
| [Next.js docs](https://nextjs.org/docs)                                                       | Full-stack framework docs | Handles complex routing, rendering, and caching concepts.                   | Versioned mental models and routing-context navigation. |
| [Node.js API docs](https://nodejs.org/api/documentation.html)                                 | Runtime API docs          | Deep API reference for a large runtime.                                     | Stable, exhaustive reference with contribution path.    |
| [MDN Web Docs](https://developer.mozilla.org/en-US/)                                          | Web platform docs         | Broad reference and learning material for web technologies.                 | Reference depth, browser/platform context, examples.    |
| [MDN JavaScript reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference) | Language reference        | Fact repository for JavaScript.                                             | Precise reference pages for language and API facts.     |

## Platform, cloud, and infrastructure docs

| Reference                                                                                                                   | Category                         | Why study it                                                                                     | Steal this                                                       |
| --------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| [Cloudflare Workers docs](https://developers.cloudflare.com/workers/)                                                       | Developer platform docs          | Large platform docs with guides, concepts, and reference.                                        | Product-area docs with agent resources and Markdown affordances. |
| [Cloudflare Durable Objects docs](https://developers.cloudflare.com/durable-objects/)                                       | Distributed systems docs         | Explains a non-trivial stateful serverless primitive.                                            | Concept-first docs for unusual infrastructure concepts.          |
| [Cloudflare Durable Objects concepts](https://developers.cloudflare.com/durable-objects/concepts/what-are-durable-objects/) | Architecture concept docs        | Explains what the primitive is and how it differs from Workers.                                  | Sharp conceptual docs for platform primitives.                   |
| [AWS Documentation](https://docs.aws.amazon.com/)                                                                           | Cloud docs                       | Huge product docs corpus with user guides, developer guides, API references, and CLI references. | Separate guide, API reference, and CLI reference per service.    |
| [AWS Lambda docs](https://docs.aws.amazon.com/lambda/)                                                                      | Serverless service docs          | Combines conceptual overview, instructions, and API reference.                                   | Service docs for runtime, deployment, and API operations.        |
| [Terraform docs](https://developer.hashicorp.com/terraform/docs)                                                            | Infrastructure docs              | Strong docs for infrastructure as code concepts and workflows.                                   | Lifecycle docs and language/reference separation.                |
| [Terraform language docs](https://developer.hashicorp.com/terraform/language)                                               | Configuration language reference | Documents a declarative configuration language.                                                  | Precise resource/config language docs.                           |

## Architecture and operations references

| Reference                                                                                                               | Category                       | Why study it                                                                   | Steal this                                              |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------- |
| [C4 model](https://c4model.com/)                                                                                        | Architecture diagrams          | Layered model for visualizing software architecture.                           | Context, container, component, and code diagram levels. |
| [C4 model tooling](https://c4model.com/tooling)                                                                         | Architecture tooling           | Discusses tooling for long-lived architecture diagrams.                        | Treat architecture diagrams as maintainable artifacts.  |
| [Architecture Decision Records](https://adr.github.io/)                                                                 | ADR practice                   | Collects ADR resources and links to the original decision-record practice.     | Decision logs for significant choices.                  |
| [Architecture decision record GitHub org](https://github.com/architecture-decision-record/architecture-decision-record) | ADR definition                 | Defines ADRs as records of decisions, context, and consequences.               | Standard ADR language and terminology.                  |
| [GDS Way architecture decisions](https://gds-way.digital.cabinet-office.gov.uk/standards/architecture-decisions.html)   | Government technical standards | Practical guidance for documenting architecture decisions.                     | Lightweight ADR process for teams.                      |
| [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html)             | Architecture review            | Describes tradeoffs and best practices for cloud workloads.                    | Review pillars, risks, and improvement framing.         |
| [AWS Well-Architected](https://aws.amazon.com/architecture/well-architected/)                                           | Architecture program           | High-level framework and six-pillar framing.                                   | Structured architecture review categories.              |
| [Google SRE books](https://sre.google/books/)                                                                           | Operations and reliability     | Production engineering practices, incident response, and reliability concepts. | Operational excellence and incident response patterns.  |

## Design system and component docs

| Reference                                                                                          | Category               | Why study it                                                              | Steal this                                               |
| -------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------- |
| [Material Design](https://m3.material.io/)                                                         | Design system docs     | Combines design guidance, component behavior, and implementation context. | Component behavior and design rationale.                 |
| [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) | Product/design docs    | Strong design guidance and platform conventions.                          | Clear component and interaction expectations.            |
| [Storybook Docs](https://storybook.js.org/docs)                                                    | Component docs         | Documents components with examples, controls, and generated metadata.     | Component states, props, examples, and interactive docs. |
| [Radix UI docs](https://www.radix-ui.com/primitives/docs/overview/introduction)                    | Component library docs | Strong accessibility-focused primitives documentation.                    | Accessibility and composition docs for UI primitives.    |

## Public app and user-facing docs examples

| Reference                                             | Category                       | Why study it                                                                         | Steal this                                               |
| ----------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| [GitHub Docs](https://docs.github.com/)               | Product docs                   | Handles product help, APIs, CLI, Actions, security, and admin docs in one ecosystem. | Multi-persona docs without losing structure.             |
| [Vercel docs](https://vercel.com/docs)                | Product platform docs          | Strong workflow-first docs for building and deploying apps.                          | Product docs that lead with developer workflows.         |
| [Shopify Dev Docs](https://shopify.dev/docs)          | Public developer docs          | Helps app, theme, storefront, and marketplace developers.                            | Entry points by developer goal.                          |
| [Cloudflare Docs](https://developers.cloudflare.com/) | Public developer platform docs | Large platform with developer-focused product docs.                                  | Product navigation plus concepts, guides, and reference. |

## What to copy by need

| Need                   | Study                                                 |
| ---------------------- | ----------------------------------------------------- |
| API reference          | Stripe, GitHub REST, OpenAPI                          |
| API onboarding         | Stripe, Twilio, Shopify                               |
| GraphQL docs           | GitHub GraphQL, GraphQL.org                           |
| Event docs             | AsyncAPI, Cloudflare Queues and Workers patterns      |
| CLI reference          | GitHub CLI, kubectl                                   |
| CLI workflows          | Terraform, Vercel CLI, GitHub CLI docs                |
| Framework docs         | React, Django, Laravel, Vue, Next.js                  |
| Language/API reference | MDN, Node.js                                          |
| Platform docs          | Cloudflare, AWS, Vercel                               |
| Architecture docs      | C4 model, ADRs, AWS Well-Architected                  |
| Operations docs        | Google SRE books, AWS Well-Architected                |
| Component docs         | Storybook, Material Design, Radix UI                  |
| Style guide            | Google developer style, Microsoft Writing Style Guide |

## Recommended shortlist for agents

When time is limited, load these references conceptually:

1. Diátaxis for structure.
2. Google developer style for prose.
3. Stripe for API docs.
4. GitHub CLI for command reference.
5. React for teaching mental models.
6. Django for mature docs information architecture.
7. MDN for reference depth.
8. Cloudflare for platform docs and agent-readable affordances.
9. C4 and ADRs for architecture docs.
10. Google SRE and AWS Well-Architected for operations and reliability.
