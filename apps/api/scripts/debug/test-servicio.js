const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.servicios_envio.findFirst({ where: { codigo_servicio: 'SKYDROPX_STANDARD' } })
  .then(r => console.log('Result:', r))
  .catch(e => console.error('Error:', e.message))
  .finally(() => prisma.$disconnect());