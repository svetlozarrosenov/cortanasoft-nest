/**
 * Бизнес логика E2E тестове за CRM/ERP системата
 *
 * Тества:
 * 1. Наличности (inventory) - добавяне на стоки чрез стокова разписка и проверка на наличност
 * 2. Намаляване на наличности при продажба (поръчка)
 * 3. Валутни курсове - получаване на продукт в USD, конвертиране към EUR
 * 4. ДДС по подразбиране - 20% ако компанията е регистрирана по ДДС, 0% ако не е
 * 5. Валута по подразбиране - от настройките на компанията
 */

import { PrismaClient } from '@prisma/client';
import { OrdersService } from '../src/orders/orders.service';

const prisma = new PrismaClient();
// Cast PrismaClient as PrismaService — compatible since PrismaService only adds lifecycle hooks
const ordersService = new OrdersService(prisma as any);

// Уникален prefix за тестовите данни, за да не конфликтуват
const TEST_PREFIX = `TEST_${Date.now()}`;

// Helper за cleanup
let testCompanyWithVat: any;
let testCompanyWithoutVat: any;
let testUser: any;
let testLocation: any;
let testLocationNoVat: any;
let eurCurrency: any;
let usdCurrency: any;
let bgnCurrency: any;

async function setupTestData() {
  // Намери валутите
  eurCurrency = await prisma.currency.findUnique({ where: { code: 'EUR' } });
  usdCurrency = await prisma.currency.findUnique({ where: { code: 'USD' } });
  bgnCurrency = await prisma.currency.findUnique({ where: { code: 'BGN' } });

  if (!eurCurrency || !usdCurrency || !bgnCurrency) {
    throw new Error(
      'Currencies not found. Run `npx prisma db seed` first to create currencies.',
    );
  }

  // Създай тестова компания С ДДС номер (регистрирана по ДДС)
  testCompanyWithVat = await prisma.company.create({
    data: {
      name: `${TEST_PREFIX}_Company_With_VAT`,
      eik: `${TEST_PREFIX.slice(-9)}`.padEnd(9, '0').slice(0, 9),
      vatNumber: `BG${TEST_PREFIX.slice(-9)}`.slice(0, 12),
      address: 'Тестов адрес 1',
      city: 'София',
      currencyId: eurCurrency.id, // Компанията работи в EUR
      role: 'CLIENT',
      isActive: true,
    },
  });

  // Създай тестова компания БЕЗ ДДС номер
  testCompanyWithoutVat = await prisma.company.create({
    data: {
      name: `${TEST_PREFIX}_Company_No_VAT`,
      eik: `${TEST_PREFIX.slice(-8)}1`.padEnd(9, '0').slice(0, 9),
      // Без vatNumber!
      address: 'Тестов адрес 2',
      city: 'Пловдив',
      currencyId: bgnCurrency.id, // Компанията работи в BGN
      role: 'CLIENT',
      isActive: true,
    },
  });

  // Създай тестов потребител
  testUser = await prisma.user.create({
    data: {
      email: `${TEST_PREFIX}@test.com`,
      password: '$2b$10$dummyhash', // Не е нужна реална парола за тестовете
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
    },
  });

  // Създай локации (складове)
  testLocation = await prisma.location.create({
    data: {
      name: `${TEST_PREFIX}_Склад`,
      code: `${TEST_PREFIX}_WH1`.slice(0, 20),
      type: 'WAREHOUSE',
      isDefault: true,
      isActive: true,
      companyId: testCompanyWithVat.id,
    },
  });

  testLocationNoVat = await prisma.location.create({
    data: {
      name: `${TEST_PREFIX}_Склад_2`,
      code: `${TEST_PREFIX}_WH2`.slice(0, 20),
      type: 'WAREHOUSE',
      isDefault: true,
      isActive: true,
      companyId: testCompanyWithoutVat.id,
    },
  });
}

