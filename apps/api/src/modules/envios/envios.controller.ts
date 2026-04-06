import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateEnvioDto, UpdateEnvioDto } from './dto/envios.dto';
import { EnviosService } from './envios.service';

@Controller('envios')
export class EnviosController {
  constructor(private readonly service: EnviosService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateEnvioDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateEnvioDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
