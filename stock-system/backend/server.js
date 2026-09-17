const express = require("express");
const cors = require("cors");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;


// ======================================================
// CORS
// ======================================================

const allowedOrigins = [
    "https://stunning-space-bassoon-69v9r76w4q5525xq6-8000.app.github.dev"
];

app.use(
    cors({
        origin: function (origin, callback) {

            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error("Not allowed by CORS"));
        },

        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],

        allowedHeaders: ["Content-Type", "Authorization"]
    })
);

app.use(express.json());


// ======================================================
// HELPERS
// ======================================================

function getToday() {

    const now = new Date();

    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0")
    ].join("-");
}


function validDate(date) {

    return /^\d{4}-\d{2}-\d{2}$/.test(date);
}


function number(value) {

    const n = Number(value);

    return Number.isFinite(n) ? n : 0;
}


// ======================================================
// HOME
// ======================================================

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "Stock System Backend is running!"
    });

});


// ======================================================
// PRODUCTS
// ======================================================

app.get("/api/products", (req, res) => {

    try {

        const products = db.prepare(`
            SELECT
                id,
                name,
                selling_price,
                purchase_price,
                active,
                created_at
            FROM products
            WHERE active = 1
            ORDER BY name ASC
        `).all();

        res.json({
            success: true,
            products
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to load products",
            error: error.message
        });

    }

});


app.post("/api/products", (req, res) => {

    try {

        const name = String(req.body.name || "").trim();

        const sellingPrice = number(req.body.selling_price);

        const purchasePrice = number(req.body.purchase_price);

        if (!name) {

            return res.status(400).json({
                success: false,
                message: "Product name is required"
            });

        }

        const result = db.prepare(`
            INSERT INTO products
            (
                name,
                selling_price,
                purchase_price
            )
            VALUES (?, ?, ?)
        `).run(
            name,
            sellingPrice,
            purchasePrice
        );

        res.status(201).json({

            success: true,

            message: "Product added successfully",

            productId: result.lastInsertRowid

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to add product",
            error: error.message
        });

    }

});


// DELETE PRODUCT
app.delete("/api/products/:id", (req, res) => {

    try {

        const id = Number(req.params.id);

        const result = db.prepare(`
            UPDATE products
            SET active = 0
            WHERE id = ?
        `).run(id);

        if (!result.changes) {

            return res.status(404).json({
                success: false,
                message: "Product not found"
            });

        }

        res.json({
            success: true,
            message: "Product deleted"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to delete product"
        });

    }

});


// ======================================================
// OPENING STOCK
// ======================================================

app.get("/api/opening-stock", (req, res) => {

    try {

        const date = req.query.date || getToday();

        const products = db.prepare(`
            SELECT
                p.id,
                p.name,
                p.selling_price,
                p.purchase_price,

                COALESCE(
                    (
                        SELECT closing_quantity
                        FROM daily_stock ds
                        WHERE ds.product_id = p.id
                        AND ds.date < ?
                        ORDER BY ds.date DESC
                        LIMIT 1
                    ),
                    0
                ) AS previous_closing,

                COALESCE(
                    (
                        SELECT opening_quantity
                        FROM daily_stock ds2
                        WHERE ds2.product_id = p.id
                        AND ds2.date = ?
                    ),
                    0
                ) AS opening_quantity

            FROM products p

            WHERE p.active = 1

            ORDER BY p.name ASC
        `).all(date, date);

        res.json({
            success: true,
            date,
            products
        });

    } catch (error) {

        console.error("OPENING STOCK ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load opening stock",
            error: error.message
        });

    }

});


