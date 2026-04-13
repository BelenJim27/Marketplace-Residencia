import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts } from '../shared/serialize';
import { CreateConfiguracionSistemaDto, CreateTasaImpuestoDto, UpdateConfiguracionSistemaDto, UpdateTasaImpuestoDto } from './dto/configuracion.dto';

@Injectable()
export class ConfiguracionService {
  constructor(private readonly prisma: PrismaService) {}

  async listSistema() { return serializeBigInts(await this.prisma.configuracion_sistema.findMany({ orderBy: { clave: 'asc' } })); }
  async getSistema(id_config: number) { const item = await this.prisma.configuracion_sistema.findUnique({ where: { id_config } }); if (!item) throw new NotFoundException('Configuracion no encontrada'); return serializeBigInts(item); }
  async createSistema(dto: CreateConfiguracionSistemaDto) { return serializeBigInts(await this.prisma.configuracion_sistema.create({ data: { clave: dto.clave.trim(), valor: dto.valor ?? null, tipo: dto.tipo?.trim() ?? 'texto', descripcion: dto.descripcion ?? null } })); }
  async updateSistema(id_config: number, dto: UpdateConfiguracionSistemaDto) { return serializeBigInts(await this.prisma.configuracion_sistema.update({ where: { id_config }, data: { clave: dto.clave?.trim(), valor: dto.valor, tipo: dto.tipo?.trim(), descripcion: dto.descripcion } })); }
  async removeSistema(id_config: number) { await this.prisma.configuracion_sistema.delete({ where: { id_config } }); return { message: 'Configuracion eliminada' }; }

  async getConfigAsMap() {
    const configs = await this.prisma.configuracion_sistema.findMany();
    const map: Record<string, string> = {};
    for (const config of configs) {
      if (config.valor) map[config.clave] = config.valor;
    }
    return map;
  }

  async upsertConfigs(configs: { clave: string; valor: string; tipo?: string }[]) {
    const results = [];
    for (const config of configs) {
      const result = await this.prisma.configuracion_sistema.upsert({
        where: { clave: config.clave },
        update: { valor: config.valor },
        create: { clave: config.clave, valor: config.valor, tipo: config.tipo ?? 'texto' },
      });
      results.push(serializeBigInts(result));
    }
    return results;
  }

  async seedDefaults() {
    const defaults = [
      { clave: 'color_primario', valor: '#3b82f6', tipo: 'color' },
      { clave: 'color_secundario', valor: '#8b5cf6', tipo: 'color' },
      { clave: 'color_acento', valor: '#10b981', tipo: 'color' },
      { clave: 'idioma_default', valor: 'es', tipo: 'texto' },
      { clave: 'nombre_app', valor: 'Marketplace Residencia', tipo: 'texto' },
    ];
    return this.upsertConfigs(defaults);
  }

  async listTasas() { return serializeBigInts(await this.prisma.tasas_impuesto.findMany({ include: { categorias: true, monedas: true } })); }
  async getTasa(id_tasa: number) { const item = await this.prisma.tasas_impuesto.findUnique({ where: { id_tasa }, include: { categorias: true, monedas: true } }); if (!item) throw new NotFoundException('Tasa no encontrada'); return serializeBigInts(item); }
  async createTasa(dto: CreateTasaImpuestoDto) { return serializeBigInts(await this.prisma.tasas_impuesto.create({ data: { pais_iso2: dto.pais_iso2.trim(), id_categoria: dto.id_categoria ?? null, tipo: dto.tipo.trim(), nombre: dto.nombre.trim(), tasa_porcentaje: dto.tasa_porcentaje ?? null, monto_fijo: dto.monto_fijo ?? null, moneda_monto_fijo: dto.moneda_monto_fijo ?? null, vigente_hasta: dto.vigente_hasta ? new Date(dto.vigente_hasta) : null, incluido_en_precio: dto.incluido_en_precio ?? false, activo: dto.activo ?? true } })); }
  async updateTasa(id_tasa: number, dto: UpdateTasaImpuestoDto) { return serializeBigInts(await this.prisma.tasas_impuesto.update({ where: { id_tasa }, data: { pais_iso2: dto.pais_iso2?.trim(), id_categoria: dto.id_categoria ?? undefined, tipo: dto.tipo?.trim(), nombre: dto.nombre?.trim(), tasa_porcentaje: dto.tasa_porcentaje, monto_fijo: dto.monto_fijo, moneda_monto_fijo: dto.moneda_monto_fijo, vigente_hasta: dto.vigente_hasta ? new Date(dto.vigente_hasta) : undefined, incluido_en_precio: dto.incluido_en_precio, activo: dto.activo } })); }
  async removeTasa(id_tasa: number) { await this.prisma.tasas_impuesto.delete({ where: { id_tasa } }); return { message: 'Tasa eliminada' }; }
}