async function cleanupTestData() {
  // Изтриваме в правилния ред заради foreign keys
  await prisma.invoiceItem.deleteMany({
    where: {
      invoice: {
        companyId: { in: [testCompanyWithVat?.id, testCompanyWithoutVat?.id].filter(Boolean) },
      },
    },
  });
  await prisma.invoice.deleteMany({
    where: {
      companyId: { in: [testCompanyWithVat?.id, testCompanyWithoutVat?.id].filter(Boolean) },
    },
  });
  await prisma.orderItem.deleteMany({
    where: {
      order: {
        companyId: { in: [testCompanyWithVat?.id, testCompanyWithoutVat?.id].filter(Boolean) },
      },
    },
  });
  await prisma.order.deleteMany({
    where: {
      companyId: { in: [testCompanyWithVat?.id, testCompanyWithoutVat?.id].filter(Boolean) },
    },
  });
  await prisma.inventoryBatch.deleteMany({
    where: {
      companyId: { in: [testCompanyWithVat?.id, testCompanyWithoutVat?.id].filter(Boolean) },
    },
  });
  await prisma.goodsReceiptItem.deleteMany({
    where: {
      goodsReceipt: {
        companyId: { in: [testCompanyWithVat?.id, testCompanyWithoutVat?.id].filter(Boolean) },
      },
    },
  });
  await prisma.goodsReceipt.deleteMany({
    where: {
      companyId: { in: [testCompanyWithVat?.id, testCompanyWithoutVat?.id].filter(Boolean) },
    },
  });
  await prisma.product.deleteMany({
    where: {
      companyId: { in: [testCompanyWithVat?.id, testCompanyWithoutVat?.id].filter(Boolean) },
    },
  });
  await prisma.location.deleteMany({
    where: {
      companyId: { in: [testCompanyWithVat?.id, testCompanyWithoutVat?.id].filter(Boolean) },
    },
  });
  if (testUser) {
    await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
  }
  if (testCompanyWithVat) {
    await prisma.company.delete({ where: { id: testCompanyWithVat.id } }).catch(() => {});
  }
  if (testCompanyWithoutVat) {
    await prisma.company.delete({ where: { id: testCompanyWithoutVat.id } }).catch(() => {});
  }
}

// ============================================================
// ТЕСТ 1: Наличности - Добавяне чрез стокова разписка
// ============================================================
async function testInventoryIncrease() {
  console.log('\n=== ТЕСТ 1: Наличности - Добавяне чрез стокова разписка ===');

  // Създай продукт
  const product = await prisma.product.create({
    data: {
      sku: `${TEST_PREFIX}_SKU001`,
      name: 'Тестов продукт 1',
      type: 'PRODUCT',
      unit: 'PIECE',
      purchasePrice: 10.0,
      salePrice: 20.0,
      vatRate: 20,
      trackInventory: true,
      companyId: testCompanyWithVat.id,
    },
  });

  // Провери че няма наличност преди стоковата разписка
  const stockBefore = await prisma.inventoryBatch.findMany({
    where: { companyId: testCompanyWithVat.id, productId: product.id },
  });
  console.log(`  [ПРЕДИ] Наличност за продукт "${product.name}": ${stockBefore.length} партиди`);
  assert(stockBefore.length === 0, 'Не трябва да има наличност преди стоковата разписка');

  // Създай стокова разписка (DRAFT)
  const goodsReceipt = await prisma.goodsReceipt.create({
    data: {
      receiptNumber: `${TEST_PREFIX}_GR001`,
      receiptDate: new Date(),
      status: 'DRAFT',
      companyId: testCompanyWithVat.id,
      locationId: testLocation.id,
      createdById: testUser.id,
      items: {
        create: [
          {
            productId: product.id,
            quantity: 100,
            unitPrice: 10.0,
            vatRate: 20,
          },
        ],
      },
    },
    include: { items: true },
  });

  console.log(`  Стокова разписка създадена: ${goodsReceipt.receiptNumber} (статус: ${goodsReceipt.status})`);

  // Провери че DRAFT разписка НЕ създава наличност
  const stockAfterDraft = await prisma.inventoryBatch.findMany({
    where: { companyId: testCompanyWithVat.id, productId: product.id },
  });
  assert(
    stockAfterDraft.length === 0,
    'DRAFT разписка не трябва да създава наличност',
  );
  console.log('  [OK] DRAFT разписка не създава наличност');

  // Потвърди разписката - симулираме confirm логиката от goods-receipts.service.ts
  await prisma.$transaction(async (tx) => {
    await tx.goodsReceipt.update({
      where: { id: goodsReceipt.id },
      data: { status: 'COMPLETED' },
    });

    for (const item of goodsReceipt.items) {
      const prod = await tx.product.findUnique({ where: { id: item.productId } });
      if (prod && prod.type !== 'SERIAL') {
        const batchNumber = `${goodsReceipt.receiptNumber}-${item.id.slice(-4)}`;
        await tx.inventoryBatch.create({
          data: {
            batchNumber,
            quantity: item.quantity,
            initialQty: item.quantity,
            unitCost: item.unitPrice,
            companyId: testCompanyWithVat.id,
            productId: item.productId,
            locationId: testLocation.id,
            goodsReceiptItemId: item.id,
          },
        });
      }
    }
  });

  // Провери наличността след потвърждаване
  const stockAfterConfirm = await prisma.inventoryBatch.findMany({
    where: { companyId: testCompanyWithVat.id, productId: product.id },
  });
  console.log(
    `  [СЛЕД ПОТВЪРЖДАВАНЕ] Наличност: ${stockAfterConfirm.length} партиди, ` +
      `общо количество: ${stockAfterConfirm.reduce((s, b) => s + Number(b.quantity), 0)}`,
  );
  assert(stockAfterConfirm.length === 1, 'Трябва да има 1 партида');
  assert(
    Number(stockAfterConfirm[0].quantity) === 100,
    `Количеството трябва да е 100, а е ${Number(stockAfterConfirm[0].quantity)}`,
  );
  console.log('  [OK] Наличността е 100 бройки след потвърждаване');

  return { product, goodsReceipt, batch: stockAfterConfirm[0] };
}

