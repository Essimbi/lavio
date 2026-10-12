import { CROCKFORD_ALPHABET, generateLicenseKey, LICENSE_KEY_PATTERN } from './license-key.js';

describe('generateLicenseKey', () => {
  it('respecte le format LAVIO-XXXX-XXXX-XXXX', () => {
    for (let i = 0; i < 200; i++) expect(generateLicenseKey()).toMatch(LICENSE_KEY_PATTERN);
  });

  it("n'utilise jamais I, L, O ni U", () => {
    expect(CROCKFORD_ALPHABET).toHaveLength(32);
    const bodies = Array.from({ length: 500 }, () => generateLicenseKey().slice('LAVIO-'.length));
    for (const body of bodies) expect(body).not.toMatch(/[ILOU]/);
  });

  it('produit des clés différentes', () => {
    const keys = new Set(Array.from({ length: 1000 }, generateLicenseKey));
    expect(keys.size).toBe(1000);
  });
});
