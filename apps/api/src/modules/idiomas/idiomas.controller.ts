import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermisosGuard } from '../auth/guards/rbac.guard';
import { RequireAnyPermission } from '../auth/guards/permisos.decorator';
import { PERMISOS } from '../../common/permisos-catalog';
import { CreateIdiomaDto, UpdateIdiomaDto } from './dto/idiomas.dto';
import { IdiomasService } from './idiomas.service';

@Controller('idiomas')
export class IdiomasController {
  constructor(private readonly service: IdiomasService) {}

  @Get()
  findAll(@Query('soloActivos') soloActivos?: string) {
    return this.service.findAll(soloActivos === 'true');
  }

  @Get(':codigo')
  findOne(@Param('codigo') codigo: string) {
    return this.service.findOne(codigo);
  }

  @Post()
  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_CONFIGURACION)
  create(@Body() dto: CreateIdiomaDto) {
    return this.service.create(dto);
  }

  @Patch(':codigo')
  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_CONFIGURACION)
  update(@Param('codigo') codigo: string, @Body() dto: UpdateIdiomaDto) {
    return this.service.update(codigo, dto);
  }
}
