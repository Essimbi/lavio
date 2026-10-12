import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AppException } from '../errors/app.exception.js';
import { mapException } from './all-exceptions.filter.js';

describe('mapException', () => {
  it('conserve le code, le statut et les détails d’une AppException', () => {
    const { status, body } = mapException(
      new AppException('DUPLICATE_REFERENCE', undefined, { operatorRef: 'X1' }),
    );
    expect(status).toBe(409);
    expect(body.error.code).toBe('DUPLICATE_REFERENCE');
    expect(body.error.message).toMatch(/Mobile Money/);
    expect(body.error.details).toEqual({ operatorRef: 'X1' });
  });

  it('utilise le statut 402 pour LICENSE_INACTIVE', () => {
    expect(mapException(new AppException('LICENSE_INACTIVE')).status).toBe(402);
  });

  it('traduit les exceptions HTTP de Nest en codes de l’API, en français', () => {
    const notFound = mapException(new NotFoundException('Cannot GET /x'));
    expect(notFound.status).toBe(404);
    expect(notFound.body.error).toEqual({
      code: 'NOT_FOUND',
      message: "L'élément demandé est introuvable.",
    });
    expect(mapException(new BadRequestException()).body.error.code).toBe('VALIDATION_FAILED');
  });

  it('traduit les erreurs Prisma connues', () => {
    const unique = Object.assign(new Error('unique'), {
      name: 'PrismaClientKnownRequestError',
      code: 'P2002',
    });
    expect(mapException(unique)).toMatchObject({
      status: 409,
      body: { error: { code: 'CONFLICT' } },
    });
  });

  it('signale un corps de requête trop volumineux', () => {
    const tooLarge = Object.assign(new Error('too large'), {
      status: 413,
      type: 'entity.too.large',
    });
    expect(mapException(tooLarge).body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('masque les erreurs inattendues', () => {
    const { status, body } = mapException(new Error('secret interne'));
    expect(status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(body)).not.toContain('secret interne');
  });
});
