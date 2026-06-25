import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CreateCarritoItemDto, UpdateCarritoItemDto } from './dto/carrito.dto';
import { CarritoService } from './carrito.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermisosGuard } from '../auth/guards/rbac.guard';
import { RequireAnyPermission } from '../auth/guards/permisos.decorator';
import { PERMISOS } from '../../common/permisos-catalog';

@Controller('carrito')
export class CarritoController {
  constructor(private readonly service: CarritoService) {}

  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_PEDIDOS)
  @Get()
  findAll() {
    return this.service.findAll();
  }

  // Must be before /:id_usuario to avoid NestJS routing it as a param
  @UseGuards(AuthGuard)
  @Get('validar-stock')
  validarStock(@Req() req: any) {
    return this.service.validarStock(req.user.id_usuario);
  }

  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.AGREGAR_CARRITO, PERMISOS.GESTIONAR_PEDIDOS)
  @Get(':id_usuario')
  findByUser(@Param('id_usuario', ParseUUIDPipe) id_usuario: string, @Req() req: any) {
    if (!isAdmin(req.user) && req.user.id_usuario !== id_usuario) {
      throw new ForbiddenException('No puedes ver el carrito de otro usuario');
    }
    return this.service.findByUser(id_usuario);
  }

  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.AGREGAR_CARRITO, PERMISOS.GESTIONAR_PEDIDOS)
  @Post()
  create(@Body() dto: CreateCarritoItemDto, @Req() req: any) {
    // Anclar al usuario del token: un no-admin siempre escribe en su propio
    // carrito (cierra BOLA y corrige desajustes cuando la cookie de cliente está
    // desfasada). Un admin sin id_usuario explícito usa el suyo.
    if (!isAdmin(req.user) || !dto.id_usuario) {
      dto.id_usuario = req.user.id_usuario;
    }
    return this.service.create(dto);
  }

  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.AGREGAR_CARRITO, PERMISOS.GESTIONAR_PEDIDOS)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCarritoItemDto) {
    return this.service.update(id, dto);
  }

  // Vacía el carrito del usuario autenticado (derivado del token). El cliente no
  // envía ningún id, evitando desajustes con la cookie `usuario`.
  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.AGREGAR_CARRITO, PERMISOS.GESTIONAR_PEDIDOS)
  @Delete('mi-carrito')
  clearMine(@Req() req: any) {
    return this.service.clearByUser(req.user.id_usuario);
  }

  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.AGREGAR_CARRITO, PERMISOS.GESTIONAR_PEDIDOS)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // Solo admin: vaciar el carrito de un usuario arbitrario. Los no-admin usan
  // `DELETE /carrito/mi-carrito` (clearMine).
  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.AGREGAR_CARRITO, PERMISOS.GESTIONAR_PEDIDOS)
  @Delete('usuario/:id_usuario')
  clearByUser(@Param('id_usuario', ParseUUIDPipe) id_usuario: string, @Req() req: any) {
    if (!isAdmin(req.user) && req.user.id_usuario !== id_usuario) {
      throw new ForbiddenException('No puedes vaciar el carrito de otro usuario');
    }
    return this.service.clearByUser(id_usuario);
  }
}

function isAdmin(user: any): boolean {
  return user?.permisos?.includes(PERMISOS.GESTIONAR_PEDIDOS) ?? false;
}
