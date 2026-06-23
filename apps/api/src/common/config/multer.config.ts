import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { isAbsolute, join, resolve, extname } from 'path';
import { diskStorage } from 'multer';

export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;
export const DOCUMENT_EXTENSIONS = [...IMAGE_EXTENSIONS, '.pdf'] as const;

export const PRODUCT_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
export const USER_PHOTO_MAX_SIZE = 5 * 1024 * 1024;
export const PRODUCER_PHOTO_MAX_SIZE = 500 * 1024;
export const DOCUMENT_MAX_SIZE = 5 * 1024 * 1024;

function getDefaultUploadsRoot(): string {
  return join(__dirname, '../../..', 'uploads');
}

export function getUploadsRoot(): string {
  const configuredRoot = process.env.UPLOADS_ROOT?.trim();
  if (!configuredRoot) return getDefaultUploadsRoot();
  return isAbsolute(configuredRoot)
    ? resolve(configuredRoot)
    : resolve(process.cwd(), configuredRoot);
}

export const UPLOADS_ROOT = getUploadsRoot();

export function getUploadDirectory(folder: string): string {
  const directory = join(UPLOADS_ROOT, folder);
  mkdirSync(directory, { recursive: true });
  return directory;
}

export function createUploadFilename(originalName: string): string {
  return `${randomUUID()}${extname(originalName).toLowerCase()}`;
}

export function createLocalUploadOptions(
  folder: string,
  maxFileSize: number,
  allowedExtensions: readonly string[],
): MulterOptions {
  const directory = getUploadDirectory(folder);

  return {
    storage: diskStorage({
      destination: (_req, _file, callback) => callback(null, directory),
      filename: (_req, file, callback) =>
        callback(null, createUploadFilename(file.originalname)),
    }),
    limits: { fileSize: maxFileSize },
    fileFilter: (_req, file, callback) => {
      const extension = extname(file.originalname).toLowerCase();
      if (!allowedExtensions.includes(extension)) {
        const allowed = allowedExtensions
          .map((item) => item.replace('.', '').toUpperCase())
          .join(', ');
        callback(
          new BadRequestException(`Formato no válido. Solo se permiten: ${allowed}.`),
          false,
        );
        return;
      }
      callback(null, true);
    },
  };
}

export const productImageOptions = createLocalUploadOptions(
  'productos',
  PRODUCT_IMAGE_MAX_SIZE,
  IMAGE_EXTENSIONS,
);

export const userPhotoOptions = createLocalUploadOptions(
  'usuarios',
  USER_PHOTO_MAX_SIZE,
  IMAGE_EXTENSIONS,
);

export const producerPhotoOptions = createLocalUploadOptions(
  'productores',
  PRODUCER_PHOTO_MAX_SIZE,
  IMAGE_EXTENSIONS,
);

export const documentUploadOptions = createLocalUploadOptions(
  'archivos',
  DOCUMENT_MAX_SIZE,
  DOCUMENT_EXTENSIONS,
);