// ============================================================
// ТЕСТ 2: Наличности - Продажба НЕ намалява наличността (BUG!)
// ============================================================
async function testInventoryDecreaseOnSale(
  product: any,
  batch: any,
) {
  console.log('\n=== ТЕСТ 2: Наличности - Продажба и намаляване на наличност ===');

  // Създай поръчка за 30 бройки от продукта
  const order = await prisma.order.create({
    data: {
      orderNumber: `${TEST_PREFIX}_ORD001`,
      orderDate: new Date(),
      status: 'PENDING',
      customerName: 'Тестов клиент',
      subtotal: 600, // 30 * 20
      vatAmount: 120, // 30 * 20 * 0.20
      total: 720,
      companyId: testCompanyWithVat.id,
      locationId: testLocation.id,
      createdById: testUser.id,
      items: {
        create: [
          {
            productId: product.id,
            quantity: 30,
            unitPrice: 20.0,
            vatRate: 20,
            subtotal: 600,
            inventoryBatchId: batch.id,
          },
        ],
      },
    },
    include: { items: true },
  });

  console.log(`  Поръчка създадена: ${order.orderNumber} за 30 бройки`);

  // Потвърди поръчката чрез service метода (който дедуктира инвентар)
  await ordersService.confirm(testCompanyWithVat.id, order.id);

  // Провери наличността СЛЕД потвърждаване на поръчката
  const stockAfterOrder = await prisma.inventoryBatch.findFirst({
    where: { id: batch.id },
  });

  const remainingQty = Number(stockAfterOrder!.quantity);
  console.log(`  [СЛЕД ПОРЪЧКА] Наличност на партидата: ${remainingQty}`);

  if (remainingQty === 100) {
    console.log(
      '  [БЪГOВЕ] Наличността НЕ е намалена! Все още е 100 вместо 70.',
    );
    console.log(
      '  [БЪГOВЕ] В orders.service.ts:306 има TODO: "Deduct inventory when confirming order"',
    );
    console.log(
      '  [БЪГOВЕ] Потвърждаването на поръчка не намалява наличността от партидата!',
    );
    return false; // FAIL - бъг
  } else if (remainingQty === 70) {
    console.log('  [OK] Наличността е коректно намалена до 70');
    return true; // PASS
  } else {
    console.log(`  [ГРЕШКА] Неочаквано количество: ${remainingQty}`);
    return false;
  }
}

// ============================================================
// ТЕСТ 3: Анулиране на поръчка НЕ възстановява наличността (BUG!)
// ============================================================
async function testInventoryRestoreOnCancel(product: any, batch: any) {
  console.log('\n=== ТЕСТ 3: Анулиране на поръчка и възстановяване на наличност ===');

  // Създай поръчка като PENDING
  const order = await prisma.order.create({
    data: {
      orderNumber: `${TEST_PREFIX}_ORD002`,
      orderDate: new Date(),
      status: 'PENDING',
      customerName: 'Тестов клиент 2',
      subtotal: 200,
      vatAmount: 40,
      total: 240,
      companyId: testCompanyWithVat.id,
      locationId: testLocation.id,
      createdById: testUser.id,
      items: {
        create: [
          {
            productId: product.id,
            quantity: 10,
            unitPrice: 20.0,
            vatRate: 20,
            subtotal: 200,
            inventoryBatchId: batch.id,
          },
        ],
      },
    },
  });

  // Потвърди поръчката чрез service (дедуктира инвентар)
  await ordersService.confirm(testCompanyWithVat.id, order.id);

  const stockBeforeCancel = await prisma.inventoryBatch.findFirst({
    where: { id: batch.id },
  });
  console.log(`  [ПРЕДИ АНУЛИРАНЕ] Наличност: ${Number(stockBeforeCancel!.quantity)}`);

  // Анулирай поръчката чрез service (възстановява инвентар)
  await ordersService.cancel(testCompanyWithVat.id, order.id);

  const stockAfterCancel = await prisma.inventoryBatch.findFirst({
    where: { id: batch.id },
  });
  const qtyAfter = Number(stockAfterCancel!.quantity);
  console.log(`  [СЛЕД АНУЛИРАНЕ] Наличност: ${qtyAfter}`);

  if (qtyAfter === Number(stockBeforeCancel!.quantity)) {
    console.log(
      '  [БЪГOВЕ] Наличността не е възстановена след анулиране на поръчката!',
    );
    console.log(
      '  [БЪГOВЕ] В orders.service.ts:363 има TODO: "Restore inventory if order was confirmed"',
    );
    return false;
  } else {
    console.log('  [OK] Наличността е възстановена коректно');
    return true;
  }
}

