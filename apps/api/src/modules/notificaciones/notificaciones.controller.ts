import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CreateNotificacionDto, UpdateNotificacionDto } from './dto/notificaciones.dto';
import { NotificacionesService } from './notificaciones.service';

@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly service: NotificacionesService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id_usuario') findByUser(@Param('id_usuario', ParseUUIDPipe) id_usuario: string) { return this.service.findByUser(id_usuario); }
  @Post() create(@Body() dto: CreateNotificacionDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateNotificacionDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
