import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CreateDetallePedidoDto, CreateFacturaDto, CreatePedidoDto, UpdateDetallePedidoDto, UpdateFacturaDto, UpdatePedidoDto } from './dto/pedidos.dto';
import { PedidosService } from './pedidos.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly service: PedidosService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get('mis-ventas') getMisVentas(@Headers('authorization') authorization?: string) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
    if (!token) {
      throw new BadRequestException('Token requerido');
    }

    return this.service.getMisVentas(token);
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
  ) {
    return this.service.updateOrderStatusForProductor(id_pedido, id_productor, estado);
  }

  @UseGuards(AuthGuard)
  @Patch('productor/:id_pedido/:id_productor/tracking')
  updateTracking(
    @Param('id_pedido') id_pedido: string,
    @Param('id_productor', ParseIntPipe) id_productor: number,
    @Body() { numero_rastreo }: { numero_rastreo: string },
  ) {
    return this.service.updateTrackingForProducer(id_pedido, id_productor, numero_rastreo);
  }

  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreatePedidoDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdatePedidoDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
  @Post(':id/detalles') addDetalle(@Param('id') id: string, @Body() dto: CreateDetallePedidoDto) { return this.service.addDetalle(id, dto); }
  @Patch('detalles/:id_detalle') updateDetalle(@Param('id_detalle') id_detalle: string, @Body() dto: UpdateDetallePedidoDto) { return this.service.updateDetalle(id_detalle, dto); }
  @Delete('detalles/:id_detalle') removeDetalle(@Param('id_detalle') id_detalle: string) { return this.service.removeDetalle(id_detalle); }
  @Post(':id/facturas') addFactura(@Param('id') id: string, @Body() dto: CreateFacturaDto) { return this.service.addFactura(id, dto); }
  @Patch('facturas/:id_factura') updateFactura(@Param('id_factura') id_factura: string, @Body() dto: UpdateFacturaDto) { return this.service.updateFactura(id_factura, dto); }
  @Delete('facturas/:id_factura') removeFactura(@Param('id_factura') id_factura: string) { return this.service.removeFactura(id_factura); }
}
