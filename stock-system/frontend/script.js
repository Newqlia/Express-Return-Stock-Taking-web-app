const API_URL = (() => {
    const hostname = window.location.hostname;

    if (hostname.endsWith(".app.github.dev")) {
        return `${window.location.protocol}//${hostname.replace(
            /-\d+\.app\.github\.dev$/,
            "-3000.app.github.dev"
        )}`;
    }

    return "http://localhost:3000";
})();

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
let openingStock = [];
let dailyReportProducts = [];
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
        await loadOpeningStock();
        await loadDailyStock();
        await loadDailyReport();

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
            ".product-select, .sale-product"
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

/* =====================================================
   OPENING STOCK
===================================================== */

async function loadOpeningStock() {

    if (!requireBusiness()) {
        return;
    }

    try {

        const data = await apiRequest(
            `/api/opening-stock?${getBusinessQuery()}&date=${encodeURIComponent(currentDate)}`
        );

        openingStock = data.stock || [];

        renderOpeningStock(openingStock);

    } catch (error) {

        console.error(
            "Opening stock error:",
            error
        );

        const tbody =
            document.getElementById(
                "openingStockTableBody"
            );

        if (tbody) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="empty-message">
                        Failed to load opening stock:
                        ${escapeHtml(error.message)}
                    </td>
                </tr>
            `;

        }

    }

}


function renderOpeningStock(stock) {

    const tbody =
        document.getElementById(
            "openingStockTableBody"
        );

    if (!tbody) {
        console.error(
            "openingStockTableBody not found."
        );
        return;
    }

    tbody.innerHTML = "";

    if (!products.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="empty-message">
                    No products found for this business.
                </td>
            </tr>
        `;

        return;
    }

    products.forEach(product => {

        const existing =
            stock.find(
                item =>
                    Number(item.product_id) ===
                    Number(product.id)
            );

        const openingQuantity =
            existing
                ? Number(existing.opening_quantity || 0)
                : 0;

        const tr =
            document.createElement("tr");

        tr.innerHTML = `
            <td>
                ${escapeHtml(product.name)}
            </td>

            <td>
                <input
                    type="number"
                    min="0"
                    step="1"
                    class="opening-quantity"
                    data-product-id="${product.id}"
                    value="${openingQuantity}"
                >
            </td>

            <td>
                <button
                    type="button"
                    class="primary-button btn-small"
                    onclick="saveOpeningStock(${product.id})"
                >
                    Save
                </button>
            </td>
        `;

        tbody.appendChild(tr);

    });

}


