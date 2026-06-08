import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto';
import { CreateTiendaDto, UpdateTiendaDto } from './dto/tiendas.dto';
import { TiendasService } from './tiendas.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/guards/roles.decorator';

function isAdmin(user: any): boolean {
  return user?.roles?.some((r: string) => r.toLowerCase() === 'administrador') ?? false;
}

@Controller('tiendas')
export class TiendasController {
  constructor(private readonly service: TiendasService) {}

  @Get()
  findAll(@Query('id_productor') idProductor?: string, @Query() query?: PaginacionQueryDto) {
    if (idProductor) {
      const parsed = Number(idProductor);
      if (Number.isNaN(parsed)) {
        throw new BadRequestException('id_productor debe ser un número válido');
      }
      return this.service.findAll(parsed, query);
    }
    return this.service.findAll(undefined, query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() dto: CreateTiendaDto) {
    return this.service.create(dto);
  }

  @UseGuards(AuthGuard)
  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTiendaDto, @Req() req: any) {
    const user = req.user;
    if (!isAdmin(user)) {
      const tienda = await this.service.findOne(id) as any;
      if (!tienda) throw new NotFoundException('Tienda no encontrada');
      if (tienda.id_productor !== user.id_productor) {
        throw new ForbiddenException('Solo puedes editar tu propia tienda');
      }
    }
    return this.service.update(id, dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}