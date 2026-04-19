import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/guards/roles.decorator';

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
}