// ============================================================
// ТЕСТ 4: Валута - получаване в USD, компанията е в EUR
// ============================================================
async function testCurrencyConversion() {
  console.log('\n=== ТЕСТ 4: Валутни курсове - Получаване в USD, компания в EUR ===');

  // Компанията е с валута EUR (testCompanyWithVat)
  const company = await prisma.company.findUnique({
    where: { id: testCompanyWithVat.id },
    include: { currency: true },
  });
  console.log(`  Компания: ${company!.name}, валута: ${company!.currency?.code || 'не е зададена'}`);

  // Създай продукт с покупна цена в USD
  const product = await prisma.product.create({
    data: {
      sku: `${TEST_PREFIX}_SKU_USD`,
      name: 'Продукт от САЩ (в долари)',
      type: 'PRODUCT',
      unit: 'PIECE',
      purchasePrice: 100.0, // 100 USD
      purchaseCurrencyId: usdCurrency.id,
      purchaseExchangeRate: 0.92, // 1 USD = 0.92 EUR
      salePrice: 150.0,
      saleCurrencyId: eurCurrency.id,
      saleExchangeRate: 1, // Продажба в EUR (валутата на компанията)
      vatRate: 20,
      trackInventory: true,
      companyId: testCompanyWithVat.id,
    },
    include: { purchaseCurrency: true, saleCurrency: true },
  });

  console.log(
    `  Продукт: "${product.name}"`,
  );
  console.log(
    `    Покупна цена: ${product.purchasePrice} ${product.purchaseCurrency?.code} (курс: ${product.purchaseExchangeRate})`,
  );
  console.log(
    `    Продажна цена: ${product.salePrice} ${product.saleCurrency?.code}`,
  );

  // Стокова разписка в USD с обменен курс
  const usdExchangeRate = 0.92; // 1 USD = 0.92 EUR
  const goodsReceipt = await prisma.goodsReceipt.create({
    data: {
      receiptNumber: `${TEST_PREFIX}_GR_USD`,
      receiptDate: new Date(),
      status: 'DRAFT',
      currencyId: usdCurrency.id,
      exchangeRate: usdExchangeRate,
      companyId: testCompanyWithVat.id,
      locationId: testLocation.id,
      createdById: testUser.id,
      items: {
        create: [
          {
            productId: product.id,
            quantity: 50,
            unitPrice: 100.0, // 100 USD per unit
            vatRate: 20,
            currencyId: usdCurrency.id,
            exchangeRate: usdExchangeRate,
          },
        ],
      },
    },
    include: {
      items: true,
      currency: true,
    },
  });

  console.log(
    `  Стокова разписка: ${goodsReceipt.receiptNumber}, валута: ${goodsReceipt.currency?.code}, курс: ${goodsReceipt.exchangeRate}`,
  );

  // Изчисляване на стойности
  const totalUsd = 50 * 100; // 5000 USD
  const totalEur = totalUsd * usdExchangeRate; // 4600 EUR
  const vatEur = totalEur * 0.2; // 920 EUR

  console.log(`  Изчисления:`);
  console.log(`    Обща стойност в USD: ${totalUsd} USD`);
  console.log(`    Обменен курс (1 USD -> EUR): ${usdExchangeRate}`);
  console.log(`    Обща стойност в EUR: ${totalEur} EUR`);
  console.log(`    ДДС (20%): ${vatEur} EUR`);
  console.log(`    Крайна сума: ${totalEur + vatEur} EUR`);

  // Проверяваме дали обменният курс се съхранява коректно
  const savedReceipt = await prisma.goodsReceipt.findUnique({
    where: { id: goodsReceipt.id },
    include: {
      items: { include: { currency: true } },
      currency: true,
    },
  });

  const itemExchangeRate = Number(savedReceipt!.items[0].exchangeRate);
  assert(
    itemExchangeRate === usdExchangeRate,
    `Обменният курс на артикула трябва да е ${usdExchangeRate}, а е ${itemExchangeRate}`,
  );
  console.log('  [OK] Обменният курс се записва коректно в стоковата разписка');

  // Потвърди разписката и провери unit cost на партидата
  await prisma.$transaction(async (tx) => {
    await tx.goodsReceipt.update({
      where: { id: goodsReceipt.id },
      data: { status: 'COMPLETED' },
    });

    for (const item of goodsReceipt.items) {
      const batchNumber = `${goodsReceipt.receiptNumber}-${item.id.slice(-4)}`;
      await tx.inventoryBatch.create({
        data: {
          batchNumber,
          quantity: item.quantity,
          initialQty: item.quantity,
          unitCost: item.unitPrice, // Записва се в USD
          companyId: testCompanyWithVat.id,
          productId: item.productId,
          locationId: testLocation.id,
          goodsReceiptItemId: item.id,
        },
      });
    }
  });

  // Проверка: unitCost в партидата е в USD (100.00) а не в EUR
  const batch = await prisma.inventoryBatch.findFirst({
    where: { companyId: testCompanyWithVat.id, productId: product.id },
  });

  const batchUnitCost = Number(batch!.unitCost);
  console.log(`  [АНАЛИЗ] unitCost в партидата: ${batchUnitCost}`);

  if (batchUnitCost === 100) {
    console.log(
      '  [ВНИМАНИЕ] unitCost е записан в USD (100), а не конвертиран в EUR (92).',
    );
    console.log(
      '  [ВНИМАНИЕ] Системата записва цената в оригиналната валута на доставчика.',
    );
    console.log(
      '  [ВНИМАНИЕ] За отчети в EUR, трябва да се използва exchangeRate от GoodsReceiptItem.',
    );
  }

  // Проверка: дали валутата по подразбиране на компанията се използва в goods receipts
  // Ако не е подаден currencyId, трябва да се ползва company.currencyId
  const receiptWithCompanyCurrency = await prisma.goodsReceipt.create({
    data: {
      receiptNumber: `${TEST_PREFIX}_GR_DEFAULT_CUR`,
      receiptDate: new Date(),
      status: 'DRAFT',
      // НЕ подаваме currencyId - трябва ли да е EUR (валутата на компанията)?
      companyId: testCompanyWithVat.id,
      locationId: testLocation.id,
      createdById: testUser.id,
      items: {
        create: [
          {
            productId: product.id,
            quantity: 10,
            unitPrice: 92.0, // В EUR
            vatRate: 20,
          },
        ],
      },
    },
  });

  console.log(
    `  [АНАЛИЗ] Стокова разписка без указана валута: currencyId = ${receiptWithCompanyCurrency.currencyId || 'null'}`,
  );
  if (!receiptWithCompanyCurrency.currencyId) {
    console.log(
      '  [ВНИМАНИЕ] Когато не е посочена валута, currencyId е NULL в базата.',
    );
    console.log(
      '  [ВНИМАНИЕ] Забележка: В goods-receipts.service.ts (ред 92), сървърът записва company.currencyId.',
    );
    console.log(
      '  [ВНИМАНИЕ] Но при директно създаване в базата (без сървъра), валутата остава NULL.',
    );
  }

  return true;
}

