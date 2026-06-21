import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginacionQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pagina?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limite?: number = 20;

  // Allowed in endpoints that filter by productor (tiendas, lotes).
  // Declared here so forbidNonWhitelisted doesn't reject it when @Query() and @Query('id_productor') coexist.
  @IsOptional()
  @IsString()
  id_productor?: string;
}
