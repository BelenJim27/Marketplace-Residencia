import { Controller, Get, Query } from '@nestjs/common';
import { EstadisticasLandingService } from './estadisticas-landing.service';

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
    return this.service.getTopProductos(top ? Number(top) : 4);
  }

  @Get('top-productos-lote')
  getTopProductosConLote(@Query('top') top?: string) {
    return this.service.getTopProductosConLote(top ? Number(top) : 4);
  }
}