async function saveOpeningStock(productId) {

    if (!requireBusiness()) {
        return;
    }

    const input =
        document.querySelector(
            `.opening-quantity[data-product-id="${productId}"]`
        );

    if (!input) {

        alert(
            "Opening stock input was not found."
        );

        return;
    }

    const quantity =
        Number(input.value || 0);

    if (
        !Number.isFinite(quantity) ||
        quantity < 0
    ) {

        alert(
            "Enter a valid opening quantity."
        );

        return;
    }

    try {

        const data =
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
                                Number(productId),

                            quantity:
                                quantity
                        })
                }
            );

        console.log(
            "Opening stock saved:",
            data
        );

        await loadOpeningStock();

        await loadDailyStock();

        await loadDailyReport();

        await loadDashboard();

        alert(
            "Opening stock saved successfully."
        );

    } catch (error) {

        console.error(
            "Save opening stock error:",
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

        const data = await apiRequest(
            `/api/daily-stock?${getBusinessQuery()}&date=${encodeURIComponent(currentDate)}`
        );

        console.log("Daily stock loaded:", data);

        dailyStock = data.stock || data.dailyStock || [];

        renderDailyStock(dailyStock);

    } catch (error) {

        console.error(
            "Daily stock error:",
            error
        );

        const tbody =
            document.getElementById(
                "dailyStockTableBody"
            );

        if (tbody) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="11" class="empty-message">
                        Failed to load daily stock:
                        ${escapeHtml(error.message)}
                    </td>
                </tr>
            `;

        }

    }

}


function renderDailyStock(stock) {

    const tbody =
        document.getElementById(
            "dailyStockTableBody"
        );

    if (!tbody) {

        console.error(
            "dailyStockTableBody not found."
        );

        return;
    }

    tbody.innerHTML = "";

    if (!products.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="empty-message">
                    No products found.
                </td>
            </tr>
        `;

        return;
    }


    products.forEach(product => {

        const existing =
            stock.find(
                item =>
                    Number(item.product_id) ===
                    Number(product.id)
            );


        let opening = 0;
        let additions = 0;
        let closing = 0;


        if (existing) {

            opening =
                Number(
                    existing.opening_quantity || 0
                );

            additions =
                Number(
                    existing.additions || 0
                );

            closing =
                Number(
                    existing.closing_quantity || 0
                );

        } else {

            /*
             * If there is no daily stock record,
             * try to get the opening stock saved
             * for this date.
             */

            const openingRecord =
                awaitFindOpeningStock(
                    product.id
                );

            opening =
                Number(
                    openingRecord || 0
                );

        }


        const unitsSold =
            opening +
            additions -
            closing;

        const reportProduct =
            dailyReportProducts.find(
                item => Number(item.id) === Number(product.id)
            );

        const receiptSold =
            Number(reportProduct?.recorded_units_sold || 0);

        const available = opening + additions;


        const sales =
            unitsSold *
            Number(
                product.selling_price || 0
            );


        const tr =
            document.createElement("tr");


        tr.innerHTML = `

            <td>
                ${escapeHtml(product.name)}
            </td>


            <td class="daily-available">
                ${number(available)}
            </td>


            <td>

                <input
                    type="number"
                    min="0"
                    step="1"
                    class="daily-opening"
                    data-product-id="${product.id}"
                    value="${opening}"
                >

            </td>


            <td>

                <input
                    type="number"
                    min="0"
                    step="1"
                    class="daily-additions"
                    data-product-id="${product.id}"
                    value="${additions}"
                >

            </td>


            <td>

                <input
                    type="number"
                    min="0"
                    step="1"
                    class="daily-closing"
                    data-product-id="${product.id}"
                    value="${closing}"
                >

            </td>


            <td class="daily-units-sold">
                ${number(unitsSold)}
            </td>


            <td class="daily-receipt-sold">
                ${number(receiptSold)}
            </td>


            <td class="daily-variance">
                ${number(unitsSold - receiptSold)}
            </td>


            <td>
                KES ${money(product.selling_price)}
            </td>


            <td class="daily-sales">
                KES ${money(sales)}
            </td>


            <td>

                <button
                    type="button"
                    class="primary-button btn-small"
                    onclick="saveDailyStock(${product.id})"
                >
                    Save
                </button>

            </td>

        `;


        tbody.appendChild(tr);


        const openingInput =
            tr.querySelector(
                ".daily-opening"
            );

        const additionsInput =
            tr.querySelector(
                ".daily-additions"
            );

        const closingInput =
            tr.querySelector(
                ".daily-closing"
            );


        function updateRow() {

            const openingValue =
                Number(
                    openingInput.value || 0
                );

            const additionsValue =
                Number(
                    additionsInput.value || 0
                );

            const closingValue =
                Number(
                    closingInput.value || 0
                );


            const sold =
                openingValue +
                additionsValue -
                closingValue;

            const availableElement =
                tr.querySelector(".daily-available");

            const varianceElement =
                tr.querySelector(".daily-variance");


            const salesAmount =
                sold *
                Number(
                    product.selling_price || 0
                );


            const soldElement =
                tr.querySelector(
                    ".daily-units-sold"
                );

            const salesElement =
                tr.querySelector(
                    ".daily-sales"
                );


            if (soldElement) {

                soldElement.textContent =
                    number(sold);

            }

            if (availableElement) {
                availableElement.textContent =
                    number(openingValue + additionsValue);
            }

            if (varianceElement) {
                varianceElement.textContent =
                    number(sold - receiptSold);
            }


            if (salesElement) {

                salesElement.textContent =
                    `KES ${money(salesAmount)}`;

            }

        }


        openingInput.addEventListener(
            "input",
            updateRow
        );


        additionsInput.addEventListener(
            "input",
            updateRow
        );


        closingInput.addEventListener(
            "input",
            updateRow
        );

    });

}


/*
 * Find opening stock for a product.
 * This is used when today's daily-stock
 * record does not yet exist.
 */
function awaitFindOpeningStock(productId) {

    const record =
        openingStock.find(
            item =>
                Number(item.product_id) ===
                Number(productId)
        );

    if (record) {

        return Number(
            record.opening_quantity || 0
        );

    }

    return 0;

}


