import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { uploadToCloudinary } from '../shared/cloudinary';
import { CreateProductoDto, UpdateProductoDto } from './dto/productos.dto';
import { ProductosService } from './productos.service';

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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseInterceptors(FileInterceptor('imagen', { storage: memoryStorage() }))
  async create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateProductoDto
  ) {
    if (file) {
      const imageUrl = await uploadToCloudinary(file.buffer, 'productos');
      dto.imagen_url = imageUrl;
      dto.imagen_principal_url = imageUrl;
    }
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('imagen', { storage: memoryStorage() }))
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UpdateProductoDto
  ) {
    if (file) {
      const imageUrl = await uploadToCloudinary(file.buffer, 'productos');
      dto.imagen_url = imageUrl;
      dto.imagen_principal_url = imageUrl;
    }
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