app.post("/api/opening-stock", (req, res) => {

    try {

        const date = req.body.date;

        const productId = Number(req.body.product_id);

        const quantity = number(req.body.quantity);

        if (!validDate(date)) {

            return res.status(400).json({
                success: false,
                message: "Invalid date"
            });

        }

        const product = db.prepare(`
            SELECT id
            FROM products
            WHERE id = ?
            AND active = 1
        `).get(productId);

        if (!product) {

            return res.status(404).json({
                success: false,
                message: "Product not found"
            });

        }

        const existing = db.prepare(`
            SELECT id
            FROM daily_stock
            WHERE date = ?
            AND product_id = ?
        `).get(date, productId);

        if (existing) {

            db.prepare(`
                UPDATE daily_stock
                SET opening_quantity = ?
                WHERE id = ?
            `).run(quantity, existing.id);

        } else {

            db.prepare(`
                INSERT INTO daily_stock
                (
                    date,
                    product_id,
                    opening_quantity
                )
                VALUES (?, ?, ?)
            `).run(
                date,
                productId,
                quantity
            );

        }

        res.json({
            success: true,
            message: "Opening stock saved"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to save opening stock",
            error: error.message
        });

    }

});


// ======================================================
// DAILY STOCK
// ======================================================

app.get("/api/daily-stock", (req, res) => {

    try {

        const date = req.query.date || getToday();

        if (!validDate(date)) {

            return res.status(400).json({
                success: false,
                message: "Invalid date"
            });

        }

        const products = db.prepare(`
            SELECT

                p.id,

                p.name,

                p.selling_price,

                p.purchase_price,

                COALESCE(ds.opening_quantity, 0)
                    AS opening_quantity,

                COALESCE(ds.additions, 0)
                    AS additions,

                (
                    COALESCE(ds.opening_quantity, 0)
                    +
                    COALESCE(ds.additions, 0)
                )
                    AS available_quantity,

                COALESCE(ds.closing_quantity, 0)
                    AS closing_quantity,

                COALESCE(ds.units_sold, 0)
                    AS units_sold,

                COALESCE(ds.sales, 0)
                    AS sales,

                COALESCE(
                    (
                        SELECT SUM(si.quantity)

                        FROM sale_items si

                        INNER JOIN sales s
                        ON s.id = si.sale_id

                        WHERE si.product_id = p.id
                        AND s.date = ?

                    ),
                    0
                )
                AS recorded_units_sold,

                COALESCE(
                    (
                        SELECT SUM(si.total)

                        FROM sale_items si

                        INNER JOIN sales s
                        ON s.id = si.sale_id

                        WHERE si.product_id = p.id
                        AND s.date = ?

                    ),
                    0
                )
                AS receipt_sales

            FROM products p

            LEFT JOIN daily_stock ds

            ON ds.product_id = p.id
            AND ds.date = ?

            WHERE p.active = 1

            ORDER BY p.name ASC

        `).all(
            date,
            date,
            date
        );


        const formatted = products.map(p => {

            const stockSold = number(p.units_sold);

            const receiptSold = number(p.recorded_units_sold);

            return {

                ...p,

                stock_variance:
                    stockSold - receiptSold

            };

        });


        res.json({

            success: true,

            date,

            products: formatted

        });

    } catch (error) {

        console.error(
            "DAILY STOCK ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Failed to load daily stock",

            error: error.message

        });

    }

});


