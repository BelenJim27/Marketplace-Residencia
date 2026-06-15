import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto';
import { CreateLoteAtributoDto, CreateLoteDto, UpdateLoteAtributoDto, UpdateLoteDto } from './dto/lotes.dto';
import { LotesService } from './lotes.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/guards/roles.decorator';

// Las lecturas (GET) son públicas; toda escritura requiere productor o administrador.
const WRITE_GUARDS = [AuthGuard, RolesGuard] as const;

@Controller('lotes')
export class LotesController {
  constructor(private readonly service: LotesService) {}

  @Get()
  findAll(@Query('id_productor') id_productor?: string, @Query() query?: PaginacionQueryDto) {
    return id_productor
      ? this.service.findByProductor(Number(id_productor))
      : this.service.findAll(query);
  }

  @Post('sincronizar')
  @UseGuards(...WRITE_GUARDS)
  @Roles('productor', 'administrador')
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
  @UseGuards(...WRITE_GUARDS)
  @Roles('productor', 'administrador')
  sincronizarTodos(@Body() body?: { id_productor?: number }) {
    return this.service.sincronizarTodos(body?.id_productor ? Number(body.id_productor) : undefined);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(...WRITE_GUARDS)
  @Roles('productor', 'administrador')
  create(@Body() dto: CreateLoteDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(...WRITE_GUARDS)
  @Roles('productor', 'administrador')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLoteDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(...WRITE_GUARDS)
  @Roles('productor', 'administrador')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Post(':id/stock')
  @UseGuards(...WRITE_GUARDS)
  @Roles('productor', 'administrador')
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
  @UseGuards(...WRITE_GUARDS)
  @Roles('productor', 'administrador')
  sincronizarProducto(@Param('id', ParseIntPipe) id: number) {
    return this.service.sincronizarProductoUnico(id);
  }

  @Post(':id/atributos')
  @UseGuards(...WRITE_GUARDS)
  @Roles('productor', 'administrador')
  addAtributo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateLoteAtributoDto,
  ) {
    return this.service.addAtributo({ ...dto, id_lote: id });
  }

  @Patch('atributos/:id_atributo')
  @UseGuards(...WRITE_GUARDS)
  @Roles('productor', 'administrador')
  updateAtributo(
    @Param('id_atributo') id_atributo: string,
    @Body() dto: UpdateLoteAtributoDto,
  ) {
    return this.service.updateAtributo(id_atributo, dto);
  }

  @Delete('atributos/:id_atributo')
  @UseGuards(...WRITE_GUARDS)
  @Roles('productor', 'administrador')
  removeAtributo(@Param('id_atributo') id_atributo: string) {
    return this.service.removeAtributo(id_atributo);
  }
}