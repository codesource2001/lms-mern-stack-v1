import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

async function expectNoSeriousViolations(page: import('@playwright/test').Page, path: string) {
  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, code: 'AUTH_REQUIRED' }),
    }),
  );
  await page.goto(path);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );

  expect(
    serious.map(
      (violation) =>
        `${violation.id}: ${violation.nodes
          .map((node) => node.target.join(' '))
          .slice(0, 6)
          .join(' | ')}`,
    ),
    `WCAG A/AA violations on ${path}`,
  ).toEqual([]);
}

test('public home page has no serious WCAG A/AA violations', async ({ page }) => {
  await expectNoSeriousViolations(page, '/');
});

test('login page has no serious WCAG A/AA violations', async ({ page }) => {
  await expectNoSeriousViolations(page, '/login');
});
