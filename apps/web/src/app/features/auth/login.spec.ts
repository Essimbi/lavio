import type { PublicDemoAccount } from '@lavio/shared';
import { demoAccount } from './login';

const accounts: PublicDemoAccount[] = [
  { label: 'Responsable', email: 'demo-responsable@lavio.local', password: 'x'.repeat(12) },
  { label: 'Caisse', email: 'demo-caisse@lavio.local', password: 'x'.repeat(12) },
];

describe('Connexion : compte de démonstration pré-rempli', () => {
  it('ne pré-remplit rien sans paramètre ?demo (vrai client)', () => {
    expect(demoAccount(accounts, undefined)).toBeUndefined();
    expect(demoAccount(accounts, '')).toBeUndefined();
    expect(demoAccount(accounts, 'abc')).toBeUndefined();
    expect(demoAccount(accounts, '-1')).toBeUndefined();
    expect(demoAccount(accounts, '1.5')).toBeUndefined();
    expect(demoAccount(accounts, '7')).toBeUndefined();
  });

  it('choisit le compte demandé par son index', () => {
    expect(demoAccount(accounts, '0')?.label).toBe('Responsable');
    expect(demoAccount(accounts, '1')?.label).toBe('Caisse');
  });
});
