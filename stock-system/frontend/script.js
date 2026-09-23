const API_URL =
    "https://stunning-space-bassoon-69v9r76w4q5525xq6-3000.app.github.dev";

/* =====================================================
   GLOBAL STATE
===================================================== */

let businesses = [];
let activeBusinessId =
    localStorage.getItem("activeBusinessId") || "";

let currentDate =
    localStorage.getItem("stockSystemDate") ||
    new Date().toISOString().split("T")[0];

let products = [];
let dailyStock = [];
let sales = [];
let purchases = [];
let expenses = [];

let saleLines = [];

/* =====================================================
   API
===================================================== */

const apiRequest = async (endpoint, options = {}) => {
    try {
        const requestOptions = {
            ...options,
            headers: {
                ...(options.headers || {})
            }
        };

        if (requestOptions.body) {
            requestOptions.headers["Content-Type"] =
                "application/json";
        }

        console.log("API REQUEST:", {
            url: `${API_URL}${endpoint}`,
            method: requestOptions.method || "GET",
            body: requestOptions.body || null
        });

        const response = await fetch(
            `${API_URL}${endpoint}`,
            requestOptions
        );

        const text = await response.text();

        let data;

        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            data = {
                success: false,
                message: text || `Server returned ${response.status}`
            };
        }

        console.log("API RESPONSE:", response.status, data);

        if (!response.ok) {
            throw new Error(
                data.message ||
                `Request failed with status ${response.status}`
            );
        }

        return data;

    } catch (error) {
        console.error("API ERROR:", error);

        throw new Error(
            error.message ||
            "Failed to connect to the backend."
        );
    }
};

/* =====================================================
   HELPERS
===================================================== */

function getBusinessQuery() {
    if (!activeBusinessId) {
        return "";
    }

    return `business_id=${encodeURIComponent(
        activeBusinessId
    )}`;
}

function requireBusiness() {
    if (!activeBusinessId) {
        console.error("No business selected.");
        alert(
            "Please select a business first."
        );
        return false;
    }

    return true;
}

