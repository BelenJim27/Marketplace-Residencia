import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ConfiguracionService } from './configuracion.service';
import { CreateConfiguracionSistemaDto, CreateTasaImpuestoDto, UpdateConfiguracionSistemaDto, UpdateTasaImpuestoDto } from './dto/configuracion.dto';

@Controller('configuracion')
export class ConfiguracionController {
  constructor(private readonly service: ConfiguracionService) {}
  @Get('sistema') listSistema() { return this.service.listSistema(); }
  @Get('sistema/mapa') getMapa() { return this.service.getConfigAsMap(); }
  @Get('sistema/seed') seedDefaults() { return this.service.seedDefaults(); }
  @Get('sistema/:id') getSistema(@Param('id', ParseIntPipe) id: number) { return this.service.getSistema(id); }
  @Post('sistema') createSistema(@Body() dto: CreateConfiguracionSistemaDto) { return this.service.createSistema(dto); }
  @Post('sistema/bulk') upsertBulk(@Body() configs: { clave: string; valor: string; tipo?: string }[]) { return this.service.upsertConfigs(configs); }
  @Patch('sistema/:id') updateSistema(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateConfiguracionSistemaDto) { return this.service.updateSistema(id, dto); }
  @Delete('sistema/:id') removeSistema(@Param('id', ParseIntPipe) id: number) { return this.service.removeSistema(id); }

  @Get('tasas') listTasas() { return this.service.listTasas(); }
  @Get('tasas/:id') getTasa(@Param('id', ParseIntPipe) id: number) { return this.service.getTasa(id); }
  @Post('tasas') createTasa(@Body() dto: CreateTasaImpuestoDto) { return this.service.createTasa(dto); }
  @Patch('tasas/:id') updateTasa(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTasaImpuestoDto) { return this.service.updateTasa(id, dto); }
  @Delete('tasas/:id') removeTasa(@Param('id', ParseIntPipe) id: number) { return this.service.removeTasa(id); }
}
