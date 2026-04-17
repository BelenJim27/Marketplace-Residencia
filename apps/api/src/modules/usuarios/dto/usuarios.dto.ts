import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateUsuarioDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  apellido_paterno?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  apellido_materno?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  biografia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  foto_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  idioma_preferido?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  moneda_preferida?: string;
}

export class UpdateUsuarioDto extends PartialType(CreateUsuarioDto) {}

export class AssignUsuarioRolDto {
  @IsInt()
  @Type(() => Number)
  id_rol!: number;
}
