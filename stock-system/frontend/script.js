/* =====================================================
   EXPRESS RETURNS STOCK & FINANCE SYSTEM
===================================================== */


const API_URL =
    "https://stunning-space-bassoon-69v9r76w4q5525xq6-3000.app.github.dev";


let products = [];


let currentDate =
    new Date().toISOString().split("T")[0];


/* =====================================================
   FORMATTING
===================================================== */


const money = value => {

    return `KES ${Number(value || 0).toLocaleString(
        "en-KE",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    )}`;

};


const qty = value => {

    return Number(value || 0).toLocaleString(
        "en-KE",
        {
            maximumFractionDigits: 2
        }
    );

};


/* =====================================================
   API HELPER
===================================================== */


const apiRequest = async (
    endpoint,
    options = {}
) => {

    const response =
        await fetch(
            `${API_URL}${endpoint}`,
            {
                headers: {
                    "Content-Type":
                        "application/json"
                },
                ...options
            }
        );


    let data;


    try {

        data =
            await response.json();

    } catch {

        throw new Error(
            `Server returned ${response.status}`
        );

    }


    if (!response.ok) {

        throw new Error(
            data.message ||
            `Request failed: ${response.status}`
        );

    }


    return data;

};


/* =====================================================
   DATE HELPERS
===================================================== */


function setDateValue(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.value =
            value;

    }

}


function syncDates(
    date
) {

    setDateValue(
        "globalDate",
        date
    );

    setDateValue(
        "stockDate",
        date
    );

    setDateValue(
        "dailyStockDate",
        date
    );

    setDateValue(
        "reconciliationDate",
        date
    );

    setDateValue(
        "reportDate",
        date
    );

}


function changeBusinessDate(
    date
) {

    if (!date) {
        return;
    }


    currentDate =
        date;


    syncDates(
        currentDate
    );


    loadDailyStock();

    loadSales();

    loadPurchases();

    loadExpenses();

    loadReport();

    loadReconciliationSummary();

    updateDashboard();

}


/* =====================================================
   NAVIGATION
===================================================== */


document
    .querySelectorAll(".nav-item")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const targetId =
                    button.dataset.section;


                const targetSection =
                    document.getElementById(
                        targetId
                    );


                console.log(
                    "Navigation:",
                    targetId,
                    targetSection
                );


                if (!targetSection) {

                    console.error(
                        `Section #${targetId} was not found.`
                    );

                    return;

                }


                document
                    .querySelectorAll(".nav-item")
                    .forEach(item => {

                        item.classList.remove(
                            "active"
                        );

                    });


                document
                    .querySelectorAll(".page-section")
                    .forEach(section => {

                        section.classList.remove(
                            "active-section"
                        );

                    });


                button.classList.add(
                    "active"
                );


                targetSection.classList.add(
                    "active-section"
                );


                const pageTitle =
                    document.getElementById(
                        "pageTitle"
                    );


                if (pageTitle) {

                    pageTitle.textContent =
                        button.textContent.trim();

                }


                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });


                if (
                    targetId ===
                    "products"
                ) {

                    loadProducts();

                }


                if (
                    targetId ===
                    "opening-stock"
                ) {

                    loadOpeningStock();

                }


                if (
                    targetId ===
                    "daily-stock"
                ) {

                    loadDailyStock();

                }


                if (
                    targetId ===
                    "sales"
                ) {

                    loadSales();

                }


                if (
                    targetId ===
                    "purchases"
                ) {

                    loadPurchases();

                }


                if (
                    targetId ===
                    "expenses"
                ) {

                    loadExpenses();

                }


                if (
                    targetId ===
                    "reconciliation"
                ) {

                    loadReconciliationSummary();

                }


                if (
                    targetId ===
                    "reports"
                ) {

                    loadReport();

                }

            }
        );

    });


/* =====================================================
   GLOBAL DATE
===================================================== */


const globalDate =
    document.getElementById(
        "globalDate"
    );


if (globalDate) {

    globalDate.addEventListener(
        "change",
        event => {

            changeBusinessDate(
                event.target.value
            );

        }
    );

}


/* =====================================================
   TODAY DATE
===================================================== */


