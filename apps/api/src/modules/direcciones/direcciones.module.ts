import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DireccionesController } from './direcciones.controller';
import { DireccionesService } from './direcciones.service';

@Module({ imports: [PrismaModule], controllers: [DireccionesController], providers: [DireccionesService] })
export class DireccionesModule {}
