import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { LotesModule } from '../lotes/lotes.module';
import { InventarioController } from './inventario.controller';
import { InventarioService } from './inventario.service';

@Module({ imports: [PrismaModule, NotificacionesModule, LotesModule], controllers: [InventarioController], providers: [InventarioService] })
export class InventarioModule {}
