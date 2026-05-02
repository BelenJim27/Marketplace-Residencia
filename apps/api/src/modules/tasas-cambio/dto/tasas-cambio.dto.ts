import { Type } from 'class-transformer';
import { IsDateString, IsNumberString, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateTasaCambioDto {
  @IsString()
  @Length(3, 3)
  moneda_origen!: string;

  @IsString()
  @Length(3, 3)
  moneda_destino!: string;

  @IsNumberString()
  tasa!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  fuente?: string;

  @IsOptional()
  @IsDateString()
  vigente_desde?: string;
}

export class ConvertirQueryDto {
  @IsString()
  @Length(3, 3)
  origen!: string;

  @IsString()
  @Length(3, 3)
  destino!: string;

  @IsNumberString()
  monto!: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;
}
