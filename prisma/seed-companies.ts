/**
 * Seed script for 3 simulated real companies:
 * 1. МеталПро ООД - Manufacturing (production module, BOMs, raw materials → finished goods)
 * 2. ФрешФууд БГ ЕООД - Food & Beverage (stock transfers, batch products, deliveries, sales)
 * 3. БизнесКонсулт АД - Brokerage/Consulting (services, expenses, payroll, HR)
 */

import { PrismaClient } from '@prisma/client';

const BASE = 'http://localhost:3001/api';
const prisma = new PrismaClient();

// Cookie jar
let cookie = '';


async function api(method: string, path: string, body?: any) {
  const opts: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);

  // Capture set-cookie
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const token = setCookie.match(/access_token=([^;]+)/);
    if (token) cookie = `access_token=${token[1]}`;
  }

  const text = await res.text();
  if (!res.ok) {
    console.error(`❌ ${method} ${path} → ${res.status}`);
    console.error(text.substring(0, 500));
    throw new Error(`API error: ${res.status} on ${method} ${path}`);
  }

  const json = text ? JSON.parse(text) : {};

  // Auto-unwrap admin endpoint responses like { success: true, company: {...} }
  if (json.success) {
    // Find the data key (not 'success', 'message', 'statusCode', 'timestamp', 'path')
    const dataKeys = Object.keys(json).filter(
      (k) => !['success', 'message', 'statusCode', 'timestamp', 'path'].includes(k),
    );
    if (dataKeys.length === 1) {
      return json[dataKeys[0]];
    }
  }

  return json;
}

async function login(email: string, password: string) {
  return api('POST', '/auth/login', { email, password });
}

async function switchCompany(companyId: string) {
  return api('POST', `/auth/switch-company/${companyId}`);
}

// Helper to generate dates in the past months
function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function monthStart(monthsAgo: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo, 1);
  return d.toISOString().split('T')[0];
}

// =============================================
// Cleanup existing test companies
// =============================================
const TEST_EIKS = ['201456789', '202567890', '203678901'];
const TEST_EMAILS = [
  'georgi@metalpro.bg', 'ivan@metalpro.bg', 'maria@metalpro.bg',
  'nikolay@freshfood.bg', 'stoyan@freshfood.bg', 'diana@freshfood.bg', 'petar@freshfood.bg',
  'aleksandra@bizconsult.bg', 'vesela@bizconsult.bg', 'dimitar@bizconsult.bg',
  'kalina@bizconsult.bg', 'boris@bizconsult.bg', 'galina@bizconsult.bg',
];

async function cleanup() {
  console.log('🧹 Cleaning up existing test data via Prisma...\n');

  // Find test companies
  const companies = await prisma.company.findMany({
    where: { eik: { in: TEST_EIKS } },
    select: { id: true, name: true },
  });

  for (const c of companies) {
    console.log(`  Deleting ${c.name} and all related data...`);

    // Delete all related data in correct order (foreign key dependencies)
    await prisma.stockTransferSerial.deleteMany({ where: { stockTransferItem: { stockTransfer: { companyId: c.id } } } });
    await prisma.stockTransferItem.deleteMany({ where: { stockTransfer: { companyId: c.id } } });
    await prisma.stockTransfer.deleteMany({ where: { companyId: c.id } });
    await prisma.productionOrderMaterial.deleteMany({ where: { productionOrder: { companyId: c.id } } });
    await prisma.productionOrder.deleteMany({ where: { companyId: c.id } });
    await prisma.bOMItem.deleteMany({ where: { bom: { companyId: c.id } } });
    await prisma.billOfMaterial.deleteMany({ where: { companyId: c.id } });
    await prisma.companyPlanInvoice.deleteMany({ where: { plan: { companyId: c.id } } });
    await prisma.companyPlanItem.deleteMany({ where: { plan: { companyId: c.id } } });
    await prisma.companyPlan.deleteMany({ where: { companyId: c.id } });
    await prisma.invoiceItem.deleteMany({ where: { invoice: { companyId: c.id } } });
    await prisma.invoice.deleteMany({ where: { companyId: c.id } });
    await prisma.orderItem.deleteMany({ where: { order: { companyId: c.id } } });
    await prisma.order.deleteMany({ where: { companyId: c.id } });
    await prisma.stockDocumentItem.deleteMany({ where: { stockDocument: { companyId: c.id } } });
    await prisma.stockDocument.deleteMany({ where: { companyId: c.id } });
    await prisma.document.deleteMany({ where: { companyId: c.id } });
    await prisma.inventoryBatch.deleteMany({ where: { companyId: c.id } });
    await prisma.inventorySerial.deleteMany({ where: { companyId: c.id } });
    await prisma.goodsReceiptItem.deleteMany({ where: { goodsReceipt: { companyId: c.id } } });
    await prisma.goodsReceipt.deleteMany({ where: { companyId: c.id } });
    await prisma.expense.deleteMany({ where: { companyId: c.id } });
    await prisma.payrollItem.deleteMany({ where: { payroll: { companyId: c.id } } });
    await prisma.payroll.deleteMany({ where: { companyId: c.id } });
    await prisma.attendance.deleteMany({ where: { companyId: c.id } });
    await prisma.leave.deleteMany({ where: { companyId: c.id } });
    await prisma.leaveBalance.deleteMany({ where: { companyId: c.id } });
    await prisma.performanceReviewItem.deleteMany({ where: { review: { companyId: c.id } } });
    await prisma.performanceReview.deleteMany({ where: { companyId: c.id } });
    await prisma.departmentMember.deleteMany({ where: { companyId: c.id } });
    await prisma.department.deleteMany({ where: { companyId: c.id } });
    await prisma.ticketComment.deleteMany({ where: { ticket: { companyId: c.id } } });
    await prisma.ticketReminder.deleteMany({ where: { ticket: { companyId: c.id } } });
    await prisma.timeLog.deleteMany({ where: { companyId: c.id } });
    await prisma.ticket.deleteMany({ where: { companyId: c.id } });
    await prisma.sprintMember.deleteMany({ where: { companyId: c.id } });
    await prisma.sprint.deleteMany({ where: { companyId: c.id } });
    await prisma.chatMessage.deleteMany({ where: { room: { companyId: c.id } } });
    await prisma.chatRoomParticipant.deleteMany({ where: { room: { companyId: c.id } } });
    await prisma.chatRoom.deleteMany({ where: { companyId: c.id } });
    await prisma.dealTask.deleteMany({ where: { companyId: c.id } });
    await prisma.deal.deleteMany({ where: { companyId: c.id } });
    await prisma.contact.deleteMany({ where: { companyId: c.id } });
    await prisma.customer.deleteMany({ where: { companyId: c.id } });
    await prisma.supplier.deleteMany({ where: { companyId: c.id } });
    await prisma.storageZone.deleteMany({ where: { location: { companyId: c.id } } });
    await prisma.location.deleteMany({ where: { companyId: c.id } });
    await prisma.product.deleteMany({ where: { companyId: c.id } });
    await prisma.productCategory.deleteMany({ where: { companyId: c.id } });
    await prisma.apiKey.deleteMany({ where: { companyId: c.id } });
    await prisma.userCompany.deleteMany({ where: { companyId: c.id } });
    await prisma.role.deleteMany({ where: { companyId: c.id } });
    await prisma.company.delete({ where: { id: c.id } });

    console.log(`  ✅ Deleted ${c.name}`);
  }

  // Delete test users that are no longer in any company
  const users = await prisma.user.findMany({
    where: { email: { in: TEST_EMAILS } },
    select: { id: true, email: true },
  });
  for (const u of users) {
    // Check if user still has company relations
    const remaining = await prisma.userCompany.count({ where: { userId: u.id } });
    if (remaining === 0) {
      await prisma.pushSubscription.deleteMany({ where: { userId: u.id } });
      await prisma.user.delete({ where: { id: u.id } });
      console.log(`  Deleted user: ${u.email}`);
    }
  }

  console.log('✅ Cleanup complete\n');
}

