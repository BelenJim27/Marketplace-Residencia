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
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto';
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

  // ─── Rutas específicas primero (deben ir ANTES que :id genérico) ───────────

  @Get()
  findAll(@Query() query: PaginacionQueryDto) {
    return this.service.findAll(query);
  }

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

  @Get('producto/:id/agregado')
  getAgregado(@Param('id') id: string) {
    return this.service.getAgregadoByProducto(id);
  }

  @Get('producto/:id/similares')
  getSimilares(
    @Param('id') id: string,
    @Query('limite') limite?: string,
  ) {
    return this.service.getSimilares(id, limite ? Number(limite) : 6);
  }

  @Get('producto/:id/tambien-compraron')
  getTambienCompraron(
    @Param('id') id: string,
    @Query('limite') limite?: string,
  ) {
    return this.service.getTambienCompraron(id, limite ? Number(limite) : 6);
  }

  // ─── Rutas genéricas con :id al final ────────────────────────────────────

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateResenaDto) {
    return this.service.create(dto);
  }

  @Patch(':id/moderar')
  moderar(@Param('id') id: string, @Body() dto: ModerarResenaDto) {
    return this.service.moderar(id, dto);
  }

  @Patch(':id/responder')
  responder(@Param('id') id: string, @Body() dto: ResponderResenaDto) {
    return this.service.responder(id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateResenaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}