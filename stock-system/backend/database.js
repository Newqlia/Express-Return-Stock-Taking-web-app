const Database = require("better-sqlite3");

const db = new Database("stock_system.db");

console.log("SQLite database connected successfully");


// ==========================================
// DATABASE SETTINGS
// ==========================================

db.pragma("foreign_keys = ON");


// ==========================================
// BUSINESSES
// ==========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        business_name TEXT NOT NULL,

        phone TEXT,

        location TEXT,

        business_type TEXT,

        active INTEGER NOT NULL DEFAULT 1,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);


// ==========================================
// CREATE DEFAULT BUSINESS FOR EXISTING DATA
// ==========================================

const businessCount = db
    .prepare("SELECT COUNT(*) AS count FROM businesses")
    .get();

if (businessCount.count === 0) {

    db.prepare(`
        INSERT INTO businesses (
            business_name,
            phone,
            location,
            business_type
        )
        VALUES (?, ?, ?, ?)
    `).run(
        "Existing Business",
        "",
        "",
        ""
    );

    console.log(
        "Default business created for existing records"
    );
}


// ==========================================
// FIND DEFAULT BUSINESS
// ==========================================

const defaultBusiness = db
    .prepare(`
        SELECT id
        FROM businesses
        ORDER BY id ASC
        LIMIT 1
    `)
    .get();

const defaultBusinessId = defaultBusiness.id;


// ==========================================
// ADD BUSINESS_ID TO EXISTING TABLES
// ==========================================

function addBusinessId(tableName) {

    const columns = db
        .prepare(`PRAGMA table_info(${tableName})`)
        .all();

    const hasBusinessId = columns.some(
        column => column.name === "business_id"
    );

    if (!hasBusinessId) {

        db.exec(`
            ALTER TABLE ${tableName}
            ADD COLUMN business_id INTEGER
        `);

        db.prepare(`
            UPDATE ${tableName}
            SET business_id = ?
            WHERE business_id IS NULL
        `).run(defaultBusinessId);

        console.log(
            `business_id added to ${tableName}`
        );
    }
}


// Existing tables

addBusinessId("products");
addBusinessId("daily_stock");
addBusinessId("sales");
addBusinessId("purchases");
addBusinessId("expenses");
addBusinessId("reconciliations");


// ==========================================
// PRODUCTS
// ==========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        business_id INTEGER NOT NULL,

        name TEXT NOT NULL,

        selling_price REAL NOT NULL,

        purchase_price REAL NOT NULL,

        active INTEGER NOT NULL DEFAULT 1,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (business_id)
            REFERENCES businesses(id)
    );
`);


// ==========================================
// DAILY STOCK
// ==========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS daily_stock (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        business_id INTEGER NOT NULL,

        date TEXT NOT NULL,

        product_id INTEGER NOT NULL,

        opening_quantity REAL NOT NULL DEFAULT 0,

        additions REAL NOT NULL DEFAULT 0,

        closing_quantity REAL NOT NULL DEFAULT 0,

        units_sold REAL NOT NULL DEFAULT 0,

        sales REAL NOT NULL DEFAULT 0,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (business_id)
            REFERENCES businesses(id),

        FOREIGN KEY (product_id)
            REFERENCES products(id)
    );
`);


// ==========================================
// PURCHASES
// ==========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        business_id INTEGER NOT NULL,

        date TEXT NOT NULL,

        product_id INTEGER NOT NULL,

        quantity REAL NOT NULL DEFAULT 0,

        amount REAL NOT NULL DEFAULT 0,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (business_id)
            REFERENCES businesses(id),

        FOREIGN KEY (product_id)
            REFERENCES products(id)
    );
`);


// ==========================================
// EXPENSES
// ==========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        business_id INTEGER NOT NULL,

        date TEXT NOT NULL,

        description TEXT NOT NULL,

        amount REAL NOT NULL DEFAULT 0,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (business_id)
            REFERENCES businesses(id)
    );
`);


// ==========================================
// RECONCILIATIONS
// ==========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS reconciliations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        business_id INTEGER NOT NULL,

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

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (business_id)
            REFERENCES businesses(id)
    );
`);


// ==========================================
// SALES
// ==========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        business_id INTEGER NOT NULL,

        receipt_number TEXT NOT NULL UNIQUE,

        date TEXT NOT NULL,

        payment_method TEXT NOT NULL DEFAULT 'CASH',

        total_amount REAL NOT NULL DEFAULT 0,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (business_id)
            REFERENCES businesses(id)
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

        quantity REAL NOT NULL,

        selling_price REAL NOT NULL,

        purchase_price REAL NOT NULL,

        total REAL NOT NULL,

        FOREIGN KEY (sale_id)
            REFERENCES sales(id),

        FOREIGN KEY (product_id)
            REFERENCES products(id)
    );
`);


// ==========================================
// INDEXES
// ==========================================

db.exec(`
    CREATE INDEX IF NOT EXISTS
    idx_products_business
    ON products(business_id);
`);

db.exec(`
    CREATE INDEX IF NOT EXISTS
    idx_daily_stock_business_date
    ON daily_stock(business_id, date);
`);

db.exec(`
    CREATE INDEX IF NOT EXISTS
    idx_sales_business_date
    ON sales(business_id, date);
`);

db.exec(`
    CREATE INDEX IF NOT EXISTS
    idx_sale_items_sale
    ON sale_items(sale_id);
`);

db.exec(`
    CREATE INDEX IF NOT EXISTS
    idx_purchases_business_date
    ON purchases(business_id, date);
`);

db.exec(`
    CREATE INDEX IF NOT EXISTS
    idx_expenses_business_date
    ON expenses(business_id, date);
`);

db.exec(`
    CREATE INDEX IF NOT EXISTS
    idx_reconciliation_business_date
    ON reconciliations(business_id, date);
`);


// ==========================================
// DATABASE READY
// ==========================================

console.log("Businesses table is ready");
console.log("Products table is ready");
console.log("Daily stock table is ready");
console.log("Sales table is ready");
console.log("Sale items table is ready");
console.log("Purchases table is ready");
console.log("Expenses table is ready");
console.log("Reconciliation table is ready");

module.exports = db;