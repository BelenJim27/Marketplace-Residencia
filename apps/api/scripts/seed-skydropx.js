require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed SkydropX transportista...\n');

  try {
    const transportista = await prisma.transportistas.upsert({
      where: { codigo: 'SKYDROPX' },
      update: { activo: true },
      create: {
        codigo: 'SKYDROPX',
        nombre: 'SkydropX',
        paises_operacion: ['MX', 'US', 'CA', 'CO', 'ES', 'FR', 'GB', 'CN'],
        api_base_url: 'https://pro.skydropx.com/api/v1',
        notas_integracion: 'OAuth2 client_credentials. Sandbox: sb-pro.skydropx.com. Radar API: radar-api.skydropx.com/v1/tracking',
        activo: true,
      },
    });

    console.log(`✅ Transportista SkydropX: id=${transportista.id_transportista}, codigo=${transportista.codigo}`);

    // Servicios de envío SkydropX (sub-carriers disponibles vía su plataforma)
    const SERVICIOS = [
      { codigo_servicio: 'SKYDROPX_STANDARD', nombre: 'SkydropX Estándar', es_internacional: false },
      { codigo_servicio: 'SKYDROPX_EXPRESS',  nombre: 'SkydropX Express',   es_internacional: false },
      { codigo_servicio: 'SKYDROPX_INTL',     nombre: 'SkydropX Internacional', es_internacional: true },
    ];

    for (const svc of SERVICIOS) {
      await prisma.servicios_envio.upsert({
        where: {
          id_transportista_codigo_servicio: {
            id_transportista: transportista.id_transportista,
            codigo_servicio: svc.codigo_servicio,
          },
        },
        update: { activo: true },
        create: {
          id_transportista: transportista.id_transportista,
          codigo_servicio: svc.codigo_servicio,
          nombre: svc.nombre,
          tiempo_estimado: svc.es_internacional ? '5-10 días hábiles' : '2-5 días hábiles',
          es_internacional: svc.es_internacional,
          activo: true,
        },
      });
      console.log(`  ✓ Servicio: ${svc.codigo_servicio}`);
    }

    console.log('\n✅ Seed SkydropX completado!');
  } catch (error) {
    console.error('\n❌ Error durante seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
