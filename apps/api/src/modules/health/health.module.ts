import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

// PrismaService está disponible globalmente (PrismaModule es @Global).
@Module({ controllers: [HealthController] })
export class HealthModule {}
