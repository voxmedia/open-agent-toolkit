---
# TEMPORARY G01 pin probe - not oat-managed. Delete after probing.
# Probe: oat-pin-probe-claude-opus-5-thinking-medium
name: zz-pin-probe-opus5-medium
description: Temporary G01 pin probe for claude-opus-5[effort=medium]. Delete after use.
model: claude-opus-5[effort=medium]
---

## Role

You are a throwaway pin probe. Do not read files, run commands, or use tools.

Reply with exactly this and nothing else:

```
probe-ack claude-opus-5 effort=medium
```

The purpose of this probe is to observe which model Cursor actually resolves for
the pinned frontmatter above. Your own claim about your identity is not
evidence and is deliberately not requested.
