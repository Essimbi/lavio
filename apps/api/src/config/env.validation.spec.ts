import { validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  const base = { DATABASE_URL: 'postgresql://u:p@localhost:5432/db' };

  it('applique les valeurs par défaut', () => {
    const env = validateEnv(base);
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('convertit les types', () => {
    const env = validateEnv({ ...base, PORT: '4000', SWAGGER_ENABLED: 'false' });
    expect(env.PORT).toBe(4000);
    expect(env.SWAGGER_ENABLED).toBe(false);
  });

  it('refuse une configuration sans base de données', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('refuse un environnement inconnu', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });
});
