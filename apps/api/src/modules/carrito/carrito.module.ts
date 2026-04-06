import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CarritoController } from './carrito.controller';
import { CarritoService } from './carrito.service';

@Module({ imports: [PrismaModule], controllers: [CarritoController], providers: [CarritoService] })
export class CarritoModule {}