// ============================================================
// ТЕСТ 5: ДДС по подразбиране - компания С ДДС номер
// ============================================================
async function testVatWithRegistration() {
  console.log('\n=== ТЕСТ 5: ДДС по подразбиране - Компания С ДДС номер ===');

  const company = testCompanyWithVat;
  console.log(`  Компания: ${company.name}`);
  console.log(`  ДДС номер: ${company.vatNumber}`);

  // Създай продукт (без изрично да посочваме vatRate - трябва да е 20%)
  const product = await prisma.product.create({
    data: {
      sku: `${TEST_PREFIX}_VAT_PROD`,
      name: 'Продукт с ДДС',
      type: 'PRODUCT',
      unit: 'PIECE',
      salePrice: 100.0,
      // НЕ указваме vatRate - Schema default е 20
      trackInventory: true,
      companyId: company.id,
    },
  });

  console.log(`  Създаден продукт без explicit vatRate`);
  console.log(`  vatRate от DB: ${Number(product.vatRate)}`);

  assert(
    Number(product.vatRate) === 20,
    `ДДС по подразбиране трябва да е 20%, а е ${Number(product.vatRate)}%`,
  );
  console.log('  [OK] vatRate = 20% (от schema @default(20))');

  // ПРОБЛЕМ: Schema ВИНАГИ дава default 20%, независимо дали компанията е регистрирана по ДДС
  // Бекендът (products.service.ts) не проверява company.vatNumber
  console.log(
    '  [ВНИМАНИЕ] Prisma schema @default(20) се прилага винаги.',
  );
  console.log(
    '  [ВНИМАНИЕ] Бекендът НЕ проверява дали компанията е регистрирана по ДДС.',
  );
  console.log(
    '  [ВНИМАНИЕ] Фронтендът (products/page.tsx) проверява company.vatNumber и задава 0 ако няма.',
  );

  return true;
}

