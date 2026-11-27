// R5 (domain/rules.md §5) — evaluator. Reads only ./invoice-ready.config.ts. Decides; never throws.
import { addWorkingDays, type CalendarId, type LocalDate } from '../../calendar/index.ts';
import { invoiceReadyRule } from './invoice-ready.config.ts';

export interface InvoiceReadyInput {
  /** Date of the acceptance gate, or null when the project is not accepted. */
  readonly acceptedOn: LocalDate | null;
  readonly today: LocalDate;
  /** A confirmed client invoice exists for the project. */
  readonly hasInvoice: boolean;
  /** The project country's working calendar. */
  readonly calendar: CalendarId;
}

/** True from the 5th working day after acceptance while no confirmed client invoice is recorded. */
export function invoiceOverdue(input: InvoiceReadyInput): boolean {
  if (input.acceptedOn === null || input.hasInvoice) return false;
  return input.today >= addWorkingDays(input.acceptedOn, invoiceReadyRule.workingDays, input.calendar);
}
