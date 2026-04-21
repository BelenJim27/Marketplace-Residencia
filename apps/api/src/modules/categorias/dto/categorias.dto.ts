import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCategoriaDto {
  @IsOptional() @IsInt() @Type(() => Number) id_padre?: number;
  @IsString() @MaxLength(150) nombre!: string;
  @IsString() @MaxLength(150) slug!: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsString() @MaxLength(50) tipo?: string;
  @IsOptional() @IsString() @MaxLength(500) imagen_url?: string;
  @IsOptional() @IsBoolean() activo?: boolean;
}

export class UpdateCategoriaDto extends PartialType(CreateCategoriaDto) {}