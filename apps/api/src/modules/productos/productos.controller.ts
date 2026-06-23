import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, Req, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { CreateProductoDto, UpdateProductoDto } from './dto/productos.dto';
import { ProductosService } from './productos.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { productImageOptions } from '../../common/config/multer.config';
import {
  buildLocalUploadUrl,
  deleteUploadedFile,
  deleteUploadedFiles,
  validateUploadedFileContent,
} from '../../common/utilities/local-upload';

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
    @Query('categorias') categorias?: string,
    @Query('limit') limit?: string,
  ) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    return this.service.findAll(
      token,
      idProductor ? Number(idProductor) : undefined,
      { busqueda, tipoMezcal, maguey, precioMin, precioMax, destilacion, molienda, maestroMezcalero, categorias },
      limit ? Number(limit) : 200,
    );
  }

  @Get('sin-lote/check')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
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
  @UseInterceptors(FileInterceptor('imagen', productImageOptions))
  async create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateProductoDto,
    @Req() req: Request,
  ) {
    try {
      if (file) {
        await validateUploadedFileContent(file);
        const imageUrl = buildLocalUploadUrl('productos', file.filename);
        dto.imagen_url = imageUrl;
        dto.imagen_principal_url = imageUrl;
      }
      return await this.service.create(dto, (req as any).user);
    } catch (error) {
      await deleteUploadedFile(file);
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('productor', 'administrador')
  @UseInterceptors(FileInterceptor('imagen', productImageOptions))
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UpdateProductoDto,
    @Req() req: Request,
  ) {
    try {
      if (file) {
        await validateUploadedFileContent(file);
        const imageUrl = buildLocalUploadUrl('productos', file.filename);
        dto.imagen_url = imageUrl;
        dto.imagen_principal_url = imageUrl;
      }
      return await this.service.update(id, dto, (req as any).user);
    } catch (error) {
      await deleteUploadedFile(file);
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('productor', 'administrador')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.service.remove(id, (req as any).user);
  }

  @Post(':id/imagenes')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('productor', 'administrador')
  @UseInterceptors(FilesInterceptor('imagenes', 10, productImageOptions))
  async addImagenes(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    const uploadedFiles = files ?? [];
    try {
      await Promise.all(uploadedFiles.map(validateUploadedFileContent));
      return await this.service.addImagenes(id, uploadedFiles, (req as any).user);
    } catch (error) {
      await deleteUploadedFiles(uploadedFiles);
      throw error;
    }
  }

  @Delete(':id/imagenes/:id_imagen')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('productor', 'administrador')
  removeImagen(
    @Param('id') id: string,
    @Param('id_imagen') id_imagen: string,
    @Req() req: Request,
  ) {
    return this.service.removeImagen(id, id_imagen, (req as any).user);
  }
}
