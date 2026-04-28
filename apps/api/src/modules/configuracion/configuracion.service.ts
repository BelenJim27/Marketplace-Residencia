import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts } from '../shared/serialize';
import { CreateConfiguracionSistemaDto, CreateTasaImpuestoDto, UpdateConfiguracionSistemaDto, UpdateTasaImpuestoDto } from './dto/configuracion.dto';
import * as bcrypt from 'bcrypt';

const { Client } = require('pg');

@Injectable()
export class ConfiguracionService {
  constructor(private readonly prisma: PrismaService) {}

  async listSistema() {
    const client = this.createPgClient();

    try {
      await client.connect();
      const result = await client.query(
        `
          SELECT id_config, clave, valor, tipo, descripcion, creado_en, actualizado_en
          FROM configuracion_sistema
          ORDER BY clave ASC
        `,
      );

      return result.rows;
    } finally {
      await client.end();
    }
  }
  async getSistema(id_config: number) { const item = await this.prisma.configuracion_sistema.findUnique({ where: { id_config } }); if (!item) throw new NotFoundException('Configuracion no encontrada'); return serializeBigInts(item); }
  async createSistema(dto: CreateConfiguracionSistemaDto) { return serializeBigInts(await this.prisma.configuracion_sistema.create({ data: { clave: dto.clave.trim(), valor: dto.valor ?? null, tipo: dto.tipo?.trim() ?? 'texto', descripcion: dto.descripcion ?? null } })); }
  async updateSistema(id_config: number, dto: UpdateConfiguracionSistemaDto) { return serializeBigInts(await this.prisma.configuracion_sistema.update({ where: { id_config }, data: { clave: dto.clave?.trim(), valor: dto.valor, tipo: dto.tipo?.trim(), descripcion: dto.descripcion } })); }
  async removeSistema(id_config: number) { await this.prisma.configuracion_sistema.delete({ where: { id_config } }); return { message: 'Configuracion eliminada' }; }

