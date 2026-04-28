import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CreateEnvioDto, UpdateEnvioDto, CotizarEnvioDto } from './dto/envios.dto';
import { EnviosService } from './envios.service';
import { DhlService } from './dhl.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('envios')
export class EnviosController {
  constructor(
    private readonly service: EnviosService,
    private readonly dhlService: DhlService,
  ) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateEnvioDto) { return this.service.create(dto); }
  @Post('cotizar') @UseGuards(AuthGuard) cotizar(@Body() dto: CotizarEnvioDto) { return this.dhlService.cotizarEnvio(dto); }
  @Post('cotizaciones') @UseGuards(AuthGuard) guardarCotizacion(@Body() data: any) { return this.service.guardarCotizacion(data.id_pedido, data); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateEnvioDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
