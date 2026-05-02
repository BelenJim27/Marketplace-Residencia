import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { ConvertirQueryDto, CreateTasaCambioDto } from './dto/tasas-cambio.dto';
import { TasasCambioService } from './tasas-cambio.service';

@Controller('tasas-cambio')
export class TasasCambioController {
  constructor(private readonly service: TasasCambioService) {}

  @Get()
  findAll(@Query('origen') origen?: string, @Query('destino') destino?: string) {
    return this.service.findAll(origen, destino);
  }

  @Get('vigente')
  getVigente(
    @Query('origen') origen: string,
    @Query('destino') destino: string,
    @Query('fecha') fecha?: string,
  ) {
    return this.service.getVigente(origen, destino, fecha ? new Date(fecha) : undefined);
  }

  @Get('convertir')
  convertir(@Query() query: ConvertirQueryDto) {
    return this.service.convertir(
      query.origen,
      query.destino,
      query.monto,
      query.fecha ? new Date(query.fecha) : undefined,
    );
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  create(@Body() dto: CreateTasaCambioDto) {
    return this.service.create(dto);
  }
}
