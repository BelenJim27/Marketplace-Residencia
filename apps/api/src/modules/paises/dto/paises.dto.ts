import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Length, MaxLength, Min } from 'class-validator';

export class CreatePaisDto {
  @IsString()
  @Length(2, 2)
  iso2!: string;

  @IsString()
  @Length(3, 3)
  iso3!: string;

  @IsString()
  @MaxLength(120)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre_local?: string;

  @IsString()
  @Length(3, 3)
  moneda_default!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  idioma_default?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  prefijo_telefono?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  activo_venta?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  activo_envio?: boolean;
}

export class UpdatePaisDto extends PartialType(CreatePaisDto) {}

export class ListPaisesQueryDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  activo_venta?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  activo_envio?: boolean;
}
