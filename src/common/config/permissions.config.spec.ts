import {
  PERMISSIONS_CONFIG,
  createEmptyPermissions,
  createFullPermissions,
  stripAdminModuleFromPermissions,
  RolePermissions,
} from './permissions.config';

describe('PERMISSIONS_CONFIG', () => {
  it('should include the communication module', () => {
    const communicationModule = PERMISSIONS_CONFIG.find(
      (m) => m.key === 'communication',
    );
    expect(communicationModule).toBeDefined();
    expect(communicationModule.labelKey).toBe('modules.communication.title');
    expect(communicationModule.icon).toBe('MessageCircle');
  });

  it('should have a chat page in the communication module', () => {
    const communicationModule = PERMISSIONS_CONFIG.find(
      (m) => m.key === 'communication',
    );
    const chatPage = communicationModule.pages.find((p) => p.key === 'chat');
    expect(chatPage).toBeDefined();
    expect(chatPage.labelKey).toBe('modules.communication.chat');
    expect(chatPage.actions).toContain('view');
  });
});

describe('createEmptyPermissions', () => {
  it('should include communication module with chat page disabled', () => {
    const permissions = createEmptyPermissions();
    expect(permissions.modules.communication).toBeDefined();
    expect(permissions.modules.communication.enabled).toBe(false);
    expect(permissions.modules.communication.pages.chat).toBeDefined();
    expect(permissions.modules.communication.pages.chat.enabled).toBe(false);
    expect(permissions.modules.communication.pages.chat.actions.view).toBe(
      false,
    );
  });
});

describe('createFullPermissions', () => {
  it('should include communication module with chat page enabled', () => {
    const permissions = createFullPermissions();
    expect(permissions.modules.communication).toBeDefined();
    expect(permissions.modules.communication.enabled).toBe(true);
    expect(permissions.modules.communication.pages.chat.enabled).toBe(true);
    expect(permissions.modules.communication.pages.chat.actions.view).toBe(
      true,
    );
  });
});

describe('stripAdminModuleFromPermissions', () => {
  it('should remove admin module but keep communication module', () => {
    const permissions = createFullPermissions();
    // Verify both exist before stripping
    expect(permissions.modules.admin).toBeDefined();
    expect(permissions.modules.communication).toBeDefined();

    const stripped = stripAdminModuleFromPermissions(permissions);

    // admin should be removed
    expect(stripped.modules.admin).toBeUndefined();
    // communication should remain intact
    expect(stripped.modules.communication).toBeDefined();
    expect(stripped.modules.communication.enabled).toBe(true);
    expect(stripped.modules.communication.pages.chat.enabled).toBe(true);
    expect(stripped.modules.communication.pages.chat.actions.view).toBe(true);
  });

  it('should allow CLIENT company role to have chat permissions', () => {
    // Simulate: admin assigns communication + chat permissions to a CLIENT company role
    const rolePermissions: RolePermissions = {
      modules: {
        dashboard: {
          enabled: true,
          pages: {
            overview: {
              enabled: true,
              actions: { view: true, create: false, edit: false, delete: false },
            },
          },
        },
        communication: {
          enabled: true,
          pages: {
            chat: {
              enabled: true,
              actions: { view: true, create: false, edit: false, delete: false },
            },
          },
        },
        admin: {
          enabled: true,
          pages: {
            companies: {
              enabled: true,
              actions: {
                view: true,
                create: true,
                edit: true,
                delete: true,
              },
            },
          },
        },
      },
    };

    // stripAdminModuleFromPermissions is called for CLIENT companies
    const stripped = stripAdminModuleFromPermissions(rolePermissions);

    // admin should be gone
    expect(stripped.modules.admin).toBeUndefined();
    // communication should remain — CLIENT company users CAN use chat
    expect(stripped.modules.communication.enabled).toBe(true);
    expect(stripped.modules.communication.pages.chat.enabled).toBe(true);
    expect(stripped.modules.communication.pages.chat.actions.view).toBe(true);
    // dashboard also remains
    expect(stripped.modules.dashboard.enabled).toBe(true);
  });
});
