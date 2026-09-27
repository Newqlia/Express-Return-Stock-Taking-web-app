const express = require("express");
const cors = require("cors");
const db = require("./database");

const app = express();

const PORT = Number(process.env.PORT) || 3000;

const FRONTEND_ORIGIN =
    "https://stunning-space-bassoon-69v9r76w4q5525xq6-8000.app.github.dev";

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(
    cors({
        origin: function (origin, callback) {

            // Requests from curl/Postman/server-side tools
            if (!origin) {
                return callback(null, true);
            }

            // Exact Codespaces frontend
            if (origin === FRONTEND_ORIGIN) {
                return callback(null, true);
            }

            // Other GitHub Codespaces URLs
            if (
                origin.endsWith(".app.github.dev") ||
                origin.endsWith(".github.dev")
            ) {
                return callback(null, true);
            }

            // Local development
            if (
                origin.startsWith("http://localhost:") ||
                origin.startsWith("http://127.0.0.1:")
            ) {
                return callback(null, true);
            }

            return callback(
                new Error("Origin not allowed by CORS")
            );
        },

        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ],

        credentials: false,

        optionsSuccessStatus: 204
    })
);

/*
   IMPORTANT:
   This must exist BEFORE POST/PUT/PATCH routes.
*/
app.use(express.json());

/* =========================================================
   BASIC ROUTES
========================================================= */

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "Stock System Backend is running!"
    });

});

