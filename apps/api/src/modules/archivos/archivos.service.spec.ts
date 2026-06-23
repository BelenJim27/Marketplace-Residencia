import { access, mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { UPLOADS_ROOT } from '../../common/config/multer.config';
import { ArchivosService } from './archivos.service';

const ARCHIVOS_DIR = join(UPLOADS_ROOT, 'archivos');
const OLD_FILENAME = 'archivo-anterior-prueba.png';
const OLD_PATH = join(ARCHIVOS_DIR, OLD_FILENAME);
const OLD_URL = `/uploads/archivos/${OLD_FILENAME}`;
const NEW_URL = '/uploads/archivos/archivo-nuevo-prueba.png';

describe('ArchivosService — reemplazo seguro de archivo local', () => {
  const prisma = {
    archivos: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const service = new ArchivosService(prisma as never);

  beforeEach(async () => {
    jest.clearAllMocks();
    await mkdir(ARCHIVOS_DIR, { recursive: true });
    await writeFile(OLD_PATH, 'archivo anterior');
    prisma.archivos.findUnique.mockResolvedValue({
      id_archivo: 1n,
      url: OLD_URL,
    });
  });

  afterEach(async () => {
    await rm(OLD_PATH, { force: true });
  });

  it('conserva el archivo anterior si falla la actualización en Neon', async () => {
    prisma.archivos.update.mockRejectedValue(new Error('Error de base de datos'));

    await expect(
      service.updateWithFile('1', {}, NEW_URL),
    ).rejects.toThrow('Error de base de datos');
    await expect(access(OLD_PATH)).resolves.toBeUndefined();
  });

  it('elimina el archivo anterior después de una actualización exitosa', async () => {
    prisma.archivos.update.mockResolvedValue({
      id_archivo: 1n,
      url: NEW_URL,
    });

    await service.updateWithFile('1', {}, NEW_URL);

    await expect(access(OLD_PATH)).rejects.toBeDefined();
  });
});
