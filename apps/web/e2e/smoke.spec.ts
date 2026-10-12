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

  test("la coquille de l'application s'affiche avec sa navigation", async ({ page, isMobile }) => {
    await page.goto('/app');
    await expect(page.getByRole('heading', { level: 1, name: 'Tableau de bord' })).toBeVisible();
    const nav = page
      .getByRole('navigation', { name: 'Navigation principale' })
      .filter({ visible: true });
    await expect(nav).toHaveCount(1);
    if (isMobile) {
      await expect(nav.getByRole('link', { name: 'Accueil' })).toHaveAttribute(
        'aria-current',
        'page',
      );
    } else {
      await expect(page.getByRole('link', { name: 'Nouveau dépôt' })).toBeVisible();
    }
  });

  test('une adresse inconnue affiche la page introuvable', async ({ page }) => {
    await page.goto('/adresse-inconnue');
    await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible();
  });
});
