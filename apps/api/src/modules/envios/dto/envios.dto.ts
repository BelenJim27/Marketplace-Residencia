import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class CreateEnvioDto {
  @IsInt() @Type(() => Number) id_pedido!: number;
  @IsOptional() @IsInt() @Type(() => Number) id_transportista?: number;
  @IsOptional() @IsInt() @Type(() => Number) id_servicio?: number;
  @IsOptional() @IsString() numero_rastreo?: string;
  @IsOptional() @IsString() valor_declarado_aduana?: string;
  @IsOptional() @IsString() @MaxLength(3) moneda_aduana?: string;
  @IsOptional() @IsString() codigo_hs?: string;
  @IsOptional() @IsString() peso_kg?: string;
  @IsOptional() @IsString() alto_cm?: string;
  @IsOptional() @IsString() ancho_cm?: string;
  @IsOptional() @IsString() largo_cm?: string;
  @IsOptional() @IsString() costo_envio?: string;
  @IsOptional() @IsString() @MaxLength(3) moneda_costo?: string;
  @IsOptional() @IsString() @MaxLength(30) estado?: string;
  @IsOptional() @IsDateString() fecha_envio?: string;
  @IsOptional() @IsDateString() fecha_entrega_estimada?: string;
  @IsOptional() @IsDateString() fecha_entrega?: string;
}
export class UpdateEnvioDto extends PartialType(CreateEnvioDto) {}

export class DireccionDestinoDto {
  @IsString() pais!: string;
  @IsString() ciudad!: string;
  @IsString() estado!: string;
  @IsString() codigo_postal!: string;
}

export class CotizarEnvioDto {
  @ValidateNested() @Type(() => DireccionDestinoDto) destino!: DireccionDestinoDto;
  @IsNumber() @Type(() => Number) peso_kg!: number;
  @IsOptional() @IsNumber() @Type(() => Number) alto_cm?: number;
  @IsOptional() @IsNumber() @Type(() => Number) ancho_cm?: number;
  @IsOptional() @IsNumber() @Type(() => Number) largo_cm?: number;
  @IsOptional() @IsInt() @Type(() => Number) id_pedido?: number;
}
