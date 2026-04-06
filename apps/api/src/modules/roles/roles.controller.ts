import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { AssignPermisoDto, CreatePermisoDto, CreateRolDto, UpdatePermisoDto, UpdateRolDto } from './dto/roles.dto';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get('permisos')
  findAllPermisos() { return this.service.findAllPermisos(); }

  @Get('permisos/:id')
  findPermiso(@Param('id', ParseIntPipe) id: number) { return this.service.findPermiso(id); }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: CreateRolDto) { return this.service.create(dto); }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRolDto) { return this.service.update(id, dto); }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }

  @Post(':id/permisos')
  addPermiso(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignPermisoDto) { return this.service.addPermiso(id, dto.id_permiso); }

  @Delete(':id/permisos/:id_permiso')
  removePermisoFromRole(@Param('id', ParseIntPipe) id: number, @Param('id_permiso', ParseIntPipe) id_permiso: number) { return this.service.removePermisoFromRole(id, id_permiso); }

  @Post('permisos')
  createPermiso(@Body() dto: CreatePermisoDto) { return this.service.createPermiso(dto); }

  @Patch('permisos/:id')
  updatePermiso(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePermisoDto) { return this.service.updatePermiso(id, dto); }

  @Delete('permisos/:id')
  removePermiso(@Param('id', ParseIntPipe) id: number) { return this.service.removePermiso(id); }
}
