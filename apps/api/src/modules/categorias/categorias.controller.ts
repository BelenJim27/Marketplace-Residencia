import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto, UpdateCategoriaDto } from './dto/categorias.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('categorias')
export class CategoriasController {
  constructor(private readonly service: CategoriasService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  @Post() create(@Body() dto: CreateCategoriaDto) { return this.service.create(dto); }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoriaDto) { return this.service.update(id, dto); }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
