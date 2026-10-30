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
