import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class GenerarPayoutsDto {
  @IsDateString()
  desde!: string;

  @IsDateString()
  hasta!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  estados_validos?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  proveedor?: string;
}

export class UpdatePayoutEstadoDto {
  @IsIn(['pendiente', 'en_proceso', 'pagado', 'fallido', 'cancelado'])
  estado!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  referencia_externa?: string;

  @IsOptional()
  @IsString()
  notas?: string;
}

export class ListPayoutsQueryDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  id_productor?: number;

  @IsOptional()
  @IsString()
  estado?: string;
}
