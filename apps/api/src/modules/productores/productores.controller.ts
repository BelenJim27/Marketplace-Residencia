import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { CreateProductorDto, CreateRegionDto, RevisarSolicitudDto, SolicitarProductorDto, UpdateProductorDto, UpdateRegionDto } from './dto/productores.dto';
import { ProductoresService } from './productores.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('productores')
export class ProductoresController {
  constructor(private readonly service: ProductoresService) {}
  @Get('regiones') listRegiones() { return this.service.listRegiones(); }
  @Get('by-usuario/:id_usuario') findByUsuario(@Param('id_usuario', ParseUUIDPipe) id_usuario: string) { return this.service.findByUsuario(id_usuario); }
  @Post('regiones') createRegion(@Body() dto: CreateRegionDto) { return this.service.createRegion(dto); }
  @Patch('regiones/:id') updateRegion(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRegionDto) { return this.service.updateRegion(id, dto); }
  @Delete('regiones/:id') removeRegion(@Param('id', ParseIntPipe) id: number) { return this.service.removeRegion(id); }
  
  @Post('solicitar')
  @UseGuards(AuthGuard)
  async solicitar(@Body() dto: SolicitarProductorDto, @Req() req: any) {
    try {
      return await this.service.solicitarProductor(dto, req.user.id_usuario);
    } catch (error) {
      console.error('ERROR EN API PRODUCTORES:', {
        route: '/productores/solicitar',
        error,
      });
      throw new HttpException({ error: String(error) }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  async findAll() {
    try {
      return await this.service.findAll();
    } catch (error) {
      console.error('ERROR EN API PRODUCTORES:', {
        route: '/productores',
        error,
      });
      throw new HttpException({ error: String(error) }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.service.findOne(id);
    } catch (error) {
      console.error('ERROR EN API PRODUCTORES:', {
        route: '/productores/:id',
        id,
        error,
      });
      throw new HttpException({ error: String(error) }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  @Post() create(@Body() dto: CreateProductorDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductorDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
