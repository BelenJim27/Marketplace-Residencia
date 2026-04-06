import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TiendasController } from './tiendas.controller';
import { TiendasService } from './tiendas.service';

@Module({ imports: [PrismaModule], controllers: [TiendasController], providers: [TiendasService] })
export class TiendasModule {}
