/**
 * sync-uploads.mjs — Hace commit y push de las imágenes nuevas en apps/api/uploads/
 * Uso: npm run sync:uploads
 *      npm run sync:uploads -- --no-push   (solo commit, sin push)
 */

import { execSync } from 'child_process';

const noPush = process.argv.includes('--no-push');

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

// Verificar si hay archivos nuevos o modificados en uploads
let status;
try {
  run('git add -f apps/api/uploads/');
  status = run('git diff --cached --name-only -- apps/api/uploads/');
} catch (e) {
  console.error('Error al verificar git status:', e.message);
  process.exit(1);
}

if (!status) {
  console.log('✓ No hay imágenes nuevas para sincronizar.');
  process.exit(0);
}

const files = status.split('\n').filter(Boolean);
console.log(`Sincronizando ${files.length} archivo(s):`);
files.forEach(f => console.log(`  + ${f}`));

const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
const message = `sync: uploads [${timestamp}]`;

try {
  run(`git commit -m "${message}"`);
  console.log(`✓ Commit creado: "${message}"`);
} catch (e) {
  console.error('Error al crear commit:', e.message);
  process.exit(1);
}

if (!noPush) {
  try {
    run('git push');
    console.log('✓ Push completado. El otro colaborador puede hacer git pull para obtener las imágenes.');
  } catch (e) {
    console.error('Error al hacer push:', e.message);
    console.log('Corre manualmente: git push');
    process.exit(1);
  }
}