function money(value) {
    return Number(
        value || 0
    ).toLocaleString(
        "en-KE",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}

function number(value) {
    return Number(
        value || 0
    ).toLocaleString(
        "en-KE",
        {
            maximumFractionDigits: 2
        }
    );
}

function today() {
    return new Date()
        .toISOString()
        .split("T")[0];
}

function formatDate(date) {
    if (!date) {
        return "";
    }

    const d =
        new Date(
            `${date}T00:00:00`
        );

    if (
        Number.isNaN(
            d.getTime()
        )
    ) {
        return date;
    }

    return d.toLocaleDateString(
        "en-GB"
    );
}

function setText(id, value) {
    const element =
        document.getElementById(id);

    if (element) {
        element.textContent =
            value;
    }
}

function setValue(id, value) {
    const element =
        document.getElementById(id);

    if (element) {
        element.value =
            value;
    }
}

function getValue(id) {
    const element =
        document.getElementById(id);

    return element
        ? element.value
        : "";
}

function showMessage(
    elementId,
    message,
    type = "success"
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

    setTimeout(() => {
        element.textContent =
            "";
    }, 4000);
}

/* =====================================================
   BUSINESS MANAGEMENT
===================================================== */

async function loadBusinesses() {
    try {
        const data =
            await apiRequest(
                "/api/businesses"
            );

        businesses =
            data.businesses || [];

        renderBusinessSelect();

        if (
            !activeBusinessId &&
            businesses.length
        ) {
            activeBusinessId =
                String(
                    businesses[0].id
                );

            localStorage.setItem(
                "activeBusinessId",
                activeBusinessId
            );

            renderBusinessSelect();
        }

        if (
            activeBusinessId &&
            !businesses.some(
                business =>
                    String(
                        business.id
                    ) ===
                    String(
                        activeBusinessId
                    )
            )
        ) {
            activeBusinessId =
                businesses.length
                    ? String(
                        businesses[0].id
                    )
                    : "";

            localStorage.setItem(
                "activeBusinessId",
                activeBusinessId
            );

            renderBusinessSelect();
        }

        updateBusinessDisplay();
    } catch (error) {
        console.error(
            "Businesses error:",
            error
        );

        const select =
            document.getElementById(
                "businessSelect"
            );

        if (select) {
            select.innerHTML =
                `
                <option value="">
                    Failed to load businesses
                </option>
                `;
        }
    }
}

function renderBusinessSelect() {
    const select =
        document.getElementById(
            "businessSelect"
        );

    if (!select) {
        return;
    }

    select.innerHTML =
        "";

    if (
        !businesses.length
    ) {
        select.innerHTML =
            `
            <option value="">
                No businesses
            </option>
            `;

        return;
    }

    businesses.forEach(
        business => {
            const option =
                document.createElement(
                    "option"
                );

            option.value =
                business.id;

            option.textContent =
                business.business_name;

            if (
                String(
                    business.id
                ) ===
                String(
                    activeBusinessId
                )
            ) {
                option.selected =
                    true;
            }

            select.appendChild(
                option
            );
        }
    );
}

function updateBusinessDisplay() {
    const business =
        businesses.find(
            item =>
                String(
                    item.id
                ) ===
                String(
                    activeBusinessId
                )
        );

    const title =
        document.getElementById(
            "businessNameDisplay"
        );

    if (title) {
        title.textContent =
            business
                ? business.business_name
                : "No Business";
    }
}

async function createBusiness(event) {
    event.preventDefault();

    const businessName =
        getValue(
            "businessName"
        ).trim();

    const phone =
        getValue(
            "businessPhone"
        ).trim();

    const location =
        getValue(
            "businessLocation"
        ).trim();

    const businessType =
        getValue(
            "businessType"
        ).trim();

    if (!businessName) {
        showMessage(
            "businessMessage",
            "Business name is required.",
            "error"
        );

        return;
    }

    try {
        const data =
            await apiRequest(
                "/api/businesses",
                {
                    method: "POST",
                    body:
                        JSON.stringify({
                            business_name:
                                businessName,
                            phone,
                            location,
                            business_type:
                                businessType
                        })
                }
            );

        await loadBusinesses();

        if (
            data.business &&
            data.business.id
        ) {
            activeBusinessId =
                String(
                    data.business.id
                );

            localStorage.setItem(
                "activeBusinessId",
                activeBusinessId
            );

            renderBusinessSelect();
            updateBusinessDisplay();
        }

        closeBusinessModal();

        document
            .getElementById(
                "businessForm"
            )
            ?.reset();

        await loadAll();

        alert(
            "Business created successfully."
        );
    } catch (error) {
        console.error(
            "Create business error:",
            error
        );

        showMessage(
            "businessMessage",
            error.message,
            "error"
        );
    }
}

function openBusinessModal() {
    const modal =
        document.getElementById(
            "businessModal"
        );

    if (modal) {
        modal.classList.remove(
            "hidden"
        );
    }
}

function closeBusinessModal() {
    const modal =
        document.getElementById(
            "businessModal"
        );

    if (modal) {
        modal.classList.add(
            "hidden"
        );
    }
}

async function changeBusiness(event) {
    activeBusinessId =
        event.target.value;

    localStorage.setItem(
        "activeBusinessId",
        activeBusinessId
    );

    updateBusinessDisplay();

    await loadAll();
}

/* =====================================================
   DATE
===================================================== */

function updateDateDisplay() {
    setText(
        "todayDate",
        formatDate(
            currentDate
        )
    );

    setValue(
        "globalDate",
        currentDate
    );
}

function changeGlobalDate(event) {
    currentDate =
        event.target.value;

    if (!currentDate) {
        currentDate =
            today();
    }

    localStorage.setItem(
        "stockSystemDate",
        currentDate
    );

    updateDateDisplay();

    loadAll();
}

/* =====================================================
   NAVIGATION
===================================================== */

function setupNavigation() {
    document
        .querySelectorAll(
            ".nav-item"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    const targetId =
                        button.dataset
                            .section;

                    const targetSection =
                        document.getElementById(
                            targetId
                        );

                    console.log(
                        "Navigation:",
                        targetId,
                        targetSection
                    );

                    if (
                        !targetSection
                    ) {
                        console.error(
                            `Section #${targetId} not found`
                        );

                        return;
                    }

                    document
                        .querySelectorAll(
                            ".nav-item"
                        )
                        .forEach(
                            btn =>
                                btn.classList.remove(
                                    "active"
                                )
                        );

                    document
                        .querySelectorAll(
                            ".page-section"
                        )
                        .forEach(
                            section =>
                                section.classList.remove(
                                    "active-section"
                                )
                        );

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

                    if (
                        pageTitle
                    ) {
                        pageTitle.textContent =
                            button.textContent.trim();
                    }

                    window.scrollTo({
                        top: 0,
                        behavior:
                            "smooth"
                    });
                }
            );
        });
}

/* =====================================================
   PRODUCTS
===================================================== */

async function loadProducts() {
    if (!requireBusiness()) {
        return;
    }

    try {
        const data =
            await apiRequest(
                `/api/products?${getBusinessQuery()}`
            );

        products =
            data.products || [];

        renderProducts();
        populateProductSelects();
    } catch (error) {
        console.error(
            "Products error:",
            error
        );
    }
}

function renderProducts() {
    const tbody =
        document.getElementById(
            "productsTableBody"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML =
        "";

    if (!products.length) {
        tbody.innerHTML =
            `
            <tr>
                <td colspan="6">
                    No products found.
                </td>
            </tr>
            `;

        return;
    }

    products.forEach(
        product => {
            const tr =
                document.createElement(
                    "tr"
                );

            tr.innerHTML =
                `
                <td>${product.id}</td>

                <td>
                    ${escapeHtml(
                        product.name
                    )}
                </td>

                <td>
                    KES ${money(
                        product.selling_price
                    )}
                </td>

                <td>
                    KES ${money(
                        product.purchase_price
                    )}
                </td>

                <td>
                    ${
                        Number(
                            product.selling_price
                        ) -
                        Number(
                            product.purchase_price
                        )
                    }
                </td>

                <td>
                    <button
                        class="btn-danger btn-small"
                        onclick="deleteProduct(${product.id})"
                    >
                        Delete
                    </button>
                </td>
                `;

            tbody.appendChild(
                tr
            );
        }
    );
}

async function addProduct(event) {
    event.preventDefault();

    if (!requireBusiness()) {
        return;
    }

    const name =
        getValue(
            "productName"
        ).trim();

    const sellingPrice =
        Number(
            getValue(
                "sellingPrice"
            )
        );

    const purchasePrice =
        Number(
            getValue(
                "purchasePrice"
            ) || 0
        );

    if (!name) {
        alert(
            "Enter a product name."
        );

        return;
    }

    if (
        !Number.isFinite(
            sellingPrice
        ) ||
        sellingPrice < 0
    ) {
        alert(
            "Enter a valid selling price."
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
                        business_id:
                            Number(
                                activeBusinessId
                            ),
                        name,
                        selling_price:
                            sellingPrice,
                        purchase_price:
                            purchasePrice
                    })
            }
        );

        document
            .getElementById(
                "productForm"
            )
            ?.reset();

        await loadProducts();
        await loadDailyStock();

        alert(
            "Product added successfully."
        );
    } catch (error) {
        console.error(
            "Add product:",
            error
        );

        alert(
            error.message
        );
    }
}