function displayTodayDate() {

    const todayDate =
        document.getElementById(
            "todayDate"
        );


    if (!todayDate) {
        return;
    }


    const date =
        new Date();


    todayDate.textContent =
        date.toLocaleDateString(
            "en-KE",
            {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        );

}


/* =====================================================
   PRODUCTS
===================================================== */


async function loadProducts() {

    try {

        const data =
            await apiRequest(
                "/api/products"
            );


        products =
            data.products || [];


        renderProductTables();

        populateProductSelects();


        const dashboardProducts =
            document.getElementById(
                "dashboardProducts"
            );


        if (dashboardProducts) {

            dashboardProducts.textContent =
                products.length;

        }


    } catch (error) {

        console.error(
            "Products error:",
            error
        );


        showMessage(
            "formMessage",
            error.message,
            "error"
        );

    }

}


function renderProductTables() {

    const tbody =
        document.getElementById(
            "productsTableBody"
        );


    if (!tbody) {
        return;
    }


    if (!products.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="empty-message"
                >
                    No products added yet.
                </td>

            </tr>

        `;

        return;

    }


    tbody.innerHTML =
        products.map(
            (product, index) => {

                const profit =
                    Number(
                        product.selling_price
                    ) -
                    Number(
                        product.purchase_price
                    );


                return `

                    <tr>

                        <td>
                            ${index + 1}
                        </td>

                        <td>
                            <strong>
                                ${escapeHtml(product.name)}
                            </strong>
                        </td>

                        <td>
                            ${money(product.selling_price)}
                        </td>

                        <td>
                            ${money(product.purchase_price)}
                        </td>

                        <td>
                            ${money(profit)}
                        </td>

                        <td>

                            <button
                                class="btn-danger btn-small"
                                onclick="deleteProduct(${product.id})"
                            >
                                Delete
                            </button>

                        </td>

                    </tr>

                `;

            }
        ).join("");

}


function populateProductSelects() {

    const selects =
        document.querySelectorAll(
            ".sale-product, #purchaseProduct"
        );


    selects.forEach(select => {

        const current =
            select.value;


        select.innerHTML = `

            <option value="">
                Select product
            </option>

        `;


        products.forEach(
            product => {

                select.innerHTML += `

                    <option
                        value="${product.id}"
                    >
                        ${escapeHtml(product.name)}
                    </option>

                `;

            }
        );


        if (current) {

            select.value =
                current;

        }

    });

}


/* =====================================================
   ADD PRODUCT
===================================================== */


const productForm =
    document.getElementById(
        "productForm"
    );


if (productForm) {

    productForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const name =
                document.getElementById(
                    "productName"
                ).value.trim();


            const sellingPrice =
                Number(
                    document.getElementById(
                        "sellingPrice"
                    ).value
                );


            const purchasePrice =
                Number(
                    document.getElementById(
                        "purchasePrice"
                    ).value
                );


            if (!name) {

                showMessage(
                    "formMessage",
                    "Enter a product name.",
                    "error"
                );

                return;

            }


            if (
                sellingPrice < 0 ||
                purchasePrice < 0
            ) {

                showMessage(
                    "formMessage",
                    "Prices cannot be negative.",
                    "error"
                );

                return;

            }


            try {

                await apiRequest(
                    "/api/products",
                    {
                        method: "POST",

                        body:
                            JSON.stringify({
                                name,
                                selling_price:
                                    sellingPrice,
                                purchase_price:
                                    purchasePrice
                            })
                    }
                );


                productForm.reset();


                showMessage(
                    "formMessage",
                    "Product added successfully.",
                    "success"
                );


                await loadProducts();

                await loadOpeningStock();

                await loadDailyStock();

                await loadReport();

                updateDashboard();


            } catch (error) {

                showMessage(
                    "formMessage",
                    error.message,
                    "error"
                );

            }

        }
    );

}


/* =====================================================
   REFRESH PRODUCTS
===================================================== */


const refreshProducts =
    document.getElementById(
        "refreshProducts"
    );


if (refreshProducts) {

    refreshProducts.addEventListener(
        "click",
        loadProducts
    );

}


/* =====================================================
   DELETE PRODUCT
===================================================== */


async function deleteProduct(
    id
) {

    const confirmed =
        confirm(
            "Delete this product?"
        );


    if (!confirmed) {
        return;
    }


    try {

        await apiRequest(
            `/api/products/${id}`,
            {
                method: "DELETE"
            }
        );


        await loadProducts();

        await loadOpeningStock();

        await loadDailyStock();

        await loadReport();


    } catch (error) {

        alert(
            error.message
        );

    }

}


/* =====================================================
   OPENING STOCK
===================================================== */


async function loadOpeningStock() {

    const tbody =
        document.getElementById(
            "openingStockTable"
        );


    if (!tbody) {
        return;
    }


    try {

        const data =
            await apiRequest(
                `/api/opening-stock?date=${currentDate}`
            );


        const stock =
            data.products ||
            data.stock ||
            [];


        if (!products.length) {

            tbody.innerHTML = `

                <tr>

                    <td
                        colspan="3"
                        class="empty-message"
                    >
                        Add products first.
                    </td>

                </tr>

            `;

            return;

        }


        const existing =
            {};


        stock.forEach(
            item => {

                existing[
                    item.product_id
                ] = item.opening_quantity;

            }
        );


        tbody.innerHTML =
            products.map(
                product => {

                    const value =
                        existing[
                            product.id
                        ] ?? 0;


                    return `

                        <tr>

                            <td>
                                ${escapeHtml(product.name)}
                            </td>

                            <td>

                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value="${value}"
                                    id="opening-${product.id}"
                                >

                            </td>

                            <td>

                                <button
                                    class="secondary-button"
                                    onclick="saveOpeningStock(${product.id})"
                                >
                                    Save
                                </button>

                            </td>

                        </tr>

                    `;

                }
            ).join("");


    } catch (error) {

        console.error(
            "Opening stock error:",
            error
        );


        tbody.innerHTML = `

            <tr>

                <td
                    colspan="3"
                    class="empty-message"
                >
                    Failed to load opening stock.
                </td>

            </tr>

        `;

    }

}


async function saveOpeningStock(
    productId
) {

    const input =
        document.getElementById(
            `opening-${productId}`
        );


    if (!input) {
        return;
    }


    const quantity =
        Number(
            input.value
        );


    try {

        await apiRequest(
            "/api/opening-stock",
            {
                method: "POST",

                body:
                    JSON.stringify({
                        date: currentDate,
                        product_id:
                            productId,
                        opening_quantity:
                            quantity
                    })
            }
        );


        showMessage(
            "formMessage",
            "Opening stock saved.",
            "success"
        );


        loadDailyStock();


    } catch (error) {

        alert(
            error.message
        );

    }

}


/* =====================================================
   DAILY STOCK
===================================================== */


async function loadDailyStock() {

    const tbody =
        document.getElementById(
            "dailyStockTable"
        );


    if (!tbody) {
        return;
    }


    try {

        const data =
            await apiRequest(
                `/api/daily-stock?date=${currentDate}`
            );


        const rows =
            data.products || [];


        if (!rows.length) {

            tbody.innerHTML = `

                <tr>

                    <td
                        colspan="9"
                        class="empty-message"
                    >
                        No stock records yet.
                    </td>

                </tr>

            `;

            return;

        }


        tbody.innerHTML =
            rows.map(
                product => {

                    return `

                        <tr>

                            <td>
                                <strong>
                                    ${escapeHtml(product.name)}
                                </strong>
                            </td>

                            <td>
                                ${qty(product.opening_quantity)}
                            </td>

                            <td>
                                ${qty(product.additions)}
                            </td>

                            <td>
                                ${qty(product.available_quantity)}
                            </td>

                            <td>

                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value="${product.closing_quantity || 0}"
                                    id="closing-${product.id}"
                                    style="width:100px"
                                >

                                <button
                                    class="secondary-button btn-small"
                                    onclick="saveDailyStock(${product.id})"
                                >
                                    Save
                                </button>

                            </td>

                            <td>
                                ${qty(product.units_sold)}
                            </td>

                            <td>
                                ${qty(product.recorded_units_sold)}
                            </td>

                            <td>
                                ${varianceBadge(product.stock_variance)}
                            </td>

                            <td>
                                ${money(product.sales)}
                            </td>

                        </tr>

                    `;

                }
            ).join("");


    } catch (error) {

        console.error(
            "Daily stock error:",
            error
        );


        tbody.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    class="empty-message"
                >
                    Failed to load daily stock.
                </td>

            </tr>

        `;

    }

}


async function saveDailyStock(
    productId
) {

    const input =
        document.getElementById(
            `closing-${productId}`
        );


    if (!input) {
        return;
    }


    const closing =
        Number(
            input.value
        );


    try {

        await apiRequest(
            "/api/daily-stock",
            {
                method: "POST",

                body:
                    JSON.stringify({
                        date: currentDate,
                        product_id:
                            productId,
                        closing_quantity:
                            closing
                    })
            }
        );


        await loadDailyStock();

        await loadReport();

        updateDashboard();


    } catch (error) {

        alert(
            error.message
        );

    }

}


/* =====================================================
   SALES LINE
===================================================== */


function updateSaleLine(
    line
) {

    const productSelect =
        line.querySelector(
            ".sale-product"
        );


    const quantityInput =
        line.querySelector(
            ".sale-quantity"
        );


    const totalInput =
        line.querySelector(
            ".sale-line-total"
        );


    const productId =
        Number(
            productSelect.value
        );


    const quantity =
        Number(
            quantityInput.value
        );


    const product =
        products.find(
            item =>
                Number(item.id) ===
                productId
        );


    if (
        !product ||
        !quantity
    ) {

        totalInput.value =
            "KES 0.00";

        return;

    }


    const total =
        Number(
            product.selling_price
        ) *
        quantity;


    totalInput.value =
        money(total);

}


function updateSaleTotal() {

    const lines =
        document.querySelectorAll(
            ".sale-line"
        );


    let total = 0;


    lines.forEach(
        line => {

            const productId =
                Number(
                    line.querySelector(
                        ".sale-product"
                    ).value
                );


            const quantity =
                Number(
                    line.querySelector(
                        ".sale-quantity"
                    ).value
                );


            const product =
                products.find(
                    item =>
                        Number(item.id) ===
                        productId
                );


            if (product) {

                total +=
                    Number(
                        product.selling_price
                    ) *
                    quantity;

            }

        }
    );


    const saleTotal =
        document.getElementById(
            "saleTotal"
        );


    if (saleTotal) {

        saleTotal.textContent =
            money(total);

    }


    return total;

}


/* =====================================================
   SALE EVENTS
===================================================== */


document.addEventListener(
    "input",
    event => {

        if (
            event.target.matches(
                ".sale-quantity"
            )
        ) {

            const line =
                event.target.closest(
                    ".sale-line"
                );


            if (line) {

                updateSaleLine(
                    line
                );

                updateSaleTotal();

            }

        }

    }
);


document.addEventListener(
    "change",
    event => {

        if (
            event.target.matches(
                ".sale-product"
            )
        ) {

            const line =
                event.target.closest(
                    ".sale-line"
                );


            if (line) {

                updateSaleLine(
                    line
                );

                updateSaleTotal();

            }

        }

    }
);


/* =====================================================
   ADD SALE ITEM
===================================================== */


const addSaleItem =
    document.getElementById(
        "addSaleItem"
    );


if (addSaleItem) {

    addSaleItem.addEventListener(
        "click",
        () => {

            const container =
                document.getElementById(
                    "saleItems"
                );


            const line =
                document.createElement(
                    "div"
                );


            line.className =
                "sale-line";


            line.innerHTML = `

                <div class="form-group">

                    <label>
                        Product
                    </label>

                    <select
                        class="sale-product"
                        required
                    >

                        <option value="">
                            Select product
                        </option>

                    </select>

                </div>


                <div class="form-group">

                    <label>
                        Quantity
                    </label>

                    <input
                        type="number"
                        class="sale-quantity"
                        min="0.01"
                        step="0.01"
                        value="1"
                        required
                    >

                </div>


                <div class="form-group">

                    <label>
                        Total
                    </label>

                    <input
                        type="text"
                        class="sale-line-total"
                        value="KES 0.00"
                        readonly
                    >

                </div>


                <button
                    type="button"
                    class="remove-sale-line"
                >
                    Remove
                </button>

            `;


            container.appendChild(
                line
            );


            populateProductSelects();

        }
    );

}


/* =====================================================
   REMOVE SALE LINE
===================================================== */


document.addEventListener(
    "click",
    event => {

        if (
            event.target.matches(
                ".remove-sale-line"
            )
        ) {

            const lines =
                document.querySelectorAll(
                    ".sale-line"
                );


            if (lines.length <= 1) {

                alert(
                    "At least one sale item is required."
                );

                return;

            }


            event.target
                .closest(".sale-line")
                .remove();


            updateSaleTotal();

        }

    }
);


/* =====================================================
   COMPLETE SALE
===================================================== */


const saleForm =
    document.getElementById(
        "saleForm"
    );


if (saleForm) {

    saleForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const lines =
                document.querySelectorAll(
                    ".sale-line"
                );


            const items = [];


            for (
                const line of lines
            ) {

                const productId =
                    Number(
                        line.querySelector(
                            ".sale-product"
                        ).value
                    );


                const quantity =
                    Number(
                        line.querySelector(
                            ".sale-quantity"
                        ).value
                    );


                if (
                    !productId ||
                    quantity <= 0
                ) {

                    showMessage(
                        "saleMessage",
                        "Select a product and enter a valid quantity.",
                        "error"
                    );

                    return;

                }


                items.push({
                    product_id:
                        productId,
                    quantity:
                        quantity
                });

            }


            const paymentMethod =
                document.getElementById(
                    "paymentMethod"
                ).value;


            try {

                const result =
                    await apiRequest(
                        "/api/sales",
                        {
                            method: "POST",

                            body:
                                JSON.stringify({
                                    date:
                                        currentDate,

                                    payment_method:
                                        paymentMethod,

                                    items:
                                        items
                                })
                        }
                    );


                showMessage(
                    "saleMessage",
                    `Sale completed. Receipt ${result.receiptNumber}`,
                    "success"
                );


                saleForm.reset();


                const saleItems =
                    document.getElementById(
                        "saleItems"
                    );


                saleItems.innerHTML = `

                    <div class="sale-line">

                        <div class="form-group">

                            <label>
                                Product
                            </label>

                            <select
                                class="sale-product"
                                required
                            >

                                <option value="">
                                    Select product
                                </option>

                            </select>

                        </div>


                        <div class="form-group">

                            <label>
                                Quantity
                            </label>

                            <input
                                type="number"
                                class="sale-quantity"
                                min="0.01"
                                step="0.01"
                                value="1"
                                required
                            >

                        </div>


                        <div class="form-group">

                            <label>
                                Total
                            </label>

                            <input
                                type="text"
                                class="sale-line-total"
                                value="KES 0.00"
                                readonly
                            >

                        </div>


                        <button
                            type="button"
                            class="remove-sale-line"
                        >
                            Remove
                        </button>

                    </div>

                `;


                populateProductSelects();

                updateSaleTotal();

                await loadSales();

                await loadDailyStock();

                await loadReport();

                await loadReconciliationSummary();

                updateDashboard();


                if (
                    result.saleId
                ) {

                    await printReceipt(
                        result.saleId
                    );

                }


            } catch (error) {

                showMessage(
                    "saleMessage",
                    error.message,
                    "error"
                );

            }

        }
    );

}


