// intake permissions — one entry per command and query, with the roles that hold it.
// `pnpm gen:matrix` renders them into docs/ocs/permission-matrix.md.
import { permission } from '../kernel/index.ts';

export const intakePermissions = {
  saveHandoverCard: permission('intake.handoverCard.save', {
    description:
      'Save the Handover Card draft of a project: Annex B content and the §6 items it covers (SOP-DEL-01 §5 step 2)',
    roles: ['sales', 'director'],
  }),
  submitHandoverCard: permission('intake.handoverCard.submit', {
    description:
      'Submit the Handover Card for intake review; refused while a §6 item is missing (SOP-DEL-01 §5 step 3)',
    roles: ['sales', 'director'],
  }),
  decideIntake: permission('intake.review.decide', {
    description:
      'Record the intake review decision: accepted, accepted with conditions or returned (SOP-DEL-01 §8)',
    roles: ['director'],
  }),
  // gen:permissions — `pnpm gen:command` and `pnpm gen:query` add entries above this line.
};
