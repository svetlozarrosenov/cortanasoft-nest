/**
 * Централизирани съобщения за грешки на български език
 * Използват се във всички сървиси за консистентност
 */

export const ErrorMessages = {
  // ==================== Общи грешки ====================
  common: {
    notFound: 'Записът не е намерен',
    unauthorized: 'Нямате права за това действие',
    forbidden: 'Достъпът е забранен',
    badRequest: 'Невалидна заявка',
    internalError: 'Възникна грешка. Моля, опитайте отново.',
    validationFailed: 'Невалидни данни',
    missingPermission: (permission: string) => `Достъпът е отказан. Нямате право за: ${permission}`,
    userNotAuthenticated: 'Потребителят не е удостоверен',
    noRoleAssigned: 'Няма зададена роля за тази компания',
  },

  // ==================== Prisma / Database грешки ====================
  database: {
    uniqueViolation: 'Запис с тези данни вече съществува',
    foreignKeyViolation: 'Не може да се изтрие запис, който се използва от други данни',
    recordNotFound: 'Записът не е намерен',
    connectionError: 'Грешка при свързване с базата данни',
  },

  // ==================== Продукти ====================
  products: {
    notFound: 'Продуктът не е намерен',
    skuExists: (sku: string) => `Продукт с артикулен номер "${sku}" вече съществува`,
    categoryNotFound: 'Категорията не е намерена',
    categoryExists: (name: string) => `Категория "${name}" вече съществува`,
    cannotDeleteCategoryWithProducts: 'Не може да изтриете категория с продукти',
    cannotDeleteCategoryWithSubcategories: 'Не може да изтриете категория с подкатегории',
    cannotDeleteWithOrders: 'Не може да изтриете продукт, който има поръчки. Деактивирайте го вместо това.',
    cannotDeleteWithInventory: 'Не може да изтриете продукт с налични количества',
  },

  // ==================== Клиенти ====================
  customers: {
    notFound: 'Клиентът не е намерен',
    companyNameRequired: 'Името на фирмата е задължително за фирмени клиенти',
    personalNameRequired: 'Името или фамилията са задължителни за физически лица',
    eikExists: 'Клиент с този ЕИК вече съществува',
    cannotDeleteWithOrders: 'Не може да изтриете клиент с поръчки. Деактивирайте го вместо това.',
    countryNotFound: 'Държавата не е намерена',
  },

  // ==================== Поръчки ====================
  orders: {
    notFound: 'Поръчката не е намерена',
    mustHaveItems: 'Поръчката трябва да има поне един артикул',
    locationNotFound: 'Локацията не е намерена',
    productsNotFound: 'Един или повече продукти не са намерени',
    canOnlyUpdatePending: 'Може да редактирате само чакащи поръчки',
    canOnlyConfirmPending: 'Може да потвърдите само чакащи поръчки',
    cannotConfirmWithoutItems: 'Не може да потвърдите поръчка без артикули',
    alreadyCancelled: 'Поръчката вече е отменена',
    cannotCancelDelivered: 'Не може да отмените доставени поръчки',
    canOnlyDeletePending: 'Може да изтриете само чакащи поръчки',
  },

  // ==================== Доставчици ====================
  suppliers: {
    notFound: 'Доставчикът не е намерен',
    eikExists: (eik: string) => `Доставчик с ЕИК "${eik}" вече съществува`,
    cannotDeleteWithOrders: 'Не може да изтриете доставчик със заявки за покупка',
  },

  // ==================== Фактури ====================
  invoices: {
    notFound: 'Фактурата не е намерена',
    orderNotFound: 'Поръчката не е намерена',
    canOnlyCreateFromConfirmed: 'Може да създавате фактури само от потвърдени поръчки',
    canOnlyUpdateDraft: 'Може да редактирате само чернови фактури',
    canOnlyIssueDraft: 'Може да издавате само чернови фактури',
    cannotPayDraft: 'Не може да регистрирате плащане на чернова фактура. Първо я издайте.',
    cannotPayCancelled: 'Не може да регистрирате плащане на анулирана фактура',
    alreadyFullyPaid: 'Фактурата вече е напълно платена',
    cannotCancelPaid: 'Не може да анулирате платена фактура. Създайте кредитно известие.',
    cannotCancelPartiallyPaid: 'Не може да анулирате частично платена фактура. Създайте кредитно известие.',
    alreadyCancelled: 'Фактурата вече е анулирана',
    canOnlyDeleteDraft: 'Може да изтриете само чернови фактури',
  },

  // ==================== Инвентар ====================
  inventory: {
    batchNotFound: 'Партидата не е намерена',
    storageZoneNotFound: 'Зоната за съхранение не е намерена в тази локация',
    locationNotFound: 'Локацията не е намерена',
    productNotFound: 'Продуктът не е намерен',
    goodsReceiptNotFound: 'Стоковата разписка не е намерена',
    insufficientStock: 'Недостатъчна наличност',
  },

  // ==================== Локации ====================
  locations: {
    notFound: 'Локацията не е намерена',
    codeExists: (code: string) => `Локация с код "${code}" вече съществува`,
    cannotDeleteWithInventory: 'Не може да изтриете локация с налични продукти',
    zoneCodeExists: (code: string) => `Зона с код "${code}" вече съществува в тази локация`,
    zoneNotFound: 'Зоната не е намерена',
    cannotDeleteZoneWithInventory: 'Не може да изтриете зона с налични продукти',
  },

  // ==================== Стокови разписки ====================
  goodsReceipts: {
    notFound: 'Стоковата разписка не е намерена',
    companyNotFound: 'Компанията не е намерена',
    locationNotFound: 'Локацията не е намерена',
    supplierNotFound: 'Доставчикът не е намерен',
    productsNotFound: 'Един или повече продукти не са намерени',
    canOnlyUpdateDraft: 'Може да редактирате само чернови разписки',
    canOnlyConfirmDraft: 'Може да потвърдите само чернови разписки',
    cannotConfirmWithoutItems: 'Не може да потвърдите разписка без артикули',
    alreadyCancelled: 'Разписката вече е отменена',
    canOnlyDeleteDraft: 'Може да изтриете само чернови разписки',
  },

  // ==================== Заявки за покупка ====================
  purchaseOrders: {
    notFound: 'Заявката за покупка не е намерена',
    mustHaveItems: 'Заявката трябва да има поне един артикул',
    supplierNotFound: 'Доставчикът не е намерен',
    productsNotFound: 'Един или повече продукти не са намерени',
    canOnlyUpdateDraft: 'Може да редактирате само чернови заявки',
    canOnlySendDraft: 'Може да изпращате само чернови заявки',
    cannotSendWithoutItems: 'Не може да изпратите заявка без артикули',
    canOnlyConfirmSent: 'Може да потвърдите само изпратени заявки',
    alreadyCancelled: 'Заявката вече е отменена',
    cannotCancelFullyReceived: 'Не може да отмените напълно получени заявки',
    cannotCancelWithCompletedReceipts: 'Не може да отмените заявка с завършени стокови разписки',
    canOnlyDeleteDraft: 'Може да изтриете само чернови заявки',
    mustBeSentOrConfirmed: 'Заявката трябва да е изпратена, потвърдена или частично получена',
  },

  // ==================== Потребители ====================
  users: {
    notFound: 'Потребителят не е намерен',
    emailExists: 'Потребител с този имейл вече съществува',
    invalidCredentials: 'Невалиден имейл или парола',
    accountInactive: 'Акаунтът е деактивиран',
    cannotDeleteSelf: 'Не може да изтриете собствения си акаунт',
  },

  // ==================== Роли ====================
  roles: {
    notFound: 'Ролята не е намерена',
    nameExists: 'Роля с това име вече съществува',
    cannotDeleteWithUsers: 'Не може да изтриете роля, която има потребители',
    cannotDeleteDefault: 'Не може да изтриете ролята по подразбиране',
  },

  // ==================== Компании ====================
  companies: {
    notFound: 'Компанията не е намерена',
    eikExists: 'Компания с този ЕИК вече съществува',
    cannotDeleteOwner: 'Не може да изтриете собственическата компания',
  },

  // ==================== Служители ====================
  employees: {
    notFound: 'Служителят не е намерен',
    userNotFound: 'Потребителят не е намерен',
    departmentNotFound: 'Отделът не е намерен',
    managerNotFound: 'Мениджърът не е намерен',
  },

  // ==================== Отдели ====================
  departments: {
    notFound: 'Отделът не е намерен',
    nameExists: 'Отдел с това име вече съществува',
    cannotDeleteWithEmployees: 'Не може да изтриете отдел със служители',
  },

  // ==================== Присъствия ====================
  attendance: {
    notFound: 'Записът за присъствие не е намерен',
    alreadyCheckedIn: 'Вече сте отбелязали начало на работния ден',
    notCheckedIn: 'Не сте отбелязали начало на работния ден',
    alreadyCheckedOut: 'Вече сте отбелязали край на работния ден',
  },

  // ==================== Отпуски ====================
  leaves: {
    notFound: 'Молбата за отпуска не е намерена',
    overlapping: 'Има застъпващ се период с друга молба за отпуска',
    cannotModifyApproved: 'Не може да редактирате одобрена молба',
    cannotDeleteApproved: 'Не може да изтриете одобрена молба',
    insufficientBalance: 'Недостатъчен баланс за този тип отпуска',
  },

  // ==================== Тикети ====================
  tickets: {
    notFound: 'Тикетът не е намерен',
    commentNotFound: 'Коментарът не е намерен',
    cannotDeleteClosed: 'Не може да изтриете затворен тикет',
  },

  // ==================== CRM ====================
  crm: {
    contactNotFound: 'Контактът не е намерен',
    companyNotFound: 'CRM компанията не е намерена',
    leadNotFound: 'Лийдът не е намерен',
    dealNotFound: 'Сделката не е намерена',
    callNotFound: 'Обаждането не е намерено',
    emailNotFound: 'Имейлът не е намерен',
  },

  // ==================== Планове на компании ====================
  companyPlans: {
    notFound: 'Планът не е намерен',
    companyNotFound: 'Компанията не е намерена',
    cannotDeleteActive: 'Не може да изтриете активен план',
  },

  // ==================== Демо заявки ====================
  demoRequests: {
    notFound: 'Демо заявката не е намерена',
  },
};