/*
 * Save one product's daily stock.
 */
async function saveDailyStock(productId) {

    if (!requireBusiness()) {
        return;
    }


    const openingInput =
        document.querySelector(
            `.daily-opening[data-product-id="${productId}"]`
        );


    const additionsInput =
        document.querySelector(
            `.daily-additions[data-product-id="${productId}"]`
        );


    const closingInput =
        document.querySelector(
            `.daily-closing[data-product-id="${productId}"]`
        );


    if (
        !openingInput ||
        !additionsInput ||
        !closingInput
    ) {

        alert(
            "Stock input fields could not be found."
        );

        return;

    }


    const opening =
        Number(
            openingInput.value || 0
        );


    const additions =
        Number(
            additionsInput.value || 0
        );


    const closing =
        Number(
            closingInput.value || 0
        );


    if (
        !Number.isFinite(opening) ||
        !Number.isFinite(additions) ||
        !Number.isFinite(closing)
    ) {

        alert(
            "Enter valid stock quantities."
        );

        return;

    }


    if (
        opening < 0 ||
        additions < 0 ||
        closing < 0
    ) {

        alert(
            "Stock quantities cannot be negative."
        );

        return;

    }


    const available =
        opening +
        additions;


    if (closing > available) {

        alert(
            "Closing stock cannot be greater than opening stock plus additions."
        );

        return;

    }


    const unitsSold =
        available -
        closing;


    try {

        console.log(
            "Saving daily stock:",
            {
                business_id:
                    Number(activeBusinessId),

                date:
                    currentDate,

                product_id:
                    Number(productId),

                opening_quantity:
                    opening,

                additions:
                    additions,

                closing_quantity:
                    closing
            }
        );


        const data =
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
                                Number(
                                    productId
                                ),

                            opening_quantity:
                                opening,

                            additions:
                                additions,

                            closing_quantity:
                                closing

                        })
                }
            );


        console.log(
            "Daily stock saved:",
            data
        );


        alert(
            `Stock saved successfully.\n\nUnits sold: ${unitsSold}`
        );


        /*
         * Reload the stock table.
         */
        await loadDailyStock();


        /*
         * Reload dashboard values.
         */
        await loadDashboard();


        /*
         * Reload report.
         */
        await loadDailyReport();


    } catch (error) {

        console.error(
            "Save daily stock error:",
            error
        );


        alert(
            "Could not save stock.\n\n" +
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
            "saleItems"
        );

    const firstLine =
        container?.querySelector(
            ".sale-line"
        );

    if (!container || !firstLine) {
        return;
    }

    const line = firstLine.cloneNode(true);
    line.querySelector(".sale-product").value = "";
    line.querySelector(".sale-quantity").value = "1";
    line.querySelector(".sale-line-total").value = "KES 0.00";
    container.appendChild(line);

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

                const productId =
                    line.querySelector(
                        ".sale-product"
                    )?.value;

                const product =
                    products.find(
                        item =>
                            String(item.id) ===
                            String(productId)
                    );

                const price = Number(
                    product?.selling_price || 0
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
                    totalElement.value =
                        `KES ${money(lineTotal)}`;
                }
            }
        );

    setText(
        "saleTotal",
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

                if (
                    productId &&
                    quantity > 0
                ) {
                    items.push({
                        product_id:
                            productId,
                        quantity
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
            "saleItems"
        );

    if (container) {
        const lines =
            container.querySelectorAll(
                ".sale-line"
            );

        lines.forEach((line, index) => {
            if (index > 0) {
                line.remove();
            }
        });
    }

    const form =
        document.getElementById(
            "saleForm"
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
    const list =
        document.getElementById(
            "salesList"
        );

    if (!list) {
        return;
    }

    list.innerHTML = "";

    if (!sales.length) {
        list.innerHTML = `
            <div class="empty-state">
                No sales recorded yet.
            </div>
        `;
        setText("totalSales", "0.00");

        return;
    }

    let totalSales = 0;

    sales.forEach(
        sale => {
            totalSales += Number(sale.total_amount || 0);

            const item =
                document.createElement(
                    "article"
                );

            item.className = "transaction-row";
            item.innerHTML =
                `
                <div class="transaction-main">
                    <strong>${escapeHtml(sale.receipt_number)}</strong>
                    <span>${formatDate(sale.date)} - ${escapeHtml(sale.payment_method)}</span>
                </div>
                <strong>KES ${money(sale.total_amount)}</strong>
                <div class="transaction-actions">
                    <button
                        type="button"
                        class="secondary-button btn-small"
                        onclick="printReceipt(${sale.id})"
                    >
                        Print
                    </button>

                    <button
                        type="button"
                        class="btn-danger btn-small"
                        onclick="deleteSale(${sale.id})"
                    >
                        Delete
                    </button>
                </div>
                `;

            list.appendChild(
                item
            );
        }
    );

    setText("totalSales", money(totalSales));
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
    const list =
        document.getElementById(
            "purchaseList"
        );

    if (!list) {
        return;
    }

    list.innerHTML = "";

    if (!purchases.length) {
        list.innerHTML = `
            <div class="empty-state">
                No purchases recorded yet.
            </div>
        `;
        setText("purchaseTotal", "0.00");

        return;
    }

    let totalPurchases = 0;

    purchases.forEach(
        purchase => {
            totalPurchases += Number(purchase.amount || 0);

            const item =
                document.createElement(
                    "div"
                );

            item.className = "transaction-row";
            item.innerHTML =
                `
                <div class="transaction-main">
                    <strong>${escapeHtml(purchase.name || "Purchase")}</strong>
                    <span>${formatDate(purchase.date)} - ${number(purchase.quantity)} units${purchase.supplier ? ` - ${escapeHtml(purchase.supplier)}` : ""}</span>
                </div>
                <strong>KES ${money(purchase.amount)}</strong>
                <div class="transaction-actions">
                    <button
                        type="button"
                        class="btn-danger btn-small"
                        onclick="deletePurchase(${purchase.id})"
                    >
                        Delete
                    </button>
                </div>
                `;

            list.appendChild(
                item
            );
        }
    );

    setText("purchaseTotal", money(totalPurchases));
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

    if (!Number.isFinite(quantity) || quantity <= 0) {
        alert("Enter a valid purchase quantity.");
        return;
    }

    if (!Number.isFinite(amount) || amount < 0) {
        alert("Enter a valid purchase amount.");
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

        setValue("purchaseProduct", "");
        setValue("purchaseQuantity", "");
        setValue("purchaseAmount", "");

        await loadPurchases();
        await loadDailyStock();
        await loadDashboard();

        showMessage(
            "purchaseMessage",
            "Purchase saved successfully."
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
    const list =
        document.getElementById(
            "expenseList"
        );

    if (!list) {
        return;
    }

    list.innerHTML = "";

    if (!expenses.length) {
        list.innerHTML = `
            <div class="empty-state">
                No expenses recorded yet.
            </div>
        `;
        setText("expenseTotal", "0.00");

        return;
    }

    let totalExpenses = 0;

    expenses.forEach(
        expense => {
            totalExpenses += Number(expense.amount || 0);

            const item =
                document.createElement(
                    "div"
                );

            item.className = "transaction-row";
            item.innerHTML =
                `
                <div class="transaction-main">
                    <strong>${escapeHtml(expense.description)}</strong>
                    <span>${formatDate(expense.date)}</span>
                </div>
                <strong>KES ${money(expense.amount)}</strong>
                <div class="transaction-actions">
                    <button
                        type="button"
                        class="btn-danger btn-small"
                        onclick="deleteExpense(${expense.id})"
                    >
                        Delete
                    </button>
                </div>
                `;

            list.appendChild(
                item
            );
        }
    );

    setText("expenseTotal", money(totalExpenses));
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

    if (!Number.isFinite(amount) || amount <= 0) {
        alert("Enter a valid expense amount.");
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

        setValue("expenseDescription", "");
        setValue("expenseAmount", "");

        await loadExpenses();
        await loadDashboard();
        await loadReconciliation();

        showMessage(
            "expenseMessage",
            "Expense saved successfully."
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
            "reconcileSales",
            money(data.total_sales)
        );

        setText(
            "reconcileExpenses",
            money(data.total_expenses)
        );

        setText(
            "reconcilePurchases",
            money(data.total_purchases)
        );

        setText(
            "expectedMoney",
            money(data.expected_money)
        );

        setText(
            "actualMoney",
            money(data.actual_money)
        );

        setText(
            "moneyDifference",
            money(data.difference)
        );

        setText(
            "reconciliationStatus",
            data.status
        );

        const status = document.getElementById("reconciliationStatus");
        if (status) {
            status.className = `status-badge ${String(data.status || "balanced").toLowerCase()}`;
        }
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
                "reportTable"
        );

            dailyReportProducts = data.products || [];
            renderDailyStock(dailyStock);

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
                            Number(product.opening_quantity || 0) +
                            Number(product.additions || 0)
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
        number(data.totals?.receiptUnits)
    );

    setText(
        "reportUnits",
        number(data.totals?.receiptUnits)
    );
    setText(
        "reportSales",
        money(data.totals?.receiptSales)
    );

    setText(
        "reportCost",
        money(data.totals?.cost)
    );

    setText(
        "reportProfit",
        money(data.totals?.profit)
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
            money(data.sales)
        );

        setText(
            "dashboardExpenses",
            money(data.expenses)
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
    const purchaseSelect = document.getElementById("purchaseProduct");
    const selects = [
        ...document.querySelectorAll(".sale-product"),
        ...(purchaseSelect ? [purchaseSelect] : [])
    ];

    selects.forEach(select => {
        const oldValue = select.value;
        select.innerHTML = `<option value="">Select product</option>`;

        products.forEach(product => {
            const option = document.createElement("option");
            option.value = product.id;
            option.textContent = `${product.name} - KES ${money(product.selling_price)}`;
            select.appendChild(option);
        });

        select.value = oldValue;
    });
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

    ["stockDate", "dailyStockDate", "reconciliationDate", "reportDate"].forEach(id => {
        const input = document.getElementById(id);
        if (!input) {
            return;
        }

        input.value = currentDate;
        input.addEventListener("change", event => {
            if (!event.target.value) {
                return;
            }

            currentDate = event.target.value;
            localStorage.setItem("stockSystemDate", currentDate);
            setValue("globalDate", currentDate);
            updateDateDisplay();
            loadAll();
        });
    });

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

    const refreshProducts = document.getElementById("refreshProducts");
    if (refreshProducts) {
        refreshProducts.addEventListener("click", loadProducts);
    }

    const salesForm =
        document.getElementById(
            "saleForm"
        );

    if (salesForm) {
        salesForm.addEventListener(
            "submit",
            completeSale
        );
    }

    const addSaleButton =
        document.getElementById(
            "addSaleItem"
        );

    if (addSaleButton) {
        addSaleButton.addEventListener(
            "click",
            addSaleLine
        );
    }

    const saleItems =
        document.getElementById(
            "saleItems"
        );

    if (saleItems) {
        saleItems.addEventListener(
            "input",
            calculateSaleTotal
        );
        saleItems.addEventListener(
            "change",
            calculateSaleTotal
        );
        saleItems.addEventListener(
            "click",
            event => {
                if (!event.target.closest(".remove-sale-line")) {
                    return;
                }

                const lines =
                    saleItems.querySelectorAll(".sale-line");

                if (lines.length > 1) {
                    event.target.closest(".sale-line").remove();
                } else {
                    lines[0].querySelector(".sale-product").value = "";
                    lines[0].querySelector(".sale-quantity").value = "1";
                }

                calculateSaleTotal();
            }
        );
    }

    const purchaseButton =
        document.getElementById(
            "savePurchase"
        );

    if (purchaseButton) {
        purchaseButton.addEventListener(
            "click",
            addPurchase
        );
    }

    const expenseButton =
        document.getElementById(
            "saveExpense"
        );

    if (expenseButton) {
        expenseButton.addEventListener(
            "click",
            addExpense
        );
    }

    const reconciliationButton =
        document.getElementById(
            "calculateReconciliation"
        );

    if (reconciliationButton) {
        reconciliationButton.addEventListener(
            "click",
            saveReconciliation
        );
    }

    const reportButton = document.getElementById("loadReport");
    if (reportButton) {
        reportButton.addEventListener("click", () => {
            const reportDate = getValue("reportDate");
            if (reportDate) {
                currentDate = reportDate;
                localStorage.setItem("stockSystemDate", currentDate);
                setValue("globalDate", currentDate);
                updateDateDisplay();
                loadAll();
            }
        });
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

        calculateSaleTotal();

        console.log(
            "Stock System JavaScript is connected!"
        );
    }
);
