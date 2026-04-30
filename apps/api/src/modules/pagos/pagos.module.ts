import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { StripeService } from './stripe.service';

@Module({ imports: [PrismaModule, ConfigModule], controllers: [PagosController], providers: [PagosService, StripeService] })
export class PagosModule {}
