import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto';
import {
  CreateResenaDto,
  ModerarResenaDto,
  ResponderResenaDto,
  UpdateResenaDto,
} from './dto/resenas.dto';
import { ResenasService } from './resenas.service';
import { AuthGuard } from '../auth/guards/auth.guard';

function hasRole(user: any, ...roles: string[]): boolean {
  const wanted = roles.map((r) => r.toLowerCase());
  return (user?.roles ?? []).some((r: string) => wanted.includes(r.toLowerCase()));
}

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
  @UseGuards(AuthGuard)
  create(@Body() dto: CreateResenaDto, @Req() req: any) {
    // Anclar la reseña al usuario del token; el id_usuario del body se ignora
    // para evitar suplantación.
    return this.service.create({ ...dto, id_usuario: req.user.id_usuario });
  }

  @Patch(':id/moderar')
  @UseGuards(AuthGuard)
  moderar(@Param('id') id: string, @Body() dto: ModerarResenaDto, @Req() req: any) {
    if (!hasRole(req.user, 'administrador')) {
      throw new ForbiddenException('Solo administradores pueden moderar reseñas');
    }
    return this.service.moderar(id, dto);
  }

  @Patch(':id/responder')
  @UseGuards(AuthGuard)
  responder(@Param('id') id: string, @Body() dto: ResponderResenaDto, @Req() req: any) {
    if (!hasRole(req.user, 'administrador', 'productor')) {
      throw new ForbiddenException('Solo el vendedor o un administrador puede responder reseñas');
    }
    return this.service.responder(id, dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateResenaDto, @Req() req: any) {
    return this.service.update(id, dto, {
      id_usuario: req.user.id_usuario,
      isAdmin: hasRole(req.user, 'administrador'),
    });
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, {
      id_usuario: req.user.id_usuario,
      isAdmin: hasRole(req.user, 'administrador'),
    });
  }
}