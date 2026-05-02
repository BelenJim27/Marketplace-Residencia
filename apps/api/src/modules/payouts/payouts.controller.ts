import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { GenerarPayoutsDto, ListPayoutsQueryDto, UpdatePayoutEstadoDto } from './dto/payouts.dto';
import { PayoutsService } from './payouts.service';

@Controller('payouts')
@UseGuards(AuthGuard, RolesGuard)
export class PayoutsController {
  constructor(private readonly service: PayoutsService) {}

  @Get()
  @Roles('administrador')
  findAll(@Query() query: ListPayoutsQueryDto) {
    return this.service.findAll(query);
  }

  @Get('mis-payouts/:id_productor')
  @Roles('productor', 'administrador')
  findByProductor(@Param('id_productor', ParseIntPipe) id_productor: number) {
    return this.service.findByProductor(id_productor);
  }

  @Get(':id')
  @Roles('administrador')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('generar')
  @Roles('administrador')
  generar(@Body() dto: GenerarPayoutsDto) {
    return this.service.generar(dto);
  }

  @Patch(':id/estado')
  @Roles('administrador')
  actualizarEstado(@Param('id') id: string, @Body() dto: UpdatePayoutEstadoDto) {
    return this.service.actualizarEstado(id, dto);
  }
}
