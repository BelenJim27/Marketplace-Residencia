import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermisosGuard } from '../auth/guards/rbac.guard';
import { RequireAnyPermission } from '../auth/guards/permisos.decorator';
import { PERMISOS } from '../../common/permisos-catalog';
import { ComisionesService } from './comisiones.service';
import { CreateComisionDto, ResolverComisionQueryDto, UpdateComisionDto } from './dto/comisiones.dto';

@Controller('comisiones')
@UseGuards(AuthGuard, PermisosGuard)
export class ComisionesController {
  constructor(private readonly service: ComisionesService) {}

  @Get()
  @RequireAnyPermission(PERMISOS.GESTIONAR_COMISIONES)
  findAll() {
    return this.service.findAll();
  }

  @Get('resolver')
  @RequireAnyPermission(PERMISOS.GESTIONAR_COMISIONES, PERMISOS.VER_REPORTES)
  resolver(@Query() query: ResolverComisionQueryDto) {
    return this.service.resolver(query);
  }

  @Get(':id')
  @RequireAnyPermission(PERMISOS.GESTIONAR_COMISIONES)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @RequireAnyPermission(PERMISOS.GESTIONAR_COMISIONES)
  create(@Body() dto: CreateComisionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequireAnyPermission(PERMISOS.GESTIONAR_COMISIONES)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateComisionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequireAnyPermission(PERMISOS.GESTIONAR_COMISIONES)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
