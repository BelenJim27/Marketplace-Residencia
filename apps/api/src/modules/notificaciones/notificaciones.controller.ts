import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto';
import { CreateNotificacionDto, UpdateNotificacionDto } from './dto/notificaciones.dto';
import { NotificacionesService } from './notificaciones.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly service: NotificacionesService) {}
  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  findAll(@Query() query: PaginacionQueryDto) { return this.service.findAll(query); }
  @Get(':id_usuario')
  @UseGuards(AuthGuard)
  findByUser(@Param('id_usuario', ParseUUIDPipe) id_usuario: string) { return this.service.findByUser(id_usuario); }
  @Post()
  @UseGuards(AuthGuard)
  create(@Body() dto: CreateNotificacionDto) { return this.service.create(dto); }
  @Patch(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateNotificacionDto) { return this.service.update(id, dto); }
  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