app.get("/api/test", (req, res) => {

    try {

        const products = db
            .prepare(`
                SELECT *
                FROM products
                ORDER BY id DESC
            `)
            .all();

        res.json({
            success: true,
            products
        });

    } catch (error) {

        console.error("TEST ERROR:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});

app.get("/api/cors-test", (req, res) => {

    res.json({
        success: true,
        message: "CORS is working.",
        origin: req.headers.origin || null
    });

});

/* =========================================================
   HELPERS
========================================================= */

function getBusinessId(req) {

    const value =
        req.query.business_id ??
        req.body?.business_id;

    const id = Number(value);

    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {
        return null;
    }

    return id;
}

function getDate(req) {

    const date =
        req.query.date ??
        req.body?.date;

    if (!date) {
        return null;
    }

    return String(date);
}

function businessExists(businessId) {

    if (!businessId) {
        return false;
    }

    const business = db
        .prepare(`
            SELECT id
            FROM businesses
            WHERE id = ?
            AND active = 1
        `)
        .get(businessId);

    return Boolean(business);
}

function productExists(
    productId,
    businessId
) {

    return db
        .prepare(`
            SELECT *
            FROM products
            WHERE id = ?
            AND business_id = ?
            AND active = 1
        `)
        .get(
            productId,
            businessId
        );
}

function validNumber(value) {

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}

function validNonNegativeNumber(value) {

    const number = validNumber(value);

    if (
        number === null ||
        number < 0
    ) {
        return null;
    }

    return number;
}

function generateReceiptNumber() {

    const row = db
        .prepare(`
            SELECT receipt_number
            FROM sales
            ORDER BY id DESC
            LIMIT 1
        `)
        .get();

    if (!row) {
        return "REC-000001";
    }

    const match =
        String(row.receipt_number)
            .match(/(\d+)$/);

    if (!match) {
        return `REC-${Date.now()}`;
    }

    const next =
        Number(match[1]) + 1;

    return `REC-${String(next).padStart(6, "0")}`;
}

/* =========================================================
   BUSINESSES
========================================================= */

app.get(
    "/api/businesses",
    (req, res) => {

        try {

            const businesses = db
                .prepare(`
                    SELECT
                        id,
                        business_name,
                        phone,
                        location,
                        business_type,
                        active,
                        created_at
                    FROM businesses
                    WHERE active = 1
                    ORDER BY business_name ASC
                `)
                .all();

            res.json({
                success: true,
                businesses
            });

        } catch (error) {

            console.error(
                "GET BUSINESSES:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

app.get(
    "/api/businesses/:id",
    (req, res) => {

        try {

            const business =
                db
                    .prepare(`
                        SELECT *
                        FROM businesses
                        WHERE id = ?
                    `)
                    .get(req.params.id);

            if (!business) {

                return res.status(404).json({
                    success: false,
                    message: "Business not found."
                });

            }

            res.json({
                success: true,
                business
            });

        } catch (error) {

            console.error(
                "GET BUSINESS:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

app.post(
    "/api/businesses",
    (req, res) => {

        try {

            const {
                business_name,
                phone = "",
                location = "",
                business_type = ""
            } = req.body;

            if (
                !business_name ||
                !String(business_name).trim()
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Business name is required."
                });

            }

            const result = db
                .prepare(`
                    INSERT INTO businesses
                    (
                        business_name,
                        phone,
                        location,
                        business_type,
                        active
                    )
                    VALUES (?, ?, ?, ?, 1)
                `)
                .run(
                    String(
                        business_name
                    ).trim(),

                    String(phone || "").trim(),

                    String(
                        location || ""
                    ).trim(),

                    String(
                        business_type || ""
                    ).trim()
                );

            const business = db
                .prepare(`
                    SELECT *
                    FROM businesses
                    WHERE id = ?
                `)
                .get(
                    result.lastInsertRowid
                );

            res.status(201).json({
                success: true,
                message:
                    "Business created successfully.",
                business
            });

        } catch (error) {

            console.error(
                "POST BUSINESS:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

app.put(
    "/api/businesses/:id",
    (req, res) => {

        try {

            const {
                business_name,
                phone = "",
                location = "",
                business_type = ""
            } = req.body;

            if (
                !business_name ||
                !String(business_name).trim()
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Business name is required."
                });

            }

            const result = db
                .prepare(`
                    UPDATE businesses
                    SET
                        business_name = ?,
                        phone = ?,
                        location = ?,
                        business_type = ?
                    WHERE id = ?
                `)
                .run(
                    String(
                        business_name
                    ).trim(),

                    String(phone || "").trim(),

                    String(
                        location || ""
                    ).trim(),

                    String(
                        business_type || ""
                    ).trim(),

                    req.params.id
                );

            if (!result.changes) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Business not found."
                });

            }

            res.json({
                success: true,
                message:
                    "Business updated successfully."
            });

        } catch (error) {

            console.error(
                "PUT BUSINESS:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

app.delete(
    "/api/businesses/:id",
    (req, res) => {

        try {

            const result = db
                .prepare(`
                    UPDATE businesses
                    SET active = 0
                    WHERE id = ?
                `)
                .run(req.params.id);

            if (!result.changes) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Business not found."
                });

            }

            res.json({
                success: true,
                message:
                    "Business deactivated successfully."
            });

        } catch (error) {

            console.error(
                "DELETE BUSINESS:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

/* =========================================================
   PRODUCTS
========================================================= */

app.get(
    "/api/products",
    (req, res) => {

        try {

            const businessId =
                getBusinessId(req);

            if (
                !businessExists(businessId)
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid business_id is required."
                });

            }

            const products = db
                .prepare(`
                    SELECT *
                    FROM products
                    WHERE business_id = ?
                    AND active = 1
                    ORDER BY name ASC
                `)
                .all(businessId);

            res.json({
                success: true,
                products
            });

        } catch (error) {

            console.error(
                "GET PRODUCTS:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

app.get(
    "/api/products/:id",
    (req, res) => {

        try {

            const businessId =
                getBusinessId(req);

            if (
                !businessExists(businessId)
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid business_id is required."
                });

            }

            const product = db
                .prepare(`
                    SELECT *
                    FROM products
                    WHERE id = ?
                    AND business_id = ?
                `)
                .get(
                    req.params.id,
                    businessId
                );

            if (!product) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Product not found."
                });

            }

            res.json({
                success: true,
                product
            });

        } catch (error) {

            console.error(
                "GET PRODUCT:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

app.post(
    "/api/products",
    (req, res) => {

        try {

            const {
                business_id,
                name,
                selling_price,
                purchase_price = 0
            } = req.body;

            const businessId =
                Number(business_id);

            const sellingPrice =
                validNonNegativeNumber(
                    selling_price
                );

            const purchasePrice =
                validNonNegativeNumber(
                    purchase_price
                );

            if (
                !businessExists(
                    businessId
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid business_id is required."
                });

            }

            if (
                !name ||
                !String(name).trim()
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Product name is required."
                });

            }

            if (
                sellingPrice === null
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Selling price is invalid."
                });

            }

            if (
                purchasePrice === null
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Purchase price is invalid."
                });

            }

            const result = db
                .prepare(`
                    INSERT INTO products
                    (
                        business_id,
                        name,
                        selling_price,
                        purchase_price,
                        active
                    )
                    VALUES (?, ?, ?, ?, 1)
                `)
                .run(
                    businessId,
                    String(name).trim(),
                    sellingPrice,
                    purchasePrice
                );

            const product = db
                .prepare(`
                    SELECT *
                    FROM products
                    WHERE id = ?
                `)
                .get(
                    result.lastInsertRowid
                );

            res.status(201).json({
                success: true,
                message:
                    "Product added successfully.",
                product
            });

        } catch (error) {

            console.error(
                "POST PRODUCT:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

app.put(
    "/api/products/:id",
    (req, res) => {

        try {

            const {
                business_id,
                name,
                selling_price,
                purchase_price
            } = req.body;

            const businessId =
                Number(business_id);

            const sellingPrice =
                validNonNegativeNumber(
                    selling_price
                );

            const purchasePrice =
                validNonNegativeNumber(
                    purchase_price
                );

            if (
                !businessExists(
                    businessId
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid business_id is required."
                });

            }

            if (
                !name ||
                !String(name).trim()
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Product name is required."
                });

            }

            if (
                sellingPrice === null ||
                purchasePrice === null
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Product prices are invalid."
                });

            }

            const result = db
                .prepare(`
                    UPDATE products
                    SET
                        name = ?,
                        selling_price = ?,
                        purchase_price = ?
                    WHERE id = ?
                    AND business_id = ?
                `)
                .run(
                    String(name).trim(),
                    sellingPrice,
                    purchasePrice,
                    req.params.id,
                    businessId
                );

            if (!result.changes) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Product not found."
                });

            }

            res.json({
                success: true,
                message:
                    "Product updated successfully."
            });

        } catch (error) {

            console.error(
                "PUT PRODUCT:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

app.delete(
    "/api/products/:id",
    (req, res) => {

        try {

            const businessId =
                getBusinessId(req);

            if (
                !businessExists(businessId)
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid business_id is required."
                });

            }

            const result = db
                .prepare(`
                    UPDATE products
                    SET active = 0
                    WHERE id = ?
                    AND business_id = ?
                `)
                .run(
                    req.params.id,
                    businessId
                );

            if (!result.changes) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Product not found."
                });

            }

            res.json({
                success: true,
                message:
                    "Product deleted successfully."
            });

        } catch (error) {

            console.error(
                "DELETE PRODUCT:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

/* =========================================================
   OPENING STOCK
========================================================= */

app.get(
    "/api/opening-stock",
    (req, res) => {

        try {

            const businessId =
                getBusinessId(req);

            const date =
                getDate(req);

            if (
                !businessExists(businessId)
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid business_id is required."
                });

            }

            if (!date) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Date is required."
                });

            }

            const rows = db
                .prepare(`
                    SELECT
                        ds.*,
                        p.name,
                        p.selling_price,
                        p.purchase_price
                    FROM daily_stock ds
                    JOIN products p
                        ON p.id = ds.product_id
                    WHERE ds.business_id = ?
                    AND ds.date = ?
                    ORDER BY p.name ASC
                `)
                .all(
                    businessId,
                    date
                );

            const previousDate = db
                .prepare("SELECT date(?, '-1 day') AS date")
                .get(date).date;

            const previousRows = db
                .prepare(`
                    SELECT
                        ds.product_id,
                        ds.closing_quantity,
                        p.name,
                        p.selling_price,
                        p.purchase_price
                    FROM daily_stock ds
                    JOIN products p
                        ON p.id = ds.product_id
                    WHERE ds.business_id = ?
                    AND ds.date = ?
                    ORDER BY p.name ASC
                `)
                .all(
                    businessId,
                    previousDate
                );

            const currentProductIds = new Set(
                rows.map(row => Number(row.product_id))
            );

            previousRows.forEach(row => {
                if (currentProductIds.has(Number(row.product_id))) {
                    return;
                }

                rows.push({
                    ...row,
                    date,
                    opening_quantity: row.closing_quantity,
                    additions: 0,
                    closing_quantity: row.closing_quantity,
                    units_sold: 0,
                    sales: 0
                });
            });

            res.json({
                success: true,
                date,
                stock: rows
            });

        } catch (error) {

            console.error(
                "GET OPENING STOCK:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

app.post(
    "/api/opening-stock",
    (req, res) => {

        try {

            const {
                business_id,
                date,
                product_id,
                quantity
            } = req.body;

            const businessId =
                Number(business_id);

            const productId =
                Number(product_id);

            const quantityValue =
                validNonNegativeNumber(
                    quantity
                );

            if (
                !businessExists(
                    businessId
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid business_id is required."
                });

            }

            if (!date) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Date is required."
                });

            }

            if (
                quantityValue === null
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Quantity is invalid."
                });

            }

            const product =
                productExists(
                    productId,
                    businessId
                );

            if (!product) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Product not found."
                });

            }

            const existing = db
                .prepare(`
                    SELECT id
                    FROM daily_stock
                    WHERE business_id = ?
                    AND date = ?
                    AND product_id = ?
                `)
                .get(
                    businessId,
                    date,
                    productId
                );

            if (existing) {

                db.prepare(`
                    UPDATE daily_stock
                    SET opening_quantity = ?
                    WHERE id = ?
                `)
                .run(
                    quantityValue,
                    existing.id
                );

            } else {

                db.prepare(`
                    INSERT INTO daily_stock
                    (
                        business_id,
                        date,
                        product_id,
                        opening_quantity,
                        additions,
                        closing_quantity,
                        units_sold,
                        sales
                    )
                    VALUES (?, ?, ?, ?, 0, 0, 0, 0)
                `)
                .run(
                    businessId,
                    date,
                    productId,
                    quantityValue
                );

            }

            res.json({
                success: true,
                message:
                    "Opening stock saved successfully."
            });

        } catch (error) {

            console.error(
                "POST OPENING STOCK:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

/* =========================================================
   DAILY STOCK
========================================================= */

app.get(
    "/api/daily-stock",
    (req, res) => {

        try {

            const businessId =
                getBusinessId(req);

            const date =
                getDate(req);

            if (
                !businessExists(businessId)
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid business_id is required."
                });

            }

            if (!date) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Date is required."
                });

            }

            const rows = db
                .prepare(`
                    SELECT
                        ds.id,
                        p.id AS product_id,
                        COALESCE(ds.opening_quantity, 0) AS opening_quantity,
                        COALESCE(ds.additions, 0) AS manual_additions,
                        COALESCE(ds.additions, 0) +
                            COALESCE(purchase_totals.quantity, 0) AS additions,
                        COALESCE(purchase_totals.quantity, 0) AS purchase_additions,
                        COALESCE(ds.closing_quantity, 0) AS closing_quantity,
                        COALESCE(ds.closing_counted, 0) AS closing_counted,
                        COALESCE(ds.units_sold, 0) AS units_sold,
                        COALESCE(ds.sales, 0) AS sales,
                        p.name,
                        p.selling_price,
                        p.purchase_price
                    FROM products p
                    LEFT JOIN daily_stock ds
                        ON ds.product_id = p.id
                        AND ds.business_id = p.business_id
                        AND ds.date = ?
                    LEFT JOIN (
                        SELECT
                            product_id,
                            SUM(quantity) AS quantity
                        FROM purchases
                        WHERE business_id = ?
                        AND date = ?
                        GROUP BY product_id
                    ) purchase_totals
                        ON purchase_totals.product_id = p.id
                    WHERE p.business_id = ?
                    AND p.active = 1
                    ORDER BY p.name ASC
                `)
                .all(
                    date,
                    businessId,
                    date,
                    businessId,
                );

            res.json({
                success: true,
                date,
                stock: rows
            });

        } catch (error) {

            console.error(
                "GET DAILY STOCK:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

app.post(
    "/api/daily-stock",
    (req, res) => {

        try {

            const {
                business_id,
                date,
                product_id,
                opening_quantity = 0,
                additions = 0,
                closing_quantity = 0
            } = req.body;

            const businessId =
                Number(business_id);

            const productId =
                Number(product_id);

            const opening =
                validNonNegativeNumber(
                    opening_quantity
                );

            const added =
                validNonNegativeNumber(
                    additions
                );

            const closing =
                validNonNegativeNumber(
                    closing_quantity
                );

            if (
                !businessExists(
                    businessId
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid business_id is required."
                });

            }

            if (!date) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Date is required."
                });

            }

            if (
                opening === null ||
                added === null ||
                closing === null
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Stock quantities are invalid."
                });

            }

            const product =
                productExists(
                    productId,
                    businessId
                );

            if (!product) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Product not found."
                });

            }

            const purchaseQuantity = Number(
                db.prepare(`
                    SELECT COALESCE(SUM(quantity), 0) AS quantity
                    FROM purchases
                    WHERE business_id = ?
                    AND date = ?
                    AND product_id = ?
                `)
                .get(
                    businessId,
                    date,
                    productId
                ).quantity || 0
            );

            if (added + 0.000001 < purchaseQuantity) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Additions cannot be less than the quantity automatically added from purchases."
                });

            }

            const manualAdditions = Math.max(
                0,
                added - purchaseQuantity
            );

            const unitsSold =
                opening +
                added -
                closing;

            if (unitsSold < 0) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Closing stock cannot be greater than opening stock plus additions."
                });

            }

            const sales =
                unitsSold *
                Number(product.selling_price);

            const existing = db
                .prepare(`
                    SELECT id
                    FROM daily_stock
                    WHERE business_id = ?
                    AND date = ?
                    AND product_id = ?
                `)
                .get(
                    businessId,
                    date,
                    productId
                );

            if (existing) {

                db.prepare(`
                    UPDATE daily_stock
                    SET
                        opening_quantity = ?,
                        additions = ?,
                        closing_quantity = ?,
                        closing_counted = 1,
                        units_sold = ?,
                        sales = ?
                    WHERE id = ?
                `)
                .run(
                    opening,
                    manualAdditions,
                    closing,
                    unitsSold,
                    sales,
                    existing.id
                );

            } else {

                db.prepare(`
                    INSERT INTO daily_stock
                    (
                        business_id,
                        date,
                        product_id,
                        opening_quantity,
                        additions,
                        closing_quantity,
                        closing_counted,
                        units_sold,
                        sales
                    )
                    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
                `)
                .run(
                    businessId,
                    date,
                    productId,
                    opening,
                    manualAdditions,
                    closing,
                    unitsSold,
                    sales
                );

            }

            res.json({
                success: true,
                message:
                    "Daily stock saved successfully.",
                units_sold: unitsSold,
                sales
            });

        } catch (error) {

            console.error(
                "POST DAILY STOCK:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

/* =========================================================
   SALES
========================================================= */

app.get(
    "/api/sales",
    (req, res) => {

        try {

            const businessId =
                getBusinessId(req);

            const date =
                req.query.date;

            if (
                !businessExists(businessId)
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid business_id is required."
                });

            }

            let sales;

            if (date) {

                sales = db
                    .prepare(`
                        SELECT *
                        FROM sales
                        WHERE business_id = ?
                        AND date = ?
                        ORDER BY id DESC
                    `)
                    .all(
                        businessId,
                        date
                    );

            } else {

                sales = db
                    .prepare(`
                        SELECT *
                        FROM sales
                        WHERE business_id = ?
                        ORDER BY id DESC
                    `)
                    .all(
                        businessId
                    );

            }

            res.json({
                success: true,
                sales
            });

        } catch (error) {

            console.error(
                "GET SALES:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

app.get(
    "/api/sales/:id",
    (req, res) => {

        try {

            const businessId =
                getBusinessId(req);

            if (
                !businessExists(businessId)
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid business_id is required."
                });

            }

            const sale = db
                .prepare(`
                    SELECT *
                    FROM sales
                    WHERE id = ?
                    AND business_id = ?
                `)
                .get(
                    req.params.id,
                    businessId
                );

            if (!sale) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Sale not found."
                });

            }

            const items = db
                .prepare(`
                    SELECT
                        si.*,
                        p.name
                    FROM sale_items si
                    JOIN products p
                        ON p.id = si.product_id
                    WHERE si.sale_id = ?
                    ORDER BY si.id ASC
                `)
                .all(sale.id);

            res.json({
                success: true,
                sale,
                items
            });

        } catch (error) {

            console.error(
                "GET SALE:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

app.post(
    "/api/sales",
    (req, res) => {

        try {

            const {
                business_id,
                date,
                payment_method = "CASH",
                items
            } = req.body;

            const businessId =
                Number(business_id);

            if (
                !businessExists(
                    businessId
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid business_id is required."
                });

            }

            if (!date) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Date is required."
                });

            }

            if (
                !Array.isArray(items) ||
                items.length === 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "At least one sale item is required."
                });

            }

            const transaction =
                db.transaction(() => {

                    let totalAmount = 0;

                    const validItems = [];

                    for (
                        const item of items
                    ) {

                        const productId =
                            Number(
                                item.product_id
                            );

                        const quantity =
                            Number(
                                item.quantity
                            );

                        if (
                            !Number.isFinite(
                                quantity
                            ) ||
                            quantity <= 0
                        ) {

                            throw new Error(
                                "Invalid sale quantity."
                            );

                        }

                        const product =
                            productExists(
                                productId,
                                businessId
                            );

                        if (!product) {

                            throw new Error(
                                "One of the selected products was not found."
                            );

                        }

                        const sellingPrice =
                            validNonNegativeNumber(
                                item.selling_price ??
                                product.selling_price
                            );

                        if (
                            sellingPrice === null
                        ) {

                            throw new Error(
                                "Invalid selling price."
                            );

                        }

                        const purchasePrice =
                            Number(
                                product.purchase_price || 0
                            );

                        const total =
                            quantity *
                            sellingPrice;

                        totalAmount += total;

                        validItems.push({
                            productId,
                            quantity,
                            sellingPrice,
                            purchasePrice,
                            total
                        });

                    }

                    const receiptNumber =
                        generateReceiptNumber();

                    const saleResult =
                        db.prepare(`
                            INSERT INTO sales
                            (
                                business_id,
                                receipt_number,
                                date,
                                payment_method,
                                total_amount
                            )
                            VALUES (?, ?, ?, ?, ?)
                        `)
                        .run(
                            businessId,
                            receiptNumber,
                            date,
                            String(
                                payment_method ||
                                "CASH"
                            ).toUpperCase(),
                            totalAmount
                        );

                    const saleId =
                        saleResult.lastInsertRowid;

                    const insertItem =
                        db.prepare(`
                            INSERT INTO sale_items
                            (
                                sale_id,
                                product_id,
                                quantity,
                                selling_price,
                                purchase_price,
                                total
                            )
                            VALUES (?, ?, ?, ?, ?, ?)
                        `);

                    for (
                        const item of validItems
                    ) {

                        insertItem.run(
                            saleId,
                            item.productId,
                            item.quantity,
                            item.sellingPrice,
                            item.purchasePrice,
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
                transaction();

            res.status(201).json({
                success: true,
                message:
                    "Sale completed successfully.",
                ...result
            });

        } catch (error) {

            console.error(
                "POST SALE:",
                error
            );

            res.status(400).json({
                success: false,
                message: error.message
            });

        }

    }
);

app.delete(
    "/api/sales/:id",
    (req, res) => {

        try {

            const businessId =
                Number(
                    req.query.business_id
                );

            if (
                !businessExists(
                    businessId
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid business_id is required."
                });

            }

            const transaction =
                db.transaction(() => {

                    const sale = db
                        .prepare(`
                            SELECT id
                            FROM sales
                            WHERE id = ?
                            AND business_id = ?
                        `)
                        .get(
                            req.params.id,
                            businessId
                        );

                    if (!sale) {
                        throw new Error(
                            "Sale not found."
                        );
                    }

                    db.prepare(`
                        DELETE FROM sale_items
                        WHERE sale_id = ?
                    `)
                    .run(sale.id);

                    db.prepare(`
                        DELETE FROM sales
                        WHERE id = ?
                        AND business_id = ?
                    `)
                    .run(
                        sale.id,
                        businessId
                    );

                });

            transaction();

            res.json({
                success: true,
                message:
                    "Sale deleted successfully."
            });

        } catch (error) {

            console.error(
                "DELETE SALE:",
                error
            );

            res.status(400).json({
                success: false,
                message: error.message
            });

        }

    }
);

