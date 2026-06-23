import { Body, Controller, Delete, Get, InternalServerErrorException, Logger, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ConfiguracionService } from './configuracion.service';
import { CreateConfiguracionSistemaDto, CreateTasaImpuestoDto, UpdateConfiguracionSistemaDto, UpdateTasaImpuestoDto } from './dto/configuracion.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('configuracion')
export class ConfiguracionController {
  private readonly logger = new Logger(ConfiguracionController.name);

  constructor(private readonly service: ConfiguracionService) {}

  @Get('asociaciones')
  async getAsociaciones() {
    try {
      return await this.service.getAsociaciones();
    } catch {
      return ['Maestras Mezcaleras', 'Maestras y Maestros Mezcaleros', 'Tierra Combates'];
    }
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  @Post('asociaciones')
  async setAsociaciones(@Body() body: { lista: string[] }) {
    try {
      return await this.service.setAsociaciones(body.lista ?? []);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  @Get('sistema')
  async listSistema() {
    try {
      return await this.service.listSistema();
    } catch (error: any) {
      this.logger.error(`Error en GET /configuracion/sistema: ${error?.message}`);
      throw new InternalServerErrorException(error.message);
    }
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  @Get('sistema/mapa')
  async getMapa() {
    try {
      return await this.service.getConfigAsMap();
    } catch (error: any) {
      this.logger.error(`Error en GET /configuracion/sistema/mapa: ${error?.message}`);
      return { error: error.message };
    }
  }

  @Get('publica/landing')
  getPublicLandingConfig() {
    return this.service.getPublicLandingConfig();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  @Get('sistema/seed')
  async seedDefaults() {
    try {
      return await this.service.seedDefaults();
    } catch (error: any) {
      this.logger.error(`Error en GET /configuracion/sistema/seed: ${error?.message}`);
      return { error: error.message };
    }
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  @Get('sistema/seed-biocultural')
  async seedBiocultural() {
    try {
      return await this.service.seedBiocultural();
    } catch (error: any) {
      this.logger.error(`Error en GET /configuracion/sistema/seed-biocultural: ${error?.message}`);
      return { error: error.message };
    }
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  @Get('sistema/seed-all')
  async seedAll() {
    try {
      return await this.service.seedAll();
    } catch (error: any) {
      this.logger.error(`Error en GET /configuracion/sistema/seed-all: ${error?.message}`);
      return { error: error.message };
    }
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  @Get('sistema/:id')
  async getSistema(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.service.getSistema(id);
    } catch (error: any) {
      this.logger.error(`Error en GET /configuracion/sistema/${id}: ${error?.message}`);
      return { error: error.message };
    }
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  @Post('sistema')
  async createSistema(@Body() dto: CreateConfiguracionSistemaDto) {
    try {
      return await this.service.createSistema(dto);
    } catch (error: any) {
      this.logger.error(`Error en POST /configuracion/sistema: ${error?.message}`);
      return { error: error.message };
    }
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  @Post('sistema/bulk')
  async upsertBulk(@Body() configs: { clave: string; valor: string; tipo?: string }[]) {
    try {
      return await this.service.upsertConfigs(configs);
    } catch (error: any) {
      this.logger.error(`Error en POST /configuracion/sistema/bulk: ${error?.message}`);
      return { error: error.message };
    }
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  @Patch('sistema/:id')
  async updateSistema(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateConfiguracionSistemaDto) {
    try {
      return await this.service.updateSistema(id, dto);
    } catch (error: any) {
      this.logger.error(`Error en PATCH /configuracion/sistema/${id}: ${error?.message}`);
      return { error: error.message };
    }
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  @Delete('sistema/:id')
  async removeSistema(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.service.removeSistema(id);
    } catch (error: any) {
      this.logger.error(`Error en DELETE /configuracion/sistema/${id}: ${error?.message}`);
      return { error: error.message };
    }
  }

  @Get('tasas')
  async listTasas() {
    try {
      return await this.service.listTasas();
    } catch (error: any) {
      this.logger.error(`Error en GET /configuracion/tasas: ${error?.message}`);
      return { error: error.message };
    }
  }

  @Get('tasas/:id')
  async getTasa(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.service.getTasa(id);
    } catch (error: any) {
      this.logger.error(`Error en GET /configuracion/tasas/${id}: ${error?.message}`);
      return { error: error.message };
    }
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  @Post('tasas')
  async createTasa(@Body() dto: CreateTasaImpuestoDto) {
    try {
      return await this.service.createTasa(dto);
    } catch (error: any) {
      this.logger.error(`Error en POST /configuracion/tasas: ${error?.message}`);
      return { error: error.message };
    }
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  @Patch('tasas/:id')
  async updateTasa(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTasaImpuestoDto) {
    try {
      return await this.service.updateTasa(id, dto);
    } catch (error: any) {
      this.logger.error(`Error en PATCH /configuracion/tasas/${id}: ${error?.message}`);
      return { error: error.message };
    }
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  @Delete('tasas/:id')
  async removeTasa(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.service.removeTasa(id);
    } catch (error: any) {
      this.logger.error(`Error en DELETE /configuracion/tasas/${id}: ${error?.message}`);
      return { error: error.message };
    }
  }
}
