import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumberString, IsOptional, IsString, Length, MaxLength, Min } from 'class-validator';

export class CreateComisionDto {
  @IsIn(['global', 'pais', 'categoria', 'productor'])
  alcance!: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  pais_iso2?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  id_categoria?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  id_productor?: number;

  @IsNumberString()
  porcentaje!: string;

  @IsOptional()
  @IsNumberString()
  monto_fijo?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  moneda_monto_fijo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  prioridad?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  activo?: boolean;
}

export class UpdateComisionDto extends PartialType(CreateComisionDto) {}

export class ResolverComisionQueryDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  id_productor?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  id_categoria?: number;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  pais_iso2?: string;
}
