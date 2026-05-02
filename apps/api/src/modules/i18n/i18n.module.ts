import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TraduccionesService } from './traducciones.service';

@Module({
  imports: [PrismaModule],
  providers: [TraduccionesService],
  exports: [TraduccionesService],
})
export class I18nModule {}
