import { PrismaService } from '../../prisma/prisma.service';
import { ConfiguracionService } from './configuracion.service';

describe('ConfiguracionService', () => {
  it('expone únicamente configuración pública de la landing', async () => {
    const prisma = {
      configuracion_sistema: {
        findMany: jest.fn().mockResolvedValue([
          { clave: 'landing_hero_titulo_1', valor: 'Oaxaca auténtico' },
          { clave: 'landing_opcional', valor: null },
        ]),
      },
    };
    const service = new ConfiguracionService(prisma as unknown as PrismaService);

    await expect(service.getPublicLandingConfig()).resolves.toEqual({
      landing_hero_titulo_1: 'Oaxaca auténtico',
    });
    expect(prisma.configuracion_sistema.findMany).toHaveBeenCalledWith({
      where: { clave: { startsWith: 'landing_' } },
      select: { clave: true, valor: true },
      orderBy: { clave: 'asc' },
    });
  });
});
