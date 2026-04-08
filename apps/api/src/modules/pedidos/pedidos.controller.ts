import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateDetallePedidoDto, CreateFacturaDto, CreatePedidoDto, UpdateDetallePedidoDto, UpdateFacturaDto, UpdatePedidoDto } from './dto/pedidos.dto';
import { PedidosService } from './pedidos.service';

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly service: PedidosService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get('estadisticas') getEstadisticas(@Query('id_productor') idProductor?: string, @Query('periodo') periodo?: string) {
    const parsed = Number(idProductor);
    if (!idProductor || Number.isNaN(parsed)) {
      throw new BadRequestException('id_productor es requerido');
    }

    return this.service.getEstadisticas(parsed, periodo || 'month');
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
