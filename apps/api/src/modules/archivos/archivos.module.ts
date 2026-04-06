import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ArchivosController } from './archivos.controller';
import { ArchivosService } from './archivos.service';

@Module({ imports: [PrismaModule], controllers: [ArchivosController], providers: [ArchivosService] })
export class ArchivosModule {}
