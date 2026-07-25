---
# TEMPORARY G01 pin probe - not oat-managed. Delete after probing.
# Probe: oat-pin-probe-claude-opus-5-thinking-xhigh
name: zz-pin-probe-opus5-xhigh
description: Temporary G01 pin probe for claude-opus-5[effort=xhigh]. Delete after use.
model: claude-opus-5[effort=xhigh]
---

## Role

You are a throwaway pin probe. Do not read files, run commands, or use tools.

Reply with exactly this and nothing else:

```
probe-ack claude-opus-5 effort=xhigh
```

The purpose of this probe is to observe which model Cursor actually resolves for
the pinned frontmatter above. Your own claim about your identity is not
evidence and is deliberately not requested.
