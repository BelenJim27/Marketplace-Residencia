import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../../prisma/prisma.module';
import { TasasCambioModule } from '../tasas-cambio/tasas-cambio.module';
import { EnviosController } from './envios.controller';
import { EnviosService } from './envios.service';
import { FedexService } from './fedex.service';

@Module({
  imports: [ConfigModule, PrismaModule, HttpModule, TasasCambioModule],
  controllers: [EnviosController],
  providers: [EnviosService, FedexService],
  exports: [FedexService],
})
export class EnviosModule {}
