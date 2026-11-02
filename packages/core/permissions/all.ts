// Loads every module so the permission registry is complete (each module's index.ts exports its
// permissions). `pnpm gen:module` appends a line; matrix.test.ts fails when a module is missing here.
import '../calendar/index.ts';
import '../identity/index.ts';
import '../org/index.ts';
import '../devices/index.ts';
import '../intake/index.ts';
import '../work/index.ts';
