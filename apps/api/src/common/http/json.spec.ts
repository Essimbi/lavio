import { jsonReplacer } from './json.js';

describe('jsonReplacer', () => {
  it('convertit les BigInt en nombres', () => {
    expect(JSON.stringify({ amountXaf: 12500n, nested: [1n] }, jsonReplacer)).toBe(
      '{"amountXaf":12500,"nested":[1]}',
    );
  });

  it('refuse un montant hors des entiers sûrs', () => {
    expect(() => JSON.stringify({ a: 2n ** 60n }, jsonReplacer)).toThrow(RangeError);
  });
});
