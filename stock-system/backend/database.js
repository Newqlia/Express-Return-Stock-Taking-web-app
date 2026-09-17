const Database = require("better-sqlite3");

const db = new Database("stock_system.db");

db.pragma("foreign_keys = ON");

console.log("SQLite database connected successfully");

// ==========================================
// PRODUCTS
// ==========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        selling_price REAL NOT NULL,
        purchase_price REAL NOT NULL,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// ==========================================
// DAILY STOCK
// ==========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS daily_stock (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        product_id INTEGER NOT NULL,
        opening_quantity REAL NOT NULL DEFAULT 0,
        additions REAL NOT NULL DEFAULT 0,
        closing_quantity REAL NOT NULL DEFAULT 0,
        units_sold REAL NOT NULL DEFAULT 0,
        sales REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(date, product_id),

        FOREIGN KEY(product_id)
            REFERENCES products(id)
    );
`);

// ==========================================
// PURCHASES
// ==========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        product_id INTEGER NOT NULL,
        quantity REAL NOT NULL DEFAULT 0,
        amount REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY(product_id)
            REFERENCES products(id)
    );
`);

// ==========================================
// EXPENSES
// ==========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// ==========================================
// SALES
// ==========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        date TEXT NOT NULL,

        receipt_number TEXT NOT NULL UNIQUE,

        payment_method TEXT NOT NULL DEFAULT 'CASH',

        total_amount REAL NOT NULL DEFAULT 0,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// ==========================================
// SALE ITEMS
// ==========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        sale_id INTEGER NOT NULL,

        product_id INTEGER NOT NULL,

        quantity REAL NOT NULL DEFAULT 0,

        unit_price REAL NOT NULL DEFAULT 0,

        total REAL NOT NULL DEFAULT 0,

        FOREIGN KEY(sale_id)
            REFERENCES sales(id)
            ON DELETE CASCADE,

        FOREIGN KEY(product_id)
            REFERENCES products(id)
    );
`);

// ==========================================
// RECONCILIATION
// ==========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS reconciliations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        date TEXT NOT NULL UNIQUE,

        total_sales REAL NOT NULL DEFAULT 0,

        expenses REAL NOT NULL DEFAULT 0,

        purchases REAL NOT NULL DEFAULT 0,

        expected_money REAL NOT NULL DEFAULT 0,

        cash_at_hand REAL NOT NULL DEFAULT 0,

        till_amount REAL NOT NULL DEFAULT 0,

        actual_money REAL NOT NULL DEFAULT 0,

        difference REAL NOT NULL DEFAULT 0,

        status TEXT NOT NULL DEFAULT 'BALANCED',

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// ==========================================
// INDEXES
// ==========================================

db.exec(`
    CREATE INDEX IF NOT EXISTS idx_daily_stock_date
    ON daily_stock(date);
`);

db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sales_date
    ON sales(date);
`);

db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale
    ON sale_items(sale_id);
`);

db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sale_items_product
    ON sale_items(product_id);
`);

console.log("Products table is ready");
console.log("Daily stock table is ready");
console.log("Purchases table is ready");
console.log("Expenses table is ready");
console.log("Sales table is ready");
console.log("Sale items table is ready");
console.log("Reconciliation table is ready");

module.exports = db;