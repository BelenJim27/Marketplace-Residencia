import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Matches, MaxLength, Min, ValidateNested } from 'class-validator';

export enum Moneda {
  MXN = 'MXN',
  USD = 'USD',
}

export class CreatePagoDto {
  @IsInt() @Type(() => Number) id_pedido!: number;
  @IsOptional() @IsString() proveedor?: string;
  @IsOptional() @IsString() payment_intent_id?: string;
  @IsOptional() @IsString() @MaxLength(50) estado?: string;
  @IsString() @Matches(/^\d+(\.\d{1,6})?$/, { message: 'monto debe ser un número decimal positivo' }) monto!: string;
  @IsEnum(Moneda) moneda!: Moneda;
}
export class UpdatePagoDto extends PartialType(CreatePagoDto) {}

export class StripeShippingAddressDto {
  @IsString() line1!: string;
  @IsOptional() @IsString() line2?: string;
  @IsString() city!: string;
  @IsString() @MaxLength(100) state!: string;
  @IsString() @MaxLength(20) postal_code!: string;
  @IsString() @Length(2, 2) country!: string;
}

export class CreateStripeIntentDto {
  @IsString() id_pedido!: string;
  @IsNumber() @Min(0.01) @Type(() => Number) subtotal!: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) shipping_amount?: number;
  @IsEnum(Moneda) moneda!: Moneda;
  @ValidateNested() @Type(() => StripeShippingAddressDto) shipping_address!: StripeShippingAddressDto;
  @IsOptional() @IsString() recipient_name?: string;
  @IsOptional() @IsString() customer_id?: string;
}

export class CreatePaypalOrderDto {
  @IsString() id_pedido!: string;
  @IsNumber() @Min(0.01) @Type(() => Number) subtotal!: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) shipping_amount?: number;
  @IsEnum(Moneda) moneda!: Moneda;
  @IsOptional() @ValidateNested() @Type(() => StripeShippingAddressDto) shipping_address?: StripeShippingAddressDto;
}

export class CapturePaypalOrderDto {
  @IsString() paypal_order_id!: string;
}
