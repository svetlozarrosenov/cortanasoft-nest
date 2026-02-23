export declare const ErrorMessages: {
    common: {
        notFound: string;
        unauthorized: string;
        forbidden: string;
        badRequest: string;
        internalError: string;
        validationFailed: string;
        missingPermission: (permission: string) => string;
        userNotAuthenticated: string;
        noRoleAssigned: string;
    };
    database: {
        uniqueViolation: string;
        foreignKeyViolation: string;
        recordNotFound: string;
        connectionError: string;
    };
    products: {
        notFound: string;
        skuExists: (sku: string) => string;
        categoryNotFound: string;
        categoryExists: (name: string) => string;
        cannotDeleteCategoryWithProducts: string;
        cannotDeleteCategoryWithSubcategories: string;
        cannotDeleteWithOrders: string;
        cannotDeleteWithInventory: string;
    };
    customers: {
        notFound: string;
        companyNameRequired: string;
        personalNameRequired: string;
        eikExists: string;
        cannotDeleteWithOrders: string;
        countryNotFound: string;
    };
    orders: {
        notFound: string;
        mustHaveItems: string;
        locationNotFound: string;
        productsNotFound: string;
        canOnlyUpdatePending: string;
        canOnlyConfirmPending: string;
        cannotConfirmWithoutItems: string;
        alreadyCancelled: string;
        cannotCancelDelivered: string;
        canOnlyDeletePending: string;
    };
    suppliers: {
        notFound: string;
        eikExists: (eik: string) => string;
        cannotDeleteWithOrders: string;
    };
    invoices: {
        notFound: string;
        orderNotFound: string;
        canOnlyCreateFromConfirmed: string;
        canOnlyUpdateDraft: string;
        canOnlyIssueDraft: string;
        cannotPayDraft: string;
        cannotPayCancelled: string;
        alreadyFullyPaid: string;
        cannotCancelPaid: string;
        cannotCancelPartiallyPaid: string;
        alreadyCancelled: string;
        canOnlyDeleteDraft: string;
    };
    inventory: {
        batchNotFound: string;
        storageZoneNotFound: string;
        locationNotFound: string;
        productNotFound: string;
        goodsReceiptNotFound: string;
        insufficientStock: string;
    };
    locations: {
        notFound: string;
        codeExists: (code: string) => string;
        cannotDeleteWithInventory: string;
        zoneCodeExists: (code: string) => string;
        zoneNotFound: string;
        cannotDeleteZoneWithInventory: string;
    };
    goodsReceipts: {
        notFound: string;
        companyNotFound: string;
        locationNotFound: string;
        supplierNotFound: string;
        productsNotFound: string;
        canOnlyUpdateDraft: string;
        canOnlyConfirmDraft: string;
        cannotConfirmWithoutItems: string;
        alreadyCancelled: string;
        canOnlyDeleteDraft: string;
    };
    purchaseOrders: {
        notFound: string;
        mustHaveItems: string;
        supplierNotFound: string;
        productsNotFound: string;
        canOnlyUpdateDraft: string;
        canOnlySendDraft: string;
        cannotSendWithoutItems: string;
        canOnlyConfirmSent: string;
        alreadyCancelled: string;
        cannotCancelFullyReceived: string;
        cannotCancelWithCompletedReceipts: string;
        canOnlyDeleteDraft: string;
        mustBeSentOrConfirmed: string;
    };
    users: {
        notFound: string;
        emailExists: string;
        invalidCredentials: string;
        accountInactive: string;
        cannotDeleteSelf: string;
    };
    roles: {
        notFound: string;
        nameExists: string;
        cannotDeleteWithUsers: string;
        cannotDeleteDefault: string;
    };
    companies: {
        notFound: string;
        eikExists: string;
        cannotDeleteOwner: string;
    };
    employees: {
        notFound: string;
        userNotFound: string;
        departmentNotFound: string;
        managerNotFound: string;
    };
    departments: {
        notFound: string;
        nameExists: string;
        cannotDeleteWithEmployees: string;
    };
    attendance: {
        notFound: string;
        alreadyCheckedIn: string;
        notCheckedIn: string;
        alreadyCheckedOut: string;
    };
    leaves: {
        notFound: string;
        overlapping: string;
        cannotModifyApproved: string;
        cannotDeleteApproved: string;
        insufficientBalance: string;
    };
    tickets: {
        notFound: string;
        commentNotFound: string;
        cannotDeleteClosed: string;
    };
    crm: {
        contactNotFound: string;
        companyNotFound: string;
        leadNotFound: string;
        dealNotFound: string;
        callNotFound: string;
        emailNotFound: string;
    };
    companyPlans: {
        notFound: string;
        companyNotFound: string;
        cannotDeleteActive: string;
    };
    demoRequests: {
        notFound: string;
    };
};
export declare function getPrismaErrorMessage(error: any): string;
