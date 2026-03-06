import {
  PERMISSIONS_CONFIG,
  createEmptyPermissions,
  createFullPermissions,
  stripAdminModuleFromPermissions,
  RolePermissions,
} from './permissions.config';

// ─── HELPERS ────────────────────────────────────────────────────────────────

/** Build a minimal RolePermissions object from a partial definition */
function buildPermissions(
  partial: Record<
    string,
    {
      enabled: boolean;
      pages: Record<
        string,
        {
          enabled: boolean;
          actions: { view: boolean; create: boolean; edit: boolean; delete: boolean };
          tables?: Record<string, { enabled: boolean; columns: string[] }>;
        }
      >;
    }
  >,
): RolePermissions {
  return { modules: partial };
}

/** Simulate what the frontend usePermissions hook does */
function canAccessModule(permissions: RolePermissions, moduleKey: string, isSuperAdmin = false): boolean {
  if (isSuperAdmin) return true;
  if (moduleKey === 'admin') return false;
  const mod = permissions.modules[moduleKey];
  return mod?.enabled || false;
}

function canAccessPage(permissions: RolePermissions, moduleKey: string, pageKey: string, isSuperAdmin = false): boolean {
  if (isSuperAdmin) return true;
  if (moduleKey === 'admin') return false;
  const mod = permissions.modules[moduleKey];
  if (!mod?.enabled) return false;
  const page = mod.pages?.[pageKey];
  return (page?.enabled && page?.actions?.view) || false;
}

function canPerformAction(
  permissions: RolePermissions,
  moduleKey: string,
  pageKey: string,
  action: 'view' | 'create' | 'edit' | 'delete',
  isSuperAdmin = false,
): boolean {
  if (isSuperAdmin) return true;
  if (moduleKey === 'admin') return false;
  const mod = permissions.modules[moduleKey];
  if (!mod?.enabled) return false;
  const page = mod.pages?.[pageKey];
  if (!page?.enabled) return false;
  return page.actions?.[action] || false;
}

function getVisibleColumns(
  permissions: RolePermissions,
  moduleKey: string,
  pageKey: string,
  tableKey: string,
): string[] {
  return permissions.modules[moduleKey]?.pages?.[pageKey]?.tables?.[tableKey]?.columns || [];
}

// ─── PERMISSIONS_CONFIG STRUCTURE ───────────────────────────────────────────

