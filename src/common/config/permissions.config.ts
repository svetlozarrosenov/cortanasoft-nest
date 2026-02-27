// Конфигурация на всички permissions в системата
// Структура: модули -> страници -> таблици -> колони

export interface ColumnPermission {
  key: string;
  labelKey: string;
}

export interface TablePermission {
  key: string;
  labelKey: string;
  columns: ColumnPermission[];
}

export interface PagePermission {
  key: string;
  labelKey: string;
  actions: string[]; // view, create, edit, delete
  tables?: TablePermission[];
}

export interface ModulePermission {
  key: string;
  labelKey: string;
  icon: string;
  pages: PagePermission[];
}

// Структура на permissions JSON в Role модела
export interface RolePermissions {
  modules: {
    [moduleKey: string]: {
      enabled: boolean;
      pages: {
        [pageKey: string]: {
          enabled: boolean;
          actions: {
            view: boolean;
            create: boolean;
            edit: boolean;
            delete: boolean;
          };
          tables?: {
            [tableKey: string]: {
              enabled: boolean;
              columns: string[]; // Списък с видими колони
            };
          };
        };
      };
    };
  };
}

// Конфигурация на всички модули и техните permissions
export const PERMISSIONS_CONFIG: ModulePermission[] = [
  {
    key: 'dashboard',
    labelKey: 'modules.dashboard.title',
    icon: 'LayoutDashboard',
    pages: [
      {
        key: 'overview',
        labelKey: 'modules.dashboard.overview',
        actions: ['view'],
        tables: [
          {
            key: 'recentActivity',
            labelKey: 'modules.dashboard.recentActivity',
            columns: [
              { key: 'date', labelKey: 'common.date' },
              { key: 'action', labelKey: 'common.action' },
              { key: 'user', labelKey: 'common.user' },
              { key: 'details', labelKey: 'common.details' },
            ],
          },
          {
            key: 'statistics',
            labelKey: 'modules.dashboard.statistics',
            columns: [
              { key: 'metric', labelKey: 'common.metric' },
              { key: 'value', labelKey: 'common.value' },
              { key: 'change', labelKey: 'common.change' },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'crm',
    labelKey: 'modules.crm.title',
    icon: 'Users',
    pages: [
      {
        key: 'customers',
        labelKey: 'modules.crm.customers',
        actions: ['view', 'create', 'edit', 'delete'],
        tables: [
          {
            key: 'customersList',
            labelKey: 'modules.crm.customersList',
            columns: [
              { key: 'name', labelKey: 'common.name' },
              { key: 'email', labelKey: 'common.email' },
              { key: 'phone', labelKey: 'common.phone' },
              { key: 'type', labelKey: 'common.type' },
              { key: 'status', labelKey: 'common.status' },
              { key: 'createdAt', labelKey: 'common.createdAt' },
            ],
          },
        ],
      },
      {
        key: 'contacts',
        labelKey: 'modules.crm.contacts',
        actions: ['view', 'create', 'edit', 'delete'],
        tables: [
          {
            key: 'contactsList',
            labelKey: 'modules.crm.contactsList',
            columns: [
              { key: 'name', labelKey: 'common.name' },
              { key: 'email', labelKey: 'common.email' },
              { key: 'phone', labelKey: 'common.phone' },
              { key: 'company', labelKey: 'common.company' },
              { key: 'status', labelKey: 'common.status' },
              { key: 'createdAt', labelKey: 'common.createdAt' },
            ],
          },
        ],
      },
      {
        key: 'deals',
        labelKey: 'modules.crm.deals',
        actions: ['view', 'create', 'edit', 'delete'],
        tables: [
          {
            key: 'dealsList',
            labelKey: 'modules.crm.dealsList',
            columns: [
              { key: 'name', labelKey: 'common.name' },
              { key: 'contact', labelKey: 'modules.crm.contact' },
              { key: 'value', labelKey: 'common.value' },
              { key: 'stage', labelKey: 'modules.crm.stage' },
              { key: 'probability', labelKey: 'modules.crm.probability' },
              {
                key: 'expectedCloseDate',
                labelKey: 'modules.crm.expectedCloseDate',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'erp',
    labelKey: 'modules.erp.title',
    icon: 'Package',
    pages: [
      {
        key: 'products',
        labelKey: 'modules.erp.products',
        actions: ['view', 'create', 'edit', 'delete'],
        tables: [
          {
            key: 'productsList',
            labelKey: 'modules.erp.productsList',
            columns: [
              { key: 'sku', labelKey: 'modules.erp.sku' },
              { key: 'name', labelKey: 'common.name' },
              { key: 'category', labelKey: 'modules.erp.category' },
              { key: 'price', labelKey: 'modules.erp.price' },
              { key: 'stock', labelKey: 'modules.erp.stock' },
              { key: 'status', labelKey: 'common.status' },
            ],
          },
        ],
      },
      {
        key: 'categories',
        labelKey: 'modules.erp.categories',
        actions: ['view', 'create', 'edit', 'delete'],
        tables: [
          {
            key: 'categoriesList',
            labelKey: 'modules.erp.categoriesList',
            columns: [
              { key: 'name', labelKey: 'common.name' },
              { key: 'description', labelKey: 'common.description' },
              { key: 'productsCount', labelKey: 'modules.erp.productsCount' },
            ],
          },
        ],
      },
      {
        key: 'locations',
        labelKey: 'modules.erp.locations',
        actions: ['view', 'create', 'edit', 'delete'],
        tables: [
          {
            key: 'locationsList',
            labelKey: 'modules.erp.locationsList',
            columns: [
              { key: 'code', labelKey: 'modules.erp.locationCode' },
              { key: 'name', labelKey: 'common.name' },
              { key: 'type', labelKey: 'common.type' },
              { key: 'address', labelKey: 'common.address' },
              { key: 'status', labelKey: 'common.status' },
            ],
          },
        ],
      },
      {
        key: 'inventory',
        labelKey: 'modules.erp.inventory',
        actions: ['view', 'create', 'edit', 'delete'],
        tables: [
          {
            key: 'inventoryList',
            labelKey: 'modules.erp.inventoryList',
            columns: [
              { key: 'product', labelKey: 'modules.erp.product' },
              { key: 'warehouse', labelKey: 'modules.erp.warehouse' },
              { key: 'quantity', labelKey: 'modules.erp.quantity' },
              { key: 'reserved', labelKey: 'modules.erp.reserved' },
              { key: 'available', labelKey: 'modules.erp.available' },
            ],
          },
        ],
      },
      {
        key: 'goodsReceipts',
        labelKey: 'modules.erp.goodsReceipts',
        actions: ['view', 'create', 'edit', 'delete'],
        tables: [
          {
            key: 'goodsReceiptsList',
            labelKey: 'modules.erp.goodsReceiptsList',
            columns: [
              { key: 'receiptNumber', labelKey: 'modules.erp.receiptNumber' },
              { key: 'supplier', labelKey: 'modules.erp.supplier' },
              { key: 'location', labelKey: 'modules.erp.location' },
              { key: 'date', labelKey: 'common.date' },
              { key: 'status', labelKey: 'common.status' },
            ],
          },
        ],
      },
      {
        key: 'orders',
        labelKey: 'modules.erp.orders',
        actions: ['view', 'create', 'edit', 'delete'],
        tables: [
          {
            key: 'ordersList',
            labelKey: 'modules.erp.ordersList',
            columns: [
              { key: 'orderNumber', labelKey: 'modules.erp.orderNumber' },
              { key: 'customer', labelKey: 'modules.erp.customer' },
              { key: 'date', labelKey: 'common.date' },
              { key: 'total', labelKey: 'modules.erp.total' },
              { key: 'status', labelKey: 'common.status' },
              { key: 'paymentStatus', labelKey: 'modules.erp.paymentStatus' },
            ],
          },
        ],
      },
      {
        key: 'invoices',
        labelKey: 'modules.erp.invoices',
        actions: ['view', 'create', 'edit', 'delete'],
        tables: [
          {
            key: 'invoicesList',
            labelKey: 'modules.erp.invoicesList',
            columns: [
              { key: 'invoiceNumber', labelKey: 'modules.erp.invoiceNumber' },
              { key: 'customer', labelKey: 'modules.erp.customer' },
              { key: 'date', labelKey: 'common.date' },
              { key: 'dueDate', labelKey: 'modules.erp.dueDate' },
              { key: 'total', labelKey: 'modules.erp.total' },
              { key: 'status', labelKey: 'common.status' },
            ],
          },
        ],
      },
      {
        key: 'suppliers',
        labelKey: 'modules.erp.suppliers',
        actions: ['view', 'create', 'edit', 'delete'],
        tables: [
          {
            key: 'suppliersList',
            labelKey: 'modules.erp.suppliersList',
            columns: [
              { key: 'name', labelKey: 'common.name' },
              { key: 'eik', labelKey: 'modules.erp.eik' },
              { key: 'email', labelKey: 'common.email' },
              { key: 'phone', labelKey: 'common.phone' },
              { key: 'status', labelKey: 'common.status' },
            ],
          },
        ],
      },
      {
        key: 'purchaseOrders',
        labelKey: 'modules.erp.purchaseOrders',
        actions: ['view', 'create', 'edit', 'delete'],
        tables: [
          {
            key: 'purchaseOrdersList',
            labelKey: 'modules.erp.purchaseOrdersList',
            columns: [
              { key: 'orderNumber', labelKey: 'modules.erp.orderNumber' },
              { key: 'supplier', labelKey: 'modules.erp.supplier' },
              { key: 'date', labelKey: 'common.date' },
              { key: 'total', labelKey: 'modules.erp.total' },
              { key: 'status', labelKey: 'common.status' },
            ],
          },
        ],
      },
      {
        key: 'expenses',
        labelKey: 'modules.erp.expenses',
        actions: ['view', 'create', 'edit', 'delete'],
        tables: [
          {
            key: 'expensesList',
            labelKey: 'modules.erp.expensesList',
            columns: [
              { key: 'description', labelKey: 'common.description' },
              { key: 'category', labelKey: 'common.category' },
              { key: 'amount', labelKey: 'modules.erp.amount' },
              { key: 'date', labelKey: 'common.date' },
              { key: 'status', labelKey: 'common.status' },
            ],
          },
        ],
      },
      {
        key: 'stockDocuments',
        labelKey: 'modules.erp.stockDocuments',
        actions: ['view', 'create', 'edit', 'delete'],
        tables: [
          {
            key: 'stockDocumentsList',
            labelKey: 'modules.erp.stockDocumentsList',
            columns: [
              { key: 'documentNumber', labelKey: 'modules.erp.documentNumber' },
              { key: 'type', labelKey: 'common.type' },
              { key: 'recipient', labelKey: 'modules.erp.recipient' },
              { key: 'date', labelKey: 'common.date' },
              { key: 'total', labelKey: 'modules.erp.total' },
              { key: 'status', labelKey: 'common.status' },
            ],
          },
        ],
      },
      {
        key: 'analytics',
        labelKey: 'modules.erp.profitAnalytics',
        actions: ['view'],
      },
    ],
  },
  {
    key: 'hr',
    labelKey: 'modules.hr.title',
    icon: 'UserCog',
    pages: [
      {
        key: 'employees',
        labelKey: 'modules.hr.employees',
        actions: ['view', 'create', 'edit', 'delete'],
        tables: [
          {
            key: 'employeesList',
            labelKey: 'modules.hr.employeesList',
            columns: [
              { key: 'name', labelKey: 'common.name' },
              { key: 'position', labelKey: 'modules.hr.position' },
              { key: 'department', labelKey: 'modules.hr.department' },
              { key: 'email', labelKey: 'common.email' },
              { key: 'phone', labelKey: 'common.phone' },
              { key: 'startDate', labelKey: 'modules.hr.startDate' },
              { key: 'status', labelKey: 'common.status' },
            ],
          },
        ],
      },
      {
        key: 'departments',
        labelKey: 'modules.hr.departments',
        actions: ['view', 'create', 'edit', 'delete'],
        tables: [
          {
            key: 'departmentsList',
            labelKey: 'modules.hr.departmentsList',
            columns: [
              { key: 'name', labelKey: 'common.name' },
              { key: 'manager', labelKey: 'modules.hr.manager' },
              { key: 'employeesCount', labelKey: 'modules.hr.employeesCount' },
              { key: 'status', labelKey: 'common.status' },
            ],
          },
        ],
      },
      {
        key: 'attendance',
        labelKey: 'modules.hr.attendance',
        actions: ['view', 'create', 'edit'],
        tables: [
          {
            key: 'attendanceList',
            labelKey: 'modules.hr.attendanceList',
            columns: [
              { key: 'employee', labelKey: 'modules.hr.employee' },
              { key: 'date', labelKey: 'common.date' },
              { key: 'checkIn', labelKey: 'modules.hr.checkIn' },
              { key: 'checkOut', labelKey: 'modules.hr.checkOut' },
              { key: 'totalHours', labelKey: 'modules.hr.totalHours' },
              { key: 'status', labelKey: 'common.status' },
            ],
          },
        ],
      },
      {
        key: 'leaves',
        labelKey: 'modules.hr.leaves',
        actions: ['view', 'create', 'edit', 'delete'],
        tables: [
          {
            key: 'leavesList',
            labelKey: 'modules.hr.leavesList',
            columns: [
              { key: 'employee', labelKey: 'modules.hr.employee' },
              { key: 'type', labelKey: 'common.type' },
              { key: 'startDate', labelKey: 'modules.hr.startDate' },
              { key: 'endDate', labelKey: 'modules.hr.endDate' },
              { key: 'days', labelKey: 'modules.hr.days' },
              { key: 'status', labelKey: 'common.status' },
            ],
          },
        ],
      },
      {
        key: 'payroll',
        labelKey: 'modules.hr.payroll',
        actions: ['view', 'create', 'edit'],
        tables: [
          {
            key: 'payrollList',
            labelKey: 'modules.hr.payrollList',
            columns: [
              { key: 'employee', labelKey: 'modules.hr.employee' },
              { key: 'period', labelKey: 'modules.hr.period' },
              { key: 'baseSalary', labelKey: 'modules.hr.baseSalary' },
              { key: 'bonuses', labelKey: 'modules.hr.bonuses' },
              { key: 'deductions', labelKey: 'modules.hr.deductions' },
              { key: 'netSalary', labelKey: 'modules.hr.netSalary' },
              { key: 'status', labelKey: 'common.status' },
            ],
          },
        ],
      },
      {
        key: 'performance',
        labelKey: 'modules.hr.performance',
        actions: ['view', 'create', 'edit'],
        tables: [
          {
            key: 'performanceList',
            labelKey: 'modules.hr.performanceList',
            columns: [
              { key: 'employee', labelKey: 'modules.hr.employee' },
              { key: 'period', labelKey: 'modules.hr.period' },
              { key: 'rating', labelKey: 'modules.hr.rating' },
              { key: 'reviewer', labelKey: 'modules.hr.reviewer' },
              { key: 'status', labelKey: 'common.status' },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'bi',
    labelKey: 'modules.bi.title',
    icon: 'BarChart3',
    pages: [
      {
        key: 'analytics',
        labelKey: 'modules.bi.analytics',
        actions: ['view'],
      },
      {
        key: 'salesReports',
        labelKey: 'modules.bi.salesReports',
        actions: ['view', 'create', 'edit', 'delete'],
      },
      {
        key: 'financialReports',
        labelKey: 'modules.bi.financialReports',
        actions: ['view', 'create', 'edit', 'delete'],
      },
      {
        key: 'performance',
        labelKey: 'modules.bi.performance',
        actions: ['view'],
      },
      {
        key: 'customReports',
        labelKey: 'modules.bi.customReports',
        actions: ['view', 'create', 'edit', 'delete'],
      },
    ],
  },
  {
    key: 'tickets',
    labelKey: 'modules.tickets.title',
    icon: 'Ticket',
    pages: [
      {
        key: 'allTickets',
        labelKey: 'modules.tickets.allTickets',
        actions: ['view', 'create', 'edit', 'delete'],
        tables: [
          {
            key: 'allTicketsList',
            labelKey: 'modules.tickets.allTicketsList',
            columns: [
              { key: 'ticketNumber', labelKey: 'modules.tickets.ticketNumber' },
              { key: 'subject', labelKey: 'modules.tickets.subject' },
              { key: 'requester', labelKey: 'modules.tickets.requester' },
              { key: 'priority', labelKey: 'modules.tickets.priority' },
              { key: 'status', labelKey: 'common.status' },
              { key: 'assignedTo', labelKey: 'modules.tickets.assignedTo' },
              { key: 'createdAt', labelKey: 'common.createdAt' },
            ],
          },
        ],
      },
      {
        key: 'myTickets',
        labelKey: 'modules.tickets.myTickets',
        actions: ['view', 'create', 'edit'],
        tables: [
          {
            key: 'ticketsList',
            labelKey: 'modules.tickets.ticketsList',
            columns: [
              { key: 'ticketNumber', labelKey: 'modules.tickets.ticketNumber' },
              { key: 'subject', labelKey: 'modules.tickets.subject' },
              { key: 'priority', labelKey: 'modules.tickets.priority' },
              { key: 'status', labelKey: 'common.status' },
              { key: 'assignedTo', labelKey: 'modules.tickets.assignedTo' },
              { key: 'createdAt', labelKey: 'common.createdAt' },
              { key: 'updatedAt', labelKey: 'common.updatedAt' },
            ],
          },
        ],
      },
      {
        key: 'urgent',
        labelKey: 'modules.tickets.urgent',
        actions: ['view', 'edit'],
      },
      {
        key: 'discussions',
        labelKey: 'modules.tickets.discussions',
        actions: ['view', 'create', 'edit', 'delete'],
      },
    ],
  },
  {
    key: 'communication',
    labelKey: 'modules.communication.title',
    icon: 'MessageCircle',
    pages: [
      {
        key: 'chat',
        labelKey: 'modules.communication.chat',
        actions: ['view'],
      },
    ],
  },
  {
    key: 'settings',
    labelKey: 'modules.settings.title',
    icon: 'Settings',
    pages: [
      {
        key: 'profile',
        labelKey: 'modules.settings.profile',
        actions: ['view', 'edit'],
      },
      {
        key: 'security',
        labelKey: 'modules.settings.security',
        actions: ['view', 'edit'],
      },
      {
        key: 'usersRoles',
        labelKey: 'modules.settings.usersRoles',
        actions: ['view', 'create', 'edit', 'delete'],
      },
    ],
  },
  {
    key: 'admin',
    labelKey: 'modules.admin.title',
    icon: 'Shield',
    pages: [
      {
        key: 'companies',
        labelKey: 'modules.admin.companies',
        actions: ['view', 'create', 'edit', 'delete'],
        tables: [
          {
            key: 'companiesList',
            labelKey: 'modules.admin.companiesList',
            columns: [
              { key: 'name', labelKey: 'common.name' },
              { key: 'eik', labelKey: 'modules.admin.eik' },
              { key: 'role', labelKey: 'modules.admin.companyRole' },
              { key: 'users', labelKey: 'modules.admin.usersCount' },
              { key: 'status', labelKey: 'common.status' },
              { key: 'createdAt', labelKey: 'common.createdAt' },
            ],
          },
        ],
      },
      {
        key: 'users',
        labelKey: 'modules.admin.users',
        actions: ['view', 'create', 'edit', 'delete'],
        tables: [
          {
            key: 'usersList',
            labelKey: 'modules.admin.usersList',
            columns: [
              { key: 'name', labelKey: 'common.name' },
              { key: 'email', labelKey: 'common.email' },
              { key: 'companies', labelKey: 'modules.admin.companies' },
              { key: 'status', labelKey: 'common.status' },
              { key: 'createdAt', labelKey: 'common.createdAt' },
            ],
          },
        ],
      },
      {
        key: 'roles',
        labelKey: 'modules.admin.roles',
        actions: ['view', 'create', 'edit', 'delete'],
        tables: [
          {
            key: 'rolesList',
            labelKey: 'modules.admin.rolesList',
            columns: [
              { key: 'name', labelKey: 'common.name' },
              { key: 'description', labelKey: 'modules.admin.roleDescription' },
              { key: 'usersCount', labelKey: 'modules.admin.usersCount' },
              { key: 'isDefault', labelKey: 'modules.admin.defaultRole' },
            ],
          },
        ],
      },
      {
        key: 'companyPlans',
        labelKey: 'modules.admin.companyPlans',
        actions: ['view', 'create', 'edit', 'delete'],
        tables: [
          {
            key: 'companyPlansList',
            labelKey: 'modules.admin.companyPlansList',
            columns: [
              { key: 'name', labelKey: 'common.name' },
              { key: 'company', labelKey: 'common.company' },
              { key: 'amount', labelKey: 'modules.admin.amount' },
              { key: 'billingCycle', labelKey: 'modules.admin.billingCycle' },
              { key: 'status', labelKey: 'common.status' },
              { key: 'nextInvoiceDate', labelKey: 'modules.admin.nextInvoiceDate' },
            ],
          },
        ],
      },
      {
        key: 'demoRequests',
        labelKey: 'modules.admin.demoRequests',
        actions: ['view', 'edit', 'delete'],
        tables: [
          {
            key: 'demoRequestsList',
            labelKey: 'modules.admin.demoRequestsList',
            columns: [
              { key: 'name', labelKey: 'common.name' },
              { key: 'email', labelKey: 'common.email' },
              { key: 'company', labelKey: 'common.company' },
              { key: 'status', labelKey: 'common.status' },
              { key: 'createdAt', labelKey: 'common.createdAt' },
            ],
          },
        ],
      },
    ],
  },
];

// Функция за създаване на празни (без права) permissions
export function createEmptyPermissions(): RolePermissions {
  const permissions: RolePermissions = { modules: {} };

  for (const module of PERMISSIONS_CONFIG) {
    permissions.modules[module.key] = {
      enabled: false,
      pages: {},
    };

    for (const page of module.pages) {
      permissions.modules[module.key].pages[page.key] = {
        enabled: false,
        actions: {
          view: false,
          create: false,
          edit: false,
          delete: false,
        },
      };

      if (page.tables) {
        permissions.modules[module.key].pages[page.key].tables = {};
        for (const table of page.tables) {
          permissions.modules[module.key].pages[page.key].tables![table.key] = {
            enabled: false,
            columns: [],
          };
        }
      }
    }
  }

  return permissions;
}

// Функция за създаване на пълни (всички права) permissions
export function createFullPermissions(): RolePermissions {
  const permissions: RolePermissions = { modules: {} };

  for (const module of PERMISSIONS_CONFIG) {
    permissions.modules[module.key] = {
      enabled: true,
      pages: {},
    };

    for (const page of module.pages) {
      permissions.modules[module.key].pages[page.key] = {
        enabled: true,
        actions: {
          view: page.actions.includes('view'),
          create: page.actions.includes('create'),
          edit: page.actions.includes('edit'),
          delete: page.actions.includes('delete'),
        },
      };

      if (page.tables) {
        permissions.modules[module.key].pages[page.key].tables = {};
        for (const table of page.tables) {
          permissions.modules[module.key].pages[page.key].tables![table.key] = {
            enabled: true,
            columns: table.columns.map((col) => col.key),
          };
        }
      }
    }
  }

  return permissions;
}

// Функция за премахване на admin модула от permissions
// Използва се за клиентски компании, които не трябва да имат достъп до admin модула
export function stripAdminModuleFromPermissions(
  permissions: RolePermissions,
): RolePermissions {
  if (!permissions || !permissions.modules) {
    return permissions;
  }

  const stripped: RolePermissions = {
    modules: { ...permissions.modules },
  };

  // Премахване на admin модула
  delete stripped.modules['admin'];

  return stripped;
}
