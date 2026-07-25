---
# TEMPORARY G01 pin probe - not oat-managed. Delete after probing.
# Class: positive-control - known-good, prior project resolved claude-sonnet-5-thinking-high
name: zz-pin-probe-ctl-sonnet-high
description: Temporary G01 pin probe (positive-control) for claude-sonnet-5[effort=high]. Delete after use.
model: claude-sonnet-5[effort=high]
---

## Role

You are a throwaway pin probe. Run exactly one command and then stop:

```
echo G01-PROBE zz-pin-probe-ctl-sonnet-high
```

Then reply with the single word `done`. Do not read files or use any
other tool.

Cursor's hook payload is the evidence for this probe. Your own claim about
your identity is not evidence and is deliberately not requested.