async function deleteProduct(
    productId
) {
    if (!requireBusiness()) {
        return;
    }

    if (
        !confirm(
            "Delete this product?"
        )
    ) {
        return;
    }

    try {
        await apiRequest(
            `/api/products/${productId}?${getBusinessQuery()}`,
            {
                method: "DELETE"
            }
        );

        await loadProducts();
    } catch (error) {
        console.error(
            "Delete product:",
            error
        );

        alert(
            error.message
        );
    }
}

function populateProductSelects() {
    document
        .querySelectorAll(
            ".product-select"
        )
        .forEach(
            select => {
                const oldValue =
                    select.value;

                select.innerHTML =
                    `
                    <option value="">
                        Select product
                    </option>
                    `;

                products.forEach(
                    product => {
                        const option =
                            document.createElement(
                                "option"
                            );

                        option.value =
                            product.id;

                        option.textContent =
                            `${product.name} - KES ${product.selling_price}`;

                        if (
                            String(
                                product.id
                            ) ===
                            String(
                                oldValue
                            )
                        ) {
                            option.selected =
                                true;
                        }

                        select.appendChild(
                            option
                        );
                    }
                );
            }
        );
}

/* =====================================================
   OPENING STOCK
===================================================== */

async function loadOpeningStock() {
    if (!requireBusiness()) {
        return;
    }

    try {
        const data =
            await apiRequest(
                `/api/opening-stock?${getBusinessQuery()}&date=${encodeURIComponent(currentDate)}`
            );

        renderOpeningStock(
            data.stock || []
        );
    } catch (error) {
        console.error(
            "Opening stock error:",
            error
        );
    }
}

