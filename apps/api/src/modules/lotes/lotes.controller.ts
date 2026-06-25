import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto';
import { CreateLoteDto, UpdateLoteDto } from './dto/lotes.dto';
import { LotesService } from './lotes.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermisosGuard } from '../auth/guards/rbac.guard';
import { RequireAnyPermission } from '../auth/guards/permisos.decorator';
import { PERMISOS } from '../../common/permisos-catalog';

const WRITE_GUARDS = [AuthGuard, PermisosGuard] as const;

@Controller('lotes')
export class LotesController {
  constructor(private readonly service: LotesService) {}

  private isManager(user: any): boolean {
    return user?.permisos?.includes(PERMISOS.GESTIONAR_INVENTARIO) ?? false;
  }

  private assertProductor(user: any, idProductor: number) {
    if (!this.isManager(user) && user?.id_productor !== idProductor) {
      throw new ForbiddenException('No tienes permiso para gestionar los lotes de este productor');
    }
  }

  private async assertLote(user: any, idLote: number) {
    if (!this.isManager(user)) this.assertProductor(user, await this.service.getOwnerId(idLote));
  }

  @Get()
  @UseGuards(...WRITE_GUARDS)
  @RequireAnyPermission(PERMISOS.VER_INVENTARIO, PERMISOS.GESTIONAR_INVENTARIO)
  findAll(@Req() req: any, @Query('id_productor') id_productor?: string, @Query() query?: PaginacionQueryDto) {
    if (id_productor) this.assertProductor(req.user, Number(id_productor));
    if (!id_productor && !this.isManager(req.user)) {
      if (!req.user.id_productor) throw new ForbiddenException('Productor no autorizado');
      return this.service.findByProductor(req.user.id_productor);
    }
    return id_productor
      ? this.service.findByProductor(Number(id_productor))
      : this.service.findAll(query);
  }

  @Post('sincronizar')
  @UseGuards(...WRITE_GUARDS)
  @RequireAnyPermission(PERMISOS.CREAR_INVENTARIO, PERMISOS.GESTIONAR_INVENTARIO)
  sincronizar(
    @Body() body: { uuid_externo: string; id_productor: number; id_region?: number },
    @Req() req: any,
  ) {
    this.assertProductor(req.user, body.id_productor);
    return this.service.sincronizarDesdeApi(
      body.uuid_externo,
      body.id_productor,
      body.id_region,
    );
  }

  @Post('sincronizar-todos')
  @UseGuards(...WRITE_GUARDS)
  @RequireAnyPermission(PERMISOS.CREAR_INVENTARIO, PERMISOS.GESTIONAR_INVENTARIO)
  sincronizarTodos(@Req() req: any, @Body() body?: { id_productor?: number }) {
    const idProductor = this.isManager(req.user) ? body?.id_productor : req.user.id_productor;
    if (!idProductor && !this.isManager(req.user)) throw new ForbiddenException('Productor no autorizado');
    return this.service.sincronizarTodos(idProductor ? Number(idProductor) : undefined);
  }

  @Get(':id')
  @UseGuards(...WRITE_GUARDS)
  @RequireAnyPermission(PERMISOS.VER_INVENTARIO, PERMISOS.GESTIONAR_INVENTARIO)
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    await this.assertLote(req.user, id);
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(...WRITE_GUARDS)
  @RequireAnyPermission(PERMISOS.CREAR_INVENTARIO, PERMISOS.GESTIONAR_INVENTARIO)
  create(@Body() dto: CreateLoteDto, @Req() req: any) {
    const idProductor = this.isManager(req.user) ? dto.id_productor : req.user.id_productor;
    if (!idProductor) throw new ForbiddenException('Productor no autorizado');
    return this.service.create({ ...dto, id_productor: idProductor });
  }

  @Patch(':id')
  @UseGuards(...WRITE_GUARDS)
  @RequireAnyPermission(PERMISOS.EDITAR_INVENTARIO, PERMISOS.GESTIONAR_INVENTARIO)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLoteDto, @Req() req: any) {
    await this.assertLote(req.user, id);
    const safeDto = this.isManager(req.user) ? dto : { ...dto, id_productor: req.user.id_productor };
    return this.service.update(id, safeDto);
  }

  @Delete(':id')
  @UseGuards(...WRITE_GUARDS)
  @RequireAnyPermission(PERMISOS.EDITAR_INVENTARIO, PERMISOS.GESTIONAR_INVENTARIO)
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    await this.assertLote(req.user, id);
    return this.service.remove(id);
  }

  @Post(':id/stock')
  @UseGuards(...WRITE_GUARDS)
  @RequireAnyPermission(PERMISOS.EDITAR_INVENTARIO, PERMISOS.GESTIONAR_INVENTARIO)
  async ajustarStock(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      cantidad: number;
      tipo: 'entrada' | 'salida' | 'ajuste';
      motivo?: string;
      id_usuario?: string;
    },
    @Req() req: any,
  ) {
    await this.assertLote(req.user, id);
    return this.service.ajustarStock(
      id,
      body.cantidad,
      body.tipo,
      body.motivo ?? '',
      req.user.id_usuario,
    );
  }

  // Forzar re-sincronización de un lote específico con su producto
  @Post(':id/sincronizar-producto')
  @UseGuards(...WRITE_GUARDS)
  @RequireAnyPermission(PERMISOS.EDITAR_INVENTARIO, PERMISOS.GESTIONAR_INVENTARIO)
  async sincronizarProducto(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    await this.assertLote(req.user, id);
    return this.service.sincronizarProductoUnico(id);
  }

}
