import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { randomBytes } from 'crypto';
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto';
import { ActualizarPerfilProductorDto, AdminUpdateProductorDto, CreateProductorDto, CreateRegionDto, RevisarSolicitudDto, SolicitarProductorDto, UpdateProductorDto, UpdateRegionDto } from './dto/productores.dto';
import { ProductoresService } from './productores.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/guards/roles.decorator';

const FOTOS_DIR = join(__dirname, '../../..', 'uploads', 'productores');
mkdirSync(FOTOS_DIR, { recursive: true });

const fotosStorage = diskStorage({
  destination: (_req, _file, cb) => cb(null, FOTOS_DIR),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`);
  },
});

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

  @Post('regiones')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  createRegion(@Body() dto: CreateRegionDto) { return this.service.createRegion(dto); }
  @Patch('regiones/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  updateRegion(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRegionDto) { return this.service.updateRegion(id, dto); }
  @Delete('regiones/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  removeRegion(@Param('id', ParseIntPipe) id: number) { return this.service.removeRegion(id); }
  
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
    if (!isAdmin) {
      const actualId = req.user.id_productor ??
        ((await this.service.findByUsuario(req.user.id_usuario)) as any)?.id_productor;
      if (actualId !== id) throw new HttpException('Solo puedes editar tu propio perfil de productor', HttpStatus.FORBIDDEN);
    }
    return this.service.update(id, dto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/admin')
  @UseInterceptors(FileInterceptor('foto', { storage: fotosStorage, limits: { fileSize: 500 * 1024 } }))
  async adminUpdate(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: AdminUpdateProductorDto,
    @Req() req: any,
  ) {
    if (!req.user.roles?.some((r: string) => r.toLowerCase() === 'administrador')) {
      throw new HttpException('Solo administradores pueden editar productores', HttpStatus.FORBIDDEN);
    }
    return this.service.adminUpdate(id, dto, file?.filename);
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