/* =====================================================
   LOAD SALES
===================================================== */


async function loadSales() {

    const list =
        document.getElementById(
            "salesList"
        );


    if (!list) {
        return;
    }


    try {

        const data =
            await apiRequest(
                `/api/sales?date=${currentDate}`
            );


        const sales =
            data.sales || [];


        const total =
            Number(
                data.total ||
                data.totalSales ||
                0
            );


        const totalSales =
            document.getElementById(
                "totalSales"
            );


        if (totalSales) {

            totalSales.textContent =
                total.toLocaleString(
                    "en-KE",
                    {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }
                );

        }


        if (!sales.length) {

            list.innerHTML = `

                <div class="empty-state">
                    No sales recorded yet.
                </div>

            `;

            return;

        }


        list.innerHTML =
            sales.map(
                sale => {

                    return `

                        <div class="transaction-row">

                            <div class="transaction-main">

                                <strong>
                                    ${escapeHtml(
                                        sale.receipt_number
                                    )}
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        sale.payment_method
                                    )}
                                    •
                                    ${sale.item_count || 0}
                                    item(s)
                                </span>

                            </div>


                            <div>

                                <strong>
                                    ${money(
                                        sale.total_amount
                                    )}
                                </strong>

                            </div>


                            <div class="transaction-actions">

                                <button
                                    class="secondary-button btn-small"
                                    onclick="printReceipt(${sale.id})"
                                >
                                    Print
                                </button>

                                <button
                                    class="btn-danger btn-small"
                                    onclick="deleteSale(${sale.id})"
                                >
                                    Delete
                                </button>

                            </div>

                        </div>

                    `;

                }
            ).join("");


    } catch (error) {

        console.error(
            "Sales error:",
            error
        );


        list.innerHTML = `

            <div class="empty-state">
                Failed to load sales.
            </div>

        `;

    }

}


