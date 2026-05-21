import sharp from "sharp";
import { readdir, stat, rename } from "fs/promises";
import { join, extname, basename } from "path";

const PUBLIC_DIR = new URL("../apps/web/public", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const MAX_BYTES = 500 * 1024;

async function getFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) files.push(...(await getFiles(full)));
    else files.push(full);
  }
  return files;
}

const SUPPORTED = new Set([".jpg", ".jpeg", ".png", ".webp"]);

async function compress(file) {
  const ext = extname(file).toLowerCase();
  if (!SUPPORTED.has(ext)) return;

  const { size } = await stat(file);
  if (size <= MAX_BYTES) return;

  const sizeBefore = (size / 1024).toFixed(1);
  const tmp = file + ".tmp";

  try {
    const img = sharp(file);
    const meta = await img.metadata();

    let pipeline = img;

    // Resize if very large (keep aspect ratio, max 1200px wide)
    if (meta.width && meta.width > 1200) {
      pipeline = pipeline.resize({ width: 1200, withoutEnlargement: true });
    }

    // Output format + quality
    if (ext === ".png") {
      pipeline = pipeline.png({ compressionLevel: 9, quality: 80 });
    } else if (ext === ".webp") {
      pipeline = pipeline.webp({ quality: 75 });
    } else {
      pipeline = pipeline.jpeg({ quality: 75, mozjpeg: true });
    }

    await pipeline.toFile(tmp);

    const { size: newSize } = await stat(tmp);

    // Only replace if it actually got smaller
    if (newSize < size) {
      await rename(tmp, file);
      console.log(`✓ ${basename(file)}: ${sizeBefore} KB → ${(newSize / 1024).toFixed(1)} KB`);
    } else {
      // Try with lower quality
      let pipeline2 = sharp(file);
      if (meta.width && meta.width > 1200) pipeline2 = pipeline2.resize({ width: 1200, withoutEnlargement: true });
      if (ext === ".png") pipeline2 = pipeline2.png({ compressionLevel: 9, quality: 60 });
      else if (ext === ".webp") pipeline2 = pipeline2.webp({ quality: 60 });
      else pipeline2 = pipeline2.jpeg({ quality: 60, mozjpeg: true });

      await pipeline2.toFile(tmp);
      const { size: s2 } = await stat(tmp);
      await rename(tmp, file);
      console.log(`✓ ${basename(file)}: ${sizeBefore} KB → ${(s2 / 1024).toFixed(1)} KB (q60)`);
    }
  } catch (err) {
    console.error(`✗ ${basename(file)}: ${err.message}`);
    // clean up tmp if it exists
    try { await rename(tmp, tmp + ".fail"); } catch {}
  }
}

const files = await getFiles(PUBLIC_DIR);
console.log(`Escaneando ${files.length} archivos en public/...\n`);
for (const f of files) await compress(f);
console.log("\nListo.");
