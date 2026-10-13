import { expect, type Page, test } from '@playwright/test';

/**
 * Phase 4 : le magasinier crée un produit, enregistre une entrée puis une sortie qui franchit
 * le seuil ; la comptable retrouve la valorisation dans les rapports et l'exporte.
 * Nécessite l'API (API_ORIGIN) et les données `pnpm e2e:fixtures` (E2E_PASSWORD).
 */
const password = process.env['E2E_PASSWORD'];
test.skip(!process.env['API_ORIGIN'] || !password, 'API ou données de test non configurées');

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('E-mail ou téléphone').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password ?? '');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tableau de bord' })).toBeVisible();
}

test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, 'Gestion du stock : écran large');
});

test('stock : produit, entrée au coût, sortie sous le seuil, valorisation exportée', async ({
  page,
  browser,
}) => {
  const name = `Lessive E2E ${Date.now()}`;
  await signIn(page, 'e2e-magasin@test.local');
  await page.goto('/app/stock');
  await page.getByRole('button', { name: 'Nouveau produit' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nouveau produit' });
  // Dialogue prêt : valeurs initiales écrites et focus initial posé sur le premier champ.
  await expect(dialog.getByLabel('Seuil d’alerte')).toHaveValue('0');
  await expect(dialog.getByLabel('Nom')).toBeFocused();
  await dialog.getByLabel('Nom').fill(name);
  await dialog.getByLabel('Unité (L, kg, pièce…)').fill('L');
  await dialog.getByLabel('Prix d’achat (FCFA)').fill('500');
  await dialog.getByLabel('Seuil d’alerte').fill('3');
  await expect(dialog.getByLabel('Nom')).toHaveValue(name);
  await expect(dialog.getByLabel('Unité (L, kg, pièce…)')).toHaveValue('L');
  await expect(dialog.getByLabel('Seuil d’alerte')).toHaveValue('3');
  await expect(dialog.getByLabel('Prix d’achat (FCFA)')).toHaveValue('500');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();

  // Entrée de 10 L à 500 FCFA.
  await page.getByLabel(/Quantité/).fill('10');
  await page.getByLabel('Coût unitaire (FCFA)').fill('500');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Mouvement enregistré.')).toBeVisible();
  await expect(page.getByText(/^10\sL$/)).toBeVisible();

  // Sortie de 8 L : motif obligatoire, puis alerte « sous le seuil ».
  await page.getByText('Sortie', { exact: true }).click();
  await page.getByLabel(/Quantité/).fill('8');
  await expect(page.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
  await page.getByLabel('Motif').selectOption({ label: 'Consommation' });
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText(/Sous le seuil/)).toBeVisible();
  await expect(page.getByRole('row', { name: /Sortie/ })).toBeVisible();

  // La comptable retrouve la valorisation (2 L × 500 FCFA) et l'exporte.
  const context = await browser.newContext({ acceptDownloads: true });
  const accountant = await context.newPage();
  await signIn(accountant, 'e2e-compta@test.local');
  await accountant.goto('/app/accounting?tab=reports');
  await accountant.getByRole('button', { name: 'Valorisation du stock' }).click();
  const row = accountant.getByRole('row', { name: new RegExp(name) });
  await expect(row).toContainText(/1\s000\sFCFA/);
  const download = accountant.waitForEvent('download');
  await accountant.getByRole('button', { name: 'Exporter en CSV' }).click();
  expect((await download).suggestedFilename()).toBe('lavio-stock-valuation.csv');
  await context.close();
});
