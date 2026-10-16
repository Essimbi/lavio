import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

/** CSP de production, lue dans `vercel.json` (le serveur statique de test ne l'applique pas). */
const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')) as {
  headers: { headers: { key: string; value: string }[] }[];
};
const csp = vercel.headers
  .flatMap((h) => h.headers)
  .find((h) => h.key === 'Content-Security-Policy')?.value;

test.describe('Politique de sécurité du contenu (CSP)', () => {
  test.beforeEach(async ({ context }) => {
    expect(csp).toBeTruthy();
    await context.route('http://localhost:*/**', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        headers: { ...response.headers(), 'content-security-policy': csp ?? '' },
      });
    });
  });

  for (const path of ['/', '/login', '/mentions-legales']) {
    test(`${path} se charge sans violation, feuille de style active`, async ({ page }) => {
      const violations: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error' && /Content Security Policy/i.test(m.text()))
          violations.push(m.text());
      });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect(violations).toEqual([]);
      const media = await page.$$eval('link[rel="stylesheet"]', (links) =>
        links.map((l) => (l as HTMLLinkElement).media || 'all'),
      );
      expect(media.every((m) => m === 'all')).toBe(true);
    });
  }

  test('autorise l’envoi direct vers Vercel Blob, et seulement lui sur vercel.com', async ({
    page,
  }) => {
    await page.route('https://vercel.com/**', (route) =>
      route.fulfill({ status: 200, body: '{}' }),
    );
    await page.goto('/login');
    const result = await page.evaluate(async () => {
      const attempt = (url: string) =>
        fetch(url, { method: 'PUT', body: 'x' }).then(
          () => 'ok',
          () => 'bloqué',
        );
      return {
        blob: await attempt('https://vercel.com/api/blob/?pathname=t%2Fexpenses%2Fa.jpg'),
        other: await attempt('https://vercel.com/api/autre'),
      };
    });
    expect(result).toEqual({ blob: 'ok', other: 'bloqué' });
  });
});
