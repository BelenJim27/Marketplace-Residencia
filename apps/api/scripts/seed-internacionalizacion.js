require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Monedas soportadas por el enum Moneda en schema.prisma: MXN, USD.
// Las monedas adicionales (EUR, GBP, etc.) serán añadidas cuando se expanda el enum.

const IDIOMAS = [
  { codigo: 'es',    nombre: 'Spanish',                  nombre_local: 'Español' },
  { codigo: 'en',    nombre: 'English',                  nombre_local: 'English' },
  { codigo: 'fr',    nombre: 'French',                   nombre_local: 'Français' },
  { codigo: 'pt',    nombre: 'Portuguese',               nombre_local: 'Português' },
  { codigo: 'de',    nombre: 'German',                   nombre_local: 'Deutsch' },
  { codigo: 'it',    nombre: 'Italian',                  nombre_local: 'Italiano' },
  { codigo: 'es-MX', nombre: 'Spanish (Mexico)',         nombre_local: 'Español (México)' },
  { codigo: 'es-ES', nombre: 'Spanish (Spain)',          nombre_local: 'Español (España)' },
  { codigo: 'en-US', nombre: 'English (United States)',  nombre_local: 'English (United States)' },
  { codigo: 'en-GB', nombre: 'English (United Kingdom)', nombre_local: 'English (United Kingdom)' },
  { codigo: 'pt-BR', nombre: 'Portuguese (Brazil)',      nombre_local: 'Português (Brasil)' },
];

// moneda_default usa el enum Moneda {MXN, USD}. Países con otras monedas usan 'USD'
// hasta que el enum se expanda en una migración futura.
const PAISES = [
  { iso2: 'MX', iso3: 'MEX', nombre: 'Mexico',         nombre_local: 'México',         moneda_default: 'MXN', idioma_default: 'es', prefijo_telefono: '+52', activo_venta: true,  activo_envio: true  },
  { iso2: 'US', iso3: 'USA', nombre: 'United States',  nombre_local: 'United States',  moneda_default: 'USD', idioma_default: 'en', prefijo_telefono: '+1',  activo_venta: false, activo_envio: false },
  { iso2: 'CA', iso3: 'CAN', nombre: 'Canada',         nombre_local: 'Canada',         moneda_default: 'USD', idioma_default: 'en', prefijo_telefono: '+1',  activo_venta: false, activo_envio: false },
  { iso2: 'ES', iso3: 'ESP', nombre: 'Spain',          nombre_local: 'España',         moneda_default: 'USD', idioma_default: 'es', prefijo_telefono: '+34', activo_venta: false, activo_envio: false },
  { iso2: 'FR', iso3: 'FRA', nombre: 'France',         nombre_local: 'France',         moneda_default: 'USD', idioma_default: 'fr', prefijo_telefono: '+33', activo_venta: false, activo_envio: false },
  { iso2: 'DE', iso3: 'DEU', nombre: 'Germany',        nombre_local: 'Deutschland',    moneda_default: 'USD', idioma_default: 'de', prefijo_telefono: '+49', activo_venta: false, activo_envio: false },
  { iso2: 'IT', iso3: 'ITA', nombre: 'Italy',          nombre_local: 'Italia',         moneda_default: 'USD', idioma_default: 'it', prefijo_telefono: '+39', activo_venta: false, activo_envio: false },
  { iso2: 'GB', iso3: 'GBR', nombre: 'United Kingdom', nombre_local: 'United Kingdom', moneda_default: 'USD', idioma_default: 'en', prefijo_telefono: '+44', activo_venta: false, activo_envio: false },
  { iso2: 'CO', iso3: 'COL', nombre: 'Colombia',       nombre_local: 'Colombia',       moneda_default: 'USD', idioma_default: 'es', prefijo_telefono: '+57', activo_venta: false, activo_envio: false },
  { iso2: 'CL', iso3: 'CHL', nombre: 'Chile',          nombre_local: 'Chile',          moneda_default: 'USD', idioma_default: 'es', prefijo_telefono: '+56', activo_venta: false, activo_envio: false },
  { iso2: 'AR', iso3: 'ARG', nombre: 'Argentina',      nombre_local: 'Argentina',      moneda_default: 'USD', idioma_default: 'es', prefijo_telefono: '+54', activo_venta: false, activo_envio: false },
  { iso2: 'BR', iso3: 'BRA', nombre: 'Brazil',         nombre_local: 'Brasil',         moneda_default: 'USD', idioma_default: 'pt', prefijo_telefono: '+55', activo_venta: false, activo_envio: false },
  { iso2: 'JP', iso3: 'JPN', nombre: 'Japan',          nombre_local: '日本',            moneda_default: 'USD', idioma_default: 'en', prefijo_telefono: '+81', activo_venta: false, activo_envio: false },
];