function renderOpeningStock(
    stock
) {
    const tbody =
        document.getElementById(
            "openingStockTableBody"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML =
        "";

    products.forEach(
        product => {
            const existing =
                stock.find(
                    item =>
                        Number(
                            item.product_id
                        ) ===
                        Number(
                            product.id
                        )
                );

            const tr =
                document.createElement(
                    "tr"
                );

            tr.innerHTML =
                `
                <td>
                    ${escapeHtml(
                        product.name
                    )}
                </td>

                <td>
                    <input
                        type="number"
                        min="0"
                        step="1"
                        class="opening-quantity"
                        data-product-id="${product.id}"
                        value="${
                            existing
                                ? existing.opening_quantity
                                : 0
                        }"
                    >
                </td>

                <td>
                    KES ${money(
                        product.selling_price
                    )}
                </td>

                <td>
                    <button
                        class="primary-button btn-small"
                        onclick="saveOpeningStock(${product.id})"
                    >
                        Save
                    </button>
                </td>
                `;

            tbody.appendChild(
                tr
            );
        }
    );
}

async function saveOpeningStock(
    productId
) {
    if (!requireBusiness()) {
        return;
    }

    const input =
        document.querySelector(
            `.opening-quantity[data-product-id="${productId}"]`
        );

    const quantity =
        Number(
            input?.value || 0
        );

    try {
        await apiRequest(
            "/api/opening-stock",
            {
                method: "POST",
                body:
                    JSON.stringify({
                        business_id:
                            Number(
                                activeBusinessId
                            ),
                        date:
                            currentDate,
                        product_id:
                            productId,
                        quantity
                    })
            }
        );

        await loadOpeningStock();
        await loadDailyStock();

        alert(
            "Opening stock saved."
        );
    } catch (error) {
        console.error(
            "Save opening stock:",
            error
        );

        alert(
            error.message
        );
    }
}

/* =====================================================
   DAILY STOCK
===================================================== */

async function loadDailyStock() {
    if (!requireBusiness()) {
        return;
    }

    try {
        const data =
            await apiRequest(
                `/api/daily-stock?${getBusinessQuery()}&date=${encodeURIComponent(currentDate)}`
            );

        dailyStock =
            data.stock || [];

        renderDailyStock();
    } catch (error) {
        console.error(
            "Failed to load daily stock:",
            error
        );
    }
}

function renderDailyStock() {
    const tbody =
        document.getElementById(
            "dailyStockTableBody"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML =
        "";

    products.forEach(
        product => {
            const row =
                dailyStock.find(
                    item =>
                        Number(
                            item.product_id
                        ) ===
                        Number(
                            product.id
                        )
                );

            const tr =
                document.createElement(
                    "tr"
                );

            const opening =
                row
                    ? Number(
                        row.opening_quantity
                    )
                    : 0;

            const additions =
                row
                    ? Number(
                        row.additions
                    )
                    : 0;

            const closing =
                row
                    ? Number(
                        row.closing_quantity
                    )
                    : 0;

            const sold =
                opening +
                additions -
                closing;

            const sales =
                sold *
                Number(
                    product.selling_price
                );

            tr.innerHTML =
                `
                <td>
                    ${escapeHtml(
                        product.name
                    )}
                </td>

                <td>
                    <input
                        type="number"
                        min="0"
                        class="daily-opening"
                        data-product-id="${product.id}"
                        value="${opening}"
                    >
                </td>

                <td>
                    <input
                        type="number"
                        min="0"
                        class="daily-additions"
                        data-product-id="${product.id}"
                        value="${additions}"
                    >
                </td>

                <td>
                    <input
                        type="number"
                        min="0"
                        class="daily-closing"
                        data-product-id="${product.id}"
                        value="${closing}"
                    >
                </td>

                <td>
                    ${number(sold)}
                </td>

                <td>
                    KES ${money(sales)}
                </td>

                <td>
                    <button
                        class="primary-button btn-small"
                        onclick="saveDailyStock(${product.id})"
                    >
                        Save
                    </button>
                </td>
                `;

            tbody.appendChild(
                tr
            );
        }
    );
}

async function saveDailyStock(
    productId
) {
    if (!requireBusiness()) {
        return;
    }

    const opening =
        Number(
            document.querySelector(
                `.daily-opening[data-product-id="${productId}"]`
            )?.value || 0
        );

    const additions =
        Number(
            document.querySelector(
                `.daily-additions[data-product-id="${productId}"]`
            )?.value || 0
        );

    const closing =
        Number(
            document.querySelector(
                `.daily-closing[data-product-id="${productId}"]`
            )?.value || 0
        );

    const sold =
        opening +
        additions -
        closing;

    if (sold < 0) {
        alert(
            "Closing stock cannot be greater than opening stock plus additions."
        );

        return;
    }

    try {
        await apiRequest(
            "/api/daily-stock",
            {
                method: "POST",
                body:
                    JSON.stringify({
                        business_id:
                            Number(
                                activeBusinessId
                            ),
                        date:
                            currentDate,
                        product_id:
                            productId,
                        opening_quantity:
                            opening,
                        additions,
                        closing_quantity:
                            closing
                    })
            }
        );

        await loadDailyStock();
        await loadDashboard();

        alert(
            "Daily stock saved."
        );
    } catch (error) {
        console.error(
            "Save daily stock:",
            error
        );

        alert(
            error.message
        );
    }
}

/* =====================================================
   SALES
===================================================== */

function addSaleLine() {
    const container =
        document.getElementById(
            "saleLines"
        );

    if (!container) {
        return;
    }

    const line =
        document.createElement(
            "div"
        );

    line.className =
        "sale-line";

    line.innerHTML =
        `
        <select class="sale-product product-select">
            <option value="">
                Select product
            </option>
        </select>

        <input
            type="number"
            min="1"
            step="1"
            value="1"
            class="sale-quantity"
            placeholder="Qty"
        >

        <input
            type="number"
            min="0"
            step="0.01"
            class="sale-price"
            placeholder="Price"
        >

        <span class="sale-line-total">
            KES 0.00
        </span>

        <button
            type="button"
            class="remove-sale-line btn-danger"
        >
            ×
        </button>
        `;

    container.appendChild(
        line
    );

    const select =
        line.querySelector(
            ".sale-product"
        );

    products.forEach(
        product => {
            const option =
                document.createElement(
                    "option"
                );

            option.value =
                product.id;

            option.textContent =
                `${product.name} - KES ${product.selling_price}`;

            select.appendChild(
                option
            );
        }
    );

    select.addEventListener(
        "change",
        () => {
            const product =
                products.find(
                    item =>
                        String(
                            item.id
                        ) ===
                        String(
                            select.value
                        )
                );

            const price =
                line.querySelector(
                    ".sale-price"
                );

            if (
                product &&
                price
            ) {
                price.value =
                    product.selling_price;
            }

            calculateSaleTotal();
        }
    );

    line.querySelector(
        ".sale-quantity"
    ).addEventListener(
        "input",
        calculateSaleTotal
    );

    line.querySelector(
        ".sale-price"
    ).addEventListener(
        "input",
        calculateSaleTotal
    );

    line.querySelector(
        ".remove-sale-line"
    ).addEventListener(
        "click",
        () => {
            line.remove();
            calculateSaleTotal();
        }
    );

    calculateSaleTotal();
}

function calculateSaleTotal() {
    let total = 0;

    document
        .querySelectorAll(
            ".sale-line"
        )
        .forEach(
            line => {
                const quantity =
                    Number(
                        line.querySelector(
                            ".sale-quantity"
                        )?.value || 0
                    );

                const price =
                    Number(
                        line.querySelector(
                            ".sale-price"
                        )?.value || 0
                    );

                const lineTotal =
                    quantity *
                    price;

                total +=
                    lineTotal;

                const totalElement =
                    line.querySelector(
                        ".sale-line-total"
                    );

                if (
                    totalElement
                ) {
                    totalElement.textContent =
                        `KES ${money(
                            lineTotal
                        )}`;
                }
            }
        );

    setText(
        "saleGrandTotal",
        `KES ${money(total)}`
    );

    setText(
        "salesTotal",
        `KES ${money(total)}`
    );

    return total;
}

function collectSaleItems() {
    const items = [];

    document
        .querySelectorAll(
            ".sale-line"
        )
        .forEach(
            line => {
                const productId =
                    Number(
                        line.querySelector(
                            ".sale-product"
                        )?.value || 0
                    );

                const quantity =
                    Number(
                        line.querySelector(
                            ".sale-quantity"
                        )?.value || 0
                    );

                const price =
                    Number(
                        line.querySelector(
                            ".sale-price"
                        )?.value || 0
                    );

                if (
                    productId &&
                    quantity > 0
                ) {
                    items.push({
                        product_id:
                            productId,
                        quantity,
                        selling_price:
                            price
                    });
                }
            }
        );

    return items;
}

async function completeSale(
    event
) {
    event.preventDefault();

    if (!requireBusiness()) {
        return;
    }

    const items =
        collectSaleItems();

    if (!items.length) {
        alert(
            "Add at least one sale item."
        );

        return;
    }

    const paymentMethod =
        getValue(
            "paymentMethod"
        ) ||
        getValue(
            "salePaymentMethod"
        ) ||
        "CASH";

    try {
        const data =
            await apiRequest(
                "/api/sales",
                {
                    method: "POST",
                    body:
                        JSON.stringify({
                            business_id:
                                Number(
                                    activeBusinessId
                                ),
                            date:
                                currentDate,
                            payment_method:
                                paymentMethod,
                            items
                        })
                }
            );

        await loadSales();
        await loadDashboard();

        clearSaleForm();

        setText(
            "lastReceiptNumber",
            data.receiptNumber ||
                ""
        );

        alert(
            `Sale completed. Receipt: ${data.receiptNumber}`
        );
    } catch (error) {
        console.error(
            "Complete sale:",
            error
        );

        alert(
            error.message
        );
    }
}

function clearSaleForm() {
    const container =
        document.getElementById(
            "saleLines"
        );

    if (container) {
        container.innerHTML =
            "";
    }

    addSaleLine();

    const form =
        document.getElementById(
            "salesForm"
        );

    if (form) {
        form.reset();
    }

    calculateSaleTotal();
}

async function loadSales() {
    if (!requireBusiness()) {
        return;
    }

    try {
        const data =
            await apiRequest(
                `/api/sales?${getBusinessQuery()}&date=${encodeURIComponent(currentDate)}`
            );

        sales =
            data.sales || [];

        renderSales();
    } catch (error) {
        console.error(
            "Sales error:",
            error
        );
    }
}

function renderSales() {
    const tbody =
        document.getElementById(
            "salesTableBody"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML =
        "";

    if (!sales.length) {
        tbody.innerHTML =
            `
            <tr>
                <td colspan="6">
                    No sales recorded.
                </td>
            </tr>
            `;

        return;
    }

    sales.forEach(
        sale => {
            const tr =
                document.createElement(
                    "tr"
                );

            tr.innerHTML =
                `
                <td>
                    ${escapeHtml(
                        sale.receipt_number
                    )}
                </td>

                <td>
                    ${formatDate(
                        sale.date
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        sale.payment_method
                    )}
                </td>

                <td>
                    KES ${money(
                        sale.total_amount
                    )}
                </td>

                <td>
                    ${formatDate(
                        sale.created_at?.split(
                            " "
                        )[0]
                    )}
                </td>

                <td>
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
                </td>
                `;

            tbody.appendChild(
                tr
            );
        }
    );
}

async function deleteSale(
    saleId
) {
    if (!requireBusiness()) {
        return;
    }

    if (
        !confirm(
            "Delete this sale?"
        )
    ) {
        return;
    }

    try {
        await apiRequest(
            `/api/sales/${saleId}?${getBusinessQuery()}`,
            {
                method: "DELETE"
            }
        );

        await loadSales();
        await loadDashboard();

        alert(
            "Sale deleted."
        );
    } catch (error) {
        console.error(
            "Delete sale:",
            error
        );

        alert(
            error.message
        );
    }
}

async function printReceipt(
    saleId
) {
    if (!requireBusiness()) {
        return;
    }

    try {
        const data =
            await apiRequest(
                `/api/sales/${saleId}?${getBusinessQuery()}`
            );

        renderReceipt(
            data.sale,
            data.items || []
        );

        window.print();
    } catch (error) {
        console.error(
            "Print receipt:",
            error
        );

        alert(
            error.message
        );
    }
}

function renderReceipt(
    sale,
    items
) {
    const receipt =
        document.getElementById(
            "receiptPrint"
        );

    if (!receipt) {
        return;
    }

    const business =
        businesses.find(
            item =>
                String(
                    item.id
                ) ===
                String(
                    activeBusinessId
                )
        );

    receipt.innerHTML =
        `
        <div class="receipt-header">
            <h2>
                ${escapeHtml(
                    business
                        ?.business_name ||
                        "Business"
                )}
            </h2>

            <p>
                ${escapeHtml(
                    business
                        ?.phone ||
                        ""
                )}
            </p>

            <p>
                ${escapeHtml(
                    business
                        ?.location ||
                        ""
                )}
            </p>

            <h3>
                RECEIPT
            </h3>
        </div>

        <div class="receipt-info">
            <p>
                <strong>Receipt:</strong>
                ${escapeHtml(
                    sale.receipt_number
                )}
            </p>

            <p>
                <strong>Date:</strong>
                ${formatDate(
                    sale.date
                )}
            </p>

            <p>
                <strong>Payment:</strong>
                ${escapeHtml(
                    sale.payment_method
                )}
            </p>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                </tr>
            </thead>

            <tbody>
                ${items
                    .map(
                        item =>
                            `
                            <tr>
                                <td>
                                    ${escapeHtml(
                                        item.name
                                    )}
                                </td>

                                <td>
                                    ${number(
                                        item.quantity
                                    )}
                                </td>

                                <td>
                                    ${money(
                                        item.selling_price
                                    )}
                                </td>

                                <td>
                                    ${money(
                                        item.total
                                    )}
                                </td>
                            </tr>
                            `
                    )
                    .join("")}
            </tbody>
        </table>

        <div class="receipt-total">
            TOTAL:
            KES ${money(
                sale.total_amount
            )}
        </div>

        <p class="receipt-thank-you">
            Thank you for your business.
        </p>
        `;
}

/* =====================================================
   PURCHASES
===================================================== */

async function loadPurchases() {
    if (!requireBusiness()) {
        return;
    }

    try {
        const data =
            await apiRequest(
                `/api/purchases?${getBusinessQuery()}&date=${encodeURIComponent(currentDate)}`
            );

        purchases =
            data.purchases || [];

        renderPurchases();
    } catch (error) {
        console.error(
            "Purchases error:",
            error
        );
    }
}

function renderPurchases() {
    const tbody =
        document.getElementById(
            "purchasesTableBody"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML =
        "";

    if (!purchases.length) {
        tbody.innerHTML =
            `
            <tr>
                <td colspan="7">
                    No purchases recorded.
                </td>
            </tr>
            `;

        return;
    }

    purchases.forEach(
        purchase => {
            const tr =
                document.createElement(
                    "tr"
                );

            tr.innerHTML =
                `
                <td>
                    ${formatDate(
                        purchase.date
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        purchase.name ||
                        ""
                    )}
                </td>

                <td>
                    ${number(
                        purchase.quantity
                    )}
                </td>

                <td>
                    KES ${money(
                        purchase.amount
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        purchase.supplier ||
                        ""
                    )}
                </td>

                <td>
                    <button
                        class="btn-danger btn-small"
                        onclick="deletePurchase(${purchase.id})"
                    >
                        Delete
                    </button>
                </td>
                `;

            tbody.appendChild(
                tr
            );
        }
    );
}

async function addPurchase(
    event
) {
    event.preventDefault();

    if (!requireBusiness()) {
        return;
    }

    const productId =
        Number(
            getValue(
                "purchaseProduct"
            )
        );

    const quantity =
        Number(
            getValue(
                "purchaseQuantity"
            ) || 0
        );

    const amount =
        Number(
            getValue(
                "purchaseAmount"
            ) || 0
        );

    const supplier =
        getValue(
            "purchaseSupplier"
        ).trim();

    if (!productId) {
        alert(
            "Select a product."
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
                        business_id:
                            Number(
                                activeBusinessId
                            ),
                        date:
                            currentDate,
                        product_id:
                            productId,
                        quantity,
                        amount,
                        supplier
                    })
            }
        );

        document
            .getElementById(
                "purchaseForm"
            )
            ?.reset();

        await loadPurchases();
        await loadDailyStock();
        await loadDashboard();

        alert(
            "Purchase saved."
        );
    } catch (error) {
        console.error(
            "Add purchase:",
            error
        );

        alert(
            error.message
        );
    }
}

async function deletePurchase(
    purchaseId
) {
    if (!requireBusiness()) {
        return;
    }

    if (
        !confirm(
            "Delete this purchase?"
        )
    ) {
        return;
    }

    try {
        await apiRequest(
            `/api/purchases/${purchaseId}?${getBusinessQuery()}`,
            {
                method: "DELETE"
            }
        );

        await loadPurchases();

        alert(
            "Purchase deleted."
        );
    } catch (error) {
        console.error(
            "Delete purchase:",
            error
        );

        alert(
            error.message
        );
    }
}

/* =====================================================
   EXPENSES
===================================================== */

async function loadExpenses() {
    if (!requireBusiness()) {
        return;
    }

    try {
        const data =
            await apiRequest(
                `/api/expenses?${getBusinessQuery()}&date=${encodeURIComponent(currentDate)}`
            );

        expenses =
            data.expenses || [];

        renderExpenses();
    } catch (error) {
        console.error(
            "Expenses error:",
            error
        );
    }
}

function renderExpenses() {
    const tbody =
        document.getElementById(
            "expensesTableBody"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML =
        "";

    if (!expenses.length) {
        tbody.innerHTML =
            `
            <tr>
                <td colspan="4">
                    No expenses recorded.
                </td>
            </tr>
            `;

        return;
    }

    expenses.forEach(
        expense => {
            const tr =
                document.createElement(
                    "tr"
                );

            tr.innerHTML =
                `
                <td>
                    ${formatDate(
                        expense.date
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        expense.description
                    )}
                </td>

                <td>
                    KES ${money(
                        expense.amount
                    )}
                </td>

                <td>
                    <button
                        class="btn-danger btn-small"
                        onclick="deleteExpense(${expense.id})"
                    >
                        Delete
                    </button>
                </td>
                `;

            tbody.appendChild(
                tr
            );
        }
    );
}

async function addExpense(
    event
) {
    event.preventDefault();

    if (!requireBusiness()) {
        return;
    }

    const description =
        getValue(
            "expenseDescription"
        ).trim();

    const amount =
        Number(
            getValue(
                "expenseAmount"
            ) || 0
        );

    if (!description) {
        alert(
            "Enter an expense description."
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
                        business_id:
                            Number(
                                activeBusinessId
                            ),
                        date:
                            currentDate,
                        description,
                        amount
                    })
            }
        );

        document
            .getElementById(
                "expenseForm"
            )
            ?.reset();

        await loadExpenses();
        await loadDashboard();
        await loadReconciliation();

        alert(
            "Expense saved."
        );
    } catch (error) {
        console.error(
            "Add expense:",
            error
        );

        alert(
            error.message
        );
    }
}