// =============================================
// COMPANY 1: МеталПро ООД - Manufacturing
// =============================================
async function seedManufacturing() {
  console.log('\n🏭 === Creating МеталПро ООД (Manufacturing) ===\n');

  // Login as super admin
  await login('svetlozarrosenov@gmail.com', 'admin123');

  // Create company
  const company = await api('POST', '/admin/companies', {
    name: 'МеталПро ООД',
    eik: '201456789',
    vatNumber: 'BG201456789',
    address: 'ул. Индустриална 15',
    city: 'Пловдив',
    postalCode: '4000',
    molName: 'Георги Стоянов',
    phone: '+359 32 678 900',
    email: 'office@metalpro.bg',
    role: 'CLIENT',
  });
  const companyId = company.id;
  console.log(`✅ Company: ${company.name} (${companyId})`);

  // Create role with full permissions
  const role = await api('POST', '/admin/roles', {
    name: 'Управител',
    companyId,
    description: 'Пълен достъп',
    permissions: createFullPermissions(),
    isDefault: true,
  });
  console.log(`✅ Role: ${role.name}`);

  // Create user
  const user = await api('POST', '/admin/users', {
    email: 'georgi@metalpro.bg',
    password: 'admin123',
    firstName: 'Георги',
    lastName: 'Стоянов',
    companies: [{ companyId, roleId: role.id, isDefault: true }],
  });
  console.log(`✅ User: ${user.email}`);

  // Create worker user
  const worker = await api('POST', '/admin/users', {
    email: 'ivan@metalpro.bg',
    password: 'admin123',
    firstName: 'Иван',
    lastName: 'Петров',
    companies: [{ companyId, roleId: role.id }],
  });
  console.log(`✅ Worker: ${worker.email}`);

  // Create another worker
  const worker2 = await api('POST', '/admin/users', {
    email: 'maria@metalpro.bg',
    password: 'admin123',
    firstName: 'Мария',
    lastName: 'Димитрова',
    companies: [{ companyId, roleId: role.id }],
  });
  console.log(`✅ Worker: ${worker2.email}`);

  // Switch to this company
  await login('georgi@metalpro.bg', 'admin123');
  console.log('🔑 Logged in as georgi@metalpro.bg');

  // Create locations
  const warehouse = await api('POST', `/companies/${companyId}/locations`, {
    name: 'Основен склад',
    code: 'WH-01',
    type: 'WAREHOUSE',
    address: 'ул. Индустриална 15',
    city: 'Пловдив',
    isDefault: true,
  });
  console.log(`✅ Location: ${warehouse.name}`);

  const productionHall = await api('POST', `/companies/${companyId}/locations`, {
    name: 'Производствен цех',
    code: 'PROD-01',
    type: 'WAREHOUSE',
    address: 'ул. Индустриална 15, Хале 2',
    city: 'Пловдив',
  });
  console.log(`✅ Location: ${productionHall.name}`);

  // Create suppliers
  const steelSupplier = await api('POST', `/companies/${companyId}/suppliers`, {
    name: 'Стомана Трейд ЕООД',
    eik: '301234567',
    vatNumber: 'BG301234567',
    contactName: 'Петър Минчев',
    phone: '+359 888 111 222',
    email: 'orders@stomanatrade.bg',
    paymentTerms: 30,
  });
  console.log(`✅ Supplier: ${steelSupplier.name}`);

  const paintSupplier = await api('POST', `/companies/${companyId}/suppliers`, {
    name: 'Боядисване БГ ООД',
    eik: '302345678',
    contactName: 'Димитър Колев',
    phone: '+359 888 333 444',
    email: 'sales@boyadisvanebg.bg',
    paymentTerms: 15,
  });
  console.log(`✅ Supplier: ${paintSupplier.name}`);

  const boltsSupplier = await api('POST', `/companies/${companyId}/suppliers`, {
    name: 'ФастнерПро ЕООД',
    eik: '303456789',
    contactName: 'Стефан Иванов',
    phone: '+359 888 555 666',
    paymentTerms: 14,
  });
  console.log(`✅ Supplier: ${boltsSupplier.name}`);

  // Create raw material products
  const steelSheet = await api('POST', `/companies/${companyId}/products`, {
    sku: 'RM-STEEL-3MM',
    name: 'Стоманена ламарина 3мм',
    type: 'PRODUCT',
    unit: 'KG',
    purchasePrice: 2.80,
    salePrice: 3.50,
    vatRate: 20,
    trackInventory: true,
  });

  const steelPipe = await api('POST', `/companies/${companyId}/products`, {
    sku: 'RM-PIPE-50',
    name: 'Стоманена тръба ∅50мм',
    type: 'PRODUCT',
    unit: 'M',
    purchasePrice: 8.50,
    salePrice: 12.00,
    vatRate: 20,
    trackInventory: true,
  });

  const paint = await api('POST', `/companies/${companyId}/products`, {
    sku: 'RM-PAINT-BLK',
    name: 'Индустриална боя черна RAL9005',
    type: 'PRODUCT',
    unit: 'L',
    purchasePrice: 15.00,
    salePrice: 22.00,
    vatRate: 20,
    trackInventory: true,
  });

  const bolts = await api('POST', `/companies/${companyId}/products`, {
    sku: 'RM-BOLT-M10',
    name: 'Болт M10x30 DIN933',
    type: 'PRODUCT',
    unit: 'PIECE',
    purchasePrice: 0.35,
    salePrice: 0.60,
    vatRate: 20,
    trackInventory: true,
  });

  const nuts = await api('POST', `/companies/${companyId}/products`, {
    sku: 'RM-NUT-M10',
    name: 'Гайка M10 DIN934',
    type: 'PRODUCT',
    unit: 'PIECE',
    purchasePrice: 0.15,
    salePrice: 0.30,
    vatRate: 20,
    trackInventory: true,
  });

  const weldWire = await api('POST', `/companies/${companyId}/products`, {
    sku: 'RM-WELD-08',
    name: 'Заваръчна тел ∅0.8мм',
    type: 'PRODUCT',
    unit: 'KG',
    purchasePrice: 6.50,
    salePrice: 9.00,
    vatRate: 20,
    trackInventory: true,
  });

  console.log('✅ Raw materials created (6 products)');

  // Create finished goods
  const metalGate = await api('POST', `/companies/${companyId}/products`, {
    sku: 'FG-GATE-200',
    name: 'Метална порта 200x180см',
    type: 'PRODUCT',
    unit: 'PIECE',
    purchasePrice: 450.00,
    salePrice: 1200.00,
    vatRate: 20,
    trackInventory: true,
  });

  const metalFence = await api('POST', `/companies/${companyId}/products`, {
    sku: 'FG-FENCE-SEC',
    name: 'Метална ограда секция 250x150см',
    type: 'PRODUCT',
    unit: 'PIECE',
    purchasePrice: 180.00,
    salePrice: 450.00,
    vatRate: 20,
    trackInventory: true,
  });

  const metalRailing = await api('POST', `/companies/${companyId}/products`, {
    sku: 'FG-RAIL-1M',
    name: 'Парапет от ковано желязо 1м',
    type: 'PRODUCT',
    unit: 'M',
    purchasePrice: 120.00,
    salePrice: 320.00,
    vatRate: 20,
    trackInventory: true,
  });

  const metalTable = await api('POST', `/companies/${companyId}/products`, {
    sku: 'FG-TABLE-IND',
    name: 'Индустриална метална маса',
    type: 'PRODUCT',
    unit: 'PIECE',
    purchasePrice: 280.00,
    salePrice: 650.00,
    vatRate: 20,
    trackInventory: true,
  });

  // Service product - welding
  const weldingService = await api('POST', `/companies/${companyId}/products`, {
    sku: 'SV-WELD-HR',
    name: 'Заваръчни услуги (на час)',
    type: 'SERVICE',
    unit: 'HOUR',
    salePrice: 45.00,
    vatRate: 20,
    trackInventory: false,
  });

  console.log('✅ Finished goods & services created (5 products)');

  // Create goods receipts (buy raw materials)
  const gr1 = await api('POST', `/companies/${companyId}/goods-receipts`, {
    locationId: warehouse.id,
    supplierId: steelSupplier.id,
    receiptDate: daysAgo(60),
    notes: 'Първа доставка стомана Q1',
    items: [
      { productId: steelSheet.id, quantity: 500, unitPrice: 2.80, vatRate: 20 },
      { productId: steelPipe.id, quantity: 200, unitPrice: 8.50, vatRate: 20 },
      { productId: weldWire.id, quantity: 50, unitPrice: 6.50, vatRate: 20 },
    ],
  });
  await api('PATCH', `/companies/${companyId}/goods-receipts/${gr1.id}/status`, { status: 'DELIVERED_PAID' });
  console.log(`✅ Goods Receipt: ${gr1.receiptNumber} (delivered & paid)`);

  const gr2 = await api('POST', `/companies/${companyId}/goods-receipts`, {
    locationId: warehouse.id,
    supplierId: paintSupplier.id,
    receiptDate: daysAgo(55),
    items: [
      { productId: paint.id, quantity: 100, unitPrice: 15.00, vatRate: 20 },
    ],
  });
  await api('PATCH', `/companies/${companyId}/goods-receipts/${gr2.id}/status`, { status: 'DELIVERED_PAID' });
  console.log(`✅ Goods Receipt: ${gr2.receiptNumber} (delivered & paid)`);

  const gr3 = await api('POST', `/companies/${companyId}/goods-receipts`, {
    locationId: warehouse.id,
    supplierId: boltsSupplier.id,
    receiptDate: daysAgo(50),
    items: [
      { productId: bolts.id, quantity: 1000, unitPrice: 0.35, vatRate: 20 },
      { productId: nuts.id, quantity: 1000, unitPrice: 0.15, vatRate: 20 },
    ],
  });
  await api('PATCH', `/companies/${companyId}/goods-receipts/${gr3.id}/status`, { status: 'DELIVERED_PAID' });
  console.log(`✅ Goods Receipt: ${gr3.receiptNumber} (delivered & paid)`);

  // Second batch of materials
  const gr4 = await api('POST', `/companies/${companyId}/goods-receipts`, {
    locationId: warehouse.id,
    supplierId: steelSupplier.id,
    receiptDate: daysAgo(20),
    notes: 'Втора доставка стомана Q1',
    items: [
      { productId: steelSheet.id, quantity: 300, unitPrice: 2.85, vatRate: 20 },
      { productId: steelPipe.id, quantity: 150, unitPrice: 8.60, vatRate: 20 },
    ],
  });
  await api('PATCH', `/companies/${companyId}/goods-receipts/${gr4.id}/status`, { status: 'DELIVERED_PAID' });
  console.log(`✅ Goods Receipt: ${gr4.receiptNumber} (delivered & paid)`);

  // Create BOMs
  const gateBom = await api('POST', `/companies/${companyId}/bom`, {
    name: 'Метална порта 200x180',
    productId: metalGate.id,
    outputQuantity: 1,
    items: [
      { productId: steelSheet.id, quantity: 25, unit: 'KG' },
      { productId: steelPipe.id, quantity: 12, unit: 'M' },
      { productId: paint.id, quantity: 3, unit: 'L' },
      { productId: bolts.id, quantity: 16, unit: 'PIECE' },
      { productId: nuts.id, quantity: 16, unit: 'PIECE' },
      { productId: weldWire.id, quantity: 2, unit: 'KG' },
    ],
  });
  console.log(`✅ BOM: ${gateBom.name}`);

  const fenceBom = await api('POST', `/companies/${companyId}/bom`, {
    name: 'Оградна секция 250x150',
    productId: metalFence.id,
    outputQuantity: 1,
    items: [
      { productId: steelSheet.id, quantity: 8, unit: 'KG' },
      { productId: steelPipe.id, quantity: 6, unit: 'M' },
      { productId: paint.id, quantity: 1.5, unit: 'L' },
      { productId: bolts.id, quantity: 8, unit: 'PIECE' },
      { productId: nuts.id, quantity: 8, unit: 'PIECE' },
      { productId: weldWire.id, quantity: 0.5, unit: 'KG' },
    ],
  });
  console.log(`✅ BOM: ${fenceBom.name}`);

  const railingBom = await api('POST', `/companies/${companyId}/bom`, {
    name: 'Парапет от ковано желязо 1м',
    productId: metalRailing.id,
    outputQuantity: 1,
    items: [
      { productId: steelSheet.id, quantity: 5, unit: 'KG' },
      { productId: steelPipe.id, quantity: 3, unit: 'M' },
      { productId: paint.id, quantity: 0.8, unit: 'L' },
      { productId: weldWire.id, quantity: 0.3, unit: 'KG' },
    ],
  });
  console.log(`✅ BOM: ${railingBom.name}`);

  const tableBom = await api('POST', `/companies/${companyId}/bom`, {
    name: 'Индустриална метална маса',
    productId: metalTable.id,
    outputQuantity: 1,
    items: [
      { productId: steelSheet.id, quantity: 15, unit: 'KG' },
      { productId: steelPipe.id, quantity: 8, unit: 'M' },
      { productId: paint.id, quantity: 2, unit: 'L' },
      { productId: bolts.id, quantity: 12, unit: 'PIECE' },
      { productId: nuts.id, quantity: 12, unit: 'PIECE' },
      { productId: weldWire.id, quantity: 1, unit: 'KG' },
    ],
  });
  console.log(`✅ BOM: ${tableBom.name}`);

  // Create production orders
  const po1 = await api('POST', `/companies/${companyId}/production`, {
    productId: metalGate.id,
    bomId: gateBom.id,
    quantity: 5,
    locationId: warehouse.id,
    plannedStartDate: daysAgo(45),
    plannedEndDate: daysAgo(35),
    notes: 'Поръчка за складова наличност',
  });
  console.log(`✅ Production Order: ${po1.orderNumber} (5x порти)`);

  // Start and complete the first production order
  await api('POST', `/companies/${companyId}/production/${po1.id}/start`);
  await api('POST', `/companies/${companyId}/production/${po1.id}/complete`);
  console.log(`✅ Production Order ${po1.orderNumber} completed`);

  const po2 = await api('POST', `/companies/${companyId}/production`, {
    productId: metalFence.id,
    bomId: fenceBom.id,
    quantity: 20,
    locationId: warehouse.id,
    plannedStartDate: daysAgo(40),
    plannedEndDate: daysAgo(25),
  });
  await api('POST', `/companies/${companyId}/production/${po2.id}/start`);
  await api('POST', `/companies/${companyId}/production/${po2.id}/complete`);
  console.log(`✅ Production Order ${po2.orderNumber} completed (20x ограда)`);

  const po3 = await api('POST', `/companies/${companyId}/production`, {
    productId: metalRailing.id,
    bomId: railingBom.id,
    quantity: 15,
    locationId: warehouse.id,
    plannedStartDate: daysAgo(30),
    plannedEndDate: daysAgo(20),
  });
  await api('POST', `/companies/${companyId}/production/${po3.id}/start`);
  await api('POST', `/companies/${companyId}/production/${po3.id}/complete`);
  console.log(`✅ Production Order ${po3.orderNumber} completed (15м парапет)`);

  const po4 = await api('POST', `/companies/${companyId}/production`, {
    productId: metalTable.id,
    bomId: tableBom.id,
    quantity: 8,
    locationId: warehouse.id,
    plannedStartDate: daysAgo(15),
    plannedEndDate: daysAgo(5),
  });
  await api('POST', `/companies/${companyId}/production/${po4.id}/start`);
  console.log(`✅ Production Order ${po4.orderNumber} in progress (8x маси)`);

  // Create customers
  const customer1 = await api('POST', `/companies/${companyId}/customers`, {
    type: 'COMPANY',
    companyName: 'Строй Инвест ООД',
    eik: '401234567',
    vatNumber: 'BG401234567',
    molName: 'Красимир Тодоров',
    phone: '+359 888 999 111',
    email: 'office@stroyinvest.bg',
    address: 'бул. България 55',
    city: 'София',
    industry: 'CONSTRUCTION',
    size: 'MEDIUM',
  });

  const customer2 = await api('POST', `/companies/${companyId}/customers`, {
    type: 'COMPANY',
    companyName: 'Вила Парк ЕООД',
    eik: '402345678',
    molName: 'Елена Маринова',
    phone: '+359 888 777 333',
    email: 'elena@vilapark.bg',
    address: 'ул. Розова долина 8',
    city: 'Пловдив',
    industry: 'REAL_ESTATE',
  });

  const customer3 = await api('POST', `/companies/${companyId}/customers`, {
    type: 'INDIVIDUAL',
    firstName: 'Атанас',
    lastName: 'Георгиев',
    phone: '+359 888 222 444',
    email: 'atanas.g@gmail.com',
    address: 'ул. Хан Аспарух 22',
    city: 'Стара Загора',
  });

  console.log('✅ Customers created (3)');

  // Create orders
  const order1 = await api('POST', `/companies/${companyId}/orders`, {
    customerName: 'Строй Инвест ООД',
    customerId: customer1.id,
    customerEmail: 'office@stroyinvest.bg',
    orderDate: daysAgo(30),
    paymentMethod: 'BANK_TRANSFER',
    locationId: warehouse.id,
    items: [
      { productId: metalGate.id, quantity: 2, unitPrice: 1200.00, vatRate: 20 },
      { productId: metalFence.id, quantity: 10, unitPrice: 450.00, vatRate: 20 },
      { productId: metalRailing.id, quantity: 5, unitPrice: 320.00, vatRate: 20 },
    ],
    notes: 'Поръчка за жилищен комплекс "Зелена поляна"',
  });
  await api('POST', `/companies/${companyId}/orders/${order1.id}/confirm`);
  console.log(`✅ Order: ${order1.orderNumber} (confirmed)`);

  const order2 = await api('POST', `/companies/${companyId}/orders`, {
    customerName: 'Вила Парк ЕООД',
    customerId: customer2.id,
    orderDate: daysAgo(20),
    paymentMethod: 'BANK_TRANSFER',
    locationId: warehouse.id,
    items: [
      { productId: metalGate.id, quantity: 1, unitPrice: 1200.00, vatRate: 20 },
      { productId: metalFence.id, quantity: 6, unitPrice: 450.00, vatRate: 20 },
    ],
    notes: 'За нов парцел в с. Марково',
  });
  await api('POST', `/companies/${companyId}/orders/${order2.id}/confirm`);
  console.log(`✅ Order: ${order2.orderNumber} (confirmed)`);

  const order3 = await api('POST', `/companies/${companyId}/orders`, {
    customerName: 'Атанас Георгиев',
    customerId: customer3.id,
    orderDate: daysAgo(10),
    paymentMethod: 'CASH',
    locationId: warehouse.id,
    items: [
      { productId: metalRailing.id, quantity: 4, unitPrice: 320.00, vatRate: 20 },
      { productId: weldingService.id, quantity: 3, unitPrice: 45.00, vatRate: 20 },
    ],
  });
  await api('POST', `/companies/${companyId}/orders/${order3.id}/confirm`);
  console.log(`✅ Order: ${order3.orderNumber} (confirmed)`);

  // Large order still in draft
  const order4 = await api('POST', `/companies/${companyId}/orders`, {
    customerName: 'Строй Инвест ООД',
    customerId: customer1.id,
    orderDate: daysAgo(2),
    paymentMethod: 'BANK_TRANSFER',
    locationId: warehouse.id,
    items: [
      { productId: metalTable.id, quantity: 10, unitPrice: 650.00, vatRate: 20 },
      { productId: metalGate.id, quantity: 3, unitPrice: 1100.00, vatRate: 20, discount: 100 },
    ],
    notes: 'Оферта за индустриален парк',
  });
  console.log(`✅ Order: ${order4.orderNumber} (draft - pending approval)`);

  // Create invoices from orders
  const inv1 = await api('POST', `/companies/${companyId}/invoices`, {
    orderId: order1.id,
    invoiceDate: daysAgo(28),
    dueDate: daysAgo(-2),
  });
  console.log(`✅ Invoice: ${inv1.invoiceNumber} (issued)`);

  const inv2 = await api('POST', `/companies/${companyId}/invoices`, {
    orderId: order2.id,
    invoiceDate: daysAgo(18),
    dueDate: daysAgo(-12),
  });
  console.log(`✅ Invoice: ${inv2.invoiceNumber} (issued)`);

  // Create expenses
  const expenses = [
    { description: 'Наем производствен цех', category: 'RENT', amount: 3500, expenseDate: daysAgo(30) },
    { description: 'Ток и вода - февруари', category: 'UTILITIES', amount: 1800, expenseDate: daysAgo(25) },
    { description: 'Поддръжка заваръчни апарати', category: 'MAINTENANCE', amount: 450, expenseDate: daysAgo(20) },
    { description: 'Транспорт доставки', category: 'DELIVERY', amount: 620, expenseDate: daysAgo(15) },
    { description: 'Застраховка оборудване', category: 'INSURANCE', amount: 890, expenseDate: daysAgo(10) },
    { description: 'Офис консумативи', category: 'OFFICE_SUPPLIES', amount: 120, expenseDate: daysAgo(5) },
    { description: 'Наем производствен цех - март', category: 'RENT', amount: 3500, expenseDate: daysAgo(1) },
    { description: 'Ток и вода - март', category: 'UTILITIES', amount: 2100, expenseDate: daysAgo(1) },
  ];

  for (const exp of expenses) {
    await api('POST', `/companies/${companyId}/expenses`, exp);
  }
  console.log(`✅ Expenses created (${expenses.length})`);

  // Create payroll
  for (const u of [user, worker, worker2]) {
    const salary = u.email === 'georgi@metalpro.bg' ? 4500 : 2800;
    const payroll = await api('POST', `/companies/${companyId}/payroll`, {
      userId: u.id,
      year: 2026,
      month: 2,
      baseSalary: salary,
      workingDays: 20,
      workedDays: 20,
    });
    await api('POST', `/companies/${companyId}/payroll/${payroll.id}/approve`);
    await api('POST', `/companies/${companyId}/payroll/${payroll.id}/pay`, {});
  }
  console.log('✅ Payroll for February 2026 created & paid (3 employees)');

  // Create departments
  const prodDept = await api('POST', `/companies/${companyId}/departments`, {
    name: 'Производство',
    description: 'Производствен отдел',
    code: 'PROD',
  });
  await api('POST', `/companies/${companyId}/departments/${prodDept.id}/members`, {
    userId: worker.id,
    position: 'Заварчик',
  });
  await api('POST', `/companies/${companyId}/departments/${prodDept.id}/members`, {
    userId: worker2.id,
    position: 'Оператор CNC',
  });

  const adminDept = await api('POST', `/companies/${companyId}/departments`, {
    name: 'Администрация',
    code: 'ADMIN',
  });
  await api('POST', `/companies/${companyId}/departments/${adminDept.id}/members`, {
    userId: user.id,
    position: 'Управител',
    isHead: true,
  });
  console.log('✅ Departments created (Производство, Администрация)');

  console.log('\n✅ МеталПро ООД seed complete!\n');
  return companyId;
}

