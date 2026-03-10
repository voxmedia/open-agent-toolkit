---
title: API Reference
---

# API Reference

The OAT CLI provides a comprehensive API for tool management.

!!! important "Breaking Change"
    The `v2` API removes support for legacy tool formats.
    Please migrate your tools before upgrading.

## Authentication

!!! note
    All API requests require a valid token.

```typescript
const client = new OATClient({
  token: process.env.OAT_TOKEN,
});
```

!!! example "Usage Example"
    Here's how to list your tools:

    ```typescript
    const tools = await client.tools.list();
    console.log(tools);
    ```
