import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CreateAuditoriaDto, UpdateAuditoriaDto, ListAuditoriaQueryDto } from './dto/auditoria.dto';
import { AuditoriaService } from './auditoria.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermisosGuard } from '../auth/guards/rbac.guard';
import { RequireAnyPermission } from '../auth/guards/permisos.decorator';
import { PERMISOS } from '../../common/permisos-catalog';

@UseGuards(AuthGuard, PermisosGuard)
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly service: AuditoriaService) {}
  @Get()
  @RequireAnyPermission(PERMISOS.VER_AUDITORIA)
  findAll(@Query() query: ListAuditoriaQueryDto) { return this.service.findAll(query); }
  @Get(':id')
  @RequireAnyPermission(PERMISOS.VER_AUDITORIA)
  findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post()
  @RequireAnyPermission(PERMISOS.VER_AUDITORIA)
  create(@Body() dto: CreateAuditoriaDto) { return this.service.create(dto); }
  @Patch(':id')
  @RequireAnyPermission(PERMISOS.VER_AUDITORIA)
  update(@Param('id') id: string, @Body() dto: UpdateAuditoriaDto) { return this.service.update(id, dto); }
  @Delete(':id')
  @RequireAnyPermission(PERMISOS.VER_AUDITORIA)
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
