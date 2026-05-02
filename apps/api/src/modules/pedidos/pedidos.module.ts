import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ComisionesModule } from '../comisiones/comisiones.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';

@Module({ imports: [PrismaModule, AuthModule, ComisionesModule], controllers: [PedidosController], providers: [PedidosService] })
export class PedidosModule {}
