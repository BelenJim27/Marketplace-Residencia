const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const { ADMIN_PERMISOS } = require('@marketplace/authorization');

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@mezcal.mx';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';
const ADMIN_NOMBRE = process.env.ADMIN_NOMBRE || 'Administrador';

const PERMISOS_ADMIN = [...ADMIN_PERMISOS];

async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const iterations = 16384;
    const keyLength = 64;
    crypto.scrypt(password, salt, keyLength, { N: iterations, r: 8, p: 1, maxmem: 128 * 1024 * 1024 }, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(`scrypt$${iterations}$8$1$${salt}$${derivedKey.toString('hex')}$sha512`);
    });
  });
}

async function main() {
  console.log('🌱 Starting admin seed...\n');

  try {
    // 1. Crear/actualizar permisos
    console.log('=== Creating/restoring permisos ===');
    const createdPermisos = [];
    for (const nombre of PERMISOS_ADMIN) {
      const permiso = await prisma.permisos.upsert({
        where: { nombre },
        update: { eliminado_en: null },
        create: { nombre },
      });
      console.log(`  ✓ ${permiso.eliminado_en ? 'Restored' : 'Ready'}: ${nombre}`);
      createdPermisos.push(permiso);
    }

    // 2. Crear rol administrador
    console.log('\n=== Creating rol administrador ===');
    let rolAdmin = await prisma.roles.findUnique({ where: { nombre: 'administrador' } });
    if (!rolAdmin) {
      rolAdmin = await prisma.roles.create({
        data: { nombre: 'administrador', estado: 'activo' },
      });
      console.log('  ✓ Created rol: administrador');
    } else {
      console.log('  ✓ Rol already exists: administrador');
    }

    // 3. Asignar permisos al rol administrador
    console.log('\n=== Assigning permisos to rol administrador ===');
    for (const permiso of createdPermisos) {
      if (!permiso) continue;
      const existingAssignment = await prisma.rol_permiso.findUnique({
        where: { id_rol_id_permiso: { id_rol: rolAdmin.id_rol, id_permiso: permiso.id_permiso } },
      });
      if (!existingAssignment) {
        await prisma.rol_permiso.create({
          data: { id_rol: rolAdmin.id_rol, id_permiso: permiso.id_permiso },
        });
        console.log(`  ✓ Assigned: ${permiso.nombre}`);
      } else {
        console.log(`  ✓ Already assigned: ${permiso.nombre}`);
      }
    }

    // 4. Crear usuario administrador
    console.log('\n=== Creating admin user ===');
    let adminUser = await prisma.usuarios.findUnique({ where: { email: ADMIN_EMAIL } });
    if (!adminUser) {
      const passwordHash = await hashPassword(ADMIN_PASSWORD);
      adminUser = await prisma.usuarios.create({
        data: { nombre: ADMIN_NOMBRE, email: ADMIN_EMAIL, password_hash: passwordHash },
      });
      console.log(`  ✓ Created user: ${ADMIN_EMAIL}`);
    } else {
      console.log(`  ✓ User already exists: ${ADMIN_EMAIL}`);
    }

    // 5. Asignar rol administrador al usuario
    console.log('\n=== Assigning rol administrador to user ===');
    const existingAssignment = await prisma.usuario_rol.findUnique({
      where: { id_usuario_id_rol: { id_usuario: adminUser.id_usuario, id_rol: rolAdmin.id_rol } },
    });
    if (!existingAssignment) {
      await prisma.usuario_rol.create({
        data: { id_usuario: adminUser.id_usuario, id_rol: rolAdmin.id_rol, estado: 'activo' },
      });
      console.log('  ✓ Assigned rol administrador to user');
    } else {
      console.log('  ✓ User already has rol administrador');
    }

    console.log('\n✅ Admin seed completed successfully!');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
  } catch (error) {
    console.error('\n❌ Error during seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
