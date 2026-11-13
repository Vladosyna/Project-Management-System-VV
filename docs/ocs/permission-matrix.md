# Permission matrix (generated — do not edit)

Generated from each module’s `permissions.ts` by `pnpm gen:matrix`. CI fails when this file and the code disagree.
External roles (`client`, `partner`) are switched off in the checker until the V1.1 security review, whatever this table shows.

| Permission | What it allows | director | pm | sales | rnd | finance | management | sponsor | admin | client | partner | system |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `devices.device.register` | Register a device on a project: SN, MAC, model, firmware, network, status (E4 AC1) | ✓ | ✓ |  | ✓ |  |  |  |  |  |  |  |
| `devices.platform.syncDevices` | Sync a project's devices and their online status from the device platform (system only, E4, D-29) |  |  |  |  |  |  |  |  |  |  | ✓ |
| `identity.invitation.accept` | Grant the invited roles once the invited person has set a password (system only) |  |  |  |  |  |  |  |  |  |  | ✓ |
| `identity.invitation.bootstrapAdmin` | Invite the first admin while no user exists (system only, installation) |  |  |  |  |  |  |  |  |  |  | ✓ |
| `identity.invitation.readByToken` | Look up an open invitation by its link token (system only) |  |  |  |  |  |  |  |  |  |  | ✓ |
| `identity.self.read` | See own profile, roles and sessions | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |
| `identity.user.archive` | Archive (deactivate) a user — never delete |  |  |  |  |  |  |  | ✓ |  |  |  |
| `identity.user.assignRoles` | Grant or remove roles of a user |  |  |  |  |  |  |  | ✓ |  |  |  |
| `identity.user.invite` | Invite a new staff user by link | ✓ |  |  |  |  |  |  | ✓ |  |  |  |
| `identity.user.read` | See the user list with roles and MFA status | ✓ |  |  |  |  |  |  | ✓ |  |  |  |
| `org.client.create` | Create a client (top of the SOP-DEL-02 hierarchy) | ✓ |  |  |  |  |  |  | ✓ |  |  |  |
| `org.client.list` | See the client list | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `org.partner.assign` | Assign a partner to a client under the next Partner letter | ✓ | ✓ |  |  |  |  |  | ✓ |  |  |  |
| `org.partner.create` | Register a partner company (real name, staff only) | ✓ |  |  |  |  |  |  | ✓ |  |  |  |
| `org.partner.labels` | See a client's partners as Partner A/B/C (no real names) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |
| `org.partner.list` | See partners with real names and their client letters (staff) | ✓ | ✓ |  |  |  |  |  | ✓ |  |  |  |
| `org.programme.create` | Create a programme under a client (optional level, SOP-DEL-02 §3) | ✓ |  |  |  |  |  |  | ✓ |  |  |  |
| `org.site.changeStandard` | Change a site's standard L ↔ S (D-25) | ✓ | ✓ |  |  |  |  |  | ✓ |  |  |  |
| `org.site.create` | Create a project/site; generates its Project ID | ✓ |  |  |  |  |  |  | ✓ |  |  |  |
| `org.site.list` | See projects/sites | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `work.action.complete` | Mark an action done (its owner, or a director or PM) | ✓ | ✓ | ✓ | ✓ |  |  | ✓ |  |  |  |  |
| `work.action.create` | Create an action with one owner and a due date (SOP-DEL-03) | ✓ | ✓ | ✓ | ✓ |  |  | ✓ |  |  |  |  |
| `work.action.list` | See open actions by project or owner | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `work.alert.raise` | Raise an automatic alert (e.g. R15 device offline) as an internal action owned by the project's PM (system only) |  |  |  |  |  |  |  |  |  |  | ✓ |
| `work.alert.resolve` | Withdraw the open actions of alerts that cleared, e.g. a device back online (system only) |  |  |  |  |  |  |  |  |  |  | ✓ |
| `work.comment.add` | Comment on a project, @mentioning staff (E5 AC2) | ✓ | ✓ | ✓ | ✓ | ✓ |  | ✓ |  |  |  |  |
| `work.comment.toAction` | Turn a comment into an action with an owner and a due date (E5 AC2) | ✓ | ✓ |  |  |  |  |  |  |  |  |  |
| `work.feed.list` | See a project's feed: actions, comments and visits with their sources (E5 AC4) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `work.staff.list` | See active staff to @mention or assign (E5 AC2) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `work.visit.record` | Record a site visit and its action items the same day (SOP-DEL-03 §5.1) | ✓ | ✓ |  | ✓ |  |  |  |  |  |  |  |