app.post("/api/daily-stock", (req, res) => {

    try {

        const date = req.body.date;

        const productId =
            Number(req.body.product_id);

        const additions =
            number(req.body.additions);

        const closing =
            number(req.body.closing_quantity);


        const product = db.prepare(`
            SELECT *
            FROM products
            WHERE id = ?
            AND active = 1
        `).get(productId);


        if (!product) {

            return res.status(404).json({

                success: false,

                message: "Product not found"

            });

        }


        let existing = db.prepare(`
            SELECT *
            FROM daily_stock
            WHERE date = ?
            AND product_id = ?
        `).get(
            date,
            productId
        );


        let opening = 0;


        if (existing) {

            opening =
                number(existing.opening_quantity);

        } else {

            const previous =
                db.prepare(`
                    SELECT closing_quantity

                    FROM daily_stock

                    WHERE product_id = ?

                    AND date < ?

                    ORDER BY date DESC

                    LIMIT 1
                `).get(
                    productId,
                    date
                );


            opening = previous
                ? number(previous.closing_quantity)
                : 0;

        }


        const available =
            opening + additions;


        if (closing > available) {

            return res.status(400).json({

                success: false,

                message:
                    `Closing stock cannot exceed available stock (${available})`

            });

        }


        const unitsSold =
            available - closing;


        const sales =
            unitsSold *
            number(product.selling_price);


        if (existing) {

            db.prepare(`
                UPDATE daily_stock

                SET
                    opening_quantity = ?,
                    additions = ?,
                    closing_quantity = ?,
                    units_sold = ?,
                    sales = ?

                WHERE id = ?

            `).run(

                opening,
                additions,
                closing,
                unitsSold,
                sales,
                existing.id

            );

        } else {

            db.prepare(`
                INSERT INTO daily_stock
                (
                    date,
                    product_id,
                    opening_quantity,
                    additions,
                    closing_quantity,
                    units_sold,
                    sales
                )

                VALUES (?, ?, ?, ?, ?, ?, ?)

            `).run(

                date,
                productId,
                opening,
                additions,
                closing,
                unitsSold,
                sales

            );

        }


        res.json({

            success: true,

            message: "Daily stock saved",

            stock: {

                opening,

                additions,

                available,

                closing,

                unitsSold,

                sales

            }

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: "Failed to save daily stock",

            error: error.message

        });

    }

});


// ======================================================
// SALES / RECEIPTS
// ======================================================

app.post("/api/sales", (req, res) => {

    try {

        const date =
            req.body.date;

        const paymentMethod =
            req.body.payment_method || "CASH";

        const items =
            req.body.items;


        if (!validDate(date)) {

            return res.status(400).json({

                success: false,

                message: "Invalid date"

            });

        }


        if (
            !Array.isArray(items) ||
            items.length === 0
        ) {

            return res.status(400).json({

                success: false,

                message: "Add at least one item"

            });

        }


        const createSale =
            db.transaction(() => {

                let totalAmount = 0;

                const cleanItems = [];


                for (const item of items) {

                    const productId =
                        Number(item.product_id);

                    const quantity =
                        Number(item.quantity);


                    if (
                        !Number.isFinite(quantity) ||
                        quantity <= 0
                    ) {

                        throw new Error(
                            "Quantity must be greater than zero"
                        );

                    }


                    const product =
                        db.prepare(`
                            SELECT *
                            FROM products
                            WHERE id = ?
                            AND active = 1
                        `).get(productId);


                    if (!product) {

                        throw new Error(
                            "Product not found"
                        );

                    }


                    const unitPrice =
                        number(product.selling_price);


                    const total =
                        quantity * unitPrice;


                    totalAmount += total;


                    cleanItems.push({

                        productId,

                        quantity,

                        unitPrice,

                        total

                    });

                }


                const tempReceipt =
                    `TEMP-${Date.now()}-${Math.random()}`;


                const result =
                    db.prepare(`
                        INSERT INTO sales
                        (
                            date,
                            receipt_number,
                            payment_method,
                            total_amount
                        )

                        VALUES (?, ?, ?, ?)

                    `).run(

                        date,

                        tempReceipt,

                        paymentMethod,

                        totalAmount

                    );


                const saleId =
                    result.lastInsertRowid;


                const receiptNumber =
                    `ER-${date.replace(/-/g, "")}-${String(saleId).padStart(4, "0")}`;


                db.prepare(`
                    UPDATE sales
                    SET receipt_number = ?
                    WHERE id = ?
                `).run(
                    receiptNumber,
                    saleId
                );


                const insertItem =
                    db.prepare(`
                        INSERT INTO sale_items
                        (
                            sale_id,
                            product_id,
                            quantity,
                            unit_price,
                            total
                        )

                        VALUES (?, ?, ?, ?, ?)
                    `);


                for (const item of cleanItems) {

                    insertItem.run(

                        saleId,

                        item.productId,

                        item.quantity,

                        item.unitPrice,

                        item.total

                    );

                }


                return {

                    saleId,

                    receiptNumber,

                    totalAmount

                };

            });


        const result =
            createSale();


        res.status(201).json({

            success: true,

            saleId: result.saleId,

            receiptNumber:
                result.receiptNumber,

            totalAmount:
                result.totalAmount

        });

    } catch (error) {

        console.error(
            "SALE ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message: error.message ||
                "Failed to save sale"

        });

    }

});


