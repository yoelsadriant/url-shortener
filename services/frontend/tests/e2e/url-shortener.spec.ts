import { test, expect } from '@playwright/test';

test.describe('URL Shortener', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders the page with header and form', async ({ page }) => {
    await expect(page).toHaveTitle(/shortener/i);
    await expect(page.getByText('Shortener', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder(/paste your long url/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /shorten url/i }),
    ).toBeVisible();
  });

  test('submit button is disabled when input is empty', async ({ page }) => {
    const button = page.getByRole('button', { name: /shorten url/i });
    await expect(button).toBeDisabled();
  });

  test('submit button becomes enabled when URL is typed', async ({ page }) => {
    await page
      .getByPlaceholder(/paste your long url/i)
      .fill('https://example.com');
    await expect(
      page.getByRole('button', { name: /shorten url/i }),
    ).toBeEnabled();
  });

  test('shows loading state while request is in flight', async ({ page }) => {
    await page.route('**/url', async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          shortUrl: 'https://shortener.io/abc123',
        }),
      });
    });

    await page
      .getByPlaceholder(/paste your long url/i)
      .fill('https://example.com/very/long/path');
    await page.getByRole('button', { name: /shorten url/i }).click();

    await expect(page.getByText(/shortening/i)).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test('displays the short URL after a successful request', async ({
    page,
  }) => {
    await page.route('**/url', (route) =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          shortUrl: 'https://shortener.io/abc123',
        }),
      }),
    );

    await page
      .getByPlaceholder(/paste your long url/i)
      .fill('https://example.com/very/long/path');
    await page.getByRole('button', { name: /shorten url/i }).click();

    await expect(page.getByText('https://shortener.io/abc123')).toBeVisible();
    await expect(page.getByRole('button', { name: /copy/i })).toBeVisible();
  });

  test('copy button changes to "Copied!" after clicking', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.route('**/url', (route) =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          shortUrl: 'https://shortener.io/abc123',
        }),
      }),
    );

    await page
      .getByPlaceholder(/paste your long url/i)
      .fill('https://example.com');
    await page.getByRole('button', { name: /shorten url/i }).click();
    await page.getByRole('button', { name: /copy/i }).click();

    await expect(page.getByRole('button', { name: /copied/i })).toBeVisible();

    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText(),
    );
    expect(clipboardText).toBe('https://shortener.io/abc123');
  });

  test('shows error message on API failure', async ({ page }) => {
    await page.route('**/url', (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid URL provided' }),
      }),
    );

    await page
      .getByPlaceholder(/paste your long url/i)
      .fill('https://example.com');
    await page.getByRole('button', { name: /shorten url/i }).click();

    await expect(page.getByRole('alert')).toContainText('Invalid URL provided');
  });

  test('shows a generic error on network failure', async ({ page }) => {
    await page.route('**/url', (route) => route.abort('failed'));

    await page
      .getByPlaceholder(/paste your long url/i)
      .fill('https://example.com');
    await page.getByRole('button', { name: /shorten url/i }).click();

    await expect(page.getByRole('alert')).toBeVisible();
  });
});
