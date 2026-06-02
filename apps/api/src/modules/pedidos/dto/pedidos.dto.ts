import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsObject, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

export enum Moneda {
  MXN = 'MXN',
  USD = 'USD',
}

export class CreatePedidoDto {
  @IsString() id_usuario!: string;
  @IsOptional() @IsString() @MaxLength(30) estado?: string;
  @IsString() total!: string;
  @IsEnum(Moneda) moneda!: Moneda;
  @IsOptional() @IsString() tipo_cambio?: string;
  @IsOptional() @IsEnum(Moneda) moneda_referencia?: Moneda;
  @IsOptional() @IsString() @MaxLength(2) pais_destino_iso2?: string;
  @IsOptional() @IsObject() direccion_envio_snapshot?: Record<string, unknown>;
  @IsOptional() @IsObject() direccion_facturacion_snapshot?: Record<string, unknown>;
  @IsOptional() @IsString() @MaxLength(20) devolucion_estado?: string;
  @IsOptional() @IsString() devolucion_motivo?: string;
}
export class UpdatePedidoDto extends PartialType(CreatePedidoDto) {}

export class CreateDetallePedidoDto {
  @IsInt() @Type(() => Number) id_producto!: number;
  @IsInt() @Type(() => Number) cantidad!: number;
  @IsString() precio_compra!: string;
  @IsOptional() @IsEnum(Moneda) moneda_compra?: Moneda;
  @IsOptional() @IsString() impuesto?: string;
}
export class UpdateDetallePedidoDto extends PartialType(CreateDetallePedidoDto) {}

export class CreateFacturaDto {
  @IsOptional() @IsString() uuid_fiscal?: string;
  @IsOptional() @IsString() pdf_url?: string;
  @IsOptional() @IsString() xml_url?: string;
  @IsOptional() @IsString() rfc_emisor?: string;
  @IsOptional() @IsString() rfc_receptor?: string;
  @IsOptional() @IsString() @MaxLength(10) uso_cfdi?: string;
  @IsOptional() @IsString() @MaxLength(10) regimen_fiscal?: string;
  @IsOptional() @IsString() subtotal?: string;
  @IsOptional() @IsString() impuestos_total?: string;
  @IsOptional() @IsString() total?: string;
  @IsOptional() @IsEnum(Moneda) moneda?: Moneda;
  @IsOptional() @IsString() @MaxLength(20) estado?: string;
}
export class UpdateFacturaDto extends PartialType(CreateFacturaDto) {}

export class ItemValidarDto {
  @IsInt() @Type(() => Number) id_producto!: number;
  @IsInt() @Type(() => Number) cantidad!: number;
}

export class ValidarEnvioDto {
  @IsString() @MaxLength(2) pais_iso2!: string;
  @IsOptional() @IsString() @MaxLength(10) estado_codigo?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ItemValidarDto) items!: ItemValidarDto[];
}
