import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CreateCarritoItemDto, UpdateCarritoItemDto } from './dto/carrito.dto';
import { CarritoService } from './carrito.service';

@Controller('carrito')
export class CarritoController {
  constructor(private readonly service: CarritoService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id_usuario') findByUser(@Param('id_usuario', ParseUUIDPipe) id_usuario: string) { return this.service.findByUser(id_usuario); }
  @Post() create(@Body() dto: CreateCarritoItemDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateCarritoItemDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
