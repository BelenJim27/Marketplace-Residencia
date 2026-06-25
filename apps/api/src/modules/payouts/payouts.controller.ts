import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermisosGuard } from '../auth/guards/rbac.guard';
import { RequireAnyPermission } from '../auth/guards/permisos.decorator';
import { PERMISOS } from '../../common/permisos-catalog';
import { GenerarPayoutsDto, ListPayoutsQueryDto, UpdatePayoutEstadoDto } from './dto/payouts.dto';
import { PayoutsService } from './payouts.service';

@Controller('payouts')
@UseGuards(AuthGuard, PermisosGuard)
export class PayoutsController {
  constructor(private readonly service: PayoutsService) {}

  @Get()
  @RequireAnyPermission(PERMISOS.GESTIONAR_PAYOUTS)
  findAll(@Query() query: ListPayoutsQueryDto) {
    return this.service.findAll(query);
  }

  @Get('mis-payouts/:id_productor')
  @RequireAnyPermission(PERMISOS.VER_REPORTES, PERMISOS.GESTIONAR_PAYOUTS, PERMISOS.VER_REPORTES_PRODUCTOR)
  findByProductor(@Param('id_productor', ParseIntPipe) id_productor: number) {
    return this.service.findByProductor(id_productor);
  }

  @Get('resumen-pendientes')
  @RequireAnyPermission(PERMISOS.GESTIONAR_PAYOUTS)
  resumenPendientes() {
    return this.service.resumenPendientes();
  }

  @Get(':id')
  @RequireAnyPermission(PERMISOS.GESTIONAR_PAYOUTS)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('generar')
  @RequireAnyPermission(PERMISOS.GESTIONAR_PAYOUTS)
  generar(@Body() dto: GenerarPayoutsDto, @Req() req: Request) {
    // C-5: registrar qué admin autorizó la generación de payouts (trazabilidad).
    return this.service.generar(dto, (req as any).user?.id_usuario);
  }

  @Patch(':id/estado')
  @RequireAnyPermission(PERMISOS.GESTIONAR_PAYOUTS)
  actualizarEstado(@Param('id') id: string, @Body() dto: UpdatePayoutEstadoDto) {
    return this.service.actualizarEstado(id, dto);
  }
}
