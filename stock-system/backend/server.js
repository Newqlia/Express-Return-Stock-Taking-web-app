const express = require("express");
const cors = require("cors");

const db = require("./database");

const app = express();

const PORT = process.env.PORT || 3000;


// ==========================================
// CORS
// ==========================================

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

            console.log("Blocked CORS origin:", origin);

            return callback(
                new Error("Not allowed by CORS")
            );
        },

        methods: [
            "GET",
            "POST",
            "PUT",
            "DELETE",
            "OPTIONS"
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ],

        credentials: false
    })
);


app.use(express.json());


// ==========================================
// HELPER
// ==========================================

function getToday() {

    return new Date()
        .toISOString()
        .split("T")[0];

}


// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "Stock System Backend is running!"
    });

});


// ==========================================
// TEST
// ==========================================

app.get("/api/test", (req, res) => {

    res.json({
        success: true,
        message: "Stock System API is working!"
    });

});


// ==========================================
// PRODUCTS
// ==========================================


// GET PRODUCTS

app.get("/api/products", (req, res) => {

    try {

        const products = db
            .prepare(`
                SELECT *
                FROM products
                WHERE active = 1
                ORDER BY id DESC
            `)
            .all();


        res.json({
            success: true,
            products
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to get products"
        });

    }

});


// ADD PRODUCT

app.post("/api/products", (req, res) => {

    try {

        const {
            name,
            sellingPrice,
            purchasePrice
        } = req.body;


        if (
            !name ||
            sellingPrice === undefined ||
            purchasePrice === undefined
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Name, selling price and purchase price are required"
            });

        }


        if (
            typeof sellingPrice !== "number" ||
            typeof purchasePrice !== "number"
        ) {

            return res.status(400).json({
                success: false,
                message: "Prices must be numbers"
            });

        }


        if (sellingPrice <= 0) {

            return res.status(400).json({
                success: false,
                message:
                    "Selling price must be greater than 0"
            });

        }


        if (purchasePrice < 0) {

            return res.status(400).json({
                success: false,
                message:
                    "Purchase price cannot be negative"
            });

        }


        const result = db
            .prepare(`
                INSERT INTO products
                (
                    name,
                    selling_price,
                    purchase_price
                )
                VALUES (?, ?, ?)
            `)
            .run(
                name.trim(),
                sellingPrice,
                purchasePrice
            );


        const product = db
            .prepare(`
                SELECT *
                FROM products
                WHERE id = ?
            `)
            .get(result.lastInsertRowid);


        res.status(201).json({
            success: true,
            message: "Product added successfully",
            product
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to add product"
        });

    }

});


// ==========================================
// OPENING STOCK
// ==========================================


// GET OPENING STOCK

app.get("/api/opening-stock", (req, res) => {

    try {

        const date =
            req.query.date || getToday();


        const products = db
            .prepare(`
                SELECT
                    p.id,
                    p.name,
                    COALESCE(ds.opening_quantity, 0)
                        AS opening_quantity
                FROM products p

                LEFT JOIN daily_stock ds
                    ON p.id = ds.product_id
                    AND ds.date = ?

                WHERE p.active = 1

                ORDER BY p.id ASC
            `)
            .all(date);


        res.json({
            success: true,
            date,
            products
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to get opening stock"
        });

    }

});


// SAVE OPENING STOCK

app.post("/api/opening-stock", (req, res) => {

    try {

        const {
            date,
            productId,
            quantity
        } = req.body;


        if (
            !date ||
            !productId ||
            quantity === undefined
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Date, product and quantity are required"
            });

        }


        const product = db
            .prepare(`
                SELECT *
                FROM products
                WHERE id = ?
            `)
            .get(productId);


        if (!product) {

            return res.status(404).json({
                success: false,
                message: "Product not found"
            });

        }


        db.prepare(`
            INSERT INTO daily_stock
            (
                date,
                product_id,
                opening_quantity
            )
            VALUES (?, ?, ?)

            ON CONFLICT(date, product_id)
            DO UPDATE SET
                opening_quantity = excluded.opening_quantity
        `)
        .run(
            date,
            productId,
            quantity
        );


        res.json({
            success: true,
            message: "Opening stock saved"
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to save opening stock"
        });

    }

});


