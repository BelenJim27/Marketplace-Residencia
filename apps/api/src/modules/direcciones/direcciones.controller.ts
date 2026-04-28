import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CreateDireccionDto, UpdateDireccionDto } from './dto/direcciones.dto';
import { DireccionesService } from './direcciones.service';

@Controller('direcciones')
export class DireccionesController {
  constructor(private readonly service: DireccionesService) {}

  @Get()
  @UseGuards(AuthGuard)
  findAll(@Req() req: any) {
    if (!req.user.roles.includes('administrador')) {
      throw new ForbiddenException('Solo administradores pueden ver todas las direcciones');
    }
    return this.service.findAll();
  }

  @Get(':id_usuario')
  @UseGuards(AuthGuard)
  findByUser(
    @Param('id_usuario', ParseUUIDPipe) id_usuario: string,
    @Req() req: any,
  ) {
    const isAdmin = req.user.roles.includes('administrador');
    if (!isAdmin && req.user.id_usuario !== id_usuario) {
      throw new ForbiddenException('No puedes ver direcciones de otros usuarios');
    }
    return this.service.findByUser(id_usuario);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() dto: CreateDireccionDto, @Req() req: any) {
    return this.service.create({ ...dto, id_usuario: req.user.id_usuario });
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateDireccionDto, @Req() req: any) {
    return this.service.update(id, dto, req.user.id_usuario);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user.id_usuario);
  }
}