/* =====================================================
   PRINT RECEIPT
===================================================== */


async function printReceipt(
    saleId
) {

    try {

        const data =
            await apiRequest(
                `/api/sales/${saleId}`
            );


        const sale =
            data.sale;


        if (!sale) {

            throw new Error(
                "Sale not found."
            );

        }


        document.getElementById(
            "receiptNumber"
        ).textContent =
            sale.receipt_number;


        document.getElementById(
            "receiptDate"
        ).textContent =
            sale.date;


        document.getElementById(
            "receiptPayment"
        ).textContent =
            sale.payment_method;


        const receiptItems =
            document.getElementById(
                "receiptItems"
            );


        receiptItems.innerHTML =
            sale.items.map(
                item => `

                    <div class="receipt-item">

                        <span>
                            ${escapeHtml(item.name)}
                            x${qty(item.quantity)}
                        </span>

                        <strong>
                            ${money(item.total)}
                        </strong>

                    </div>

                `
            ).join("");


        document.getElementById(
            "receiptTotal"
        ).textContent =
            money(
                sale.total_amount
            );


        window.print();


    } catch (error) {

        alert(
            error.message
        );

    }

}


/* =====================================================
   DELETE SALE
===================================================== */


async function deleteSale(
    id
) {

    const confirmed =
        confirm(
            "Delete this receipt?"
        );


    if (!confirmed) {
        return;
    }


    try {

        await apiRequest(
            `/api/sales/${id}`,
            {
                method: "DELETE"
            }
        );


        await loadSales();

        await loadDailyStock();

        await loadReport();

        await loadReconciliationSummary();

        updateDashboard();


    } catch (error) {

        alert(
            error.message
        );

    }

}


