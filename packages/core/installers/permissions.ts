// installers permissions — one entry per command and query, with the roles that hold it.
// `pnpm gen:matrix` renders them into docs/ocs/permission-matrix.md.
import { permission } from '../kernel/index.ts';

export const installersPermissions = {
  createJob: permission('installers.job.create', {
    description:
      "Create an installer job on a site: installer, scope (partial/full on-site), number of sensors, SOW version; the installer's real name stays internal.",
    roles: ['director', 'pm'],
  }),
  proposeQuote: permission('installers.quote.propose', {
    description:
      "Record an installer's price proposal for a job: line items per unit, hour, travel and extras, currency and EUR, validity and source (mail, PDF, Excel, WhatsApp). From an AI agent it stays a proposal until a PM confirms it.",
    roles: ['director', 'pm', 'finance'],
  }),
  siteJobs: permission('installers.site.read', {
    description:
      'Installer jobs of one site with their quotes (lines, original currency and EUR, confirmed or proposed) side by side for comparison.',
    roles: ['director', 'pm', 'finance', 'sponsor', 'management'],
  }),
  // gen:permissions — `pnpm gen:command` and `pnpm gen:query` add entries above this line.
};
