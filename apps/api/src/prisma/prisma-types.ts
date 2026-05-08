import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Decimal } from '@prisma/client/runtime/library';

export { PrismaClientKnownRequestError, Decimal };

/**
 * Utilidad para extraer tipos de los argumentos de Prisma automáticamente
 */
type GetArgs<T> = T extends { findMany: (args?: infer A) => any } ? NonNullable<A> : never;

// Extraemos el tipo 'where' e 'include' directamente de los delegados del cliente
export type productosWhereInput      = GetArgs<PrismaClient['productos']>['where'];
export type productosInclude         = GetArgs<PrismaClient['productos']>['include'];
export type comisionesWhereInput     = GetArgs<PrismaClient['comisiones']>['where'];
export type idiomasWhereInput        = GetArgs<PrismaClient['idiomas']>['where'];
export type paisesWhereInput         = GetArgs<PrismaClient['paises']>['where'];
export type payoutsWhereInput        = GetArgs<PrismaClient['payouts']>['where'];
export type tasas_cambioWhereInput   = GetArgs<PrismaClient['tasas_cambio']>['where'];
export type detalle_pedidoWhereInput = GetArgs<PrismaClient['detalle_pedido']>['where'];

// Para el JSON, Prisma lo exporta así usualmente:
export type InputJsonValue = Prisma.InputJsonValue;