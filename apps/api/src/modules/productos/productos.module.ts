import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProductosController } from './productos.controller';
import { ProductosService } from './productos.service';

@Module({ imports: [PrismaModule, AuthModule], controllers: [ProductosController], providers: [ProductosService] })
export class ProductosModule {}
