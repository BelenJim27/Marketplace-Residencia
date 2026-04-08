import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTiendaDto {
  @IsInt()
  @Type(() => Number)
  id_productor!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  descripcion!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2)
  @IsIn(['MX', 'US', 'CA', 'ES'])
  pais_operacion!: string;

  @IsOptional()
  @IsString()
  @IsIn(['activo', 'inactivo'])
  status?: string;

  @IsOptional()
  @IsDateString()
  fecha_creacion?: string;
}

export class UpdateTiendaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  descripcion?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2)
  @IsIn(['MX', 'US', 'CA', 'ES'])
  pais_operacion?: string;

  @IsOptional()
  @IsString()
  @IsIn(['activo', 'inactivo'])
  status?: string;

  @IsOptional()
  @IsDateString()
  actualizado_en?: string;
}
