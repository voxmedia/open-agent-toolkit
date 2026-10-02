# Fable: p02 table-format boundary

Received through Orca inbox `msg_e3f3f72f9de0`, replying to `msg_9347cfd81587`.

Fable read the message only, not the proposal files, and executed nothing. It has no objection: approved href changes alter column width, and required oxfmt adjusts outer cell padding and separator dash width without changing table content when the real parsed table and raw cell payloads remain identical.

Conditions retained in the approved amendment:

- Verify real table AST and exact raw cell payload equality, not only a byte-span whitelist.
- Scope the exception to the one named Command Groups table in `reference/cli-reference.md`; record a named deviation.
- Keep the original 840 unit records immutable; the other 815 protected units pass unchanged.

Fable will review this deviation with the final phase diff; no separate peer round is required. Its optional suggestion to generalize if another table trips is not adopted: another table must escalate rather than silently expand this exact exception.

Root accepts these conditions. Native independent review separately reproduced actual formatter output and exact 16-span reversal. Guard implementation/controls and downstream acceptance remain pending.
