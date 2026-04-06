import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePagoDto {
  @IsInt() @Type(() => Number) id_pedido!: number;
  @IsOptional() @IsString() proveedor?: string;
  @IsOptional() @IsString() payment_intent_id?: string;
  @IsOptional() @IsString() @MaxLength(50) estado?: string;
  @IsString() monto!: string;
  @IsString() @MaxLength(3) moneda!: string;
}
export class UpdatePagoDto extends PartialType(CreatePagoDto) {}

export class CreateMonedaDto {
  @IsString() @MaxLength(3) codigo!: string;
  @IsString() @MaxLength(100) nombre!: string;
  @IsOptional() @IsString() @MaxLength(10) simbolo?: string;
  @IsOptional() @IsBoolean() activo?: boolean;
}
export class UpdateMonedaDto extends PartialType(CreateMonedaDto) {}