// GET SALES
app.get("/api/sales", (req, res) => {

    try {

        const date =
            req.query.date || getToday();


        const sales =
            db.prepare(`
                SELECT

                    s.id,

                    s.date,

                    s.receipt_number,

                    s.payment_method,

                    s.total_amount,

                    COUNT(si.id)
                    AS item_count

                FROM sales s

                LEFT JOIN sale_items si

                ON si.sale_id = s.id

                WHERE s.date = ?

                GROUP BY s.id

                ORDER BY s.id DESC

            `).all(date);


        const total =
            db.prepare(`
                SELECT
                    COALESCE(
                        SUM(total_amount),
                        0
                    ) AS total

                FROM sales

                WHERE date = ?

            `).get(date);


        res.json({

            success: true,

            date,

            totalSales:
                number(total.total),

            sales

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: "Failed to load sales",

            error: error.message

        });

    }

});


// GET SINGLE RECEIPT
app.get("/api/sales/:id", (req, res) => {

    try {

        const id =
            Number(req.params.id);


        const sale =
            db.prepare(`
                SELECT *
                FROM sales
                WHERE id = ?
            `).get(id);


        if (!sale) {

            return res.status(404).json({

                success: false,

                message: "Receipt not found"

            });

        }


        const items =
            db.prepare(`
                SELECT

                    si.id,

                    si.product_id,

                    p.name,

                    si.quantity,

                    si.unit_price,

                    si.total

                FROM sale_items si

                INNER JOIN products p

                ON p.id = si.product_id

                WHERE si.sale_id = ?

                ORDER BY si.id ASC

            `).all(id);


        res.json({

            success: true,

            sale: {

                ...sale,

                items

            }

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: "Failed to load receipt"

        });

    }

});


// DELETE SALE
app.delete("/api/sales/:id", (req, res) => {

    try {

        const id =
            Number(req.params.id);


        const result =
            db.prepare(`
                DELETE FROM sales
                WHERE id = ?
            `).run(id);


        if (!result.changes) {

            return res.status(404).json({

                success: false,

                message: "Sale not found"

            });

        }


        res.json({

            success: true,

            message: "Receipt deleted"

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: "Failed to delete receipt"

        });

    }

});


// ======================================================
// PURCHASES
// ======================================================

app.get("/api/purchases", (req, res) => {

    try {

        const date =
            req.query.date || getToday();


        const purchases =
            db.prepare(`
                SELECT

                    pu.id,

                    pu.date,

                    pu.product_id,

                    p.name,

                    pu.quantity,

                    pu.amount

                FROM purchases pu

                INNER JOIN products p

                ON p.id = pu.product_id

                WHERE pu.date = ?

                ORDER BY pu.id DESC

            `).all(date);


        const total =
            db.prepare(`
                SELECT
                    COALESCE(
                        SUM(amount),
                        0
                    ) AS total

                FROM purchases

                WHERE date = ?

            `).get(date);


        res.json({

            success: true,

            purchases,

            total:
                number(total.total)

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: "Failed to load purchases"

        });

    }

});


app.post("/api/purchases", (req, res) => {

    try {

        const result =
            db.prepare(`
                INSERT INTO purchases
                (
                    date,
                    product_id,
                    quantity,
                    amount
                )

                VALUES (?, ?, ?, ?)

            `).run(

                req.body.date,

                Number(req.body.product_id),

                number(req.body.quantity),

                number(req.body.amount)

            );


        res.status(201).json({

            success: true,

            message: "Purchase saved",

            id: result.lastInsertRowid

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: "Failed to save purchase"

        });

    }

});