// =============================================
// COMPANY 2: ФрешФууд БГ ЕООД - Food & Beverage
// =============================================
async function seedFoodBeverage() {
  console.log('\n🍕 === Creating ФрешФууд БГ ЕООД (Food & Beverage) ===\n');

  // Login as super admin to create company
  await login('svetlozarrosenov@gmail.com', 'admin123');

  const company = await api('POST', '/admin/companies', {
    name: 'ФрешФууд БГ ЕООД',
    eik: '202567890',
    vatNumber: 'BG202567890',
    address: 'бул. Цариградско шосе 80',
    city: 'София',
    postalCode: '1113',
    molName: 'Николай Василев',
    phone: '+359 2 945 6700',
    email: 'office@freshfood.bg',
    role: 'CLIENT',
  });
  const companyId = company.id;
  console.log(`✅ Company: ${company.name} (${companyId})`);

  const role = await api('POST', '/admin/roles', {
    name: 'Управител',
    companyId,
    description: 'Пълен достъп',
    permissions: createFullPermissions(),
    isDefault: true,
  });

  const user = await api('POST', '/admin/users', {
    email: 'nikolay@freshfood.bg',
    password: 'admin123',
    firstName: 'Николай',
    lastName: 'Василев',
    companies: [{ companyId, roleId: role.id, isDefault: true }],
  });
  console.log(`✅ User: ${user.email}`);

  const warehouseWorker = await api('POST', '/admin/users', {
    email: 'stoyan@freshfood.bg',
    password: 'admin123',
    firstName: 'Стоян',
    lastName: 'Куцаров',
    companies: [{ companyId, roleId: role.id }],
  });

  const salesPerson = await api('POST', '/admin/users', {
    email: 'diana@freshfood.bg',
    password: 'admin123',
    firstName: 'Диана',
    lastName: 'Стоянова',
    companies: [{ companyId, roleId: role.id }],
  });

  const driver = await api('POST', '/admin/users', {
    email: 'petar@freshfood.bg',
    password: 'admin123',
    firstName: 'Петър',
    lastName: 'Тодоров',
    companies: [{ companyId, roleId: role.id }],
  });

  console.log('✅ Users created (4 total)');

  // Login as company user
  await login('nikolay@freshfood.bg', 'admin123');

  // Create locations
  const centralWarehouse = await api('POST', `/companies/${companyId}/locations`, {
    name: 'Централен склад',
    code: 'WH-CENTRAL',
    type: 'WAREHOUSE',
    address: 'бул. Цариградско шосе 80',
    city: 'София',
    isDefault: true,
  });

  const coldStorage = await api('POST', `/companies/${companyId}/locations`, {
    name: 'Хладилен склад',
    code: 'WH-COLD',
    type: 'WAREHOUSE',
    address: 'бул. Цариградско шосе 80, Хале Б',
    city: 'София',
  });

  const store1 = await api('POST', `/companies/${companyId}/locations`, {
    name: 'Магазин Център',
    code: 'STORE-01',
    type: 'STORE',
    address: 'ул. Граф Игнатиев 25',
    city: 'София',
  });

  const store2 = await api('POST', `/companies/${companyId}/locations`, {
    name: 'Магазин Младост',
    code: 'STORE-02',
    type: 'STORE',
    address: 'бул. Александър Малинов 78',
    city: 'София',
  });

  console.log('✅ Locations created (2 warehouses, 2 stores)');

  // Create suppliers
  const dairySupplier = await api('POST', `/companies/${companyId}/suppliers`, {
    name: 'Млечна Долина ООД',
    eik: '311234567',
    vatNumber: 'BG311234567',
    contactName: 'Борис Димов',
    phone: '+359 888 100 200',
    email: 'orders@mlechnadolina.bg',
    paymentTerms: 7,
  });

  const bakerySupplier = await api('POST', `/companies/${companyId}/suppliers`, {
    name: 'Хлебна Къща АД',
    eik: '312345678',
    vatNumber: 'BG312345678',
    contactName: 'Стефка Павлова',
    phone: '+359 888 300 400',
    paymentTerms: 3,
  });

  const beverageSupplier = await api('POST', `/companies/${companyId}/suppliers`, {
    name: 'Дринкс БГ ЕООД',
    eik: '313456789',
    contactName: 'Мартин Илиев',
    phone: '+359 888 500 600',
    email: 'martin@drinksbg.bg',
    paymentTerms: 14,
  });

  const meatSupplier = await api('POST', `/companies/${companyId}/suppliers`, {
    name: 'Месна Индустрия АД',
    eik: '314567890',
    vatNumber: 'BG314567890',
    contactName: 'Тодор Янков',
    phone: '+359 888 700 800',
    paymentTerms: 5,
  });

  console.log('✅ Suppliers created (4)');

  // Create BATCH products (food with expiry dates)
  const yogurt = await api('POST', `/companies/${companyId}/products`, {
    sku: 'DAIRY-YOG-400',
    name: 'Кисело мляко 3.6% 400г',
    type: 'BATCH',
    unit: 'PIECE',
    purchasePrice: 1.20,
    salePrice: 2.10,
    vatRate: 20,
    trackInventory: true,
  });

  const cheese = await api('POST', `/companies/${companyId}/products`, {
    sku: 'DAIRY-CHE-400',
    name: 'Бяло сирене БДС 400г',
    type: 'BATCH',
    unit: 'PIECE',
    purchasePrice: 4.50,
    salePrice: 7.80,
    vatRate: 20,
    trackInventory: true,
  });

  const butter = await api('POST', `/companies/${companyId}/products`, {
    sku: 'DAIRY-BUT-200',
    name: 'Масло краве 82% 200г',
    type: 'BATCH',
    unit: 'PIECE',
    purchasePrice: 3.80,
    salePrice: 5.90,
    vatRate: 20,
    trackInventory: true,
  });

  const bread = await api('POST', `/companies/${companyId}/products`, {
    sku: 'BAKE-BRD-650',
    name: 'Хляб типов 650г',
    type: 'BATCH',
    unit: 'PIECE',
    purchasePrice: 1.50,
    salePrice: 2.50,
    vatRate: 20,
    trackInventory: true,
  });

  const croissant = await api('POST', `/companies/${companyId}/products`, {
    sku: 'BAKE-CRO-100',
    name: 'Кроасан с шоколад 100г',
    type: 'BATCH',
    unit: 'PIECE',
    purchasePrice: 0.80,
    salePrice: 1.60,
    vatRate: 20,
    trackInventory: true,
  });

  const water = await api('POST', `/companies/${companyId}/products`, {
    sku: 'BEV-WAT-500',
    name: 'Минерална вода 500мл',
    type: 'PRODUCT',
    unit: 'PIECE',
    purchasePrice: 0.35,
    salePrice: 0.80,
    vatRate: 20,
    trackInventory: true,
  });

  const juice = await api('POST', `/companies/${companyId}/products`, {
    sku: 'BEV-JUI-1L',
    name: 'Натурален сок портокал 1л',
    type: 'BATCH',
    unit: 'PIECE',
    purchasePrice: 2.20,
    salePrice: 3.80,
    vatRate: 20,
    trackInventory: true,
  });

  const cola = await api('POST', `/companies/${companyId}/products`, {
    sku: 'BEV-COL-330',
    name: 'Кола 330мл кен',
    type: 'PRODUCT',
    unit: 'PIECE',
    purchasePrice: 0.70,
    salePrice: 1.50,
    vatRate: 20,
    trackInventory: true,
  });

  const salami = await api('POST', `/companies/${companyId}/products`, {
    sku: 'MEAT-SAL-200',
    name: 'Салам Елена 200г',
    type: 'BATCH',
    unit: 'PIECE',
    purchasePrice: 5.50,
    salePrice: 8.90,
    vatRate: 20,
    trackInventory: true,
  });

  const chicken = await api('POST', `/companies/${companyId}/products`, {
    sku: 'MEAT-CHK-1KG',
    name: 'Пилешко филе 1кг',
    type: 'BATCH',
    unit: 'KG',
    purchasePrice: 9.50,
    salePrice: 14.90,
    vatRate: 20,
    trackInventory: true,
  });

  // Delivery service
  const deliveryService = await api('POST', `/companies/${companyId}/products`, {
    sku: 'SV-DELIVERY',
    name: 'Доставка до адрес',
    type: 'SERVICE',
    unit: 'PIECE',
    salePrice: 5.00,
    vatRate: 20,
    trackInventory: false,
  });

  console.log('✅ Products created (11 - including batch & service)');

  // Goods receipts with batch tracking
  const grDairy = await api('POST', `/companies/${companyId}/goods-receipts`, {
    locationId: coldStorage.id,
    supplierId: dairySupplier.id,
    receiptDate: daysAgo(14),
    notes: 'Седмична доставка млечни',
    items: [
      { productId: yogurt.id, quantity: 200, unitPrice: 1.20, vatRate: 20 },
      { productId: cheese.id, quantity: 80, unitPrice: 4.50, vatRate: 20 },
      { productId: butter.id, quantity: 60, unitPrice: 3.80, vatRate: 20 },
    ],
  });
  await api('PATCH', `/companies/${companyId}/goods-receipts/${grDairy.id}/status`, { status: 'DELIVERED_PAID' });
  console.log(`✅ Goods Receipt: ${grDairy.receiptNumber} (dairy - delivered)`);

  const grBakery = await api('POST', `/companies/${companyId}/goods-receipts`, {
    locationId: centralWarehouse.id,
    supplierId: bakerySupplier.id,
    receiptDate: daysAgo(12),
    items: [
      { productId: bread.id, quantity: 100, unitPrice: 1.50, vatRate: 20 },
      { productId: croissant.id, quantity: 150, unitPrice: 0.80, vatRate: 20 },
    ],
  });
  await api('PATCH', `/companies/${companyId}/goods-receipts/${grBakery.id}/status`, { status: 'DELIVERED_PAID' });
  console.log(`✅ Goods Receipt: ${grBakery.receiptNumber} (bakery - delivered)`);

  const grBev = await api('POST', `/companies/${companyId}/goods-receipts`, {
    locationId: centralWarehouse.id,
    supplierId: beverageSupplier.id,
    receiptDate: daysAgo(10),
    items: [
      { productId: water.id, quantity: 500, unitPrice: 0.35, vatRate: 20 },
      { productId: juice.id, quantity: 100, unitPrice: 2.20, vatRate: 20 },
      { productId: cola.id, quantity: 300, unitPrice: 0.70, vatRate: 20 },
    ],
  });
  await api('PATCH', `/companies/${companyId}/goods-receipts/${grBev.id}/status`, { status: 'DELIVERED_PAID' });
  console.log(`✅ Goods Receipt: ${grBev.receiptNumber} (beverages - delivered)`);

  const grMeat = await api('POST', `/companies/${companyId}/goods-receipts`, {
    locationId: coldStorage.id,
    supplierId: meatSupplier.id,
    receiptDate: daysAgo(8),
    items: [
      { productId: salami.id, quantity: 50, unitPrice: 5.50, vatRate: 20 },
      { productId: chicken.id, quantity: 80, unitPrice: 9.50, vatRate: 20 },
    ],
  });
  await api('PATCH', `/companies/${companyId}/goods-receipts/${grMeat.id}/status`, { status: 'DELIVERED_PAID' });
  console.log(`✅ Goods Receipt: ${grMeat.receiptNumber} (meat - delivered)`);

  // Second dairy delivery (newer batch)
  const grDairy2 = await api('POST', `/companies/${companyId}/goods-receipts`, {
    locationId: coldStorage.id,
    supplierId: dairySupplier.id,
    receiptDate: daysAgo(3),
    notes: 'Седмична доставка млечни #2',
    items: [
      { productId: yogurt.id, quantity: 200, unitPrice: 1.25, vatRate: 20 },
      { productId: cheese.id, quantity: 50, unitPrice: 4.60, vatRate: 20 },
    ],
  });
  await api('PATCH', `/companies/${companyId}/goods-receipts/${grDairy2.id}/status`, { status: 'DELIVERED_PAID' });
  console.log(`✅ Goods Receipt: ${grDairy2.receiptNumber} (dairy #2 - delivered)`);

  // Stock transfers: warehouse → stores
  const st1 = await api('POST', `/companies/${companyId}/stock-transfers`, {
    fromLocationId: coldStorage.id,
    toLocationId: store1.id,
    transferDate: daysAgo(7),
    responsibleId: warehouseWorker.id,
    notes: 'Зареждане Магазин Център',
    items: [
      { productId: yogurt.id, quantity: 50 },
      { productId: cheese.id, quantity: 20 },
      { productId: butter.id, quantity: 15 },
      { productId: salami.id, quantity: 10 },
      { productId: chicken.id, quantity: 15 },
    ],
  });
  await api('POST', `/companies/${companyId}/stock-transfers/${st1.id}/ship`);
  // Get transfer details to get item IDs
  const st1Detail = await api('GET', `/companies/${companyId}/stock-transfers/${st1.id}`);
  await api('POST', `/companies/${companyId}/stock-transfers/${st1.id}/receive`, {
    items: st1Detail.items.map((item: any) => ({ itemId: item.id, receivedQty: Number(item.quantity) })),
  });
  console.log(`✅ Stock Transfer: ${st1.transferNumber} → Магазин Център (received)`);

  const st2 = await api('POST', `/companies/${companyId}/stock-transfers`, {
    fromLocationId: centralWarehouse.id,
    toLocationId: store1.id,
    transferDate: daysAgo(7),
    notes: 'Зареждане напитки Център',
    items: [
      { productId: water.id, quantity: 100 },
      { productId: juice.id, quantity: 30 },
      { productId: cola.id, quantity: 60 },
      { productId: bread.id, quantity: 30 },
      { productId: croissant.id, quantity: 40 },
    ],
  });
  await api('POST', `/companies/${companyId}/stock-transfers/${st2.id}/ship`);
  const st2Detail = await api('GET', `/companies/${companyId}/stock-transfers/${st2.id}`);
  await api('POST', `/companies/${companyId}/stock-transfers/${st2.id}/receive`, {
    items: st2Detail.items.map((item: any) => ({ itemId: item.id, receivedQty: Number(item.quantity) })),
  });
  console.log(`✅ Stock Transfer: ${st2.transferNumber} → Магазин Център (received)`);

  const st3 = await api('POST', `/companies/${companyId}/stock-transfers`, {
    fromLocationId: coldStorage.id,
    toLocationId: store2.id,
    transferDate: daysAgo(5),
    notes: 'Зареждане Магазин Младост',
    items: [
      { productId: yogurt.id, quantity: 40 },
      { productId: cheese.id, quantity: 15 },
      { productId: chicken.id, quantity: 20 },
    ],
  });
  await api('POST', `/companies/${companyId}/stock-transfers/${st3.id}/ship`);
  const st3Detail = await api('GET', `/companies/${companyId}/stock-transfers/${st3.id}`);
  await api('POST', `/companies/${companyId}/stock-transfers/${st3.id}/receive`, {
    items: st3Detail.items.map((item: any) => ({ itemId: item.id, receivedQty: Number(item.quantity) })),
  });
  console.log(`✅ Stock Transfer: ${st3.transferNumber} → Магазин Младост (received)`);

  // Pending transfer (shipped but not received)
  const st4 = await api('POST', `/companies/${companyId}/stock-transfers`, {
    fromLocationId: centralWarehouse.id,
    toLocationId: store2.id,
    notes: 'Зареждане напитки Младост',
    items: [
      { productId: water.id, quantity: 80 },
      { productId: cola.id, quantity: 50 },
      { productId: bread.id, quantity: 20 },
    ],
  });
  await api('POST', `/companies/${companyId}/stock-transfers/${st4.id}/ship`);
  console.log(`✅ Stock Transfer: ${st4.transferNumber} → Магазин Младост (shipped, pending receive)`);

  // Create customers
  const restCustomer = await api('POST', `/companies/${companyId}/customers`, {
    type: 'COMPANY',
    companyName: 'Ресторант Традиция ООД',
    eik: '411234567',
    molName: 'Радостин Петков',
    phone: '+359 888 111 333',
    email: 'office@tradicia.bg',
    industry: 'HOSPITALITY',
  });

  const hotelCustomer = await api('POST', `/companies/${companyId}/customers`, {
    type: 'COMPANY',
    companyName: 'Хотел Парадайс ЕООД',
    eik: '412345678',
    vatNumber: 'BG412345678',
    molName: 'Силвия Борисова',
    phone: '+359 888 444 666',
    email: 'supply@hotelparadise.bg',
    industry: 'HOSPITALITY',
    size: 'MEDIUM',
  });

  const coffeeCustomer = await api('POST', `/companies/${companyId}/customers`, {
    type: 'COMPANY',
    companyName: 'Кафе Арома ЕООД',
    eik: '413456789',
    molName: 'Веселин Тодоров',
    phone: '+359 888 777 999',
  });

  const retailCustomer = await api('POST', `/companies/${companyId}/customers`, {
    type: 'INDIVIDUAL',
    firstName: 'Пламен',
    lastName: 'Стоилов',
    phone: '+359 888 222 555',
    email: 'plamen.st@gmail.com',
  });

  console.log('✅ Customers created (4)');

  // Create orders
  const fOrder1 = await api('POST', `/companies/${companyId}/orders`, {
    customerName: 'Ресторант Традиция ООД',
    customerId: restCustomer.id,
    orderDate: daysAgo(7),
    paymentMethod: 'BANK_TRANSFER',
    items: [
      { productId: cheese.id, quantity: 20, unitPrice: 7.80, vatRate: 20 },
      { productId: butter.id, quantity: 10, unitPrice: 5.90, vatRate: 20 },
      { productId: chicken.id, quantity: 15, unitPrice: 14.90, vatRate: 20 },
      { productId: salami.id, quantity: 10, unitPrice: 8.90, vatRate: 20 },
    ],
    notes: 'Седмична доставка за кухня',
  });
  await api('POST', `/companies/${companyId}/orders/${fOrder1.id}/confirm`);
  console.log(`✅ Order: ${fOrder1.orderNumber} (restaurant, confirmed)`);

  const fOrder2 = await api('POST', `/companies/${companyId}/orders`, {
    customerName: 'Хотел Парадайс ЕООД',
    customerId: hotelCustomer.id,
    orderDate: daysAgo(5),
    paymentMethod: 'BANK_TRANSFER',
    items: [
      { productId: yogurt.id, quantity: 50, unitPrice: 2.10, vatRate: 20 },
      { productId: juice.id, quantity: 30, unitPrice: 3.80, vatRate: 20 },
      { productId: water.id, quantity: 100, unitPrice: 0.80, vatRate: 20 },
      { productId: croissant.id, quantity: 40, unitPrice: 1.60, vatRate: 20 },
      { productId: bread.id, quantity: 20, unitPrice: 2.50, vatRate: 20 },
      { productId: deliveryService.id, quantity: 1, unitPrice: 5.00, vatRate: 20 },
    ],
    notes: 'Доставка за хотелски буфет',
  });
  await api('POST', `/companies/${companyId}/orders/${fOrder2.id}/confirm`);
  console.log(`✅ Order: ${fOrder2.orderNumber} (hotel, confirmed)`);

  const fOrder3 = await api('POST', `/companies/${companyId}/orders`, {
    customerName: 'Кафе Арома ЕООД',
    customerId: coffeeCustomer.id,
    orderDate: daysAgo(3),
    paymentMethod: 'CASH',
    locationId: store1.id,
    items: [
      { productId: croissant.id, quantity: 20, unitPrice: 1.60, vatRate: 20 },
      { productId: juice.id, quantity: 10, unitPrice: 3.80, vatRate: 20 },
      { productId: water.id, quantity: 30, unitPrice: 0.80, vatRate: 20 },
    ],
  });
  await api('POST', `/companies/${companyId}/orders/${fOrder3.id}/confirm`);
  console.log(`✅ Order: ${fOrder3.orderNumber} (cafe, confirmed)`);

  // Retail order (no location - pick from any available stock)
  const fOrder4 = await api('POST', `/companies/${companyId}/orders`, {
    customerName: 'Пламен Стоилов',
    customerId: retailCustomer.id,
    orderDate: daysAgo(1),
    paymentMethod: 'CASH',
    items: [
      { productId: yogurt.id, quantity: 5, unitPrice: 2.10, vatRate: 20 },
      { productId: cheese.id, quantity: 2, unitPrice: 7.80, vatRate: 20 },
      { productId: bread.id, quantity: 2, unitPrice: 2.50, vatRate: 20 },
      { productId: cola.id, quantity: 4, unitPrice: 1.50, vatRate: 20 },
    ],
  });
  await api('POST', `/companies/${companyId}/orders/${fOrder4.id}/confirm`);
  console.log(`✅ Order: ${fOrder4.orderNumber} (retail, confirmed)`);

  // Create invoices
  const fInv1 = await api('POST', `/companies/${companyId}/invoices`, {
    orderId: fOrder1.id,
    invoiceDate: daysAgo(6),
    dueDate: daysAgo(-8),
  });
  console.log(`✅ Invoice: ${fInv1.invoiceNumber}`);

  const fInv2 = await api('POST', `/companies/${companyId}/invoices`, {
    orderId: fOrder2.id,
    invoiceDate: daysAgo(4),
    dueDate: daysAgo(-10),
  });
  console.log(`✅ Invoice: ${fInv2.invoiceNumber}`);

  // Expenses
  const fExpenses = [
    { description: 'Наем централен склад', category: 'RENT', amount: 4200, expenseDate: daysAgo(30) },
    { description: 'Наем Магазин Център', category: 'RENT', amount: 2800, expenseDate: daysAgo(30) },
    { description: 'Наем Магазин Младост', category: 'RENT', amount: 2200, expenseDate: daysAgo(30) },
    { description: 'Ток хладилен склад', category: 'UTILITIES', amount: 3500, expenseDate: daysAgo(25) },
    { description: 'Ток магазини', category: 'UTILITIES', amount: 1200, expenseDate: daysAgo(25) },
    { description: 'Горива доставки', category: 'DELIVERY', amount: 1800, expenseDate: daysAgo(15) },
    { description: 'Застраховка стоки', category: 'INSURANCE', amount: 650, expenseDate: daysAgo(10) },
    { description: 'Реклама в социални мрежи', category: 'MARKETING', amount: 800, expenseDate: daysAgo(8) },
    { description: 'Хигиенни материали', category: 'OFFICE_SUPPLIES', amount: 350, expenseDate: daysAgo(5) },
    { description: 'Поддръжка хладилно оборудване', category: 'MAINTENANCE', amount: 1200, expenseDate: daysAgo(3) },
  ];

  for (const exp of fExpenses) {
    await api('POST', `/companies/${companyId}/expenses`, exp);
  }
  console.log(`✅ Expenses created (${fExpenses.length})`);

  // Payroll
  for (const u of [user, warehouseWorker, salesPerson, driver]) {
    const salary = u.email === 'nikolay@freshfood.bg' ? 5000 :
      u.email === 'diana@freshfood.bg' ? 2200 : 1800;
    const payroll = await api('POST', `/companies/${companyId}/payroll`, {
      userId: u.id,
      year: 2026,
      month: 2,
      baseSalary: salary,
      workingDays: 20,
      workedDays: 20,
    });
    await api('POST', `/companies/${companyId}/payroll/${payroll.id}/approve`);
    await api('POST', `/companies/${companyId}/payroll/${payroll.id}/pay`, {});
  }
  console.log('✅ Payroll for February 2026 (4 employees)');

  // Departments
  const salesDept = await api('POST', `/companies/${companyId}/departments`, {
    name: 'Продажби',
    code: 'SALES',
  });
  await api('POST', `/companies/${companyId}/departments/${salesDept.id}/members`, {
    userId: salesPerson.id,
    position: 'Търговски представител',
  });

  const logDept = await api('POST', `/companies/${companyId}/departments`, {
    name: 'Логистика',
    code: 'LOG',
  });
  await api('POST', `/companies/${companyId}/departments/${logDept.id}/members`, {
    userId: warehouseWorker.id,
    position: 'Складов работник',
    isHead: true,
  });
  await api('POST', `/companies/${companyId}/departments/${logDept.id}/members`, {
    userId: driver.id,
    position: 'Шофьор доставки',
  });
  console.log('✅ Departments created (Продажби, Логистика)');

  console.log('\n✅ ФрешФууд БГ ЕООД seed complete!\n');
  return companyId;
}

