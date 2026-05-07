import { Headers, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateEnvioDto, UpdateEnvioDto, CotizarEnvioDto } from './dto/envios.dto';
import { EnviosService } from './envios.service';
import { FedexService } from './fedex.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { ShippingQuote } from './interfaces/carrier.interface';

@Controller('envios')
export class EnviosController {
  constructor(
    private readonly service: EnviosService,
    private readonly fedexService: FedexService,
    private readonly config: ConfigService,
  ) {}

  @Get() findAll() { return this.service.findAll(); }
  @Get(':id/tracking') getTracking(@Param('id') id: string) { return this.service.getTracking(id); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateEnvioDto) { return this.service.create(dto); }

  @Post('cotizar')
  @UseGuards(AuthGuard)
  async cotizar(@Body() dto: CotizarEnvioDto, @Query('carrier') carrier = 'all'): Promise<ShippingQuote[]> {
    const adultSig = dto.adult_signature ?? false;
    try {
      const quotes = await this.fedexService.cotizarEnvio(dto, adultSig);
      if (quotes.length === 0) {
        throw new HttpException(
          { message: 'FedEx: sin tarifas disponibles para esta dirección' },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
      return quotes;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      const msg = (err as any)?.message || 'Error al cotizar con FedEx';
      throw new HttpException({ message: msg }, HttpStatus.UNPROCESSABLE_ENTITY);
    }
  }

  @Post('cotizaciones') @UseGuards(AuthGuard)
  guardarCotizacion(@Body() data: any) { return this.service.guardarCotizacion(data.id_pedido, data); }

  @Post('webhook/fedex')
  registrarEventoFedex(
    @Body() data: any,
    @Headers('x-fedex-secret') secret: string,
  ) {
    if (secret !== this.config.get('FEDEX_WEBHOOK_SECRET')) {
      throw new UnauthorizedException('Invalid FedEx webhook secret');
    }
    return this.service.registrarEvento(
      String(data.id_envio),
      data.descripcion,
      data.estado,
      data.fecha ? new Date(data.fecha) : undefined,
    );
  }

  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateEnvioDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