const COMISIONES_DEFAULT = [
  // Regla global: 15% si no hay regla más específica
  { alcance: 'global', porcentaje: 0.1500, prioridad: 1000 },
  // Reglas por país (ejemplos — ajustables desde admin)
  { alcance: 'pais', pais_iso2: 'US', porcentaje: 0.1800, prioridad: 500 },
  { alcance: 'pais', pais_iso2: 'MX', porcentaje: 0.1500, prioridad: 500 },
];

// Solo pares soportados por el enum Moneda {MXN, USD}. Actualizar vía ExchangeRate-API cron en prod.
const TASAS_INICIALES = [
  { moneda_origen: 'MXN', moneda_destino: 'USD', tasa: '0.05882353', fuente: 'manual' }, // ~1/17
  { moneda_origen: 'USD', moneda_destino: 'MXN', tasa: '17.00000000', fuente: 'manual' },
];

async function seedIdiomas() {
  console.log('\n=== Idiomas ===');
  for (const i of IDIOMAS) {
    const existing = await prisma.idiomas.findUnique({ where: { codigo: i.codigo } });
    if (existing) {
      console.log(`  ✓ Already exists: ${i.codigo}`);
    } else {
      await prisma.idiomas.create({ data: i });
      console.log(`  ✓ Created: ${i.codigo} (${i.nombre_local})`);
    }
  }
}

async function seedPaises() {
  console.log('\n=== Países ===');
  for (const p of PAISES) {
    const existing = await prisma.paises.findUnique({ where: { iso2: p.iso2 } });
    if (existing) {
      console.log(`  ✓ Already exists: ${p.iso2} (${p.nombre})`);
    } else {
      await prisma.paises.create({ data: p });
      console.log(`  ✓ Created: ${p.iso2} (${p.nombre}) — venta:${p.activo_venta} envío:${p.activo_envio}`);
    }
  }
}

async function seedComisiones() {
  console.log('\n=== Comisiones ===');
  for (const c of COMISIONES_DEFAULT) {
    const existing = await prisma.comisiones.findFirst({
      where: {
        alcance: c.alcance,
        pais_iso2: c.pais_iso2 ?? null,
        id_categoria: null,
        id_productor: null,
        activo: true,
      },
    });
    if (existing) {
      console.log(`  ✓ Already exists: ${c.alcance}${c.pais_iso2 ? `/${c.pais_iso2}` : ''} → ${(Number(existing.porcentaje) * 100).toFixed(2)}%`);
    } else {
      await prisma.comisiones.create({ data: c });
      console.log(`  ✓ Created: ${c.alcance}${c.pais_iso2 ? `/${c.pais_iso2}` : ''} → ${(c.porcentaje * 100).toFixed(2)}% (prioridad ${c.prioridad})`);
    }
  }
}

async function seedTasasCambio() {
  console.log('\n=== Tasas de cambio (iniciales — usar cron en producción) ===');
  for (const t of TASAS_INICIALES) {
    const ahora = new Date();
    const existing = await prisma.tasas_cambio.findFirst({
      where: {
        moneda_origen: t.moneda_origen,
        moneda_destino: t.moneda_destino,
        vigente_hasta: null,
      },
    });
    if (existing) {
      console.log(`  ✓ Already vigente: ${t.moneda_origen}→${t.moneda_destino} = ${existing.tasa}`);
    } else {
      await prisma.tasas_cambio.create({
        data: {
          moneda_origen: t.moneda_origen,
          moneda_destino: t.moneda_destino,
          vigente_desde: ahora,
          tasa: t.tasa,
          fuente: t.fuente,
        },
      });
      console.log(`  ✓ Created: ${t.moneda_origen}→${t.moneda_destino} = ${t.tasa}`);
    }
  }
}

