import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type DatabaseClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class SessionInvalidationService {
  constructor(private readonly prisma: PrismaService) {}

  async invalidateUsers(userIds: readonly string[], client: DatabaseClient = this.prisma): Promise<void> {
    const uniqueIds = [...new Set(userIds)].filter(Boolean);
    if (uniqueIds.length === 0) return;

    await client.usuarios.updateMany({
      where: { id_usuario: { in: uniqueIds } },
      data: { version_token: { increment: 1 } },
    });
    await client.refresh_tokens.updateMany({
      where: { id_usuario: { in: uniqueIds }, revocado_en: null },
      data: { revocado_en: new Date() },
    });
  }

  async invalidateUsersForRole(id_rol: number, client: DatabaseClient = this.prisma): Promise<void> {
    const relations = await client.usuario_rol.findMany({
      where: { id_rol, estado: 'activo' },
      select: { id_usuario: true },
    });
    await this.invalidateUsers(
      relations.map((relation) => relation.id_usuario),
      client,
    );
  }
}