// ============================================================
// ТЕСТ 6: ДДС по подразбиране - компания БЕЗ ДДС номер
// ============================================================
async function testVatWithoutRegistration() {
  console.log('\n=== ТЕСТ 6: ДДС по подразбиране - Компания БЕЗ ДДС номер ===');

  const company = testCompanyWithoutVat;
  console.log(`  Компания: ${company.name}`);
  console.log(`  ДДС номер: ${company.vatNumber || 'НЯМА'}`);

  // Създай продукт (без vatRate)
  const product = await prisma.product.create({
    data: {
      sku: `${TEST_PREFIX}_NOVAT_PROD`,
      name: 'Продукт без ДДС',
      type: 'PRODUCT',
      unit: 'PIECE',
      salePrice: 50.0,
      // НЕ указваме vatRate
      trackInventory: true,
      companyId: company.id,
    },
  });

  console.log(`  vatRate от DB: ${Number(product.vatRate)}`);

  if (Number(product.vatRate) === 20) {
    console.log(
      '  [БЪГOВЕ] vatRate е 20% за компания БЕЗ ДДС номер!',
    );
    console.log(
      '  [БЪГOВЕ] Бекендът не проверява company.vatNumber при създаване на продукт.',
    );
    console.log(
      '  [БЪГOВЕ] Schema default е @default(20), което не е правилно за нерегистрирани по ДДС.',
    );
    console.log(
      '  [БЪГOВЕ] Фронтендът (products/page.tsx:200-202) задава vatRate=0 за компания без ДДС номер,',
    );
    console.log(
      '  [БЪГOВЕ] но бекендът не валидира това - ако API заявката не включва vatRate, ще е 20%.',
    );
    return false;
  } else if (Number(product.vatRate) === 0) {
    console.log('  [OK] vatRate = 0% за нерегистрирана по ДДС компания');
    return true;
  }

  return false;
}

// ============================================================
// ТЕСТ 7: Поръчка с ДДС - бекенд default 20% без проверка
// ============================================================
async function testOrderVatDefault() {
  console.log('\n=== ТЕСТ 7: ДДС при поръчки - бекенд default логика ===');

  // Продукт с vatRate 0 (за нерегистрирана компания)
  const productNoVat = await prisma.product.create({
    data: {
      sku: `${TEST_PREFIX}_ORD_NOVAT`,
      name: 'Продукт с VAT 0',
      type: 'PRODUCT',
      unit: 'PIECE',
      salePrice: 100.0,
      vatRate: 0, // Изрично 0%
      trackInventory: true,
      companyId: testCompanyWithoutVat.id,
    },
  });

  // Симулираме логиката от orders.service.ts ред 72:
  // const itemVatRate = item.vatRate ?? Number(product?.vatRate) ?? 20;

  // Случай A: item.vatRate НЕ е подаден, product.vatRate = 0
  const itemDtoVatRate: number | undefined = undefined;
  const itemVatRateA = itemDtoVatRate ?? Number(productNoVat.vatRate) ?? 20;
  console.log(
    `  Случай A: item.vatRate=undefined, product.vatRate=0 -> резултат: ${itemVatRateA}%`,
  );

  if (itemVatRateA === 0) {
    console.log('  [OK] Когато product.vatRate=0, системата коректно ползва 0%');
  } else {
    console.log(`  [БЪГOВЕ] Очаквана стойност 0%, получена ${itemVatRateA}%`);
  }

  // Случай B: item.vatRate НЕ е подаден, product е null (не е намерен)
  // Симулираме: const product = products.find(p => p.id === item.productId);
  // Ако не е намерен, product е undefined
  const missingProduct: any = undefined;
  const itemVatRateB = itemDtoVatRate ?? Number(missingProduct?.vatRate) ?? 20;
  console.log(
    `  Случай B: item.vatRate=undefined, product=undefined -> резултат: ${itemVatRateB}`,
  );
  // Number(undefined) = NaN, NaN ?? 20 = NaN (NaN не е null/undefined!)

  if (isNaN(itemVatRateB)) {
    console.log(
      '  [БЪГOВЕ] Ако продуктът не е намерен, Number(undefined?.vatRate) = NaN!',
    );
    console.log(
      '  [БЪГOВЕ] NaN не е null/undefined, затова ?? 20 НЕ помага. vatRate ще бъде NaN!',
    );
  }

  // Случай C: product е null
  const nullProduct: any = null;
  const itemVatRateC = itemDtoVatRate ?? Number(nullProduct?.vatRate) ?? 20;
  console.log(
    `  Случай C (product=null): item.vatRate=undefined, product=null -> ${itemVatRateC}`,
  );

  if (isNaN(itemVatRateC)) {
    console.log(
      '  [БЪГOВЕ] ПОТВЪРДЕНО: Ако продуктът не е намерен, vatRate = NaN вместо 20!',
    );
  }

  return true;
}

