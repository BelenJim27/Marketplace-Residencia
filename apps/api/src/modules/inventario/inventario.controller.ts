import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateAlmacenDto, CreateInventarioDto, CreateMovimientoInventarioDto, UpdateAlmacenDto, UpdateInventarioDto } from './dto/inventario.dto';
import { InventarioService } from './inventario.service';

@Controller('inventario')
export class InventarioController {
  constructor(private readonly service: InventarioService) {}
  @Get('almacenes') listAlmacenes() { return this.service.listAlmacenes(); }
  @Get('almacenes/:id') getAlmacen(@Param('id') id: string) { return this.service.getAlmacen(id); }
  @Post('almacenes') createAlmacen(@Body() dto: CreateAlmacenDto) { return this.service.createAlmacen(dto); }
  @Patch('almacenes/:id') updateAlmacen(@Param('id') id: string, @Body() dto: UpdateAlmacenDto) { return this.service.updateAlmacen(id, dto); }
  @Delete('almacenes/:id') removeAlmacen(@Param('id') id: string) { return this.service.removeAlmacen(id); }

  @Get('movimientos') listMovimientos() { return this.service.listMovimientos(); }
  @Post('movimientos') createMovimiento(@Body() dto: CreateMovimientoInventarioDto) { return this.service.createMovimiento(dto); }

  @Get() listInventario() { return this.service.listInventario(); }
  @Get(':id') getInventario(@Param('id') id: string) { return this.service.getInventario(id); }
  @Post() createInventario(@Body() dto: CreateInventarioDto) { return this.service.createInventario(dto); }
  @Patch(':id') updateInventario(@Param('id') id: string, @Body() dto: UpdateInventarioDto) { return this.service.updateInventario(id, dto); }
  @Delete(':id') removeInventario(@Param('id') id: string) { return this.service.removeInventario(id); }
}
