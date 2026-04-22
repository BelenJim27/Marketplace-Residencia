require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const USUARIOS = [
  {
    nombre: 'Juan',
    nombre_usuario: 'juanito_perez', // Campo añadido
    apellido_paterno: 'Pérez',
    apellido_materno: 'López',
    email: 'juan@example.com',
    telefono: '+52 951 123 4567',
    password: 'Password123!',
  },
  {
    nombre: 'María',
    nombre_usuario: 'maria_garcia', // Campo añadido
    apellido_paterno: 'García',
    apellido_materno: 'Martínez',
    email: 'maria@example.com',
    telefono: '+52 951 234 5678',
    password: 'Password123!',
  },
  {
    nombre: 'Carlos',
    nombre_usuario: 'carlos_ram', // Campo añadido
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
    nombre_usuario: 'pedro_mezcal', // Campo añadido
    apellido_paterno: 'González',
    apellido_materno: 'Morales',
    email: 'pedro@mezcal.com',
    telefono: '+52 951 456 7890',
    password: 'Password123!',
    biografia: 'Maestro mezcalero con más de 20 años de experiencia',
  },
  {
    nombre: 'Ana',
    nombre_usuario: 'ana_artesanal', // Campo añadido
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
    // 1. Manejo de Roles (Igual que antes)
    const rolesToCreate = ['cliente', 'productor'];
    const rolesMap = {};

    for (const rolNombre of rolesToCreate) {
      let rol = await prisma.roles.findUnique({ where: { nombre: rolNombre } });
      if (!rol) {
        rol = await prisma.roles.create({ data: { nombre: rolNombre, estado: 'activo' } });
        console.log(`  ✓ Created rol: ${rolNombre}`);
      }
      rolesMap[rolNombre] = rol.id_rol;
    }

    // 2. Usuarios (Clientes)
    console.log('\n=== Usuarios (Clientes) ===');
    for (const u of USUARIOS) {
      const existing = await prisma.usuarios.findFirst({ 
        where: { OR: [{ email: u.email }, { nombre_usuario: u.nombre_usuario }] } 
      });

      if (existing) {
        console.log(`  ⚠ Already exists (email/user): ${u.email}`);
      } else {
        const user = await prisma.usuarios.create({
          data: {
            nombre: u.nombre,
            nombre_usuario: u.nombre_usuario, // Insertando el nuevo campo
            apellido_paterno: u.apellido_paterno,
            apellido_materno: u.apellido_materno,
            email: u.email,
            telefono: u.telefono,
            password_hash: await hashPassword(u.password),
          },
        });
        await prisma.usuario_rol.create({
          data: { id_usuario: user.id_usuario, id_rol: rolesMap['cliente'], estado: 'activo' },
        });
        console.log(`  ✓ Created: ${u.nombre_usuario} (${u.email})`);
      }
    }

    // 3. Productores
    console.log('\n=== Productores ===');
    for (const p of PRODUCTORES) {
      const existing = await prisma.usuarios.findFirst({ 
        where: { OR: [{ email: p.email }, { nombre_usuario: p.nombre_usuario }] } 
      });
      
      let user;
      if (existing) {
        console.log(`  ⚠ Already exists: ${p.email}`);
        user = existing;
      } else {
        user = await prisma.usuarios.create({
          data: {
            nombre: p.nombre,
            nombre_usuario: p.nombre_usuario, // Insertando el nuevo campo
            apellido_paterno: p.apellido_paterno,
            apellido_materno: p.apellido_materno,
            email: p.email,
            telefono: p.telefono,
            password_hash: await hashPassword(p.password),
          },
        });
        console.log(`  ✓ Created user: ${p.nombre_usuario}`);
      }

      // Tabla Productores
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
        console.log(`  ✓ Created producteur details: ${user.nombre}`);
      }

      // Relación Rol Productor
      const existingRol = await prisma.usuario_rol.findUnique({
        where: { id_usuario_id_rol: { id_usuario: user.id_usuario, id_rol: rolesMap['productor'] } },
      });
      if (!existingRol) {
        await prisma.usuario_rol.create({
          data: { id_usuario: user.id_usuario, id_rol: rolesMap['productor'], estado: 'activo' },
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