async function deleteExpense(
    expenseId
) {
    if (!requireBusiness()) {
        return;
    }

    if (
        !confirm(
            "Delete this expense?"
        )
    ) {
        return;
    }

    try {
        await apiRequest(
            `/api/expenses/${expenseId}?${getBusinessQuery()}`,
            {
                method: "DELETE"
            }
        );

        await loadExpenses();
        await loadDashboard();
        await loadReconciliation();

        alert(
            "Expense deleted."
        );
    } catch (error) {
        console.error(
            "Delete expense:",
            error
        );

        alert(
            error.message
        );
    }
}

/* =====================================================
   RECONCILIATION
===================================================== */

async function loadReconciliation() {
    if (!requireBusiness()) {
        return;
    }

    try {
        const data =
            await apiRequest(
                `/api/reconciliation?${getBusinessQuery()}&date=${encodeURIComponent(currentDate)}`
            );

        setValue(
            "cashAtHand",
            data.cash_at_hand
        );

        setValue(
            "tillAmount",
            data.till_amount
        );

        setText(
            "reconciliationSales",
            `KES ${money(
                data.total_sales
            )}`
        );

        setText(
            "reconciliationExpenses",
            `KES ${money(
                data.total_expenses
            )}`
        );

        setText(
            "reconciliationPurchases",
            `KES ${money(
                data.total_purchases
            )}`
        );

        setText(
            "expectedMoney",
            `KES ${money(
                data.expected_money
            )}`
        );

        setText(
            "actualMoney",
            `KES ${money(
                data.actual_money
            )}`
        );

        setText(
            "difference",
            `KES ${money(
                data.difference
            )}`
        );

        setText(
            "reconciliationStatus",
            data.status
        );
    } catch (error) {
        console.error(
            "Reconciliation error:",
            error
        );
    }
}

