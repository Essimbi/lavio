import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import type { HealthResponse } from '@lavio/shared';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOkResponse({ description: 'Service et base de données opérationnels' })
  @ApiServiceUnavailableResponse({ description: 'Base de données injoignable' })
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthResponse> {
    const databaseUp = await this.prisma.ping();
    res.setHeader('Cache-Control', 'no-store');
    if (!databaseUp) res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return {
      status: databaseUp ? 'ok' : 'degraded',
      version: process.env['VERCEL_GIT_COMMIT_SHA']?.slice(0, 7) ?? 'dev',
      time: new Date().toISOString(),
      database: databaseUp ? 'up' : 'down',
    };
  }
}
