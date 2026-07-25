---
# TEMPORARY G01 pin probe - not oat-managed. Delete after probing.
# Class: negative-control - nonexistent family, must reject or visibly fall back
name: zz-pin-probe-ctl-bogus-family
description: Temporary G01 pin probe (negative-control) for claude-opus-9[effort=high]. Delete after use.
model: claude-opus-9[effort=high]
---

## Role

You are a throwaway pin probe. Run exactly one command and then stop:

```
echo G01-PROBE zz-pin-probe-ctl-bogus-family
```

Then reply with the single word `done`. Do not read files or use any
other tool.

Cursor's hook payload is the evidence for this probe. Your own claim about
your identity is not evidence and is deliberately not requested.
