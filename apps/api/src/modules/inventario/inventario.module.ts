import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { InventarioController } from './inventario.controller';
import { InventarioService } from './inventario.service';

@Module({ imports: [PrismaModule, NotificacionesModule], controllers: [InventarioController], providers: [InventarioService] })
export class InventarioModule {}
