import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CreateDireccionDto, UpdateDireccionDto } from './dto/direcciones.dto';
import { DireccionesService } from './direcciones.service';

@Controller('direcciones')
export class DireccionesController {
  constructor(private readonly service: DireccionesService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id_usuario') findByUser(@Param('id_usuario', ParseUUIDPipe) id_usuario: string) { return this.service.findByUser(id_usuario); }
  @Post() create(@Body() dto: CreateDireccionDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateDireccionDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
