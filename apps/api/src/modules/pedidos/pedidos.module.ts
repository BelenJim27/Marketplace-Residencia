import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';

@Module({ imports: [PrismaModule], controllers: [PedidosController], providers: [PedidosService] })
export class PedidosModule {}
