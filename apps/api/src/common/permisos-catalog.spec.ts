import {
  ADMIN_PERMISOS,
  PERMISOS,
  PRODUCTOR_PERMISOS,
  getFirstAllowedDestination,
  filterNavigationByPermissions,
  getPanelArea,
  hasAllPermissions,
  hasAnyPermission,
} from './permisos-catalog';

describe('catálogo de permisos', () => {
  it('separa reportes administrativos y de productor', () => {
    expect(ADMIN_PERMISOS).toContain(PERMISOS.VER_REPORTES);
    expect(ADMIN_PERMISOS).not.toContain(PERMISOS.VER_REPORTES_PRODUCTOR);
    expect(PRODUCTOR_PERMISOS).toContain(PERMISOS.VER_REPORTES_PRODUCTOR);
    expect(PRODUCTOR_PERMISOS).not.toContain(PERMISOS.VER_REPORTES);
  });

  it('incluye los módulos financieros y de seguridad del administrador', () => {
    expect(ADMIN_PERMISOS).toEqual(expect.arrayContaining([
      PERMISOS.GESTIONAR_COMISIONES,
      PERMISOS.GESTIONAR_PAYOUTS,
      PERMISOS.GESTIONAR_REEMBOLSOS,
      PERMISOS.VER_AUDITORIA,
      PERMISOS.GESTIONAR_ROLES_PERMISOS,
    ]));
  });

  it('incluye reportes propios y archivos para el productor', () => {
    expect(PRODUCTOR_PERMISOS).toEqual(expect.arrayContaining([
      PERMISOS.VER_REPORTES_PRODUCTOR,
      PERMISOS.GESTIONAR_ARCHIVOS,
    ]));
  });

  it('evalúa anyOf y allOf', () => {
    expect(hasAnyPermission(['a'], ['a', 'b'])).toBe(true);
    expect(hasAllPermissions(['a'], ['a', 'b'])).toBe(false);
    expect(hasAllPermissions(['a', 'b'], ['a', 'b'])).toBe(true);
  });

  it('elige el primer módulo permitido sin depender del nombre del rol', () => {
    expect(getFirstAllowedDestination([PERMISOS.GESTIONAR_PEDIDOS])).toBe('/Administrador/pedidos');
    expect(
      getFirstAllowedDestination([PERMISOS.VER_PRODUCTOS], { hasActiveProductor: true }),
    ).toBe('/dashboard/productor/productos');
  });

  it('mantiene un padre de navegación cuando al menos un hijo está permitido', () => {
    const navigation = [{
      items: [{
        title: 'Inventario',
        children: [
          { title: 'General', requiredPermission: PERMISOS.GESTIONAR_INVENTARIO },
          { title: 'Lotes', requiredPermission: PERMISOS.VER_INVENTARIO },
        ],
      }],
    }];

    const filtered = filterNavigationByPermissions(navigation, [PERMISOS.VER_INVENTARIO]);
    expect(filtered[0].items[0].children).toEqual([
      { title: 'Lotes', requiredPermission: PERMISOS.VER_INVENTARIO },
    ]);
  });

  it('detecta el panel administrativo sin depender del casing de la ruta', () => {
    expect(getPanelArea('/Administrador/pedidos')).toBe('admin');
    expect(getPanelArea('/administrador/pedidos')).toBe('admin');
    expect(getPanelArea('/dashboard/productor/ventas')).toBe('productor');
  });
});