app.delete("/api/purchases/:id", (req, res) => {

    try {

        const result =
            db.prepare(`
                DELETE FROM purchases
                WHERE id = ?
            `).run(
                Number(req.params.id)
            );


        res.json({

            success: true,

            message: "Purchase deleted"

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: "Failed to delete purchase"

        });

    }

});


// ======================================================
// EXPENSES
// ======================================================

app.get("/api/expenses", (req, res) => {

    try {

        const date =
            req.query.date || getToday();


        const expenses =
            db.prepare(`
                SELECT *

                FROM expenses

                WHERE date = ?

                ORDER BY id DESC

            `).all(date);


        const total =
            db.prepare(`
                SELECT
                    COALESCE(
                        SUM(amount),
                        0
                    ) AS total

                FROM expenses

                WHERE date = ?

            `).get(date);


        res.json({

            success: true,

            expenses,

            total:
                number(total.total)

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: "Failed to load expenses"

        });

    }

});


app.post("/api/expenses", (req, res) => {

    try {

        const result =
            db.prepare(`
                INSERT INTO expenses
                (
                    date,
                    description,
                    amount
                )

                VALUES (?, ?, ?)

            `).run(

                req.body.date,

                String(
                    req.body.description || ""
                ).trim(),

                number(req.body.amount)

            );


        res.status(201).json({

            success: true,

            message: "Expense saved",

            id: result.lastInsertRowid

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: "Failed to save expense"

        });

    }

});


app.delete("/api/expenses/:id", (req, res) => {

    try {

        db.prepare(`
            DELETE FROM expenses
            WHERE id = ?
        `).run(
            Number(req.params.id)
        );


        res.json({

            success: true,

            message: "Expense deleted"

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: "Failed to delete expense"

        });

    }

});


// ======================================================
// RECONCILIATION
// ======================================================

app.post("/api/reconciliation", (req, res) => {

    try {

        const date =
            req.body.date;


        const sales =
            db.prepare(`
                SELECT
                    COALESCE(
                        SUM(total_amount),
                        0
                    ) AS total

                FROM sales

                WHERE date = ?

            `).get(date);


        const expenses =
            db.prepare(`
                SELECT
                    COALESCE(
                        SUM(amount),
                        0
                    ) AS total

                FROM expenses

                WHERE date = ?

            `).get(date);


        const purchases =
            db.prepare(`
                SELECT
                    COALESCE(
                        SUM(amount),
                        0
                    ) AS total

                FROM purchases

                WHERE date = ?

            `).get(date);


        const totalSales =
            number(sales.total);

        const totalExpenses =
            number(expenses.total);

        const totalPurchases =
            number(purchases.total);


        const expectedMoney =
            totalSales -
            totalExpenses -
            totalPurchases;


        const cashAtHand =
            number(req.body.cash_at_hand);


        const tillAmount =
            number(req.body.till_amount);


        const actualMoney =
            cashAtHand +
            tillAmount;


        const difference =
            actualMoney -
            expectedMoney;


        let status = "BALANCED";


        if (difference < -0.01) {

            status = "SHORTAGE";

        }


        if (difference > 0.01) {

            status = "SURPLUS";

        }


        db.prepare(`
            INSERT INTO reconciliations
            (
                date,
                total_sales,
                expenses,
                purchases,
                expected_money,
                cash_at_hand,
                till_amount,
                actual_money,
                difference,
                status
            )

            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

            ON CONFLICT(date)

            DO UPDATE SET

                total_sales =
                    excluded.total_sales,

                expenses =
                    excluded.expenses,

                purchases =
                    excluded.purchases,

                expected_money =
                    excluded.expected_money,

                cash_at_hand =
                    excluded.cash_at_hand,

                till_amount =
                    excluded.till_amount,

                actual_money =
                    excluded.actual_money,

                difference =
                    excluded.difference,

                status =
                    excluded.status

        `).run(

            date,

            totalSales,

            totalExpenses,

            totalPurchases,

            expectedMoney,

            cashAtHand,

            tillAmount,

            actualMoney,

            difference,

            status

        );


        res.json({

            success: true,

            date,

            totalSales,

            expenses: totalExpenses,

            purchases: totalPurchases,

            expectedMoney,

            cashAtHand,

            tillAmount,

            actualMoney,

            difference,

            status

        });

    } catch (error) {

        console.error(
            "RECONCILIATION ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to calculate reconciliation",

            error: error.message

        });

    }

});


