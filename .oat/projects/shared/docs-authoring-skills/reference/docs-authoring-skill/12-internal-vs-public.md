---
title: Internal vs Public Documentation
description: How internal and public docs differ while sharing the same quality bar.
---

# Internal vs Public Documentation

Internal and public docs should follow the same core practices:

- clear purpose
- reader-first structure
- accurate examples
- strong reference docs
- good navigation
- explicit prerequisites
- useful troubleshooting
- maintained ownership

The differences are audience, assumptions, security, and support model.

## Comparison

| Concern       | Internal docs                                            | Public docs                                               |
| ------------- | -------------------------------------------------------- | --------------------------------------------------------- |
| Audience      | Engineers, operators, support, stakeholders, agents      | External developers, users, partners                      |
| Context       | Can assume some internal systems if linked and explained | Must explain all required context                         |
| Security      | Can mention internal systems, never secrets              | Must avoid internal-only implementation details           |
| Ownership     | Team, Slack channel, escalation path                     | Support path, issue tracker, contact method               |
| Examples      | Can use internal repo names and environments             | Use public-safe sample values                             |
| Operations    | Include runbooks, dashboards, alerts, rollback           | Include public status, support, safe operational guidance |
| Tone          | Direct and practical                                     | Polished and externally legible                           |
| Failure modes | Include internal recovery details                        | Include consumer-facing troubleshooting                   |

## Same quality bar

Internal docs are not second-class docs.

Internal docs often support:

- production operations
- incident response
- onboarding
- platform migrations
- cross-team integration
- architecture review
- agent-driven code changes

Bad internal docs cost real engineering time.

## Internal docs should include

- owning team
- support channel
- escalation path
- related repos
- related services
- environment names
- dashboards
- logs
- traces
- alerts
- deployment workflows
- rollback steps
- runbooks
- known incidents if they contain durable lessons
- internal consumers
- operational caveats

## Internal docs should not include

- secrets
- credentials
- tokens
- private keys
- passwords
- sensitive customer data
- private incident details that do not belong in durable docs
- personal data
- sensitive vendor contract details
- internal-only details copied into public docs

## Public docs should include

- product or project purpose
- onboarding path
- installation
- authentication setup
- permissions
- examples
- API or CLI reference
- version compatibility
- migration guides
- deprecation policy
- support path
- security guidance
- accessibility or privacy notes when relevant

## Public docs should avoid

- internal service names unless intentionally public
- internal architecture details not part of the contract
- internal URLs
- Slack links
- private dashboards
- deployment internals
- customer-specific data
- roadmap promises without approval
- claims that cannot be supported publicly

## Sanitizing internal docs for public release

Before making docs public, check:

- Are all internal URLs removed?
- Are secrets and credentials absent?
- Are internal team names safe to expose?
- Are operational details safe to expose?
- Are examples generic and realistic?
- Are screenshots scrubbed?
- Are logs scrubbed?
- Are incident details removed or generalized?
- Are roadmap statements approved?
- Is the support path public?

## Public examples

Use realistic but safe examples.

Prefer:

```json
{
  "id": "article_123",
  "title": "Example article"
}
```

Avoid:

```json
{
  "id": "real-production-id",
  "title": "Unpublished internal article"
}
```

## Internal examples

Internal examples can use real environment names and repo names when useful, but should still avoid sensitive data.

Good:

```sh
pnpm deploy --env staging
```

Bad:

```sh
TOKEN=real-token pnpm deploy --env production
```

## Public API docs

Public API docs need strong consumer guidance:

- account setup
- auth keys
- rate limits
- SDKs
- examples
- compatibility
- changelog
- support path
- error docs
- deprecation policy

## Internal API docs

Internal API docs need stronger operational guidance:

- owning team
- known consumers
- internal auth model
- environment URLs
- dashboards
- runbooks
- deployment history if relevant
- schema source of truth
- migration notes

## Public CLI docs

Public CLI docs should emphasize:

- install
- auth
- first command
- common workflows
- scripting behavior
- release notes
- troubleshooting

## Internal CLI docs

Internal CLI docs should also include:

- production safety
- privileged commands
- environment-specific behavior
- approval requirements
- audit logging
- escalation

## Agent guidance

When converting internal docs to public docs, agents must not simply copy pages.

Required process:

1. Identify internal-only content.
2. Remove or rewrite sensitive details.
3. Replace internal examples with public-safe examples.
4. Ensure all links are public.
5. Remove Slack, internal dashboards, and private runbooks.
6. Preserve user-facing behavior and integration guidance.
7. Add public support path.

When converting public docs to internal docs, agents should add operational and ownership context without lowering editorial quality.