/* =========================================================
   PURCHASES
========================================================= */

app.get(
    "/api/purchases",
    (req, res) => {

        try {

            const businessId =
                getBusinessId(req);

            const date =
                req.query.date;

            if (
                !businessExists(businessId)
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid business_id is required."
                });

            }

            let purchases;

            if (date) {

                purchases = db
                    .prepare(`
                        SELECT
                            pu.*,
                            p.name
                        FROM purchases pu
                        JOIN products p
                            ON p.id = pu.product_id
                        WHERE pu.business_id = ?
                        AND pu.date = ?
                        ORDER BY pu.id DESC
                    `)
                    .all(
                        businessId,
                        date
                    );

            } else {

                purchases = db
                    .prepare(`
                        SELECT
                            pu.*,
                            p.name
                        FROM purchases pu
                        JOIN products p
                            ON p.id = pu.product_id
                        WHERE pu.business_id = ?
                        ORDER BY pu.id DESC
                    `)
                    .all(
                        businessId
                    );

            }

            res.json({
                success: true,
                purchases
            });

        } catch (error) {

            console.error(
                "GET PURCHASES:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

app.post(
    "/api/purchases",
    (req, res) => {

        try {

            const {
                business_id,
                date,
                product_id,
                quantity = 0,
                amount = 0,
                supplier = ""
            } = req.body;

            const businessId =
                Number(business_id);

            const productId =
                Number(product_id);

            const quantityValue =
                validNonNegativeNumber(
                    quantity
                );

            const amountValue =
                validNonNegativeNumber(
                    amount
                );

            if (
                !businessExists(
                    businessId
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid business_id is required."
                });

            }

            if (!date) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Date is required."
                });

            }

            if (
                quantityValue === null ||
                amountValue === null
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Purchase quantity or amount is invalid."
                });

            }

            const product =
                productExists(
                    productId,
                    businessId
                );

            if (!product) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Product not found."
                });

            }

            const result = db
                .prepare(`
                    INSERT INTO purchases
                    (
                        business_id,
                        date,
                        product_id,
                        quantity,
                        amount,
                        supplier
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                `)
                .run(
                    businessId,
                    date,
                    productId,
                    quantityValue,
                    amountValue,
                    String(
                        supplier || ""
                    ).trim()
                );

            res.status(201).json({
                success: true,
                message:
                    "Purchase saved successfully.",
                id:
                    result.lastInsertRowid
            });

        } catch (error) {

            console.error(
                "POST PURCHASE:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

app.delete(
    "/api/purchases/:id",
    (req, res) => {

        try {

            const businessId =
                Number(
                    req.query.business_id
                );

            if (
                !businessExists(
                    businessId
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid business_id is required."
                });

            }

            const purchase = db
                .prepare(`
                    SELECT
                        id,
                        date,
                        product_id
                    FROM purchases
                    WHERE id = ?
                    AND business_id = ?
                `)
                .get(
                    req.params.id,
                    businessId
                );

            if (!purchase) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Purchase not found."
                });

            }

            const stock = db
                .prepare(`
                    SELECT
                        opening_quantity,
                        additions,
                        closing_quantity,
                        closing_counted
                    FROM daily_stock
                    WHERE business_id = ?
                    AND date = ?
                    AND product_id = ?
                `)
                .get(
                    businessId,
                    purchase.date,
                    purchase.product_id
                );

            if (stock?.closing_counted) {
                const remainingPurchases = Number(
                    db.prepare(`
                        SELECT COALESCE(SUM(quantity), 0) AS quantity
                        FROM purchases
                        WHERE business_id = ?
                        AND date = ?
                        AND product_id = ?
                        AND id != ?
                    `)
                    .get(
                        businessId,
                        purchase.date,
                        purchase.product_id,
                        purchase.id
                    ).quantity || 0
                );

                const available =
                    Number(stock.opening_quantity || 0) +
                    Number(stock.additions || 0) +
                    remainingPurchases;

                if (Number(stock.closing_quantity) > available + 0.000001) {
                    return res.status(409).json({
                        success: false,
                        message:
                            "This purchase cannot be deleted because the saved closing stock depends on it. Update the stock count first."
                    });
                }
            }

            db.prepare(`
                DELETE FROM purchases
                WHERE id = ?
                AND business_id = ?
            `)
            .run(
                purchase.id,
                businessId
            );

            res.json({
                success: true,
                message:
                    "Purchase deleted successfully."
            });

        } catch (error) {

            console.error(
                "DELETE PURCHASE:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

/* =========================================================
   EXPENSES
========================================================= */

app.get(
    "/api/expenses",
    (req, res) => {

        try {

            const businessId =
                getBusinessId(req);

            const date =
                req.query.date;

            if (
                !businessExists(businessId)
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid business_id is required."
                });

            }

            let expenses;

            if (date) {

                expenses = db
                    .prepare(`
                        SELECT *
                        FROM expenses
                        WHERE business_id = ?
                        AND date = ?
                        ORDER BY id DESC
                    `)
                    .all(
                        businessId,
                        date
                    );

            } else {

                expenses = db
                    .prepare(`
                        SELECT *
                        FROM expenses
                        WHERE business_id = ?
                        ORDER BY id DESC
                    `)
                    .all(
                        businessId
                    );

            }

            res.json({
                success: true,
                expenses
            });

        } catch (error) {

            console.error(
                "GET EXPENSES:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

app.post(
    "/api/expenses",
    (req, res) => {

        try {

            const {
                business_id,
                date,
                description,
                amount
            } = req.body;

            const businessId =
                Number(business_id);

            const amountValue =
                validNonNegativeNumber(
                    amount
                );

            if (
                !businessExists(
                    businessId
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid business_id is required."
                });

            }

            if (!date) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Date is required."
                });

            }

            if (
                !description ||
                !String(description).trim()
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Expense description is required."
                });

            }

            if (
                amountValue === null
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Expense amount is invalid."
                });

            }

            const result = db
                .prepare(`
                    INSERT INTO expenses
                    (
                        business_id,
                        date,
                        description,
                        amount
                    )
                    VALUES (?, ?, ?, ?)
                `)
                .run(
                    businessId,
                    date,
                    String(
                        description
                    ).trim(),
                    amountValue
                );

            res.status(201).json({
                success: true,
                message:
                    "Expense saved successfully.",
                id:
                    result.lastInsertRowid
            });

        } catch (error) {

            console.error(
                "POST EXPENSE:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

app.delete(
    "/api/expenses/:id",
    (req, res) => {

        try {

            const businessId =
                Number(
                    req.query.business_id
                );

            if (
                !businessExists(
                    businessId
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid business_id is required."
                });

            }

            const result = db
                .prepare(`
                    DELETE FROM expenses
                    WHERE id = ?
                    AND business_id = ?
                `)
                .run(
                    req.params.id,
                    businessId
                );

            if (!result.changes) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Expense not found."
                });

            }

            res.json({
                success: true,
                message:
                    "Expense deleted successfully."
            });

        } catch (error) {

            console.error(
                "DELETE EXPENSE:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

/* =========================================================
   RECONCILIATION
========================================================= */

function calculateReconciliation(
    businessId,
    date,
    cash,
    till
) {

    const salesRow = db
        .prepare(`
            SELECT
                COALESCE(
                    SUM(total_amount),
                    0
                ) AS total_sales
            FROM sales
            WHERE business_id = ?
            AND date = ?
        `)
        .get(
            businessId,
            date
        );

    const expensesRow = db
        .prepare(`
            SELECT
                COALESCE(
                    SUM(amount),
                    0
                ) AS total_expenses
            FROM expenses
            WHERE business_id = ?
            AND date = ?
        `)
        .get(
            businessId,
            date
        );

    const purchasesRow = db
        .prepare(`
            SELECT
                COALESCE(
                    SUM(amount),
                    0
                ) AS total_purchases
            FROM purchases
            WHERE business_id = ?
            AND date = ?
        `)
        .get(
            businessId,
            date
        );

    const totalSales =
        Number(
            salesRow.total_sales || 0
        );

    const totalExpenses =
        Number(
            expensesRow.total_expenses || 0
        );

    const totalPurchases =
        Number(
            purchasesRow.total_purchases || 0
        );

    const expectedMoney =
        totalSales -
        totalExpenses -
        totalPurchases;

    const actualMoney =
        Number(cash || 0) +
        Number(till || 0);

    const difference =
        actualMoney -
        expectedMoney;

    let status = "BALANCED";

    if (difference < 0) {
        status = "SHORTAGE";
    }

    if (difference > 0) {
        status = "SURPLUS";
    }

    return {
        totalSales,
        totalExpenses,
        totalPurchases,
        expectedMoney,
        actualMoney,
        difference,
        status
    };

}

app.get(
    "/api/reconciliation",
    (req, res) => {

        try {

            const businessId =
                getBusinessId(req);

            const date =
                getDate(req);

            if (
                !businessExists(
                    businessId
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid business_id is required."
                });

            }

            if (!date) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Date is required."
                });

            }

            const saved =
                db
                    .prepare(`
                        SELECT *
                        FROM reconciliations
                        WHERE business_id = ?
                        AND date = ?
                        ORDER BY id DESC
                        LIMIT 1
                    `)
                    .get(
                        businessId,
                        date
                    );

            const cash =
                saved
                    ? Number(
                        saved.cash_at_hand || 0
                    )
                    : 0;

            const till =
                saved
                    ? Number(
                        saved.till_amount || 0
                    )
                    : 0;

            const result =
                calculateReconciliation(
                    businessId,
                    date,
                    cash,
                    till
                );

            res.json({
                success: true,
                business_id: businessId,
                date,

                total_sales:
                    result.totalSales,

                total_expenses:
                    result.totalExpenses,

                total_purchases:
                    result.totalPurchases,

                expected_money:
                    result.expectedMoney,

                cash_at_hand:
                    cash,

                till_amount:
                    till,

                actual_money:
                    result.actualMoney,

                difference:
                    result.difference,

                status:
                    result.status
            });

        } catch (error) {

            console.error(
                "GET RECONCILIATION:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

app.post(
    "/api/reconciliation",
    (req, res) => {

        try {

            const {
                business_id,
                date,
                cash_at_hand = 0,
                till_amount = 0
            } = req.body;

            const businessId =
                Number(business_id);

            const cash =
                validNonNegativeNumber(
                    cash_at_hand
                );

            const till =
                validNonNegativeNumber(
                    till_amount
                );

            if (
                !businessExists(
                    businessId
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid business_id is required."
                });

            }

            if (!date) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Date is required."
                });

            }

            if (
                cash === null ||
                till === null
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Cash and till amounts are invalid."
                });

            }

            const result =
                calculateReconciliation(
                    businessId,
                    date,
                    cash,
                    till
                );

            const existing =
                db
                    .prepare(`
                        SELECT id
                        FROM reconciliations
                        WHERE business_id = ?
                        AND date = ?
                        ORDER BY id DESC
                        LIMIT 1
                    `)
                    .get(
                        businessId,
                        date
                    );

            if (existing) {

                db.prepare(`
                    UPDATE reconciliations
                    SET
                        total_sales = ?,
                        expenses = ?,
                        purchases = ?,
                        expected_money = ?,
                        cash_at_hand = ?,
                        till_amount = ?,
                        actual_money = ?,
                        difference = ?,
                        status = ?
                    WHERE id = ?
                `)
                .run(
                    result.totalSales,
                    result.totalExpenses,
                    result.totalPurchases,
                    result.expectedMoney,
                    cash,
                    till,
                    result.actualMoney,
                    result.difference,
                    result.status,
                    existing.id
                );

            } else {

                db.prepare(`
                    INSERT INTO reconciliations
                    (
                        business_id,
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
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `)
                .run(
                    businessId,
                    date,
                    result.totalSales,
                    result.totalExpenses,
                    result.totalPurchases,
                    result.expectedMoney,
                    cash,
                    till,
                    result.actualMoney,
                    result.difference,
                    result.status
                );

            }

            res.json({
                success: true,
                message:
                    "Reconciliation saved successfully.",

                total_sales:
                    result.totalSales,

                total_expenses:
                    result.totalExpenses,

                total_purchases:
                    result.totalPurchases,

                expected_money:
                    result.expectedMoney,

                cash_at_hand:
                    cash,

                till_amount:
                    till,

                actual_money:
                    result.actualMoney,

                difference:
                    result.difference,

                status:
                    result.status
            });

        } catch (error) {

            console.error(
                "POST RECONCILIATION:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

/* =========================================================
   DAILY REPORT
========================================================= */

app.get(
    "/api/reports/daily",
    (req, res) => {

        try {

            const businessId =
                getBusinessId(req);

            const date =
                getDate(req);

            if (
                !businessExists(
                    businessId
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid business_id is required."
                });

            }

            if (!date) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Date is required."
                });

            }

            const products =
                db
                    .prepare(`
                        SELECT
                            p.id,
                            p.name,
                            p.selling_price,
                            p.purchase_price,

                            CASE
                                WHEN ds.closing_counted = 1 THEN 1
                                ELSE 0
                            END AS stock_counted,

                            COALESCE(ds.additions, 0) +
                                COALESCE(purchase_totals.quantity, 0) AS additions,

                            COALESCE(
                                ds.opening_quantity,
                                0
                            ) AS opening_quantity,

                            COALESCE(
                                ds.closing_quantity,
                                0
                            ) AS closing_quantity,

                            CASE
                                WHEN ds.closing_counted = 1 THEN
                                    COALESCE(ds.opening_quantity, 0) +
                                    COALESCE(ds.additions, 0) +
                                    COALESCE(purchase_totals.quantity, 0) -
                                    COALESCE(ds.closing_quantity, 0)
                                ELSE 0
                            END AS units_sold,

                            CASE
                                WHEN ds.closing_counted = 1 THEN
                                    (
                                        COALESCE(ds.opening_quantity, 0) +
                                        COALESCE(ds.additions, 0) +
                                        COALESCE(purchase_totals.quantity, 0) -
                                        COALESCE(ds.closing_quantity, 0)
                                    ) * p.selling_price
                                ELSE 0
                            END AS sales

                        FROM products p

                        LEFT JOIN daily_stock ds
                            ON ds.product_id = p.id
                            AND ds.business_id = p.business_id
                            AND ds.date = ?

                        LEFT JOIN (
                            SELECT
                                product_id,
                                SUM(quantity) AS quantity
                            FROM purchases
                            WHERE business_id = ?
                            AND date = ?
                            GROUP BY product_id
                        ) purchase_totals
                            ON purchase_totals.product_id = p.id

                        WHERE p.business_id = ?
                        AND p.active = 1

                        ORDER BY p.name ASC
                    `)
                    .all(
                        date,
                        businessId,
                        date,
                        businessId
                    );

            const receiptRows =
                db
                    .prepare(`
                        SELECT
                            si.product_id,

                            COALESCE(
                                SUM(si.quantity),
                                0
                            ) AS recorded_units_sold,

                            COALESCE(
                                SUM(si.total),
                                0
                            ) AS receipt_sales,

                            COALESCE(
                                SUM(
                                    si.quantity *
                                    si.purchase_price
                                ),
                                0
                            ) AS cost_of_goods

                        FROM sale_items si

                        JOIN sales s
                            ON s.id = si.sale_id

                        WHERE s.business_id = ?
                        AND s.date = ?

                        GROUP BY si.product_id
                    `)
                    .all(
                        businessId,
                        date
                    );

            const receiptMap =
                new Map();

            for (
                const row of receiptRows
            ) {

                receiptMap.set(
                    row.product_id,
                    row
                );

            }

            let stockSales = 0;
            let receiptSales = 0;
            let stockUnits = 0;
            let receiptUnits = 0;
            let cost = 0;
            let profit = 0;
            let stockVariance = 0;

            const reportProducts =
                products.map(product => {

                    const receipt =
                        receiptMap.get(
                            product.id
                        ) || {
                            recorded_units_sold: 0,
                            receipt_sales: 0,
                            cost_of_goods: 0
                        };

                    const stockSold =
                        Number(
                            product.units_sold || 0
                        );

                    const recordedUnits =
                        Number(
                            receipt.recorded_units_sold || 0
                        );

                    const receiptAmount =
                        Number(
                            receipt.receipt_sales || 0
                        );

                    const productCost =
                        Number(
                            receipt.cost_of_goods || 0
                        );

                    const variance =
                        Number(product.stock_counted) === 1
                            ? stockSold - recordedUnits
                            : null;

                    const productProfit =
                        receiptAmount -
                        productCost;

                    stockSales +=
                        Number(
                            product.sales || 0
                        );

                    receiptSales +=
                        receiptAmount;

                    stockUnits +=
                        stockSold;

                    receiptUnits +=
                        recordedUnits;

                    cost +=
                        productCost;

                    profit +=
                        productProfit;

                    if (variance !== null) {
                        stockVariance += variance;
                    }

                    return {
                        ...product,

                        opening_quantity:
                            Number(
                                product.opening_quantity || 0
                            ),

                        additions:
                            Number(
                                product.additions || 0
                            ),

                        closing_quantity:
                            Number(
                                product.closing_quantity || 0
                            ),

                        stock_counted:
                            Number(product.stock_counted) === 1,

                        units_sold:
                            stockSold,

                        sales:
                            Number(
                                product.sales || 0
                            ),

                        recorded_units_sold:
                            recordedUnits,

                        receipt_sales:
                            receiptAmount,

                        stock_variance:
                            variance,

                        cost_of_goods:
                            productCost,

                        gross_profit:
                            productProfit
                    };

                });

            res.json({
                success: true,
                business_id: businessId,
                date,

                products:
                    reportProducts,

                totals: {
                    stockSales,
                    receiptSales,
                    units: stockUnits,
                    stockUnits,
                    receiptUnits,
                    cost,
                    profit,
                    stockVariance
                }
            });

        } catch (error) {

            console.error(
                "DAILY REPORT:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

/* =========================================================
   MONTHLY BUSINESS REPORT
========================================================= */

app.get(
    "/api/reports/monthly",
    (req, res) => {

        try {

            const businessId =
                getBusinessId(req);

            const month =
                String(req.query.month || "");

            if (
                !businessExists(businessId)
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid business_id is required."
                });

            }

            if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Month must use YYYY-MM format."
                });

            }

            const monthStart = `${month}-01`;
            const monthEnd = db
                .prepare("SELECT date(?, '+1 month') AS date")
                .get(monthStart).date;

            const rows = db
                .prepare(`
                    WITH activity_dates AS (
                        SELECT date FROM sales
                        WHERE business_id = @businessId
                        AND date >= @monthStart AND date < @monthEnd

                        UNION

                        SELECT date FROM daily_stock
                        WHERE business_id = @businessId
                        AND date >= @monthStart AND date < @monthEnd

                        UNION

                        SELECT date FROM purchases
                        WHERE business_id = @businessId
                        AND date >= @monthStart AND date < @monthEnd

                        UNION

                        SELECT date FROM expenses
                        WHERE business_id = @businessId
                        AND date >= @monthStart AND date < @monthEnd

                        UNION

                        SELECT date FROM reconciliations
                        WHERE business_id = @businessId
                        AND date >= @monthStart AND date < @monthEnd
                    ),
                    receipt_totals AS (
                        SELECT
                            date,
                            SUM(total_amount) AS receipt_sales,
                            COUNT(*) AS receipt_count
                        FROM sales
                        WHERE business_id = @businessId
                        AND date >= @monthStart AND date < @monthEnd
                        GROUP BY date
                    ),
                    receipt_items AS (
                        SELECT
                            s.date,
                            SUM(si.quantity) AS receipt_units,
                            SUM(
                                si.quantity * si.purchase_price
                            ) AS cost_of_goods
                        FROM sales s
                        JOIN sale_items si
                            ON si.sale_id = s.id
                        WHERE s.business_id = @businessId
                        AND s.date >= @monthStart AND s.date < @monthEnd
                        GROUP BY s.date
                    ),
                    stock_totals AS (
                        SELECT
                            ds.date,
                            SUM(
                                CASE WHEN ds.closing_counted = 1
                                    THEN COALESCE(ds.opening_quantity, 0) +
                                        COALESCE(ds.additions, 0) +
                                        COALESCE((
                                            SELECT SUM(pu.quantity)
                                            FROM purchases pu
                                            WHERE pu.business_id = ds.business_id
                                            AND pu.date = ds.date
                                            AND pu.product_id = ds.product_id
                                        ), 0) -
                                        COALESCE(ds.closing_quantity, 0)
                                    ELSE 0
                                END
                            ) AS physical_units,
                            SUM(
                                CASE WHEN ds.closing_counted = 1
                                    THEN 1
                                    ELSE 0
                                END
                            ) AS stock_records,
                            COUNT(DISTINCT CASE WHEN ds.closing_counted = 1
                                THEN ds.product_id
                            END) AS products_counted
                        FROM daily_stock ds
                        WHERE ds.business_id = @businessId
                        AND ds.date >= @monthStart AND ds.date < @monthEnd
                        GROUP BY ds.date
                    ),
                    purchase_totals AS (
                        SELECT
                            date,
                            SUM(amount) AS purchases,
                            SUM(quantity) AS purchase_units
                        FROM purchases
                        WHERE business_id = @businessId
                        AND date >= @monthStart AND date < @monthEnd
                        GROUP BY date
                    ),
                    expense_totals AS (
                        SELECT
                            date,
                            SUM(amount) AS expenses
                        FROM expenses
                        WHERE business_id = @businessId
                        AND date >= @monthStart AND date < @monthEnd
                        GROUP BY date
                    ),
                    latest_reconciliations AS (
                        SELECT r.*
                        FROM reconciliations r
                        JOIN (
                            SELECT date, MAX(id) AS id
                            FROM reconciliations
                            WHERE business_id = @businessId
                            AND date >= @monthStart AND date < @monthEnd
                            GROUP BY date
                        ) latest
                            ON latest.id = r.id
                    )
                    SELECT
                        activity_dates.date,
                        COALESCE(rt.receipt_sales, 0) AS receipt_sales,
                        COALESCE(rt.receipt_count, 0) AS receipt_count,
                        COALESCE(ri.receipt_units, 0) AS receipt_units,
                        COALESCE(ri.cost_of_goods, 0) AS cost_of_goods,
                        COALESCE(st.physical_units, 0) AS physical_units,
                        COALESCE(st.stock_records, 0) AS stock_records,
                        COALESCE(st.products_counted, 0) AS products_counted,
                        (
                            SELECT COUNT(*)
                            FROM products p
                            WHERE p.business_id = @businessId
                            AND p.active = 1
                            AND date(p.created_at) <= activity_dates.date
                        ) AS active_products,
                        COALESCE(pt.purchases, 0) AS purchases,
                        COALESCE(pt.purchase_units, 0) AS purchase_units,
                        COALESCE(et.expenses, 0) AS expenses,
                        CASE
                            WHEN lr.id IS NULL THEN 'NOT RECONCILED'
                            WHEN (
                                COALESCE(lr.cash_at_hand, 0) +
                                COALESCE(lr.till_amount, 0)
                            ) < (
                                COALESCE(rt.receipt_sales, 0) -
                                COALESCE(pt.purchases, 0) -
                                COALESCE(et.expenses, 0)
                            ) THEN 'SHORTAGE'
                            WHEN (
                                COALESCE(lr.cash_at_hand, 0) +
                                COALESCE(lr.till_amount, 0)
                            ) > (
                                COALESCE(rt.receipt_sales, 0) -
                                COALESCE(pt.purchases, 0) -
                                COALESCE(et.expenses, 0)
                            ) THEN 'SURPLUS'
                            ELSE 'BALANCED'
                        END AS reconciliation_status,
                        COALESCE(lr.cash_at_hand, 0) +
                            COALESCE(lr.till_amount, 0) AS actual_money,
                        COALESCE(rt.receipt_sales, 0) -
                            COALESCE(pt.purchases, 0) -
                            COALESCE(et.expenses, 0) AS expected_money,
                        (
                            COALESCE(lr.cash_at_hand, 0) +
                            COALESCE(lr.till_amount, 0)
                        ) - (
                            COALESCE(rt.receipt_sales, 0) -
                            COALESCE(pt.purchases, 0) -
                            COALESCE(et.expenses, 0)
                        ) AS reconciliation_difference
                    FROM activity_dates
                    LEFT JOIN receipt_totals rt
                        ON rt.date = activity_dates.date
                    LEFT JOIN receipt_items ri
                        ON ri.date = activity_dates.date
                    LEFT JOIN stock_totals st
                        ON st.date = activity_dates.date
                    LEFT JOIN purchase_totals pt
                        ON pt.date = activity_dates.date
                    LEFT JOIN expense_totals et
                        ON et.date = activity_dates.date
                    LEFT JOIN latest_reconciliations lr
                        ON lr.date = activity_dates.date
                    ORDER BY activity_dates.date ASC
                `)
                .all({
                    businessId,
                    monthStart,
                    monthEnd
                });

            const days = rows.map(row => {
                const productsCounted = Number(row.products_counted || 0);
                const activeProducts = Number(row.active_products || 0);
                const stockCounted =
                    activeProducts > 0 && productsCounted >= activeProducts;
                const physicalUnits = Number(row.physical_units || 0);
                const receiptUnits = Number(row.receipt_units || 0);

                return {
                    date: row.date,
                    receipt_sales: Number(row.receipt_sales || 0),
                    receipt_count: Number(row.receipt_count || 0),
                    receipt_units: receiptUnits,
                    cost_of_goods: Number(row.cost_of_goods || 0),
                    physical_units: physicalUnits,
                    stock_records: Number(row.stock_records || 0),
                    products_counted: productsCounted,
                    active_products: activeProducts,
                    stock_counted: stockCounted,
                    stock_variance: stockCounted
                        ? physicalUnits - receiptUnits
                        : null,
                    purchases: Number(row.purchases || 0),
                    purchase_units: Number(row.purchase_units || 0),
                    expenses: Number(row.expenses || 0),
                    reconciliation_status:
                        row.reconciliation_status || "NOT RECONCILED",
                    actual_money: Number(row.actual_money || 0),
                    expected_money: Number(row.expected_money || 0),
                    reconciliation_difference:
                        Number(row.reconciliation_difference || 0)
                };
            });

            const totals = days.reduce((result, day) => {
                result.receiptSales += day.receipt_sales;
                result.receiptCount += day.receipt_count;
                result.receiptUnits += day.receipt_units;
                result.costOfGoods += day.cost_of_goods;
                result.purchases += day.purchases;
                result.purchaseUnits += day.purchase_units;
                result.expenses += day.expenses;

                if (day.stock_counted) {
                    result.physicalUnits += day.physical_units;
                    result.stockCountDays += 1;
                    result.stockVariance += day.stock_variance;

                    if (Math.abs(day.stock_variance) > 0.000001) {
                        result.stockVarianceDays += 1;
                    }
                } else if (day.stock_records > 0) {
                    result.partialCountDays += 1;
                }

                if (day.reconciliation_status === "BALANCED") {
                    result.balancedDays += 1;
                } else if (day.reconciliation_status === "SHORTAGE") {
                    result.shortageDays += 1;
                } else if (day.reconciliation_status === "SURPLUS") {
                    result.surplusDays += 1;
                }

                if (day.reconciliation_status !== "NOT RECONCILED") {
                    result.reconciledDays += 1;
                    result.actualMoney += day.actual_money;
                    result.expectedMoney += day.expected_money;
                    result.reconciliationDifference +=
                        day.reconciliation_difference;
                }

                return result;
            }, {
                receiptSales: 0,
                receiptCount: 0,
                receiptUnits: 0,
                costOfGoods: 0,
                physicalUnits: 0,
                purchases: 0,
                purchaseUnits: 0,
                expenses: 0,
                stockCountDays: 0,
                partialCountDays: 0,
                stockVariance: 0,
                stockVarianceDays: 0,
                reconciledDays: 0,
                balancedDays: 0,
                shortageDays: 0,
                surplusDays: 0,
                actualMoney: 0,
                expectedMoney: 0,
                reconciliationDifference: 0
            });

            totals.grossProfit =
                totals.receiptSales - totals.costOfGoods;

            totals.netCashMovement =
                totals.receiptSales - totals.purchases - totals.expenses;

            totals.activityDays = days.length;

            totals.unreconciledDays =
                totals.activityDays - totals.reconciledDays;

            totals.uncountedDays =
                totals.activityDays - totals.stockCountDays;

            let businessStatus = "BALANCED";

            if (!days.length) {
                businessStatus = "NO ACTIVITY";
            } else if (
                totals.shortageDays > 0 ||
                totals.stockVarianceDays > 0
            ) {
                businessStatus = "NEEDS REVIEW";
            } else if (
                totals.unreconciledDays > 0 ||
                totals.uncountedDays > 0
            ) {
                businessStatus = "INCOMPLETE";
            } else if (totals.surplusDays > 0) {
                businessStatus = "SURPLUS";
            }

            res.json({
                success: true,
                business_id: businessId,
                month,
                business_status: businessStatus,
                totals,
                days
            });

        } catch (error) {

            console.error(
                "MONTHLY BUSINESS REPORT:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

/* =========================================================
   DASHBOARD
========================================================= */

app.get(
    "/api/dashboard",
    (req, res) => {

        try {

            const businessId =
                getBusinessId(req);

            const date =
                getDate(req);

            if (
                !businessExists(
                    businessId
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid business_id is required."
                });

            }

            if (!date) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Date is required."
                });

            }

            const productCount =
                db
                    .prepare(`
                        SELECT
                            COUNT(*) AS count
                        FROM products
                        WHERE business_id = ?
                        AND active = 1
                    `)
                    .get(
                        businessId
                    );

            const sales =
                db
                    .prepare(`
                        SELECT
                            COALESCE(
                                SUM(total_amount),
                                0
                            ) AS total
                        FROM sales
                        WHERE business_id = ?
                        AND date = ?
                    `)
                    .get(
                        businessId,
                        date
                    );

            const expenses =
                db
                    .prepare(`
                        SELECT
                            COALESCE(
                                SUM(amount),
                                0
                            ) AS total
                        FROM expenses
                        WHERE business_id = ?
                        AND date = ?
                    `)
                    .get(
                        businessId,
                        date
                    );

            const stockRows =
                db
                    .prepare(`
                        SELECT
                            ds.product_id,
                            ds.units_sold
                        FROM daily_stock ds
                        WHERE ds.business_id = ?
                        AND ds.date = ?
                    `)
                    .all(
                        businessId,
                        date
                    );

            const receiptRows =
                db
                    .prepare(`
                        SELECT
                            si.product_id,
                            COALESCE(
                                SUM(si.quantity),
                                0
                            ) AS quantity
                        FROM sale_items si
                        JOIN sales s
                            ON s.id = si.sale_id
                        WHERE s.business_id = ?
                        AND s.date = ?
                        GROUP BY si.product_id
                    `)
                    .all(
                        businessId,
                        date
                    );

            const receiptMap =
                new Map();

            for (
                const row of receiptRows
            ) {

                receiptMap.set(
                    row.product_id,
                    Number(
                        row.quantity || 0
                    )
                );

            }

            let difference = 0;

            for (
                const row of stockRows
            ) {

                const stockSold =
                    Number(
                        row.units_sold || 0
                    );

                const receiptSold =
                    Number(
                        receiptMap.get(
                            row.product_id
                        ) || 0
                    );

                difference +=
                    Math.abs(
                        stockSold -
                        receiptSold
                    );

            }

            res.json({
                success: true,
                business_id: businessId,
                date,

                products:
                    Number(
                        productCount.count || 0
                    ),

                sales:
                    Number(
                        sales.total || 0
                    ),

                expenses:
                    Number(
                        expenses.total || 0
                    ),

                difference
            });

        } catch (error) {

            console.error(
                "DASHBOARD:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }
);

/* =========================================================
   404
========================================================= */

/*
   IMPORTANT:
   DO NOT use app.get("*") here.

   Newer Express/path-to-regexp versions reject "*"
   and crash the entire server.

   This middleware catches unknown routes safely.
*/

app.use(
    (req, res) => {

        res.status(404).json({
            success: false,
            message:
                "API route not found.",
            path: req.originalUrl
        });

    }
);

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
    (error, req, res, next) => {

        console.error(
            "SERVER ERROR:",
            error
        );

        if (res.headersSent) {
            return next(error);
        }

        res.status(500).json({
            success: false,
            message:
                error.message ||
                "Internal server error."
        });

    }
);

/* =========================================================
   START SERVER
========================================================= */

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "========================================"
        );

        console.log(
            " STOCK SYSTEM BACKEND"
        );

        console.log(
            "========================================"
        );

        console.log(
            `Server running on port ${PORT}`
        );

        console.log(
            `Frontend: ${FRONTEND_ORIGIN}`
        );

        console.log(
            "Database connected."
        );

        console.log(
            "========================================"
        );

    }
);