import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../../prisma/prisma.module';
import { EnviosController } from './envios.controller';
import { EnviosService } from './envios.service';
import { DhlService } from './dhl.service';

@Module({
  imports: [ConfigModule, PrismaModule, HttpModule],
  controllers: [EnviosController],
  providers: [EnviosService, DhlService],
})
export class EnviosModule {}
