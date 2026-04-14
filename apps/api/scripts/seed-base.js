require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const MONEDAS = [
  { codigo: 'MXN', nombre: 'Peso Mexicano', simbolo: '$', activo: true },
  { codigo: 'USD', nombre: 'Dólar Americano', simbolo: 'US$', activo: true },
  { codigo: 'EUR', nombre: 'Euro', simbolo: '€', activo: true },
];

const REGIONES = [
  { nombre: 'Oaxaca', estado_prov: 'Oaxaca', pais_iso2: 'MX' },
  { nombre: 'Michoacán', estado_prov: 'Michoacán', pais_iso2: 'MX' },
  { nombre: 'Guerrero', estado_prov: 'Guerrero', pais_iso2: 'MX' },
  { nombre: 'San Luis Potosí', estado_prov: 'San Luis Potosí', pais_iso2: 'MX' },
  { nombre: 'Zacatecas', estado_prov: 'Zacatecas', pais_iso2: 'MX' },
  { nombre: 'Guanajuato', estado_prov: 'Guanajuato', pais_iso2: 'MX' },
  { nombre: 'Durango', estado_prov: 'Durango', pais_iso2: 'MX' },
  { nombre: 'Jalisco', estado_prov: 'Jalisco', pais_iso2: 'MX' },
];

const CATEGORIAS = [
  { nombre: 'Mezcal', slug: 'mezcal', descripcion: 'Bebidas destiladas de agave', tipo: 'producto', orden: 1 },
  { nombre: 'Artesanía', slug: 'artesania', descripcion: 'Artículos artesanales', tipo: 'producto', orden: 2 },
  { nombre: 'Alimentación', slug: 'alimentacion', descripcion: 'Productos alimenticios', tipo: 'producto', orden: 3 },
  { nombre: 'Cosméticos', slug: 'cosmeticos', descripcion: 'Productos de belleza', tipo: 'producto', orden: 4 },
];

const TRANSPORTISTAS = [
  {
    codigo: 'ESTAFETA',
    nombre: 'Estafeta',
    paises_operacion: ['MX'],
    activo: true,
    servicios: [
      { codigo_servicio: 'ESTANDARD', nombre: 'Envío Estándar', tiempo_estimado: '3-5 días' },
      { codigo_servicio: 'EXPRESS', nombre: 'Envío Express', tiempo_estimado: '1-2 días' },
    ],
  },
  {
    codigo: 'FEDEX',
    nombre: 'FedEx',
    paises_operacion: ['MX', 'US'],
    activo: true,
    servicios: [
      { codigo_servicio: 'GROUND', nombre: 'FedEx Ground', tiempo_estimado: '5-7 días' },
      { codigo_servicio: 'EXPRESS', nombre: 'FedEx Express', tiempo_estimado: '2-3 días' },
      { codigo_servicio: 'INTERNATIONAL', nombre: 'FedEx Internacional', tiempo_estimado: '7-10 días' },
    ],
  },
  {
    codigo: 'DHL',
    nombre: 'DHL Express',
    paises_operacion: ['MX', 'US', 'CA'],
    activo: true,
    servicios: [
      { codigo_servicio: 'EXPRESS', nombre: 'DHL Express', tiempo_estimado: '2-4 días' },
      { codigo_servicio: 'ECONOMY', nombre: 'DHL Economy', tiempo_estimado: '5-8 días' },
    ],
  },
];

const CONFIGURACION = [
  { clave: 'IMPuesto_IVA', valor: '16', tipo: 'numero', descripcion: 'Porcentaje de IVA' },
  { clave: 'IMPuesto_IEPS', valor: '26.5', tipo: 'numero', descripcion: 'Porcentaje de IEPS para bebidas alcohólicas' },
  { clave: 'MONEDA_DEFAULT', valor: 'MXN', tipo: 'texto', descripcion: 'Moneda predeterminada' },
  { clave: 'MONEDA_REFERENCIA', valor: 'USD', tipo: 'texto', descripcion: 'Moneda de referencia para type de cambio' },
  { clave: 'PEDIDO_MINIMO', valor: '500', tipo: 'numero', descripcion: 'Monto mínimo para pedido' },
  { clave: 'ENVIO_GRATIS_DESDE', valor: '1500', tipo: 'numero', descripcion: 'Monto para envío gratis' },
  { clave: 'PAGOS_HABILITADOS', valor: 'true', tipo: 'boolean', descripcion: 'Habilitar pasarela de pagos' },
  { clave: 'INVENTARIO_HABILITADO', valor: 'true', tipo: 'boolean', descripcion: 'Habilitar control de inventario' },
  { clave: 'COMISION_PLATAFORMA', valor: '10', tipo: 'numero', descripcion: 'Porcentaje de comisión de la plataforma' },
  { clave: 'IVA_INCLUIDO', valor: 'true', tipo: 'boolean', descripcion: 'IVA incluido en precios' },
];

async function main() {
  console.log('🌱 Starting base seed...\n');

  try {
    console.log('=== Monedas ===');
    for (const moneda of MONEDAS) {
      const existing = await prisma.monedas.findUnique({ where: { codigo: moneda.codigo } });
      if (existing) {
        console.log(`  ✓ Already exists: ${moneda.codigo}`);
      } else {
        await prisma.monedas.create({ data: moneda });
        console.log(`  ✓ Created: ${moneda.codigo} - ${moneda.nombre}`);
      }
    }

    console.log('\n=== Regiones ===');
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
        console.log(`  ✓ Already exists: ${cat.slug}`);
      } else {
        await prisma.categorias.create({ data: { ...cat, activo: true } });
        console.log(`  ✓ Created: ${cat.nombre}`);
      }
    }

    console.log('\n=== Transportistas ===');
    for (const transportista of TRANSPORTISTAS) {
      const { servicios, ...data } = transportista;
      const existing = await prisma.transportistas.findUnique({ where: { codigo: data.codigo } });
      let tran;
      if (existing) {
        console.log(`  ✓ Already exists: ${data.codigo}`);
        tran = existing;
      } else {
        tran = await prisma.transportistas.create({ data: { ...data, paises_operacion: data.paises_operacion } });
        console.log(`  ✓ Created: ${data.codigo} - ${data.nombre}`);
      }
      for (const svc of servicios) {
        const existingServ = await prisma.servicios_envio.findUnique({
          where: { id_transportista_codigo_servicio: { id_transportista: tran.id_transportista, codigo_servicio: svc.codigo_servicio } },
        });
        if (existingServ) {
          console.log(`    ✓ Already exists: ${svc.codigo_servicio}`);
        } else {
          await prisma.servicios_envio.create({
            data: { id_transportista: tran.id_transportista, ...svc, es_internacional: data.paises_operacion.length > 1, activo: true },
          });
          console.log(`    ✓ Created: ${svc.codigo_servicio} - ${svc.nombre}`);
        }
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

    console.log('\n✅ Base seed completed successfully!');
  } catch (error) {
    console.error('\n❌ Error during seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();