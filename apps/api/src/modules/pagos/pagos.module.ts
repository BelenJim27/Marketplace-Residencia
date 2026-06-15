import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { ComisionesModule } from '../comisiones/comisiones.module';
import { EmailModule } from '../email/email.module';
import { EnviosModule } from '../envios/envios.module';
import { ConnectController } from './connect.controller';
import { ConnectService } from './connect.service';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { PaypalService } from './paypal.service';
import { StripeService } from './stripe.service';

@Module({
  imports: [PrismaModule, ConfigModule, EmailModule, EnviosModule, ComisionesModule],
  controllers: [ConnectController, PagosController],
  providers: [PagosService, StripeService, PaypalService, ConnectService],
  exports: [PagosService, StripeService, PaypalService, ConnectService],
})
export class PagosModule {}
