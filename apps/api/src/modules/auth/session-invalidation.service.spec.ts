import { SessionInvalidationService } from './session-invalidation.service';

describe('SessionInvalidationService', () => {
  it('incrementa version y revoca refresh tokens para usuarios únicos', async () => {
    const prisma = {
      usuarios: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
      refresh_tokens: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
    } as any;
    const service = new SessionInvalidationService(prisma);

    await service.invalidateUsers(['u1', 'u1', 'u2']);

    expect(prisma.usuarios.updateMany).toHaveBeenCalledWith({
      where: { id_usuario: { in: ['u1', 'u2'] } },
      data: { version_token: { increment: 1 } },
    });
    expect(prisma.refresh_tokens.updateMany).toHaveBeenCalledWith({
      where: { id_usuario: { in: ['u1', 'u2'] }, revocado_en: null },
      data: { revocado_en: expect.any(Date) },
    });
  });

  it('invalida a todos los usuarios activos de un rol', async () => {
    const prisma = {
      usuario_rol: {
        findMany: jest.fn().mockResolvedValue([{ id_usuario: 'u1' }, { id_usuario: 'u2' }]),
      },
      usuarios: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
      refresh_tokens: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
    } as any;
    const service = new SessionInvalidationService(prisma);

    await service.invalidateUsersForRole(7);

    expect(prisma.usuario_rol.findMany).toHaveBeenCalledWith({
      where: { id_rol: 7, estado: 'activo' },
      select: { id_usuario: true },
    });
    expect(prisma.usuarios.updateMany).toHaveBeenCalled();
  });
});
