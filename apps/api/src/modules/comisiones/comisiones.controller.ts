import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { ComisionesService } from './comisiones.service';
import { CreateComisionDto, ResolverComisionQueryDto, UpdateComisionDto } from './dto/comisiones.dto';

@Controller('comisiones')
@UseGuards(AuthGuard, RolesGuard)
export class ComisionesController {
  constructor(private readonly service: ComisionesService) {}

  @Get()
  @Roles('administrador')
  findAll() {
    return this.service.findAll();
  }

  @Get('resolver')
  @Roles('administrador', 'productor')
  resolver(@Query() query: ResolverComisionQueryDto) {
    return this.service.resolver(query);
  }

  @Get(':id')
  @Roles('administrador')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('administrador')
  create(@Body() dto: CreateComisionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('administrador')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateComisionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('administrador')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
