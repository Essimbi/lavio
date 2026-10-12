import { expect, type Page, test } from '@playwright/test';

/**
 * Parcours 3 (docs/13) : création d'un pressing, d'une licence, enregistrement d'un paiement,
 * invitation, connexion de la responsable, passage en lecture seule à l'expiration.
 * Nécessite l'API (API_ORIGIN) et un superadmin de test (E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD).
 */
const email = process.env['E2E_ADMIN_EMAIL'];
const password = process.env['E2E_ADMIN_PASSWORD'];

test.skip(
  !process.env['API_ORIGIN'] || !email || !password,
  'API ou superadmin de test non configurés',
);

const run = Date.now().toString(36);
const date = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

async function choose(page: Page, label: string, option: string | RegExp) {
  await page.getByLabel(label).click();
  await page.getByRole('option', { name: option }).click();
}

test('superadmin : du nouveau pressing à la lecture seule', async ({ page, browser, isMobile }) => {
  test.skip(isMobile, 'Parcours de gestion sur ordinateur');
  test.setTimeout(120_000);

  // Connexion superadmin
  await page.goto('/admin/login');
  await page.getByLabel('E-mail ou téléphone').fill(email ?? '');
  await page.getByLabel('Mot de passe', { exact: true }).fill(password ?? '');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tableau de bord' })).toBeVisible();

  // Plan
  await page.getByRole('link', { name: 'Plans' }).first().click();
  await page.getByRole('button', { name: 'Nouveau plan' }).click();
  await page.getByLabel('Code').fill(`E2E_${run}`.toUpperCase());
  await page.getByLabel('Nom', { exact: true }).fill(`Plan E2E ${run}`);
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('heading', { name: `Plan E2E ${run}` })).toBeVisible();

  // Pressing
  await page.getByRole('link', { name: 'Pressings' }).first().click();
  await page.getByRole('button', { name: 'Nouveau pressing' }).click();
  await page.getByLabel('Nom du pressing').fill(`Pressing E2E ${run}`);
  await page.getByLabel('Ville', { exact: true }).fill('Douala');
  await page.getByRole('button', { name: 'Créer le pressing' }).click();
  await expect(page.getByRole('heading', { level: 1, name: `Pressing E2E ${run}` })).toBeVisible();

  // Licence d'essai
  await page.getByRole('button', { name: 'Nouvelle licence' }).click();
  await choose(page, 'Plan', new RegExp(`Plan E2E ${run}`));
  // Licence commencée il y a 90 jours, pour pouvoir simuler l'expiration plus loin.
  await page.getByLabel('Début').fill(date(-90));
  await page.getByLabel('Fin', { exact: true }).fill(date(14));
  await page.getByRole('button', { name: 'Créer la licence' }).click();
  await expect(page.getByText('Licence créée.')).toBeVisible();
  await expect(page.locator('lv-license-chip').first()).toHaveText('Essai');

  // Paiement : la licence devient active
  await page.getByRole('button', { name: 'Enregistrer un paiement' }).click();
  await page.getByLabel('Montant reçu (FCFA)').fill('15000');
  await page.getByLabel('Référence').fill(`OM-${run}`);
  await page.getByRole('button', { name: 'Enregistrer le paiement' }).click();
  await expect(page.getByText('Paiement enregistré, licence prolongée.')).toBeVisible();
  await expect(page.locator('lv-license-chip').first()).toHaveText('Active');
  await expect(page.getByRole('cell', { name: /15\s000\sFCFA/ })).toBeVisible();

  // Invitation de la responsable
  await page.getByRole('button', { name: 'Inviter la responsable' }).click();
  await page.getByLabel('Nom complet').fill('Responsable E2E');
  await page.getByLabel('Téléphone (WhatsApp)').fill(`69${String(Date.now()).slice(-7)}`);
  await page.getByRole('button', { name: 'Créer le lien d’invitation' }).click();
  const link = await page.getByLabel('Lien d’invitation').inputValue();
  await expect(page.getByRole('link', { name: 'Envoyer sur WhatsApp' })).toHaveAttribute(
    'href',
    /^https:\/\/wa\.me\//,
  );
  await page.getByRole('dialog').getByRole('button', { name: 'Fermer' }).click();

  // La responsable choisit son mot de passe et arrive dans son pressing
  const ownerContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  const invitation = new URL(link);
  await owner.goto(`/invitation${invitation.search}`);
  await owner.getByLabel('Nouveau mot de passe').fill('mot-de-passe-e2e-1');
  await owner.getByLabel('Confirmez le mot de passe').fill('mot-de-passe-e2e-1');
  await owner.getByRole('button', { name: 'Enregistrer et me connecter' }).click();
  await expect(owner.getByRole('heading', { level: 1, name: 'Tableau de bord' })).toBeVisible();
  await owner.goto('/app/settings/users');
  await expect(owner.getByRole('button', { name: 'Ajouter un utilisateur' })).toBeEnabled();

  // Expiration (date de fin dépassée au-delà de la grâce) : lecture seule
  await page
    .getByRole('link', { name: /^LAVIO-/ })
    .first()
    .click();
  await page.getByLabel('Nouvelle date de fin').fill(date(-30));
  await page.getByRole('button', { name: 'Renouveler' }).click();
  await expect(page.locator('lv-license-chip').first()).toHaveText('Expirée');

  await owner.reload();
  await expect(
    owner.getByRole('status').filter({ hasText: 'consultation et exports seulement' }),
  ).toBeVisible();
  await expect(owner.getByRole('button', { name: 'Ajouter un utilisateur' })).toBeDisabled();
  await owner.goto('/app/license');
  await expect(owner.locator('lv-license-chip')).toHaveText('Expirée');
  await ownerContext.close();
});
