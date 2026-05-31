import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { TasasCambioController } from './tasas-cambio.controller';
import { TasasCambioService } from './tasas-cambio.service';
import { TasasCambioSyncService } from './tasas-cambio-sync.service';

@Global()
@Module({
  imports: [PrismaModule, HttpModule, ConfigModule],
  controllers: [TasasCambioController],
  providers: [TasasCambioService, TasasCambioSyncService],
  exports: [TasasCambioService],
})
export class TasasCambioModule {}
