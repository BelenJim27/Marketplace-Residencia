import { Controller, Get, Query } from '@nestjs/common';
import {
  DEFAULT_TOP_PRODUCTOS,
  EstadisticasLandingService,
} from './estadisticas-landing.service';

// Endpoints públicos — sin AuthGuard (landing page pública)
@Controller('estadisticas')
export class EstadisticasLandingController {
  constructor(private readonly service: EstadisticasLandingService) {}

  @Get('landing')
  getEstadisticasPublicas() {
    return this.service.getEstadisticasPublicas();
  }

  @Get('top-productos')
  getTopProductos(@Query('top') top?: string) {
    return this.service.getTopProductos(top ? Number(top) : DEFAULT_TOP_PRODUCTOS);
  }

  @Get('top-productos-lote')
  getTopProductosConLote(@Query('top') top?: string) {
    return this.service.getTopProductosConLote(top ? Number(top) : DEFAULT_TOP_PRODUCTOS);
  }
}
