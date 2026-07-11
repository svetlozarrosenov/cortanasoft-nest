import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { ProductsModule } from './products/products.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PriceListsModule } from './price-lists/price-lists.module';
import { LocationsModule } from './locations/locations.module';
import { GoodsReceiptsModule } from './goods-receipts/goods-receipts.module';
import { InventoryModule } from './inventory/inventory.module';
import { OrdersModule } from './orders/orders.module';
import { CreditApplicationsModule } from './credit-applications/credit-applications.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ProformasModule } from './proformas/proformas.module';
import { CurrenciesModule } from './currencies/currencies.module';
import { CountriesModule } from './countries/countries.module';
import { SettlementsModule } from './settlements/settlements.module';
import { CustomersModule } from './customers/customers.module';
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
import { StockReceiptsModule } from './stock-receipts/stock-receipts.module';
import { AcceptanceProtocolsModule } from './acceptance-protocols/acceptance-protocols.module';
import { AscertainmentProtocolsModule } from './ascertainment-protocols/ascertainment-protocols.module';
import { ExportModule } from './common/export/export.module';
import { BOMModule } from './bom/bom.module';
import { ProductionModule } from './production/production.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { CustomWebsiteModule } from './custom-website/custom-website.module';
import { StockTransfersModule } from './stock-transfers/stock-transfers.module';
import { MailModule } from './mail/mail.module';
import { ShippingModule } from './shipping/shipping.module';
import { OffersModule } from './offers/offers.module';
import { WarrantiesModule } from './warranties/warranties.module';
import { ContactSubmissionsModule } from './contact-submissions/contact-submissions.module';
import { CloudCartModule } from './cloudcart/cloudcart.module';
import { WordPressModule } from './wordpress/wordpress.module';
import { PaymentsModule } from './payments/payments.module';
import { AccountantModule } from './accountant/accountant.module';
import { AnalyticsGoogleModule } from './analytics-google/analytics-google.module';
import { MetaPixelModule } from './meta-pixel/meta-pixel.module';
import { ServiceModule } from './service/service.module';
import { EmployeeRecordsModule } from './employee-records/employee-records.module';
import { ContractsModule } from './contracts/contracts.module';
import { SupportModule } from './support/support.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 600000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    AdminModule,
    ProductsModule,
    SuppliersModule,
    PriceListsModule,
    LocationsModule,
    GoodsReceiptsModule,
    InventoryModule,
    OrdersModule,
    CreditApplicationsModule,
    InvoicesModule,
    ProformasModule,
    CurrenciesModule,
    CountriesModule,
    SettlementsModule,
    CustomersModule,
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
    StockReceiptsModule,
    AcceptanceProtocolsModule,
    AscertainmentProtocolsModule,
    ExportModule,
    BOMModule,
    ProductionModule,
    IntegrationsModule,
    WebhooksModule,
    CustomWebsiteModule,
    StockTransfersModule,
    MailModule,
    ShippingModule,
    OffersModule,
    WarrantiesModule,
    ContactSubmissionsModule,
    CloudCartModule,
    WordPressModule,
    PaymentsModule,
    AccountantModule,
    AnalyticsGoogleModule,
    MetaPixelModule,
    ServiceModule,
    EmployeeRecordsModule,
    ContractsModule,
    SupportModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
