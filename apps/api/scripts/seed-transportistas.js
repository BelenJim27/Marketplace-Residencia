const { PrismaClient } = require('@prisma/client');
 const prisma = new PrismaClient();

 async function main() {
   // Transportista FedEx
   const fedex = await prisma.transportistas.upsert({
     where: { codigo: 'FEDEX' },
     update: {},
     create: {
       codigo: 'FEDEX',
       nombre: 'FedEx',
       paises_operacion: ['MX', 'US'],
       api_base_url: 'https://apis-sandbox.fedex.com',
       activo: true,
     },
   });

   // Servicios FedEx (códigos del humanizeFedexService)
const serviciosFedex = [
      { codigo_servicio: 'FEDEX_GROUND', nombre: 'FedEx Ground', es_internacional: false },
      { codigo_servicio: 'FEDEX_EXPRESS_SAVER', nombre: 'FedEx Express Saver', es_internacional: false },
      { codigo_servicio: 'STANDARD_OVERNIGHT', nombre: 'FedEx Standard Overnight', es_internacional: false },
      { codigo_servicio: 'PRIORITY_OVERNIGHT', nombre: 'FedEx Priority Overnight', es_internacional: false },
      { codigo_servicio: 'FIRST_OVERNIGHT', nombre: 'FedEx First Overnight', es_internacional: false },
      { codigo_servicio: 'FEDEX_2_DAY', nombre: 'FedEx 2Day', es_internacional: false },
      { codigo_servicio: 'FEDEX_2_DAY_AM', nombre: 'FedEx 2Day AM', es_internacional: false },
      { codigo_servicio: 'FEDEX_INTERNATIONAL_PRIORITY', nombre: 'FedEx International Priority', es_internacional: true },
      { codigo_servicio: 'FEDEX_INTERNATIONAL_ECONOMY', nombre: 'FedEx International Economy', es_internacional: true },
      { codigo_servicio: 'INTERNATIONAL_PRIORITY_FREIGHT', nombre: 'FedEx Int. Priority Freight', es_internacional: true },
    ];

for (const s of serviciosFedex) {
      await prisma.servicios_envio.upsert({
        where: { id_transportista_codigo_servicio: { id_transportista: fedex.id_transportista, codigo_servicio: s.codigo_servicio } },
        update: {},
        create: { id_transportista: fedex.id_transportista, ...s, activo: true },
      });
    }

 }

 main().catch(console.error).finally(() => prisma.$disconnect());
