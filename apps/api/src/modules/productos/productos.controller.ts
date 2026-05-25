import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
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

const UPLOADS_DIR = join(process.cwd(), 'uploads', 'productos');
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
  ) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    return this.service.findAll(
      token,
      idProductor ? Number(idProductor) : undefined,
      { busqueda, tipoMezcal, maguey, precioMin, precioMax, destilacion, molienda, maestroMezcalero },
    );
  }

  @Get('sin-lote/check')
  findSinLote() {
    return this.service.findSinLote();
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
    @Body() dto: CreateProductoDto
  ) {
    if (file) {
      const imageUrl = `/uploads/productos/${file.filename}`;
      dto.imagen_url = imageUrl;
      dto.imagen_principal_url = imageUrl;
    }
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('productor', 'administrador')
  @UseInterceptors(FileInterceptor('imagen', { storage: productosStorage }))
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UpdateProductoDto
  ) {
    if (file) {
      const imageUrl = `/uploads/productos/${file.filename}`;
      dto.imagen_url = imageUrl;
      dto.imagen_principal_url = imageUrl;
    }
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('productor', 'administrador')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
