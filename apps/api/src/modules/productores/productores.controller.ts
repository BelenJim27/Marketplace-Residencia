import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards, Logger } from '@nestjs/common';
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto';
import { ActualizarPerfilProductorDto, CreateProductorDto, CreateRegionDto, RevisarSolicitudDto, SolicitarProductorDto, UpdateProductorDto, UpdateRegionDto } from './dto/productores.dto';
import { ProductoresService } from './productores.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('productores')
export class ProductoresController {
  private readonly logger = new Logger(ProductoresController.name);
  constructor(private readonly service: ProductoresService) {}
  @Get('regiones') listRegiones() { return this.service.listRegiones(); }
  @Get('by-usuario/:id_usuario') findByUsuario(@Param('id_usuario', ParseUUIDPipe) id_usuario: string) { return this.service.findByUsuario(id_usuario); }
  @Get('mi-solicitud')
  @UseGuards(AuthGuard)
  async getMiSolicitud(@Req() req: any) {
    try {
      return await this.service.getMiSolicitud(req.user.id_usuario);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('GET /productores/mi-solicitud', error);
      throw new HttpException({ error: String(error) }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('regiones') createRegion(@Body() dto: CreateRegionDto) { return this.service.createRegion(dto); }
  @Patch('regiones/:id') updateRegion(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRegionDto) { return this.service.updateRegion(id, dto); }
  @Delete('regiones/:id') removeRegion(@Param('id', ParseIntPipe) id: number) { return this.service.removeRegion(id); }
  
  @Post('solicitar')
  @UseGuards(AuthGuard)
  async solicitar(@Body() dto: SolicitarProductorDto, @Req() req: any) {
    try {
      return await this.service.solicitarProductor(dto, req.user.id_usuario);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('POST /productores/solicitar', error);
      throw new HttpException({ error: String(error) }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  async findAll(@Query() query: PaginacionQueryDto) {
    try {
      return await this.service.findAll(query);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('GET /productores', error);
      throw new HttpException({ error: String(error) }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.service.findOne(id);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`GET /productores/${id}`, error);
      throw new HttpException({ error: String(error) }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  @Patch('mi-perfil')
  @UseGuards(AuthGuard)
  async actualizarMiPerfil(@Body() dto: ActualizarPerfilProductorDto, @Req() req: any) {
    try {
      return await this.service.actualizarMiPerfil(dto, req.user.id_usuario);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('PATCH /productores/mi-perfil', error);
      throw new HttpException({ error: String(error) }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(AuthGuard)
  @Post()
  async create(@Body() dto: CreateProductorDto, @Req() req: any) {
    if (!req.user.roles?.some((r: string) => r.toLowerCase() === 'administrador')) {
      throw new HttpException('Solo administradores pueden crear productores directamente', HttpStatus.FORBIDDEN);
    }
    return this.service.create(dto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductorDto, @Req() req: any) {
    const isAdmin = req.user.roles?.some((r: string) => r.toLowerCase() === 'administrador');
    if (!isAdmin && req.user.id_productor !== id) {
      throw new HttpException('Solo puedes editar tu propio perfil de productor', HttpStatus.FORBIDDEN);
    }
    return this.service.update(id, dto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    if (!req.user.roles?.some((r: string) => r.toLowerCase() === 'administrador')) {
      throw new HttpException('Solo administradores pueden eliminar productores', HttpStatus.FORBIDDEN);
    }
    return this.service.remove(id);
  }
}
