require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const REGIONES = [
  { nombre: 'Valles Centrales', estado_prov: 'Oaxaca', pais_iso2: 'MX' },
  { nombre: 'Sierra Norte', estado_prov: 'Oaxaca', pais_iso2: 'MX' },
  { nombre: 'Sierra Sur', estado_prov: 'Oaxaca', pais_iso2: 'MX' },
  { nombre: 'Mixteca', estado_prov: 'Oaxaca', pais_iso2: 'MX' },
  { nombre: 'Cañada', estado_prov: 'Oaxaca', pais_iso2: 'MX' },
  { nombre: 'Papaloapan', estado_prov: 'Oaxaca', pais_iso2: 'MX' },
  { nombre: 'Istmo', estado_prov: 'Oaxaca', pais_iso2: 'MX' },
  { nombre: 'Costa', estado_prov: 'Oaxaca', pais_iso2: 'MX' },
];

// HS codes: clasificación arancelaria usada en guías internacionales
// 2208.90 = Otras bebidas espirituosas (mezcal, destilados de agave)
// 6304.99 = Artículos de artesanía textil
// 2106.90 = Preparaciones alimenticias diversas
// 3304.99 = Preparaciones de belleza y cosméticos
const CATEGORIAS = [
  // HS completo (10 díg.) — SkydropX rechaza los de 6 díg. ("2208.90"/"220890") con "No existe el código harmonizado".
  { nombre: 'Mezcal', slug: 'mezcal', descripcion: 'Bebidas destiladas de agave', tipo: 'producto', codigo_hs_default: '2208.907200' },
  { nombre: 'Artesanía', slug: 'artesania', descripcion: 'Artículos artesanales', tipo: 'producto', codigo_hs_default: '6304.99' },
  { nombre: 'Alimentación', slug: 'alimentacion', descripcion: 'Productos alimenticios', tipo: 'producto', codigo_hs_default: '2106.90' },
  { nombre: 'Cosméticos', slug: 'cosmeticos', descripcion: 'Productos de belleza', tipo: 'producto', codigo_hs_default: '3304.99' },
];

const COMISIONES_DEFAULT = [
  { alcance: 'global', porcentaje: 0.1500, prioridad: 1000 },
  { alcance: 'pais', pais_iso2: 'US', porcentaje: 0.1800, prioridad: 500 },
  { alcance: 'pais', pais_iso2: 'MX', porcentaje: 0.1500, prioridad: 500 },
];

const CONFIGURACION = [
  { clave: 'IMPUESTO_IVA', valor: '16', tipo: 'numero', descripcion: 'Porcentaje de IVA' },
  { clave: 'IMPUESTO_IEPS', valor: '26.5', tipo: 'numero', descripcion: 'Porcentaje de IEPS para bebidas alcohólicas' },
  { clave: 'MONEDA_DEFAULT', valor: 'MXN', tipo: 'texto', descripcion: 'Moneda predeterminada' },
  { clave: 'MONEDA_REFERENCIA', valor: 'USD', tipo: 'texto', descripcion: 'Moneda de referencia para type de cambio' },
  { clave: 'PEDIDO_MINIMO', valor: '500', tipo: 'numero', descripcion: 'Monto mínimo para pedido' },
  { clave: 'PAGOS_HABILITADOS', valor: 'true', tipo: 'boolean', descripcion: 'Habilitar pasarela de pagos' },
  { clave: 'INVENTARIO_HABILITADO', valor: 'true', tipo: 'boolean', descripcion: 'Habilitar control de inventario' },
  { clave: 'COMISION_PLATAFORMA', valor: '10', tipo: 'numero', descripcion: 'Porcentaje de comisión de la plataforma' },
  { clave: 'IVA_INCLUIDO', valor: 'true', tipo: 'boolean', descripcion: 'IVA incluido en precios' },
];

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

async function main() {
  console.log('🌱 Starting base seed...\n');

  try {
    console.log('=== Regiones ===');
    for (const region of REGIONES) {
      const existing = await prisma.regiones.findFirst({
        where: { nombre: region.nombre, estado_prov: region.estado_prov },
      });
      if (existing) {
        console.log(`  ✓ Already exists: ${region.nombre}`);
      } else {
        await prisma.regiones.create({ data: { ...region, activo: true } });
        console.log(`  ✓ Created: ${region.nombre}, ${region.estado_prov}`);
      }
    }

    console.log('\n=== Categorías ===');
    for (const cat of CATEGORIAS) {
      const existing = await prisma.categorias.findUnique({ where: { slug: cat.slug } });
      if (existing) {
        // Actualizar HS code si no estaba seteado
        if (!existing.codigo_hs_default && cat.codigo_hs_default) {
          await prisma.categorias.update({
            where: { slug: cat.slug },
            data: { codigo_hs_default: cat.codigo_hs_default },
          });
          console.log(`  ✎ Updated HS code: ${cat.slug} → ${cat.codigo_hs_default}`);
        } else {
          console.log(`  ✓ Already exists: ${cat.slug}`);
        }
      } else {
        await prisma.categorias.create({ data: { ...cat, activo: true } });
        console.log(`  ✓ Created: ${cat.nombre} (HS: ${cat.codigo_hs_default ?? 'N/A'})`);
      }
    }

    // Renombrar claves con typo que puedan existir en BD de instalaciones previas
    const CLAVE_RENAMES = [
      { old: 'IMPuesto_IVA',  nuevo: 'IMPUESTO_IVA'  },
      { old: 'IMPuesto_IEPS', nuevo: 'IMPUESTO_IEPS' },
    ];
    for (const r of CLAVE_RENAMES) {
      const wrong = await prisma.configuracion_sistema.findUnique({ where: { clave: r.old } });
      if (wrong) {
        await prisma.configuracion_sistema.update({ where: { clave: r.old }, data: { clave: r.nuevo } });
        console.log(`  ✎ Renamed config key: ${r.old} → ${r.nuevo}`);
      }
    }

    console.log('\n=== Configuración del Sistema ===');
    for (const config of CONFIGURACION) {
      const existing = await prisma.configuracion_sistema.findUnique({ where: { clave: config.clave } });
      if (existing) {
        console.log(`  ✓ Already exists: ${config.clave}`);
      } else {
        await prisma.configuracion_sistema.create({ data: config });
        console.log(`  ✓ Created: ${config.clave} = ${config.valor}`);
      }
    }

    await seedComisiones();

    console.log('\n✅ Base seed completed successfully!');
  } catch (error) {
    console.error('\n❌ Error during seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();