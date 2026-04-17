import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AssignPermisoDto, CreatePermisoDto, CreateRolDto, UpdatePermisoDto, UpdateRolDto } from './dto/roles.dto';
import { RolesService } from './roles.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard, PermisosGuard } from '../auth/guards/rbac.guard';
import { Roles, Permisos } from '../auth/guards/roles.decorator';

@Controller('roles')
@UseGuards(AuthGuard, RolesGuard, PermisosGuard)
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Get()
  @Roles('administrador')
  findAll() { return this.service.findAll(); }

  @Get('permisos')
  @Roles('administrador')
  findAllPermisos() { return this.service.findAllPermisos(); }

  @Get('permisos/:id')
  @Roles('administrador')
  findPermiso(@Param('id', ParseIntPipe) id: number) { return this.service.findPermiso(id); }

  @Get(':id')
  @Roles('administrador', 'productor')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  @Roles('administrador')
  create(@Body() dto: CreateRolDto) { return this.service.create(dto); }

  @Patch(':id')
  @Roles('administrador')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRolDto) { return this.service.update(id, dto); }

  @Delete(':id')
  @Roles('administrador')
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }

  @Post(':id/permisos')
  @Roles('administrador')
  addPermiso(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignPermisoDto) { return this.service.addPermiso(id, dto.id_permiso); }

  @Delete(':id/permisos/:id_permiso')
  @Roles('administrador')
  removePermisoFromRole(@Param('id', ParseIntPipe) id: number, @Param('id_permiso', ParseIntPipe) id_permiso: number) { return this.service.removePermisoFromRole(id, id_permiso); }

  @Post('permisos')
  @Roles('administrador')
  createPermiso(@Body() dto: CreatePermisoDto) { return this.service.createPermiso(dto); }

  @Patch('permisos/:id')
  @Roles('administrador')
  updatePermiso(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePermisoDto) { return this.service.updatePermiso(id, dto); }

  @Delete('permisos/:id')
  @Roles('administrador')
  removePermiso(@Param('id', ParseIntPipe) id: number) { return this.service.removePermiso(id); }

  @Get(':id/permisos')
  @Roles('administrador', 'productor')
  getPermisosByRole(@Param('id', ParseIntPipe) id: number) { return this.service.getPermisosByRole(id); }
}
