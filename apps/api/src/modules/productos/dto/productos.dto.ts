import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
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
  @Type(() => Number) @IsNumber() @Min(0.01) precio_base!: number;
  @IsOptional() @IsString() @MaxLength(3) moneda_base?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) peso_kg?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) alto_cm?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) ancho_cm?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) largo_cm?: number;
  @IsOptional() @IsString() @MaxLength(20) status?: string;
  @IsOptional() @IsString() creado_por?: string;
  @IsOptional() @IsString() actualizado_por?: string;
  @IsOptional() @IsString() @MaxLength(500) imagen_url?: string;
  @IsOptional() @IsString() @MaxLength(500) imagen_principal_url?: string;
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return value;
    const arr = Array.isArray(value) ? value : [value];
    return arr.map(Number);
  })
  @IsArray()
  categorias?: number[];
  @IsOptional() @IsNumberString() id_categoria?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) botellas_350ml?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) botellas_750ml?: number;
  @IsOptional() @IsArray() imagenes?: ProductoImagenDto[];
}

export class UpdateProductoDto extends PartialType(CreateProductoDto) {}
