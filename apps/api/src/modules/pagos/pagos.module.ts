import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { ConnectController } from './connect.controller';
import { ConnectService } from './connect.service';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { StripeService } from './stripe.service';

@Module({
  imports: [PrismaModule, ConfigModule, EmailModule],
  controllers: [ConnectController, PagosController],
  providers: [PagosService, StripeService, ConnectService],
})
export class PagosModule {}
