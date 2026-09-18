const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

/* =====================================================
   CORS
===================================================== */

const FRONTEND_ORIGIN =
    "https://stunning-space-bassoon-69v9r76w4q5525xq6-8000.app.github.dev";

app.use(
    cors({
        origin: function (origin, callback) {

            // Allow requests without an Origin header
            // such as curl/Postman/server-to-server requests.
            if (!origin) {
                return callback(null, true);
            }

            // Exact frontend
            if (origin === FRONTEND_ORIGIN) {
                return callback(null, true);
            }

            // Allow GitHub Codespaces domains
            if (
                origin.endsWith(".app.github.dev") ||
                origin.endsWith(".github.dev")
            ) {
                console.log("Allowed Codespaces origin:", origin);
                return callback(null, true);
            }

            console.log("Blocked CORS origin:", origin);

            return callback(
                new Error("Origin not allowed by CORS")
            );
        },

        methods: [
            "GET",
            "POST",
            "PUT",
            "DELETE",
            "PATCH",
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
/* =====================================================
   BASIC ROUTES
===================================================== */

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Stock System Backend is running!"
    });
});

app.get("/api/cors-test", (req, res) => {
    res.json({
        success: true,
        message: "CORS is working.",
        origin: req.headers.origin || null
    });
});

app.get("/api/test", (req, res) => {
    try {
        const products = db
            .prepare(
                `
                SELECT *
                FROM products
                ORDER BY id DESC
                `
            )
            .all();

        res.json({
            success: true,
            products
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/* =====================================================
   HELPER FUNCTIONS
===================================================== */

function getBusinessId(req) {
    const id =
        req.query.business_id ||
        req.body.business_id;

    if (!id) {
        return null;
    }

    const businessId = Number(id);

    if (!Number.isInteger(businessId) || businessId <= 0) {
        return null;
    }

    return businessId;
}

function businessExists(businessId) {
    if (!businessId) {
        return false;
    }

    const business = db
        .prepare(
            `
            SELECT id
            FROM businesses
            WHERE id = ?
            AND active = 1
            `
        )
        .get(businessId);

    return !!business;
}

function productExists(productId, businessId) {
    const product = db
        .prepare(
            `
            SELECT *
            FROM products
            WHERE id = ?
            AND business_id = ?
            AND active = 1
            `
        )
        .get(productId, businessId);

    return product;
}

/* =====================================================
   BUSINESSES
===================================================== */

app.get("/api/businesses", (req, res) => {
    try {
        const businesses = db
            .prepare(
                `
                SELECT *
                FROM businesses
                WHERE active = 1
                ORDER BY business_name ASC
                `
            )
            .all();

        res.json({
            success: true,
            businesses
        });
    } catch (error) {
        console.error("GET businesses:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.get("/api/businesses/:id", (req, res) => {
    try {
        const business = db
            .prepare(
                `
                SELECT *
                FROM businesses
                WHERE id = ?
                `
            )
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
        console.error("GET business:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.post("/api/businesses", (req, res) => {
    try {
        const {
            business_name,
            phone = "",
            location = "",
            business_type = ""
        } = req.body;

        if (!business_name || !business_name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Business name is required."
            });
        }

        const result = db
            .prepare(
                `
                INSERT INTO businesses
                (
                    business_name,
                    phone,
                    location,
                    business_type,
                    active
                )
                VALUES (?, ?, ?, ?, 1)
                `
            )
            .run(
                business_name.trim(),
                phone,
                location,
                business_type
            );

        const business = db
            .prepare(
                `
                SELECT *
                FROM businesses
                WHERE id = ?
                `
            )
            .get(result.lastInsertRowid);

        res.status(201).json({
            success: true,
            message: "Business created successfully.",
            business
        });
    } catch (error) {
        console.error("POST business:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.put("/api/businesses/:id", (req, res) => {
    try {
        const {
            business_name,
            phone = "",
            location = "",
            business_type = ""
        } = req.body;

        if (!business_name || !business_name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Business name is required."
            });
        }

        const result = db
            .prepare(
                `
                UPDATE businesses
                SET
                    business_name = ?,
                    phone = ?,
                    location = ?,
                    business_type = ?
                WHERE id = ?
                `
            )
            .run(
                business_name.trim(),
                phone,
                location,
                business_type,
                req.params.id
            );

        if (!result.changes) {
            return res.status(404).json({
                success: false,
                message: "Business not found."
            });
        }

        res.json({
            success: true,
            message: "Business updated successfully."
        });
    } catch (error) {
        console.error("PUT business:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.delete("/api/businesses/:id", (req, res) => {
    try {
        const result = db
            .prepare(
                `
                UPDATE businesses
                SET active = 0
                WHERE id = ?
                `
            )
            .run(req.params.id);

        if (!result.changes) {
            return res.status(404).json({
                success: false,
                message: "Business not found."
            });
        }

        res.json({
            success: true,
            message: "Business deactivated successfully."
        });
    } catch (error) {
        console.error("DELETE business:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/* =====================================================
   PRODUCTS
===================================================== */

app.get("/api/products", (req, res) => {
    try {
        const businessId = getBusinessId(req);

        if (!businessExists(businessId)) {
            return res.status(400).json({
                success: false,
                message: "Valid business_id is required."
            });
        }

        const products = db
            .prepare(
                `
                SELECT *
                FROM products
                WHERE business_id = ?
                AND active = 1
                ORDER BY name ASC
                `
            )
            .all(businessId);

        res.json({
            success: true,
            products
        });
    } catch (error) {
        console.error("GET products:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.get("/api/products/:id", (req, res) => {
    try {
        const businessId = getBusinessId(req);

        if (!businessExists(businessId)) {
            return res.status(400).json({
                success: false,
                message: "Valid business_id is required."
            });
        }

        const product = db
            .prepare(
                `
                SELECT *
                FROM products
                WHERE id = ?
                AND business_id = ?
                `
            )
            .get(req.params.id, businessId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        res.json({
            success: true,
            product
        });
    } catch (error) {
        console.error("GET product:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.post("/api/products", (req, res) => {
    try {
        const {
            business_id,
            name,
            selling_price,
            purchase_price = 0
        } = req.body;

        const businessId = Number(business_id);

        if (!businessExists(businessId)) {
            return res.status(400).json({
                success: false,
                message: "Valid business_id is required."
            });
        }

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Product name is required."
            });
        }

        const sellingPrice = Number(selling_price);
        const purchasePrice = Number(purchase_price);

        if (
            !Number.isFinite(sellingPrice) ||
            sellingPrice < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Selling price is invalid."
            });
        }

        if (
            !Number.isFinite(purchasePrice) ||
            purchasePrice < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Purchase price is invalid."
            });
        }

        const result = db
            .prepare(
                `
                INSERT INTO products
                (
                    business_id,
                    name,
                    selling_price,
                    purchase_price,
                    active
                )
                VALUES (?, ?, ?, ?, 1)
                `
            )
            .run(
                businessId,
                name.trim(),
                sellingPrice,
                purchasePrice
            );

        const product = db
            .prepare(
                `
                SELECT *
                FROM products
                WHERE id = ?
                `
            )
            .get(result.lastInsertRowid);

        res.status(201).json({
            success: true,
            message: "Product added successfully.",
            product
        });
    } catch (error) {
        console.error("POST product:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.put("/api/products/:id", (req, res) => {
    try {
        const {
            business_id,
            name,
            selling_price,
            purchase_price
        } = req.body;

        const businessId = Number(business_id);

        if (!businessExists(businessId)) {
            return res.status(400).json({
                success: false,
                message: "Valid business_id is required."
            });
        }

        const result = db
            .prepare(
                `
                UPDATE products
                SET
                    name = ?,
                    selling_price = ?,
                    purchase_price = ?
                WHERE id = ?
                AND business_id = ?
                `
            )
            .run(
                name.trim(),
                Number(selling_price),
                Number(purchase_price),
                req.params.id,
                businessId
            );

        if (!result.changes) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        res.json({
            success: true,
            message: "Product updated successfully."
        });
    } catch (error) {
        console.error("PUT product:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.delete("/api/products/:id", (req, res) => {
    try {
        const businessId = getBusinessId(req);

        if (!businessExists(businessId)) {
            return res.status(400).json({
                success: false,
                message: "Valid business_id is required."
            });
        }

        const result = db
            .prepare(
                `
                UPDATE products
                SET active = 0
                WHERE id = ?
                AND business_id = ?
                `
            )
            .run(
                req.params.id,
                businessId
            );

        if (!result.changes) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        res.json({
            success: true,
            message: "Product deleted successfully."
        });
    } catch (error) {
        console.error("DELETE product:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/* =====================================================
   OPENING STOCK
===================================================== */

app.get("/api/opening-stock", (req, res) => {
    try {
        const businessId = getBusinessId(req);
        const date = req.query.date;

        if (!businessExists(businessId)) {
            return res.status(400).json({
                success: false,
                message: "Valid business_id is required."
            });
        }

        if (!date) {
            return res.status(400).json({
                success: false,
                message: "Date is required."
            });
        }

        const rows = db
            .prepare(
                `
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
                `
            )
            .all(
                businessId,
                date
            );

        res.json({
            success: true,
            date,
            stock: rows
        });
    } catch (error) {
        console.error("GET opening stock:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.post("/api/opening-stock", (req, res) => {
    try {
        const {
            business_id,
            date,
            product_id,
            quantity
        } = req.body;

        const businessId = Number(business_id);
        const productId = Number(product_id);
        const quantityValue = Number(quantity);

        if (!businessExists(businessId)) {
            return res.status(400).json({
                success: false,
                message: "Valid business_id is required."
            });
        }

        if (!date) {
            return res.status(400).json({
                success: false,
                message: "Date is required."
            });
        }

        const product = productExists(
            productId,
            businessId
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        if (
            !Number.isFinite(quantityValue) ||
            quantityValue < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Quantity is invalid."
            });
        }

        const existing = db
            .prepare(
                `
                SELECT id
                FROM daily_stock
                WHERE business_id = ?
                AND date = ?
                AND product_id = ?
                `
            )
            .get(
                businessId,
                date,
                productId
            );

        if (existing) {
            db.prepare(
                `
                UPDATE daily_stock
                SET opening_quantity = ?
                WHERE id = ?
                `
            ).run(
                quantityValue,
                existing.id
            );
        } else {
            db.prepare(
                `
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
                `
            ).run(
                businessId,
                date,
                productId,
                quantityValue
            );
        }

        res.json({
            success: true,
            message: "Opening stock saved successfully."
        });
    } catch (error) {
        console.error("POST opening stock:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/* =====================================================
   DAILY STOCK
===================================================== */

app.get("/api/daily-stock", (req, res) => {
    try {
        const businessId = getBusinessId(req);
        const date = req.query.date;

        if (!businessExists(businessId)) {
            return res.status(400).json({
                success: false,
                message: "Valid business_id is required."
            });
        }

        if (!date) {
            return res.status(400).json({
                success: false,
                message: "Date is required."
            });
        }

        const rows = db
            .prepare(
                `
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
                `
            )
            .all(
                businessId,
                date
            );

        res.json({
            success: true,
            date,
            stock: rows
        });
    } catch (error) {
        console.error("GET daily stock:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.post("/api/daily-stock", (req, res) => {
    try {
        const {
            business_id,
            date,
            product_id,
            opening_quantity = 0,
            additions = 0,
            closing_quantity = 0
        } = req.body;

        const businessId = Number(business_id);
        const productId = Number(product_id);

        const opening = Number(opening_quantity);
        const additionsValue = Number(additions);
        const closing = Number(closing_quantity);

        if (!businessExists(businessId)) {
            return res.status(400).json({
                success: false,
                message: "Valid business_id is required."
            });
        }

        if (!date) {
            return res.status(400).json({
                success: false,
                message: "Date is required."
            });
        }

        const product = productExists(
            productId,
            businessId
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        if (
            !Number.isFinite(opening) ||
            !Number.isFinite(additionsValue) ||
            !Number.isFinite(closing) ||
            opening < 0 ||
            additionsValue < 0 ||
            closing < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Stock quantities are invalid."
            });
        }

        const unitsSold =
            opening +
            additionsValue -
            closing;

        const sales =
            unitsSold *
            Number(product.selling_price);

        const existing = db
            .prepare(
                `
                SELECT id
                FROM daily_stock
                WHERE business_id = ?
                AND date = ?
                AND product_id = ?
                `
            )
            .get(
                businessId,
                date,
                productId
            );

        if (existing) {
            db.prepare(
                `
                UPDATE daily_stock
                SET
                    opening_quantity = ?,
                    additions = ?,
                    closing_quantity = ?,
                    units_sold = ?,
                    sales = ?
                WHERE id = ?
                `
            ).run(
                opening,
                additionsValue,
                closing,
                unitsSold,
                sales,
                existing.id
            );
        } else {
            db.prepare(
                `
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
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `
            ).run(
                businessId,
                date,
                productId,
                opening,
                additionsValue,
                closing,
                unitsSold,
                sales
            );
        }

        res.json({
            success: true,
            message: "Daily stock saved successfully.",
            units_sold: unitsSold,
            sales
        });
    } catch (error) {
        console.error("POST daily stock:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/* =====================================================
   SALES
===================================================== */

app.get("/api/sales", (req, res) => {
    try {
        const businessId = getBusinessId(req);
        const date = req.query.date;

        if (!businessExists(businessId)) {
            return res.status(400).json({
                success: false,
                message: "Valid business_id is required."
            });
        }

        let sales;

        if (date) {
            sales = db
                .prepare(
                    `
                    SELECT *
                    FROM sales
                    WHERE business_id = ?
                    AND date = ?
                    ORDER BY id DESC
                    `
                )
                .all(
                    businessId,
                    date
                );
        } else {
            sales = db
                .prepare(
                    `
                    SELECT *
                    FROM sales
                    WHERE business_id = ?
                    ORDER BY id DESC
                    `
                )
                .all(businessId);
        }

        res.json({
            success: true,
            sales
        });
    } catch (error) {
        console.error("GET sales:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.get("/api/sales/:id", (req, res) => {
    try {
        const businessId = getBusinessId(req);

        if (!businessExists(businessId)) {
            return res.status(400).json({
                success: false,
                message: "Valid business_id is required."
            });
        }

        const sale = db
            .prepare(
                `
                SELECT *
                FROM sales
                WHERE id = ?
                AND business_id = ?
                `
            )
            .get(
                req.params.id,
                businessId
            );

        if (!sale) {
            return res.status(404).json({
                success: false,
                message: "Sale not found."
            });
        }

        const items = db
            .prepare(
                `
                SELECT
                    si.*,
                    p.name
                FROM sale_items si
                JOIN products p
                    ON p.id = si.product_id
                WHERE si.sale_id = ?
                ORDER BY si.id ASC
                `
            )
            .all(sale.id);

        res.json({
            success: true,
            sale,
            items
        });
    } catch (error) {
        console.error("GET sale:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.post("/api/sales", (req, res) => {
    const transaction = db.transaction(() => {
        const {
            business_id,
            date,
            payment_method = "CASH",
            items
        } = req.body;

        const businessId = Number(business_id);

        if (!businessExists(businessId)) {
            throw new Error(
                "Valid business_id is required."
            );
        }

        if (!date) {
            throw new Error("Date is required.");
        }

        if (
            !Array.isArray(items) ||
            items.length === 0
        ) {
            throw new Error(
                "At least one sale item is required."
            );
        }

        const receiptNumber =
            "REC-" +
            String(
                Date.now()
            ).padStart(8, "0");

        let totalAmount = 0;

        const validItems = [];

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
                Number(
                    item.selling_price ??
                    product.selling_price
                );

            const purchasePrice =
                Number(
                    product.purchase_price
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

        const saleResult =
            db.prepare(
                `
                INSERT INTO sales
                (
                    business_id,
                    receipt_number,
                    date,
                    payment_method,
                    total_amount
                )
                VALUES (?, ?, ?, ?, ?)
                `
            ).run(
                businessId,
                receiptNumber,
                date,
                payment_method,
                totalAmount
            );

        const saleId =
            saleResult.lastInsertRowid;

        const insertItem =
            db.prepare(
                `
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
                `
            );

        for (const item of validItems) {
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

    try {
        const result = transaction();

        res.status(201).json({
            success: true,
            message: "Sale completed successfully.",
            ...result
        });
    } catch (error) {
        console.error("POST sale:", error);

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

app.delete("/api/sales/:id", (req, res) => {
    const transaction = db.transaction(() => {
        const businessId =
            Number(req.query.business_id);

        const sale = db
            .prepare(
                `
                SELECT id
                FROM sales
                WHERE id = ?
                AND business_id = ?
                `
            )
            .get(
                req.params.id,
                businessId
            );

        if (!sale) {
            throw new Error(
                "Sale not found."
            );
        }

        db.prepare(
            `
            DELETE FROM sale_items
            WHERE sale_id = ?
            `
        ).run(sale.id);

        db.prepare(
            `
            DELETE FROM sales
            WHERE id = ?
            AND business_id = ?
            `
        ).run(
            sale.id,
            businessId
        );
    });

    try {
        transaction();

        res.json({
            success: true,
            message: "Sale deleted successfully."
        });
    } catch (error) {
        console.error("DELETE sale:", error);

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/* =====================================================
   PURCHASES
===================================================== */

app.get("/api/purchases", (req, res) => {
    try {
        const businessId = getBusinessId(req);
        const date = req.query.date;

        if (!businessExists(businessId)) {
            return res.status(400).json({
                success: false,
                message: "Valid business_id is required."
            });
        }

        let purchases;

        if (date) {
            purchases = db
                .prepare(
                    `
                    SELECT
                        pu.*,
                        p.name
                    FROM purchases pu
                    JOIN products p
                        ON p.id = pu.product_id
                    WHERE pu.business_id = ?
                    AND pu.date = ?
                    ORDER BY pu.id DESC
                    `
                )
                .all(
                    businessId,
                    date
                );
        } else {
            purchases = db
                .prepare(
                    `
                    SELECT
                        pu.*,
                        p.name
                    FROM purchases pu
                    JOIN products p
                        ON p.id = pu.product_id
                    WHERE pu.business_id = ?
                    ORDER BY pu.id DESC
                    `
                )
                .all(businessId);
        }

        res.json({
            success: true,
            purchases
        });
    } catch (error) {
        console.error("GET purchases:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.post("/api/purchases", (req, res) => {
    try {
        const {
            business_id,
            date,
            product_id,
            quantity = 0,
            amount = 0,
            supplier = ""
        } = req.body;

        const businessId = Number(business_id);
        const productId = Number(product_id);
        const quantityValue = Number(quantity);
        const amountValue = Number(amount);

        if (!businessExists(businessId)) {
            return res.status(400).json({
                success: false,
                message: "Valid business_id is required."
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
                message: "Product not found."
            });
        }

        if (!date) {
            return res.status(400).json({
                success: false,
                message: "Date is required."
            });
        }

        const result = db
            .prepare(
                `
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
                `
            )
            .run(
                businessId,
                date,
                productId,
                quantityValue,
                amountValue,
                supplier
            );

        res.status(201).json({
            success: true,
            message: "Purchase saved successfully.",
            id: result.lastInsertRowid
        });
    } catch (error) {
        console.error("POST purchase:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.delete("/api/purchases/:id", (req, res) => {
    try {
        const businessId =
            Number(req.query.business_id);

        const result = db
            .prepare(
                `
                DELETE FROM purchases
                WHERE id = ?
                AND business_id = ?
                `
            )
            .run(
                req.params.id,
                businessId
            );

        if (!result.changes) {
            return res.status(404).json({
                success: false,
                message: "Purchase not found."
            });
        }

        res.json({
            success: true,
            message: "Purchase deleted successfully."
        });
    } catch (error) {
        console.error("DELETE purchase:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/* =====================================================
   EXPENSES
===================================================== */

app.get("/api/expenses", (req, res) => {
    try {
        const businessId = getBusinessId(req);
        const date = req.query.date;

        if (!businessExists(businessId)) {
            return res.status(400).json({
                success: false,
                message: "Valid business_id is required."
            });
        }

        let expenses;

        if (date) {
            expenses = db
                .prepare(
                    `
                    SELECT *
                    FROM expenses
                    WHERE business_id = ?
                    AND date = ?
                    ORDER BY id DESC
                    `
                )
                .all(
                    businessId,
                    date
                );
        } else {
            expenses = db
                .prepare(
                    `
                    SELECT *
                    FROM expenses
                    WHERE business_id = ?
                    ORDER BY id DESC
                    `
                )
                .all(businessId);
        }

        res.json({
            success: true,
            expenses
        });
    } catch (error) {
        console.error("GET expenses:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.post("/api/expenses", (req, res) => {
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
            Number(amount);

        if (!businessExists(businessId)) {
            return res.status(400).json({
                success: false,
                message: "Valid business_id is required."
            });
        }

        if (!date) {
            return res.status(400).json({
                success: false,
                message: "Date is required."
            });
        }

        if (
            !description ||
            !description.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Expense description is required."
            });
        }

        if (
            !Number.isFinite(amountValue) ||
            amountValue < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Expense amount is invalid."
            });
        }

        const result = db
            .prepare(
                `
                INSERT INTO expenses
                (
                    business_id,
                    date,
                    description,
                    amount
                )
                VALUES (?, ?, ?, ?)
                `
            )
            .run(
                businessId,
                date,
                description.trim(),
                amountValue
            );

        res.status(201).json({
            success: true,
            message: "Expense saved successfully.",
            id: result.lastInsertRowid
        });
    } catch (error) {
        console.error("POST expense:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.delete("/api/expenses/:id", (req, res) => {
    try {
        const businessId =
            Number(req.query.business_id);

        const result = db
            .prepare(
                `
                DELETE FROM expenses
                WHERE id = ?
                AND business_id = ?
                `
            )
            .run(
                req.params.id,
                businessId
            );

        if (!result.changes) {
            return res.status(404).json({
                success: false,
                message: "Expense not found."
            });
        }

        res.json({
            success: true,
            message: "Expense deleted successfully."
        });
    } catch (error) {
        console.error("DELETE expense:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/* =====================================================
   RECONCILIATION
===================================================== */

app.get("/api/reconciliation", (req, res) => {
    try {
        const businessId = getBusinessId(req);
        const date = req.query.date;

        if (!businessExists(businessId)) {
            return res.status(400).json({
                success: false,
                message: "Valid business_id is required."
            });
        }

        if (!date) {
            return res.status(400).json({
                success: false,
                message: "Date is required."
            });
        }

        const salesRow = db
            .prepare(
                `
                SELECT
                    COALESCE(
                        SUM(total_amount),
                        0
                    ) AS total_sales
                FROM sales
                WHERE business_id = ?
                AND date = ?
                `
            )
            .get(
                businessId,
                date
            );

        const expenseRow = db
            .prepare(
                `
                SELECT
                    COALESCE(
                        SUM(amount),
                        0
                    ) AS total_expenses
                FROM expenses
                WHERE business_id = ?
                AND date = ?
                `
            )
            .get(
                businessId,
                date
            );

        const purchaseRow = db
            .prepare(
                `
                SELECT
                    COALESCE(
                        SUM(amount),
                        0
                    ) AS total_purchases
                FROM purchases
                WHERE business_id = ?
                AND date = ?
                `
            )
            .get(
                businessId,
                date
            );

        const reconciliation = db
            .prepare(
                `
                SELECT *
                FROM reconciliations
                WHERE business_id = ?
                AND date = ?
                ORDER BY id DESC
                LIMIT 1
                `
            )
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
                expenseRow.total_expenses || 0
            );

        const totalPurchases =
            Number(
                purchaseRow.total_purchases || 0
            );

        const expectedMoney =
            totalSales -
            totalExpenses -
            totalPurchases;

        const cashAtHand =
            reconciliation
                ? Number(
                    reconciliation.cash_at_hand || 0
                )
                : 0;

        const tillAmount =
            reconciliation
                ? Number(
                    reconciliation.till_amount || 0
                )
                : 0;

        const actualMoney =
            cashAtHand +
            tillAmount;

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

        res.json({
            success: true,
            business_id: businessId,
            date,
            total_sales: totalSales,
            total_expenses: totalExpenses,
            total_purchases: totalPurchases,
            expected_money: expectedMoney,
            cash_at_hand: cashAtHand,
            till_amount: tillAmount,
            actual_money: actualMoney,
            difference,
            status
        });
    } catch (error) {
        console.error("GET reconciliation:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.post("/api/reconciliation", (req, res) => {
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
            Number(cash_at_hand);

        const till =
            Number(till_amount);

        if (!businessExists(businessId)) {
            return res.status(400).json({
                success: false,
                message: "Valid business_id is required."
            });
        }

        if (!date) {
            return res.status(400).json({
                success: false,
                message: "Date is required."
            });
        }

        const salesRow = db
            .prepare(
                `
                SELECT
                    COALESCE(
                        SUM(total_amount),
                        0
                    ) AS total_sales
                FROM sales
                WHERE business_id = ?
                AND date = ?
                `
            )
            .get(
                businessId,
                date
            );

        const expenseRow = db
            .prepare(
                `
                SELECT
                    COALESCE(
                        SUM(amount),
                        0
                    ) AS total_expenses
                FROM expenses
                WHERE business_id = ?
                AND date = ?
                `
            )
            .get(
                businessId,
                date
            );

        const purchaseRow = db
            .prepare(
                `
                SELECT
                    COALESCE(
                        SUM(amount),
                        0
                    ) AS total_purchases
                FROM purchases
                WHERE business_id = ?
                AND date = ?
                `
            )
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
                expenseRow.total_expenses || 0
            );

        const totalPurchases =
            Number(
                purchaseRow.total_purchases || 0
            );

        const expectedMoney =
            totalSales -
            totalExpenses -
            totalPurchases;

        const actualMoney =
            cash +
            till;

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

        const existing = db
            .prepare(
                `
                SELECT id
                FROM reconciliations
                WHERE business_id = ?
                AND date = ?
                ORDER BY id DESC
                LIMIT 1
                `
            )
            .get(
                businessId,
                date
            );

        if (existing) {
            db.prepare(
                `
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
                `
            ).run(
                totalSales,
                totalExpenses,
                totalPurchases,
                expectedMoney,
                cash,
                till,
                actualMoney,
                difference,
                status,
                existing.id
            );
        } else {
            db.prepare(
                `
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
                `
            ).run(
                businessId,
                date,
                totalSales,
                totalExpenses,
                totalPurchases,
                expectedMoney,
                cash,
                till,
                actualMoney,
                difference,
                status
            );
        }

        res.json({
            success: true,
            message: "Reconciliation saved successfully.",
            total_sales: totalSales,
            total_expenses: totalExpenses,
            total_purchases: totalPurchases,
            expected_money: expectedMoney,
            cash_at_hand: cash,
            till_amount: till,
            actual_money: actualMoney,
            difference,
            status
        });
    } catch (error) {
        console.error("POST reconciliation:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/* =====================================================
   DAILY REPORT
===================================================== */

app.get("/api/reports/daily", (req, res) => {
    try {
        const businessId = getBusinessId(req);
        const date = req.query.date;

        if (!businessExists(businessId)) {
            return res.status(400).json({
                success: false,
                message: "Valid business_id is required."
            });
        }

        if (!date) {
            return res.status(400).json({
                success: false,
                message: "Date is required."
            });
        }

        const products = db
            .prepare(
                `
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
                    ) AS sales

                FROM products p

                LEFT JOIN daily_stock ds
                    ON ds.product_id = p.id
                    AND ds.business_id = p.business_id
                    AND ds.date = ?

                WHERE p.business_id = ?
                AND p.active = 1

                ORDER BY p.name ASC
                `
            )
            .all(
                date,
                businessId
            );

        const receiptRows = db
            .prepare(
                `
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
                `
            )
            .all(
                businessId,
                date
            );

        const receiptMap = new Map();

        for (const row of receiptRows) {
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

        const resultProducts =
            products.map(product => {
                const receipt =
                    receiptMap.get(
                        product.id
                    ) || {
                        recorded_units_sold: 0,
                        receipt_sales: 0,
                        cost_of_goods: 0
                    };

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

                const stockSold =
                    Number(
                        product.units_sold || 0
                    );

                const variance =
                    stockSold -
                    recordedUnits;

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

                stockVariance +=
                    variance;

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
            products: resultProducts,
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
        console.error("DAILY REPORT:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/* =====================================================
   DASHBOARD
===================================================== */

app.get("/api/dashboard", (req, res) => {
    try {
        const businessId = getBusinessId(req);
        const date = req.query.date;

        if (!businessExists(businessId)) {
            return res.status(400).json({
                success: false,
                message: "Valid business_id is required."
            });
        }

        if (!date) {
            return res.status(400).json({
                success: false,
                message: "Date is required."
            });
        }

        const productCount = db
            .prepare(
                `
                SELECT COUNT(*) AS count
                FROM products
                WHERE business_id = ?
                AND active = 1
                `
            )
            .get(businessId);

        const sales = db
            .prepare(
                `
                SELECT
                    COALESCE(
                        SUM(total_amount),
                        0
                    ) AS total
                FROM sales
                WHERE business_id = ?
                AND date = ?
                `
            )
            .get(
                businessId,
                date
            );

        const expenses = db
            .prepare(
                `
                SELECT
                    COALESCE(
                        SUM(amount),
                        0
                    ) AS total
                FROM expenses
                WHERE business_id = ?
                AND date = ?
                `
            )
            .get(
                businessId,
                date
            );

        const stockVariance = db
            .prepare(
                `
                SELECT
                    COALESCE(
                        SUM(
                            ABS(
                                units_sold -
                                COALESCE(
                                    (
                                        SELECT
                                            SUM(si.quantity)
                                        FROM sale_items si
                                        JOIN sales s
                                            ON s.id = si.sale_id
                                        WHERE s.business_id = ?
                                        AND s.date = ?
                                        AND si.product_id =
                                            daily_stock.product_id
                                    ),
                                    0
                                )
                            )
                        ),
                        0
                    ) AS variance
                FROM daily_stock
                WHERE business_id = ?
                AND date = ?
                `
            )
            .get(
                businessId,
                date,
                businessId,
                date
            );

        res.json({
            success: true,
            business_id: businessId,
            date,
            products:
                Number(productCount.count || 0),
            sales:
                Number(sales.total || 0),
            expenses:
                Number(expenses.total || 0),
            difference:
                Number(
                    stockVariance.variance || 0
                )
        });
    } catch (error) {
        console.error("DASHBOARD:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/* =====================================================
   404
===================================================== */

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found."
    });
});

/* =====================================================
   ERROR HANDLER
===================================================== */

app.use((error, req, res, next) => {
    console.error("SERVER ERROR:", error);

    res.status(500).json({
        success: false,
        message:
            error.message ||
            "Internal server error."
    });
});

/* =====================================================
   START SERVER
===================================================== */

app.listen(PORT, "0.0.0.0", () => {
    console.log(
        `Stock System backend running on port ${PORT}`
    );

    console.log(
        `Frontend allowed: ${FRONTEND_ORIGIN}`
    );
});