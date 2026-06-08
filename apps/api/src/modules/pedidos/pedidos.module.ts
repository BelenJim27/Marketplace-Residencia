import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { ComisionesModule } from '../comisiones/comisiones.module';
import { EmailModule } from '../email/email.module';
import { EnviosModule } from '../envios/envios.module';
import { PagosModule } from '../pagos/pagos.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';

@Module({
  imports: [ConfigModule, PrismaModule, AuthModule, ComisionesModule, EmailModule, EnviosModule, PagosModule, NotificacionesModule],
  controllers: [PedidosController],
  providers: [PedidosService],
})
export class PedidosModule {}
