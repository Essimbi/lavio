import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { LicenseState } from '@lavio/shared';
import { AuthService } from '../../../core/auth/auth.service';
import { LicenseBanner } from './license-banner';

async function render(license: LicenseState | null): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  TestBed.inject(AuthService).me.set({
    user: {
      id: 'u',
      fullName: 'A',
      email: null,
      phone: null,
      tenantRoles: ['OWNER'],
      platformRole: null,
      mustChangePassword: false,
    },
    tenant: { id: 't', name: 'P', slug: 'p' },
    license,
  });
  const fixture = TestBed.createComponent(LicenseBanner);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

const state = (status: LicenseState['status'], daysLeft: number): LicenseState => ({
  status,
  daysLeft,
  endsAt: '2026-11-01T00:00:00.000Z',
  graceEndsAt: '2026-11-08T00:00:00.000Z',
  readOnly: ['EXPIRED', 'SUSPENDED', 'REVOKED'].includes(status),
});

describe('LicenseBanner', () => {
  it('ne montre rien à plus de 7 jours', async () => {
    expect((await render(state('ACTIVE', 20))).textContent.trim()).toBe('');
  });

  it('prévient à J-7 et J-3', async () => {
    expect((await render(state('ACTIVE', 7))).textContent).toContain('dans 7 jours');
  });

  it('affiche le message de grâce demandé par la documentation, en gras sur corail', async () => {
    const el = await render(state('GRACE', -2));
    expect(el.textContent).toContain('Votre licence a expiré, contactez le service client');
    expect(el.querySelector('.lv-banner')?.className).toContain('font-bold');
  });

  it('signale la lecture seule', async () => {
    expect((await render(state('EXPIRED', -20))).textContent).toContain(
      'consultation et exports seulement',
    );
  });
});
