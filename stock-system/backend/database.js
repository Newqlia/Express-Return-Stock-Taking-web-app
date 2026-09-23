const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "stock_system.db");

const db = new Database(dbPath);

db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

/* =========================================================
   HELPERS
========================================================= */

function tableExists(tableName) {
    const row = db.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        AND name = ?
    `).get(tableName);

    return !!row;
}

function columnExists(tableName, columnName) {
    if (!tableExists(tableName)) {
        return false;
    }

    const columns = db.prepare(
        `PRAGMA table_info(${tableName})`
    ).all();

    return columns.some(
        column => column.name === columnName
    );
}

function addColumnIfMissing(
    tableName,
    columnName,
    definition
) {
    if (!columnExists(tableName, columnName)) {
        db.prepare(`
            ALTER TABLE ${tableName}
            ADD COLUMN ${columnName} ${definition}
        `).run();
    }
}

/* =========================================================
   BUSINESSES
========================================================= */

db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_name TEXT NOT NULL,
        phone TEXT DEFAULT '',
        location TEXT DEFAULT '',
        business_type TEXT DEFAULT '',
        active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

/* =========================================================
   EXISTING TABLES
========================================================= */

db.exec(`
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        selling_price REAL NOT NULL DEFAULT 0,
        purchase_price REAL NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS daily_stock (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        product_id INTEGER NOT NULL,
        opening_quantity REAL NOT NULL DEFAULT 0,
        additions REAL NOT NULL DEFAULT 0,
        closing_quantity REAL NOT NULL DEFAULT 0,
        units_sold REAL NOT NULL DEFAULT 0,
        sales REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_number TEXT NOT NULL UNIQUE,
        date TEXT NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'CASH',
        total_amount REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity REAL NOT NULL DEFAULT 1,
        selling_price REAL NOT NULL DEFAULT 0,
        purchase_price REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        product_id INTEGER NOT NULL,
        quantity REAL NOT NULL DEFAULT 0,
        amount REAL NOT NULL DEFAULT 0,
        supplier TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reconciliations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
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

/* =========================================================
   ADD BUSINESS_ID TO EXISTING TABLES
========================================================= */

const businessTables = [
    "products",
    "daily_stock",
    "sales",
    "purchases",
    "expenses",
    "reconciliations"
];

let defaultBusinessId;

/*
    Existing database already contains data.

    Create a default business only when none exists.
*/

const existingBusiness = db.prepare(`
    SELECT id
    FROM businesses
    ORDER BY id ASC
    LIMIT 1
`).get();

if (existingBusiness) {

    defaultBusinessId = existingBusiness.id;

} else {

    const result = db.prepare(`
        INSERT INTO businesses
        (
            business_name,
            phone,
            location,
            business_type,
            active
        )
        VALUES (?, ?, ?, ?, 1)
    `).run(
        "Existing Business",
        "",
        "",
        "General"
    );

    defaultBusinessId = result.lastInsertRowid;
}

/*
    Add business_id to old tables if necessary.
*/

for (const table of businessTables) {

    addColumnIfMissing(
        table,
        "business_id",
        "INTEGER"
    );

    db.prepare(`
        UPDATE ${table}
        SET business_id = ?
        WHERE business_id IS NULL
    `).run(defaultBusinessId);
}

/* =========================================================
   INDEXES
========================================================= */

db.exec(`
    CREATE INDEX IF NOT EXISTS idx_products_business
    ON products(business_id);

    CREATE INDEX IF NOT EXISTS idx_stock_business_date
    ON daily_stock(business_id, date);

    CREATE INDEX IF NOT EXISTS idx_stock_product
    ON daily_stock(product_id);

    CREATE INDEX IF NOT EXISTS idx_sales_business_date
    ON sales(business_id, date);

    CREATE INDEX IF NOT EXISTS idx_sale_items_sale
    ON sale_items(sale_id);

    CREATE INDEX IF NOT EXISTS idx_purchases_business_date
    ON purchases(business_id, date);

    CREATE INDEX IF NOT EXISTS idx_expenses_business_date
    ON expenses(business_id, date);

    CREATE INDEX IF NOT EXISTS idx_reconciliation_business_date
    ON reconciliations(business_id, date);
`);

/* =========================================================
   BUSINESS UNIQUE DATE/PRODUCT STOCK INDEX
========================================================= */

try {

    db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS
        idx_daily_stock_unique
        ON daily_stock(business_id, date, product_id);
    `);

} catch (error) {

    console.log(
        "Daily stock unique index was not created:",
        error.message
    );

}

/* =========================================================
   INFORMATION
========================================================= */

console.log("========================================");
console.log(" STOCK SYSTEM DATABASE READY");
console.log(" Database:", dbPath);
console.log(" Default Business ID:", defaultBusinessId);
console.log("========================================");

module.exports = db;