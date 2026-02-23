"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const admin_module_1 = require("./admin/admin.module");
const products_module_1 = require("./products/products.module");
const suppliers_module_1 = require("./suppliers/suppliers.module");
const locations_module_1 = require("./locations/locations.module");
const purchase_orders_module_1 = require("./purchase-orders/purchase-orders.module");
const goods_receipts_module_1 = require("./goods-receipts/goods-receipts.module");
const inventory_module_1 = require("./inventory/inventory.module");
const orders_module_1 = require("./orders/orders.module");
const invoices_module_1 = require("./invoices/invoices.module");
const currencies_module_1 = require("./currencies/currencies.module");
const countries_module_1 = require("./countries/countries.module");
const settlements_module_1 = require("./settlements/settlements.module");
const customers_module_1 = require("./customers/customers.module");
const contacts_module_1 = require("./contacts/contacts.module");
const deals_module_1 = require("./deals/deals.module");
const employees_module_1 = require("./employees/employees.module");
const departments_module_1 = require("./departments/departments.module");
const attendance_module_1 = require("./attendance/attendance.module");
const payroll_module_1 = require("./payroll/payroll.module");
const performance_module_1 = require("./performance/performance.module");
const tickets_module_1 = require("./tickets/tickets.module");
const chat_module_1 = require("./chat/chat.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const leaves_module_1 = require("./leaves/leaves.module");
const push_notifications_module_1 = require("./push-notifications/push-notifications.module");
const document_ai_module_1 = require("./document-ai/document-ai.module");
const demo_requests_module_1 = require("./demo-requests/demo-requests.module");
const company_plans_module_1 = require("./company-plans/company-plans.module");
const erp_analytics_module_1 = require("./erp-analytics/erp-analytics.module");
const expenses_module_1 = require("./expenses/expenses.module");
const uploads_module_1 = require("./uploads/uploads.module");
const documents_module_1 = require("./documents/documents.module");
const export_module_1 = require("./common/export/export.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            admin_module_1.AdminModule,
            products_module_1.ProductsModule,
            suppliers_module_1.SuppliersModule,
            locations_module_1.LocationsModule,
            purchase_orders_module_1.PurchaseOrdersModule,
            goods_receipts_module_1.GoodsReceiptsModule,
            inventory_module_1.InventoryModule,
            orders_module_1.OrdersModule,
            invoices_module_1.InvoicesModule,
            currencies_module_1.CurrenciesModule,
            countries_module_1.CountriesModule,
            settlements_module_1.SettlementsModule,
            customers_module_1.CustomersModule,
            contacts_module_1.ContactsModule,
            deals_module_1.DealsModule,
            employees_module_1.EmployeesModule,
            departments_module_1.DepartmentsModule,
            attendance_module_1.AttendanceModule,
            payroll_module_1.PayrollModule,
            performance_module_1.PerformanceModule,
            tickets_module_1.TicketsModule,
            chat_module_1.ChatModule,
            dashboard_module_1.DashboardModule,
            leaves_module_1.LeavesModule,
            push_notifications_module_1.PushNotificationsModule,
            document_ai_module_1.DocumentAIModule,
            demo_requests_module_1.DemoRequestsModule,
            company_plans_module_1.CompanyPlansModule,
            erp_analytics_module_1.ErpAnalyticsModule,
            expenses_module_1.ExpensesModule,
            uploads_module_1.UploadsModule,
            documents_module_1.DocumentsModule,
            export_module_1.ExportModule,
        ],
        controllers: [],
        providers: [],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map