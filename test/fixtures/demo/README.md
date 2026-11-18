# Demo workspace

Open this folder (`test/fixtures/demo`) in the Extension Development Host (F5)
and click **View as diagram** on each `spec.md`.

| Spec | What it exercises |
| --- | --- |
| `specs/simple/greeting` | smallest case: 1 requirement, 1 scenario |
| `specs/simple/login` | GIVEN, AND, several scenarios |
| `specs/complex/checkout` | many requirements, long AND chains, special characters |
| `specs/edge/malformed` | missing WHEN/THEN, no scenarios, unicode, fenced code |
| `specs/edge/empty` | no requirements → "No requirements found" message |
| `changes/improve-checkout` | ADDED / MODIFIED / REMOVED / RENAMED labels |
| `changes/new-notifications` | new capability with Purpose |
