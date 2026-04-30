import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { EstadisticasLandingController } from './estadisticas-landing.controller';
import { EstadisticasLandingService } from './estadisticas-landing.service';

@Module({
  imports: [PrismaModule],
  controllers: [EstadisticasLandingController],
  providers: [EstadisticasLandingService],
})
export class EstadisticasLandingModule {}