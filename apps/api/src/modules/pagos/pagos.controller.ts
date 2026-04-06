import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CreateMonedaDto, CreatePagoDto, UpdateMonedaDto, UpdatePagoDto } from './dto/pagos.dto';
import { PagosService } from './pagos.service';

@Controller('pagos')
export class PagosController {
  constructor(private readonly service: PagosService) {}
  @Get('monedas') listMonedas() { return this.service.listMonedas(); }
  @Post('monedas') createMoneda(@Body() dto: CreateMonedaDto) { return this.service.createMoneda(dto); }
  @Patch('monedas/:codigo') updateMoneda(@Param('codigo') codigo: string, @Body() dto: UpdateMonedaDto) { return this.service.updateMoneda(codigo, dto); }
  @Delete('monedas/:codigo') removeMoneda(@Param('codigo') codigo: string) { return this.service.removeMoneda(codigo); }
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreatePagoDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdatePagoDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
