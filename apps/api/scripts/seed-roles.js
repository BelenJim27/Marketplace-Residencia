require('dotenv').config();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

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

async function main() {
  console.log('🌱 Starting roles seed...\n');

  try {
    console.log('=== Creating Roles ===');
    const existingRoles = await prisma.roles.findMany();
    console.log(`  Found ${existingRoles.length} existing roles`);

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
    const PERMISOS = [
      { nombre: 'gestionar_usuarios' },
      { nombre: 'gestionar_productos' },
      { nombre: 'gestionar_pedidos' },
      { nombre: 'gestionar_categorias' },
      { nombre: 'ver_reportes' },
      { nombre: 'gestionar_productores' },
    ];

    for (const perm of PERMISOS) {
      const existing = await prisma.permisos.findUnique({ where: { nombre: perm.nombre } });
      if (existing) {
        console.log(`  ✓ Already exists: ${perm.nombre}`);
      } else {
        await prisma.permisos.create({ data: perm });
        console.log(`  ✓ Created: ${perm.nombre}`);
      }
    }

    console.log('\n=== Assigning Permisos to Roles ===');
    const adminRole = await prisma.roles.findUnique({ where: { nombre: 'administrador' } });
    const permisosAdmin = ['gestionar_usuarios', 'gestionar_productos', 'gestionar_pedidos', 'gestionar_categorias', 'ver_reportes', 'gestionar_productores'];
    
    if (adminRole) {
      for (const nombrePerm of permisosAdmin) {
        const permiso = await prisma.permisos.findUnique({ where: { nombre: nombrePerm } });
        if (permiso) {
          const existing = await prisma.rol_permiso.findUnique({
            where: { id_rol_id_permiso: { id_rol: adminRole.id_rol, id_permiso: permiso.id_permiso } },
          });
          if (existing) {
            console.log(`  ✓ Already linked: administrador → ${nombrePerm}`);
          } else {
            await prisma.rol_permiso.create({
              data: { id_rol: adminRole.id_rol, id_permiso: permiso.id_permiso },
            });
            console.log(`  ✓ Linked: administrador → ${nombrePerm}`);
          }
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

    console.log('\n✅ Roles seed completed successfully!');
  } catch (error) {
    console.error('\n❌ Error during seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();