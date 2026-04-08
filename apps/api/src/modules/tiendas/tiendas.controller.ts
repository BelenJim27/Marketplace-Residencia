import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { CreateTiendaDto, UpdateTiendaDto } from './dto/tiendas.dto';
import { TiendasService } from './tiendas.service';

@Controller('tiendas')
export class TiendasController {
  constructor(private readonly service: TiendasService) {}

  @Get()
  findAll(@Query('id_productor') idProductor?: string) {
    const parsed = Number(idProductor);
    if (!idProductor || Number.isNaN(parsed)) {
      throw new BadRequestException('id_productor es requerido');
    }
    return this.service.findAll(parsed);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTiendaDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTiendaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
