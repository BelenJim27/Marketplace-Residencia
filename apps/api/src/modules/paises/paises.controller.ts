import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/guards/roles.decorator';
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
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  create(@Body() dto: CreatePaisDto) {
    return this.service.create(dto);
  }

  @Patch(':iso2')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  update(@Param('iso2') iso2: string, @Body() dto: UpdatePaisDto) {
    return this.service.update(iso2, dto);
  }

  @Delete(':iso2')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  remove(@Param('iso2') iso2: string) {
    return this.service.remove(iso2);
  }
}
