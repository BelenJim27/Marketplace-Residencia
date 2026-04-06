import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateResenaDto, UpdateResenaDto } from './dto/resenas.dto';
import { ResenasService } from './resenas.service';

@Controller('resenas')
export class ResenasController {
  constructor(private readonly service: ResenasService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateResenaDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateResenaDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