/**
 * Помощна функция за получаване на преведено Prisma съобщение за грешка
 */
export function getPrismaErrorMessage(error: any): string {
  // P2002 - Unique constraint violation
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0];
    if (field) {
      const fieldTranslations: Record<string, string> = {
        email: 'имейл',
        eik: 'ЕИК',
        sku: 'артикулен номер',
        code: 'код',
        name: 'име',
        vatNumber: 'ДДС номер',
      };
      const translatedField = fieldTranslations[field] || field;
      return `Запис с този ${translatedField} вече съществува`;
    }
    return ErrorMessages.database.uniqueViolation;
  }

  // P2003 - Foreign key constraint violation
  if (error.code === 'P2003') {
    return ErrorMessages.database.foreignKeyViolation;
  }

  // P2025 - Record not found
  if (error.code === 'P2025') {
    return ErrorMessages.database.recordNotFound;
  }

  // P2014 - Required relation violation
  if (error.code === 'P2014') {
    return 'Не може да се изтрие запис, защото има свързани данни';
  }

  // P2000 - Value too long for column
  if (error.code === 'P2000') {
    const column = error.meta?.column_name || 'поле';
    return `Стойността е твърде дълга за ${column}`;
  }

  // P2005 - Invalid value for field
  if (error.code === 'P2005') {
    const field = error.meta?.field_name || 'поле';
    return `Невалидна стойност за ${field}`;
  }

  // P2006 - Invalid value provided
  if (error.code === 'P2006') {
    const field = error.meta?.field_name || 'поле';
    return `Невалидна стойност за ${field}`;
  }

  // P2011 - Null constraint violation
  if (error.code === 'P2011') {
    const constraint = error.meta?.constraint || 'поле';
    return `Полето ${constraint} не може да бъде празно`;
  }

  // P2012 - Missing required value
  if (error.code === 'P2012') {
    const field = error.meta?.path || 'поле';
    return `Липсва задължителна стойност за ${field}`;
  }

  // Return code for debugging unknown errors
  return `Грешка в базата данни (код: ${error.code}). Моля, проверете въведените данни.`;
}
