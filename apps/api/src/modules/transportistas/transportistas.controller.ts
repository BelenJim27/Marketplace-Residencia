import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CreateServicioEnvioDto, CreateTransportistaDto, UpdateServicioEnvioDto, UpdateTransportistaDto } from './dto/transportistas.dto';
import { TransportistasService } from './transportistas.service';

@Controller('transportistas')
export class TransportistasController {
  constructor(private readonly service: TransportistasService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateTransportistaDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTransportistaDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
  @Post('servicios') createServicio(@Body() dto: CreateServicioEnvioDto) { return this.service.createServicio(dto); }
  @Patch('servicios/:id') updateServicio(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateServicioEnvioDto) { return this.service.updateServicio(id, dto); }
  @Delete('servicios/:id') removeServicio(@Param('id', ParseIntPipe) id: number) { return this.service.removeServicio(id); }
}
