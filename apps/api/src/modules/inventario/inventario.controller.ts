import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto';
import {
  CreateInventarioDto,
  CreateMovimientoInventarioDto,
  UpdateInventarioDto,
} from "./dto/inventario.dto";
import { InventarioService } from "./inventario.service";
import { AuthGuard } from "../auth/guards/auth.guard";
import { PermisosGuard } from "../auth/guards/rbac.guard";
import { RequireAnyPermission } from "../auth/guards/permisos.decorator";
import { PERMISOS } from "../../common/permisos-catalog";

// La escritura de inventario solo puede hacerla productor o administrador.
const WRITE_GUARDS = [AuthGuard, PermisosGuard] as const;

@Controller("inventario")
export class InventarioController {
  constructor(private readonly service: InventarioService) {}

  @UseGuards(...WRITE_GUARDS)
  @RequireAnyPermission(PERMISOS.VER_INVENTARIO, PERMISOS.GESTIONAR_INVENTARIO)
  @Get("movimientos") listMovimientos() {
    return this.service.listMovimientos();
  }
  @Post("movimientos")
  @UseGuards(...WRITE_GUARDS)
  @RequireAnyPermission(PERMISOS.CREAR_INVENTARIO, PERMISOS.GESTIONAR_INVENTARIO)
  createMovimiento(
    @Body() dto: CreateMovimientoInventarioDto,
  ) {
    return this.service.createMovimiento(dto);
  }

  @UseGuards(...WRITE_GUARDS)
  @RequireAnyPermission(PERMISOS.VER_INVENTARIO, PERMISOS.GESTIONAR_INVENTARIO)
  @Get("dashboard") getDashboard(@Query() query: PaginacionQueryDto) {
    return this.service.listInventario(query);
  }
  @UseGuards(...WRITE_GUARDS)
  @RequireAnyPermission(PERMISOS.VER_INVENTARIO, PERMISOS.GESTIONAR_INVENTARIO)
  @Get() listInventario(@Query() query: PaginacionQueryDto) {
    return this.service.listInventario(query);
  }
  @UseGuards(...WRITE_GUARDS)
  @RequireAnyPermission(PERMISOS.VER_INVENTARIO, PERMISOS.GESTIONAR_INVENTARIO)
  @Get("producto/:id_producto") getByProducto(
    @Param("id_producto") id_producto: string,
  ) {
    return this.service.getByProducto(id_producto);
  }
  @UseGuards(...WRITE_GUARDS)
  @RequireAnyPermission(PERMISOS.VER_INVENTARIO, PERMISOS.GESTIONAR_INVENTARIO)
  @Get(":id") getInventario(@Param("id") id: string) {
    return this.service.getInventario(id);
  }
  @Post()
  @UseGuards(...WRITE_GUARDS)
  @RequireAnyPermission(PERMISOS.CREAR_INVENTARIO, PERMISOS.GESTIONAR_INVENTARIO)
  createInventario(@Body() dto: CreateInventarioDto) {
    return this.service.createInventario(dto);
  }
  @Patch(":id")
  @UseGuards(...WRITE_GUARDS)
  @RequireAnyPermission(PERMISOS.EDITAR_INVENTARIO, PERMISOS.GESTIONAR_INVENTARIO)
  updateInventario(
    @Param("id") id: string,
    @Body() dto: UpdateInventarioDto,
  ) {
    return this.service.updateInventario(id, dto);
  }
  @Delete(":id")
  @UseGuards(...WRITE_GUARDS)
  @RequireAnyPermission(PERMISOS.EDITAR_INVENTARIO, PERMISOS.GESTIONAR_INVENTARIO)
  removeInventario(@Param("id") id: string) {
    return this.service.removeInventario(id);
  }
}
