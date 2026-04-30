import { Controller, Get } from '@nestjs/common';
import { EstadisticasLandingService } from './estadisticas-landing.service';

// Endpoint público — no lleva AuthGuard porque la landing es pública
@Controller('estadisticas')
export class EstadisticasLandingController {
  constructor(private readonly service: EstadisticasLandingService) {}

  @Get('landing')
  getEstadisticasPublicas() {
    return this.service.getEstadisticasPublicas();
  }
}