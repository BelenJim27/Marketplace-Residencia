import { mkdirSync } from 'fs';
import { extname, join } from 'path';
import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, ParseUUIDPipe, ParseIntPipe, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { AssignUsuarioRolDto, CreateUsuarioDto, UpdateUsuarioDto } from './dto/usuarios.dto';
import { UsuariosService } from './usuarios.service';

const userPhotoStorage = diskStorage({
  destination: (_req, _file, callback) => {
    const uploadPath = join(process.cwd(), 'uploads', 'usuarios');
    mkdirSync(uploadPath, { recursive: true });
    callback(null, uploadPath);
  },
  filename: (_req, file, callback) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `usuario-${uniqueSuffix}${extname(file.originalname) || '.jpg'}`);
  },
});

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUsuarioDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUsuarioDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/foto')
  @UseInterceptors(FileInterceptor('foto', { storage: userPhotoStorage }))
  uploadPhoto(@Param('id', ParseUUIDPipe) id: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Archivo de foto requerido');
    }

    return this.service.update(id, { foto_url: `/uploads/usuarios/${file.filename}` });
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @Post(':id/roles')
  addRole(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignUsuarioRolDto) {
    return this.service.addRole(id, dto.id_rol);
  }

  @Delete(':id/roles/:id_rol')
  removeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('id_rol', ParseIntPipe) id_rol: number,
  ) {
    return this.service.removeRole(id, id_rol);
  }
}
