require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const USUARIOS = [
  {
    nombre: 'Juan',
    apellido_paterno: 'Pérez',
    apellido_materno: 'López',
    email: 'juan@example.com',
    telefono: '+52 951 123 4567',
    password: 'Password123!',
  },
  {
    nombre: 'María',
    apellido_paterno: 'García',
    apellido_materno: 'Martínez',
    email: 'maria@example.com',
    telefono: '+52 951 234 5678',
    password: 'Password123!',
  },
  {
    nombre: 'Carlos',
    apellido_paterno: 'Ramírez',
    apellido_materno: 'Torres',
    email: 'carlos@example.com',
    telefono: '+52 951 345 6789',
    password: 'Password123!',
  },
];

const PRODUCTORES = [
  {
    nombre: 'Pedro',
    apellido_paterno: 'González',
    apellido_materno: 'Morales',
    email: 'pedro@mezcal.com',
    telefono: '+52 951 456 7890',
    password: 'Password123!',
    biografia: 'Maestro mezcalero con más de 20 años de experiencia',
  },
  {
    nombre: 'Ana',
    apellido_paterno: 'López',
    apellido_materno: 'Hernández',
    email: 'ana@mezcal.com',
    telefono: '+52 951 567 8901',
    password: 'Password123!',
    biografia: 'Productora de mezcal artesanal tradicional',
  },
];

async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 128 * 1024 * 1024 }, (error, derivedKey) => {
      if (error) return reject(error);
      resolve(`scrypt$16384$8$1$${salt}$${derivedKey.toString('hex')}$sha512`);
    });
  });
}

async function main() {
  console.log('🌱 Starting usuarios seed...\n');

  try {
    const rolCliente = await prisma.roles.findUnique({ where: { nombre: 'cliente' } });
    let rolClienteId;
    if (!rolCliente) {
      const nuevo = await prisma.roles.create({ data: { nombre: 'cliente', estado: 'activo' } });
      rolClienteId = nuevo.id_rol;
      console.log('  ✓ Created rol: cliente');
    } else {
      rolClienteId = rolCliente.id_rol;
    }

    const rolProductor = await prisma.roles.findUnique({ where: { nombre: 'productor' } });
    let rolProductorId;
    if (!rolProductor) {
      const nuevo = await prisma.roles.create({ data: { nombre: 'productor', estado: 'activo' } });
      rolProductorId = nuevo.id_rol;
      console.log('  ✓ Created rol: productor');
    } else {
      rolProductorId = rolProductor.id_rol;
    }

    console.log('\n=== Usuarios (Clientes) ===');
    for (const u of USUARIOS) {
      const existing = await prisma.usuarios.findUnique({ where: { email: u.email } });
      if (existing) {
        console.log(`  ✓ Already exists: ${u.email}`);
      } else {
        const user = await prisma.usuarios.create({
          data: {
            nombre: u.nombre,
            apellido_paterno: u.apellido_paterno,
            apellido_materno: u.apellido_materno,
            email: u.email,
            telefono: u.telefono,
            password_hash: await hashPassword(u.password),
          },
        });
        await prisma.usuario_rol.create({
          data: { id_usuario: user.id_usuario, id_rol: rolClienteId, estado: 'activo' },
        });
        console.log(`  ✓ Created: ${u.email}`);
      }
    }

    console.log('\n=== Productores ===');
    for (const p of PRODUCTORES) {
      const existing = await prisma.usuarios.findUnique({ where: { email: p.email } });
      let user;
      if (existing) {
        console.log(`  ✓ Already exists: ${p.email}`);
        user = existing;
      } else {
        user = await prisma.usuarios.create({
          data: {
            nombre: p.nombre,
            apellido_paterno: p.apellido_paterno,
            apellido_materno: p.apellido_materno,
            email: p.email,
            telefono: p.telefono,
            password_hash: await hashPassword(p.password),
          },
        });
        console.log(`  ✓ Created: ${p.email}`);
      }

      const existingProd = await prisma.productores.findUnique({ where: { id_usuario: user.id_usuario } });
      if (!existingProd) {
        const region = await prisma.regiones.findFirst({ where: { nombre: 'Oaxaca' } });
        await prisma.productores.create({
          data: {
            id_usuario: user.id_usuario,
            id_region: region?.id_region,
            biografia: p.biografia,
          },
        });
        console.log(`  ✓ Created producteur: ${user.nombre}`);
      }

      const existingRol = await prisma.usuario_rol.findUnique({
        where: { id_usuario_id_rol: { id_usuario: user.id_usuario, id_rol: rolProductorId } },
      });
      if (!existingRol) {
        await prisma.usuario_rol.create({
          data: { id_usuario: user.id_usuario, id_rol: rolProductorId, estado: 'activo' },
        });
      }
    }

    console.log('\n✅ Usuarios seed completed successfully!');
  } catch (error) {
    console.error('\n❌ Error during seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();