// ==========================================
// DAILY STOCK
// ==========================================


// GET DAILY STOCK

app.get("/api/daily-stock", (req, res) => {

    try {

        const date =
            req.query.date || getToday();


        const products = db
            .prepare(`
                SELECT

                    p.id,

                    p.name,

                    p.selling_price,

                    COALESCE(
                        ds.opening_quantity,
                        (
                            SELECT closing_quantity
                            FROM daily_stock previous
                            WHERE previous.product_id = p.id
                            AND previous.date < ?
                            ORDER BY previous.date DESC
                            LIMIT 1
                        ),
                        0
                    ) AS opening_quantity,

                    COALESCE(ds.additions, 0)
                        AS additions,

                    COALESCE(ds.closing_quantity, 0)
                        AS closing_quantity,

                    COALESCE(ds.units_sold, 0)
                        AS units_sold,

                    COALESCE(ds.sales, 0)
                        AS sales

                FROM products p

                LEFT JOIN daily_stock ds
                    ON p.id = ds.product_id
                    AND ds.date = ?

                WHERE p.active = 1

                ORDER BY p.id ASC
            `)
            .all(date, date);


        res.json({
            success: true,
            date,
            products
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to get daily stock"
        });

    }

});


// SAVE DAILY STOCK

app.post("/api/daily-stock", (req, res) => {

    try {

        const {
            date,
            productId,
            additions,
            closingQuantity
        } = req.body;


        if (
            !date ||
            !productId ||
            additions === undefined ||
            closingQuantity === undefined
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Date, product, additions and closing quantity are required"
            });

        }


        const product = db
            .prepare(`
                SELECT *
                FROM products
                WHERE id = ?
            `)
            .get(productId);


        if (!product) {

            return res.status(404).json({
                success: false,
                message: "Product not found"
            });

        }


        // Find opening stock

        const previousDay = db
            .prepare(`
                SELECT closing_quantity
                FROM daily_stock
                WHERE product_id = ?
                AND date < ?
                ORDER BY date DESC
                LIMIT 1
            `)
            .get(productId, date);


        const existingToday = db
            .prepare(`
                SELECT opening_quantity
                FROM daily_stock
                WHERE product_id = ?
                AND date = ?
            `)
            .get(productId, date);


        let openingQuantity = 0;


        if (existingToday) {

            openingQuantity =
                Number(
                    existingToday.opening_quantity
                );

        } else if (previousDay) {

            openingQuantity =
                Number(
                    previousDay.closing_quantity
                );

        }


        const available =
            openingQuantity +
            Number(additions);


        const closing =
            Number(closingQuantity);


        if (closing > available) {

            return res.status(400).json({
                success: false,
                message:
                    "Closing stock cannot be greater than available stock"
            });

        }


        const unitsSold =
            available - closing;


        const sales =
            unitsSold *
            Number(product.selling_price);


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

            ON CONFLICT(date, product_id)

            DO UPDATE SET

                opening_quantity =
                    excluded.opening_quantity,

                additions =
                    excluded.additions,

                closing_quantity =
                    excluded.closing_quantity,

                units_sold =
                    excluded.units_sold,

                sales =
                    excluded.sales
        `)
        .run(
            date,
            productId,
            openingQuantity,
            Number(additions),
            closing,
            unitsSold,
            sales
        );


        res.json({
            success: true,
            message: "Daily stock saved",
            stock: {
                date,
                productId,
                openingQuantity,
                additions,
                closingQuantity: closing,
                unitsSold,
                sales
            }
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to save daily stock"
        });

    }

});


// ==========================================
// SALES
// ==========================================

app.get("/api/sales", (req, res) => {

    try {

        const date =
            req.query.date || getToday();


        const sales = db
            .prepare(`
                SELECT

                    ds.id,

                    ds.date,

                    p.name,

                    ds.units_sold,

                    p.selling_price,

                    ds.sales

                FROM daily_stock ds

                JOIN products p
                    ON p.id = ds.product_id

                WHERE ds.date = ?

                ORDER BY p.name ASC
            `)
            .all(date);


        const total = sales.reduce(
            (sum, item) =>
                sum + Number(item.sales),
            0
        );


        const units = sales.reduce(
            (sum, item) =>
                sum + Number(item.units_sold),
            0
        );


        res.json({
            success: true,
            date,
            units,
            total,
            sales
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to get sales"
        });

    }

});


// ==========================================
// PURCHASES
// ==========================================


// GET PURCHASES

app.get("/api/purchases", (req, res) => {

    try {

        const date =
            req.query.date || getToday();


        const purchases = db
            .prepare(`
                SELECT

                    purchases.id,

                    purchases.date,

                    purchases.product_id,

                    products.name,

                    purchases.quantity,

                    purchases.amount

                FROM purchases

                JOIN products
                    ON products.id =
                       purchases.product_id

                WHERE purchases.date = ?

                ORDER BY purchases.id DESC
            `)
            .all(date);


        const total = purchases.reduce(
            (sum, purchase) =>
                sum + Number(purchase.amount),
            0
        );


        res.json({
            success: true,
            date,
            total,
            purchases
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to get purchases"
        });

    }

});


// SAVE PURCHASE

app.post("/api/purchases", (req, res) => {

    try {

        const {
            date,
            productId,
            quantity,
            amount
        } = req.body;


        if (
            !date ||
            !productId ||
            quantity === undefined ||
            amount === undefined
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Date, product, quantity and amount are required"
            });

        }


        if (
            Number(quantity) <= 0 ||
            Number(amount) < 0
        ) {

            return res.status(400).json({
                success: false,
                message: "Invalid purchase values"
            });

        }


        const product = db
            .prepare(`
                SELECT *
                FROM products
                WHERE id = ?
            `)
            .get(productId);


        if (!product) {

            return res.status(404).json({
                success: false,
                message: "Product not found"
            });

        }


        const result = db
            .prepare(`
                INSERT INTO purchases
                (
                    date,
                    product_id,
                    quantity,
                    amount
                )
                VALUES (?, ?, ?, ?)
            `)
            .run(
                date,
                productId,
                quantity,
                amount
            );


        res.status(201).json({
            success: true,
            message: "Purchase recorded",
            id: result.lastInsertRowid
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to record purchase"
        });

    }

});


// ==========================================
// EXPENSES
// ==========================================


// GET EXPENSES

app.get("/api/expenses", (req, res) => {

    try {

        const date =
            req.query.date || getToday();


        const expenses = db
            .prepare(`
                SELECT *
                FROM expenses
                WHERE date = ?
                ORDER BY id DESC
            `)
            .all(date);


        const total = expenses.reduce(
            (sum, expense) =>
                sum + Number(expense.amount),
            0
        );


        res.json({
            success: true,
            date,
            total,
            expenses
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to get expenses"
        });

    }

});


// SAVE EXPENSE

app.post("/api/expenses", (req, res) => {

    try {

        const {
            date,
            description,
            amount
        } = req.body;


        if (
            !date ||
            !description ||
            amount === undefined
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Date, description and amount are required"
            });

        }


        if (Number(amount) <= 0) {

            return res.status(400).json({
                success: false,
                message:
                    "Expense amount must be greater than zero"
            });

        }


        const result = db
            .prepare(`
                INSERT INTO expenses
                (
                    date,
                    description,
                    amount
                )
                VALUES (?, ?, ?)
            `)
            .run(
                date,
                description.trim(),
                amount
            );


        res.status(201).json({
            success: true,
            message: "Expense recorded",
            id: result.lastInsertRowid
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to record expense"
        });

    }

});


// ==========================================
// RECONCILIATION
// ==========================================

app.post("/api/reconciliation", (req, res) => {

    try {

        const {
            date,
            cashAtHand,
            tillAmount
        } = req.body;


        const reportDate =
            date || getToday();


        // SALES

        const salesResult = db
            .prepare(`
                SELECT
                    COALESCE(
                        SUM(sales),
                        0
                    ) AS total
                FROM daily_stock
                WHERE date = ?
            `)
            .get(reportDate);


        // EXPENSES

        const expensesResult = db
            .prepare(`
                SELECT
                    COALESCE(
                        SUM(amount),
                        0
                    ) AS total
                FROM expenses
                WHERE date = ?
            `)
            .get(reportDate);


        // PURCHASES

        const purchasesResult = db
            .prepare(`
                SELECT
                    COALESCE(
                        SUM(amount),
                        0
                    ) AS total
                FROM purchases
                WHERE date = ?
            `)
            .get(reportDate);


        const totalSales =
            Number(salesResult.total);


        const expenses =
            Number(expensesResult.total);


        const purchases =
            Number(purchasesResult.total);


        // EXPECTED MONEY

        const expectedMoney =
            totalSales -
            expenses -
            purchases;


        // ACTUAL MONEY

        const actualMoney =
            Number(cashAtHand || 0) +
            Number(tillAmount || 0);


        // DIFFERENCE

        const difference =
            actualMoney -
            expectedMoney;


        let status;


        if (difference === 0) {

            status = "BALANCED";

        } else if (difference < 0) {

            status = "SHORTAGE";

        } else {

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
        `)
        .run(
            reportDate,
            totalSales,
            expenses,
            purchases,
            expectedMoney,
            Number(cashAtHand || 0),
            Number(tillAmount || 0),
            actualMoney,
            difference,
            status
        );


        res.json({
            success: true,

            report: {
                date: reportDate,
                totalSales,
                expenses,
                purchases,
                expectedMoney,
                cashAtHand:
                    Number(cashAtHand || 0),
                tillAmount:
                    Number(tillAmount || 0),
                actualMoney,
                difference,
                status
            }
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message:
                "Failed to calculate reconciliation"
        });

    }

});


