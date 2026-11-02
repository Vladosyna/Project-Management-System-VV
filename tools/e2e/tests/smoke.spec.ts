// F0.9 / F0.11 e2e smoke: an invited admin gets in with password + TOTP, sees the shell from the Main
// mockup in EN and 中文, navigates, adds a passkey and signs in with it (ADR-002 passkey gap).
import { expect, test, type Page } from '@playwright/test';
import { Secret, TOTP } from 'otpauth';

const PASSWORD = 'correct horse battery staple';
let totp: TOTP;

const code = () => totp.generate();

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

/** Screens built with `pnpm gen:screen` — each must open for a signed-in user and show its title. */
const SCREENS: { path: string; heading: string }[] = [
  { path: '/portfolio', heading: 'Portfolio' },
  { path: '/actions', heading: 'Every open action, with an owner and a date' },
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
