import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync, unlinkSync } from 'fs';
import { randomBytes } from 'crypto';
import { CreateProductoDto, UpdateProductoDto } from './dto/productos.dto';
import { ProductosService } from './productos.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/guards/roles.decorator';

const UPLOADS_DIR = join(__dirname, '../../..', 'uploads', 'productos');
mkdirSync(UPLOADS_DIR, { recursive: true });

const productosStorage = diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;
    cb(null, name);
  },
});

@Controller('productos')
export class ProductosController {
  constructor(private readonly service: ProductosService) {}

  @Get()
  findAll(
    @Headers('authorization') authorization?: string,
    @Query('id_productor') idProductor?: string,
    @Query('busqueda') busqueda?: string,
    @Query('tipo_mezcal') tipoMezcal?: string,
    @Query('maguey') maguey?: string,
    @Query('precio_min') precioMin?: string,
    @Query('precio_max') precioMax?: string,
    @Query('destilacion') destilacion?: string,
    @Query('molienda') molienda?: string,
    @Query('maestro_mezcalero') maestroMezcalero?: string,
    @Query('limit') limit?: string,
  ) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    return this.service.findAll(
      token,
      idProductor ? Number(idProductor) : undefined,
      { busqueda, tipoMezcal, maguey, precioMin, precioMax, destilacion, molienda, maestroMezcalero },
      limit ? Number(limit) : 200,
    );
  }

  @Get('sin-lote/check')
  findSinLote() {
    return this.service.findSinLote();
  }

  @Post('sin-lote/assign-matching')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  assignLotesMatching() {
    return this.service.assignLotesMatching();
  }

  // Alertas de stock del productor autenticado (calculadas en el backend).
  // Debe ir antes de @Get(':id') para que la ruta dinámica no la capture.
  @Get('alertas-stock')
  @UseGuards(AuthGuard)
  getAlertasStock(@Headers('authorization') authorization?: string) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    return this.service.getAlertasStock(token);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('productor', 'administrador')
  @UseInterceptors(FileInterceptor('imagen', { storage: productosStorage }))
  async create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateProductoDto,
    @Req() req: Request,
  ) {
    if (file) {
      const imageUrl = `/uploads/productos/${file.filename}`;
      dto.imagen_url = imageUrl;
      dto.imagen_principal_url = imageUrl;
    }
    return this.service.create(dto, (req as any).user);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('productor', 'administrador')
  @UseInterceptors(FileInterceptor('imagen', { storage: productosStorage }))
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UpdateProductoDto,
    @Req() req: Request,
  ) {
    if (file) {
      const imageUrl = `/uploads/productos/${file.filename}`;
      dto.imagen_url = imageUrl;
      dto.imagen_principal_url = imageUrl;
    }
    return this.service.update(id, dto, (req as any).user);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('productor', 'administrador')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.service.remove(id, (req as any).user);
  }
}
