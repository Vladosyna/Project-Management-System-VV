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
  confirmQuote: permission('installers.quote.confirm', {
    description: 'Confirm an installer quote an AI agent proposed (a person only, never an agent).',
    roles: ['director', 'pm', 'finance'],
  }),
  recordApproval: permission('installers.approval.record', {
    description:
      "Record the CEO's approval of the chosen installer quote with its reference (DingTalk OA or message). Needs two comparable confirmed quotes on the same SOW, or a reason for a single quote (P-11, P-12). A person only, never an AI agent.",
    roles: ['director', 'pm'],
  }),
  setJobStatus: permission('installers.job.setStatus', {
    description:
      'Move an installer job on: scheduled (with date), done, attended but site not ready, or cancelled, with an outcome note.',
    roles: ['director', 'pm'],
  }),
  partners: permission('installers.partners.read', {
    description:
      'Installer companies (partners) with their internal names and country, for choosing an installer on a job or quote. Staff only; never shown to clients.',
    roles: ['director', 'pm', 'finance', 'sponsor', 'management'],
  }),
  quoteChecks: permission('installers.quoteChecks.read', {
    description:
      'For the hourly alert run: every active site with an installer job, flagged when a confirmed quote of a job still being quoted has more hours than the time standard — partial N + 2 h, full 2N + 2 h (R29).',
    roles: ['system'],
  }),
  // gen:permissions — `pnpm gen:command` and `pnpm gen:query` add entries above this line.
};
