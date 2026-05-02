import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ComisionesController } from './comisiones.controller';
import { ComisionesService } from './comisiones.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ComisionesController],
  providers: [ComisionesService],
  exports: [ComisionesService],
})
export class ComisionesModule {}