// Categoría de mezcal/destilados — puede ser null si se quiere global
// Si la categoría mezcal tiene un id diferente en tu BD, ajusta MEZCAL_CATEGORIA_SLUG
const MEZCAL_CATEGORIA_SLUG = 'mezcal';

const TASAS_IMPUESTO = [
  // IVA México 16% — precios son netos, se calcula y muestra en checkout
  {
    pais_iso2: 'MX',
    id_categoria_slug: null,
    tipo: 'IVA',
    nombre: 'IVA México 16%',
    tasa_porcentaje: '0.1600',
    incluido_en_precio: false,
    activo: true,
    vigente_desde: new Date('2024-01-01'),
  },
  // IEPS Mezcal México — ya está en el precio del productor, solo informativo
  {
    pais_iso2: 'MX',
    id_categoria_slug: MEZCAL_CATEGORIA_SLUG,
    tipo: 'IEPS',
    nombre: 'IEPS Destilados (incluido en precio)',
    tasa_porcentaje: '0.2650',
    incluido_en_precio: true,
    activo: true,
    vigente_desde: new Date('2024-01-01'),
  },
  // Sales Tax USA — desactivado; el FET se liquida en aduana por el importador
  {
    pais_iso2: 'US',
    id_categoria_slug: null,
    tipo: 'SALES_TAX',
    nombre: 'Sales Tax USA (estimado 8%)',
    tasa_porcentaje: '0.0800',
    incluido_en_precio: false,
    activo: false,
    vigente_desde: new Date('2024-01-01'),
  },
  // FET (Federal Excise Tax) para destilados de agave exportados a USA.
  // Tasa aproximada del ~5% basada en $13.50/proof-gallon típico para 750ml a 40% ABV.
  // El importe exacto lo determina la aduana al momento de importación.
  {
    pais_iso2: 'US',
    id_categoria_slug: MEZCAL_CATEGORIA_SLUG,
    tipo: 'FET',
    nombre: 'FET Federal Excise Tax (~5% estimado)',
    tasa_porcentaje: '0.0500',
    incluido_en_precio: false,
    activo: true,
    vigente_desde: new Date('2024-01-01'),
  },
];

async function seedTasasImpuesto() {
  console.log('\n=== Tasas de Impuesto ===');
  for (const t of TASAS_IMPUESTO) {
    let id_categoria = null;
    if (t.id_categoria_slug) {
      const cat = await prisma.categorias.findFirst({ where: { slug: t.id_categoria_slug } });
      id_categoria = cat?.id_categoria ?? null;
      if (!cat) {
        console.log(`  ⚠ Categoría "${t.id_categoria_slug}" no encontrada — tasa guardada sin categoría`);
      }
    }

    const existing = await prisma.tasas_impuesto.findFirst({
      where: {
        pais_iso2: t.pais_iso2,
        tipo: t.tipo,
        id_categoria: id_categoria,
        activo: true,
      },
    });

    if (existing) {
      console.log(`  ✓ Already exists: ${t.tipo} ${t.pais_iso2}${id_categoria ? `/cat:${id_categoria}` : ''} → ${(Number(t.tasa_porcentaje) * 100).toFixed(2)}%`);
    } else {
      await prisma.tasas_impuesto.create({
        data: {
          pais_iso2: t.pais_iso2,
          id_categoria,
          tipo: t.tipo,
          nombre: t.nombre,
          tasa_porcentaje: t.tasa_porcentaje,
          incluido_en_precio: t.incluido_en_precio,
          activo: t.activo,
          vigente_desde: t.vigente_desde,
        },
      });
      console.log(`  ✓ Created: ${t.tipo} ${t.pais_iso2}${id_categoria ? `/cat:${id_categoria}` : ''} → ${(Number(t.tasa_porcentaje) * 100).toFixed(2)}% (incluido: ${t.incluido_en_precio})`);
    }
  }
}

async function main() {
  console.log('🌍 Starting internacionalización seed...');
  try {
    await seedIdiomas();
    await seedPaises();
    await seedComisiones();
    await seedTasasCambio();
    await seedTasasImpuesto();
    console.log('\n✅ Internacionalización seed completed.');
  } catch (error) {
    console.error('\n❌ Error during seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
