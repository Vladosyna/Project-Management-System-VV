// F0.9 / F0.11 e2e smoke: an invited admin gets in with password + TOTP, sees the shell from the Main
// mockup in EN and 中文, navigates, adds a passkey and signs in with it (ADR-002 passkey gap).
import { expect, test, type Browser, type Page } from '@playwright/test';
import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Secret, TOTP } from 'otpauth';

const PASSWORD = 'correct horse battery staple';
let totp: TOTP;

const code = () => totp.generate();
const code_ = code;

async function expectShell(page: Page) {
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Person 01');
}

test.describe.configure({ mode: 'serial' });

test('a signed-out visitor is sent to sign-in', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

test('invited admin: accept invitation, set up TOTP, land in the shell', async ({ page }) => {
  await page.goto(`/accept-invitation#${process.env.OCS_E2E_INVITE_TOKEN ?? ''}`);
  await page.getByLabel('Your name').fill('Person 01');
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('heading', { name: 'Set up two-factor authentication' })).toBeVisible();
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('img', { name: 'QR code for the authenticator app' })).toBeVisible();
  const secret = (await page.getByTestId('totp-secret').textContent()) ?? '';
  totp = new TOTP({ secret: Secret.fromBase32(secret.trim()) });
  await page.getByLabel('Code from your authenticator app').fill(code());
  await page.getByRole('button', { name: 'Confirm' }).click();

  await expectShell(page);
  await expect(page.getByTestId('signed-in-user')).toContainText('Admin');
  await page.screenshot({ path: 'test-results/shell-en.png', fullPage: true });
});

