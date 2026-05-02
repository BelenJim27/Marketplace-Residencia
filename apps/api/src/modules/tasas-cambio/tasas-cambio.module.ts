import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TasasCambioController } from './tasas-cambio.controller';
import { TasasCambioService } from './tasas-cambio.service';

@Module({
  imports: [PrismaModule],
  controllers: [TasasCambioController],
  providers: [TasasCambioService],
  exports: [TasasCambioService],
})
export class TasasCambioModule {}
