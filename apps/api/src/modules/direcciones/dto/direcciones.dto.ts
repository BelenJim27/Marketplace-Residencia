import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsIn, IsOptional, IsString, Length, Matches, MaxLength, ValidateIf } from 'class-validator';
import { US_STATE_CODES, US_ZIP_REGEX } from '../us-states';

// Returns true when this address targets the United States, so US-specific
// validators (ZIP format, state code) only fire for US addresses and never
// interfere with Mexican/other addresses.
const esUS = (o: CreateDireccionDto) => (o.pais_iso2 ?? '').toUpperCase() === 'US';

export class CreateDireccionDto {
  @IsString() id_usuario!: string;
  @IsOptional() @IsString() @MaxLength(150) nombre_destinatario?: string | null;
  @IsOptional() @IsString() @MaxLength(30) telefono?: string | null;
  @IsOptional() @IsBoolean() es_predeterminada?: boolean;
  @IsOptional() @IsBoolean() es_internacional?: boolean;

  // Campos para direcciones nacionales (México)
  @IsOptional() @IsString() @MaxLength(200) calle?: string | null;
  @IsOptional() @IsString() @MaxLength(20) numero?: string | null;
  @IsOptional() @IsString() @MaxLength(150) colonia?: string | null;

  // Campos para direcciones internacionales
  @IsOptional() @IsString() @MaxLength(200) linea_1?: string | null;
  @IsOptional() @IsString() @MaxLength(200) linea_2?: string | null;

  // Campos comunes
  // Para direcciones de EE.UU. la ciudad es obligatoria (los carriers la requieren);
  // para otros países es opcional. Se valida si es US o si viene un valor.
  @ValidateIf((o) => esUS(o) || o.ciudad != null) @IsString() @MaxLength(100) ciudad?: string | null;
  // Estado: para EE.UU. debe ser un código USPS de 2 letras; para otros países, texto libre.
  @ValidateIf(esUS)
  @IsIn(US_STATE_CODES as unknown as string[], { message: 'estado debe ser un código de estado de EE.UU. de 2 letras (ej. CA, TX, NY)' })
  estado?: string | null;
  // Código postal: para EE.UU. debe cumplir formato ZIP (#####  o  #####-####).
  @ValidateIf(esUS)
  @Matches(US_ZIP_REGEX, { message: 'codigo_postal debe ser un ZIP de EE.UU. válido (##### o #####-####)' })
  codigo_postal?: string | null;
  @IsOptional() @IsString() @Length(2, 2) pais_iso2?: string | null;
  @IsOptional() @IsString() referencia?: string | null;
  @IsOptional() @IsString() @MaxLength(20) tipo?: string | null;
}
export class UpdateDireccionDto extends PartialType(CreateDireccionDto) {}