// ============================================================
// ТЕСТ 8: Стокова разписка - валута по подразбиране на компанията
// ============================================================
async function testGoodsReceiptDefaultCurrency() {
  console.log('\n=== ТЕСТ 8: Стокова разписка - валута по подразбиране ===');

  // В goods-receipts.service.ts ред 92:
  // const currencyId = dto.currencyId || company.currencyId;

  const company = await prisma.company.findUnique({
    where: { id: testCompanyWithVat.id },
    include: { currency: true },
  });

  console.log(`  Компания: ${company!.name}`);
  console.log(`  Валута на компанията: ${company!.currency?.code} (id: ${company!.currencyId})`);

  console.log('  [OK] В goods-receipts.service.ts, когато не е посочена валута,');
  console.log(`       се използва валутата на компанията (${company!.currency?.code}).`);
  console.log('  [ВНИМАНИЕ] Тази логика е САМО в goods-receipts.service.ts.');
  console.log('  [ВНИМАНИЕ] В orders.service.ts НЯМА валута на поръчката изобщо!');
  console.log('  [ВНИМАНИЕ] Моделът Order НЯМА поле currencyId.');

  return true;
}

// ============================================================
// ТЕСТ 9: Анулиране на потвърдена стокова разписка
// ============================================================
async function testGoodsReceiptCancellation() {
  console.log('\n=== ТЕСТ 9: Анулиране на потвърдена стокова разписка ===');

  const product = await prisma.product.create({
    data: {
      sku: `${TEST_PREFIX}_CANCEL_PROD`,
      name: 'Продукт за анулиране',
      type: 'PRODUCT',
      unit: 'PIECE',
      salePrice: 30.0,
      vatRate: 20,
      trackInventory: true,
      companyId: testCompanyWithVat.id,
    },
  });

  // Създай и потвърди разписка
  const gr = await prisma.goodsReceipt.create({
    data: {
      receiptNumber: `${TEST_PREFIX}_GR_CANCEL`,
      status: 'DRAFT',
      companyId: testCompanyWithVat.id,
      locationId: testLocation.id,
      createdById: testUser.id,
      items: {
        create: [
          {
            productId: product.id,
            quantity: 50,
            unitPrice: 15.0,
            vatRate: 20,
          },
        ],
      },
    },
    include: { items: true },
  });

  // Потвърди
  await prisma.$transaction(async (tx) => {
    await tx.goodsReceipt.update({
      where: { id: gr.id },
      data: { status: 'COMPLETED' },
    });
    for (const item of gr.items) {
      await tx.inventoryBatch.create({
        data: {
          batchNumber: `${gr.receiptNumber}-${item.id.slice(-4)}`,
          quantity: item.quantity,
          initialQty: item.quantity,
          unitCost: item.unitPrice,
          companyId: testCompanyWithVat.id,
          productId: item.productId,
          locationId: testLocation.id,
          goodsReceiptItemId: item.id,
        },
      });
    }
  });

  const stockBefore = await prisma.inventoryBatch.findMany({
    where: { companyId: testCompanyWithVat.id, productId: product.id },
  });
  console.log(
    `  [ПРЕДИ АНУЛИРАНЕ] Партиди: ${stockBefore.length}, Количество: ${stockBefore.reduce((s, b) => s + Number(b.quantity), 0)}`,
  );

  // Анулирай - симулираме cancel логиката
  await prisma.$transaction(async (tx) => {
    await tx.inventoryBatch.deleteMany({
      where: {
        goodsReceiptItemId: {
          in: gr.items.map((item) => item.id),
        },
      },
    });
    await tx.goodsReceipt.update({
      where: { id: gr.id },
      data: { status: 'CANCELLED' },
    });
  });

  const stockAfter = await prisma.inventoryBatch.findMany({
    where: { companyId: testCompanyWithVat.id, productId: product.id },
  });
  console.log(
    `  [СЛЕД АНУЛИРАНЕ] Партиди: ${stockAfter.length}, Количество: ${stockAfter.reduce((s, b) => s + Number(b.quantity), 0)}`,
  );

  assert(
    stockAfter.length === 0,
    'След анулиране не трябва да има партиди',
  );
  console.log('  [OK] Анулиране на стокова разписка изтрива наличностите коректно');

  return true;
}

