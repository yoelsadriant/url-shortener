import { test, expect } from '@playwright/test';

const FAKE_USER = {
  userId: '00000000-0000-4000-8000-000000000000',
  username: 'tester',
  createdAt: '2026-01-01T00:00:00.000Z',
};

test.describe('URL Shortener', () => {
  test.beforeEach(async ({ page }) => {
    // Stub /auth/me so AuthContext treats us as logged-in.
    await page.route('**/auth/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FAKE_USER),
      }),
    );
    await page.addInitScript(() => {
      localStorage.setItem('shortener.token', 'fake-token');
    });
    await page.goto('/');
  });

  test('renders the page with header and form', async ({ page }) => {
    await expect(page).toHaveTitle(/shortener/i);
    await expect(
      page.getByRole('link', { name: /home/i }).getByText(/shortener/i),
    ).toBeVisible();
    await expect(page.getByLabel(/long url/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /^shorten/i }),
    ).toBeVisible();
  });

  test('submit button is disabled when input is empty', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^shorten/i })).toBeDisabled();
  });

  test('submit button becomes enabled when URL is typed', async ({ page }) => {
    await page.getByLabel(/long url/i).fill('https://example.com');
    await expect(page.getByRole('button', { name: /^shorten/i })).toBeEnabled();
  });

  test('shows loading state while request is in flight', async ({ page }) => {
    await page.route('**/url', async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ shortUrl: 'http://localhost:3000/abc123' }),
      });
    });

    await page.getByLabel(/long url/i).fill('https://example.com/very/long/path');
    await page.getByRole('button', { name: /^shorten/i }).click();

    await expect(page.getByRole('button', { name: /shortening/i })).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test('displays the short URL after a successful request', async ({ page }) => {
    await page.route('**/url', (route) =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ shortUrl: 'http://localhost:3000/abc123' }),
      }),
    );

    await page.getByLabel(/long url/i).fill('https://example.com/very/long/path');
    await page.getByRole('button', { name: /^shorten/i }).click();

    await expect(page.getByText('Your short link')).toBeVisible();
    await expect(
      page.getByRole('link', { name: /localhost:3000\/abc123/ }),
    ).toBeVisible();
  });

  test('copy button changes to "Copied" after clicking', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.route('**/url', (route) =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ shortUrl: 'http://localhost:3000/abc123' }),
      }),
    );

    await page.getByLabel(/long url/i).fill('https://example.com');
    await page.getByRole('button', { name: /^shorten/i }).click();

    // The first matching "Copy" button sits inside the ShortResult card.
    await page.getByRole('button', { name: /^copy$/i }).first().click();
    await expect(
      page.getByRole('button', { name: /copied/i }).first(),
    ).toBeVisible();

    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText(),
    );
    expect(clipboardText).toBe('http://localhost:3000/abc123');
  });

  test('shows error message on API failure', async ({ page }) => {
    await page.route('**/url', (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid URL provided' }),
      }),
    );

    await page.getByLabel(/long url/i).fill('https://example.com');
    await page.getByRole('button', { name: /^shorten/i }).click();

    await expect(page.getByRole('alert')).toContainText('Invalid URL provided');
  });

  test('shows a generic error on network failure', async ({ page }) => {
    await page.route('**/url', (route) => route.abort('failed'));

    await page.getByLabel(/long url/i).fill('https://example.com');
    await page.getByRole('button', { name: /^shorten/i }).click();

    await expect(page.getByRole('alert')).toBeVisible();
  });
});
