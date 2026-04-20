import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProductoresController } from './productores.controller';
import { ProductoresService } from './productores.service';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { ArchivosModule } from '../archivos/archivos.module';

@Module({
  imports: [PrismaModule, NotificacionesModule, ArchivosModule],
  controllers: [ProductoresController],
  providers: [ProductoresService],
})
export class ProductoresModule {}
