import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../../prisma/prisma.module';
import { EnviosController } from './envios.controller';
import { EnviosService } from './envios.service';
import { FedexService } from './fedex.service';

@Module({
  imports: [ConfigModule, PrismaModule, HttpModule],
  controllers: [EnviosController],
  providers: [EnviosService, FedexService],
})
export class EnviosModule {}
