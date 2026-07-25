---
# TEMPORARY G01 pin probe - not oat-managed. Delete after probing.
# Class: negative-control - entitlement-blocked under ZDR, must NOT resolve to Fable
name: zz-pin-probe-ctl-fable-xhigh
description: Temporary G01 pin probe (negative-control) for claude-fable-5[effort=xhigh]. Delete after use.
model: claude-fable-5[effort=xhigh]
---

## Role

You are a throwaway pin probe. Run exactly one command and then stop:

```
echo G01-PROBE zz-pin-probe-ctl-fable-xhigh
```

Then reply with the single word `done`. Do not read files or use any
other tool.

Cursor's hook payload is the evidence for this probe. Your own claim about
your identity is not evidence and is deliberately not requested.