// ==========================================
// REPORT
// ==========================================

app.get("/api/reports/daily", (req, res) => {

    try {

        const date =
            req.query.date || getToday();


        const stock = db
            .prepare(`
                SELECT

                    ds.date,

                    p.name,

                    ds.opening_quantity,

                    ds.additions,

                    ds.closing_quantity,

                    ds.units_sold,

                    ds.sales,

                    p.purchase_price,

                    (
                        ds.units_sold *
                        p.purchase_price
                    ) AS cost_of_goods,

                    (
                        ds.sales -
                        (
                            ds.units_sold *
                            p.purchase_price
                        )
                    ) AS gross_profit

                FROM daily_stock ds

                JOIN products p
                    ON p.id = ds.product_id

                WHERE ds.date = ?

                ORDER BY p.name ASC
            `)
            .all(date);


        const totals = stock.reduce(
            (result, item) => {

                result.sales +=
                    Number(item.sales);

                result.cost +=
                    Number(item.cost_of_goods);

                result.profit +=
                    Number(item.gross_profit);

                result.units +=
                    Number(item.units_sold);

                return result;

            },
            {
                sales: 0,
                cost: 0,
                profit: 0,
                units: 0
            }
        );


        res.json({
            success: true,
            date,
            stock,
            totals
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message:
                "Failed to generate daily report"
        });

    }

});


// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {

    console.log(
        `Stock System backend running on port ${PORT}`
    );

});