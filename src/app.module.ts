import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { ProductsModule } from './products/products.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { LocationsModule } from './locations/locations.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { GoodsReceiptsModule } from './goods-receipts/goods-receipts.module';
import { InventoryModule } from './inventory/inventory.module';
import { OrdersModule } from './orders/orders.module';
import { InvoicesModule } from './invoices/invoices.module';
import { CurrenciesModule } from './currencies/currencies.module';
import { CountriesModule } from './countries/countries.module';
import { SettlementsModule } from './settlements/settlements.module';
import { CustomersModule } from './customers/customers.module';
import { ContactsModule } from './contacts/contacts.module';
import { DealsModule } from './deals/deals.module';
import { EmployeesModule } from './employees/employees.module';
import { DepartmentsModule } from './departments/departments.module';
import { AttendanceModule } from './attendance/attendance.module';
import { PayrollModule } from './payroll/payroll.module';
import { PerformanceModule } from './performance/performance.module';
import { TicketsModule } from './tickets/tickets.module';
import { ChatModule } from './chat/chat.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LeavesModule } from './leaves/leaves.module';
import { PushNotificationsModule } from './push-notifications/push-notifications.module';
import { DocumentAIModule } from './document-ai/document-ai.module';
import { DemoRequestsModule } from './demo-requests/demo-requests.module';
import { CompanyPlansModule } from './company-plans/company-plans.module';
import { ErpAnalyticsModule } from './erp-analytics/erp-analytics.module';
import { ExpensesModule } from './expenses/expenses.module';
import { UploadsModule } from './uploads/uploads.module';
import { DocumentsModule } from './documents/documents.module';
import { ExportModule } from './common/export/export.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    AdminModule,
    ProductsModule,
    SuppliersModule,
    LocationsModule,
    PurchaseOrdersModule,
    GoodsReceiptsModule,
    InventoryModule,
    OrdersModule,
    InvoicesModule,
    CurrenciesModule,
    CountriesModule,
    SettlementsModule,
    CustomersModule,
    ContactsModule,
    DealsModule,
    EmployeesModule,
    DepartmentsModule,
    AttendanceModule,
    PayrollModule,
    PerformanceModule,
    TicketsModule,
    ChatModule,
    DashboardModule,
    LeavesModule,
    PushNotificationsModule,
    DocumentAIModule,
    DemoRequestsModule,
    CompanyPlansModule,
    ErpAnalyticsModule,
    ExpensesModule,
    UploadsModule,
    DocumentsModule,
    ExportModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
