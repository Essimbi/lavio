import { expect, test } from '@playwright/test';

test.describe('Démarrage', () => {
  test("la page d'accueil prérendue affiche le logo et le titre", async ({ page }) => {
    const response = await page.goto('/');
    // Page prérendue : le titre est présent dans le HTML servi, avant JavaScript.
    expect(await response?.text()).toContain('sous contrôle');
    await expect(page.getByRole('img', { name: 'Lavio' }).first()).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Votre pressing');
    await expect(page).toHaveTitle(/Lavio/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('le manifeste de la PWA est servi', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.ok()).toBe(true);
    const manifest = (await res.json()) as { name: string; start_url: string; theme_color: string };
    expect(manifest).toMatchObject({
      name: 'Lavio',
      start_url: '/app?source=pwa',
      theme_color: '#0B4F4A',
    });
  });

  test("l'application et le superadmin exigent une connexion", async ({ page }) => {
    await page.goto('/app');
    await expect(page).toHaveURL(/\/login\?retour=%2Fapp/);
    await expect(page.getByRole('heading', { level: 1, name: 'Connexion' })).toBeVisible();
    await expect(page.getByLabel('E-mail ou téléphone')).toBeVisible();

    await page.goto('/admin/licenses');
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByRole('heading', { level: 1, name: 'Superadmin' })).toBeVisible();
  });

  test('un lien d’invitation incomplet est signalé', async ({ page }) => {
    await page.goto('/invitation');
    await expect(page.getByRole('alert')).toContainText('lien est incomplet');
  });

  test('une adresse inconnue affiche la page introuvable', async ({ page }) => {
    await page.goto('/adresse-inconnue');
    await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible();
  });
});