/* =====================================================
   PURCHASES
===================================================== */


const savePurchase =
    document.getElementById(
        "savePurchase"
    );


if (savePurchase) {

    savePurchase.addEventListener(
        "click",
        async () => {

            const productId =
                Number(
                    document.getElementById(
                        "purchaseProduct"
                    ).value
                );


            const quantity =
                Number(
                    document.getElementById(
                        "purchaseQuantity"
                    ).value
                );


            const amount =
                Number(
                    document.getElementById(
                        "purchaseAmount"
                    ).value
                );


            if (
                !productId ||
                quantity <= 0 ||
                amount < 0
            ) {

                showMessage(
                    "purchaseMessage",
                    "Enter valid purchase details.",
                    "error"
                );

                return;

            }


            try {

                await apiRequest(
                    "/api/purchases",
                    {
                        method: "POST",

                        body:
                            JSON.stringify({
                                date:
                                    currentDate,
                                product_id:
                                    productId,
                                quantity:
                                    quantity,
                                amount:
                                    amount
                            })
                    }
                );


                document.getElementById(
                    "purchaseQuantity"
                ).value = "";


                document.getElementById(
                    "purchaseAmount"
                ).value = "";


                showMessage(
                    "purchaseMessage",
                    "Purchase recorded successfully.",
                    "success"
                );


                await loadPurchases();

                await loadDailyStock();

                await loadReport();

                await loadReconciliationSummary();

                updateDashboard();


            } catch (error) {

                showMessage(
                    "purchaseMessage",
                    error.message,
                    "error"
                );

            }

        }
    );

}