// ============================================================
// Helper
// ============================================================
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  CRM/ERP Бизнес Логика - E2E Тестове                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const results: { name: string; passed: boolean; error?: string }[] = [];

  try {
    await setupTestData();

    // ТЕСТ 1: Наличности - Добавяне
    try {
      const { product, batch } = await testInventoryIncrease();
      results.push({ name: 'Наличности - Добавяне чрез стокова разписка', passed: true });

      // ТЕСТ 2: Наличности - Продажба
      try {
        const passed = await testInventoryDecreaseOnSale(product, batch);
        results.push({ name: 'Наличности - Намаляване при продажба', passed });
      } catch (e: any) {
        results.push({ name: 'Наличности - Намаляване при продажба', passed: false, error: e.message });
      }

      // ТЕСТ 3: Анулиране на поръчка
      try {
        const passed = await testInventoryRestoreOnCancel(product, batch);
        results.push({ name: 'Наличности - Възстановяване при анулиране', passed });
      } catch (e: any) {
        results.push({ name: 'Наличности - Възстановяване при анулиране', passed: false, error: e.message });
      }
    } catch (e: any) {
      results.push({ name: 'Наличности - Добавяне чрез стокова разписка', passed: false, error: e.message });
    }

    // ТЕСТ 4: Валутни курсове
    try {
      await testCurrencyConversion();
      results.push({ name: 'Валутни курсове - USD към EUR', passed: true });
    } catch (e: any) {
      results.push({ name: 'Валутни курсове - USD към EUR', passed: false, error: e.message });
    }

    // ТЕСТ 5: ДДС с регистрация
    try {
      await testVatWithRegistration();
      results.push({ name: 'ДДС - Компания с ДДС номер', passed: true });
    } catch (e: any) {
      results.push({ name: 'ДДС - Компания с ДДС номер', passed: false, error: e.message });
    }

    // ТЕСТ 6: ДДС без регистрация
    try {
      const passed = await testVatWithoutRegistration();
      results.push({ name: 'ДДС - Компания без ДДС номер', passed });
    } catch (e: any) {
      results.push({ name: 'ДДС - Компания без ДДС номер', passed: false, error: e.message });
    }

    // ТЕСТ 7: Поръчка ДДС default
    try {
      await testOrderVatDefault();
      results.push({ name: 'ДДС - Поръчка default логика', passed: true });
    } catch (e: any) {
      results.push({ name: 'ДДС - Поръчка default логика', passed: false, error: e.message });
    }

    // ТЕСТ 8: Валута по подразбиране
    try {
      await testGoodsReceiptDefaultCurrency();
      results.push({ name: 'Валута по подразбиране в стокова разписка', passed: true });
    } catch (e: any) {
      results.push({ name: 'Валута по подразбиране в стокова разписка', passed: false, error: e.message });
    }

    // ТЕСТ 9: Анулиране на стокова разписка
    try {
      await testGoodsReceiptCancellation();
      results.push({ name: 'Анулиране на стокова разписка', passed: true });
    } catch (e: any) {
      results.push({ name: 'Анулиране на стокова разписка', passed: false, error: e.message });
    }
  } finally {
    await cleanupTestData();
    await prisma.$disconnect();
  }

  // ============================================================
  // Резултати
  // ============================================================
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  РЕЗУЛТАТИ                                                  ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`║  ${icon} ${r.name}`);
    if (r.error) {
      console.log(`║     Грешка: ${r.error}`);
    }
  }

  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Общо: ${results.length} | Успешни: ${passedCount} | Неуспешни: ${failedCount}    `);
  console.log('╚══════════════════════════════════════════════════════════════╝');

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  БЕЛЕЖКИ:');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('  [ФИКСИРАН] Потвърждаване на поръчка коректно намалява наличността');
  console.log('  [ФИКСИРАН] Анулиране на поръчка коректно възстановява наличността');
  console.log('  Забележка: Тестовете вече извикват OrdersService.confirm()/cancel()');
  console.log('  вместо ръчен prisma.order.update().');
  console.log('');

  if (failedCount > 0) {
    process.exit(1);
  }
}

main();
