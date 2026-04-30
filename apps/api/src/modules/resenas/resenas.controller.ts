import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CreateResenaDto,
  ModerarResenaDto,
  ResponderResenaDto,
  UpdateResenaDto,
} from './dto/resenas.dto';
import { ResenasService } from './resenas.service';

@Controller('resenas')
export class ResenasController {
  constructor(private readonly service: ResenasService) {}

  // ─── Existentes ────────────────────────────────────────────────────────────

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateResenaDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateResenaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // ─── Nuevos ────────────────────────────────────────────────────────────────

  /**
   * Reseñas de un producto con filtro por calificación y paginación
   * GET /resenas/producto/:id?calificacion=5&pagina=1&limite=10
   */
  @Get('producto/:id')
  findByProducto(
    @Param('id') id: string,
    @Query('calificacion') calificacion?: string,
    @Query('pagina') pagina?: string,
    @Query('limite') limite?: string,
  ) {
    return this.service.findByProducto(
      id,
      calificacion ? Number(calificacion) : undefined,
      pagina ? Number(pagina) : 1,
      limite ? Number(limite) : 10,
    );
  }

  /**
   * Promedio y distribución de calificaciones para un producto
   * GET /resenas/producto/:id/agregado
   */
  @Get('producto/:id/agregado')
  getAgregado(@Param('id') id: string) {
    return this.service.getAgregadoByProducto(id);
  }

  /**
   * Productos similares (misma categoría)
   * GET /resenas/producto/:id/similares?limite=6
   */
  @Get('producto/:id/similares')
  getSimilares(
    @Param('id') id: string,
    @Query('limite') limite?: string,
  ) {
    return this.service.getSimilares(id, limite ? Number(limite) : 6);
  }

  /**
   * Clientes también compraron
   * GET /resenas/producto/:id/tambien-compraron?limite=6
   */
  @Get('producto/:id/tambien-compraron')
  getTambienCompraron(
    @Param('id') id: string,
    @Query('limite') limite?: string,
  ) {
    return this.service.getTambienCompraron(id, limite ? Number(limite) : 6);
  }

  /**
   * Moderación admin: aprobar o rechazar una reseña
   * PATCH /resenas/:id/moderar
   */
  @Patch(':id/moderar')
  moderar(@Param('id') id: string, @Body() dto: ModerarResenaDto) {
    return this.service.moderar(id, dto);
  }

  /**
   * El vendedor responde una reseña
   * PATCH /resenas/:id/responder
   */
  @Patch(':id/responder')
  responder(@Param('id') id: string, @Body() dto: ResponderResenaDto) {
    return this.service.responder(id, dto);
  }
}