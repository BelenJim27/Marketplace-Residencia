import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { CreateArchivoDto, UpdateArchivoDto } from './dto/archivos.dto';
import { ArchivosService } from './archivos.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { Throttle } from '@nestjs/throttler';

const FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5 MB
// Subida de archivos es costosa (I/O + disco): límite por usuario más estricto que el global.
const UPLOAD_THROTTLE = { default: { limit: 20, ttl: 60_000 } };

const archivoStorage = memoryStorage();

@Controller('archivos')
export class ArchivosController {
  constructor(private readonly service: ArchivosService) {}

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  findAll(@Query('entidad_tipo') entidadTipo?: string, @Query('entidad_id') entidadId?: string) {
    return this.service.findAll(entidadTipo, entidadId ? Number(entidadId) : undefined);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('upload')
  @Throttle(UPLOAD_THROTTLE)
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('archivo', { storage: archivoStorage, limits: { fileSize: FILE_SIZE_LIMIT } }))
  async createWithUpload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateArchivoDto
  ) {
    if (!file) throw new BadRequestException('Archivo requerido');
    ensureAllowedFile(file.originalname);
    await ensureAllowedMime(file.buffer, file.originalname);

    const localUrl = await this.service.uploadToLocal(file.buffer, file.originalname);

    return this.service.create({
      ...dto,
      url: localUrl,
      tipo: dto.tipo?.trim() || inferTipo(file.originalname),
    });
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() dto: CreateArchivoDto) {
    return this.service.create(dto);
  }

  @Patch(':id/upload')
  @Throttle(UPLOAD_THROTTLE)
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('archivo', { storage: archivoStorage, limits: { fileSize: FILE_SIZE_LIMIT } }))
  async updateWithUpload(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UpdateArchivoDto
  ) {
    if (file) {
      ensureAllowedFile(file.originalname);
      await ensureAllowedMime(file.buffer, file.originalname);
    }

    return this.service.updateWithFile(id, dto, file ? {
      buffer: file.buffer,
      originalName: file.originalname,
    } : undefined);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateArchivoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

function normalizeExtension(fileName: string) {
  const extension = extname(fileName).toLowerCase();
  return extension || '.bin';
}

function inferTipo(fileName: string) {
  return normalizeExtension(fileName).replace('.', '').toUpperCase();
}

function ensureAllowedFile(fileName: string) {
  const extension = normalizeExtension(fileName);
  if (!['.pdf', '.png', '.jpg', '.jpeg', '.webp'].includes(extension)) {
    throw new BadRequestException('Solo se permiten archivos PDF o imagen');
  }
}

type MagicSig = readonly number[];

const MAGIC_SIGNATURES: Record<string, MagicSig[]> = {
  '.pdf': [[0x25, 0x50, 0x44, 0x46]],
  '.png': [[0x89, 0x50, 0x4E, 0x47]],
  '.jpg': [[0xFF, 0xD8, 0xFF]],
  '.jpeg': [[0xFF, 0xD8, 0xFF]],
  '.webp': [[0x52, 0x49, 0x46, 0x46]],
};

function matchesMagic(buffer: Buffer, sig: MagicSig): boolean {
  if (buffer.length < sig.length) return false;
  for (let i = 0; i < sig.length; i++) {
    if (buffer[i] !== sig[i]) return false;
  }
  return true;
}

async function ensureAllowedMime(buffer: Buffer, fileName: string): Promise<void> {
  const ext = normalizeExtension(fileName);
  const sigs = MAGIC_SIGNATURES[ext];
  if (!sigs) return;

  const ok = sigs.some(sig => matchesMagic(buffer, sig));
  if (!ok) {
    throw new BadRequestException(
      `El contenido del archivo no coincide con su extensión`,
    );
  }
}