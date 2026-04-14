import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import {
  CreateInventarioDto,
  CreateMovimientoInventarioDto,
  UpdateInventarioDto,
} from "./dto/inventario.dto";
import { InventarioService } from "./inventario.service";

@Controller("inventario")
export class InventarioController {
  constructor(private readonly service: InventarioService) {}

  @Get("movimientos") listMovimientos() {
    return this.service.listMovimientos();
  }
  @Post("movimientos") createMovimiento(
    @Body() dto: CreateMovimientoInventarioDto,
  ) {
    return this.service.createMovimiento(dto);
  }

  @Get() listInventario() {
    return this.service.listInventario();
  }
  @Get("producto/:id_producto") getByProducto(
    @Param("id_producto") id_producto: string,
  ) {
    return this.service.getByProducto(id_producto);
  }
  @Get(":id") getInventario(@Param("id") id: string) {
    return this.service.getInventario(id);
  }
  @Post() createInventario(@Body() dto: CreateInventarioDto) {
    return this.service.createInventario(dto);
  }
  @Patch(":id") updateInventario(
    @Param("id") id: string,
    @Body() dto: UpdateInventarioDto,
  ) {
    return this.service.updateInventario(id, dto);
  }
  @Delete(":id") removeInventario(@Param("id") id: string) {
    return this.service.removeInventario(id);
  }
}
