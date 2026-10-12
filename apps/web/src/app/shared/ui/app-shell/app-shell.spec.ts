import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { MeResponse } from '@lavio/shared';
import { AuthService } from '../../../core/auth/auth.service';
import { AppShell } from './app-shell';
import type { ShellConfig } from './nav';

@Component({ template: '<h1>Contenu</h1>' })
class Page {}

const config: ShellConfig = {
  area: 'Espace pressing',
  loginPath: '/login',
  items: [
    { label: 'Tableau de bord', path: '/app', icon: 'home', exact: true },
    { label: 'Dépôts', path: '/app/deposits', icon: 'ticket' },
    { label: 'Paramètres', path: '/app/settings', icon: 'settings', tenantRoles: ['OWNER'] },
  ],
  mobileItems: [{ label: 'Accueil', path: '/app', icon: 'home', exact: true }],
  primaryAction: { label: 'Nouveau dépôt', path: '/app/deposits/new', icon: 'plus' },
};

const me = (roles: MeResponse['user']['tenantRoles']): MeResponse => ({
  user: {
    id: 'u1',
    fullName: 'Awa Test',
    email: null,
    phone: null,
    tenantRoles: roles,
    platformRole: null,
    mustChangePassword: false,
  },
  tenant: { id: 't1', name: 'Pressing Démo', slug: 'demo' },
  license: null,
});

describe('AppShell', () => {
  async function render(url: string, roles: MeResponse['user']['tenantRoles'] = ['OWNER']) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          {
            path: 'app',
            children: [
              { path: '', component: Page },
              { path: 'deposits', component: Page },
            ],
          },
        ]),
      ],
    });
    TestBed.inject(AuthService).me.set(me(roles));
    const fixture = TestBed.createComponent(AppShell);
    fixture.componentRef.setInput('config', config);
    await TestBed.inject(Router).navigateByUrl(url);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const labels = (el: HTMLElement) =>
    [...el.querySelectorAll('.sidebar .nav-link span')].map((a) => a.textContent.trim());

  it('affiche la navigation, l’action principale, le pressing et la déconnexion', async () => {
    const el = await render('/app');
    expect(labels(el)).toEqual(['Tableau de bord', 'Dépôts', 'Paramètres', 'Se déconnecter']);
    expect(el.querySelector('.primary-action')?.textContent).toContain('Nouveau dépôt');
    expect(el.querySelector('.sidebar .area')?.textContent).toContain('Pressing Démo');
    expect(el.querySelector('a.skip-link')?.getAttribute('href')).toBe('#contenu');
    expect(el.querySelectorAll('nav[aria-label="Navigation principale"]')).toHaveLength(2);
  });

  it('masque les entrées réservées à la responsable', async () => {
    const el = await render('/app', ['CASHIER']);
    expect(labels(el)).not.toContain('Paramètres');
  });

  it('marque la page courante avec aria-current', async () => {
    const el = await render('/app/deposits');
    const current = [...el.querySelectorAll('.sidebar [aria-current="page"]')];
    expect(current.map((a) => a.textContent.trim())).toEqual(['Dépôts']);
  });
});
