import { Body, Controller, Get, HttpException, HttpStatus, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { RevisarSolicitudDto } from '../productores/dto/productores.dto';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN', 'administrador')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('pedidos/recientes')
  getRecentOrders() {
    return this.adminService.getRecentOrders();
  }

  @Get('productores/top')
  getTopProductores() {
    return this.adminService.getTopProductores();
  }

  @Get('productores/solicitudes')
  getSolicitudesPendientes() {
    return this.adminService.getSolicitudesPendientes();
  }

  @Get('productores')
  getAllProductores() {
    return this.adminService.getAllProductores();
  }

  @Patch('productores/:id/revisar')
  async revisarSolicitud(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RevisarSolicitudDto,
    @Req() req: any,
  ) {
    try {
      return await this.adminService.revisarSolicitud(id, dto, req.user.id_usuario);
    } catch (error) {
      console.error('ERROR EN API ADMIN:', {
        route: '/admin/productores/:id/revisar',
        id,
        error,
      });
      throw new HttpException({ error: String(error) }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}