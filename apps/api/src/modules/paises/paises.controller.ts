import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermisosGuard } from '../auth/guards/rbac.guard';
import { RequireAnyPermission } from '../auth/guards/permisos.decorator';
import { PERMISOS } from '../../common/permisos-catalog';
import { CreatePaisDto, ListPaisesQueryDto, UpdatePaisDto } from './dto/paises.dto';
import { PaisesService } from './paises.service';

@Controller('paises')
export class PaisesController {
  constructor(private readonly service: PaisesService) {}

  @Get()
  findAll(@Query() query: ListPaisesQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':iso2')
  findOne(@Param('iso2') iso2: string) {
    return this.service.findOne(iso2);
  }

  @Post()
  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_CONFIGURACION)
  create(@Body() dto: CreatePaisDto) {
    return this.service.create(dto);
  }

  @Patch(':iso2')
  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_CONFIGURACION)
  update(@Param('iso2') iso2: string, @Body() dto: UpdatePaisDto) {
    return this.service.update(iso2, dto);
  }

  @Delete(':iso2')
  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_CONFIGURACION)
  remove(@Param('iso2') iso2: string) {
    return this.service.remove(iso2);
  }
}
