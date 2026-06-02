import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Headers, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CreateDetallePedidoDto, CreateFacturaDto, CreatePedidoDto, UpdateDetallePedidoDto, UpdateFacturaDto, UpdatePedidoDto, ValidarEnvioDto } from './dto/pedidos.dto';
import { PedidosService } from './pedidos.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly service: PedidosService) {}
  @UseGuards(AuthGuard)
  @Get() findAll() { return this.service.findAll(); }
  @Get('mis-ventas') getMisVentas(@Headers('authorization') authorization?: string) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
    if (!token) {
      throw new BadRequestException('Token requerido');
    }

    return this.service.getMisVentas(token);
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

  @Get('estadisticas') getEstadisticas(@Headers('authorization') authorization?: string, @Query('id_productor') idProductor?: string, @Query('periodo') periodo?: string) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    const parsed = idProductor ? Number(idProductor) : undefined;

    if (!token && (parsed == null || Number.isNaN(parsed))) {
      throw new BadRequestException('id_productor es requerido');
    }

    return this.service.getEstadisticas(periodo || 'month', token, parsed);
  }

  @UseGuards(AuthGuard)
  @Get('productor/:id_productor')
  getOrdersByProductor(@Param('id_productor', ParseIntPipe) id_productor: number) {
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
    return this.service.updateOrderStatusForProductor(id_pedido, id_productor, estado);
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
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @UseGuards(AuthGuard)
  @Post() create(@Body() dto: CreatePedidoDto) { return this.service.create(dto); }
  @UseGuards(AuthGuard)
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdatePedidoDto) { return this.service.update(id, dto); }
  @UseGuards(AuthGuard)
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
  @UseGuards(AuthGuard)
  @Post(':id/detalles') addDetalle(@Param('id') id: string, @Body() dto: CreateDetallePedidoDto) { return this.service.addDetalle(id, dto); }
  @UseGuards(AuthGuard)
  @Patch('detalles/:id_detalle') updateDetalle(@Param('id_detalle') id_detalle: string, @Body() dto: UpdateDetallePedidoDto) { return this.service.updateDetalle(id_detalle, dto); }
  @UseGuards(AuthGuard)
  @Delete('detalles/:id_detalle') removeDetalle(@Param('id_detalle') id_detalle: string) { return this.service.removeDetalle(id_detalle); }
  @UseGuards(AuthGuard)
  @Post(':id/facturas') addFactura(@Param('id') id: string, @Body() dto: CreateFacturaDto) { return this.service.addFactura(id, dto); }
  @UseGuards(AuthGuard)
  @Patch('facturas/:id_factura') updateFactura(@Param('id_factura') id_factura: string, @Body() dto: UpdateFacturaDto) { return this.service.updateFactura(id_factura, dto); }
  @UseGuards(AuthGuard)
  @Delete('facturas/:id_factura') removeFactura(@Param('id_factura') id_factura: string) { return this.service.removeFactura(id_factura); }
}
