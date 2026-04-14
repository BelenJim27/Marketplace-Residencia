import { Controller, Delete, Get, Param, Post, Body } from '@nestjs/common';
import { WishlistService } from './wishlist.service';

@Controller('wishlist')
export class WishlistController {
  constructor(private readonly service: WishlistService) {}

  @Get()
  listByUsuario(@Body('id_usuario') id_usuario: string) {
    return this.service.listByUsuario(id_usuario);
  }

  @Get(':id_usuario')
  list(@Param('id_usuario') id_usuario: string) {
    return this.service.listByUsuario(id_usuario);
  }

  @Post()
  add(@Body() dto: { id_usuario: string; id_producto: string }) {
    return this.service.add(dto.id_usuario, dto.id_producto);
  }

  @Delete(':id_usuario/:id_producto')
  remove(
    @Param('id_usuario') id_usuario: string,
    @Param('id_producto') id_producto: string
  ) {
    return this.service.remove(id_usuario, id_producto);
  }

  @Delete('item/:id')
  removeById(@Param('id') id: string) {
    return this.service.removeById(id);
  }

  @Get('check/:id_usuario/:id_producto')
  check(
    @Param('id_usuario') id_usuario: string,
    @Param('id_producto') id_producto: string
  ) {
    return this.service.check(id_usuario, id_producto);
  }
}