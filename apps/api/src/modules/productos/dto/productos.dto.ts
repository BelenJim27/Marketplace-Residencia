import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ProductoImagenDto {
  @IsString() @MaxLength(500) url!: string;
  @IsOptional() @IsInt() @Type(() => Number) orden?: number;
  @IsOptional() @IsBoolean() es_principal?: boolean;
  @IsOptional() @IsString() @MaxLength(255) alt_text?: string;
}

export class CreateProductoDto {
  @IsInt() @Type(() => Number) id_tienda!: number;
  @IsOptional() @IsInt() @Type(() => Number) id_lote?: number;
  @IsString() @MaxLength(200) nombre!: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsObject() traducciones?: Record<string, unknown>;
  @IsNumberString() precio_base!: string;
  @IsOptional() @IsString() @MaxLength(3) moneda_base?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  @IsOptional() @IsNumberString() peso_kg?: string;
  @IsOptional() @IsNumberString() alto_cm?: string;
  @IsOptional() @IsNumberString() ancho_cm?: string;
  @IsOptional() @IsNumberString() largo_cm?: string;
  @IsOptional() @IsString() @MaxLength(20) status?: string;
  @IsOptional() @IsString() creado_por?: string;
  @IsOptional() @IsString() actualizado_por?: string;
  @IsOptional() @IsString() @MaxLength(500) imagen_principal_url?: string;
  @IsOptional() @IsArray() @Type(() => Number) categorias?: number[];
  @IsOptional() @IsArray() imagenes?: ProductoImagenDto[];
}

export class UpdateProductoDto extends PartialType(CreateProductoDto) {}