// =============================================
// COMPANY 3: БизнесКонсулт АД - Brokerage/Consulting
// =============================================
async function seedBrokerage() {
  console.log('\n💼 === Creating БизнесКонсулт АД (Brokerage) ===\n');

  await login('svetlozarrosenov@gmail.com', 'admin123');

  const company = await api('POST', '/admin/companies', {
    name: 'БизнесКонсулт АД',
    eik: '203678901',
    vatNumber: 'BG203678901',
    address: 'бул. Витоша 89, ет.5',
    city: 'София',
    postalCode: '1000',
    molName: 'Александра Методиева',
    phone: '+359 2 981 2345',
    email: 'office@bizconsult.bg',
    role: 'CLIENT',
  });
  const companyId = company.id;
  console.log(`✅ Company: ${company.name} (${companyId})`);

  const role = await api('POST', '/admin/roles', {
    name: 'Администратор',
    companyId,
    description: 'Пълен достъп',
    permissions: createFullPermissions(),
    isDefault: true,
  });

  // Create HR role with limited permissions
  const hrRole = await api('POST', '/admin/roles', {
    name: 'HR Мениджър',
    companyId,
    description: 'Достъп до HR модул',
    permissions: createHRPermissions(),
  });

  const ceo = await api('POST', '/admin/users', {
    email: 'aleksandra@bizconsult.bg',
    password: 'admin123',
    firstName: 'Александра',
    lastName: 'Методиева',
    companies: [{ companyId, roleId: role.id, isDefault: true }],
  });
  console.log(`✅ CEO: ${ceo.email}`);

  const hrManager = await api('POST', '/admin/users', {
    email: 'vesela@bizconsult.bg',
    password: 'admin123',
    firstName: 'Весела',
    lastName: 'Николова',
    companies: [{ companyId, roleId: hrRole.id }],
  });

  const consultant1 = await api('POST', '/admin/users', {
    email: 'dimitar@bizconsult.bg',
    password: 'admin123',
    firstName: 'Димитър',
    lastName: 'Ангелов',
    companies: [{ companyId, roleId: role.id }],
  });

  const consultant2 = await api('POST', '/admin/users', {
    email: 'kalina@bizconsult.bg',
    password: 'admin123',
    firstName: 'Калина',
    lastName: 'Георгиева',
    companies: [{ companyId, roleId: role.id }],
  });

  const consultant3 = await api('POST', '/admin/users', {
    email: 'boris@bizconsult.bg',
    password: 'admin123',
    firstName: 'Борис',
    lastName: 'Христов',
    companies: [{ companyId, roleId: role.id }],
  });

  const accountant = await api('POST', '/admin/users', {
    email: 'galina@bizconsult.bg',
    password: 'admin123',
    firstName: 'Галина',
    lastName: 'Попова',
    companies: [{ companyId, roleId: role.id }],
  });

  console.log('✅ Users created (6 total)');

  // Login as company user
  await login('aleksandra@bizconsult.bg', 'admin123');

  // Create single office location
  const office = await api('POST', `/companies/${companyId}/locations`, {
    name: 'Офис Витоша',
    code: 'OFFICE-01',
    type: 'WAREHOUSE',
    address: 'бул. Витоша 89, ет.5',
    city: 'София',
    isDefault: true,
  });
  console.log(`✅ Location: ${office.name}`);

  // Create service products (no inventory tracking)
  const consultingHour = await api('POST', `/companies/${companyId}/products`, {
    sku: 'SV-CONSULT-HR',
    name: 'Бизнес консултация (час)',
    type: 'SERVICE',
    unit: 'HOUR',
    salePrice: 150.00,
    vatRate: 20,
    trackInventory: false,
  });

  const auditService = await api('POST', `/companies/${companyId}/products`, {
    sku: 'SV-AUDIT',
    name: 'Финансов одит',
    type: 'SERVICE',
    unit: 'PIECE',
    salePrice: 5000.00,
    vatRate: 20,
    trackInventory: false,
  });

  const taxService = await api('POST', `/companies/${companyId}/products`, {
    sku: 'SV-TAX-RETURN',
    name: 'Годишна данъчна декларация',
    type: 'SERVICE',
    unit: 'PIECE',
    salePrice: 800.00,
    vatRate: 20,
    trackInventory: false,
  });

  const payrollService = await api('POST', `/companies/${companyId}/products`, {
    sku: 'SV-PAYROLL-MO',
    name: 'Изчисляване заплати (месечно)',
    type: 'SERVICE',
    unit: 'PIECE',
    salePrice: 25.00,
    vatRate: 20,
    trackInventory: false,
    description: 'На служител на месец',
  });

  const legalService = await api('POST', `/companies/${companyId}/products`, {
    sku: 'SV-LEGAL-HR',
    name: 'Правна консултация (час)',
    type: 'SERVICE',
    unit: 'HOUR',
    salePrice: 200.00,
    vatRate: 20,
    trackInventory: false,
  });

  const companyReg = await api('POST', `/companies/${companyId}/products`, {
    sku: 'SV-REG-COMPANY',
    name: 'Регистрация на фирма',
    type: 'SERVICE',
    unit: 'PIECE',
    salePrice: 350.00,
    vatRate: 20,
    trackInventory: false,
  });

  const monthlyAccounting = await api('POST', `/companies/${companyId}/products`, {
    sku: 'SV-ACC-MONTH',
    name: 'Месечно счетоводство',
    type: 'SERVICE',
    unit: 'PIECE',
    salePrice: 450.00,
    vatRate: 20,
    trackInventory: false,
    description: 'Пълно счетоводно обслужване',
  });

  console.log('✅ Service products created (7)');

  // Create customers (companies that use consulting services)
  const techClient = await api('POST', `/companies/${companyId}/customers`, {
    type: 'COMPANY',
    companyName: 'ТехноСтарт ООД',
    eik: '501234567',
    vatNumber: 'BG501234567',
    molName: 'Мартин Добрев',
    phone: '+359 888 101 202',
    email: 'martin@technostart.bg',
    industry: 'TECHNOLOGY',
    size: 'SMALL',
    source: 'REFERRAL',
  });

  const retailClient = await api('POST', `/companies/${companyId}/customers`, {
    type: 'COMPANY',
    companyName: 'Модна Линия ЕООД',
    eik: '502345678',
    molName: 'Таня Иванова',
    phone: '+359 888 303 404',
    email: 'tanya@modnaliniya.bg',
    industry: 'RETAIL',
    size: 'MICRO',
    source: 'WEBSITE',
  });

  const buildClient = await api('POST', `/companies/${companyId}/customers`, {
    type: 'COMPANY',
    companyName: 'Строй Груп АД',
    eik: '503456789',
    vatNumber: 'BG503456789',
    molName: 'Виктор Симеонов',
    phone: '+359 888 505 606',
    email: 'office@stroygroup.bg',
    industry: 'CONSTRUCTION',
    size: 'LARGE',
    source: 'COLD_CALL',
  });

  const medClient = await api('POST', `/companies/${companyId}/customers`, {
    type: 'COMPANY',
    companyName: 'МедиКлиник ЕООД',
    eik: '504567890',
    vatNumber: 'BG504567890',
    molName: 'Д-р Елена Стоянова',
    phone: '+359 888 707 808',
    email: 'elena@mediklinik.bg',
    industry: 'HEALTHCARE',
    size: 'SMALL',
    source: 'REFERRAL',
  });

  const startupClient = await api('POST', `/companies/${companyId}/customers`, {
    type: 'INDIVIDUAL',
    firstName: 'Николай',
    lastName: 'Кръстев',
    phone: '+359 888 909 010',
    email: 'nikola.kr@gmail.com',
    source: 'SOCIAL_MEDIA',
    notes: 'Иска да регистрира IT фирма',
  });

  console.log('✅ Customers created (5)');

  // Create orders (consulting engagements)
  const bOrder1 = await api('POST', `/companies/${companyId}/orders`, {
    customerName: 'Строй Груп АД',
    customerId: buildClient.id,
    orderDate: daysAgo(45),
    paymentMethod: 'BANK_TRANSFER',
    items: [
      { productId: auditService.id, quantity: 1, unitPrice: 5000.00, vatRate: 20 },
      { productId: consultingHour.id, quantity: 20, unitPrice: 150.00, vatRate: 20 },
    ],
    notes: 'Финансов одит и консултации Q1 2026',
  });
  await api('POST', `/companies/${companyId}/orders/${bOrder1.id}/confirm`);
  console.log(`✅ Order: ${bOrder1.orderNumber} (audit + consulting)`);

  const bOrder2 = await api('POST', `/companies/${companyId}/orders`, {
    customerName: 'ТехноСтарт ООД',
    customerId: techClient.id,
    orderDate: daysAgo(30),
    paymentMethod: 'BANK_TRANSFER',
    items: [
      { productId: monthlyAccounting.id, quantity: 3, unitPrice: 450.00, vatRate: 20 },
      { productId: payrollService.id, quantity: 24, unitPrice: 25.00, vatRate: 20 },
      { productId: taxService.id, quantity: 1, unitPrice: 800.00, vatRate: 20 },
    ],
    notes: 'Месечно счетоводство Q1 + ГДД за 2025',
  });
  await api('POST', `/companies/${companyId}/orders/${bOrder2.id}/confirm`);
  console.log(`✅ Order: ${bOrder2.orderNumber} (monthly accounting)`);

  const bOrder3 = await api('POST', `/companies/${companyId}/orders`, {
    customerName: 'Модна Линия ЕООД',
    customerId: retailClient.id,
    orderDate: daysAgo(20),
    paymentMethod: 'CASH',
    items: [
      { productId: monthlyAccounting.id, quantity: 1, unitPrice: 450.00, vatRate: 20 },
      { productId: payrollService.id, quantity: 5, unitPrice: 25.00, vatRate: 20 },
    ],
    notes: 'Месечно обслужване - март 2026',
  });
  await api('POST', `/companies/${companyId}/orders/${bOrder3.id}/confirm`);
  console.log(`✅ Order: ${bOrder3.orderNumber}`);

  const bOrder4 = await api('POST', `/companies/${companyId}/orders`, {
    customerName: 'МедиКлиник ЕООД',
    customerId: medClient.id,
    orderDate: daysAgo(15),
    paymentMethod: 'BANK_TRANSFER',
    items: [
      { productId: consultingHour.id, quantity: 10, unitPrice: 150.00, vatRate: 20 },
      { productId: legalService.id, quantity: 5, unitPrice: 200.00, vatRate: 20 },
    ],
    notes: 'Консултация за разширяване на дейност',
  });
  await api('POST', `/companies/${companyId}/orders/${bOrder4.id}/confirm`);
  console.log(`✅ Order: ${bOrder4.orderNumber}`);

  const bOrder5 = await api('POST', `/companies/${companyId}/orders`, {
    customerName: 'Николай Кръстев',
    customerId: startupClient.id,
    orderDate: daysAgo(5),
    paymentMethod: 'CASH',
    items: [
      { productId: companyReg.id, quantity: 1, unitPrice: 350.00, vatRate: 20 },
      { productId: consultingHour.id, quantity: 2, unitPrice: 150.00, vatRate: 20 },
    ],
    notes: 'Регистрация на ООД + начална консултация',
  });
  await api('POST', `/companies/${companyId}/orders/${bOrder5.id}/confirm`);
  console.log(`✅ Order: ${bOrder5.orderNumber}`);

  // Create invoices
  const bInv1 = await api('POST', `/companies/${companyId}/invoices`, {
    orderId: bOrder1.id,
    invoiceDate: daysAgo(40),
    dueDate: daysAgo(-5),
  });

  const bInv2 = await api('POST', `/companies/${companyId}/invoices`, {
    orderId: bOrder2.id,
    invoiceDate: daysAgo(28),
    dueDate: daysAgo(-2),
  });

  const bInv3 = await api('POST', `/companies/${companyId}/invoices`, {
    orderId: bOrder3.id,
    invoiceDate: daysAgo(18),
    dueDate: daysAgo(-12),
  });

  const bInv4 = await api('POST', `/companies/${companyId}/invoices`, {
    orderId: bOrder4.id,
    invoiceDate: daysAgo(13),
    dueDate: daysAgo(-17),
  });

  console.log('✅ Invoices created (4)');

  // Expenses - office/consulting company
  const bExpenses = [
    { description: 'Наем офис бул. Витоша', category: 'RENT', amount: 5500, expenseDate: daysAgo(30) },
    { description: 'Ток и вода офис', category: 'UTILITIES', amount: 420, expenseDate: daysAgo(25) },
    { description: 'Интернет и телефон', category: 'COMMUNICATION', amount: 180, expenseDate: daysAgo(25) },
    { description: 'Счетоводен софтуер (лиценз)', category: 'SOFTWARE', amount: 350, expenseDate: daysAgo(20) },
    { description: 'Google Workspace', category: 'SOFTWARE', amount: 85, expenseDate: daysAgo(20) },
    { description: 'Банкови такси', category: 'BANKING', amount: 45, expenseDate: daysAgo(15) },
    { description: 'Командировка Пловдив', category: 'TRAVEL', amount: 280, expenseDate: daysAgo(12) },
    { description: 'Представителни разходи', category: 'MARKETING', amount: 450, expenseDate: daysAgo(10) },
    { description: 'Офис принтер тонер', category: 'OFFICE_SUPPLIES', amount: 120, expenseDate: daysAgo(8) },
    { description: 'Годишна застраховка', category: 'INSURANCE', amount: 1200, expenseDate: daysAgo(5) },
    { description: 'Абонамент правна база', category: 'CONSULTING', amount: 200, expenseDate: daysAgo(3) },
    { description: 'Данък сгради', category: 'TAXES', amount: 800, expenseDate: daysAgo(2) },
  ];

  for (const exp of bExpenses) {
    await api('POST', `/companies/${companyId}/expenses`, exp);
  }
  console.log(`✅ Expenses created (${bExpenses.length})`);

  // Payroll with different salaries
  const payrollData = [
    { user: ceo, salary: 8000, bonuses: 0 },
    { user: hrManager, salary: 3200, bonuses: 0 },
    { user: consultant1, salary: 4500, bonuses: 500 },
    { user: consultant2, salary: 4200, bonuses: 300 },
    { user: consultant3, salary: 3800, bonuses: 200 },
    { user: accountant, salary: 3500, bonuses: 0 },
  ];

  for (const pd of payrollData) {
    // January
    const p1 = await api('POST', `/companies/${companyId}/payroll`, {
      userId: pd.user.id,
      year: 2026,
      month: 1,
      baseSalary: pd.salary,
      bonuses: pd.bonuses,
      workingDays: 22,
      workedDays: 22,
    });
    await api('POST', `/companies/${companyId}/payroll/${p1.id}/approve`);
    await api('POST', `/companies/${companyId}/payroll/${p1.id}/pay`, {});

    // February
    const p2 = await api('POST', `/companies/${companyId}/payroll`, {
      userId: pd.user.id,
      year: 2026,
      month: 2,
      baseSalary: pd.salary,
      bonuses: pd.bonuses,
      workingDays: 20,
      workedDays: pd.user.email === 'kalina@bizconsult.bg' ? 18 : 20,
      vacationDays: pd.user.email === 'kalina@bizconsult.bg' ? 2 : 0,
    });
    await api('POST', `/companies/${companyId}/payroll/${p2.id}/approve`);
    await api('POST', `/companies/${companyId}/payroll/${p2.id}/pay`, {});
  }
  console.log('✅ Payroll for Jan & Feb 2026 (6 employees × 2 months)');

  // Departments
  const mgmtDept = await api('POST', `/companies/${companyId}/departments`, {
    name: 'Ръководство',
    code: 'MGMT',
  });
  await api('POST', `/companies/${companyId}/departments/${mgmtDept.id}/members`, {
    userId: ceo.id,
    position: 'Изпълнителен директор',
    isHead: true,
  });

  const hrDept = await api('POST', `/companies/${companyId}/departments`, {
    name: 'Човешки ресурси',
    code: 'HR',
  });
  await api('POST', `/companies/${companyId}/departments/${hrDept.id}/members`, {
    userId: hrManager.id,
    position: 'HR мениджър',
    isHead: true,
  });

  const consultDept = await api('POST', `/companies/${companyId}/departments`, {
    name: 'Консултантски отдел',
    code: 'CONSULT',
  });
  await api('POST', `/companies/${companyId}/departments/${consultDept.id}/members`, {
    userId: consultant1.id,
    position: 'Старши консултант',
    isHead: true,
  });
  await api('POST', `/companies/${companyId}/departments/${consultDept.id}/members`, {
    userId: consultant2.id,
    position: 'Консултант',
  });
  await api('POST', `/companies/${companyId}/departments/${consultDept.id}/members`, {
    userId: consultant3.id,
    position: 'Младши консултант',
  });

  const accDept = await api('POST', `/companies/${companyId}/departments`, {
    name: 'Счетоводство',
    code: 'ACC',
  });
  await api('POST', `/companies/${companyId}/departments/${accDept.id}/members`, {
    userId: accountant.id,
    position: 'Главен счетоводител',
    isHead: true,
  });

  console.log('✅ Departments created (4: Ръководство, HR, Консултантски, Счетоводство)');

  // Leave requests
  const leave1 = await api('POST', `/companies/${companyId}/leaves`, {
    type: 'ANNUAL',
    startDate: '2026-02-16',
    endDate: '2026-02-17',
    days: 2,
    reason: 'Лични причини',
  });
  console.log(`✅ Leave request created for Калина (2 days)`);

  // Switch to CEO to approve leaves
  // (Leave was created by logged-in user - aleksandra; let's create one for a consultant)
  // Actually, leaves are created by the user themselves. Let's create some via different users.

  // Login as consultant2 to create leave request
  await login('kalina@bizconsult.bg', 'admin123');
  await switchCompany(companyId);

  const leave2 = await api('POST', `/companies/${companyId}/leaves`, {
    type: 'ANNUAL',
    startDate: '2026-03-23',
    endDate: '2026-03-27',
    days: 5,
    reason: 'Планирана ваканция',
  });
  console.log('✅ Leave request: Калина - 5 дни отпуска (pending)');

  // Login as boris for sick leave
  await login('boris@bizconsult.bg', 'admin123');
  await switchCompany(companyId);

  const leave3 = await api('POST', `/companies/${companyId}/leaves`, {
    type: 'SICK',
    startDate: '2026-03-02',
    endDate: '2026-03-03',
    days: 2,
    reason: 'Болничен лист',
  });
  console.log('✅ Leave request: Борис - 2 дни болничен');

  // Login back as CEO to approve
  await login('aleksandra@bizconsult.bg', 'admin123');
  await switchCompany(companyId);

  // Approve leave requests
  try {
    await api('POST', `/companies/${companyId}/leaves/${leave2.id}/approve`);
    console.log('✅ Leave approved: Калина ваканция');
  } catch (e) {
    console.log('⚠️ Could not approve leave (may need different flow)');
  }

  try {
    await api('POST', `/companies/${companyId}/leaves/${leave3.id}/approve`);
    console.log('✅ Leave approved: Борис болничен');
  } catch (e) {
    console.log('⚠️ Could not approve sick leave');
  }

  // Attendance records
  const attendanceDates = [];
  for (let i = 1; i <= 5; i++) {
    attendanceDates.push(daysAgo(i + 2).split('T')[0]);
  }

  for (const userId of [ceo.id, consultant1.id, consultant2.id, consultant3.id, accountant.id, hrManager.id]) {
    for (const date of attendanceDates.slice(0, 3)) {
      try {
        await api('POST', `/companies/${companyId}/attendance`, {
          date,
          type: 'REGULAR',
          status: 'APPROVED',
          userId,
          checkIn: `${date}T09:00:00.000Z`,
          checkOut: `${date}T18:00:00.000Z`,
          breakMinutes: 60,
        });
      } catch (e) {
        // May fail if date already exists, that's ok
      }
    }
  }
  console.log('✅ Attendance records created');

  // Create deals (CRM pipeline)
  const deals = [
    {
      name: 'Годишен одит Строй Груп',
      customerId: buildClient.id,
      amount: 12000,
      status: 'NEGOTIATION',
      probability: 70,
    },
    {
      name: 'Счетоводно обслужване МедиКлиник',
      customerId: medClient.id,
      amount: 5400,
      status: 'PROPOSAL',
      probability: 80,
    },
    {
      name: 'Данъчна оптимизация ТехноСтарт',
      customerId: techClient.id,
      amount: 3000,
      status: 'CLOSED_WON',
      probability: 100,
    },
    {
      name: 'Правни консултации Модна Линия',
      customerId: retailClient.id,
      amount: 2000,
      status: 'QUALIFICATION',
      probability: 30,
    },
  ];

  // Check if deals endpoint exists
  for (const deal of deals) {
    try {
      await api('POST', `/companies/${companyId}/deals`, deal);
    } catch (e) {
      console.log('⚠️ Deals endpoint may not exist, skipping');
      break;
    }
  }
  console.log('✅ Deals created (CRM pipeline)');

  console.log('\n✅ БизнесКонсулт АД seed complete!\n');
  return companyId;
}

