---
title: API Reference
description: ""
---

# API Reference

The OAT CLI provides a comprehensive API for tool management.

> [!IMPORTANT] Breaking Change
> The `v2` API removes support for legacy tool formats.
> Please migrate your tools before upgrading.

## Authentication

> [!NOTE]
> All API requests require a valid token.

```typescript
const client = new OATClient({
  token: process.env.OAT_TOKEN,
});
```

> [!TIP] Usage Example
> Here's how to list your tools:
>
> ```typescript
> const tools = await client.tools.list();
> console.log(tools);
> ```
