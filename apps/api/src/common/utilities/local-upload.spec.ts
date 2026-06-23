import { BadRequestException } from '@nestjs/common';
import { access, mkdir, rm, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import {
  DOCUMENT_MAX_SIZE,
  PRODUCER_PHOTO_MAX_SIZE,
  PRODUCT_IMAGE_MAX_SIZE,
  UPLOADS_ROOT,
  createUploadFilename,
  productImageOptions,
} from '../config/multer.config';
import {
  deleteLocalUpload,
  validateUploadedFileContent,
} from './local-upload';

const TEST_FOLDER = 'pruebas-uploads';
const TEST_ROOT = join(UPLOADS_ROOT, TEST_FOLDER);

function multerFile(path: string, originalname: string): Express.Multer.File {
  return {
    fieldname: 'archivo',
    originalname,
    encoding: '7bit',
    mimetype: 'application/octet-stream',
    size: 12,
    destination: dirname(path),
    filename: path.split(/[\\/]/).pop() ?? originalname,
    path,
    buffer: Buffer.alloc(0),
    stream: null as never,
  };
}

describe('almacenamiento local de uploads', () => {
  beforeEach(async () => {
    await mkdir(TEST_ROOT, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_ROOT, { recursive: true, force: true });
  });

  it('genera nombres UUID únicos y conserva la extensión normalizada', () => {
    const first = createUploadFilename('Foto.JPEG');
    const second = createUploadFilename('Foto.JPEG');

    expect(first).toMatch(/^[0-9a-f-]{36}\.jpeg$/);
    expect(second).toMatch(/^[0-9a-f-]{36}\.jpeg$/);
    expect(first).not.toBe(second);
  });

  it('mantiene los límites definidos para cada tipo de carga', () => {
    expect(PRODUCT_IMAGE_MAX_SIZE).toBe(5 * 1024 * 1024);
    expect(DOCUMENT_MAX_SIZE).toBe(5 * 1024 * 1024);
    expect(PRODUCER_PHOTO_MAX_SIZE).toBe(500 * 1024);
  });

  it('rechaza extensiones no permitidas con un mensaje en español', () => {
    const callback = jest.fn();
    productImageOptions.fileFilter?.(
      {} as never,
      { originalname: 'malware.exe' } as Express.Multer.File,
      callback,
    );

    expect(callback).toHaveBeenCalledWith(expect.any(BadRequestException), false);
  });

  it('valida la firma real de una imagen PNG', async () => {
    const path = join(TEST_ROOT, 'imagen.png');
    await writeFile(
      path,
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]),
    );

    await expect(
      validateUploadedFileContent(multerFile(path, 'imagen.png')),
    ).resolves.toBeUndefined();
  });

  it('rechaza contenido que no coincide con la extensión', async () => {
    const path = join(TEST_ROOT, 'falsa.png');
    await writeFile(path, Buffer.from('no-es-una-imagen'));

    await expect(
      validateUploadedFileContent(multerFile(path, 'falsa.png')),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('elimina rutas locales válidas y bloquea path traversal', async () => {
    const localPath = join(TEST_ROOT, 'borrar.png');
    const outsidePath = join(UPLOADS_ROOT, '..', 'no-borrar-upload-test.txt');
    await writeFile(localPath, 'archivo local');
    await writeFile(outsidePath, 'fuera de uploads');

    await deleteLocalUpload(`/uploads/${TEST_FOLDER}/borrar.png`);
    await deleteLocalUpload('/uploads/../no-borrar-upload-test.txt');

    await expect(access(localPath)).rejects.toBeDefined();
    await expect(access(outsidePath)).resolves.toBeUndefined();
    await rm(outsidePath, { force: true });
  });
});