// =============================================
// Permission helpers
// =============================================
function createFullPermissions() {
  const modules: Record<string, string[]> = {
    dashboard: ['overview'],
    crm: ['customers', 'contacts', 'deals'],
    erp: ['products', 'categories', 'orders', 'invoices', 'suppliers', 'expenses', 'stockDocuments', 'analytics'],
    warehouse: ['locations', 'inventory', 'goodsReceipts', 'stockTransfers'],
    production: ['bom', 'orders'],
    hr: ['employees', 'departments', 'attendance', 'leaves', 'payroll', 'performance'],
    bi: ['sales', 'customers', 'products'],
    tickets: ['allTickets', 'myTickets', 'urgent', 'discussions', 'sprints'],
    communication: ['chat'],
    settings: ['profile', 'security', 'usersRoles'],
    ai: ['invoiceScanning'],
    admin: ['companies', 'users', 'roles', 'companyPlans', 'demoRequests'],
  };

  const result: any = { modules: {} };
  for (const [mod, pages] of Object.entries(modules)) {
    result.modules[mod] = { enabled: true, pages: {} };
    for (const page of pages) {
      result.modules[mod].pages[page] = {
        enabled: true,
        actions: { view: true, create: true, edit: true, delete: true },
      };
    }
  }
  return result;
}

