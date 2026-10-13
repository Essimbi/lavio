import { type Browser, expect, type Page, test } from '@playwright/test';

/**
 * Parcours 4 (docs/13) : mobile de la responsable. Une remise saisie au comptoir arrive dans
 * ses validations ; elle la voit sur son tableau de bord, l'approuve depuis son téléphone et
 * retrouve un tableau de bord à jour.
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

/** Remise de 2 000 FCFA sur un costume, saisie au comptoir (ordinateur). */
async function discountFromCounter(browser: Browser): Promise<string> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await signIn(page, 'e2e-caisse@test.local');
  await page.goto('/app/deposits/new');
  const search = page.getByLabel('Téléphone, nom ou numéro de ticket');
  await search.fill('699000777');
  await expect(page.getByRole('option', { name: /Client Fidèle E2E/ })).toBeVisible();
  await search.press('Enter');
  await page.getByLabel('Article 1', { exact: true }).selectOption({ label: 'Costume' });
  await page.getByLabel('Remise (FCFA)').fill('2000');
  await page.getByRole('button', { name: 'Enregistrer et imprimer' }).click();
  await expect(page.getByText('en attente de validation par la responsable')).toBeVisible();
  const ticket = ((await page.getByRole('heading', { level: 1 }).textContent()) ?? '').replace(
    /\D/g,
    '',
  );
  await context.close();
  return ticket;
}

test('parcours 4 : la responsable valide depuis son téléphone et voit le tableau de bord à jour', async ({
  page,
  browser,
  isMobile,
}) => {
  test.skip(!isMobile, 'Parcours du téléphone de la responsable');
  const ticket = await discountFromCounter(browser);

  await signIn(page, 'e2e-responsable@test.local');
  // Tableau de bord mobile : chiffres du jour et validations en attente.
  await expect(page.getByText('Chiffre d’affaires')).toBeVisible();
  const approvalsCard = page.getByRole('link', { name: /Validations/ }).first();
  await expect(approvalsCard).toContainText(/[1-9]\d*/);
  // Navigation basse : pastille sur « Plus ».
  await expect(
    page.locator('.bottom-nav').getByRole('link', { name: /Plus/ }).locator('.lv-badge'),
  ).toBeVisible();

  await approvalsCard.click();
  await expect(page.getByRole('heading', { level: 1, name: 'Validations' })).toBeVisible();
  const request = page.getByRole('listitem').filter({ hasText: `Dépôt n° ${ticket}` });
  await request.getByRole('button', { name: 'Valider' }).click();
  await expect(page.getByText('Demande validée.')).toBeVisible();
  await expect(request).toHaveCount(0);

  // Retour au tableau de bord : le dépôt validé compte dans le chiffre d'affaires du jour.
  await page.locator('.bottom-nav').getByRole('link', { name: 'Accueil' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tableau de bord' })).toBeVisible();
  await expect(page.locator('.dash-kpi--primary .dash-value')).toHaveText(/\d[\d\s]*\sFCFA/);
});
