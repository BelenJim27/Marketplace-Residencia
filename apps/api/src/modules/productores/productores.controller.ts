import { Body, Controller, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CreateProductorDto, CreateRegionDto, UpdateProductorDto, UpdateRegionDto } from './dto/productores.dto';
import { ProductoresService } from './productores.service';

@Controller('productores')
export class ProductoresController {
  constructor(private readonly service: ProductoresService) {}
  @Get('regiones') listRegiones() { return this.service.listRegiones(); }
  @Post('regiones') createRegion(@Body() dto: CreateRegionDto) { return this.service.createRegion(dto); }
  @Patch('regiones/:id') updateRegion(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRegionDto) { return this.service.updateRegion(id, dto); }
  @Delete('regiones/:id') removeRegion(@Param('id', ParseIntPipe) id: number) { return this.service.removeRegion(id); }
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateProductorDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductorDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
