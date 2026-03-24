CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(255) PRIMARY KEY,
    syncId VARCHAR(255),
    name VARCHAR(255),
    client VARCHAR(255),
    location VARCHAR(255),
    startDate VARCHAR(50),
    endDate VARCHAR(50),
    budget DECIMAL(15,2),
    status VARCHAR(50),
    description TEXT,
    contactNumber VARCHAR(50),
    isGodown BOOLEAN,
    isDeleted BOOLEAN
);

CREATE TABLE IF NOT EXISTS vendors (
    id VARCHAR(255) PRIMARY KEY,
    syncId VARCHAR(255),
    name VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    category VARCHAR(100),
    email VARCHAR(255),
    balance DECIMAL(15,2),
    isActive BOOLEAN
);

CREATE TABLE IF NOT EXISTS materials (
    id VARCHAR(255) PRIMARY KEY,
    syncId VARCHAR(255),
    name VARCHAR(255),
    unit VARCHAR(50),
    costPerUnit DECIMAL(15,2),
    totalPurchased DECIMAL(15,2),
    totalUsed DECIMAL(15,2),
    lowStockThreshold DECIMAL(15,2)
);

CREATE TABLE IF NOT EXISTS stockHistory (
    id VARCHAR(255) PRIMARY KEY,
    syncId VARCHAR(255),
    materialId VARCHAR(255),
    date VARCHAR(50),
    type VARCHAR(50),
    quantity DECIMAL(15,2),
    projectId VARCHAR(255),
    vendorId VARCHAR(255),
    note TEXT,
    unitPrice DECIMAL(15,2),
    parentPurchaseId VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(255) PRIMARY KEY,
    syncId VARCHAR(255),
    date VARCHAR(50),
    projectId VARCHAR(255),
    vendorId VARCHAR(255),
    materialId VARCHAR(255),
    materialQuantity DECIMAL(15,2),
    unitPrice DECIMAL(15,2),
    amount DECIMAL(15,2),
    paymentMethod VARCHAR(50),
    notes TEXT,
    invoiceUrl TEXT,
    category VARCHAR(100),
    inventoryAction VARCHAR(50),
    parentPurchaseId VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS incomes (
    id VARCHAR(255) PRIMARY KEY,
    syncId VARCHAR(255),
    projectId VARCHAR(255),
    date VARCHAR(50),
    amount DECIMAL(15,2),
    description TEXT,
    method VARCHAR(50),
    invoiceId VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(255) PRIMARY KEY,
    syncId VARCHAR(255),
    projectId VARCHAR(255),
    date VARCHAR(50),
    amount DECIMAL(15,2),
    description TEXT,
    status VARCHAR(50),
    dueDate VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(255) PRIMARY KEY,
    syncId VARCHAR(255),
    date VARCHAR(50),
    vendorId VARCHAR(255),
    projectId VARCHAR(255),
    amount DECIMAL(15,2),
    method VARCHAR(50),
    reference TEXT,
    materialBatchId VARCHAR(255),
    masterPaymentId VARCHAR(255),
    isAllocation BOOLEAN
);

CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(255) PRIMARY KEY,
    syncId VARCHAR(255),
    name VARCHAR(255),
    role VARCHAR(100),
    phone VARCHAR(50),
    dailyWage DECIMAL(15,2),
    status VARCHAR(50),
    joiningDate VARCHAR(50),
    currentSiteId VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS laborLogs (
    id VARCHAR(255) PRIMARY KEY,
    syncId VARCHAR(255),
    date VARCHAR(50),
    employeeId VARCHAR(255),
    projectId VARCHAR(255),
    hoursWorked DECIMAL(10,2),
    wageAmount DECIMAL(15,2),
    status VARCHAR(50),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS laborPayments (
    id VARCHAR(255) PRIMARY KEY,
    syncId VARCHAR(255),
    employeeId VARCHAR(255),
    projectId VARCHAR(255),
    date VARCHAR(50),
    amount DECIMAL(15,2),
    method VARCHAR(50),
    reference TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS activityLogs (
    id VARCHAR(255) PRIMARY KEY,
    syncId VARCHAR(255),
    timestamp VARCHAR(50),
    action VARCHAR(100),
    entityType VARCHAR(100),
    entityId VARCHAR(255),
    details TEXT,
    userId VARCHAR(255),
    userName VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    syncId VARCHAR(255),
    name VARCHAR(255),
    email VARCHAR(255),
    role VARCHAR(50),
    avatar TEXT,
    permissions JSON,
    password VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS app_settings (
    syncId VARCHAR(255) PRIMARY KEY,
    tradeCategories JSON,
    stockingUnits JSON,
    siteStatuses JSON,
    allowDecimalStock BOOLEAN,
    theme VARCHAR(50),
    currentUser JSON,
    lastUpdated BIGINT
);
