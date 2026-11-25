import { expect, test } from '@playwright/test';

const apiURL = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:5000/api/v1';
const stackAvailable = process.env.E2E_STACK === '1';

test.describe('Compose stack smoke', () => {
  test.skip(!stackAvailable, 'Set E2E_STACK=1 when the production Compose stack is running');

  test('liveness, readiness, and API discovery respond', async ({ request }) => {
    const live = await request.get('http://127.0.0.1:5000/health');
    expect(live.ok()).toBeTruthy();

    const ready = await request.get('http://127.0.0.1:5000/health/ready');
    expect(ready.ok()).toBeTruthy();
    expect((await ready.json()).status).toBe('ready');

    const root = await request.get(apiURL);
    expect(root.ok()).toBeTruthy();
  });

  test('registration works and protected routes deny anonymous access', async ({ request }) => {
    const email = `e2e-${Date.now()}@example.com`;
    const registered = await request.post(`${apiURL}/auth/register`, {
      data: {
        name: 'E2E Learner',
        email,
        password: 'Password123!',
      },
    });
    expect(registered.ok()).toBeTruthy();

    const denied = await request.get(`${apiURL}/analytics/overview`);
    expect(denied.status()).toBe(401);

    const login = await request.post(`${apiURL}/auth/login`, {
      data: { email, password: 'Password123!' },
    });
    expect([401, 403]).toContain(login.status());
  });
});
