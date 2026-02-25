-- BuildTrack Pro Relational Schema (MySQL Compatible)

CREATE TABLE IF NOT EXISTS settings (
    id VARCHAR(50) PRIMARY KEY,
    theme VARCHAR(10) DEFAULT 'light',
    allow_decimal_stock BOOLEAN DEFAULT FALSE,
    trade_categories TEXT,
    stocking_units TEXT,
    site_statuses TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    client VARCHAR(255),
    supervisor VARCHAR(255),
    status VARCHAR(50),
    is_godown BOOLEAN DEFAULT FALSE,
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15, 2) DEFAULT 0,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS vendors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(255),
    category VARCHAR(255),
    balance DECIMAL(15, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS materials (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50),
    cost_per_unit DECIMAL(15, 2) DEFAULT 0,
    total_purchased DECIMAL(15, 4) DEFAULT 0,
    total_used DECIMAL(15, 4) DEFAULT 0,
    low_stock_threshold DECIMAL(15, 4) DEFAULT 10
);

CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    project_id VARCHAR(50),
    vendor_id VARCHAR(50),
    amount DECIMAL(15, 2) NOT NULL,
    category VARCHAR(255),
    payment_method VARCHAR(50),
    notes TEXT,
    material_id VARCHAR(50),
    material_quantity DECIMAL(15, 4),
    unit_price DECIMAL(15, 2),
    inventory_action VARCHAR(50),
    parent_purchase_id VARCHAR(50),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (material_id) REFERENCES materials(id)
);

CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    vendor_id VARCHAR(50),
    amount DECIMAL(15, 2) NOT NULL,
    method VARCHAR(50),
    reference VARCHAR(255),
    material_batch_id VARCHAR(50),
    master_payment_id VARCHAR(50),
    is_allocation BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

CREATE TABLE IF NOT EXISTS incomes (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    project_id VARCHAR(50),
    amount DECIMAL(15, 2) NOT NULL,
    source VARCHAR(255),
    method VARCHAR(50),
    reference VARCHAR(255),
    notes TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50),
    amount DECIMAL(15, 2) NOT NULL,
    date DATE NOT NULL,
    due_date DATE,
    description TEXT,
    status VARCHAR(50),
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    phone VARCHAR(50),
    daily_wage DECIMAL(15, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS labor_logs (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50),
    project_id VARCHAR(50),
    date DATE NOT NULL,
    status VARCHAR(50),
    wage_amount DECIMAL(15, 2) DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS labor_payments (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50),
    amount DECIMAL(15, 2) NOT NULL,
    date DATE NOT NULL,
    method VARCHAR(50),
    reference VARCHAR(255),
    notes TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS stock_history (
    id VARCHAR(50) PRIMARY KEY,
    material_id VARCHAR(50),
    date DATE NOT NULL,
    type VARCHAR(50),
    quantity DECIMAL(15, 4) NOT NULL,
    project_id VARCHAR(50),
    vendor_id VARCHAR(50),
    note TEXT,
    unit_price DECIMAL(15, 2),
    parent_purchase_id VARCHAR(50),
    FOREIGN KEY (material_id) REFERENCES materials(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);
