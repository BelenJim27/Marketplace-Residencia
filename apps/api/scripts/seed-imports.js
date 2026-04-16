const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const prisma = new PrismaClient();

async function loadCSV(fileName, modelName) {
  const results = [];
  const filePath = path.join(__dirname, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log(` Archivo no encontrado: ${fileName}`);
    return;
  }

  // Buscamos el modelo en el cliente de Prisma (insensible a mayúsculas)
  const actualModel = Object.keys(prisma).find(
    key => key.toLowerCase() === modelName.toLowerCase()
  );

  if (!actualModel) {
    console.error(` El modelo '${modelName}' no existe en Prisma.`);
    return;
  }

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        const cleanedData = {};
        Object.keys(data).forEach(key => {
          let value = data[key];
          
          if (value === 'NULL' || value === '' || value === undefined) {
            value = null;
          } 
          // 1. Manejo estricto de Fechas
          else if (key.includes('fecha') || key.includes('_en') || key === 'fecha_registro' || key === 'fecha_asignacion' || key === 'fecha_creacion') {
            const date = new Date(value);
            value = isNaN(date.getTime()) ? null : date;
          }
          // 2. Manejo de Números (IDs y Tokens)
          else if (key === 'version_token' || key === 'id_rol' || key === 'id_permiso' || key === 'id_region' || key === 'id_productor') {
            if (value !== null) value = parseInt(value, 10);
          }

          cleanedData[key] = value;
        });
        results.push(cleanedData);
      })
      .on('end', async () => {
        try {
          console.log(` Intentando cargar ${results.length} registros en '${actualModel}'...`);
          
          // Usamos un loop para asegurar que cada uno se intente insertar
          for (const item of results) {
            await prisma[actualModel].upsert({
              where: { 
                // Esto asume que el ID es la llave primaria. 
                // Ajusta 'id_rol' o el nombre del ID según tu schema si falla.
                [Object.keys(item)[0]]: item[Object.keys(item)[0]] 
              },
              update: item,
              create: item,
            });
          }
          
          console.log(` ${actualModel} sincronizado correctamente.`);
          resolve();
        } catch (error) {
          console.error(` Error en ${actualModel}:`, error.message);
          resolve(); 
        }
      });
  });
}

async function main() {
  try {
    console.log('--- Iniciando Sincronización con Neon ---');

    // Nombres de tablas basados en tu última ejecución
    await loadCSV('roles.csv', 'roles'); 
    await loadCSV('usuarios.csv', 'usuarios');
    await loadCSV('usuario_rol.csv', 'usuario_rol');
    await loadCSV('rol_permiso.csv', 'rol_permiso');
    await loadCSV('productores.csv', 'productores'); 

    console.log('---  Proceso terminado ---');
  } catch (e) {
    console.error('Error fatal:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();