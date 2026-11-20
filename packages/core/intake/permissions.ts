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
  authoriseConditionalStart: permission('intake.conditionalStart.authorise', {
    description:
      'Authorise Delivery to start before acceptance, naming the missing items and a deadline (SOP-DEL-01 §9)',
    roles: ['sponsor'],
  }),
  decideIntake: permission('intake.review.decide', {
    description:
      'Record the intake review decision: accepted, accepted with conditions or returned (SOP-DEL-01 §8)',
    roles: ['director'],
  }),
  intakeRegister: permission('intake.register.read', {
    description:
      "Intake Register: each project's submissions, decision, working days to acceptance and returns (SOP-DEL-01 §12)",
    roles: ['director', 'sponsor', 'management'],
  }),
  expireConditions: permission('intake.conditions.expire', {
    description:
      'Mark intake conditions past their deadline as expired, for the alert to Sales owner and Delivery Director (E2 AC3)',
    roles: ['system'],
  }),
  // gen:permissions — `pnpm gen:command` and `pnpm gen:query` add entries above this line.
};
