import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaisesController } from './paises.controller';
import { PaisesService } from './paises.service';

@Module({
  imports: [PrismaModule],
  controllers: [PaisesController],
  providers: [PaisesService],
  exports: [PaisesService],
})
export class PaisesModule {}
