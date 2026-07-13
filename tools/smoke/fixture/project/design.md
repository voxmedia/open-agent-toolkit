---
oat_status: complete
oat_template: false
---

# Design: Smoke Fixture

Each task appends the byte-stable line `<task-id> completed` to its phase log.
The fixture workspace has one log per phase, making `p01` and `p02` disjoint.
`p03` runs after both parallel phases complete. The launcher records configured
target evidence separately; deterministic fixture log lines contain neither
timestamps nor worker-declared targets.
