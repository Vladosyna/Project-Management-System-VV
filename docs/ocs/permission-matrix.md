# Permission matrix (generated — do not edit)

Generated from each module’s `permissions.ts` by `pnpm gen:matrix`. CI fails when this file and the code disagree.
External roles (`client`, `partner`) are switched off in the checker until the V1.1 security review, whatever this table shows.

| Permission | What it allows | director | pm | sales | rnd | finance | management | sponsor | admin | client | partner | system |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `identity.self.read` | See own profile, roles and sessions | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |
| `identity.user.archive` | Archive (deactivate) a user — never delete |  |  |  |  |  |  |  | ✓ |  |  |  |
| `identity.user.assignRoles` | Grant or remove roles of a user |  |  |  |  |  |  |  | ✓ |  |  |  |
| `identity.user.invite` | Invite a new staff user by link | ✓ |  |  |  |  |  |  | ✓ |  |  |  |
| `identity.user.read` | See the user list with roles and MFA status | ✓ |  |  |  |  |  |  | ✓ |  |  |  |
