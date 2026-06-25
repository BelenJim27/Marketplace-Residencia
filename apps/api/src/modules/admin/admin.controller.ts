import { Body, Controller, Get, HttpException, HttpStatus, Logger, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermisosGuard } from '../auth/guards/rbac.guard';
import { RequireAnyPermission } from '../auth/guards/permisos.decorator';
import { PERMISOS } from '../../common/permisos-catalog';
import { RevisarSolicitudDto } from '../productores/dto/productores.dto';

@Controller('admin')
@UseGuards(AuthGuard, PermisosGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @RequireAnyPermission(PERMISOS.VER_REPORTES)
  getStats() {
    return this.adminService.getStats();
  }

  @Get('pedidos/recientes')
  @RequireAnyPermission(PERMISOS.GESTIONAR_PEDIDOS, PERMISOS.VER_REPORTES)
  getRecentOrders() {
    return this.adminService.getRecentOrders();
  }

  @Get('productores/top')
  @RequireAnyPermission(PERMISOS.VER_REPORTES)
  getTopProductores() {
    return this.adminService.getTopProductores();
  }

  @Get('productores/solicitudes')
  @RequireAnyPermission(PERMISOS.GESTIONAR_PRODUCTORES)
  getSolicitudesPendientes() {
    return this.adminService.getSolicitudesPendientes();
  }

  @Get('productores')
  @RequireAnyPermission(PERMISOS.GESTIONAR_PRODUCTORES)
  getAllProductores(
    @Query('estado') estado?: string,
    @Query('asociacion') asociacion?: string,
    @Query('marca') marca?: string,
    @Query('id_categoria') id_categoria?: string,
  ) {
    return this.adminService.getAllProductores({
      estado: estado || undefined,
      asociacion: asociacion || undefined,
      marca: marca || undefined,
      id_categoria: id_categoria ? parseInt(id_categoria) : undefined,
    });
  }

  @Get('productos')
  @RequireAnyPermission(PERMISOS.GESTIONAR_PRODUCTOS)
  getAllProductos(@Query('id_productor') id_productor?: string) {
    return this.adminService.getAllProductos(id_productor ? parseInt(id_productor) : undefined);
  }

  @Patch('productores/:id/revisar')
  @RequireAnyPermission(PERMISOS.GESTIONAR_PRODUCTORES)
  async revisarSolicitud(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RevisarSolicitudDto,
    @Req() req: any,
  ) {
    try {
      return await this.adminService.revisarSolicitud(id, dto, req.user.id_usuario);
    } catch (error) {
      this.logger.error(`ERROR EN API ADMIN /admin/productores/${id}/revisar: ${(error as Error)?.message}`);
      throw new HttpException({ error: String(error) }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
