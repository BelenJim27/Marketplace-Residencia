import { Body, Controller, Delete, Get, InternalServerErrorException, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { WishlistService } from './wishlist.service';

@Controller('wishlist')
export class WishlistController {
  constructor(private readonly service: WishlistService) {}

  @Get()
  async listByUsuario(@Body('id_usuario') id_usuario: string) {
    try {
      return await this.service.listByUsuario(id_usuario);
    } catch (error: any) {
      console.error('Error en GET /wishlist:', error);
      return { error: error.message };
    }
  }

  @Get(':id_usuario')
  async list(@Param('id_usuario', ParseUUIDPipe) id_usuario: string) {
    try {
      return await this.service.listByUsuario(id_usuario);
    } catch (error: any) {
      console.error(`Error en GET /wishlist/${id_usuario}:`, error);
      throw new InternalServerErrorException(error.message);
    }
  }

  @Post()
  async add(@Body() dto: { id_usuario: string; id_producto: string }) {
    try {
      return await this.service.add(dto.id_usuario, dto.id_producto);
    } catch (error: any) {
      console.error('Error en POST /wishlist:', error);
      return { error: error.message };
    }
  }

  @Delete(':id_usuario/:id_producto')
  async remove(
    @Param('id_usuario', ParseUUIDPipe) id_usuario: string,
    @Param('id_producto') id_producto: string
  ) {
    try {
      return await this.service.remove(id_usuario, id_producto);
    } catch (error: any) {
      console.error(`Error en DELETE /wishlist/${id_usuario}/${id_producto}:`, error);
      return { error: error.message };
    }
  }

  @Delete('item/:id')
  async removeById(@Param('id') id: string) {
    try {
      return await this.service.removeById(id);
    } catch (error: any) {
      console.error(`Error en DELETE /wishlist/item/${id}:`, error);
      return { error: error.message };
    }
  }

  @Get('check/:id_usuario/:id_producto')
  async check(
    @Param('id_usuario', ParseUUIDPipe) id_usuario: string,
    @Param('id_producto') id_producto: string
  ) {
    try {
      return await this.service.check(id_usuario, id_producto);
    } catch (error: any) {
      console.error(`Error en GET /wishlist/check/${id_usuario}/${id_producto}:`, error);
      return { error: error.message };
    }
  }
}
