# Permission matrix (generated — do not edit)

Generated from each module’s `permissions.ts` by `pnpm gen:matrix`. CI fails when this file and the code disagree.
External roles (`client`, `partner`) are switched off in the checker until the V1.1 security review, whatever this table shows.

| Permission | What it allows | director | pm | sales | rnd | finance | management | sponsor | admin | client | partner | system |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `commercial.country.confirm` | Confirm a country DPIA or LPA an AI agent proposed (a person only, never an agent). | ✓ | ✓ |  |  | ✓ |  |  |  |  |  |  |
| `commercial.country.propose` | Record a client's DPIA or LPA for a whole country (D-45): it covers every store of that client there. Replaces the previous one, which is archived. From an AI agent it stays a proposal until a person confirms it. | ✓ | ✓ |  |  | ✓ |  | ✓ |  |  |  |  |
| `commercial.gaps.read` | For the hourly alert run: every active site with its commercial gaps — installed without a confirmed PO (R14) or without an approved DPIA (R24), without an owner (R26), accepted 5 working days ago without a confirmed client invoice (R5), an approved installer cost above the client price (R27), and more than one open client PO (R13). A batch PO or invoice counts for every store linked to it (D-45). |  |  |  |  |  |  |  |  |  |  | ✓ |
| `commercial.portfolio.read` | Commercial status of every site the actor may see: client PO, DPIA, invoices, price list in EUR, and AI proposals waiting for confirmation. | ✓ | ✓ |  |  | ✓ | ✓ | ✓ |  |  |  |  |
| `commercial.record.archive` | Archive a wrong or replaced commercial record of a site, with a reason; never deleted. | ✓ | ✓ |  |  | ✓ |  |  |  |  |  |  |
| `commercial.record.confirm` | Confirm a commercial record an AI agent proposed (a person only, never an agent): money data is applied only when confirmed. | ✓ | ✓ |  |  | ✓ |  |  |  |  |  |  |
| `commercial.record.propose` | Record a client PO, DPIA status, client invoice or price-list price on a site; amounts in the original currency and EUR. From an AI agent it stays a proposal until a PM confirms it. | ✓ | ✓ |  |  | ✓ |  | ✓ |  |  |  |  |
| `commercial.site.read` | The commercial records of one site (PO, DPIA, invoice, price list): confirmed and proposed, with amounts in original currency and EUR. | ✓ | ✓ |  |  | ✓ | ✓ | ✓ |  |  |  |  |
| `devices.device.register` | Register a device on a project: SN, MAC, model, firmware, network, status (E4 AC1) | ✓ | ✓ |  | ✓ |  |  |  |  |  |  |  |
| `devices.device.setVersions` | Set firmware and algorithm version on devices of a project (D-31) | ✓ | ✓ |  | ✓ |  |  |  |  |  |  |  |
| `devices.firmwareIssue.record` | Record a known problem of a firmware version of a model (D-31, R&D reference) | ✓ |  |  | ✓ |  |  |  |  |  |  |  |
| `devices.offline.due` | Devices offline longer than R15 allows on projects with alerts on (system only) |  |  |  |  |  |  |  |  |  |  | ✓ |
| `devices.platform.syncDevices` | Sync a project's devices and their online status from the device platform (system only, E4, D-29) |  |  |  |  |  |  |  |  |  |  | ✓ |
| `devices.platform.syncZones` | Sync a project's zones (stores, areas, gates) from the device platform (system only, E4) |  |  |  |  |  |  |  |  |  |  | ✓ |
| `devices.platformSites.read` | Projects linked to a mall on the device platform, with their alerts switch (system only) |  |  |  |  |  |  |  |  |  |  | ✓ |
| `devices.siteDevices.read` | See a project's devices: platform status, offline since, the gate each channel counts (E4) | ✓ | ✓ | ✓ | ✓ |  | ✓ | ✓ |  |  |  |  |
| `identity.agent.revoke` | Disconnect an AI agent the person connected to OCS: revoke its tokens and the consent at once (D-33) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `identity.agentResource.setup` | Create the MCP resource client OCS uses to check AI agent tokens (introspection); its secret is shown once (D-33) |  |  |  |  |  |  |  | ✓ |  |  |  |
| `identity.invitation.accept` | Grant the invited roles once the invited person has set a password (system only) |  |  |  |  |  |  |  |  |  |  | ✓ |
| `identity.invitation.bootstrapAdmin` | Invite the first admin while no user exists (system only, installation) |  |  |  |  |  |  |  |  |  |  | ✓ |
| `identity.invitation.readByToken` | Look up an open invitation by its link token (system only) |  |  |  |  |  |  |  |  |  |  | ✓ |
| `identity.self.read` | See own profile, roles and sessions | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |
| `identity.user.archive` | Archive (deactivate) a user — never delete |  |  |  |  |  |  |  | ✓ |  |  |  |
| `identity.user.assignRoles` | Grant or remove roles of a user |  |  |  |  |  |  |  | ✓ |  |  |  |
| `identity.user.invite` | Invite a new staff user by link | ✓ |  |  |  |  |  |  | ✓ |  |  |  |
| `identity.user.read` | See the user list with roles and MFA status | ✓ |  |  |  |  |  |  | ✓ |  |  |  |
| `installers.approval.record` | Record the CEO's approval of the chosen installer quote with its reference (DingTalk OA or message). Needs two comparable confirmed quotes on the same SOW, or a reason for a single quote (P-11, P-12). A person only, never an AI agent. | ✓ | ✓ |  |  |  |  |  |  |  |  |  |
| `installers.job.create` | Create an installer job on a site: installer, scope (partial/full on-site), number of sensors, SOW version; the installer's real name stays internal. | ✓ | ✓ |  |  |  |  |  |  |  |  |  |
| `installers.job.setStatus` | Move an installer job on: scheduled (with date), done, attended but site not ready, or cancelled, with an outcome note. | ✓ | ✓ |  |  |  |  |  |  |  |  |  |
| `installers.partners.read` | Installer companies (partners) with their internal names and country, for choosing an installer on a job or quote. Staff only; never shown to clients. | ✓ | ✓ |  |  | ✓ | ✓ | ✓ |  |  |  |  |
| `installers.quote.confirm` | Confirm an installer quote an AI agent proposed (a person only, never an agent). | ✓ | ✓ |  |  | ✓ |  |  |  |  |  |  |
| `installers.quote.propose` | Record an installer's price proposal for a job: line items per unit, hour, travel and extras, currency and EUR, validity and source (mail, PDF, Excel, WhatsApp). From an AI agent it stays a proposal until a PM confirms it. | ✓ | ✓ |  |  | ✓ |  |  |  |  |  |  |
| `installers.quoteChecks.read` | For the hourly alert run: every active site with an installer job, flagged when a confirmed quote of a job still being quoted is, per sensor, more than 20 % above the average of the other confirmed quotes of the same country and scope — labour or total (R29, D-44). |  |  |  |  |  |  |  |  |  |  | ✓ |
| `installers.site.read` | Installer jobs of one site with their quotes (lines, original currency and EUR, confirmed or proposed) side by side for comparison. | ✓ | ✓ |  |  | ✓ | ✓ | ✓ |  |  |  |  |
| `intake.conditionalStart.authorise` | Authorise Delivery to start before acceptance, naming the missing items and a deadline (SOP-DEL-01 §9) |  |  |  |  |  |  | ✓ |  |  |  |  |
| `intake.conditions.expire` | Mark intake conditions past their deadline as expired, for the alert to Sales owner and Delivery Director (E2 AC3) |  |  |  |  |  |  |  |  |  |  | ✓ |
| `intake.dispute.decide` | Decide an intake dispute: uphold the return, or overturn it so the Delivery Director reviews the card again (SOP-DEL-01 §9) |  |  |  |  |  |  | ✓ |  |  |  |  |
| `intake.dispute.raise` | Dispute a Returned intake decision: the sponsor decides within 2 working days; work does not start meanwhile (SOP-DEL-01 §9) |  |  | ✓ |  |  |  |  |  |  |  |  |
| `intake.handoverCard.read` | See a project's current Handover Card: status, package, items, gaps, decision and conditions (E2) | ✓ | ✓ | ✓ |  |  | ✓ | ✓ |  |  |  |  |
| `intake.handoverCard.save` | Save the Handover Card draft of a project: Annex B content and the §6 items it covers (SOP-DEL-01 §5 step 2) | ✓ |  | ✓ |  |  |  |  |  |  |  |  |
| `intake.handoverCard.submit` | Submit the Handover Card for intake review; refused while a §6 item is missing (SOP-DEL-01 §5 step 3) | ✓ |  | ✓ |  |  |  |  |  |  |  |  |
| `intake.register.read` | Intake Register: each project's submissions, decision, working days to acceptance and returns (SOP-DEL-01 §12) | ✓ |  |  |  |  | ✓ | ✓ |  |  |  |  |
| `intake.review.decide` | Record the intake review decision: accepted, accepted with conditions or returned (SOP-DEL-01 §8) | ✓ |  |  |  |  |  |  |  |  |  |  |
| `lifecycle.gateTemplate.archive` | Archive a gate template; its projects fall back to the next scope (D-32) | ✓ |  |  |  |  |  | ✓ |  |  |  |  |
| `lifecycle.gateTemplate.save` | Create or replace the gate template of a scope: base, client, programme, country (D-32) | ✓ |  |  |  |  |  | ✓ |  |  |  |  |
| `lifecycle.gateTemplates.read` | See the gate templates and their scopes (D-32) | ✓ | ✓ |  |  |  | ✓ | ✓ |  |  |  |  |
| `lifecycle.installation.plan` | Set the planned installation date, only once the site card is complete (SOP-DEL-04 §1) | ✓ | ✓ |  |  |  |  |  |  |  |  |  |
| `lifecycle.programmeTracker.read` | The programme tracker (E11 AC3): every project with stage, planned installation, readiness and gates, by client, programme or country | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `lifecycle.readinessGaps.read` | For the hourly alert run: every active project, flagged when installation is within the readiness window and readiness is not confirmed (R9). |  |  |  |  |  |  |  |  |  |  | ✓ |
| `lifecycle.siteLifecycle.read` | See a project's steps, gates, installation plan and readiness (E3) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `lifecycle.step.record` | Record a step reached on a project — base step or gate — with date and evidence (E3 AC1) | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |
| `org.client.create` | Create a client (top of the SOP-DEL-02 hierarchy) | ✓ |  |  |  |  |  |  | ✓ |  |  |  |
| `org.client.list` | See the clients the signed-in person may see: short code and name (E1) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `org.complianceScope.set` | Set whether a client agrees DPIA and LPA per store or once per country (D-45); per country, a country record covers every store. | ✓ |  |  |  |  |  |  |  |  |  |  |
| `org.partner.assign` | Assign a partner to a client under the next Partner letter | ✓ | ✓ |  |  |  |  |  | ✓ |  |  |  |
| `org.partner.create` | Register a partner company (real name, staff only) | ✓ |  |  |  |  |  |  | ✓ |  |  |  |
| `org.partner.labels` | See a client's partners as Partner A/B/C (no real names) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |
| `org.partner.list` | See partners with real names and their client letters (staff) | ✓ | ✓ |  |  |  |  |  | ✓ |  |  |  |
| `org.programme.create` | Create a programme under a client (optional level, SOP-DEL-02 §3) | ✓ |  |  |  |  |  |  | ✓ |  |  |  |
| `org.site.changeStandard` | Change a site's standard L ↔ S (D-25) | ✓ | ✓ |  |  |  |  |  | ✓ |  |  |  |
| `org.site.create` | Create a project/site; generates its Project ID | ✓ |  |  |  |  |  |  | ✓ |  |  |  |
| `org.site.list` | See the projects/sites the signed-in person may see, with Project ID, city and standard (E1) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `org.site.setDeviceAlerts` | Link a project to its mall on the device platform and switch its offline alerts on or off (E4) | ✓ | ✓ |  |  |  |  |  |  |  |  |  |
| `quotations.config.save` | Set a client's quotation settings for one country: currency, hourly rate, tax mode (reverse charge or DDP with local VAT), seller, buyer, bank details, terms and number prefix. Replaces the active settings. | ✓ |  |  |  |  |  | ✓ |  |  |  |  |
| `quotations.price.save` | Set a sensor model's unit price for a client in one currency; replaces the active price. | ✓ |  |  |  |  |  | ✓ |  |  |  |  |
| `quotations.quotation.draft` | Draft a client quotation for a batch of stores: sensors (model price × count) and installation (hours × rate) as separate lines; hours by the time standard (partial N + 2, full 2N + 2 per store), an override needs a reason; tax by the country's settings. A draft only; a person sends it. | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |
| `work.action.complete` | Mark an action done (its owner, or a director or PM) | ✓ | ✓ | ✓ | ✓ |  |  | ✓ |  |  |  |  |
| `work.action.create` | Create an action with one owner and a due date (SOP-DEL-03) | ✓ | ✓ | ✓ | ✓ |  |  | ✓ |  |  |  |  |
| `work.action.list` | See open actions by project or owner | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `work.alert.raise` | Raise an automatic alert (e.g. R15 device offline) as an internal action owned by the project's PM or a named owner (system only) |  |  |  |  |  |  |  |  |  |  | ✓ |
| `work.alert.resolve` | Withdraw the open actions of alerts that cleared, e.g. a device back online (system only) |  |  |  |  |  |  |  |  |  |  | ✓ |
| `work.comment.add` | Comment on a project, @mentioning staff (E5 AC2) | ✓ | ✓ | ✓ | ✓ | ✓ |  | ✓ |  |  |  |  |
| `work.comment.toAction` | Turn a comment into an action with an owner and a due date (E5 AC2) | ✓ | ✓ |  |  |  |  |  |  |  |  |  |
| `work.feed.list` | See a project's feed: actions, comments and visits with their sources (E5 AC4) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `work.staff.list` | See active staff to @mention or assign (E5 AC2) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `work.visit.record` | Record a site visit and its action items the same day (SOP-DEL-03 §5.1) | ✓ | ✓ |  | ✓ |  |  |  |  |  |  |  |