async function saveReconciliation(
    event
) {
    event.preventDefault();

    if (!requireBusiness()) {
        return;
    }

    const cash =
        Number(
            getValue(
                "cashAtHand"
            ) || 0
        );

    const till =
        Number(
            getValue(
                "tillAmount"
            ) || 0
        );

    try {
        const data =
            await apiRequest(
                "/api/reconciliation",
                {
                    method: "POST",
                    body:
                        JSON.stringify({
                            business_id:
                                Number(
                                    activeBusinessId
                                ),
                            date:
                                currentDate,
                            cash_at_hand:
                                cash,
                            till_amount:
                                till
                        })
                }
            );

        await loadReconciliation();
        await loadDashboard();

        alert(
            `Reconciliation saved: ${data.status}`
        );
    } catch (error) {
        console.error(
            "Save reconciliation:",
            error
        );

        alert(
            error.message
        );
    }
}

/* =====================================================
   REPORTS
===================================================== */

async function loadDailyReport() {
    if (!requireBusiness()) {
        return;
    }

    try {
        const data =
            await apiRequest(
                `/api/reports/daily?${getBusinessQuery()}&date=${encodeURIComponent(currentDate)}`
            );

        renderDailyReport(
            data
        );
    } catch (error) {
        console.error(
            "Daily report error:",
            error
        );
    }
}