async function loadPurchases() {

    const list =
        document.getElementById(
            "purchaseList"
        );


    if (!list) {
        return;
    }


    try {

        const data =
            await apiRequest(
                `/api/purchases?date=${currentDate}`
            );


        const purchases =
            data.purchases || [];


        const total =
            purchases.reduce(
                (
                    sum,
                    item
                ) =>
                    sum +
                    Number(
                        item.amount || 0
                    ),
                0
            );


        document.getElementById(
            "purchaseTotal"
        ).textContent =
            total.toLocaleString(
                "en-KE",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );


        if (!purchases.length) {

            list.innerHTML = `

                <div class="empty-state">
                    No purchases recorded yet.
                </div>

            `;

            return;

        }


        list.innerHTML =
            purchases.map(
                purchase => `

                    <div class="transaction-row">

                        <div class="transaction-main">

                            <strong>
                                ${escapeHtml(
                                    purchase.product_name ||
                                    purchase.name ||
                                    "Product"
                                )}
                            </strong>

                            <span>
                                Quantity:
                                ${qty(
                                    purchase.quantity
                                )}
                            </span>

                        </div>


                        <div>

                            <strong>
                                ${money(
                                    purchase.amount
                                )}
                            </strong>

                        </div>


                        <button
                            class="btn-danger btn-small"
                            onclick="deletePurchase(${purchase.id})"
                        >
                            Delete
                        </button>

                    </div>

                `
            ).join("");


    } catch (error) {

        console.error(
            "Purchases error:",
            error
        );


        list.innerHTML = `

            <div class="empty-state">
                Failed to load purchases.
            </div>

        `;

    }

}


async function deletePurchase(
    id
) {

    const confirmed =
        confirm(
            "Delete this purchase?"
        );


    if (!confirmed) {
        return;
    }


    try {

        await apiRequest(
            `/api/purchases/${id}`,
            {
                method: "DELETE"
            }
        );


        await loadPurchases();

        await loadReport();

        await loadReconciliationSummary();

        updateDashboard();


    } catch (error) {

        alert(
            error.message
        );

    }

}


/* =====================================================
   EXPENSES
===================================================== */


const saveExpense =
    document.getElementById(
        "saveExpense"
    );


if (saveExpense) {

    saveExpense.addEventListener(
        "click",
        async () => {

            const description =
                document.getElementById(
                    "expenseDescription"
                ).value.trim();


            const amount =
                Number(
                    document.getElementById(
                        "expenseAmount"
                    ).value
                );


            if (
                !description ||
                amount < 0
            ) {

                showMessage(
                    "expenseMessage",
                    "Enter a valid expense.",
                    "error"
                );

                return;

            }


            try {

                await apiRequest(
                    "/api/expenses",
                    {
                        method: "POST",

                        body:
                            JSON.stringify({
                                date:
                                    currentDate,
                                description:
                                    description,
                                amount:
                                    amount
                            })
                    }
                );


                document.getElementById(
                    "expenseDescription"
                ).value = "";


                document.getElementById(
                    "expenseAmount"
                ).value = "";


                showMessage(
                    "expenseMessage",
                    "Expense recorded successfully.",
                    "success"
                );


                await loadExpenses();

                await loadReport();

                await loadReconciliationSummary();

                updateDashboard();


            } catch (error) {

                showMessage(
                    "expenseMessage",
                    error.message,
                    "error"
                );

            }

        }
    );

}


async function loadExpenses() {

    const list =
        document.getElementById(
            "expenseList"
        );


    if (!list) {
        return;
    }


    try {

        const data =
            await apiRequest(
                `/api/expenses?date=${currentDate}`
            );


        const expenses =
            data.expenses || [];


        const total =
            expenses.reduce(
                (
                    sum,
                    item
                ) =>
                    sum +
                    Number(
                        item.amount || 0
                    ),
                0
            );


        document.getElementById(
            "expenseTotal"
        ).textContent =
            total.toLocaleString(
                "en-KE",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );


        if (!expenses.length) {

            list.innerHTML = `

                <div class="empty-state">
                    No expenses recorded yet.
                </div>

            `;

            return;

        }


        list.innerHTML =
            expenses.map(
                expense => `

                    <div class="transaction-row">

                        <div class="transaction-main">

                            <strong>
                                ${escapeHtml(
                                    expense.description
                                )}
                            </strong>

                            <span>
                                ${expense.date}
                            </span>

                        </div>


                        <div>

                            <strong>
                                ${money(
                                    expense.amount
                                )}
                            </strong>

                        </div>


                        <button
                            class="btn-danger btn-small"
                            onclick="deleteExpense(${expense.id})"
                        >
                            Delete
                        </button>

                    </div>

                `
            ).join("");


    } catch (error) {

        console.error(
            "Expenses error:",
            error
        );


        list.innerHTML = `

            <div class="empty-state">
                Failed to load expenses.
            </div>

        `;

    }

}


