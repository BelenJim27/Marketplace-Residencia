import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConfiguracionController } from './configuracion.controller';
import { ConfiguracionService } from './configuracion.service';

@Module({ imports: [PrismaModule], controllers: [ConfiguracionController], providers: [ConfiguracionService] })
export class ConfiguracionModule {}