function createHRPermissions() {
  const result: any = { modules: {} };

  result.modules['hr'] = { enabled: true, pages: {} };
  const hrPages = ['employees', 'departments', 'attendance', 'payroll', 'leaves', 'performance'];
  for (const page of hrPages) {
    result.modules['hr'].pages[page] = {
      enabled: true,
      actions: { view: true, create: true, edit: true, delete: false },
    };
  }

  result.modules['bi'] = { enabled: true, pages: {} };
  result.modules['bi'].pages['overview'] = {
    enabled: true,
    actions: { view: true, create: false, edit: false, delete: false },
  };

  result.modules['dashboard'] = { enabled: true, pages: {} };
  result.modules['dashboard'].pages['overview'] = {
    enabled: true,
    actions: { view: true, create: false, edit: false, delete: false },
  };

  return result;
}

// =============================================
// Main execution
// =============================================
async function main() {
  console.log('🚀 Starting seed for 3 simulated companies...\n');

  try {
    // Login as super admin first
    await login('svetlozarrosenov@gmail.com', 'admin123');

    // Clean up any existing test data
    await cleanup();

    const mfgId = await seedManufacturing();
    const fbId = await seedFoodBeverage();
    const broId = await seedBrokerage();

    console.log('\n========================================');
    console.log('🎉 All 3 companies seeded successfully!');
    console.log('========================================');
    console.log(`\n📋 Company IDs:`);
    console.log(`  МеталПро ООД:       ${mfgId}`);
    console.log(`  ФрешФууд БГ ЕООД:   ${fbId}`);
    console.log(`  БизнесКонсулт АД:   ${broId}`);
    console.log(`\n🔑 Login credentials (all use password: admin123):`);
    console.log(`  МеталПро:     georgi@metalpro.bg`);
    console.log(`  ФрешФууд:     nikolay@freshfood.bg`);
    console.log(`  БизнесКонсулт: aleksandra@bizconsult.bg`);
    console.log('');
  } catch (error) {
    console.error('\n💥 Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
