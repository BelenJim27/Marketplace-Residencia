import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const FALLBACK_FINAL = 'es';

export interface ResolveOpts {
  locale?: string;
  pais_iso2?: string;
}

@Injectable()
export class TraduccionesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula la cadena de fallback para un usuario:
   * locale solicitado → idioma_default del país → 'es'.
   * Devuelve los códigos en orden de preferencia, sin duplicados.
   */
  async cadenaFallback(opts: ResolveOpts): Promise<string[]> {
    const cadena: string[] = [];
    if (opts.locale) cadena.push(opts.locale);

    if (opts.pais_iso2) {
      const pais = await this.prisma.paises.findUnique({
        where: { iso2: opts.pais_iso2.toUpperCase() },
        select: { idioma_default: true },
      });
      if (pais?.idioma_default) cadena.push(pais.idioma_default);
    }

    if (!cadena.includes(FALLBACK_FINAL)) cadena.push(FALLBACK_FINAL);

    return Array.from(new Set(cadena));
  }

  async producto(id_producto: bigint, opts: ResolveOpts) {
    const cadena = await this.cadenaFallback(opts);
    const traducciones = await this.prisma.productos_traducciones.findMany({
      where: { id_producto, idioma: { in: cadena } },
    });
    return this.elegirPorCadena(traducciones, cadena, (t) => t.idioma);
  }

  async categoria(id_categoria: number, opts: ResolveOpts) {
    const cadena = await this.cadenaFallback(opts);
    const traducciones = await this.prisma.categorias_traducciones.findMany({
      where: { id_categoria, idioma: { in: cadena } },
    });
    return this.elegirPorCadena(traducciones, cadena, (t) => t.idioma);
  }

  async tienda(id_tienda: number, opts: ResolveOpts) {
    const cadena = await this.cadenaFallback(opts);
    const traducciones = await this.prisma.tiendas_traducciones.findMany({
      where: { id_tienda, idioma: { in: cadena } },
    });
    return this.elegirPorCadena(traducciones, cadena, (t) => t.idioma);
  }

  /**
   * Variante batch para productos: recibe N ids y devuelve un Map<id, traduccion>
   * resolviendo el fallback con una sola query.
   */
  async productosBatch(ids: bigint[], opts: ResolveOpts) {
    const cadena = await this.cadenaFallback(opts);
    const traducciones = await this.prisma.productos_traducciones.findMany({
      where: { id_producto: { in: ids }, idioma: { in: cadena } },
    });

    const result = new Map<string, typeof traducciones[number]>();
    const ranking = new Map(cadena.map((c, i) => [c, i] as const));

    for (const t of traducciones) {
      const key = t.id_producto.toString();
      const existing = result.get(key);
      const rankNuevo = ranking.get(t.idioma) ?? Infinity;
      const rankActual = existing ? (ranking.get(existing.idioma) ?? Infinity) : Infinity;
      if (!existing || rankNuevo < rankActual) {
        result.set(key, t);
      }
    }
    return result;
  }

  private elegirPorCadena<T>(items: T[], cadena: string[], pickIdioma: (item: T) => string): T | null {
    for (const codigo of cadena) {
      const match = items.find((it) => pickIdioma(it) === codigo);
      if (match) return match;
    }
    return null;
  }
}
