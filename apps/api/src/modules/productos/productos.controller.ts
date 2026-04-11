import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, StorageEngine } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { CreateProductoDto, UpdateProductoDto } from './dto/productos.dto';
import { ProductosService } from './productos.service';

const uploadPath = join(process.cwd(), 'uploads', 'productos');

const productoImageStorage: StorageEngine = diskStorage({
  destination: (_request: Express.Request, _file: Express.Multer.File, callback: (error: Error | null, destination: string) => void) => {
    mkdirSync(uploadPath, { recursive: true });
    callback(null, uploadPath);
  },
  filename: (_request: Express.Request, file: Express.Multer.File, callback: (error: Error | null, filename: string) => void) => {
    const safeName = file.originalname
      .replace(extname(file.originalname), '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60);
    const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `${safeName || 'producto'}-${suffix}${extname(file.originalname).toLowerCase()}`);
  },
});

@Controller('productos')
export class ProductosController {
  constructor(private readonly service: ProductosService) {}
  @Get() findAll(@Query('id_productor') idProductor?: string) { return this.service.findAll(idProductor ? Number(idProductor) : undefined); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post()
  @UseInterceptors(FileInterceptor('imagen', { storage: productoImageStorage }))
  create(@UploadedFile() file: Express.Multer.File | undefined, @Body() dto: CreateProductoDto) {
    return this.service.create(attachUploadedImage(dto, file));
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('imagen', { storage: productoImageStorage }))
  update(@Param('id') id: string, @UploadedFile() file: Express.Multer.File | undefined, @Body() dto: UpdateProductoDto) {
    return this.service.update(id, attachUploadedImage(dto, file));
  }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}

function attachUploadedImage<T extends CreateProductoDto | UpdateProductoDto>(dto: T, file?: Express.Multer.File) {
  if (!file) return dto;

  const imageUrl = `/uploads/productos/${file.filename}`;
  return {
    ...dto,
    imagen_url: imageUrl,
    imagen_principal_url: imageUrl,
  };
}
