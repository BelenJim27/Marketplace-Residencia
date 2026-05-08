import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CreateLoteAtributoDto, CreateLoteDto, UpdateLoteAtributoDto, UpdateLoteDto } from './dto/lotes.dto';
import { LotesService } from './lotes.service';

@Controller('lotes')
export class LotesController {
  constructor(private readonly service: LotesService) {}

  @Get()
  findAll(@Query('id_productor') id_productor?: string) {
    return id_productor
      ? this.service.findByProductor(Number(id_productor))
      : this.service.findAll();
  }

  //  Estos endpoints deben ir ANTES de :id
  @Post('sincronizar')
  sincronizar(
    @Body() body: { uuid_externo: string; id_productor: number; id_region?: number },
  ) {
    return this.service.sincronizarDesdeApi(
      body.uuid_externo,
      body.id_productor,
      body.id_region,
    );
  }

  @Post('sincronizar-todos')
  sincronizarTodos() {
    return this.service.sincronizarTodos();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateLoteDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLoteDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Post(':id/stock')
  ajustarStock(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      cantidad: number;
      tipo: 'entrada' | 'salida' | 'ajuste';
      motivo?: string;
      id_usuario?: string;
    },
  ) {
    return this.service.ajustarStock(
      id,
      body.cantidad,
      body.tipo,
      body.motivo ?? '',
      body.id_usuario,
    );
  }

  // Forzar re-sincronización de un lote específico con su producto
  @Post(':id/sincronizar-producto')
  sincronizarProducto(@Param('id', ParseIntPipe) id: number) {
    return this.service.sincronizarProductoUnico(id);
  }

  @Post(':id/atributos')
  addAtributo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateLoteAtributoDto,
  ) {
    return this.service.addAtributo({ ...dto, id_lote: id });
  }

  @Patch('atributos/:id_atributo')
  updateAtributo(
    @Param('id_atributo') id_atributo: string,
    @Body() dto: UpdateLoteAtributoDto,
  ) {
    return this.service.updateAtributo(id_atributo, dto);
  }

  @Delete('atributos/:id_atributo')
  removeAtributo(@Param('id_atributo') id_atributo: string) {
    return this.service.removeAtributo(id_atributo);
  }
}