  async getConfigAsMap() {
    const configs = await this.listSistema();
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

  async seedBiocultural() {
    const bioculturalTokens = [
      { clave: 'bio_color_fondo', valor: '#faf8f4', tipo: 'color', descripcion: 'Fondo principal de la tienda' },
      { clave: 'bio_color_tarjeta', valor: '#f0ebe0', tipo: 'color', descripcion: 'Fondo de tarjetas de producto' },
      { clave: 'bio_color_titulo', valor: '#5c3d1e', tipo: 'color', descripcion: 'Color de títulos y nombres' },
      { clave: 'bio_color_precio', valor: '#8b6914', tipo: 'color', descripcion: 'Color de precios y acento dorado' },
      { clave: 'bio_color_boton', valor: '#5c3d1e', tipo: 'color', descripcion: 'Botón primario (Agregar al carrito)' },
      { clave: 'bio_color_boton2', valor: '#8b6914', tipo: 'color', descripcion: 'Botón secundario (Comprar ahora)' },
      { clave: 'bio_fuente_titulo', valor: 'Georgia, serif', tipo: 'texto', descripcion: 'Fuente de títulos de producto' },
    ];
    const results = [];
    for (const config of bioculturalTokens) {
      const result = await this.prisma.configuracion_sistema.upsert({
        where: { clave: config.clave },
        update: {},
        create: { clave: config.clave, valor: config.valor, tipo: config.tipo, descripcion: config.descripcion },
      });
      results.push(serializeBigInts(result));
    }
    return results;
  }

  async seedAll() {
    const results: Record<string, unknown> = {};

    const roles = [
      { nombre: 'admin' },
      { nombre: 'productor' },
      { nombre: 'cliente' },
    ];
    const createdRoles = await this.prisma.roles.createMany({ data: roles, skipDuplicates: true });
    results.roles = createdRoles;

    const permisos = [
      { nombre: 'gestionar_usuarios' },
      { nombre: 'gestionar_productos' },
      { nombre: 'gestionar_pedidos' },
      { nombre: 'gestionar_categorias' },
      { nombre: 'ver_reportes' },
    ];
    const createdPermisos = await this.prisma.permisos.createMany({ data: permisos, skipDuplicates: true });
    results.permisos = createdPermisos;

    const adminRole = await this.prisma.roles.findUnique({ where: { nombre: 'admin' } });
    const gestionarPermiso = await this.prisma.permisos.findUnique({ where: { nombre: 'gestionar_usuarios' } });
    if (adminRole && gestionarPermiso) {
      await this.prisma.rol_permiso.upsert({
        where: { id_rol_id_permiso: { id_rol: adminRole.id_rol, id_permiso: gestionarPermiso.id_permiso } },
        update: {},
        create: { id_rol: adminRole.id_rol, id_permiso: gestionarPermiso.id_permiso },
      });
    }

    const monedas = [
      { codigo: 'MXN', nombre: 'Peso Mexicano', simbolo: '$', activo: true },
      { codigo: 'USD', nombre: 'Dólar Americano', simbolo: 'US$', activo: true },
      { codigo: 'EUR', nombre: 'Euro', simbolo: '€', activo: true },
    ];
    const createdMonedas = await this.prisma.monedas.createMany({ data: monedas, skipDuplicates: true });
    results.monedas = createdMonedas;

    const regiones = [
      { nombre: 'Jalisco', estado_prov: 'Jalisco', pais_iso2: 'MX' },
      { nombre: 'Michoacán', estado_prov: 'Michoacán', pais_iso2: 'MX' },
      { nombre: 'Guanajuato', estado_prov: 'Guanajuato', pais_iso2: 'MX' },
      { nombre: 'Veracruz', estado_prov: 'Veracruz', pais_iso2: 'MX' },
      { nombre: 'Oaxaca', estado_prov: 'Oaxaca', pais_iso2: 'MX' },
    ];
    const createdRegiones = await this.prisma.regiones.createMany({ data: regiones, skipDuplicates: true });
    results.regiones = createdRegiones;

    const categorias = [
      { nombre: 'Frutas', slug: 'frutas', descripcion: 'Frutas frescas', tipo: 'general', orden: 1, activo: true },
      { nombre: 'Verduras', slug: 'verduras', descripcion: 'Verduras frescas', tipo: 'general', orden: 2, activo: true },
      { nombre: 'Lácteos', slug: 'lacteos', descripcion: 'Productos lácteos', tipo: 'general', orden: 3, activo: true },
      { nombre: 'Carnes', slug: 'carnes', descripcion: 'Carnes y embutidos', tipo: 'general', orden: 4, activo: true },
      { nombre: 'Miel', slug: 'miel', descripcion: 'Miel y derivados', tipo: 'general', orden: 5, activo: true },
      { nombre: 'Café', slug: 'cafe', descripcion: 'Café de specialty', tipo: 'general', orden: 6, activo: true },
      { nombre: ' Artesanias', slug: 'artesanias', descripcion: 'Artesanías locales', tipo: 'general', orden: 7, activo: true },
      { nombre: 'Bebidas', slug: 'bebidas', descripcion: 'Bebidas artesanales', tipo: 'general', orden: 8, activo: true },
    ];
    const createdCategorias = await this.prisma.categorias.createMany({ data: categorias, skipDuplicates: true });
    results.categorias = createdCategorias;

    const adminUser = await this.prisma.usuarios.create({
      data: {
        nombre: 'Admin',
        apellido_paterno: 'Sistema',
        email: 'admin@marketplace.local',
        password_hash: await bcrypt.hash('admin123', 10),
        idioma_preferido: 'es',
        moneda_preferida: 'MXN',
      },
    });
    results.admin_usuario = adminUser;

    if (adminRole) {
      await this.prisma.usuario_rol.create({
        data: { id_usuario: adminUser.id_usuario, id_rol: adminRole.id_rol },
      });
    }

    const vendedorUser = await this.prisma.usuarios.create({
      data: {
        nombre: 'Juan',
        apellido_paterno: 'Pérez',
        email: 'productor@marketplace.local',
        password_hash: await bcrypt.hash('productor123', 10),
        idioma_preferido: 'es',
        moneda_preferida: 'MXN',
      },
    });
    results.productor_usuario = vendedorUser;

    const vendedorRole = await this.prisma.roles.findUnique({ where: { nombre: 'productor' } });
    if (vendedorRole) {
      await this.prisma.usuario_rol.create({
        data: { id_usuario: vendedorUser.id_usuario, id_rol: vendedorRole.id_rol },
      });
    }

    const regionJalisco = await this.prisma.regiones.findFirst({ where: { nombre: 'Jalisco' } });
    const productor = await this.prisma.productores.create({
      data: {
        id_usuario: vendedorUser.id_usuario,
        id_region: regionJalisco?.id_region,
        biografia: 'Familia dedicada a la agricultura orgánica por más de 20 años',
      },
    });
    results.productor = productor;

    const tienda = await this.prisma.tiendas.create({
      data: {
        id_productor: productor.id_productor,
        nombre: 'Granja Orgánica El Campos',
        descripcion: 'Productos frescos directamente del campo',
        pais_operacion: 'MX',
        status: 'activa',
      },
    });
    results.tienda = tienda;

    const categoriasFrutas = await this.prisma.categorias.findFirst({ where: { slug: 'frutas' } });
    const categoriasVerduras = await this.prisma.categorias.findFirst({ where: { slug: 'verduras' } });

    const productos = [
      { id_tienda: tienda.id_tienda, nombre: 'Manzana Orgánica', descripcion: 'Manzanas rojas orgánicas de temporada', precio_base: 45.00, moneda_base: 'MXN', peso_kg: 1.0 },
      { id_tienda: tienda.id_tienda, nombre: 'Naranja Valencia', descripcion: 'Naranjas jugosas y dulces', precio_base: 35.00, moneda_base: 'MXN', peso_kg: 1.0 },
      { id_tienda: tienda.id_tienda, nombre: 'Plátano Macho', descripcion: 'Plátanos maduros perfectos', precio_base: 25.00, moneda_base: 'MXN', peso_kg: 1.0 },
      { id_tienda: tienda.id_tienda, nombre: 'Tomate Verde', descripcion: 'Tomates frescos para ensalada', precio_base: 30.00, moneda_base: 'MXN', peso_kg: 0.5 },
      { id_tienda: tienda.id_tienda, nombre: 'Lechuga Romana', descripcion: 'Lechuga fresca crujiente', precio_base: 20.00, moneda_base: 'MXN', peso_kg: 0.3 },
      { id_tienda: tienda.id_tienda, nombre: 'Zanahoria', descripcion: 'Zanahorias frescas y crujientes', precio_base: 18.00, moneda_base: 'MXN', peso_kg: 0.5 },
      { id_tienda: tienda.id_tienda, nombre: 'Jitomate Saladet', descripcion: 'Jitomate bola fresco', precio_base: 28.00, moneda_base: 'MXN', peso_kg: 0.5 },
      { id_tienda: tienda.id_tienda, nombre: 'Aguacate Hass', descripcion: 'Aguacates maduros listos', precio_base: 60.00, moneda_base: 'MXN', peso_kg: 0.4 },
    ];

    for (const prod of productos) {
      const created = await this.prisma.productos.create({ data: { ...prod, status: 'activo', creado_por: vendedorUser.id_usuario } });
      await this.prisma.inventario.create({ data: { id_producto: created.id_producto, stock: 100, stock_minimo: 10 } });
    }
    results.productos = productos.length;

    const buyerUser = await this.prisma.usuarios.create({
      data: {
        nombre: 'María',
        apellido_paterno: 'García',
        email: 'cliente@marketplace.local',
        password_hash: await bcrypt.hash('cliente123', 10),
        idioma_preferido: 'es',
        moneda_preferida: 'MXN',
      },
    });
    results.cliente_usuario = buyerUser;

    const buyerRole = await this.prisma.roles.findUnique({ where: { nombre: 'cliente' } });
    if (buyerRole) {
      await this.prisma.usuario_rol.create({
        data: { id_usuario: buyerUser.id_usuario, id_rol: buyerRole.id_rol },
      });
    }

    await this.seedDefaults();

    return results;
  }

  async listTasas() { return serializeBigInts(await this.prisma.tasas_impuesto.findMany({ include: { categorias: true, monedas: true } })); }
  async getTasa(id_tasa: number) { const item = await this.prisma.tasas_impuesto.findUnique({ where: { id_tasa }, include: { categorias: true, monedas: true } }); if (!item) throw new NotFoundException('Tasa no encontrada'); return serializeBigInts(item); }
  async createTasa(dto: CreateTasaImpuestoDto) { return serializeBigInts(await this.prisma.tasas_impuesto.create({ data: { pais_iso2: dto.pais_iso2.trim(), id_categoria: dto.id_categoria ?? null, tipo: dto.tipo.trim(), nombre: dto.nombre.trim(), tasa_porcentaje: dto.tasa_porcentaje ?? null, monto_fijo: dto.monto_fijo ?? null, moneda_monto_fijo: dto.moneda_monto_fijo ?? null, vigente_hasta: dto.vigente_hasta ? new Date(dto.vigente_hasta) : null, incluido_en_precio: dto.incluido_en_precio ?? false, activo: dto.activo ?? true } })); }
  async updateTasa(id_tasa: number, dto: UpdateTasaImpuestoDto) { return serializeBigInts(await this.prisma.tasas_impuesto.update({ where: { id_tasa }, data: { pais_iso2: dto.pais_iso2?.trim(), id_categoria: dto.id_categoria ?? undefined, tipo: dto.tipo?.trim(), nombre: dto.nombre?.trim(), tasa_porcentaje: dto.tasa_porcentaje, monto_fijo: dto.monto_fijo, moneda_monto_fijo: dto.moneda_monto_fijo, vigente_hasta: dto.vigente_hasta ? new Date(dto.vigente_hasta) : undefined, incluido_en_precio: dto.incluido_en_precio, activo: dto.activo } })); }
  async removeTasa(id_tasa: number) { await this.prisma.tasas_impuesto.delete({ where: { id_tasa } }); return { message: 'Tasa eliminada' }; }

  private createPgClient() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL no está configurada');
    }

    return new Client({ connectionString: process.env.DATABASE_URL }) as any;
  }
}
