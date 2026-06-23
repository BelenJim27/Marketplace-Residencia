import { BadRequestException, Logger } from '@nestjs/common';
import { open, unlink } from 'fs/promises';
import { extname, resolve, sep } from 'path';
import { UPLOADS_ROOT } from '../config/multer.config';

const HEADER_SIZE = 12;
const logger = new Logger('LocalUpload');

function isExpectedSignature(extension: string, header: Buffer): boolean {
  switch (extension) {
    case '.jpg':
    case '.jpeg':
      return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    case '.png':
      return header.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      );
    case '.webp':
      return header.subarray(0, 4).toString('ascii') === 'RIFF'
        && header.subarray(8, 12).toString('ascii') === 'WEBP';
    case '.pdf':
      return header.subarray(0, 4).toString('ascii') === '%PDF';
    default:
      return false;
  }
}

export async function validateUploadedFileContent(
  file: Express.Multer.File,
): Promise<void> {
  const handle = await open(file.path, 'r');
  try {
    const header = Buffer.alloc(HEADER_SIZE);
    const { bytesRead } = await handle.read(header, 0, HEADER_SIZE, 0);
    const extension = extname(file.originalname).toLowerCase();
    if (!isExpectedSignature(extension, header.subarray(0, bytesRead))) {
      throw new BadRequestException(
        'El contenido del archivo no coincide con su extensión',
      );
    }
  } finally {
    await handle.close();
  }
}

export function buildLocalUploadUrl(folder: string, filename: string): string {
  return `/uploads/${folder}/${filename}`;
}

export async function deleteUploadedFile(
  file?: Express.Multer.File | null,
): Promise<void> {
  if (!file?.path) return;
  await unlinkIgnoringMissing(file.path);
}

export async function deleteUploadedFiles(
  files: Express.Multer.File[] = [],
): Promise<void> {
  await Promise.all(files.map((file) => deleteUploadedFile(file)));
}

export async function deleteLocalUpload(url?: string | null): Promise<void> {
  if (!url || !url.startsWith('/uploads/')) return;

  const relativePath = url.slice('/uploads/'.length);
  if (!relativePath || relativePath.includes('\0')) return;

  const root = resolve(UPLOADS_ROOT);
  const target = resolve(root, relativePath);
  if (!target.startsWith(`${root}${sep}`)) return;

  await unlinkIgnoringMissing(target);
}

async function unlinkIgnoringMissing(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.warn(`No se pudo eliminar el archivo local: ${filePath}`);
    }
  }
}
