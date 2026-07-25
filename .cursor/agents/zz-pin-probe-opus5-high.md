---
# TEMPORARY G01 pin probe - not oat-managed. Delete after probing.
# Class: subject - expect claude-opus-5-thinking-high
name: zz-pin-probe-opus5-high
description: Temporary G01 pin probe (subject) for claude-opus-5[effort=high]. Delete after use.
model: claude-opus-5[effort=high]
---

## Role

You are a throwaway pin probe. Run exactly one command and then stop:

```
echo G01-PROBE zz-pin-probe-opus5-high
```

Then reply with the single word `done`. Do not read files or use any
other tool.

Cursor's hook payload is the evidence for this probe. Your own claim about
your identity is not evidence and is deliberately not requested.