// ======================================================
// DAILY REPORT
// ======================================================

app.get("/api/reports/daily", (req, res) => {

    try {

        const date =
            req.query.date || getToday();


        const rows =
            db.prepare(`
                SELECT

                    p.id,

                    p.name,

                    p.selling_price,

                    p.purchase_price,

                    COALESCE(
                        ds.opening_quantity,
                        0
                    ) AS opening_quantity,

                    COALESCE(
                        ds.additions,
                        0
                    ) AS additions,

                    COALESCE(
                        ds.closing_quantity,
                        0
                    ) AS closing_quantity,

                    COALESCE(
                        ds.units_sold,
                        0
                    ) AS units_sold,

                    COALESCE(
                        ds.sales,
                        0
                    ) AS sales,

                    COALESCE(
                        (
                            SELECT SUM(si.quantity)

                            FROM sale_items si

                            INNER JOIN sales s
                            ON s.id = si.sale_id

                            WHERE si.product_id = p.id
                            AND s.date = ?

                        ),
                        0
                    ) AS recorded_units_sold,

                    COALESCE(
                        (
                            SELECT SUM(si.total)

                            FROM sale_items si

                            INNER JOIN sales s
                            ON s.id = si.sale_id

                            WHERE si.product_id = p.id
                            AND s.date = ?

                        ),
                        0
                    ) AS receipt_sales

                FROM products p

                LEFT JOIN daily_stock ds

                ON ds.product_id = p.id
                AND ds.date = ?

                WHERE p.active = 1

                ORDER BY p.name ASC

            `).all(
                date,
                date,
                date
            );


        let stockSales = 0;

        let receiptSales = 0;

        let stockUnits = 0;

        let receiptUnits = 0;

        let cost = 0;


        const products =
            rows.map(row => {

                const stockSold =
                    number(row.units_sold);

                const receiptSold =
                    number(row.recorded_units_sold);

                const receiptSale =
                    number(row.receipt_sales);


                const productCost =
                    receiptSold *
                    number(row.purchase_price);


                stockSales +=
                    number(row.sales);

                receiptSales +=
                    receiptSale;

                stockUnits +=
                    stockSold;

                receiptUnits +=
                    receiptSold;

                cost +=
                    productCost;


                return {

                    ...row,

                    stock_variance:
                        stockSold -
                        receiptSold,

                    cost_of_goods:
                        productCost,

                    gross_profit:
                        receiptSale -
                        productCost

                };

            });


        const expenseResult =
            db.prepare(`
                SELECT
                    COALESCE(
                        SUM(amount),
                        0
                    ) AS total

                FROM expenses

                WHERE date = ?

            `).get(date);


        const purchaseResult =
            db.prepare(`
                SELECT
                    COALESCE(
                        SUM(amount),
                        0
                    ) AS total

                FROM purchases

                WHERE date = ?

            `).get(date);


        const expenses =
            number(expenseResult.total);

        const purchases =
            number(purchaseResult.total);


        res.json({

            success: true,

            date,

            products,

            totals: {

                stockSales,

                receiptSales,

                units: stockUnits,

                stockUnits,

                receiptUnits,

                cost,

                profit:
                    receiptSales - cost,

                stockVariance:
                    stockUnits - receiptUnits,

                expenses,

                purchases

            }

        });

    } catch (error) {

        console.error(
            "REPORT ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to load daily report",

            error: error.message

        });

    }

});


// ======================================================
// START
// ======================================================

app.listen(PORT, () => {

    console.log("");
    console.log("====================================");
    console.log(" EXPRESS RETURNS STOCK SYSTEM");
    console.log("====================================");
    console.log(` Server running on port ${PORT}`);
    console.log("====================================");
    console.log("");

});