describe('PERMISSIONS_CONFIG structure', () => {
  it('should have all expected top-level modules', () => {
    const moduleKeys = PERMISSIONS_CONFIG.map((m) => m.key);
    expect(moduleKeys).toContain('dashboard');
    expect(moduleKeys).toContain('crm');
    expect(moduleKeys).toContain('erp');
    expect(moduleKeys).toContain('warehouse');
    expect(moduleKeys).toContain('production');
    expect(moduleKeys).toContain('hr');
    expect(moduleKeys).toContain('bi');
    expect(moduleKeys).toContain('tickets');
    expect(moduleKeys).toContain('communication');
    expect(moduleKeys).toContain('settings');
    expect(moduleKeys).toContain('ai');
    expect(moduleKeys).toContain('admin');
  });

  it('every module should have key, labelKey, icon, and pages', () => {
    for (const mod of PERMISSIONS_CONFIG) {
      expect(mod.key).toBeTruthy();
      expect(mod.labelKey).toBeTruthy();
      expect(mod.icon).toBeTruthy();
      expect(Array.isArray(mod.pages)).toBe(true);
      expect(mod.pages.length).toBeGreaterThan(0);
    }
  });

  it('every page should have key, labelKey, and actions array', () => {
    for (const mod of PERMISSIONS_CONFIG) {
      for (const page of mod.pages) {
        expect(page.key).toBeTruthy();
        expect(page.labelKey).toBeTruthy();
        expect(Array.isArray(page.actions)).toBe(true);
      }
    }
  });

  it('every table should have key, labelKey, and non-empty columns', () => {
    for (const mod of PERMISSIONS_CONFIG) {
      for (const page of mod.pages) {
        if (page.tables) {
          for (const table of page.tables) {
            expect(table.key).toBeTruthy();
            expect(table.labelKey).toBeTruthy();
            expect(Array.isArray(table.columns)).toBe(true);
            expect(table.columns.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('column keys within a table should be unique', () => {
    for (const mod of PERMISSIONS_CONFIG) {
      for (const page of mod.pages) {
        if (page.tables) {
          for (const table of page.tables) {
            const keys = table.columns.map((c) => c.key);
            const unique = new Set(keys);
            expect(unique.size).toBe(keys.length);
          }
        }
      }
    }
  });

  it('CRM customers page should have customersList table with expected columns', () => {
    const crm = PERMISSIONS_CONFIG.find((m) => m.key === 'crm');
    const customersPage = crm.pages.find((p) => p.key === 'customers');
    expect(customersPage.tables).toBeDefined();
    expect(customersPage.tables.length).toBeGreaterThan(0);

    const customersList = customersPage.tables.find((t) => t.key === 'customersList');
    expect(customersList).toBeDefined();

    const colKeys = customersList.columns.map((c) => c.key);
    expect(colKeys).toContain('name');
    expect(colKeys).toContain('email');
    expect(colKeys).toContain('phone');
    expect(colKeys).toContain('type');
    expect(colKeys).toContain('status');
  });

  it('ERP orders page should have ordersList table with expected columns', () => {
    const erp = PERMISSIONS_CONFIG.find((m) => m.key === 'erp');
    const ordersPage = erp.pages.find((p) => p.key === 'orders');
    const ordersList = ordersPage.tables.find((t) => t.key === 'ordersList');
    expect(ordersList).toBeDefined();

    const colKeys = ordersList.columns.map((c) => c.key);
    expect(colKeys).toContain('orderNumber');
    expect(colKeys).toContain('customer');
    expect(colKeys).toContain('date');
    expect(colKeys).toContain('total');
    expect(colKeys).toContain('status');
    expect(colKeys).toContain('paymentStatus');
  });
});

// ─── createEmptyPermissions ─────────────────────────────────────────────────

describe('createEmptyPermissions', () => {
  let empty: RolePermissions;

  beforeAll(() => {
    empty = createEmptyPermissions();
  });

  it('should create a module entry for every module in config', () => {
    for (const mod of PERMISSIONS_CONFIG) {
      expect(empty.modules[mod.key]).toBeDefined();
    }
  });

  it('should set all modules to disabled', () => {
    for (const key of Object.keys(empty.modules)) {
      expect(empty.modules[key].enabled).toBe(false);
    }
  });

  it('should set all pages to disabled with all actions false', () => {
    for (const mod of PERMISSIONS_CONFIG) {
      for (const page of mod.pages) {
        const p = empty.modules[mod.key].pages[page.key];
        expect(p.enabled).toBe(false);
        expect(p.actions.view).toBe(false);
        expect(p.actions.create).toBe(false);
        expect(p.actions.edit).toBe(false);
        expect(p.actions.delete).toBe(false);
      }
    }
  });

  it('should create tables with empty columns arrays', () => {
    for (const mod of PERMISSIONS_CONFIG) {
      for (const page of mod.pages) {
        if (page.tables) {
          for (const table of page.tables) {
            const t = empty.modules[mod.key].pages[page.key].tables![table.key];
            expect(t).toBeDefined();
            expect(t.enabled).toBe(false);
            expect(t.columns).toEqual([]);
          }
        }
      }
    }
  });

  it('empty columns array means NO columns visible (not "show all")', () => {
    const cols = getVisibleColumns(empty, 'crm', 'customers', 'customersList');
    expect(cols).toEqual([]);
    expect(cols.includes('name')).toBe(false);
    expect(cols.includes('email')).toBe(false);
  });
});

// ─── createFullPermissions ──────────────────────────────────────────────────

describe('createFullPermissions', () => {
  let full: RolePermissions;

  beforeAll(() => {
    full = createFullPermissions();
  });

  it('should set all modules to enabled', () => {
    for (const key of Object.keys(full.modules)) {
      expect(full.modules[key].enabled).toBe(true);
    }
  });

  it('should set all pages to enabled with view=true', () => {
    for (const mod of PERMISSIONS_CONFIG) {
      for (const page of mod.pages) {
        const p = full.modules[mod.key].pages[page.key];
        expect(p.enabled).toBe(true);
        if (page.actions.includes('view')) {
          expect(p.actions.view).toBe(true);
        }
      }
    }
  });

  it('should include ALL columns for every table', () => {
    for (const mod of PERMISSIONS_CONFIG) {
      for (const page of mod.pages) {
        if (page.tables) {
          for (const table of page.tables) {
            const t = full.modules[mod.key].pages[page.key].tables![table.key];
            expect(t.enabled).toBe(true);
            const expectedCols = table.columns.map((c) => c.key);
            expect(t.columns).toEqual(expectedCols);
            expect(t.columns.length).toBe(table.columns.length);
          }
        }
      }
    }
  });

  it('CRM customersList should have all 6 columns by default', () => {
    const cols = getVisibleColumns(full, 'crm', 'customers', 'customersList');
    expect(cols).toContain('name');
    expect(cols).toContain('email');
    expect(cols).toContain('phone');
    expect(cols).toContain('type');
    expect(cols).toContain('status');
    expect(cols).toContain('createdAt');
    expect(cols.length).toBe(6);
  });

  it('ERP ordersList should have all 6 columns by default', () => {
    const cols = getVisibleColumns(full, 'erp', 'orders', 'ordersList');
    expect(cols).toEqual(['orderNumber', 'customer', 'date', 'total', 'status', 'paymentStatus']);
  });
});

// ─── stripAdminModuleFromPermissions ────────────────────────────────────────

describe('stripAdminModuleFromPermissions', () => {
  it('should remove admin module but keep everything else', () => {
    const full = createFullPermissions();
    const stripped = stripAdminModuleFromPermissions(full);

    expect(stripped.modules.admin).toBeUndefined();
    expect(stripped.modules.crm).toBeDefined();
    expect(stripped.modules.erp).toBeDefined();
    expect(stripped.modules.dashboard).toBeDefined();
    expect(stripped.modules.communication).toBeDefined();
  });

  it('should preserve table columns after stripping', () => {
    const full = createFullPermissions();
    const stripped = stripAdminModuleFromPermissions(full);

    const cols = getVisibleColumns(stripped, 'crm', 'customers', 'customersList');
    expect(cols).toContain('name');
    expect(cols).toContain('email');
    expect(cols.length).toBe(6);
  });

  it('should not mutate the original permissions object', () => {
    const full = createFullPermissions();
    stripAdminModuleFromPermissions(full);
    expect(full.modules.admin).toBeDefined();
  });
});

// ─── COLUMN VISIBILITY SCENARIOS ────────────────────────────────────────────

describe('Column visibility', () => {
  it('showing only specific columns hides the rest', () => {
    const permissions = buildPermissions({
      erp: {
        enabled: true,
        pages: {
          orders: {
            enabled: true,
            actions: { view: true, create: true, edit: true, delete: false },
            tables: {
              ordersList: {
                enabled: true,
                columns: ['orderNumber', 'total', 'status'], // only 3 of 6
              },
            },
          },
        },
      },
    });

    const cols = getVisibleColumns(permissions, 'erp', 'orders', 'ordersList');
    expect(cols).toEqual(['orderNumber', 'total', 'status']);
    expect(cols.includes('customer')).toBe(false);
    expect(cols.includes('date')).toBe(false);
    expect(cols.includes('paymentStatus')).toBe(false);
  });

  it('empty columns array means show NOTHING', () => {
    const permissions = buildPermissions({
      erp: {
        enabled: true,
        pages: {
          orders: {
            enabled: true,
            actions: { view: true, create: false, edit: false, delete: false },
            tables: {
              ordersList: { enabled: true, columns: [] },
            },
          },
        },
      },
    });

    const cols = getVisibleColumns(permissions, 'erp', 'orders', 'ordersList');
    expect(cols).toEqual([]);
    expect(cols.length).toBe(0);
  });

  it('single column visible', () => {
    const permissions = buildPermissions({
      crm: {
        enabled: true,
        pages: {
          customers: {
            enabled: true,
            actions: { view: true, create: false, edit: false, delete: false },
            tables: {
              customersList: { enabled: true, columns: ['name'] },
            },
          },
        },
      },
    });

    const cols = getVisibleColumns(permissions, 'crm', 'customers', 'customersList');
    expect(cols).toEqual(['name']);
  });

  it('missing table key returns empty array', () => {
    const permissions = buildPermissions({
      crm: {
        enabled: true,
        pages: {
          customers: {
            enabled: true,
            actions: { view: true, create: false, edit: false, delete: false },
          },
        },
      },
    });

    const cols = getVisibleColumns(permissions, 'crm', 'customers', 'customersList');
    expect(cols).toEqual([]);
  });

  it('missing module returns empty array', () => {
    const permissions = buildPermissions({});
    const cols = getVisibleColumns(permissions, 'crm', 'customers', 'customersList');
    expect(cols).toEqual([]);
  });

  it('different tables on the same page can have different column sets', () => {
    const permissions = buildPermissions({
      dashboard: {
        enabled: true,
        pages: {
          overview: {
            enabled: true,
            actions: { view: true, create: false, edit: false, delete: false },
            tables: {
              recentActivity: { enabled: true, columns: ['date', 'action'] },
              statistics: { enabled: true, columns: ['metric', 'value', 'change'] },
            },
          },
        },
      },
    });

    expect(getVisibleColumns(permissions, 'dashboard', 'overview', 'recentActivity')).toEqual(['date', 'action']);
    expect(getVisibleColumns(permissions, 'dashboard', 'overview', 'statistics')).toEqual(['metric', 'value', 'change']);
  });
});

// ─── MODULE & PAGE ACCESS ───────────────────────────────────────────────────

describe('Module and page access', () => {
  it('disabled module blocks access to all pages', () => {
    const permissions = buildPermissions({
      crm: {
        enabled: false,
        pages: {
          customers: {
            enabled: true,
            actions: { view: true, create: true, edit: true, delete: true },
          },
        },
      },
    });

    expect(canAccessModule(permissions, 'crm')).toBe(false);
    expect(canAccessPage(permissions, 'crm', 'customers')).toBe(false);
    expect(canPerformAction(permissions, 'crm', 'customers', 'view')).toBe(false);
  });

  it('enabled module with disabled page blocks page access', () => {
    const permissions = buildPermissions({
      crm: {
        enabled: true,
        pages: {
          customers: {
            enabled: false,
            actions: { view: true, create: true, edit: true, delete: true },
          },
        },
      },
    });

    expect(canAccessModule(permissions, 'crm')).toBe(true);
    expect(canAccessPage(permissions, 'crm', 'customers')).toBe(false);
    expect(canPerformAction(permissions, 'crm', 'customers', 'view')).toBe(false);
  });

  it('page enabled but view=false blocks page access', () => {
    const permissions = buildPermissions({
      crm: {
        enabled: true,
        pages: {
          customers: {
            enabled: true,
            actions: { view: false, create: true, edit: true, delete: true },
          },
        },
      },
    });

    expect(canAccessPage(permissions, 'crm', 'customers')).toBe(false);
  });

  it('view-only role cannot create/edit/delete', () => {
    const permissions = buildPermissions({
      erp: {
        enabled: true,
        pages: {
          orders: {
            enabled: true,
            actions: { view: true, create: false, edit: false, delete: false },
            tables: {
              ordersList: {
                enabled: true,
                columns: ['orderNumber', 'customer', 'date', 'total', 'status', 'paymentStatus'],
              },
            },
          },
        },
      },
    });

    expect(canPerformAction(permissions, 'erp', 'orders', 'view')).toBe(true);
    expect(canPerformAction(permissions, 'erp', 'orders', 'create')).toBe(false);
    expect(canPerformAction(permissions, 'erp', 'orders', 'edit')).toBe(false);
    expect(canPerformAction(permissions, 'erp', 'orders', 'delete')).toBe(false);
    // But can still see columns
    expect(getVisibleColumns(permissions, 'erp', 'orders', 'ordersList').length).toBe(6);
  });

  it('admin module is always blocked for non-super-admin', () => {
    const permissions = buildPermissions({
      admin: {
        enabled: true,
        pages: {
          companies: {
            enabled: true,
            actions: { view: true, create: true, edit: true, delete: true },
          },
        },
      },
    });

    expect(canAccessModule(permissions, 'admin')).toBe(false);
    expect(canAccessPage(permissions, 'admin', 'companies')).toBe(false);
    expect(canPerformAction(permissions, 'admin', 'companies', 'view')).toBe(false);
  });

  it('super admin bypasses all checks', () => {
    const empty = createEmptyPermissions();

    expect(canAccessModule(empty, 'crm', true)).toBe(true);
    expect(canAccessModule(empty, 'admin', true)).toBe(true);
    expect(canAccessPage(empty, 'erp', 'orders', true)).toBe(true);
    expect(canPerformAction(empty, 'crm', 'customers', 'delete', true)).toBe(true);
  });

  it('non-existent module returns false', () => {
    const full = createFullPermissions();
    expect(canAccessModule(full, 'nonexistent')).toBe(false);
  });

  it('non-existent page returns false', () => {
    const full = createFullPermissions();
    expect(canAccessPage(full, 'crm', 'nonexistent')).toBe(false);
  });
});

// ─── MULTI-COMPANY SCENARIOS ────────────────────────────────────────────────

describe('Multi-company role isolation', () => {
  // Simulate: one user, two companies, two different roles
  const companyA_role: RolePermissions = buildPermissions({
    crm: {
      enabled: true,
      pages: {
        customers: {
          enabled: true,
          actions: { view: true, create: true, edit: true, delete: false },
          tables: {
            customersList: {
              enabled: true,
              columns: ['name', 'email', 'phone', 'type', 'status', 'createdAt'], // all columns
            },
          },
        },
        contacts: {
          enabled: true,
          actions: { view: true, create: false, edit: false, delete: false },
          tables: {
            contactsList: { enabled: true, columns: ['name', 'email'] }, // only 2 columns
          },
        },
      },
    },
    erp: {
      enabled: true,
      pages: {
        orders: {
          enabled: true,
          actions: { view: true, create: true, edit: true, delete: true },
          tables: {
            ordersList: {
              enabled: true,
              columns: ['orderNumber', 'customer', 'date', 'total', 'status', 'paymentStatus'],
            },
          },
        },
        invoices: {
          enabled: false,
          actions: { view: false, create: false, edit: false, delete: false },
        },
      },
    },
    hr: {
      enabled: false,
      pages: {},
    },
  });

  const companyB_role: RolePermissions = buildPermissions({
    crm: {
      enabled: true,
      pages: {
        customers: {
          enabled: true,
          actions: { view: true, create: false, edit: false, delete: false },
          tables: {
            customersList: {
              enabled: true,
              columns: ['name', 'status'], // only 2 columns visible
            },
          },
        },
      },
    },
    erp: {
      enabled: false,
      pages: {},
    },
    hr: {
      enabled: true,
      pages: {
        employees: {
          enabled: true,
          actions: { view: true, create: true, edit: true, delete: false },
          tables: {
            employeesList: {
              enabled: true,
              columns: ['name', 'position', 'department', 'email'],
            },
          },
        },
      },
    },
  });

  describe('Company A role (full CRM + ERP, no HR)', () => {
    it('has full CRM access with all customer columns', () => {
      expect(canAccessModule(companyA_role, 'crm')).toBe(true);
      expect(canPerformAction(companyA_role, 'crm', 'customers', 'create')).toBe(true);
      expect(canPerformAction(companyA_role, 'crm', 'customers', 'delete')).toBe(false);
      expect(getVisibleColumns(companyA_role, 'crm', 'customers', 'customersList').length).toBe(6);
    });

    it('has limited contacts (view-only, 2 columns)', () => {
      expect(canPerformAction(companyA_role, 'crm', 'contacts', 'view')).toBe(true);
      expect(canPerformAction(companyA_role, 'crm', 'contacts', 'create')).toBe(false);
      const cols = getVisibleColumns(companyA_role, 'crm', 'contacts', 'contactsList');
      expect(cols).toEqual(['name', 'email']);
    });

    it('has full ERP orders but no invoices', () => {
      expect(canPerformAction(companyA_role, 'erp', 'orders', 'delete')).toBe(true);
      expect(canAccessPage(companyA_role, 'erp', 'invoices')).toBe(false);
    });

    it('cannot access HR at all', () => {
      expect(canAccessModule(companyA_role, 'hr')).toBe(false);
    });
  });

  describe('Company B role (limited CRM, no ERP, has HR)', () => {
    it('has CRM customers but only name+status visible', () => {
      expect(canAccessModule(companyB_role, 'crm')).toBe(true);
      expect(canPerformAction(companyB_role, 'crm', 'customers', 'view')).toBe(true);
      expect(canPerformAction(companyB_role, 'crm', 'customers', 'edit')).toBe(false);

      const cols = getVisibleColumns(companyB_role, 'crm', 'customers', 'customersList');
      expect(cols).toEqual(['name', 'status']);
      expect(cols.includes('email')).toBe(false);
      expect(cols.includes('phone')).toBe(false);
    });

    it('cannot access ERP at all', () => {
      expect(canAccessModule(companyB_role, 'erp')).toBe(false);
      expect(canAccessPage(companyB_role, 'erp', 'orders')).toBe(false);
      expect(getVisibleColumns(companyB_role, 'erp', 'orders', 'ordersList')).toEqual([]);
    });

    it('has HR employees with 4 columns', () => {
      expect(canAccessModule(companyB_role, 'hr')).toBe(true);
      expect(canPerformAction(companyB_role, 'hr', 'employees', 'edit')).toBe(true);
      expect(canPerformAction(companyB_role, 'hr', 'employees', 'delete')).toBe(false);

      const cols = getVisibleColumns(companyB_role, 'hr', 'employees', 'employeesList');
      expect(cols).toEqual(['name', 'position', 'department', 'email']);
    });
  });

  describe('Switching between companies does not leak permissions', () => {
    it('company A permissions have no HR access, company B does', () => {
      // Simulates: after switchCompany, the JWT contains a different roleId
      // and the role has different permissions
      expect(canAccessModule(companyA_role, 'hr')).toBe(false);
      expect(canAccessModule(companyB_role, 'hr')).toBe(true);
    });

    it('company A has ERP, company B does not', () => {
      expect(canAccessModule(companyA_role, 'erp')).toBe(true);
      expect(canAccessModule(companyB_role, 'erp')).toBe(false);
    });

    it('same page (crm/customers) has different columns per company', () => {
      const colsA = getVisibleColumns(companyA_role, 'crm', 'customers', 'customersList');
      const colsB = getVisibleColumns(companyB_role, 'crm', 'customers', 'customersList');

      expect(colsA.length).toBe(6);
      expect(colsB.length).toBe(2);
      expect(colsA).not.toEqual(colsB);
    });

    it('same page (crm/customers) has different action rights per company', () => {
      expect(canPerformAction(companyA_role, 'crm', 'customers', 'create')).toBe(true);
      expect(canPerformAction(companyB_role, 'crm', 'customers', 'create')).toBe(false);
    });
  });
});

// ─── EDGE CASES ─────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  it('completely empty permissions object', () => {
    const empty: RolePermissions = { modules: {} };
    expect(canAccessModule(empty, 'crm')).toBe(false);
    expect(canAccessPage(empty, 'crm', 'customers')).toBe(false);
    expect(getVisibleColumns(empty, 'crm', 'customers', 'customersList')).toEqual([]);
  });

  it('module with no pages defined', () => {
    const permissions = buildPermissions({
      crm: { enabled: true, pages: {} },
    });
    expect(canAccessModule(permissions, 'crm')).toBe(true);
    expect(canAccessPage(permissions, 'crm', 'customers')).toBe(false);
  });

  it('partial permissions - only some modules defined', () => {
    const permissions = buildPermissions({
      crm: {
        enabled: true,
        pages: {
          customers: {
            enabled: true,
            actions: { view: true, create: false, edit: false, delete: false },
          },
        },
      },
    });

    // CRM works
    expect(canAccessModule(permissions, 'crm')).toBe(true);
    // ERP not defined - should return false
    expect(canAccessModule(permissions, 'erp')).toBe(false);
    expect(canAccessPage(permissions, 'erp', 'orders')).toBe(false);
  });

  it('createFullPermissions then selectively disable columns', () => {
    const full = createFullPermissions();
    // Admin removes email and phone from CRM customersList
    full.modules.crm.pages.customers.tables!.customersList.columns =
      full.modules.crm.pages.customers.tables!.customersList.columns.filter(
        (c) => c !== 'email' && c !== 'phone',
      );

    const cols = getVisibleColumns(full, 'crm', 'customers', 'customersList');
    expect(cols).toContain('name');
    expect(cols).not.toContain('email');
    expect(cols).not.toContain('phone');
    expect(cols).toContain('type');
    expect(cols).toContain('status');
    expect(cols).toContain('createdAt');
    expect(cols.length).toBe(4);
  });

  it('createFullPermissions then disable entire module', () => {
    const full = createFullPermissions();
    full.modules.hr.enabled = false;

    expect(canAccessModule(full, 'hr')).toBe(false);
    expect(canAccessPage(full, 'hr', 'employees')).toBe(false);
    // Columns still exist in the data but module access is blocked
    expect(getVisibleColumns(full, 'hr', 'employees', 'employeesList').length).toBeGreaterThan(0);
  });

  it('createEmptyPermissions then selectively enable one page', () => {
    const empty = createEmptyPermissions();
    // Enable only CRM customers with limited columns
    empty.modules.crm.enabled = true;
    empty.modules.crm.pages.customers.enabled = true;
    empty.modules.crm.pages.customers.actions.view = true;
    if (empty.modules.crm.pages.customers.tables) {
      empty.modules.crm.pages.customers.tables.customersList.enabled = true;
      empty.modules.crm.pages.customers.tables.customersList.columns = ['name', 'status'];
    }

    expect(canAccessModule(empty, 'crm')).toBe(true);
    expect(canAccessPage(empty, 'crm', 'customers')).toBe(true);
    expect(canPerformAction(empty, 'crm', 'customers', 'create')).toBe(false);
    expect(getVisibleColumns(empty, 'crm', 'customers', 'customersList')).toEqual(['name', 'status']);

    // Other CRM pages still disabled
    expect(canAccessPage(empty, 'crm', 'contacts')).toBe(false);
    expect(canAccessPage(empty, 'crm', 'deals')).toBe(false);

    // Other modules still disabled
    expect(canAccessModule(empty, 'erp')).toBe(false);
  });
});

// ─── REALISTIC ROLE SCENARIOS ───────────────────────────────────────────────

describe('Realistic role scenarios', () => {
  it('Sales Manager: full CRM + view ERP orders + limited columns', () => {
    const salesManager = buildPermissions({
      dashboard: {
        enabled: true,
        pages: {
          overview: {
            enabled: true,
            actions: { view: true, create: false, edit: false, delete: false },
          },
        },
      },
      crm: {
        enabled: true,
        pages: {
          customers: {
            enabled: true,
            actions: { view: true, create: true, edit: true, delete: false },
            tables: {
              customersList: {
                enabled: true,
                columns: ['name', 'email', 'phone', 'type', 'status', 'createdAt'],
              },
            },
          },
          contacts: {
            enabled: true,
            actions: { view: true, create: true, edit: true, delete: false },
            tables: {
              contactsList: {
                enabled: true,
                columns: ['name', 'email', 'phone', 'company', 'status', 'createdAt'],
              },
            },
          },
          deals: {
            enabled: true,
            actions: { view: true, create: true, edit: true, delete: false },
            tables: {
              dealsList: {
                enabled: true,
                columns: ['name', 'contact', 'value', 'stage', 'probability', 'expectedCloseDate'],
              },
            },
          },
        },
      },
      erp: {
        enabled: true,
        pages: {
          orders: {
            enabled: true,
            actions: { view: true, create: false, edit: false, delete: false },
            tables: {
              ordersList: {
                enabled: true,
                columns: ['orderNumber', 'customer', 'total', 'status'], // no date, no paymentStatus
              },
            },
          },
        },
      },
    });

    expect(canPerformAction(salesManager, 'crm', 'customers', 'edit')).toBe(true);
    expect(canPerformAction(salesManager, 'crm', 'customers', 'delete')).toBe(false);
    expect(canPerformAction(salesManager, 'erp', 'orders', 'view')).toBe(true);
    expect(canPerformAction(salesManager, 'erp', 'orders', 'create')).toBe(false);

    const orderCols = getVisibleColumns(salesManager, 'erp', 'orders', 'ordersList');
    expect(orderCols).toEqual(['orderNumber', 'customer', 'total', 'status']);
    expect(orderCols.includes('date')).toBe(false);
    expect(orderCols.includes('paymentStatus')).toBe(false);
  });

  it('Warehouse Worker: only warehouse, no CRM, no ERP', () => {
    const warehouseWorker = buildPermissions({
      warehouse: {
        enabled: true,
        pages: {
          inventory: {
            enabled: true,
            actions: { view: true, create: false, edit: false, delete: false },
            tables: {
              inventoryList: {
                enabled: true,
                columns: ['product', 'warehouse', 'quantity', 'available'],
              },
            },
          },
          goodsReceipts: {
            enabled: true,
            actions: { view: true, create: true, edit: false, delete: false },
            tables: {
              goodsReceiptsList: {
                enabled: true,
                columns: ['receiptNumber', 'supplier', 'location', 'date', 'status'],
              },
            },
          },
        },
      },
    });

    expect(canAccessModule(warehouseWorker, 'crm')).toBe(false);
    expect(canAccessModule(warehouseWorker, 'erp')).toBe(false);
    expect(canAccessModule(warehouseWorker, 'warehouse')).toBe(true);

    expect(canPerformAction(warehouseWorker, 'warehouse', 'inventory', 'view')).toBe(true);
    expect(canPerformAction(warehouseWorker, 'warehouse', 'inventory', 'edit')).toBe(false);

    const invCols = getVisibleColumns(warehouseWorker, 'warehouse', 'inventory', 'inventoryList');
    expect(invCols).toEqual(['product', 'warehouse', 'quantity', 'available']);
    expect(invCols.includes('reserved')).toBe(false);
  });

  it('HR Manager: only HR module with full access', () => {
    const hrManager = buildPermissions({
      hr: {
        enabled: true,
        pages: {
          employees: {
            enabled: true,
            actions: { view: true, create: true, edit: true, delete: true },
            tables: {
              employeesList: {
                enabled: true,
                columns: ['name', 'position', 'department', 'email', 'phone', 'startDate', 'status'],
              },
            },
          },
          payroll: {
            enabled: true,
            actions: { view: true, create: true, edit: true, delete: false },
            tables: {
              payrollList: {
                enabled: true,
                columns: ['employee', 'period', 'baseSalary', 'bonuses', 'deductions', 'netSalary', 'status'],
              },
            },
          },
          attendance: {
            enabled: true,
            actions: { view: true, create: true, edit: false, delete: false },
            tables: {
              attendanceList: {
                enabled: true,
                columns: ['employee', 'date', 'checkIn', 'checkOut', 'totalHours'],
              },
            },
          },
        },
      },
    });

    expect(canAccessModule(hrManager, 'crm')).toBe(false);
    expect(canAccessModule(hrManager, 'hr')).toBe(true);
    expect(canPerformAction(hrManager, 'hr', 'employees', 'delete')).toBe(true);
    expect(canPerformAction(hrManager, 'hr', 'payroll', 'delete')).toBe(false);

    const payrollCols = getVisibleColumns(hrManager, 'hr', 'payroll', 'payrollList');
    expect(payrollCols.length).toBe(7);
    expect(payrollCols).toContain('netSalary');

    const attendanceCols = getVisibleColumns(hrManager, 'hr', 'attendance', 'attendanceList');
    expect(attendanceCols).not.toContain('status'); // explicitly excluded
  });
});