function renderDailyReport(
    data
) {
    const tbody =
        document.getElementById(
            "reportTableBody"
        );

    if (tbody) {
        tbody.innerHTML =
            "";

        (
            data.products ||
            []
        ).forEach(
            product => {
                const tr =
                    document.createElement(
                        "tr"
                    );

                tr.innerHTML =
                    `
                    <td>
                        ${escapeHtml(
                            product.name
                        )}
                    </td>

                    <td>
                        ${number(
                            product.opening_quantity
                        )}
                    </td>

                    <td>
                        ${number(
                            product.additions
                        )}
                    </td>

                    <td>
                        ${number(
                            product.closing_quantity
                        )}
                    </td>

                    <td>
                        ${number(
                            product.units_sold
                        )}
                    </td>

                    <td>
                        ${number(
                            product.recorded_units_sold
                        )}
                    </td>

                    <td>
                        ${number(
                            product.stock_variance
                        )}
                    </td>

                    <td>
                        KES ${money(
                            product.receipt_sales
                        )}
                    </td>

                    <td>
                        KES ${money(
                            product.gross_profit
                        )}
                    </td>
                    `;

                tbody.appendChild(
                    tr
                );
            }
        );
    }

    setText(
        "reportStockSales",
        `KES ${money(
            data.totals?.stockSales
        )}`
    );

    setText(
        "reportReceiptSales",
        `KES ${money(
            data.totals?.receiptSales
        )}`
    );

    setText(
        "reportStockUnits",
        number(
            data.totals?.stockUnits
        )
    );

    setText(
        "reportReceiptUnits",
        number(
            data.totals?.receiptUnits
        )
    );

    setText(
        "reportCost",
        `KES ${money(
            data.totals?.cost
        )}`
    );

    setText(
        "reportProfit",
        `KES ${money(
            data.totals?.profit
        )}`
    );

    setText(
        "reportVariance",
        number(
            data.totals?.stockVariance
        )
    );
}

