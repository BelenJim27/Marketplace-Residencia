import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PERMISOS } from '../../common/permisos-catalog';

@Controller('wishlist')
export class WishlistController {
  private readonly logger = new Logger(WishlistController.name);

  constructor(private readonly service: WishlistService) {}

  @UseGuards(AuthGuard)
  @Get(':id_usuario')
  async list(
    @Param('id_usuario', ParseUUIDPipe) id_usuario: string,
    @Req() req: any,
  ) {
    const isAdmin = req.user.permisos?.includes(PERMISOS.GESTIONAR_USUARIOS);
    if (req.user.id_usuario !== id_usuario && !isAdmin) {
      throw new ForbiddenException('No tienes permiso para acceder a esta wishlist');
    }
    try {
      return await this.service.listByUsuario(id_usuario);
    } catch (error: any) {
      this.logger.error(`Error en GET /wishlist/${id_usuario}: ${error?.message ?? error}`);
      return [];
    }
  }

  @UseGuards(AuthGuard)
  @Post()
  async add(
    @Body() dto: { id_usuario: string; id_producto: string },
    @Req() req: any,
  ) {
    const isAdmin = req.user.permisos?.includes(PERMISOS.GESTIONAR_USUARIOS);
    if (req.user.id_usuario !== dto.id_usuario && !isAdmin) {
      throw new ForbiddenException('No tienes permiso para modificar esta wishlist');
    }
    try {
      return await this.service.add(dto.id_usuario, dto.id_producto);
    } catch (error: any) {
      this.logger.error(`Error en POST /wishlist: ${(error as Error)?.message}`);
      return { error: error.message };
    }
  }

  @UseGuards(AuthGuard)
  @Delete(':id_usuario/:id_producto')
  async remove(
    @Param('id_usuario', ParseUUIDPipe) id_usuario: string,
    @Param('id_producto') id_producto: string,
    @Req() req: any,
  ) {
    const isAdmin = req.user.permisos?.includes(PERMISOS.GESTIONAR_USUARIOS);
    if (req.user.id_usuario !== id_usuario && !isAdmin) {
      throw new ForbiddenException('No tienes permiso para modificar esta wishlist');
    }
    try {
      return await this.service.remove(id_usuario, id_producto);
    } catch (error: any) {
      this.logger.error(`Error en DELETE /wishlist/${id_usuario}/${id_producto}: ${(error as Error)?.message}`);
      return { error: error.message };
    }
  }

  @UseGuards(AuthGuard)
  @Delete('item/:id')
  async removeById(@Param('id') id: string, @Req() req: any) {
    try {
      return await this.service.removeById(
        id,
        req.user.id_usuario,
        req.user.permisos?.includes(PERMISOS.GESTIONAR_USUARIOS),
      );
    } catch (error: any) {
      this.logger.error(`Error en DELETE /wishlist/item/${id}: ${(error as Error)?.message}`);
      return { error: error.message };
    }
  }

  @UseGuards(AuthGuard)
  @Get('check/:id_usuario/:id_producto')
  async check(
    @Param('id_usuario', ParseUUIDPipe) id_usuario: string,
    @Param('id_producto') id_producto: string,
    @Req() req: any,
  ) {
    const isAdmin = req.user.permisos?.includes(PERMISOS.GESTIONAR_USUARIOS);
    if (req.user.id_usuario !== id_usuario && !isAdmin) {
      throw new ForbiddenException('No tienes permiso para acceder a esta wishlist');
    }
    try {
      return await this.service.check(id_usuario, id_producto);
    } catch (error: any) {
      this.logger.error(`Error en GET /wishlist/check/${id_usuario}/${id_producto}: ${(error as Error)?.message}`);
      return { error: error.message };
    }
  }
}
