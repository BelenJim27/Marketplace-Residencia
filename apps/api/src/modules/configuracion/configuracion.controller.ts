import { Body, Controller, Delete, Get, InternalServerErrorException, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ConfiguracionService } from './configuracion.service';
import { CreateConfiguracionSistemaDto, CreateTasaImpuestoDto, UpdateConfiguracionSistemaDto, UpdateTasaImpuestoDto } from './dto/configuracion.dto';

@Controller('configuracion')
export class ConfiguracionController {
  constructor(private readonly service: ConfiguracionService) {}

  @Get('sistema')
  async listSistema() {
    try {
      return await this.service.listSistema();
    } catch (error: any) {
      console.error('Error en GET /configuracion/sistema:', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  @Get('sistema/mapa')
  async getMapa() {
    try {
      return await this.service.getConfigAsMap();
    } catch (error: any) {
      console.error('Error en GET /configuracion/sistema/mapa:', error);
      return { error: error.message };
    }
  }

  @Get('sistema/seed')
  async seedDefaults() {
    try {
      return await this.service.seedDefaults();
    } catch (error: any) {
      console.error('Error en GET /configuracion/sistema/seed:', error);
      return { error: error.message };
    }
  }

  @Get('sistema/seed-biocultural')
  async seedBiocultural() {
    try {
      return await this.service.seedBiocultural();
    } catch (error: any) {
      console.error('Error en GET /configuracion/sistema/seed-biocultural:', error);
      return { error: error.message };
    }
  }

  @Get('sistema/seed-all')
  async seedAll() {
    try {
      return await this.service.seedAll();
    } catch (error: any) {
      console.error('Error en GET /configuracion/sistema/seed-all:', error);
      return { error: error.message };
    }
  }

  @Get('sistema/:id')
  async getSistema(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.service.getSistema(id);
    } catch (error: any) {
      console.error(`Error en GET /configuracion/sistema/${id}:`, error);
      return { error: error.message };
    }
  }

  @Post('sistema')
  async createSistema(@Body() dto: CreateConfiguracionSistemaDto) {
    try {
      return await this.service.createSistema(dto);
    } catch (error: any) {
      console.error('Error en POST /configuracion/sistema:', error);
      return { error: error.message };
    }
  }

  @Post('sistema/bulk')
  async upsertBulk(@Body() configs: { clave: string; valor: string; tipo?: string }[]) {
    try {
      return await this.service.upsertConfigs(configs);
    } catch (error: any) {
      console.error('Error en POST /configuracion/sistema/bulk:', error);
      return { error: error.message };
    }
  }

  @Patch('sistema/:id')
  async updateSistema(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateConfiguracionSistemaDto) {
    try {
      return await this.service.updateSistema(id, dto);
    } catch (error: any) {
      console.error(`Error en PATCH /configuracion/sistema/${id}:`, error);
      return { error: error.message };
    }
  }

  @Delete('sistema/:id')
  async removeSistema(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.service.removeSistema(id);
    } catch (error: any) {
      console.error(`Error en DELETE /configuracion/sistema/${id}:`, error);
      return { error: error.message };
    }
  }

  @Get('tasas')
  async listTasas() {
    try {
      return await this.service.listTasas();
    } catch (error: any) {
      console.error('Error en GET /configuracion/tasas:', error);
      return { error: error.message };
    }
  }

  @Get('tasas/:id')
  async getTasa(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.service.getTasa(id);
    } catch (error: any) {
      console.error(`Error en GET /configuracion/tasas/${id}:`, error);
      return { error: error.message };
    }
  }

  @Post('tasas')
  async createTasa(@Body() dto: CreateTasaImpuestoDto) {
    try {
      return await this.service.createTasa(dto);
    } catch (error: any) {
      console.error('Error en POST /configuracion/tasas:', error);
      return { error: error.message };
    }
  }

  @Patch('tasas/:id')
  async updateTasa(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTasaImpuestoDto) {
    try {
      return await this.service.updateTasa(id, dto);
    } catch (error: any) {
      console.error(`Error en PATCH /configuracion/tasas/${id}:`, error);
      return { error: error.message };
    }
  }

  @Delete('tasas/:id')
  async removeTasa(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.service.removeTasa(id);
    } catch (error: any) {
      console.error(`Error en DELETE /configuracion/tasas/${id}:`, error);
      return { error: error.message };
    }
  }
}
