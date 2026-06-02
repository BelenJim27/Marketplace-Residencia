import { IsDateString, IsEnum, IsNumberString, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export enum Moneda {
  MXN = 'MXN',
  USD = 'USD',
}

export class CreateTasaCambioDto {
  @IsEnum(Moneda)
  moneda_origen!: Moneda;

  @IsEnum(Moneda)
  moneda_destino!: Moneda;

  @IsNumberString()
  @Matches(/^[0-9]+(\.[0-9]+)?$/, { message: 'tasa debe ser un número positivo' })
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
  @IsEnum(Moneda)
  origen!: Moneda;

  @IsEnum(Moneda)
  destino!: Moneda;

  @IsNumberString()
  monto!: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;
}