test('the shell switches to 中文 and back, and navigation marks the current screen', async ({ page }) => {
  await signInWithPassword(page);
  await page.getByRole('button', { name: 'Switch to Chinese' }).click();
  await expect(page.getByRole('link', { name: '首页' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Person 01');
  await expect(page.getByTestId('signed-in-user')).toContainText('管理员');
  await page.screenshot({ path: 'test-results/shell-zh.png', fullPage: true });
  await page.getByRole('button', { name: '切换为英文' }).click();

  await page.getByRole('link', { name: 'Cases' }).click();
  await expect(page.getByRole('link', { name: 'Cases' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('This screen arrives with its epic')).toBeVisible();
});

test('a passkey can be added and then used to sign in', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });

  await signInWithPassword(page);
  await page.getByRole('button', { name: 'Add a passkey' }).click();
  await expect(page.getByText('Passkey added.')).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByRole('button', { name: 'Sign in with a passkey' }).click();
  await expectShell(page);
});

test('Portfolio shows the seeded clients and their Project IDs (F0.11, E1)', async ({ page }) => {
  await signInWithPassword(page);
  await page.getByRole('link', { name: 'Portfolio' }).click();
  for (const client of ['Client A', 'Client B', 'Client C']) {
    await expect(page.getByRole('heading', { level: 2, name: new RegExp(client) })).toBeVisible();
  }
  await expect(page.getByRole('cell', { name: 'CLIENTA-ES-MAD-001' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'CLIENTC-PT-LIS-003' })).toBeVisible();
  await page.screenshot({ path: 'test-results/portfolio-en.png', fullPage: true });
});

test('Actions shows open actions in columns with owner, date and source (E5)', async ({ page }) => {
  await signInWithPassword(page);
  await page.getByRole('link', { name: 'Actions & alerts' }).click();
  for (const column of [/^Open · 2$/, /^In progress · 0$/, /^Waiting on someone · 1$/]) {
    await expect(page.getByRole('heading', { level: 2, name: column })).toBeVisible();
  }
  await expect(page.getByText('Provide the floor plan')).toBeVisible();
  await expect(page.getByText('Source: Mail · Message 0001')).toBeVisible();
  await expect(page.getByText('Overdue')).toBeVisible();
  await page.screenshot({ path: 'test-results/actions-en.png', fullPage: true });
  // The signed-in admin owns none of the seeded actions.
  await page.getByRole('button', { name: 'Mine' }).click();
  await expect(page.getByRole('heading', { level: 2, name: /^Open · 0$/ })).toBeVisible();
});

test('a Site page shows its timeline with the source on every item (E5 AC4)', async ({ page }) => {
  await signInWithPassword(page);
  await page.getByRole('link', { name: 'Sites' }).click();
  await page.getByRole('link', { name: 'CLIENTA-ES-MAD-001' }).click();
  // Overview first (Vlad, 13 Nov): a tile per topic, each opening its tab.
  await expect(page.getByRole('link', { name: /^Open actions/ })).toBeVisible();
  await page.screenshot({ path: 'test-results/site-overview-en.png', fullPage: true });
  await page.getByRole('link', { name: /^Last visit/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Timeline & comments' })).toBeVisible();
  await expect(page.getByText('Provide the floor plan')).toBeVisible();
  await expect(page.getByText('Source: Mail · Message 0001')).toBeVisible();
  await expect(page.getByText('Source: Site visit')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sites' })).toHaveAttribute('aria-current', 'page');
  await page.screenshot({ path: 'test-results/site-en.png', fullPage: true });
});

test('a PM comments on a Site with a mention turns it into an action and records a visit; an admin may not comment (E5 AC2, AC3)', async ({
  page,
  browser,
}) => {
  await signInWithPassword(page);
  await page.getByRole('link', { name: 'Sites' }).click();
  await page.getByRole('link', { name: 'CLIENTA-ES-MAD-002' }).click();
  await page.getByRole('link', { name: 'Timeline', exact: true }).click();
  await page.getByLabel('Comment', { exact: true }).fill('Admins do not comment');
  await page.getByRole('button', { name: 'Add comment' }).click();
  await expect(page.getByText('Your role may not comment on projects.')).toBeVisible();

  // The admin invites a PM, who joins with password + TOTP and comments, mentioning the admin.
  const res = await page.request.post('/api/users/invitations', {
    data: { email: 'pm.e2e@example.com', roles: ['pm'] },
  });
  expect(res.status()).toBe(201);
  const { link } = (await res.json()) as { link: string };
  const pm = await (await browser.newContext()).newPage();
  await pm.goto(link);
  await expect(pm.getByLabel('Your name')).toBeVisible();
  await pm.getByLabel('Your name').fill('Person 02');
  await pm.getByLabel('Password').fill(PASSWORD);
  await pm.getByRole('button', { name: 'Create account' }).click();
  await expect(pm.getByRole('heading', { name: 'Set up two-factor authentication' })).toBeVisible();
  await pm.getByLabel('Password').fill(PASSWORD);
  await pm.getByRole('button', { name: 'Continue' }).click();
  await expect(pm.getByRole('img', { name: 'QR code for the authenticator app' })).toBeVisible();
  const secret = (await pm.getByTestId('totp-secret').textContent()) ?? '';
  const pmTotp = new TOTP({ secret: Secret.fromBase32(secret.trim()) });
  await pm.getByLabel('Code from your authenticator app').fill(pmTotp.generate());
  await pm.getByRole('button', { name: 'Confirm' }).click();
  await expect(pm.getByRole('heading', { level: 1 })).toContainText('Person 02');

  await pm.getByRole('link', { name: 'Sites' }).click();
  await pm.getByRole('link', { name: 'CLIENTA-ES-MAD-002' }).click();
  await pm.getByRole('link', { name: 'Timeline', exact: true }).click();
  await pm.getByLabel('Comment', { exact: true }).fill('Ceiling height checked — 4.2 m');
  await pm.getByRole('checkbox', { name: 'Person 01' }).check();
  await pm.getByRole('button', { name: 'Add comment' }).click();
  const item = pm.getByRole('listitem').filter({ hasText: 'Ceiling height checked — 4.2 m' });
  await expect(item).toBeVisible();
  await expect(item.getByText('Source: Entered by hand')).toBeVisible();
  await expect(pm.getByLabel('Comment', { exact: true })).toHaveValue('');
  await pm.screenshot({ path: 'test-results/site-comment-en.png', fullPage: true });

  // "Make it an action": owner and due date; the action shows on the timeline and on Actions.
  await item.getByRole('button', { name: 'Make it an action' }).click();
  await item.getByLabel('Owner').selectOption({ label: 'Person 02' });
  await item.getByLabel('Due date').fill('2099-11-20');
  await item.getByRole('button', { name: 'Create action' }).click();
  const action = pm
    .getByRole('listitem')
    .filter({ hasText: 'Action' })
    .filter({ hasText: 'Ceiling height checked — 4.2 m' });
  await expect(action.getByText('Source: Comment')).toBeVisible();
  await pm.getByRole('link', { name: 'Actions & alerts' }).click();
  await pm.getByRole('button', { name: 'Mine' }).click();
  await expect(pm.getByText('Ceiling height checked — 4.2 m')).toBeVisible();
  await expect(pm.getByText('Person 02 · due 2099-11-20')).toBeVisible();

  // Record a visit (SOP-DEL-03 §5.1): a shortfall without a reason is refused; with it, the record and its
  // action item land on the timeline.
  await pm.getByRole('link', { name: 'Sites' }).click();
  await pm.getByRole('link', { name: 'CLIENTA-ES-MAD-002' }).click();
  await pm.getByRole('link', { name: 'Timeline', exact: true }).click();
  await pm.getByRole('button', { name: 'Record a visit' }).click();
  await pm.getByLabel('Attendee').fill('Person 02');
  await pm.getByRole('button', { name: 'Add attendee' }).click();
  await pm.getByLabel('Attendee').nth(1).fill('Person B');
  await pm.getByLabel(/^Executive summary/).fill('Coverage checked after the switch upgrade');
  await pm.getByLabel(/^Decided/).fill('Remaining zones checked next visit');
  await pm.getByLabel(/^Agreed with/).fill('Person B');
  await pm.getByLabel('Covered (X)').fill('6');
  await pm.getByLabel('Of (Y)').fill('20');
  await pm.getByLabel('Action item').fill('Send the fibre spec to client IT');
  await pm.getByLabel('Owner').selectOption({ label: 'Person 02' });
  await pm.getByLabel('Due date').fill('2099-11-27');
  await pm.getByRole('button', { name: 'Save visit record' }).click();
  await expect(pm.getByText(/^The record was not accepted/)).toBeVisible();
  await pm.getByLabel('Why the rest was not covered').fill('No access to the top floor');
  await pm.getByRole('button', { name: 'Save visit record' }).click();
  const visit = pm.getByRole('listitem').filter({ hasText: 'Coverage checked after the switch upgrade' });
  await expect(visit.getByText(/Site visit · coverage 6 of 20/)).toBeVisible();
  await expect(
    pm
      .getByRole('listitem')
      .filter({ hasText: 'Send the fibre spec to client IT' })
      .getByText('Source: Site visit'),
  ).toBeVisible();
  await pm.screenshot({ path: 'test-results/site-visit-en.png', fullPage: true });

  // E3 (SOP-DEL-04 §1): no installation date before the card is complete; steps go in order.
  await pm.getByRole('link', { name: 'Lifecycle', exact: true }).click();
  await pm.getByLabel('Planned installation').fill('2026-12-15');
  await pm.getByRole('button', { name: 'Set installation date' }).click();
  await expect(pm.getByText(/^Not allowed yet/)).toBeVisible();
  for (const [step, label] of [
    ['card_received', 'Card received'],
    ['card_complete', 'Card complete'],
  ] as const) {
    await pm.getByLabel('Step', { exact: true }).selectOption(step);
    await pm.getByLabel('Date', { exact: true }).fill('2026-11-16');
    await pm.getByRole('button', { name: 'Record step' }).click();
    await expect(pm.getByRole('row', { name: new RegExp(`^${label} 2026-11-16`) })).toBeVisible();
  }
  await pm.getByLabel('Planned installation').fill('2026-12-15');
  await pm.getByRole('button', { name: 'Set installation date' }).click();
  await expect(pm.getByText(/^Planned installation: 2026-12-15/)).toBeVisible();
  // The overview's Stage tile shows the last step and links to the Lifecycle tab.
  await pm.getByRole('link', { name: 'Overview', exact: true }).click();
  const stage = pm.getByRole('link', { name: /^Stage Card complete/ });
  await expect(stage).toContainText('installation 2026-12-15');
  await stage.click();
  await expect(pm.getByText(/^Planned installation: 2026-12-15/)).toBeVisible();
  await pm.getByRole('link', { name: 'Devices', exact: true }).click();
  await expect(pm.getByText(/^No devices yet/)).toBeVisible();
  // D-29 fallback and D-31: register a device by SN, then set its firmware; an issue is R&D's to record.
  await pm.getByLabel('Serial').fill('SN-E2E-0001');
  await pm.getByLabel('Model', { exact: true }).first().fill('G6');
  await pm.getByRole('button', { name: 'Register device' }).click();
  await expect(pm.getByRole('cell', { name: 'SN-E2E-0001' })).toBeVisible();
  await pm.getByRole('checkbox', { name: 'SN-E2E-0001' }).check();
  await pm.getByLabel('Firmware', { exact: true }).first().fill('3.2.1');
  await pm.getByRole('button', { name: 'Save versions' }).click();
  await expect(pm.getByRole('cell', { name: /^3\.2\.1/ })).toBeVisible();
  await pm.getByLabel('What goes wrong').fill('Counts drop after 72 h');
  await pm.getByLabel('Model', { exact: true }).last().fill('G6');
  await pm.getByLabel('Firmware', { exact: true }).last().fill('3.2.1');
  await pm.getByRole('button', { name: 'Record problem' }).click();
  await expect(pm.getByText('Your role cannot change this.')).toBeVisible();
  await pm.getByRole('link', { name: 'Network', exact: true }).click();
  await expect(pm.getByRole('heading', { level: 2, name: 'Network' })).toBeVisible();
  await pm.getByRole('link', { name: 'Settings', exact: true }).click();
  // E4 (Vlad, 3 Nov): alerts need the mall; linking it and ticking the box saves both.
  await pm.getByRole('checkbox', { name: /offline more than 24 h/ }).check();
  await pm.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(pm.getByText('Link the mall first: alerts need it.')).toBeVisible();
  await pm.getByLabel('Mall on the device platform').fill('mall-a');
  await pm.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(pm.getByText('Saved.')).toBeVisible();
});

test('a director sets the gates of a client and a country; an admin may not see them (D-32)', async ({
  page,
  browser,
}) => {
  await signInWithPassword(page);
  await page.goto('/admin');
  await expect(page.getByText('Only a director or sponsor can see gate templates.')).toBeVisible();
  // D-33: the admin sets up the token-check client once; the secret is shown once for the secret store.
  await page.getByRole('button', { name: 'Create the token-check client' }).click();
  await expect(page.getByTestId('agent-client-id')).not.toBeEmpty();
  await expect(page.getByText(/^Shown only now/)).toBeVisible();

  const director = await join(browser, page, 'director.e2e@example.com', 'Person 03', ['director']);
  await director.getByRole('link', { name: 'Admin' }).click();
  await expect(director.getByText('No gate templates yet.')).toBeVisible();
  // Base template: two gates, typed in reverse and reordered; the key comes from the name.
  await director.getByLabel('Template name').fill('Standard');
  await director.getByLabel('Gate 1', { exact: true }).fill('Training done');
  await director.getByRole('button', { name: 'Add gate' }).click();
  await director.getByLabel('Gate 2', { exact: true }).fill('Site survey');
  await expect(director.getByLabel('Key of gate 2')).toHaveValue('site_survey');
  await director.getByRole('button', { name: 'Move up gate 2' }).click();
  await director.getByRole('button', { name: 'Save template' }).click();
  await expect(director.getByText('Saved.')).toBeVisible();
  const base = director.getByRole('row', { name: /^All projects \(base\) Standard/ });
  await expect(base.getByText('Site survey → Training done')).toBeVisible();
  // The same client in Spain gets its own gates.
  await director.getByLabel('Client').selectOption({ label: 'CLIENTA — Client A' });
  await director.getByLabel('Country').fill('es');
  await director.getByLabel('Template name').fill('Client A Spain');
  await director.getByRole('button', { name: 'Add gate' }).click();
  await director.getByLabel('Gate 3', { exact: true }).fill('Landlord sign-off');
  await director.getByRole('button', { name: 'Save template' }).click();
  const spain = director.getByRole('row', { name: /^CLIENTA · ES Client A Spain/ });
  await expect(spain.getByText('Site survey → Training done → Landlord sign-off')).toBeVisible();
  await director.screenshot({ path: 'test-results/gate-templates-en.png', fullPage: true });
  await director.getByRole('button', { name: 'Archive: Client A Spain' }).click();
  await expect(spain).toBeHidden();
  await expect(base).toBeVisible();
});

test('Sales fills the Handover Card, sees what is missing and submits it (E2 AC1, SOP-DEL-01 §6)', async ({
  page,
  browser,
}) => {
  await signInWithPassword(page);
  const sales = await join(browser, page, 'sales.e2e@example.com', 'Person 04', ['sales']);
  await sales.getByRole('link', { name: 'Sites' }).click();
  await sales.getByRole('link', { name: 'CLIENTA-ES-MAD-001' }).click();
  await sales.getByRole('link', { name: 'Intake', exact: true }).click();
  await expect(sales.getByText(/^No Handover Card yet/)).toBeVisible();
  await sales.getByLabel('Project name').fill('Mall A counting');
  await sales.getByLabel('Project type').selectOption('new');
  // N/A without a reason is refused (Annex B: blanks are not accepted).
  await sales.getByLabel('State A1').selectOption('na');
  await sales.getByRole('button', { name: 'Save draft' }).click();
  await expect(sales.getByText(/^Check the entries/)).toBeVisible();
  await sales.getByLabel('State A1').selectOption('provided');
  await sales.getByLabel(/^Summary, folder link or N\/A reason A1$/).fill('Signed PO in the folder');
  await sales.getByRole('button', { name: 'Save draft' }).click();
  await expect(sales.getByText(/^Still missing before submission: A2, A3/)).toBeVisible();
  // Everything else provided; group F only as "recorded in the restricted notes".
  for (const select of await sales.getByLabel(/^State [A-G][1-9]$/).all()) {
    if ((await select.inputValue()) === 'none') await select.selectOption('provided');
  }
  await expect(sales.getByRole('row', { name: /^F1 Verbal commitments/ })).toContainText('restricted notes');
  await sales.getByRole('button', { name: 'Save draft' }).click();
  await expect(sales.getByText('Nothing missing: the card can be submitted.')).toBeVisible();
  await sales.getByRole('button', { name: 'Submit for intake review' }).click();
  await expect(
    sales.getByText(/^Status: Submitted — under review · Version 1 · Package: Full/),
  ).toBeVisible();
  await sales.screenshot({ path: 'test-results/intake-submitted-en.png', fullPage: true });
});

test('the Delivery Director decides on the submitted card: a blocking item is refused as a condition (E2 AC2, SOP-DEL-01 §8)', async ({
  page,
  browser,
}) => {
  await signInWithPassword(page);
  // SOP-DEL-01 §9: before the decision, the sponsor authorises a Conditional Start; the director may not.
  const sponsor = await join(browser, page, 'sponsor.e2e@example.com', 'Person 06', ['sponsor']);
  await sponsor.getByRole('link', { name: 'Sites' }).click();
  await sponsor.getByRole('link', { name: 'CLIENTA-ES-MAD-001' }).click();
  await sponsor.getByRole('link', { name: 'Intake', exact: true }).click();
  await sponsor.getByRole('checkbox', { name: 'C3' }).check();
  await sponsor.getByLabel('Deadline (within 5 working days)').fill(new Date().toISOString().slice(0, 10));
  await sponsor.getByLabel(/^Written authorisation in DingTalk/).fill('DingTalk msg E2E-1');
  await sponsor.getByRole('button', { name: 'Authorise Conditional Start' }).click();
  await expect(sponsor.getByText(/^Conditional Start authorised: C3 missing/)).toBeVisible();
  const director = await join(browser, page, 'director2.e2e@example.com', 'Person 05', ['director']);
  await director.getByRole('link', { name: 'Sites' }).click();
  await director.getByRole('link', { name: 'CLIENTA-ES-MAD-001' }).click();
  await director.getByRole('link', { name: 'Intake', exact: true }).click();
  await director.getByLabel('Decision').selectOption('accepted_with_conditions');
  await director.getByRole('button', { name: 'Add condition' }).click();
  await director.getByLabel('Condition item 1').selectOption('A4');
  await director.getByLabel('What is missing, item 1').fill('Committed dates to follow');
  const today = new Date().toISOString().slice(0, 10);
  await director.getByLabel('Deadline, item 1').fill(today);
  await director.getByRole('button', { name: 'Record decision' }).click();
  await expect(director.getByText(/^Not allowed by SOP-DEL-01 §8/)).toBeVisible();
  await director.getByLabel('Condition item 1').selectOption('B2');
  await director.getByLabel('What is missing, item 1').fill('Secondary contact');
  await director.getByRole('button', { name: 'Record decision' }).click();
  await expect(director.getByText(/^Status: Accepted with conditions/)).toBeVisible();
  await expect(director.getByText(`B2: Secondary contact — by ${today} (open)`)).toBeVisible();
  await director.screenshot({ path: 'test-results/intake-decided-en.png', fullPage: true });
  // SOP-DEL-01 §12: the submission is in the Intake Register.
  await director.getByRole('link', { name: 'Intake Register' }).click();
  await expect(
    director.getByRole('row', { name: /^CLIENTA-ES-MAD-001 1 .* Accepted with conditions/ }),
  ).toBeVisible();
  await director.screenshot({ path: 'test-results/intake-register-en.png', fullPage: true });
});

test('Sales disputes a returned card and the sponsor upholds the return (SOP-DEL-01 §9)', async ({
  page,
  browser,
}) => {
  await signInWithPassword(page);
  const open = async (p: Page) => {
    await p.getByRole('link', { name: 'Sites' }).click();
    await p.getByRole('link', { name: 'CLIENTA-ES-MAD-002' }).click();
    await p.getByRole('link', { name: 'Intake', exact: true }).click();
  };
  const sales = await join(browser, page, 'sales2.e2e@example.com', 'Person 07', ['sales']);
  await open(sales);
  await sales.getByLabel('Project name').fill('Mall A second site');
  await sales.getByLabel('Project type').selectOption('new');
  for (const select of await sales.getByLabel(/^State [A-G][1-9]$/).all())
    await select.selectOption('provided');
  await sales.getByRole('button', { name: 'Save draft' }).click();
  await expect(sales.getByText('Nothing missing: the card can be submitted.')).toBeVisible();
  await sales.getByRole('button', { name: 'Submit for intake review' }).click();
  const director = await join(browser, page, 'director3.e2e@example.com', 'Person 08', ['director']);
  await open(director);
  await director.getByLabel('Decision').selectOption('returned');
  await director.getByLabel(/^Gaps or reasons/).fill('Floor plans are outdated');
  await director.getByRole('button', { name: 'Record decision' }).click();
  await expect(director.getByText(/^Status: Returned/)).toBeVisible();
  // Sales disputes the return once; the sponsor has 2 working days.
  await sales.reload();
  await sales.getByLabel('Why the return is wrong').fill('Plans were updated last week');
  await sales.getByRole('button', { name: 'Dispute this return' }).click();
  await expect(
    sales.getByText(/^Disputed: "Plans were updated last week"\. The sponsor decides by/),
  ).toBeVisible();
  await sales.getByRole('button', { name: 'Uphold the return' }).click();
  await expect(sales.getByText(/^Sales raises a dispute; only the sponsor decides it/)).toBeVisible();
  const sponsor = await join(browser, page, 'sponsor2.e2e@example.com', 'Person 09', ['sponsor']);
  await open(sponsor);
  await sponsor.getByLabel('Note on the decision (optional)').fill('Plans still show the old layout');
  await sponsor.getByRole('button', { name: 'Uphold the return' }).click();
  await expect(
    sponsor.getByText('Dispute decided: the return is upheld. Plans still show the old layout'),
  ).toBeVisible();
  await sponsor.screenshot({ path: 'test-results/intake-dispute-en.png', fullPage: true });
});

test('a director leaves a task in a project for a PM; the PM sees it in Mine and marks it done (D-36)', async ({
  page,
  browser,
}) => {
  await signInWithPassword(page);
  const pm = await join(browser, page, 'pm.tasks.e2e@example.com', 'Person 10', ['pm']);
  const director = await join(browser, page, 'director.tasks.e2e@example.com', 'Person 11', ['director']);
  await director.getByRole('link', { name: 'Sites' }).click();
  await director.getByRole('link', { name: 'CLIENTA-ES-MAD-001' }).click();
  await director.getByRole('link', { name: 'Actions', exact: true }).click();
  await director.getByLabel('Task', { exact: true }).fill('Enter the client PO and DPIA status');
  await director.getByLabel('For whom').selectOption({ label: 'Person 10' });
  await director.getByLabel('Due date').fill(new Date().toISOString().slice(0, 10));
  await director.getByRole('button', { name: 'Create task' }).click();
  await expect(director.getByText('Enter the client PO and DPIA status')).toBeVisible();
  await pm.getByRole('link', { name: 'Actions & alerts' }).click();
  await pm.getByRole('button', { name: 'Mine' }).click();
  await expect(pm.getByText('Enter the client PO and DPIA status')).toBeVisible();
  await pm.getByRole('button', { name: 'Done: Enter the client PO and DPIA status' }).click();
  await expect(pm.getByText('Enter the client PO and DPIA status')).toBeHidden();
});

test('a PM records a client PO in GBP, sees it in EUR and archives it (E13, D-34 N2)', async ({
  page,
  browser,
}) => {
  await signInWithPassword(page);
  const pm = await join(browser, page, 'pm.commercial.e2e@example.com', 'Person 12', ['pm']);
  await pm.getByRole('link', { name: 'Sites' }).click();
  await pm.getByRole('link', { name: 'CLIENTA-ES-MAD-001' }).click();
  // The left menu has a "Commercial" entry too; the tab is in the project's own sections.
  await pm
    .getByRole('navigation', { name: 'Project sections' })
    .getByRole('link', { name: 'Commercial' })
    .click();
  await expect(pm.getByText('No PO, DPIA, invoice or price recorded yet.')).toBeVisible();
  await pm.getByLabel('Number').fill('PO-E2E-1');
  await pm.getByLabel('Date').fill('2026-11-20');
  await pm.getByLabel('Amount').fill('1200.00');
  await pm.getByLabel('Currency (ISO code)').fill('GBP');
  await pm.getByLabel('Rate: EUR per 1 unit').fill('1.16');
  await pm.getByRole('button', { name: 'Save record' }).click();
  const row = pm.getByRole('row', { name: /^Client PO PO-E2E-1 Received/ });
  await expect(row).toContainText('1200.00 GBP');
  await expect(row).toContainText('1392.00 EUR (rate 1.160000, 2026-11-20)');
  await pm.screenshot({ path: 'test-results/commercial-en.png', fullPage: true });
  // E13 overview: the left-menu Commercial page lists the project and drills into its Commercial tab.
  await pm.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Commercial' }).click();
  await expect(pm.getByRole('row', { name: /^CLIENTA-ES-MAD-001 1 · 1392\.00 EUR/ })).toBeVisible();
  await pm.getByRole('link', { name: 'CLIENTA-ES-MAD-001' }).click();
  // E12: job → two quotes → comparison cheapest first in EUR → CEO approval → scheduled.
  await pm
    .getByRole('navigation', { name: 'Project sections' })
    .getByRole('link', { name: 'Installers' })
    .click();
  await expect(pm.getByText('No installer job yet.')).toBeVisible();
  await pm.getByLabel('Sensors').fill('4');
  await pm.getByLabel('SOW version').fill('v1');
  await pm.getByRole('button', { name: 'Create job' }).click();
  await expect(pm.getByRole('heading', { name: 'Partial installation, 4 sensors — Planned' })).toBeVisible();
  for (const [installer, price] of [
    ['Installer Company 01', '95'],
    ['Installer Company 02', '80'],
  ] as const) {
    await pm.getByLabel('Installer', { exact: true }).selectOption({ label: installer });
    await pm.getByLabel('Description 1').fill('Mount and cable a sensor');
    await pm.getByLabel('Quantity 1').fill('4');
    await pm.getByLabel('Unit price 1').fill(price);
    await pm.getByLabel('Quote date').fill('2026-11-27');
    await pm.getByRole('button', { name: 'Save quote' }).click();
    await expect(pm.getByRole('cell', { name: installer, exact: true })).toBeVisible();
  }
  const rows = pm.getByRole('row');
  await expect(rows.nth(1)).toContainText('Installer Company 02');
  await expect(rows.nth(1)).toContainText('320.00 EUR');
  // R29 (D-44): two quotes are too few to compare against an average (review of #136).
  await expect(pm.getByRole('columnheader', { name: 'Per sensor vs average' })).toBeVisible();
  await expect(rows.nth(1)).toContainText('Fewer than 3 to compare');
  await pm.getByLabel('Approval reference (DingTalk OA or message)').fill('OA-E2E-1');
  await pm.getByLabel('Approved on').fill('2026-11-27');
  await pm.getByRole('button', { name: 'Record approval' }).click();
  await expect(pm.getByRole('heading', { name: 'Partial installation, 4 sensors — Approved' })).toBeVisible();
  await pm.getByLabel('Installation date').fill('2026-12-01');
  await pm.getByRole('button', { name: 'Save status' }).click();
  await expect(
    pm.getByRole('heading', { name: 'Partial installation, 4 sensors — Scheduled' }),
  ).toBeVisible();
  await pm.screenshot({ path: 'test-results/installers-en.png', fullPage: true });
  await pm
    .getByRole('navigation', { name: 'Project sections' })
    .getByRole('link', { name: 'Commercial' })
    .click();
  await pm.getByRole('button', { name: 'Archive: PO-E2E-1' }).click();
  await expect(row).toBeHidden();
});

test('Projects is the programme tracker: projects by country with stage, dates and gates; CSV export (E11 AC3)', async ({
  page,
  browser,
}) => {
  await signInWithPassword(page);
  const pm = await join(browser, page, 'pm.tracker.e2e@example.com', 'Person 13', ['pm']);
  await pm.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Projects' }).click();
  await expect(pm.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();
  await expect(pm.getByRole('heading', { level: 2, name: /^ES · \d+ projects?$/ })).toBeVisible();
  await expect(pm.getByRole('heading', { level: 2, name: /^PT · / })).toBeVisible();
  for (const col of ['Project ID', 'Stage', 'Planned installation', 'Gates', 'Client PO', 'DPIA'])
    await expect(pm.getByRole('columnheader', { name: col }).first()).toBeVisible();
  await expect(pm.getByRole('link', { name: 'CLIENTC-PT-LIS-003' })).toBeVisible();
  // Filters: one client, then one country.
  await pm.getByLabel('Client').selectOption({ label: 'CLIENTA — Client A' });
  await expect(pm.getByRole('link', { name: 'CLIENTC-PT-LIS-003' })).toBeHidden();
  await expect(pm.getByRole('link', { name: 'CLIENTA-ES-MAD-001' })).toBeVisible();
  await pm.getByLabel('Country').selectOption('ES'); // a select of the client's countries (review of #133)
  await expect(pm.getByRole('heading', { level: 2, name: /^ES · / })).toBeVisible();
  await expect(pm.getByRole('heading', { level: 2, name: /^PT · / })).toBeHidden();
  await pm.screenshot({ path: 'test-results/projects-en.png', fullPage: true });
  // Export CSV downloads what is shown: Client A in ES only.
  const [download] = await Promise.all([
    pm.waitForEvent('download'),
    pm.getByRole('button', { name: 'Export CSV' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^programme-tracker-ES-\d{4}-\d{2}-\d{2}\.csv$/);
  const csv = await readFile(await download.path(), 'utf8');
  expect(csv.split('\r\n')[0]).toContain('"Project ID","Site","Country"');
  expect(csv).toContain('"CLIENTA-ES-MAD-001"');
  expect(csv).not.toContain('CLIENTC-');
  // Each Project ID opens that project's Lifecycle tab.
  await pm.getByRole('link', { name: 'CLIENTA-ES-MAD-001' }).click();
  await expect(pm.getByRole('heading', { level: 2, name: 'Lifecycle' })).toBeVisible();
  await pm.goBack();
  await pm.getByRole('button', { name: 'Switch to Chinese' }).click();
  await expect(pm.getByRole('heading', { level: 1, name: '项目' })).toBeVisible();
  await pm.screenshot({ path: 'test-results/projects-zh.png', fullPage: true });
});

test('an AI client signs in as the person with OAuth: login with TOTP, consent, code, token (D-33)', async ({
  browser,
}) => {
  const page = await (await browser.newContext()).newPage();
  const callback = 'http://127.0.0.1:33418/callback';
  const reg = await page.request.post('/api/auth/oauth2/register', {
    data: { client_name: 'Test agent', redirect_uris: [callback], token_endpoint_auth_method: 'none' },
  });
  expect(reg.status()).toBe(201);
  const { client_id: clientId } = (await reg.json()) as { client_id: string };
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  let code = '';
  await page.route(`${callback}**`, async (route) => {
    code = new URL(route.request().url()).searchParams.get('code') ?? '';
    await route.fulfill({ body: 'agent callback' });
  });
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: callback,
    scope: 'openid offline_access',
    state: 'e2e',
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  await page.goto(`/api/auth/oauth2/authorize?${q.toString()}`);
  const ocs = new URL(page.url()).origin;
  // The normal OCS sign-in, with its MFA.
  await page.getByLabel('Email').fill(process.env.OCS_E2E_ADMIN_EMAIL ?? '');
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Code from your authenticator app').fill(code_());
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByRole('heading', { name: 'Allow Test agent to work in OCS for you?' })).toBeVisible();
  await expect(page.getByText(/^It can never send anything to a client/)).toBeVisible();
  await page.screenshot({ path: 'test-results/oauth-consent-en.png', fullPage: true });
  await page.getByRole('button', { name: 'Allow' }).click();
  await expect.poll(() => code).not.toBe('');
  // The agent's server exchanges the code: no browser, no cookies, no Origin header.
  const agent = (await browser.newContext({ baseURL: ocs })).request;
  const token = await agent.post('/api/auth/oauth2/token', {
    form: {
      grant_type: 'authorization_code',
      code,
      redirect_uri: callback,
      client_id: clientId,
      code_verifier: verifier,
      resource: `${ocs}/mcp`,
    },
  });
  expect(token.status(), await token.text()).toBe(200);
  const body = (await token.json()) as { access_token?: string; refresh_token?: string; token_type?: string };
  expect([typeof body.access_token, typeof body.refresh_token, body.token_type]).toEqual([
    'string',
    'string',
    'Bearer',
  ]);

  // MCP over HTTP: no token → 401 pointing at the protected-resource metadata (how clients find the sign-in).
  const rpc = (method: string, params: Record<string, unknown>, auth?: string) =>
    agent.post('/mcp', {
      headers: {
        accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
        ...(auth ? { authorization: `Bearer ${auth}` } : {}),
      },
      data: { jsonrpc: '2.0', id: 1, method, params },
    });
  const anonymous = await rpc('tools/list', {});
  expect(anonymous.status()).toBe(401);
  expect(anonymous.headers()['www-authenticate']).toContain('/.well-known/oauth-protected-resource');
  const metadata = await agent.get('/.well-known/oauth-protected-resource');
  expect(((await metadata.json()) as { resource: string }).resource).toBe(`${ocs}/mcp`);
  // With the person's token: their tools, and a call that goes through the kernel as them.
  const token_ = body.access_token ?? '';
  const init = await rpc(
    'initialize',
    { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'e2e', version: '1' } },
    token_,
  );
  expect(init.status(), await init.text()).toBe(200);
  const tools = await rpc('tools/list', {}, token_);
  const names = ((await tools.json()) as { result: { tools: { name: string }[] } }).result.tools.map(
    (x) => x.name,
  );
  expect(names).toContain('org_site_list');
  const sites = await rpc('tools/call', { name: 'org_site_list', arguments: {} }, token_);
  const text =
    ((await sites.json()) as { result: { content: { text: string }[] } }).result.content[0]?.text ?? '';
  expect(text).toContain('CLIENTA-ES-MAD-001');

  // The same operations over REST + OpenAPI, for AI platforms without MCP.
  const spec = (await (await agent.get('/api/v1/openapi.json')).json()) as {
    paths: Record<string, unknown>;
    components: { securitySchemes: { ocs: { flows: { authorizationCode: { tokenUrl: string } } } } };
  };
  expect(Object.keys(spec.paths)).toContain('/org.site.list');
  expect(spec.components.securitySchemes.ocs.flows.authorizationCode.tokenUrl).toBe(
    `${ocs}/api/auth/oauth2/token`,
  );
  expect((await agent.post('/api/v1/org.site.list', { data: {} })).status()).toBe(401);
  const viaRest = await agent.post('/api/v1/org.site.list', {
    data: {},
    headers: { authorization: `Bearer ${token_}` },
  });
  expect(viaRest.status()).toBe(200);
  expect(await viaRest.text()).toContain('CLIENTA-ES-MAD-001');

  // The person disconnects the agent: listed under AI agents, Disconnect, and its token stops working at once.
  await page.goto('/agents');
  await expect(page.getByRole('row', { name: /^Test agent/ })).toBeVisible();
  await page.getByRole('button', { name: 'Disconnect: Test agent' }).click();
  await expect(page.getByText('No AI agent is connected.')).toBeVisible();
  expect((await rpc('tools/list', {}, token_)).status()).toBe(401);
  const restAfter = await agent.post('/api/v1/org.site.list', {
    data: {},
    headers: { authorization: `Bearer ${token_}` },
  });
  expect(restAfter.status()).toBe(401);
});

/** Screens built with `pnpm gen:screen` — each must open for a signed-in user and show its title. */
const SCREENS: { path: string; heading: string }[] = [
  { path: '/portfolio', heading: 'Portfolio' },
  { path: '/actions', heading: 'Every open action, with an owner and a date' },
  { path: '/sites', heading: 'Sites' },
  { path: '/admin', heading: 'Admin' },
  { path: '/intake-register', heading: 'Intake Register' },
  { path: '/agents', heading: 'AI agents' },
  { path: '/commercial', heading: 'Commercial' },
  { path: '/projects', heading: 'Projects' },
  // gen:screens
];

test('every built screen opens and shows its title', async ({ page }) => {
  test.skip(SCREENS.length === 0, 'no screens built yet');
  await signInWithPassword(page);
  for (const screen of SCREENS) {
    await page.goto(screen.path);
    await expect(page.getByRole('heading', { level: 1, name: screen.heading })).toBeVisible();
  }
});

async function signInWithPassword(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.OCS_E2E_ADMIN_EMAIL ?? '');
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Two-factor code' })).toBeVisible();
  await page.getByLabel('Code from your authenticator app').fill(code());
  await page.getByRole('button', { name: 'Verify' }).click();
  await expectShell(page);
}

/** The signed-in admin invites a staff member, who joins with password + TOTP; returns their page. */
async function join(browser: Browser, admin: Page, email: string, name: string, roles: string[]) {
  const res = await admin.request.post('/api/users/invitations', { data: { email, roles } });
  expect(res.status()).toBe(201);
  const { link } = (await res.json()) as { link: string };
  const page = await (await browser.newContext()).newPage();
  await page.goto(link);
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Set up two-factor authentication' })).toBeVisible();
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('img', { name: 'QR code for the authenticator app' })).toBeVisible();
  const secret = (await page.getByTestId('totp-secret').textContent()) ?? '';
  await page
    .getByLabel('Code from your authenticator app')
    .fill(new TOTP({ secret: Secret.fromBase32(secret.trim()) }).generate());
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name);
  return page;
}
