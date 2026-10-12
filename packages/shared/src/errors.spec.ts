import { describe, expect, it } from 'vitest';
import { ERROR_DEFAULT_MESSAGES, ERROR_HTTP_STATUS, ErrorCode } from './errors.js';

describe('ErrorCode', () => {
  it('associe un statut HTTP et un message français à chaque code', () => {
    for (const code of Object.values(ErrorCode)) {
      expect(ERROR_HTTP_STATUS[code]).toBeGreaterThanOrEqual(400);
      expect(ERROR_DEFAULT_MESSAGES[code].length).toBeGreaterThan(0);
    }
  });

  it('respecte les statuts imposés par la documentation', () => {
    expect(ERROR_HTTP_STATUS.LICENSE_INACTIVE).toBe(402);
    expect(ERROR_HTTP_STATUS.LICENSE_READ_ONLY).toBe(403);
    expect(ERROR_HTTP_STATUS.DUPLICATE_REFERENCE).toBe(409);
  });
});
