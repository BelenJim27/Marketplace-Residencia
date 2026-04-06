import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateArchivoDto, UpdateArchivoDto } from './dto/archivos.dto';
import { ArchivosService } from './archivos.service';

@Controller('archivos')
export class ArchivosController {
  constructor(private readonly service: ArchivosService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateArchivoDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateArchivoDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