async function deleteExpense(
    id
) {

    const confirmed =
        confirm(
            "Delete this expense?"
        );


    if (!confirmed) {
        return;
    }


    try {

        await apiRequest(
            `/api/expenses/${id}`,
            {
                method: "DELETE"
            }
        );


        await loadExpenses();

        await loadReport();

        await loadReconciliationSummary();

        updateDashboard();


    } catch (error) {

        alert(
            error.message
        );

    }

}


/* =====================================================
   RECONCILIATION
===================================================== */


async function loadReconciliationSummary() {

    try {

        const [
            salesData,
            expensesData,
            purchasesData
        ] =
            await Promise.all([

                apiRequest(
                    `/api/sales?date=${currentDate}`
                ),

                apiRequest(
                    `/api/expenses?date=${currentDate}`
                ),

                apiRequest(
                    `/api/purchases?date=${currentDate}`
                )

            ]);


        const sales =
            Number(
                salesData.total ||
                salesData.totalSales ||
                0
            );


        const expenses =
            (
                expensesData.expenses ||
                []
            ).reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    Number(
                        item.amount || 0
                    ),
                0
            );


        const purchases =
            (
                purchasesData.purchases ||
                []
            ).reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    Number(
                        item.amount || 0
                    ),
                0
            );


        document.getElementById(
            "reconcileSales"
        ).textContent =
            sales.toLocaleString(
                "en-KE",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );


        document.getElementById(
            "reconcileExpenses"
        ).textContent =
            expenses.toLocaleString(
                "en-KE",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );


        document.getElementById(
            "reconcilePurchases"
        ).textContent =
            purchases.toLocaleString(
                "en-KE",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );


    } catch (error) {

        console.error(
            "Reconciliation summary error:",
            error
        );

    }

}


/* =====================================================
   CALCULATE RECONCILIATION
===================================================== */


const calculateReconciliation =
    document.getElementById(
        "calculateReconciliation"
    );


if (calculateReconciliation) {

    calculateReconciliation.addEventListener(
        "click",
        async () => {

            const cash =
                Number(
                    document.getElementById(
                        "cashAtHand"
                    ).value
                ) || 0;


            const till =
                Number(
                    document.getElementById(
                        "tillAmount"
                    ).value
                ) || 0;


            try {

                const result =
                    await apiRequest(
                        "/api/reconciliation",
                        {
                            method: "POST",

                            body:
                                JSON.stringify({
                                    date:
                                        currentDate,

                                    cash_at_hand:
                                        cash,

                                    till_amount:
                                        till
                                })
                        }
                    );


                document.getElementById(
                    "expectedMoney"
                ).textContent =
                    Number(
                        result.expectedMoney
                    ).toLocaleString(
                        "en-KE",
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }
                    );


                document.getElementById(
                    "actualMoney"
                ).textContent =
                    Number(
                        result.actualMoney
                    ).toLocaleString(
                        "en-KE",
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }
                    );


                document.getElementById(
                    "moneyDifference"
                ).textContent =
                    Number(
                        result.difference
                    ).toLocaleString(
                        "en-KE",
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }
                    );


                const status =
                    document.getElementById(
                        "reconciliationStatus"
                    );


                status.textContent =
                    result.status;


                status.className =
                    "status-badge";


                if (
                    result.status ===
                    "BALANCED"
                ) {

                    status.classList.add(
                        "balanced"
                    );

                } else if (
                    result.status ===
                    "SHORTAGE"
                ) {

                    status.classList.add(
                        "shortage"
                    );

                } else {

                    status.classList.add(
                        "surplus"
                    );

                }


            } catch (error) {

                alert(
                    error.message
                );

            }

        }
    );

}


/* =====================================================
   REPORTS
===================================================== */


