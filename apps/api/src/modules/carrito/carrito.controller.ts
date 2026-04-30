import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CreateCarritoItemDto, UpdateCarritoItemDto } from './dto/carrito.dto';
import { CarritoService } from './carrito.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('carrito')
export class CarritoController {
  constructor(private readonly service: CarritoService) {}
  @Get() findAll() { return this.service.findAll(); }
  @UseGuards(AuthGuard)
  @Get(':id_usuario') findByUser(@Param('id_usuario', ParseUUIDPipe) id_usuario: string) { return this.service.findByUser(id_usuario); }
  @UseGuards(AuthGuard)
  @Post() create(@Body() dto: CreateCarritoItemDto) { return this.service.create(dto); }
  @UseGuards(AuthGuard)
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateCarritoItemDto) { return this.service.update(id, dto); }
  @UseGuards(AuthGuard)
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
  @UseGuards(AuthGuard)
  @Delete('usuario/:id_usuario') clearByUser(@Param('id_usuario', ParseUUIDPipe) id_usuario: string) { return this.service.clearByUser(id_usuario); }
}
