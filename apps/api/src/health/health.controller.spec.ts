import type { Response } from 'express';
import type { PrismaService } from '../prisma/prisma.service.js';
import { HealthController } from './health.controller.js';

const fakeResponse = () => {
  const res = { status: vi.fn(), setHeader: vi.fn() };
  return res as unknown as Response & typeof res;
};

describe('HealthController', () => {
  it('répond ok quand la base répond', async () => {
    const controller = new HealthController({
      ping: () => Promise.resolve(true),
    } as unknown as PrismaService);
    const res = fakeResponse();
    const body = await controller.check(res);
    expect(body).toMatchObject({ status: 'ok', database: 'up' });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('répond 503 quand la base est injoignable', async () => {
    const controller = new HealthController({
      ping: () => Promise.resolve(false),
    } as unknown as PrismaService);
    const res = fakeResponse();
    const body = await controller.check(res);
    expect(body).toMatchObject({ status: 'degraded', database: 'down' });
    expect(res.status).toHaveBeenCalledWith(503);
  });
});
