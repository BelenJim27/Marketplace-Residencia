import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto, UpdateCategoriaDto } from './dto/categorias.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermisosGuard } from '../auth/guards/rbac.guard';
import { RequireAnyPermission } from '../auth/guards/permisos.decorator';
import { PERMISOS } from '../../common/permisos-catalog';

@Controller('categorias')
export class CategoriasController {
  constructor(private readonly service: CategoriasService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_CATEGORIAS)
  @Post() create(@Body() dto: CreateCategoriaDto) { return this.service.create(dto); }

  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_CATEGORIAS)
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoriaDto) { return this.service.update(id, dto); }

  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_CATEGORIAS)
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