async function loadReport() {

    const table =
        document.getElementById(
            "reportTable"
        );


    if (!table) {
        return;
    }


    try {

        const data =
            await apiRequest(
                `/api/reports/daily?date=${currentDate}`
            );


        const totals =
            data.totals || {};


        document.getElementById(
            "reportUnits"
        ).textContent =
            qty(
                totals.receiptUnits ||
                totals.units ||
                0
            );


        document.getElementById(
            "reportSales"
        ).textContent =
            Number(
                totals.receiptSales || 0
            ).toLocaleString(
                "en-KE",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );


        document.getElementById(
            "reportCost"
        ).textContent =
            Number(
                totals.cost || 0
            ).toLocaleString(
                "en-KE",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );


        document.getElementById(
            "reportProfit"
        ).textContent =
            Number(
                totals.profit || 0
            ).toLocaleString(
                "en-KE",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );


        const rows =
            data.products || [];


        if (!rows.length) {

            table.innerHTML = `

                <tr>

                    <td
                        colspan="9"
                        class="empty-message"
                    >
                        No report data for this date.
                    </td>

                </tr>

            `;

            return;

        }


        table.innerHTML =
            rows.map(
                product => `

                    <tr>

                        <td>
                            <strong>
                                ${escapeHtml(product.name)}
                            </strong>
                        </td>

                        <td>
                            ${qty(
                                product.opening_quantity
                            )}
                        </td>

                        <td>
                            ${qty(
                                product.additions
                            )}
                        </td>

                        <td>
                            ${qty(
                                product.closing_quantity
                            )}
                        </td>

                        <td>
                            ${qty(
                                product.units_sold
                            )}
                        </td>

                        <td>
                            ${qty(
                                product.recorded_units_sold
                            )}
                        </td>

                        <td>
                            ${varianceBadge(
                                product.stock_variance
                            )}
                        </td>

                        <td>
                            ${money(
                                product.receipt_sales
                            )}
                        </td>

                        <td>
                            ${money(
                                product.gross_profit
                            )}
                        </td>

                    </tr>

                `
            ).join("");


    } catch (error) {

        console.error(
            "Report error:",
            error
        );


        table.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    class="empty-message"
                >
                    Failed to load report.
                </td>

            </tr>

        `;

    }

}


const loadReportButton =
    document.getElementById(
        "loadReport"
    );


if (loadReportButton) {

    loadReportButton.addEventListener(
        "click",
        loadReport
    );

}


/* =====================================================
   DASHBOARD
===================================================== */


async function updateDashboard() {

    try {

        const data =
            await apiRequest(
                `/api/reports/daily?date=${currentDate}`
            );


        const totals =
            data.totals || {};


        const dashboardSales =
            document.getElementById(
                "dashboardSales"
            );


        if (dashboardSales) {

            dashboardSales.textContent =
                Number(
                    totals.receiptSales || 0
                ).toLocaleString(
                    "en-KE",
                    {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }
                );

        }


        const dashboardExpenses =
            document.getElementById(
                "dashboardExpenses"
            );


        if (dashboardExpenses) {

            dashboardExpenses.textContent =
                Number(
                    totals.expenses || 0
                ).toLocaleString(
                    "en-KE",
                    {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }
                );

        }


        const dashboardDifference =
            document.getElementById(
                "dashboardDifference"
            );


        if (dashboardDifference) {

            dashboardDifference.textContent =
                qty(
                    totals.stockVariance || 0
                );

        }


        const dashboardProducts =
            document.getElementById(
                "dashboardProducts"
            );


        if (dashboardProducts) {

            dashboardProducts.textContent =
                products.length;

        }


    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );

    }

}


/* =====================================================
   UTILITIES
===================================================== */


function showMessage(
    elementId,
    message,
    type
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.className =
        `form-message ${type}`;


    setTimeout(
        () => {

            element.textContent =
                "";

            element.className =
                "form-message";

        },
        4000
    );

}


function varianceBadge(
    value
) {

    const number =
        Number(value || 0);


    if (number === 0) {

        return `
            <span class="status-badge balanced">
                0
            </span>
        `;

    }


    if (number < 0) {

        return `
            <span class="status-badge shortage">
                ${qty(number)}
            </span>
        `;

    }


    return `
        <span class="status-badge surplus">
            +${qty(number)}
        </span>
    `;

}


function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =====================================================
   DATE INPUT LISTENERS
===================================================== */


const stockDate =
    document.getElementById(
        "stockDate"
    );


if (stockDate) {

    stockDate.addEventListener(
        "change",
        event => {

            currentDate =
                event.target.value;

            syncDates(
                currentDate
            );

            loadOpeningStock();

            loadDailyStock();

        }
    );

}


const dailyStockDate =
    document.getElementById(
        "dailyStockDate"
    );


if (dailyStockDate) {

    dailyStockDate.addEventListener(
        "change",
        event => {

            currentDate =
                event.target.value;

            syncDates(
                currentDate
            );

            loadDailyStock();

            loadSales();

            loadReport();

            updateDashboard();

        }
    );

}


const reconciliationDate =
    document.getElementById(
        "reconciliationDate"
    );


if (reconciliationDate) {

    reconciliationDate.addEventListener(
        "change",
        event => {

            currentDate =
                event.target.value;

            syncDates(
                currentDate
            );

            loadReconciliationSummary();

        }
    );

}


const reportDate =
    document.getElementById(
        "reportDate"
    );


if (reportDate) {

    reportDate.addEventListener(
        "change",
        event => {

            currentDate =
                event.target.value;

            syncDates(
                currentDate
            );

            loadReport();

        }
    );

}


/* =====================================================
   LOAD EVERYTHING
===================================================== */


async function loadAll() {

    displayTodayDate();


    syncDates(
        currentDate
    );


    await loadProducts();

    await loadOpeningStock();

    await loadDailyStock();

    await loadSales();

    await loadPurchases();

    await loadExpenses();

    await loadReconciliationSummary();

    await loadReport();

    await updateDashboard();


    populateProductSelects();

    updateSaleTotal();

}


/* =====================================================
   START APPLICATION
===================================================== */


document.addEventListener(
    "DOMContentLoaded",
    () => {

        currentDate =
            new Date()
                .toISOString()
                .split("T")[0];


        syncDates(
            currentDate
        );


        loadAll();

    }
);