/* =====================================================
   DASHBOARD
===================================================== */

async function loadDashboard() {
    if (!requireBusiness()) {
        return;
    }

    try {
        const data =
            await apiRequest(
                `/api/dashboard?${getBusinessQuery()}&date=${encodeURIComponent(currentDate)}`
            );

        setText(
            "dashboardProducts",
            number(
                data.products
            )
        );

        setText(
            "dashboardSales",
            `KES ${money(
                data.sales
            )}`
        );

        setText(
            "dashboardExpenses",
            `KES ${money(
                data.expenses
            )}`
        );

        setText(
            "dashboardDifference",
            number(
                data.difference
            )
        );
    } catch (error) {
        console.error(
            "Dashboard error:",
            error
        );
    }
}

/* =====================================================
   PRODUCT SELECT SETUP
===================================================== */

function populateAllProductSelects() {
    const selectors = [
        "purchaseProduct"
    ];

    selectors.forEach(
        id => {
            const select =
                document.getElementById(
                    id
                );

            if (!select) {
                return;
            }

            const oldValue =
                select.value;

            select.innerHTML =
                `
                <option value="">
                    Select product
                </option>
                `;

            products.forEach(
                product => {
                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        product.id;

                    option.textContent =
                        product.name;

                    select.appendChild(
                        option
                    );
                }
            );

            select.value =
                oldValue;
        }
    );
}

/* =====================================================
   ESCAPE HTML
===================================================== */

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
   LOAD EVERYTHING
===================================================== */

async function loadAll() {
    if (!activeBusinessId) {
        console.log(
            "No business selected."
        );

        return;
    }

    updateDateDisplay();

    updateBusinessDisplay();

    await loadProducts();

    populateAllProductSelects();

    await loadOpeningStock();

    await loadDailyStock();

    await loadSales();

    await loadPurchases();

    await loadExpenses();

    await loadReconciliation();

    await loadDailyReport();

    await loadDashboard();
}

/* =====================================================
   EVENT LISTENERS
===================================================== */

function setupEventListeners() {
    const businessSelect =
        document.getElementById(
            "businessSelect"
        );

    if (businessSelect) {
        businessSelect.addEventListener(
            "change",
            changeBusiness
        );
    }

    const addBusinessButton =
        document.getElementById(
            "addBusinessButton"
        );

    if (
        addBusinessButton
    ) {
        addBusinessButton.addEventListener(
            "click",
            openBusinessModal
        );
    }

    const closeBusiness =
        document.getElementById(
            "closeBusinessModal"
        );

    if (closeBusiness) {
        closeBusiness.addEventListener(
            "click",
            closeBusinessModal
        );
    }

    const cancelBusiness =
        document.getElementById(
            "cancelBusinessButton"
        );

    if (cancelBusiness) {
        cancelBusiness.addEventListener(
            "click",
            closeBusinessModal
        );
    }

    const overlay =
        document.getElementById(
            "businessModalOverlay"
        );

    if (overlay) {
        overlay.addEventListener(
            "click",
            closeBusinessModal
        );
    }

    const businessForm =
        document.getElementById(
            "businessForm"
        );

    if (businessForm) {
        businessForm.addEventListener(
            "submit",
            createBusiness
        );
    }

    const globalDate =
        document.getElementById(
            "globalDate"
        );

    if (globalDate) {
        globalDate.addEventListener(
            "change",
            changeGlobalDate
        );
    }

    const productForm =
        document.getElementById(
            "productForm"
        );

    if (productForm) {
        productForm.addEventListener(
            "submit",
            addProduct
        );
    }

    const salesForm =
        document.getElementById(
            "salesForm"
        );

    if (salesForm) {
        salesForm.addEventListener(
            "submit",
            completeSale
        );
    }

    const addSaleButton =
        document.getElementById(
            "addSaleLine"
        );

    if (addSaleButton) {
        addSaleButton.addEventListener(
            "click",
            addSaleLine
        );
    }

    const purchaseForm =
        document.getElementById(
            "purchaseForm"
        );

    if (purchaseForm) {
        purchaseForm.addEventListener(
            "submit",
            addPurchase
        );
    }

    const expenseForm =
        document.getElementById(
            "expenseForm"
        );

    if (expenseForm) {
        expenseForm.addEventListener(
            "submit",
            addExpense
        );
    }

    const reconciliationForm =
        document.getElementById(
            "reconciliationForm"
        );

    if (
        reconciliationForm
    ) {
        reconciliationForm.addEventListener(
            "submit",
            saveReconciliation
        );
    }

    [
        "cashAtHand",
        "tillAmount"
    ].forEach(
        id => {
            const input =
                document.getElementById(
                    id
                );

            if (input) {
                input.addEventListener(
                    "input",
                    loadReconciliation
                );
            }
        }
    );
}

/* =====================================================
   START
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async () => {
        setupNavigation();

        setupEventListeners();

        updateDateDisplay();

        await loadBusinesses();

        if (
            activeBusinessId
        ) {
            await loadAll();
        }

        if (
            document.getElementById(
                "saleLines"
            ) &&
            !document.querySelector(
                ".sale-line"
            )
        ) {
            addSaleLine();
        }

        console.log(
            "Stock System JavaScript is connected!"
        );
    }
);
