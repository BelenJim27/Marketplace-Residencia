import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const FALLBACK_FINAL = 'es';

export interface ResolveOpts {
  locale?: string;
  pais_iso2?: string;
}

interface TraduccionResult {
  idioma: string;
  nombre: string | null;
  descripcion: string | null;
}

@Injectable()
export class TraduccionesService {
  constructor(private readonly prisma: PrismaService) {}

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

  async producto(id_producto: bigint, opts: ResolveOpts): Promise<TraduccionResult | null> {
    const cadena = await this.cadenaFallback(opts);
    const prod = await this.prisma.productos.findUnique({
      where: { id_producto },
      select: { traducciones: true, nombre: true, descripcion: true },
    });
    if (!prod) return null;

    const json = prod.traducciones as Record<string, { nombre?: string; descripcion?: string }> | null;
    for (const codigo of cadena) {
      const t = json?.[codigo];
      if (t?.nombre) {
        return { idioma: codigo, nombre: t.nombre ?? null, descripcion: t.descripcion ?? null };
      }
    }
    return { idioma: 'es', nombre: prod.nombre, descripcion: prod.descripcion ?? null };
  }

  async categoria(_id_categoria: number, _opts: ResolveOpts): Promise<TraduccionResult | null> {
    return null;
  }

  async tienda(_id_tienda: number, _opts: ResolveOpts): Promise<TraduccionResult | null> {
    return null;
  }

  async productosBatch(ids: bigint[], opts: ResolveOpts): Promise<Map<string, TraduccionResult>> {
    const cadena = await this.cadenaFallback(opts);
    const prods = await this.prisma.productos.findMany({
      where: { id_producto: { in: ids } },
      select: { id_producto: true, traducciones: true, nombre: true, descripcion: true },
    });

    const result = new Map<string, TraduccionResult>();
    const ranking = new Map(cadena.map((c, i) => [c, i] as const));

    for (const prod of prods) {
      const key = prod.id_producto.toString();
      const json = prod.traducciones as Record<string, { nombre?: string; descripcion?: string }> | null;

      let best: TraduccionResult | null = null;
      let bestRank = Infinity;

      for (const codigo of cadena) {
        const rank = ranking.get(codigo) ?? Infinity;
        if (rank < bestRank) {
          const t = json?.[codigo];
          if (t?.nombre) {
            best = { idioma: codigo, nombre: t.nombre, descripcion: t.descripcion ?? null };
            bestRank = rank;
          }
        }
      }

      result.set(key, best ?? { idioma: 'es', nombre: prod.nombre, descripcion: prod.descripcion ?? null });
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
