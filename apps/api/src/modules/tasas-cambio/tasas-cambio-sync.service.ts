import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Moneda } from './dto/tasas-cambio.dto';
import { TasasCambioService } from './tasas-cambio.service';

@Injectable()
export class TasasCambioSyncService {
  private readonly logger = new Logger(TasasCambioSyncService.name);

  constructor(
    private readonly tasasService: TasasCambioService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sincronizarTasas() {
    try {
      const apiKey = this.configService.get<string>('EXCHANGERATE_API_KEY');
      if (!apiKey) {
        this.logger.warn('EXCHANGERATE_API_KEY not configured, skipping sync');
        return;
      }

      const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/MXN`;
      const response = await firstValueFrom(this.httpService.get<any>(url));
      const { conversion_rates } = response.data;

      const now = new Date();
      const pares: { destino: Moneda; tasa: number }[] = [
        { destino: Moneda.USD, tasa: conversion_rates.USD },
      ];

      for (const par of pares) {
        await this.tasasService.create({
          moneda_origen: Moneda.MXN,
          moneda_destino: par.destino,
          tasa: String(par.tasa),
          vigente_desde: now.toISOString(),
          fuente: 'exchangerate-api',
        });
        this.logger.log(`Updated rate: MXN → ${par.destino} = ${par.tasa}`);
      }

      this.logger.debug(`Exchange rates synced at ${now.toISOString()}`);
    } catch (error: any) {
      const status = error?.response?.status ?? error?.status;
      if (status === 429) {
        this.logger.warn('ExchangeRate-API rate limit reached (429) — keeping existing DB rates until next cycle');
      } else {
        this.logger.error(`Error syncing exchange rates: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
}
