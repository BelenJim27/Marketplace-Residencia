import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Headers, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto';
import { CreateDetallePedidoDto, CreateFacturaDto, CreatePedidoDto, UpdateDetallePedidoDto, UpdateFacturaDto, UpdatePedidoDto, ValidarEnvioDto } from './dto/pedidos.dto';
import { PedidosService } from './pedidos.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly service: PedidosService) {}
  @UseGuards(AuthGuard)
  @Get() findAll(@Query() query: PaginacionQueryDto) { return this.service.findAll(query); }
  @UseGuards(AuthGuard)
  @Get('mis-ventas') getMisVentas(@Req() req: any) {
    return this.service.getMisVentas(req.user.id_productor ?? null);
  }

  @UseGuards(AuthGuard)
  @Get('mis-compras')
  getMisCompras(@Headers('authorization') authorization: string) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
    if (!token) throw new BadRequestException('Token requerido');
    return this.service.getMisCompras(token);
  }

  @UseGuards(AuthGuard)
  @Get('mis-pedidos')
  getMisPedidos(@Headers('authorization') authorization: string) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
    if (!token) throw new BadRequestException('Token requerido');
    return this.service.getMisPedidosProductor(token);
  }

  @UseGuards(AuthGuard)
  @Get('estadisticas') getEstadisticas(@Req() req: any, @Query('id_productor') idProductor?: string, @Query('periodo') periodo?: string) {
    const parsed = idProductor ? Number(idProductor) : undefined;
    // Un productor solo ve sus propias estadísticas; un admin puede consultar las de
    // cualquier productor pasando ?id_productor= (evita que un productor vea las de otro).
    const id_productor =
      isAdmin(req.user) && parsed != null && !Number.isNaN(parsed)
        ? parsed
        : (req.user.id_productor ?? null);
    return this.service.getEstadisticas(periodo || 'month', id_productor);
  }

  @UseGuards(AuthGuard)
  @Get('productor/:id_productor')
  getOrdersByProductor(@Param('id_productor', ParseIntPipe) id_productor: number, @Req() req: any) {
    if (!isAdmin(req.user) && req.user?.id_productor !== id_productor) {
      throw new ForbiddenException('Solo puedes ver tus propios pedidos');
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
  updateOrderStatus(
    @Param('id_pedido') id_pedido: string,
    @Param('id_productor', ParseIntPipe) id_productor: number,
    @Body() { estado }: { estado: string },
    @Req() req: any,
  ) {
    const userProductorId = req.user?.id_productor;
    const isAdmin = req.user?.roles?.includes('admin') || req.user?.permisos?.includes('admin');
    if (!isAdmin && userProductorId !== id_productor) {
      throw new ForbiddenException('Solo puedes actualizar el estado de tus propios pedidos');
    }
    return this.service.updateOrderStatusForProductor(id_pedido, id_productor, estado, isAdmin);
  }

  @UseGuards(AuthGuard)
  @Patch('productor/:id_pedido/:id_productor/tracking')
  updateTracking(
    @Param('id_pedido') id_pedido: string,
    @Param('id_productor', ParseIntPipe) id_productor: number,
    @Body() { numero_rastreo }: { numero_rastreo: string },
    @Req() req: any,
  ) {
    const userProductorId = req.user?.id_productor;
    const isAdmin = req.user?.roles?.includes('admin') || req.user?.permisos?.includes('admin');
    if (!isAdmin && userProductorId !== id_productor) {
      throw new ForbiddenException('Solo puedes actualizar el tracking de tus propios pedidos');
    }
    return this.service.updateTrackingForProducer(id_pedido, id_productor, numero_rastreo);
  }

  @UseGuards(AuthGuard)
  @Post('validar-envio')
  validarEnvio(@Body() dto: ValidarEnvioDto) {
    return this.service.validarEnvio(dto);
  }

  @UseGuards(AuthGuard)
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
  @UseGuards(AuthGuard)
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
