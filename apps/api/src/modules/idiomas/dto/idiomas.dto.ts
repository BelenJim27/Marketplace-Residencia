import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateIdiomaDto {
  @IsString()
  @MaxLength(10)
  codigo!: string;

  @IsString()
  @MaxLength(80)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  nombre_local?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  activo?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  rtl?: boolean;
}

export class UpdateIdiomaDto extends PartialType(CreateIdiomaDto) {}
