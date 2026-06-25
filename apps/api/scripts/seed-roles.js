require('dotenv').config();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const {
  ADMIN_PERMISOS,
  PRODUCTOR_PERMISOS,
  CLIENTE_PERMISOS,
} = require('@marketplace/authorization');

const prisma = new PrismaClient();

const ROLES = [
  { nombre: 'administrador' },
  { nombre: 'productor' },
  { nombre: 'cliente' },
];

const USUARIOS = {
  administrador: {
    nombre: 'Admin',
    apellido_paterno: 'Sistema',
    email: 'admin@marketplace.local',
    password: 'admin123',
  },
  productor: {
    nombre: 'Juan',
    apellido_paterno: 'Pérez',
    email: 'productor@marketplace.local',
    password: 'productor123',
  },
  cliente: {
    nombre: 'María',
    apellido_paterno: 'García',
    email: 'cliente@marketplace.local',
    password: 'cliente123',
  },
};

const PERMISOS_ADMIN = [...ADMIN_PERMISOS];
const PERMISOS_PRODUCTOR = [...PRODUCTOR_PERMISOS];
const PERMISOS_CLIENTE = [...CLIENTE_PERMISOS];

async function main() {
  console.log('🌱 Starting roles seed...\n');

  try {
    // === Migración: ver_pedido → ver_pedidos ===
    console.log('=== Migrating ver_pedido → ver_pedidos ===');
    const oldPermiso = await prisma.permisos.findUnique({ where: { nombre: 'ver_pedido' } });
    if (oldPermiso) {
      const newPermiso = await prisma.permisos.upsert({
        where: { nombre: 'ver_pedidos' },
        update: {},
        create: { nombre: 'ver_pedidos' },
      });
      // Reasignar rol_permiso entries de ver_pedido a ver_pedidos
      const oldAssignments = await prisma.rol_permiso.findMany({ where: { id_permiso: oldPermiso.id_permiso } });
      for (const assignment of oldAssignments) {
        const existing = await prisma.rol_permiso.findUnique({
          where: { id_rol_id_permiso: { id_rol: assignment.id_rol, id_permiso: newPermiso.id_permiso } },
        });
        if (!existing) {
          await prisma.rol_permiso.create({
            data: { id_rol: assignment.id_rol, id_permiso: newPermiso.id_permiso },
          });
          console.log(`  ✓ Migrated: rol ${assignment.id_rol} → ver_pedidos`);
        }
      }
      // Remove old assignments and the old permiso
      await prisma.rol_permiso.deleteMany({ where: { id_permiso: oldPermiso.id_permiso } });
      await prisma.permisos.delete({ where: { id_permiso: oldPermiso.id_permiso } });
      console.log('  ✓ Removed old ver_pedido permiso');
    } else {
      console.log('  ✓ ver_pedido not found (already migrated)');
    }

    console.log('\n=== Creating Roles ===');
    for (const rol of ROLES) {
      const existing = await prisma.roles.findUnique({ where: { nombre: rol.nombre } });
      if (existing) {
        console.log(`  ✓ Already exists: ${rol.nombre}`);
      } else {
        await prisma.roles.create({ data: rol });
        console.log(`  ✓ Created: ${rol.nombre}`);
      }
    }

    console.log('\n=== Creating Permisos ===');
    const ALL_PERMISOS = [...new Set([...PERMISOS_ADMIN, ...PERMISOS_PRODUCTOR, ...PERMISOS_CLIENTE])];
    const createdPermisos = {};
    for (const nombre of ALL_PERMISOS) {
      const permiso = await prisma.permisos.upsert({
        where: { nombre },
        update: { eliminado_en: null },
        create: { nombre },
      });
      createdPermisos[nombre] = permiso;
      console.log(`  ✓ ${permiso ? (permiso.eliminado_en ? 'Restored' : 'Already exists') : 'Created'}: ${nombre}`);
    }

    console.log('\n=== Assigning Permisos to Administrador ===');
    const adminRole = await prisma.roles.findUnique({ where: { nombre: 'administrador' } });
    if (adminRole) {
      for (const nombrePerm of PERMISOS_ADMIN) {
        const permiso = createdPermisos[nombrePerm];
        if (!permiso) continue;
        const existing = await prisma.rol_permiso.findUnique({
          where: { id_rol_id_permiso: { id_rol: adminRole.id_rol, id_permiso: permiso.id_permiso } },
        });
        if (!existing) {
          await prisma.rol_permiso.create({
            data: { id_rol: adminRole.id_rol, id_permiso: permiso.id_permiso },
          });
          console.log(`  ✓ Linked: administrador → ${nombrePerm}`);
        } else {
          console.log(`  ✓ Already linked: administrador → ${nombrePerm}`);
        }
      }
    }

    console.log('\n=== Creating Users ===');
    for (const [tipo, data] of Object.entries(USUARIOS)) {
      const existingUser = await prisma.usuarios.findUnique({ where: { email: data.email } });
      if (existingUser) {
        console.log(`  ✓ Already exists: ${data.email}`);

        const rol = await prisma.roles.findUnique({ where: { nombre: tipo } });
        if (rol) {
          const existingRel = await prisma.usuario_rol.findUnique({
            where: { id_usuario_id_rol: { id_usuario: existingUser.id_usuario, id_rol: rol.id_rol } },
          });
          if (!existingRel) {
            await prisma.usuario_rol.create({
              data: { id_usuario: existingUser.id_usuario, id_rol: rol.id_rol },
            });
            console.log(`    ✓ Linked to role: ${tipo}`);
          }
        }
      } else {
        const user = await prisma.usuarios.create({
          data: {
            nombre: data.nombre,
            apellido_paterno: data.apellido_paterno,
            email: data.email,
            password_hash: await bcrypt.hash(data.password, 10),
            idioma_preferido: 'es',
            moneda_preferida: 'MXN',
          },
        });
        console.log(`  ✓ Created: ${data.email}`);

        const rol = await prisma.roles.findUnique({ where: { nombre: tipo } });
        if (rol) {
          await prisma.usuario_rol.create({
            data: { id_usuario: user.id_usuario, id_rol: rol.id_rol },
          });
          console.log(`    ✓ Linked to role: ${tipo}`);
        }

        if (tipo === 'productor') {
          const region = await prisma.regiones.findFirst();
          const producer = await prisma.productores.create({
            data: {
              id_usuario: user.id_usuario,
              id_region: region?.id_region,
              estado: 'aprobado',
              biografia: 'Productor de ejemplo',
            },
          });
          console.log(`    ✓ Created Productor record`);

          await prisma.tiendas.create({
            data: {
              id_productor: producer.id_productor,
              nombre: `${data.nombre}'s Store`,
              descripcion: 'Tienda de productos de ejemplo',
              pais_operacion: 'MX',
              status: 'activa',
            },
          });
          console.log(`    ✓ Created Tienda`);
        }
      }
    }

    console.log('\n=== Assigning Permisos to Productor Role ===');
    const productorRole = await prisma.roles.findUnique({ where: { nombre: 'productor' } });
    if (productorRole) {
      const permisoAdminReportes = await prisma.permisos.findUnique({ where: { nombre: 'ver_reportes' } });
      if (permisoAdminReportes) {
        await prisma.rol_permiso.deleteMany({
          where: { id_rol: productorRole.id_rol, id_permiso: permisoAdminReportes.id_permiso },
        });
      }
      for (const nombrePerm of PERMISOS_PRODUCTOR) {
        const permiso = createdPermisos[nombrePerm];
        if (!permiso) continue;
        const existing = await prisma.rol_permiso.findUnique({
          where: { id_rol_id_permiso: { id_rol: productorRole.id_rol, id_permiso: permiso.id_permiso } },
        });
        if (!existing) {
          await prisma.rol_permiso.create({
            data: { id_rol: productorRole.id_rol, id_permiso: permiso.id_permiso },
          });
          console.log(`  ✓ Linked: productor → ${nombrePerm}`);
        } else {
          console.log(`  ✓ Already linked: productor → ${nombrePerm}`);
        }
      }
    }

    console.log('\n=== Assigning Permisos to Cliente Role ===');
    const clienteRole = await prisma.roles.findUnique({ where: { nombre: 'cliente' } });
    if (clienteRole) {
      const permisoProductosProductor = await prisma.permisos.findUnique({ where: { nombre: 'ver_productos' } });
      if (permisoProductosProductor) {
        await prisma.rol_permiso.deleteMany({
          where: { id_rol: clienteRole.id_rol, id_permiso: permisoProductosProductor.id_permiso },
        });
      }
      for (const nombrePerm of PERMISOS_CLIENTE) {
        const permiso = createdPermisos[nombrePerm];
        if (!permiso) continue;
        const existing = await prisma.rol_permiso.findUnique({
          where: { id_rol_id_permiso: { id_rol: clienteRole.id_rol, id_permiso: permiso.id_permiso } },
        });
        if (!existing) {
          await prisma.rol_permiso.create({
            data: { id_rol: clienteRole.id_rol, id_permiso: permiso.id_permiso },
          });
          console.log(`  ✓ Linked: cliente → ${nombrePerm}`);
        } else {
          console.log(`  ✓ Already linked: cliente → ${nombrePerm}`);
        }
      }
    }

    console.log('\n✅ Roles seed completed successfully!');
  } catch (error) {
    console.error('\n❌ Error during seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
