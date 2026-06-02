-- CreateEnum
CREATE TYPE "CompanyRole" AS ENUM ('OWNER', 'CLIENT');

-- CreateEnum
CREATE TYPE "SettlementType" AS ENUM ('CAPITAL', 'CITY', 'TOWN', 'VILLAGE');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUALLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "CompanyPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AttendanceType" AS ENUM ('REGULAR', 'REMOTE', 'HALF_DAY', 'OVERTIME', 'SICK_LEAVE', 'VACATION', 'UNPAID_LEAVE', 'BUSINESS_TRIP', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayrollPaymentType" AS ENUM ('SALARY', 'BONUS', 'COMMISSION', 'OVERTIME_PAY', 'ALLOWANCE', 'DEDUCTION', 'TAX', 'INSURANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('PIECE', 'KG', 'G', 'L', 'ML', 'M', 'CM', 'M2', 'M3', 'PACK', 'BOX', 'SET', 'HOUR');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('PRODUCT', 'SERVICE', 'BATCH', 'SERIAL');

-- CreateEnum
CREATE TYPE "GoodsReceiptStatus" AS ENUM ('EXPECTED', 'DELIVERED_PAID', 'DELIVERED_UNPAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SerialStatus" AS ENUM ('IN_STOCK', 'IN_TRANSIT', 'RESERVED', 'SOLD', 'RETURNED', 'SCRAPPED');

-- CreateEnum
CREATE TYPE "StockTransferStatus" AS ENUM ('DRAFT', 'SHIPPED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('WAREHOUSE', 'STORE');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "CustomerStage" AS ENUM ('LEAD', 'CLIENT');

-- CreateEnum
CREATE TYPE "CustomerSource" AS ENUM ('WEBSITE', 'REFERRAL', 'SOCIAL_MEDIA', 'EMAIL', 'COLD_CALL', 'ADVERTISEMENT', 'TRADE_SHOW', 'OTHER');

-- CreateEnum
CREATE TYPE "CompanySize" AS ENUM ('MICRO', 'SMALL', 'MEDIUM', 'LARGE');

-- CreateEnum
CREATE TYPE "Industry" AS ENUM ('TECHNOLOGY', 'FINANCE', 'HEALTHCARE', 'MANUFACTURING', 'RETAIL', 'REAL_ESTATE', 'EDUCATION', 'CONSULTING', 'LOGISTICS', 'HOSPITALITY', 'CONSTRUCTION', 'AGRICULTURE', 'ENERGY', 'MEDIA', 'OTHER');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('QUALIFICATION', 'NEEDS_ANALYSIS', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'COD', 'POSTAL_MONEY_TRANSFER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'PARTIALLY_PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('REGULAR', 'PROFORMA', 'ADVANCE', 'FINAL', 'CREDIT_NOTE');

-- CreateEnum
CREATE TYPE "CreditApplicationStatus" AS ENUM ('REQUESTED', 'APPROVED', 'SIGNED', 'PAID', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CreditBank" AS ENUM ('UNICREDIT', 'POSTBANK', 'UBB', 'DSK', 'TBI', 'BNP_PARIBAS', 'PROFI_CREDIT', 'FIBANK', 'RAIFFEISEN', 'CCB', 'ALLIANZ', 'BACB', 'OTHER');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PerformanceReviewType" AS ENUM ('PROBATION', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'PROJECT', 'SELF_ASSESSMENT');

-- CreateEnum
CREATE TYPE "PerformanceReviewStatus" AS ENUM ('DRAFT', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PerformanceRating" AS ENUM ('EXCEPTIONAL', 'EXCEEDS', 'MEETS', 'NEEDS_IMPROVEMENT', 'UNSATISFACTORY');

-- CreateEnum
CREATE TYPE "PerformanceItemType" AS ENUM ('KPI', 'COMPETENCY', 'GOAL', 'BEHAVIOR');

-- CreateEnum
CREATE TYPE "SprintStatus" AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('TASK', 'BUG', 'FEATURE', 'IMPROVEMENT', 'SUPPORT');

-- CreateEnum
CREATE TYPE "ReminderRecurrence" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ChatRoomType" AS ENUM ('DIRECT', 'GROUP');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'UNPAID', 'MATERNITY', 'PATERNITY', 'OTHER');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DemoRequestStatus" AS ENUM ('NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('DELIVERY', 'RENT', 'UTILITIES', 'MARKETING', 'OFFICE_SUPPLIES', 'EQUIPMENT', 'MAINTENANCE', 'INSURANCE', 'TAXES', 'TRAVEL', 'COMMUNICATION', 'SOFTWARE', 'CONSULTING', 'BANKING', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProductionOrderStatus" AS ENUM ('DRAFT', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockReceiptStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AcceptanceProtocolStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AscertainmentProtocolStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'CREATED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('OFFICE', 'ADDRESS');

-- CreateEnum
CREATE TYPE "WarrantyType" AS ENUM ('STANDARD', 'EXTENDED', 'LIMITED');

-- CreateEnum
CREATE TYPE "WarrantyDurationUnit" AS ENUM ('DAYS', 'MONTHS', 'YEARS');

-- CreateEnum
CREATE TYPE "IssuedWarrantyStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'VOIDED');

-- CreateEnum
CREATE TYPE "ContactSubmissionStatus" AS ENUM ('NEW', 'READ', 'REPLIED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ServiceOrderStatus" AS ENUM ('NEW', 'DIAGNOSING', 'AWAITING_QUOTE', 'AWAITING_APPROVAL', 'AWAITING_PARTS', 'IN_REPAIR', 'READY', 'DELIVERED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ServiceOrderType" AS ENUM ('WARRANTY', 'PAID', 'CONTRACT', 'GOODWILL');

-- CreateEnum
CREATE TYPE "ServiceOrderPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ServiceLocation" AS ENUM ('IN_HOUSE', 'ON_SITE', 'PICKUP');

-- CreateEnum
CREATE TYPE "ServiceAssetStatus" AS ENUM ('ACTIVE', 'RETIRED', 'LOST');

-- CreateEnum
CREATE TYPE "ServicePartSource" AS ENUM ('STOCK', 'PURCHASE', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "LoanerStatus" AS ENUM ('LOANED', 'RETURNED');

-- CreateEnum
CREATE TYPE "ServiceContractStatus" AS ENUM ('ACTIVE', 'PAUSED', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "EmploymentContractType" AS ENUM ('INDEFINITE', 'FIXED_TERM', 'TEMPORARY_SUBSTITUTE', 'TRIAL', 'MANAGEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "EmploymentContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'AMENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "EmploymentOrderType" AS ENUM ('HIRE', 'DISMISSAL', 'LEAVE', 'BUSINESS_TRIP', 'DISCIPLINARY', 'BONUS', 'OTHER');

-- CreateEnum
CREATE TYPE "EmployeeDocumentCategory" AS ENUM ('DIPLOMA', 'MEDICAL', 'CERTIFICATE', 'ID_DOCUMENT', 'CRIMINAL_RECORD', 'CV', 'REFERENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "EmployeeDocumentFileKind" AS ENUM ('ORIGINAL', 'SIGNED_COPY', 'ATTACHMENT');

-- CreateEnum
CREATE TYPE "EmployeeSignatureType" AS ENUM ('NONE', 'SES', 'AES', 'QES');

-- CreateTable
CREATE TABLE "currencies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nativeName" TEXT,
    "phoneCode" TEXT,
    "isEU" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SettlementType" NOT NULL DEFAULT 'CITY',
    "postalCode" TEXT,
    "municipality" TEXT,
    "region" TEXT,
    "ekatte" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "countryId" TEXT NOT NULL,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "notifyOnNewOrder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vatNumber" TEXT,
    "eik" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "countryId" TEXT,
    "settlementId" TEXT,
    "molName" TEXT,
    "logoUrl" TEXT,
    "invoiceTemplateKey" TEXT,
    "offerTemplateKey" TEXT,
    "stockReceiptTemplateKey" TEXT,
    "acceptanceProtocolTemplateKey" TEXT,
    "ascertainmentProtocolTemplateKey" TEXT,
    "serviceProtocolTemplateKey" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "bankName" TEXT,
    "iban" TEXT,
    "bic" TEXT,
    "currencyId" TEXT,
    "woocommerceDomain" TEXT,
    "woocommerceApiKey" TEXT,
    "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "enableReviewStatus" BOOLEAN NOT NULL DEFAULT true,
    "defaultAnnualLeaveDays" INTEGER NOT NULL DEFAULT 20,
    "serviceModuleEnabled" BOOLEAN NOT NULL DEFAULT false,
    "employeeRecordsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "role" "CompanyRole" NOT NULL DEFAULT 'CLIENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "domain" TEXT,
    "apiKey" TEXT,
    "apiKeyHint" TEXT,
    "username" TEXT,
    "password" TEXT,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_webhooks" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "webhookUrl" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_webhook_deliveries" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "succeeded" BOOLEAN NOT NULL DEFAULT false,
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "errorMessage" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_plans" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currencyId" TEXT,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "billingDayOfMonth" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "invoiceNotes" TEXT,
    "status" "CompanyPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "autoInvoice" BOOLEAN NOT NULL DEFAULT true,
    "lastInvoiceDate" TIMESTAMP(3),
    "nextInvoiceDate" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_plan_items" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "total" DECIMAL(12,2) NOT NULL,
    "productId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_plan_invoices" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "billingPeriodStart" TIMESTAMP(3) NOT NULL,
    "billingPeriodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_plan_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "termsAcceptedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "fcmToken" TEXT NOT NULL,
    "userAgent" TEXT,
    "deviceName" TEXT,
    "platform" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_companies" (
    "id" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "maxVacationDays" INTEGER,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "user_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "managerId" TEXT,
    "parentId" TEXT,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department_members" (
    "id" TEXT NOT NULL,
    "isHead" BOOLEAN NOT NULL DEFAULT false,
    "position" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "department_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "AttendanceType" NOT NULL DEFAULT 'REGULAR',
    "status" "AttendanceStatus" NOT NULL DEFAULT 'APPROVED',
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "workedMinutes" INTEGER,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payrolls" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "baseSalary" DECIMAL(12,2) NOT NULL,
    "grossSalary" DECIMAL(12,2) NOT NULL,
    "netSalary" DECIMAL(12,2) NOT NULL,
    "overtimePay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bonuses" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "allowances" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commissions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "insuranceEmployee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "insuranceEmployer" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "otherDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "workingDays" INTEGER NOT NULL DEFAULT 0,
    "workedDays" INTEGER NOT NULL DEFAULT 0,
    "sickLeaveDays" INTEGER NOT NULL DEFAULT 0,
    "vacationDays" INTEGER NOT NULL DEFAULT 0,
    "unpaidLeaveDays" INTEGER NOT NULL DEFAULT 0,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "paidAt" TIMESTAMP(3),
    "paymentReference" TEXT,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_items" (
    "id" TEXT NOT NULL,
    "payrollId" TEXT NOT NULL,
    "type" "PayrollPaymentType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "externalId" TEXT,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ProductType" NOT NULL DEFAULT 'PRODUCT',
    "unit" "Unit" NOT NULL DEFAULT 'PIECE',
    "purchasePrice" DECIMAL(10,2),
    "salePrice" DECIMAL(10,2) NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "weight" DECIMAL(10,3),
    "dimensionsL" DECIMAL(10,2),
    "dimensionsW" DECIMAL(10,2),
    "dimensionsH" DECIMAL(10,2),
    "minStock" DECIMAL(10,3),
    "trackInventory" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "purchaseCurrencyId" TEXT,
    "purchaseExchangeRate" DECIMAL(12,6),
    "saleCurrencyId" TEXT,
    "saleExchangeRate" DECIMAL(12,6),
    "companyId" TEXT NOT NULL,
    "categoryId" TEXT,
    "warrantyTemplateId" TEXT,
    "createdById" TEXT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eik" TEXT,
    "vatNumber" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "countryId" TEXT,
    "settlementId" TEXT,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "bankName" TEXT,
    "iban" TEXT,
    "bic" TEXT,
    "notes" TEXT,
    "paymentTerms" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "LocationType" NOT NULL DEFAULT 'WAREHOUSE',
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "countryId" TEXT,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_zones" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "locationId" TEXT NOT NULL,

    CONSTRAINT "storage_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipts" (
    "id" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "receiptDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "status" "GoodsReceiptStatus" NOT NULL DEFAULT 'EXPECTED',
    "notes" TEXT,
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "exchangeRate" DECIMAL(10,6) NOT NULL DEFAULT 1,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "currencyId" TEXT,
    "supplierId" TEXT,
    "locationId" TEXT NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipt_items" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL,
    "exchangeRate" DECIMAL(10,6) NOT NULL DEFAULT 1,
    "goodsReceiptId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "currencyId" TEXT,

    CONSTRAINT "goods_receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "type" "CustomerType" NOT NULL DEFAULT 'INDIVIDUAL',
    "stage" "CustomerStage" NOT NULL DEFAULT 'LEAD',
    "source" "CustomerSource",
    "companyName" TEXT,
    "eik" TEXT,
    "vatNumber" TEXT,
    "molName" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "countryId" TEXT,
    "bankName" TEXT,
    "iban" TEXT,
    "bic" TEXT,
    "industry" "Industry",
    "size" "CompanySize",
    "website" TEXT,
    "notes" TEXT,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "creditLimit" DECIMAL(12,2),
    "discount" DECIMAL(5,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "assignedToId" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2),
    "currencyId" TEXT,
    "status" "DealStatus" NOT NULL DEFAULT 'QUALIFICATION',
    "probability" INTEGER,
    "expectedCloseDate" TIMESTAMP(3),
    "actualCloseDate" TIMESTAMP(3),
    "customerId" TEXT,
    "assignedToId" TEXT,
    "source" TEXT,
    "lostReason" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dealId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdById" TEXT,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "deal_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "externalId" TEXT,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "deliveryMethod" TEXT NOT NULL DEFAULT 'none',
    "shippingAddress" TEXT,
    "shippingCity" TEXT,
    "shippingPostalCode" TEXT,
    "receiverName" TEXT,
    "receiverPhone" TEXT,
    "econtOfficeCode" TEXT,
    "econtOfficeName" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "invoicedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "advancedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "vatAmount" DECIMAL(12,2) NOT NULL,
    "shippingCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "currencyId" TEXT,
    "exchangeRate" DECIMAL(10,6) NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT,
    "createdById" TEXT,
    "sourceOfferId" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "inventoryBatchId" TEXT,
    "inventorySerialId" TEXT,
    "locationId" TEXT,
    "stockDeducted" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_applications" (
    "id" TEXT NOT NULL,
    "status" "CreditApplicationStatus" NOT NULL DEFAULT 'REQUESTED',
    "bank" "CreditBank" NOT NULL,
    "bankRef" TEXT,
    "requestedAmount" DECIMAL(12,2) NOT NULL,
    "termMonths" INTEGER,
    "monthlyPayment" DECIMAL(10,2),
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decisionAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "notes" TEXT,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "notes" TEXT,
    "currencyId" TEXT,
    "exchangeRate" DECIMAL(10,6) NOT NULL DEFAULT 1,
    "orderId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "offerNumber" TEXT NOT NULL,
    "offerDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEik" TEXT,
    "customerVatNumber" TEXT,
    "customerMolName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "customerCity" TEXT,
    "customerPostalCode" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "vatAmount" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "richDescription" TEXT,
    "currencyId" TEXT,
    "exchangeRate" DECIMAL(10,6) NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_items" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "offerId" TEXT NOT NULL,
    "productId" TEXT,

    CONSTRAINT "offer_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_batches" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "initialQty" DECIMAL(10,3) NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "manufacturingDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "storageZoneId" TEXT,
    "goodsReceiptItemId" TEXT,

    CONSTRAINT "inventory_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_serials" (
    "id" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "status" "SerialStatus" NOT NULL DEFAULT 'IN_STOCK',
    "unitCost" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "storageZoneId" TEXT,
    "goodsReceiptItemId" TEXT,

    CONSTRAINT "inventory_serials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "type" "InvoiceType" NOT NULL DEFAULT 'REGULAR',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "orderId" TEXT,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEik" TEXT,
    "customerVatNumber" TEXT,
    "customerAddress" TEXT,
    "customerCity" TEXT,
    "customerPostalCode" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "vatAmount" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paymentMethod" "PaymentMethod",
    "paymentDate" TIMESTAMP(3),
    "currencyId" TEXT,
    "exchangeRate" DECIMAL(10,6) NOT NULL DEFAULT 1,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "orderItemId" TEXT,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_advance_deductions" (
    "id" TEXT NOT NULL,
    "finalInvoiceId" TEXT NOT NULL,
    "advanceInvoiceId" TEXT NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "vatAmount" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_advance_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_reviews" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "PerformanceReviewType" NOT NULL,
    "status" "PerformanceReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "reviewDate" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "overallRating" "PerformanceRating",
    "overallScore" DECIMAL(3,2),
    "achievements" TEXT,
    "areasToImprove" TEXT,
    "managerComments" TEXT,
    "employeeComments" TEXT,
    "developmentPlan" TEXT,
    "nextPeriodGoals" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "performance_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_review_items" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "type" "PerformanceItemType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "weight" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "targetValue" TEXT,
    "actualValue" TEXT,
    "rating" "PerformanceRating",
    "score" DECIMAL(3,2),
    "comments" TEXT,
    "selfRating" "PerformanceRating",
    "selfScore" DECIMAL(3,2),
    "selfComments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_review_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sprints" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "SprintStatus" NOT NULL DEFAULT 'PLANNING',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "companyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sprint_members" (
    "id" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sprintId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "sprint_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_logs" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hours" DECIMAL(5,2) NOT NULL,
    "description" TEXT,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "TicketType" NOT NULL DEFAULT 'TASK',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'TODO',
    "plannedStartDate" TIMESTAMP(3) NOT NULL,
    "plannedEndDate" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "estimatedHours" DECIMAL(6,2),
    "actualHours" DECIMAL(6,2),
    "hoursPerDay" DECIMAL(4,2),
    "workingDaysPerWeek" INTEGER NOT NULL DEFAULT 5,
    "rank" DOUBLE PRECISION,
    "assigneeId" TEXT,
    "createdById" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "parentId" TEXT,
    "sprintId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_comments" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_reminders" (
    "id" TEXT NOT NULL,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "message" TEXT,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "recurrence" "ReminderRecurrence" NOT NULL DEFAULT 'NONE',
    "intervalDays" INTEGER,
    "recurrenceEnd" TIMESTAMP(3),
    "recurrenceCount" INTEGER,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "type" "ChatRoomType" NOT NULL DEFAULT 'DIRECT',
    "companyId" TEXT NOT NULL,
    "createdById" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_room_participants" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_room_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaves" (
    "id" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL DEFAULT 'ANNUAL',
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "days" INTEGER NOT NULL,
    "reason" TEXT,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_balances" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "annualTotal" INTEGER NOT NULL DEFAULT 20,
    "annualUsed" INTEGER NOT NULL DEFAULT 0,
    "annualCarried" INTEGER NOT NULL DEFAULT 0,
    "sickTotal" INTEGER NOT NULL DEFAULT 0,
    "sickUsed" INTEGER NOT NULL DEFAULT 0,
    "unpaidUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demo_requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "companyName" TEXT,
    "employeeCount" TEXT,
    "message" TEXT,
    "status" "DemoRequestStatus" NOT NULL DEFAULT 'NEW',
    "contactedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demo_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demo_request_tasks" (
    "id" TEXT NOT NULL,
    "demoRequestId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demo_request_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demo_request_notes" (
    "id" TEXT NOT NULL,
    "demoRequestId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demo_request_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "vatAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "currencyId" TEXT,
    "exchangeRate" DECIMAL(10,6) NOT NULL DEFAULT 1,
    "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "invoiceNumber" TEXT,
    "receiptNumber" TEXT,
    "attachmentUrl" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringInterval" TEXT,
    "companyId" TEXT NOT NULL,
    "supplierId" TEXT,
    "goodsReceiptId" TEXT,
    "createdById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "goodsReceiptId" TEXT,
    "invoiceId" TEXT,
    "expenseId" TEXT,
    "stockReceiptId" TEXT,
    "acceptanceProtocolId" TEXT,
    "ascertainmentProtocolId" TEXT,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_receipts" (
    "id" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "documentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StockReceiptStatus" NOT NULL DEFAULT 'ISSUED',
    "customerId" TEXT,
    "recipientName" TEXT NOT NULL,
    "recipientEik" TEXT,
    "recipientAddress" TEXT,
    "recipientCity" TEXT,
    "senderRepresentative" TEXT,
    "receiverRepresentative" TEXT,
    "subtotal" DECIMAL(12,2),
    "vatAmount" DECIMAL(12,2),
    "total" DECIMAL(12,2),
    "invoiceId" TEXT,
    "serviceOrderId" TEXT,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_receipt_items" (
    "id" TEXT NOT NULL,
    "stockReceiptId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "stock_receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acceptance_protocols" (
    "id" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "documentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "AcceptanceProtocolStatus" NOT NULL DEFAULT 'ISSUED',
    "customerId" TEXT,
    "recipientName" TEXT NOT NULL,
    "recipientEik" TEXT,
    "recipientAddress" TEXT,
    "recipientCity" TEXT,
    "senderRepresentative" TEXT,
    "receiverRepresentative" TEXT,
    "subtotal" DECIMAL(12,2),
    "vatAmount" DECIMAL(12,2),
    "total" DECIMAL(12,2),
    "orderId" TEXT,
    "invoiceId" TEXT,
    "serviceOrderId" TEXT,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acceptance_protocols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acceptance_protocol_items" (
    "id" TEXT NOT NULL,
    "acceptanceProtocolId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "acceptance_protocol_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ascertainment_protocols" (
    "id" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "documentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "AscertainmentProtocolStatus" NOT NULL DEFAULT 'ISSUED',
    "customerId" TEXT,
    "recipientName" TEXT NOT NULL,
    "recipientEik" TEXT,
    "recipientAddress" TEXT,
    "recipientCity" TEXT,
    "senderRepresentative" TEXT,
    "receiverRepresentative" TEXT,
    "subject" TEXT,
    "findings" TEXT,
    "conclusion" TEXT,
    "commissionMembers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "serviceOrderId" TEXT,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ascertainment_protocols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_of_materials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "outputQuantity" DECIMAL(10,3) NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "bill_of_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bom_items" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit" "Unit" NOT NULL DEFAULT 'PIECE',
    "notes" TEXT,
    "productId" TEXT NOT NULL,
    "bomId" TEXT NOT NULL,

    CONSTRAINT "bom_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "title" TEXT,
    "quantity" DECIMAL(10,3) NOT NULL,
    "status" "ProductionOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "plannedStartDate" TIMESTAMP(3),
    "plannedEndDate" TIMESTAMP(3),
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,
    "bomId" TEXT,
    "customerId" TEXT,
    "locationId" TEXT,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "production_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_material_issuances" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unitCost" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "returned" BOOLEAN NOT NULL DEFAULT false,
    "productId" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "locationId" TEXT,
    "createdById" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_material_issuances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "transferDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StockTransferStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "fromLocationId" TEXT NOT NULL,
    "toLocationId" TEXT NOT NULL,
    "responsibleId" TEXT,
    "createdById" TEXT,

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfer_items" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "receivedQty" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "stockTransferId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "inventoryBatchId" TEXT,

    CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfer_serials" (
    "id" TEXT NOT NULL,
    "received" BOOLEAN NOT NULL DEFAULT false,
    "stockTransferItemId" TEXT NOT NULL,
    "inventorySerialId" TEXT NOT NULL,

    CONSTRAINT "stock_transfer_serials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "econt_configs" (
    "id" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "username" TEXT,
    "password" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'test',
    "senderName" TEXT,
    "senderPhone" TEXT,
    "senderCountryId" TEXT,
    "senderOfficeCode" TEXT,
    "shipmentType" TEXT NOT NULL DEFAULT 'PACK',
    "paymentBy" TEXT NOT NULL DEFAULT 'sender',
    "codEnabled" BOOLEAN NOT NULL DEFAULT false,
    "cdAgreementNum" TEXT,
    "cdPayMethod" TEXT,
    "cdIban" TEXT,
    "cdBic" TEXT,
    "smsNotification" BOOLEAN NOT NULL DEFAULT false,
    "deliveryReceipt" BOOLEAN NOT NULL DEFAULT false,
    "declaredValueEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sizeUnder60cm" BOOLEAN NOT NULL DEFAULT false,
    "keepUpright" BOOLEAN NOT NULL DEFAULT false,
    "payAfterAccept" BOOLEAN NOT NULL DEFAULT false,
    "payAfterTest" BOOLEAN NOT NULL DEFAULT false,
    "partialDelivery" BOOLEAN NOT NULL DEFAULT false,
    "emailOnDelivery" BOOLEAN NOT NULL DEFAULT false,
    "returnDaysUntilReturn" INTEGER,
    "returnFailAction" TEXT,
    "instructionsDefault" TEXT,
    "paymentShareAmount" DECIMAL(10,2),
    "paymentSharePercent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "econt_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speedy_configs" (
    "id" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "username" TEXT,
    "password" TEXT,
    "senderName" TEXT,
    "senderPhone" TEXT,
    "senderCountryId" INTEGER DEFAULT 100,
    "senderSiteId" BIGINT,
    "senderOfficeId" BIGINT,
    "senderClientId" BIGINT,
    "serviceId" INTEGER,
    "codEnabled" BOOLEAN NOT NULL DEFAULT false,
    "codProcessingType" TEXT,
    "declaredValueEnabled" BOOLEAN NOT NULL DEFAULT false,
    "saturdayDelivery" BOOLEAN NOT NULL DEFAULT false,
    "deferredDays" INTEGER DEFAULT 0,
    "payerType" TEXT DEFAULT 'SENDER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "speedy_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "shipmentNumber" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "deliveryType" "DeliveryType" NOT NULL DEFAULT 'OFFICE',
    "receiverName" TEXT NOT NULL,
    "receiverPhone" TEXT NOT NULL,
    "officeCode" TEXT,
    "officeName" TEXT,
    "addressCity" TEXT,
    "addressPostCode" TEXT,
    "addressStreet" TEXT,
    "addressNum" TEXT,
    "addressOther" TEXT,
    "weight" DECIMAL(10,3),
    "packCount" INTEGER NOT NULL DEFAULT 1,
    "dimensionsL" DECIMAL(10,2),
    "dimensionsW" DECIMAL(10,2),
    "dimensionsH" DECIMAL(10,2),
    "description" TEXT,
    "codAmount" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'BGN',
    "shippingCost" DECIMAL(10,2),
    "senderDueAmount" DECIMAL(10,2),
    "receiverDueAmount" DECIMAL(10,2),
    "pdfUrl" TEXT,
    "expectedDeliveryDate" TIMESTAMP(3),
    "trackingData" JSONB,
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranty_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WarrantyType" NOT NULL DEFAULT 'STANDARD',
    "duration" INTEGER NOT NULL,
    "durationUnit" "WarrantyDurationUnit" NOT NULL DEFAULT 'MONTHS',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "warranty_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issued_warranties" (
    "id" TEXT NOT NULL,
    "warrantyNumber" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "IssuedWarrantyStatus" NOT NULL DEFAULT 'ACTIVE',
    "serialNumber" TEXT,
    "notes" TEXT,
    "quantity" DECIMAL(10,3) NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "warrantyTemplateId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "customerId" TEXT,

    CONSTRAINT "issued_warranties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_submissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ContactSubmissionStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_analytics_config" (
    "id" TEXT NOT NULL,
    "measurementId" TEXT,
    "propertyId" TEXT,
    "serviceAccountJsonEncrypted" TEXT,
    "serviceAccountEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_analytics_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_pixel_config" (
    "id" TEXT NOT NULL,
    "scriptHtml" TEXT NOT NULL,
    "pixelId" TEXT,
    "accessTokenEncrypted" TEXT,
    "testEventCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_pixel_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_assets" (
    "id" TEXT NOT NULL,
    "assetNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "imei" TEXT,
    "vin" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "notes" TEXT,
    "status" "ServiceAssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT,
    "warrantyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "type" "ServiceOrderType" NOT NULL DEFAULT 'PAID',
    "status" "ServiceOrderStatus" NOT NULL DEFAULT 'NEW',
    "priority" "ServiceOrderPriority" NOT NULL DEFAULT 'NORMAL',
    "serviceLocation" "ServiceLocation" NOT NULL DEFAULT 'IN_HOUSE',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promisedAt" TIMESTAMP(3),
    "diagnosedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "customerComplaint" TEXT NOT NULL,
    "diagnosis" TEXT,
    "workPerformed" TEXT,
    "internalNotes" TEXT,
    "accessories" TEXT,
    "cosmeticState" TEXT,
    "declaredFault" TEXT,
    "partsTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "laborTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isApprovedByCustomer" BOOLEAN NOT NULL DEFAULT false,
    "approvalChannel" TEXT,
    "publicToken" TEXT,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "assetId" TEXT,
    "technicianId" TEXT,
    "receivedById" TEXT,
    "contractId" TEXT,
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_parts" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "source" "ServicePartSource" NOT NULL DEFAULT 'STOCK',
    "quantity" DECIMAL(10,3) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "isWarranty" BOOLEAN NOT NULL DEFAULT false,
    "inventoryBatchId" TEXT,
    "inventorySerialId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_order_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_labor" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hours" DECIMAL(8,2) NOT NULL,
    "hourlyRate" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "isWarranty" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_order_labor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_time_logs" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "minutes" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_order_time_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_attachments" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "kind" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_order_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_status_history" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "fromStatus" "ServiceOrderStatus",
    "toStatus" "ServiceOrderStatus" NOT NULL,
    "note" TEXT,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_loaners" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "productId" TEXT,
    "serialNumber" TEXT,
    "description" TEXT,
    "status" "LoanerStatus" NOT NULL DEFAULT 'LOANED',
    "loanedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_loaners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_contracts" (
    "id" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ServiceContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "monthlyFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "includedHoursPerMonth" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "responseTimeHours" INTEGER,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_contracts" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "type" "EmploymentContractType" NOT NULL DEFAULT 'INDEFINITE',
    "status" "EmploymentContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "position" TEXT,
    "nkpdCode" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "salary" DECIMAL(12,2),
    "workingHours" DECIMAL(5,2),
    "probationMonths" INTEGER,
    "notes" TEXT,
    "notifiedEmployeeAt" TIMESTAMP(3),
    "deliveryConfirmedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdById" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employment_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_annexes" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "newSalary" DECIMAL(12,2),
    "newPosition" TEXT,
    "newWorkingHours" DECIMAL(5,2),
    "newEndDate" TIMESTAMP(3),
    "notes" TEXT,
    "notifiedEmployeeAt" TIMESTAMP(3),
    "deliveryConfirmedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdById" TEXT,
    "contractId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employment_annexes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_orders" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "type" "EmploymentOrderType" NOT NULL DEFAULT 'OTHER',
    "date" TIMESTAMP(3) NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT,
    "notifiedEmployeeAt" TIMESTAMP(3),
    "deliveryConfirmedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdById" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employment_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_descriptions" (
    "id" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "responsibilities" TEXT,
    "requirements" TEXT,
    "notifiedEmployeeAt" TIMESTAMP(3),
    "deliveryConfirmedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdById" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_descriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terminations" (
    "id" TEXT NOT NULL,
    "basis" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "noticeServedAt" TIMESTAMP(3),
    "compensation" DECIMAL(12,2),
    "notes" TEXT,
    "notifiedEmployeeAt" TIMESTAMP(3),
    "deliveryConfirmedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdById" TEXT,
    "contractId" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terminations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_documents" (
    "id" TEXT NOT NULL,
    "category" "EmployeeDocumentCategory" NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "documentDate" TIMESTAMP(3),
    "notes" TEXT,
    "notifiedEmployeeAt" TIMESTAMP(3),
    "deliveryConfirmedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdById" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_document_files" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "kind" "EmployeeDocumentFileKind" NOT NULL DEFAULT 'ATTACHMENT',
    "signatureType" "EmployeeSignatureType" NOT NULL DEFAULT 'NONE',
    "signedAt" TIMESTAMP(3),
    "uploadedById" TEXT,
    "companyId" TEXT NOT NULL,
    "employmentContractId" TEXT,
    "employmentAnnexId" TEXT,
    "employmentOrderId" TEXT,
    "jobDescriptionId" TEXT,
    "terminationId" TEXT,
    "employeeDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_document_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

-- CreateIndex
CREATE UNIQUE INDEX "settlements_ekatte_key" ON "settlements"("ekatte");

-- CreateIndex
CREATE INDEX "settlements_countryId_idx" ON "settlements"("countryId");

-- CreateIndex
CREATE INDEX "settlements_region_idx" ON "settlements"("region");

-- CreateIndex
CREATE INDEX "settlements_municipality_idx" ON "settlements"("municipality");

-- CreateIndex
CREATE UNIQUE INDEX "roles_companyId_name_key" ON "roles"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "companies_vatNumber_key" ON "companies"("vatNumber");

-- CreateIndex
CREATE UNIQUE INDEX "companies_eik_key" ON "companies"("eik");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_companyId_idx" ON "api_keys"("companyId");

-- CreateIndex
CREATE INDEX "integrations_companyId_idx" ON "integrations"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_companyId_provider_key" ON "integrations"("companyId", "provider");

-- CreateIndex
CREATE INDEX "integration_webhooks_companyId_idx" ON "integration_webhooks"("companyId");

-- CreateIndex
CREATE INDEX "integration_webhooks_companyId_isActive_idx" ON "integration_webhooks"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "integration_webhook_deliveries_webhookId_createdAt_idx" ON "integration_webhook_deliveries"("webhookId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "integration_webhook_deliveries_companyId_createdAt_idx" ON "integration_webhook_deliveries"("companyId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "company_plans_companyId_idx" ON "company_plans"("companyId");

-- CreateIndex
CREATE INDEX "company_plans_status_idx" ON "company_plans"("status");

-- CreateIndex
CREATE INDEX "company_plans_nextInvoiceDate_idx" ON "company_plans"("nextInvoiceDate");

-- CreateIndex
CREATE INDEX "company_plan_items_planId_idx" ON "company_plan_items"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "company_plan_invoices_invoiceId_key" ON "company_plan_invoices"("invoiceId");

-- CreateIndex
CREATE INDEX "company_plan_invoices_planId_idx" ON "company_plan_invoices"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_key" ON "password_resets"("token");

-- CreateIndex
CREATE INDEX "password_resets_token_idx" ON "password_resets"("token");

-- CreateIndex
CREATE INDEX "password_resets_userId_idx" ON "password_resets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_fcmToken_key" ON "push_subscriptions"("fcmToken");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "push_subscriptions_fcmToken_idx" ON "push_subscriptions"("fcmToken");

-- CreateIndex
CREATE UNIQUE INDEX "user_companies_userId_companyId_key" ON "user_companies"("userId", "companyId");

-- CreateIndex
CREATE INDEX "departments_companyId_idx" ON "departments"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_companyId_code_key" ON "departments"("companyId", "code");

-- CreateIndex
CREATE INDEX "department_members_departmentId_idx" ON "department_members"("departmentId");

-- CreateIndex
CREATE INDEX "department_members_userId_idx" ON "department_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "department_members_departmentId_userId_key" ON "department_members"("departmentId", "userId");

-- CreateIndex
CREATE INDEX "attendances_companyId_idx" ON "attendances"("companyId");

-- CreateIndex
CREATE INDEX "attendances_companyId_userId_idx" ON "attendances"("companyId", "userId");

-- CreateIndex
CREATE INDEX "attendances_companyId_date_idx" ON "attendances"("companyId", "date");

-- CreateIndex
CREATE INDEX "attendances_companyId_status_idx" ON "attendances"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_companyId_userId_date_key" ON "attendances"("companyId", "userId", "date");

-- CreateIndex
CREATE INDEX "payrolls_companyId_idx" ON "payrolls"("companyId");

-- CreateIndex
CREATE INDEX "payrolls_companyId_userId_idx" ON "payrolls"("companyId", "userId");

-- CreateIndex
CREATE INDEX "payrolls_companyId_year_month_idx" ON "payrolls"("companyId", "year", "month");

-- CreateIndex
CREATE INDEX "payrolls_companyId_status_idx" ON "payrolls"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payrolls_companyId_userId_year_month_key" ON "payrolls"("companyId", "userId", "year", "month");

-- CreateIndex
CREATE INDEX "payroll_items_payrollId_idx" ON "payroll_items"("payrollId");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_companyId_name_parentId_key" ON "product_categories"("companyId", "name", "parentId");

-- CreateIndex
CREATE INDEX "products_companyId_name_idx" ON "products"("companyId", "name");

-- CreateIndex
CREATE INDEX "products_companyId_barcode_idx" ON "products"("companyId", "barcode");

-- CreateIndex
CREATE UNIQUE INDEX "products_companyId_sku_key" ON "products"("companyId", "sku");

-- CreateIndex
CREATE INDEX "suppliers_companyId_name_idx" ON "suppliers"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_companyId_eik_key" ON "suppliers"("companyId", "eik");

-- CreateIndex
CREATE UNIQUE INDEX "locations_companyId_code_key" ON "locations"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "storage_zones_locationId_code_key" ON "storage_zones"("locationId", "code");

-- CreateIndex
CREATE INDEX "goods_receipts_companyId_status_idx" ON "goods_receipts"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipts_companyId_receiptNumber_key" ON "goods_receipts"("companyId", "receiptNumber");

-- CreateIndex
CREATE INDEX "customers_companyId_type_idx" ON "customers"("companyId", "type");

-- CreateIndex
CREATE INDEX "customers_companyId_stage_idx" ON "customers"("companyId", "stage");

-- CreateIndex
CREATE INDEX "customers_companyId_companyName_idx" ON "customers"("companyId", "companyName");

-- CreateIndex
CREATE INDEX "customers_companyId_lastName_idx" ON "customers"("companyId", "lastName");

-- CreateIndex
CREATE UNIQUE INDEX "customers_companyId_eik_key" ON "customers"("companyId", "eik");

-- CreateIndex
CREATE INDEX "deals_companyId_idx" ON "deals"("companyId");

-- CreateIndex
CREATE INDEX "deals_companyId_status_idx" ON "deals"("companyId", "status");

-- CreateIndex
CREATE INDEX "deals_companyId_customerId_idx" ON "deals"("companyId", "customerId");

-- CreateIndex
CREATE INDEX "deals_companyId_assignedToId_idx" ON "deals"("companyId", "assignedToId");

-- CreateIndex
CREATE INDEX "deal_tasks_dealId_idx" ON "deal_tasks"("dealId");

-- CreateIndex
CREATE INDEX "deal_tasks_companyId_dealId_idx" ON "deal_tasks"("companyId", "dealId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_sourceOfferId_key" ON "orders"("sourceOfferId");

-- CreateIndex
CREATE INDEX "orders_companyId_status_idx" ON "orders"("companyId", "status");

-- CreateIndex
CREATE INDEX "orders_companyId_orderDate_idx" ON "orders"("companyId", "orderDate");

-- CreateIndex
CREATE UNIQUE INDEX "orders_companyId_orderNumber_key" ON "orders"("companyId", "orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "orders_companyId_externalId_key" ON "orders"("companyId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "credit_applications_orderId_key" ON "credit_applications"("orderId");

-- CreateIndex
CREATE INDEX "credit_applications_companyId_status_idx" ON "credit_applications"("companyId", "status");

-- CreateIndex
CREATE INDEX "credit_applications_companyId_bank_idx" ON "credit_applications"("companyId", "bank");

-- CreateIndex
CREATE INDEX "credit_applications_companyId_appliedAt_idx" ON "credit_applications"("companyId", "appliedAt");

-- CreateIndex
CREATE INDEX "payments_companyId_orderId_idx" ON "payments"("companyId", "orderId");

-- CreateIndex
CREATE INDEX "payments_companyId_paidAt_idx" ON "payments"("companyId", "paidAt");

-- CreateIndex
CREATE INDEX "offers_companyId_status_idx" ON "offers"("companyId", "status");

-- CreateIndex
CREATE INDEX "offers_companyId_offerDate_idx" ON "offers"("companyId", "offerDate");

-- CreateIndex
CREATE UNIQUE INDEX "offers_companyId_offerNumber_key" ON "offers"("companyId", "offerNumber");

-- CreateIndex
CREATE INDEX "offer_items_offerId_idx" ON "offer_items"("offerId");

-- CreateIndex
CREATE INDEX "inventory_batches_companyId_productId_idx" ON "inventory_batches"("companyId", "productId");

-- CreateIndex
CREATE INDEX "inventory_batches_companyId_expiryDate_idx" ON "inventory_batches"("companyId", "expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_batches_companyId_productId_batchNumber_key" ON "inventory_batches"("companyId", "productId", "batchNumber");

-- CreateIndex
CREATE INDEX "inventory_serials_companyId_productId_idx" ON "inventory_serials"("companyId", "productId");

-- CreateIndex
CREATE INDEX "inventory_serials_companyId_status_idx" ON "inventory_serials"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_serials_companyId_productId_serialNumber_key" ON "inventory_serials"("companyId", "productId", "serialNumber");

-- CreateIndex
CREATE INDEX "invoices_companyId_status_idx" ON "invoices"("companyId", "status");

-- CreateIndex
CREATE INDEX "invoices_companyId_invoiceDate_idx" ON "invoices"("companyId", "invoiceDate");

-- CreateIndex
CREATE INDEX "invoices_orderId_idx" ON "invoices"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_companyId_invoiceNumber_key" ON "invoices"("companyId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_advance_deductions_advanceInvoiceId_idx" ON "invoice_advance_deductions"("advanceInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_advance_deductions_finalInvoiceId_advanceInvoiceId_key" ON "invoice_advance_deductions"("finalInvoiceId", "advanceInvoiceId");

-- CreateIndex
CREATE INDEX "performance_reviews_companyId_status_idx" ON "performance_reviews"("companyId", "status");

-- CreateIndex
CREATE INDEX "performance_reviews_companyId_userId_idx" ON "performance_reviews"("companyId", "userId");

-- CreateIndex
CREATE INDEX "performance_reviews_companyId_reviewerId_idx" ON "performance_reviews"("companyId", "reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "performance_reviews_companyId_userId_periodStart_periodEnd__key" ON "performance_reviews"("companyId", "userId", "periodStart", "periodEnd", "type");

-- CreateIndex
CREATE INDEX "performance_review_items_reviewId_idx" ON "performance_review_items"("reviewId");

-- CreateIndex
CREATE INDEX "sprints_companyId_status_idx" ON "sprints"("companyId", "status");

-- CreateIndex
CREATE INDEX "sprints_companyId_startDate_idx" ON "sprints"("companyId", "startDate");

-- CreateIndex
CREATE INDEX "sprint_members_sprintId_idx" ON "sprint_members"("sprintId");

-- CreateIndex
CREATE INDEX "sprint_members_userId_idx" ON "sprint_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "sprint_members_sprintId_userId_key" ON "sprint_members"("sprintId", "userId");

-- CreateIndex
CREATE INDEX "time_logs_ticketId_idx" ON "time_logs"("ticketId");

-- CreateIndex
CREATE INDEX "time_logs_userId_date_idx" ON "time_logs"("userId", "date");

-- CreateIndex
CREATE INDEX "time_logs_companyId_date_idx" ON "time_logs"("companyId", "date");

-- CreateIndex
CREATE INDEX "tickets_companyId_status_idx" ON "tickets"("companyId", "status");

-- CreateIndex
CREATE INDEX "tickets_companyId_priority_idx" ON "tickets"("companyId", "priority");

-- CreateIndex
CREATE INDEX "tickets_companyId_assigneeId_idx" ON "tickets"("companyId", "assigneeId");

-- CreateIndex
CREATE INDEX "tickets_companyId_createdById_idx" ON "tickets"("companyId", "createdById");

-- CreateIndex
CREATE INDEX "tickets_companyId_sprintId_idx" ON "tickets"("companyId", "sprintId");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_companyId_ticketNumber_key" ON "tickets"("companyId", "ticketNumber");

-- CreateIndex
CREATE INDEX "ticket_comments_ticketId_idx" ON "ticket_comments"("ticketId");

-- CreateIndex
CREATE INDEX "ticket_reminders_ticketId_idx" ON "ticket_reminders"("ticketId");

-- CreateIndex
CREATE INDEX "ticket_reminders_userId_remindAt_idx" ON "ticket_reminders"("userId", "remindAt");

-- CreateIndex
CREATE INDEX "ticket_reminders_isSent_remindAt_idx" ON "ticket_reminders"("isSent", "remindAt");

-- CreateIndex
CREATE INDEX "chat_rooms_companyId_idx" ON "chat_rooms"("companyId");

-- CreateIndex
CREATE INDEX "chat_rooms_lastMessageAt_idx" ON "chat_rooms"("lastMessageAt");

-- CreateIndex
CREATE INDEX "chat_room_participants_userId_idx" ON "chat_room_participants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_room_participants_roomId_userId_key" ON "chat_room_participants"("roomId", "userId");

-- CreateIndex
CREATE INDEX "chat_messages_roomId_createdAt_idx" ON "chat_messages"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "chat_messages_senderId_idx" ON "chat_messages"("senderId");

-- CreateIndex
CREATE INDEX "chat_messages_expiresAt_idx" ON "chat_messages"("expiresAt");

-- CreateIndex
CREATE INDEX "leaves_companyId_status_idx" ON "leaves"("companyId", "status");

-- CreateIndex
CREATE INDEX "leaves_companyId_userId_idx" ON "leaves"("companyId", "userId");

-- CreateIndex
CREATE INDEX "leaves_companyId_startDate_endDate_idx" ON "leaves"("companyId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "leave_balances_companyId_year_idx" ON "leave_balances"("companyId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_userId_companyId_year_key" ON "leave_balances"("userId", "companyId", "year");

-- CreateIndex
CREATE INDEX "demo_requests_status_idx" ON "demo_requests"("status");

-- CreateIndex
CREATE INDEX "demo_requests_createdAt_idx" ON "demo_requests"("createdAt");

-- CreateIndex
CREATE INDEX "demo_requests_email_idx" ON "demo_requests"("email");

-- CreateIndex
CREATE INDEX "demo_request_tasks_demoRequestId_idx" ON "demo_request_tasks"("demoRequestId");

-- CreateIndex
CREATE INDEX "demo_request_tasks_dueDate_idx" ON "demo_request_tasks"("dueDate");

-- CreateIndex
CREATE INDEX "demo_request_tasks_completed_notifiedAt_idx" ON "demo_request_tasks"("completed", "notifiedAt");

-- CreateIndex
CREATE INDEX "demo_request_notes_demoRequestId_idx" ON "demo_request_notes"("demoRequestId");

-- CreateIndex
CREATE INDEX "demo_request_notes_createdAt_idx" ON "demo_request_notes"("createdAt");

-- CreateIndex
CREATE INDEX "expenses_companyId_idx" ON "expenses"("companyId");

-- CreateIndex
CREATE INDEX "expenses_companyId_category_idx" ON "expenses"("companyId", "category");

-- CreateIndex
CREATE INDEX "expenses_companyId_status_idx" ON "expenses"("companyId", "status");

-- CreateIndex
CREATE INDEX "expenses_companyId_expenseDate_idx" ON "expenses"("companyId", "expenseDate");

-- CreateIndex
CREATE INDEX "documents_companyId_idx" ON "documents"("companyId");

-- CreateIndex
CREATE INDEX "documents_goodsReceiptId_idx" ON "documents"("goodsReceiptId");

-- CreateIndex
CREATE INDEX "documents_invoiceId_idx" ON "documents"("invoiceId");

-- CreateIndex
CREATE INDEX "documents_expenseId_idx" ON "documents"("expenseId");

-- CreateIndex
CREATE INDEX "documents_stockReceiptId_idx" ON "documents"("stockReceiptId");

-- CreateIndex
CREATE INDEX "documents_acceptanceProtocolId_idx" ON "documents"("acceptanceProtocolId");

-- CreateIndex
CREATE INDEX "documents_ascertainmentProtocolId_idx" ON "documents"("ascertainmentProtocolId");

-- CreateIndex
CREATE INDEX "stock_receipts_companyId_status_idx" ON "stock_receipts"("companyId", "status");

-- CreateIndex
CREATE INDEX "stock_receipts_companyId_documentDate_idx" ON "stock_receipts"("companyId", "documentDate");

-- CreateIndex
CREATE UNIQUE INDEX "stock_receipts_companyId_documentNumber_key" ON "stock_receipts"("companyId", "documentNumber");

-- CreateIndex
CREATE INDEX "stock_receipt_items_stockReceiptId_idx" ON "stock_receipt_items"("stockReceiptId");

-- CreateIndex
CREATE INDEX "acceptance_protocols_companyId_status_idx" ON "acceptance_protocols"("companyId", "status");

-- CreateIndex
CREATE INDEX "acceptance_protocols_companyId_documentDate_idx" ON "acceptance_protocols"("companyId", "documentDate");

-- CreateIndex
CREATE INDEX "acceptance_protocols_orderId_idx" ON "acceptance_protocols"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "acceptance_protocols_companyId_documentNumber_key" ON "acceptance_protocols"("companyId", "documentNumber");

-- CreateIndex
CREATE INDEX "acceptance_protocol_items_acceptanceProtocolId_idx" ON "acceptance_protocol_items"("acceptanceProtocolId");

-- CreateIndex
CREATE INDEX "ascertainment_protocols_companyId_status_idx" ON "ascertainment_protocols"("companyId", "status");

-- CreateIndex
CREATE INDEX "ascertainment_protocols_companyId_documentDate_idx" ON "ascertainment_protocols"("companyId", "documentDate");

-- CreateIndex
CREATE UNIQUE INDEX "ascertainment_protocols_companyId_documentNumber_key" ON "ascertainment_protocols"("companyId", "documentNumber");

-- CreateIndex
CREATE INDEX "bill_of_materials_companyId_productId_idx" ON "bill_of_materials"("companyId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "bill_of_materials_companyId_name_key" ON "bill_of_materials"("companyId", "name");

-- CreateIndex
CREATE INDEX "bom_items_bomId_idx" ON "bom_items"("bomId");

-- CreateIndex
CREATE INDEX "production_orders_companyId_status_idx" ON "production_orders"("companyId", "status");

-- CreateIndex
CREATE INDEX "production_orders_companyId_productId_idx" ON "production_orders"("companyId", "productId");

-- CreateIndex
CREATE INDEX "production_orders_companyId_customerId_idx" ON "production_orders"("companyId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "production_orders_companyId_orderNumber_key" ON "production_orders"("companyId", "orderNumber");

-- CreateIndex
CREATE INDEX "production_material_issuances_productionOrderId_idx" ON "production_material_issuances"("productionOrderId");

-- CreateIndex
CREATE INDEX "production_material_issuances_companyId_productId_idx" ON "production_material_issuances"("companyId", "productId");

-- CreateIndex
CREATE INDEX "production_material_issuances_companyId_issuedAt_idx" ON "production_material_issuances"("companyId", "issuedAt");

-- CreateIndex
CREATE INDEX "stock_transfers_companyId_status_idx" ON "stock_transfers"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "stock_transfers_companyId_transferNumber_key" ON "stock_transfers"("companyId", "transferNumber");

-- CreateIndex
CREATE UNIQUE INDEX "econt_configs_companyId_key" ON "econt_configs"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "speedy_configs_companyId_key" ON "speedy_configs"("companyId");

-- CreateIndex
CREATE INDEX "shipments_companyId_status_idx" ON "shipments"("companyId", "status");

-- CreateIndex
CREATE INDEX "shipments_orderId_idx" ON "shipments"("orderId");

-- CreateIndex
CREATE INDEX "warranty_templates_companyId_idx" ON "warranty_templates"("companyId");

-- CreateIndex
CREATE INDEX "issued_warranties_companyId_status_idx" ON "issued_warranties"("companyId", "status");

-- CreateIndex
CREATE INDEX "issued_warranties_orderId_idx" ON "issued_warranties"("orderId");

-- CreateIndex
CREATE INDEX "issued_warranties_customerId_idx" ON "issued_warranties"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "issued_warranties_companyId_warrantyNumber_key" ON "issued_warranties"("companyId", "warrantyNumber");

-- CreateIndex
CREATE INDEX "contact_submissions_status_idx" ON "contact_submissions"("status");

-- CreateIndex
CREATE INDEX "contact_submissions_createdAt_idx" ON "contact_submissions"("createdAt");

-- CreateIndex
CREATE INDEX "service_assets_companyId_customerId_idx" ON "service_assets"("companyId", "customerId");

-- CreateIndex
CREATE INDEX "service_assets_companyId_serialNumber_idx" ON "service_assets"("companyId", "serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "service_assets_companyId_assetNumber_key" ON "service_assets"("companyId", "assetNumber");

-- CreateIndex
CREATE UNIQUE INDEX "service_orders_publicToken_key" ON "service_orders"("publicToken");

-- CreateIndex
CREATE INDEX "service_orders_companyId_status_idx" ON "service_orders"("companyId", "status");

-- CreateIndex
CREATE INDEX "service_orders_companyId_technicianId_idx" ON "service_orders"("companyId", "technicianId");

-- CreateIndex
CREATE INDEX "service_orders_companyId_customerId_idx" ON "service_orders"("companyId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "service_orders_companyId_orderNumber_key" ON "service_orders"("companyId", "orderNumber");

-- CreateIndex
CREATE INDEX "service_order_parts_serviceOrderId_idx" ON "service_order_parts"("serviceOrderId");

-- CreateIndex
CREATE INDEX "service_order_labor_serviceOrderId_idx" ON "service_order_labor"("serviceOrderId");

-- CreateIndex
CREATE INDEX "service_order_time_logs_serviceOrderId_idx" ON "service_order_time_logs"("serviceOrderId");

-- CreateIndex
CREATE INDEX "service_order_time_logs_technicianId_idx" ON "service_order_time_logs"("technicianId");

-- CreateIndex
CREATE INDEX "service_order_attachments_serviceOrderId_idx" ON "service_order_attachments"("serviceOrderId");

-- CreateIndex
CREATE INDEX "service_order_status_history_serviceOrderId_idx" ON "service_order_status_history"("serviceOrderId");

-- CreateIndex
CREATE INDEX "service_loaners_serviceOrderId_idx" ON "service_loaners"("serviceOrderId");

-- CreateIndex
CREATE INDEX "service_contracts_companyId_status_idx" ON "service_contracts"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "service_contracts_companyId_contractNumber_key" ON "service_contracts"("companyId", "contractNumber");

-- CreateIndex
CREATE INDEX "employment_contracts_companyId_idx" ON "employment_contracts"("companyId");

-- CreateIndex
CREATE INDEX "employment_contracts_companyId_userId_idx" ON "employment_contracts"("companyId", "userId");

-- CreateIndex
CREATE INDEX "employment_contracts_companyId_status_idx" ON "employment_contracts"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "employment_contracts_companyId_number_key" ON "employment_contracts"("companyId", "number");

-- CreateIndex
CREATE INDEX "employment_annexes_companyId_idx" ON "employment_annexes"("companyId");

-- CreateIndex
CREATE INDEX "employment_annexes_companyId_userId_idx" ON "employment_annexes"("companyId", "userId");

-- CreateIndex
CREATE INDEX "employment_annexes_contractId_idx" ON "employment_annexes"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "employment_annexes_companyId_number_key" ON "employment_annexes"("companyId", "number");

-- CreateIndex
CREATE INDEX "employment_orders_companyId_idx" ON "employment_orders"("companyId");

-- CreateIndex
CREATE INDEX "employment_orders_companyId_userId_idx" ON "employment_orders"("companyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "employment_orders_companyId_number_key" ON "employment_orders"("companyId", "number");

-- CreateIndex
CREATE INDEX "job_descriptions_companyId_idx" ON "job_descriptions"("companyId");

-- CreateIndex
CREATE INDEX "job_descriptions_companyId_userId_idx" ON "job_descriptions"("companyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "terminations_contractId_key" ON "terminations"("contractId");

-- CreateIndex
CREATE INDEX "terminations_companyId_idx" ON "terminations"("companyId");

-- CreateIndex
CREATE INDEX "terminations_companyId_userId_idx" ON "terminations"("companyId", "userId");

-- CreateIndex
CREATE INDEX "employee_documents_companyId_idx" ON "employee_documents"("companyId");

-- CreateIndex
CREATE INDEX "employee_documents_companyId_userId_idx" ON "employee_documents"("companyId", "userId");

-- CreateIndex
CREATE INDEX "employee_documents_companyId_category_idx" ON "employee_documents"("companyId", "category");

-- CreateIndex
CREATE INDEX "employee_document_files_companyId_idx" ON "employee_document_files"("companyId");

-- CreateIndex
CREATE INDEX "employee_document_files_employmentContractId_idx" ON "employee_document_files"("employmentContractId");

-- CreateIndex
CREATE INDEX "employee_document_files_employmentAnnexId_idx" ON "employee_document_files"("employmentAnnexId");

-- CreateIndex
CREATE INDEX "employee_document_files_employmentOrderId_idx" ON "employee_document_files"("employmentOrderId");

-- CreateIndex
CREATE INDEX "employee_document_files_jobDescriptionId_idx" ON "employee_document_files"("jobDescriptionId");

-- CreateIndex
CREATE INDEX "employee_document_files_terminationId_idx" ON "employee_document_files"("terminationId");

-- CreateIndex
CREATE INDEX "employee_document_files_employeeDocumentId_idx" ON "employee_document_files"("employeeDocumentId");

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_webhooks" ADD CONSTRAINT "integration_webhooks_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_webhook_deliveries" ADD CONSTRAINT "integration_webhook_deliveries_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "integration_webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_webhook_deliveries" ADD CONSTRAINT "integration_webhook_deliveries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_plans" ADD CONSTRAINT "company_plans_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_plans" ADD CONSTRAINT "company_plans_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_plans" ADD CONSTRAINT "company_plans_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_plan_items" ADD CONSTRAINT "company_plan_items_planId_fkey" FOREIGN KEY ("planId") REFERENCES "company_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_plan_items" ADD CONSTRAINT "company_plan_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_plan_invoices" ADD CONSTRAINT "company_plan_invoices_planId_fkey" FOREIGN KEY ("planId") REFERENCES "company_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_plan_invoices" ADD CONSTRAINT "company_plan_invoices_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_members" ADD CONSTRAINT "department_members_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_purchaseCurrencyId_fkey" FOREIGN KEY ("purchaseCurrencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_saleCurrencyId_fkey" FOREIGN KEY ("saleCurrencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_warrantyTemplateId_fkey" FOREIGN KEY ("warrantyTemplateId") REFERENCES "warranty_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_zones" ADD CONSTRAINT "storage_zones_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "goods_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_tasks" ADD CONSTRAINT "deal_tasks_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_tasks" ADD CONSTRAINT "deal_tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_tasks" ADD CONSTRAINT "deal_tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_tasks" ADD CONSTRAINT "deal_tasks_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_sourceOfferId_fkey" FOREIGN KEY ("sourceOfferId") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_inventoryBatchId_fkey" FOREIGN KEY ("inventoryBatchId") REFERENCES "inventory_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_inventorySerialId_fkey" FOREIGN KEY ("inventorySerialId") REFERENCES "inventory_serials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_applications" ADD CONSTRAINT "credit_applications_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_applications" ADD CONSTRAINT "credit_applications_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_applications" ADD CONSTRAINT "credit_applications_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_applications" ADD CONSTRAINT "credit_applications_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_items" ADD CONSTRAINT "offer_items_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_items" ADD CONSTRAINT "offer_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_storageZoneId_fkey" FOREIGN KEY ("storageZoneId") REFERENCES "storage_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_goodsReceiptItemId_fkey" FOREIGN KEY ("goodsReceiptItemId") REFERENCES "goods_receipt_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_serials" ADD CONSTRAINT "inventory_serials_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_serials" ADD CONSTRAINT "inventory_serials_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_serials" ADD CONSTRAINT "inventory_serials_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_serials" ADD CONSTRAINT "inventory_serials_storageZoneId_fkey" FOREIGN KEY ("storageZoneId") REFERENCES "storage_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_serials" ADD CONSTRAINT "inventory_serials_goodsReceiptItemId_fkey" FOREIGN KEY ("goodsReceiptItemId") REFERENCES "goods_receipt_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_advance_deductions" ADD CONSTRAINT "invoice_advance_deductions_finalInvoiceId_fkey" FOREIGN KEY ("finalInvoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_advance_deductions" ADD CONSTRAINT "invoice_advance_deductions_advanceInvoiceId_fkey" FOREIGN KEY ("advanceInvoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_review_items" ADD CONSTRAINT "performance_review_items_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "performance_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprint_members" ADD CONSTRAINT "sprint_members_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "sprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprint_members" ADD CONSTRAINT "sprint_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprint_members" ADD CONSTRAINT "sprint_members_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_logs" ADD CONSTRAINT "time_logs_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_logs" ADD CONSTRAINT "time_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_logs" ADD CONSTRAINT "time_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "sprints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_reminders" ADD CONSTRAINT "ticket_reminders_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_reminders" ADD CONSTRAINT "ticket_reminders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_room_participants" ADD CONSTRAINT "chat_room_participants_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_room_participants" ADD CONSTRAINT "chat_room_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_request_tasks" ADD CONSTRAINT "demo_request_tasks_demoRequestId_fkey" FOREIGN KEY ("demoRequestId") REFERENCES "demo_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_request_notes" ADD CONSTRAINT "demo_request_notes_demoRequestId_fkey" FOREIGN KEY ("demoRequestId") REFERENCES "demo_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "goods_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "goods_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_stockReceiptId_fkey" FOREIGN KEY ("stockReceiptId") REFERENCES "stock_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_acceptanceProtocolId_fkey" FOREIGN KEY ("acceptanceProtocolId") REFERENCES "acceptance_protocols"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_ascertainmentProtocolId_fkey" FOREIGN KEY ("ascertainmentProtocolId") REFERENCES "ascertainment_protocols"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_receipts" ADD CONSTRAINT "stock_receipts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_receipts" ADD CONSTRAINT "stock_receipts_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_receipts" ADD CONSTRAINT "stock_receipts_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_receipts" ADD CONSTRAINT "stock_receipts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_receipts" ADD CONSTRAINT "stock_receipts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_receipt_items" ADD CONSTRAINT "stock_receipt_items_stockReceiptId_fkey" FOREIGN KEY ("stockReceiptId") REFERENCES "stock_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_receipt_items" ADD CONSTRAINT "stock_receipt_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceptance_protocols" ADD CONSTRAINT "acceptance_protocols_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceptance_protocols" ADD CONSTRAINT "acceptance_protocols_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceptance_protocols" ADD CONSTRAINT "acceptance_protocols_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceptance_protocols" ADD CONSTRAINT "acceptance_protocols_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceptance_protocols" ADD CONSTRAINT "acceptance_protocols_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceptance_protocols" ADD CONSTRAINT "acceptance_protocols_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceptance_protocol_items" ADD CONSTRAINT "acceptance_protocol_items_acceptanceProtocolId_fkey" FOREIGN KEY ("acceptanceProtocolId") REFERENCES "acceptance_protocols"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceptance_protocol_items" ADD CONSTRAINT "acceptance_protocol_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ascertainment_protocols" ADD CONSTRAINT "ascertainment_protocols_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ascertainment_protocols" ADD CONSTRAINT "ascertainment_protocols_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ascertainment_protocols" ADD CONSTRAINT "ascertainment_protocols_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ascertainment_protocols" ADD CONSTRAINT "ascertainment_protocols_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_of_materials" ADD CONSTRAINT "bill_of_materials_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_of_materials" ADD CONSTRAINT "bill_of_materials_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_of_materials" ADD CONSTRAINT "bill_of_materials_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "bill_of_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "bill_of_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_material_issuances" ADD CONSTRAINT "production_material_issuances_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_material_issuances" ADD CONSTRAINT "production_material_issuances_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "production_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_material_issuances" ADD CONSTRAINT "production_material_issuances_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_material_issuances" ADD CONSTRAINT "production_material_issuances_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_material_issuances" ADD CONSTRAINT "production_material_issuances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_stockTransferId_fkey" FOREIGN KEY ("stockTransferId") REFERENCES "stock_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_inventoryBatchId_fkey" FOREIGN KEY ("inventoryBatchId") REFERENCES "inventory_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_serials" ADD CONSTRAINT "stock_transfer_serials_stockTransferItemId_fkey" FOREIGN KEY ("stockTransferItemId") REFERENCES "stock_transfer_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_serials" ADD CONSTRAINT "stock_transfer_serials_inventorySerialId_fkey" FOREIGN KEY ("inventorySerialId") REFERENCES "inventory_serials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "econt_configs" ADD CONSTRAINT "econt_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "speedy_configs" ADD CONSTRAINT "speedy_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_templates" ADD CONSTRAINT "warranty_templates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_templates" ADD CONSTRAINT "warranty_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issued_warranties" ADD CONSTRAINT "issued_warranties_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issued_warranties" ADD CONSTRAINT "issued_warranties_warrantyTemplateId_fkey" FOREIGN KEY ("warrantyTemplateId") REFERENCES "warranty_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issued_warranties" ADD CONSTRAINT "issued_warranties_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issued_warranties" ADD CONSTRAINT "issued_warranties_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issued_warranties" ADD CONSTRAINT "issued_warranties_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_assets" ADD CONSTRAINT "service_assets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_assets" ADD CONSTRAINT "service_assets_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_assets" ADD CONSTRAINT "service_assets_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_assets" ADD CONSTRAINT "service_assets_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "issued_warranties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "service_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "service_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_parts" ADD CONSTRAINT "service_order_parts_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_parts" ADD CONSTRAINT "service_order_parts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_parts" ADD CONSTRAINT "service_order_parts_inventoryBatchId_fkey" FOREIGN KEY ("inventoryBatchId") REFERENCES "inventory_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_parts" ADD CONSTRAINT "service_order_parts_inventorySerialId_fkey" FOREIGN KEY ("inventorySerialId") REFERENCES "inventory_serials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_labor" ADD CONSTRAINT "service_order_labor_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_time_logs" ADD CONSTRAINT "service_order_time_logs_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_time_logs" ADD CONSTRAINT "service_order_time_logs_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_attachments" ADD CONSTRAINT "service_order_attachments_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_attachments" ADD CONSTRAINT "service_order_attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_status_history" ADD CONSTRAINT "service_order_status_history_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_status_history" ADD CONSTRAINT "service_order_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_loaners" ADD CONSTRAINT "service_loaners_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_loaners" ADD CONSTRAINT "service_loaners_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_contracts" ADD CONSTRAINT "service_contracts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_contracts" ADD CONSTRAINT "service_contracts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_contracts" ADD CONSTRAINT "employment_contracts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_annexes" ADD CONSTRAINT "employment_annexes_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "employment_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_annexes" ADD CONSTRAINT "employment_annexes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_orders" ADD CONSTRAINT "employment_orders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terminations" ADD CONSTRAINT "terminations_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "employment_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terminations" ADD CONSTRAINT "terminations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_document_files" ADD CONSTRAINT "employee_document_files_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_document_files" ADD CONSTRAINT "employee_document_files_employmentContractId_fkey" FOREIGN KEY ("employmentContractId") REFERENCES "employment_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_document_files" ADD CONSTRAINT "employee_document_files_employmentAnnexId_fkey" FOREIGN KEY ("employmentAnnexId") REFERENCES "employment_annexes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_document_files" ADD CONSTRAINT "employee_document_files_employmentOrderId_fkey" FOREIGN KEY ("employmentOrderId") REFERENCES "employment_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_document_files" ADD CONSTRAINT "employee_document_files_jobDescriptionId_fkey" FOREIGN KEY ("jobDescriptionId") REFERENCES "job_descriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_document_files" ADD CONSTRAINT "employee_document_files_terminationId_fkey" FOREIGN KEY ("terminationId") REFERENCES "terminations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_document_files" ADD CONSTRAINT "employee_document_files_employeeDocumentId_fkey" FOREIGN KEY ("employeeDocumentId") REFERENCES "employee_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

