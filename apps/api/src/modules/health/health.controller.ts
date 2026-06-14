import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../../prisma/prisma.service';

// Probes para orquestador (Docker/K8s/Render). Sin throttle (se golpean seguido)
// y públicos (sin auth). Liveness = el proceso responde; Readiness = la BD responde.
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  liveness() {
    return { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async readiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'up' };
    } catch (err: any) {
      throw new ServiceUnavailableException({ status: 'error', db: 'down', message: err?.message });
    }
  }
}
