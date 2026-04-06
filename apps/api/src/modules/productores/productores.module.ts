import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProductoresController } from './productores.controller';
import { ProductoresService } from './productores.service';

@Module({ imports: [PrismaModule], controllers: [ProductoresController], providers: [ProductoresService] })
export class ProductoresModule {}
