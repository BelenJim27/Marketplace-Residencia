import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto';
import { CreateDetallePedidoDto, CreateFacturaDto, CreatePedidoDto, UpdateDetallePedidoDto, UpdateFacturaDto, UpdatePedidoDto, ValidarEnvioDto } from './dto/pedidos.dto';
import { PedidosService } from './pedidos.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly service: PedidosService) {}

  private async resolveProductorId(user: any): Promise<number | null> {
    return user.id_productor ?? await this.service.getIdProductorByUserId(user.id_usuario);
  }
  @UseGuards(AuthGuard)
  @Get() findAll(@Query() query: PaginacionQueryDto) { return this.service.findAll(query); }
  @UseGuards(AuthGuard)
  @Get('mis-ventas') async getMisVentas(@Req() req: any, @Query('id_productor') idProductor?: string) {
    const parsed = idProductor ? Number(idProductor) : null;
    // 1. JWT id_productor
    const jwtId = req.user.id_productor != null ? Number(req.user.id_productor) : null;
    // 2. DB lookup
    const dbId = await this.service.getIdProductorByUserId(req.user.id_usuario);
    let id_productor: number | null = jwtId ?? dbId;
    // 3. UUID drift fallback: verify ownership via direct join
    if (id_productor == null && parsed != null && !Number.isNaN(parsed)) {
      const owned = await this.service.verifyProductorOwnership(req.user.id_usuario, parsed);
      if (owned) id_productor = parsed;
    }
    return this.service.getMisVentas(id_productor ?? null);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('cliente', 'administrador')
  @Get('mis-compras')
  getMisCompras(@Req() req: any) {
    return this.service.getMisCompras(req.user.id_usuario);
  }

  @UseGuards(AuthGuard)
  @Get('mis-pedidos')
  getMisPedidos(@Req() req: any) {
    return this.service.getMisPedidosProductor(req.user.id_usuario, req.user.id_productor);
  }

  @UseGuards(AuthGuard)
  @Get('estadisticas') async getEstadisticas(@Req() req: any, @Query('id_productor') idProductor?: string, @Query('periodo') periodo?: string) {
    const parsed = idProductor ? Number(idProductor) : undefined;
    let id_productor: number | null;
    if (isAdmin(req.user) && parsed != null && !Number.isNaN(parsed)) {
      id_productor = parsed;
    } else {
      // 1. JWT id_productor (fresh after re-login)
      const jwtId = req.user.id_productor != null ? Number(req.user.id_productor) : null;
      // 2. DB lookup by id_usuario
      const dbId = await this.service.getIdProductorByUserId(req.user.id_usuario);
      id_productor = jwtId ?? dbId;

      // 3. If frontend passed id_productor and both above fail (UUID drift between
      //    JWT and DB), verify ownership directly via IDOR-safe join check
      if (id_productor == null && parsed != null && !Number.isNaN(parsed)) {
        const owned = await this.service.verifyProductorOwnership(req.user.id_usuario, parsed);
        if (owned) id_productor = parsed;
      }
    }
    return this.service.getEstadisticas(periodo || 'month', id_productor);
  }

  @UseGuards(AuthGuard)
  @Get('productor/:id_productor')
  async getOrdersByProductor(@Param('id_productor', ParseIntPipe) id_productor: number, @Req() req: any) {
    if (!isAdmin(req.user)) {
      const actual = await this.resolveProductorId(req.user);
      if (actual !== id_productor) throw new ForbiddenException('Solo puedes ver tus propios pedidos');
    }
    return this.service.getOrdersByProductor(id_productor);
  }

  @UseGuards(AuthGuard)
  @Get('productor/:id_pedido/:id_productor')
  getOrderDetailForProductor(
    @Param('id_pedido') id_pedido: string,
    @Param('id_productor', ParseIntPipe) id_productor: number,
  ) {
    return this.service.getOrderDetailForProductor(id_pedido, id_productor);
  }

  @UseGuards(AuthGuard)
  @Patch('productor/:id_pedido/:id_productor/estado')
  async updateOrderStatus(
    @Param('id_pedido') id_pedido: string,
    @Param('id_productor', ParseIntPipe) id_productor: number,
    @Body() { estado }: { estado: string },
    @Req() req: any,
  ) {
    const admin = req.user?.roles?.includes('admin') || req.user?.permisos?.includes('admin');
    if (!admin) {
      const actual = await this.resolveProductorId(req.user);
      if (actual !== id_productor) throw new ForbiddenException('Solo puedes actualizar el estado de tus propios pedidos');
    }
    return this.service.updateOrderStatusForProductor(id_pedido, id_productor, estado, admin);
  }

  @UseGuards(AuthGuard)
  @Patch('productor/:id_pedido/:id_productor/tracking')
  async updateTracking(
    @Param('id_pedido') id_pedido: string,
    @Param('id_productor', ParseIntPipe) id_productor: number,
    @Body() { numero_rastreo }: { numero_rastreo: string },
    @Req() req: any,
  ) {
    const admin = req.user?.roles?.includes('admin') || req.user?.permisos?.includes('admin');
    if (!admin) {
      const actual = await this.resolveProductorId(req.user);
      if (actual !== id_productor) throw new ForbiddenException('Solo puedes actualizar el tracking de tus propios pedidos');
    }
    return this.service.updateTrackingForProducer(id_pedido, id_productor, numero_rastreo);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('cliente', 'administrador')
  @Post('validar-envio')
  validarEnvio(@Body() dto: ValidarEnvioDto) {
    return this.service.validarEnvio(dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('cliente', 'administrador')
  @Post(':id/cotizar-envio')
  cotizarEnvio(@Param('id') id: string) {
    return this.service.cotizarEnvio(id);
  }

  @UseGuards(AuthGuard)
  @Get('test-email')
  testEmail(@Query('to') to: string, @Req() req: any) {
    if (!isAdmin(req.user)) {
      throw new ForbiddenException('Solo administradores pueden usar test-email');
    }
    return this.service.testEmail(to);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const pedido = await this.service.findOne(id) as any;
    const user = req.user;
    const isOwner = pedido.id_usuario === user.id_usuario;
    // El productor solo puede ver el pedido si tiene al menos un ítem suyo en él.
    const isOwningProductor =
      user.id_productor != null &&
      (pedido.detalle_pedido?.some((d: any) => d.id_productor === user.id_productor) ?? false);
    if (!isAdmin(user) && !isOwner && !isOwningProductor) {
      throw new ForbiddenException('No tienes acceso a este pedido');
    }
    return pedido;
  }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('cliente', 'administrador')
  @Post() create(@Body() dto: CreatePedidoDto, @Req() req: any) { return this.service.create(dto, req.user.id_usuario); }
  @UseGuards(AuthGuard)
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdatePedidoDto, @Req() req: any) { return this.service.update(id, dto, req.user.id_usuario, isAdmin(req.user)); }
  @UseGuards(AuthGuard)
  @Delete(':id') remove(@Param('id') id: string, @Req() req: any) { return this.service.remove(id, req.user.id_usuario, isAdmin(req.user)); }
  @UseGuards(AuthGuard)
  @Post(':id/detalles') addDetalle(@Param('id') id: string, @Body() dto: CreateDetallePedidoDto, @Req() req: any) { return this.service.addDetalle(id, dto, req.user.id_usuario, isAdmin(req.user)); }
  @UseGuards(AuthGuard)
  @Patch('detalles/:id_detalle') updateDetalle(@Param('id_detalle') id_detalle: string, @Body() dto: UpdateDetallePedidoDto, @Req() req: any) { return this.service.updateDetalle(id_detalle, req.user.id_usuario, dto); }
  @UseGuards(AuthGuard)
  @Delete('detalles/:id_detalle') removeDetalle(@Param('id_detalle') id_detalle: string, @Req() req: any) { return this.service.removeDetalle(id_detalle, req.user.id_usuario, isAdmin(req.user)); }

  @UseGuards(AuthGuard)
  @Post(':id/facturas') addFactura(@Param('id') id: string, @Body() dto: CreateFacturaDto, @Req() req: any) { return this.service.addFactura(id, dto, req.user.id_usuario, isAdmin(req.user)); }
  @UseGuards(AuthGuard)
  @Patch('facturas/:id_factura') updateFactura(@Param('id_factura') id_factura: string, @Body() dto: UpdateFacturaDto, @Req() req: any) { return this.service.updateFactura(id_factura, dto, req.user.id_usuario, isAdmin(req.user)); }
  @UseGuards(AuthGuard)
  @Delete('facturas/:id_factura') removeFactura(@Param('id_factura') id_factura: string, @Req() req: any) { return this.service.removeFactura(id_factura, req.user.id_usuario, isAdmin(req.user)); }
}

function isAdmin(user: any): boolean {
  return user?.roles?.some((r: string) => ['admin', 'administrador'].includes(r.toLowerCase())) ?? false;
}
