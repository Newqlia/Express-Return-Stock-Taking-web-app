console.log("Stock System JavaScript is connected!");


// ==========================================
// BACKEND
// ==========================================

const API_URL =
    "https://stunning-space-bassoon-69v9r76w4q5525xq6-3000.app.github.dev";


// ==========================================
// DATA
// ==========================================

let products = [];

let currentDate =
    new Date().toISOString().split("T")[0];


// ==========================================
// ELEMENTS
// ==========================================

const productForm =
    document.getElementById("productForm");

const productsTableBody =
    document.getElementById(
        "productsTableBody"
    );

const formMessage =
    document.getElementById(
        "formMessage"
    );

const refreshProducts =
    document.getElementById(
        "refreshProducts"
    );


// ==========================================
// DATE
// ==========================================

const stockDate =
    document.getElementById("stockDate");


if (stockDate) {

    stockDate.value =
        currentDate;

}


const todayDate =
    document.getElementById("todayDate");


if (todayDate) {

    todayDate.textContent =
        new Date().toLocaleDateString(
            "en-KE",
            {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric"
            }
        );

}


// ==========================================
// NAVIGATION
// ==========================================

const navItems =
    document.querySelectorAll(
        ".nav-item"
    );

const pageSections =
    document.querySelectorAll(
        ".page-section"
    );

const pageTitle =
    document.getElementById(
        "pageTitle"
    );


navItems.forEach((button) => {

    button.addEventListener(
        "click",
        async () => {

            const sectionId =
                button.dataset.section;


            navItems.forEach((item) => {

                item.classList.remove(
                    "active"
                );

            });


            pageSections.forEach(
                (section) => {

                    section.classList.remove(
                        "active-section"
                    );

                }
            );


            button.classList.add(
                "active"
            );


            const section =
                document.getElementById(
                    sectionId
                );


            if (section) {

                section.classList.add(
                    "active-section"
                );

            }


            pageTitle.textContent =
                button.textContent.trim();


            if (
                sectionId ===
                "opening-stock"
            ) {

                await loadOpeningStock();

            }


            if (
                sectionId ===
                "daily-stock"
            ) {

                await loadDailyStock();

            }


            if (
                sectionId ===
                "sales"
            ) {

                await loadSales();

            }


            if (
                sectionId ===
                "purchases"
            ) {

                await loadPurchases();

            }


            if (
                sectionId ===
                "expenses"
            ) {

                await loadExpenses();

            }


            if (
                sectionId ===
                "reports"
            ) {

                await loadDailyReport();

            }

        }
    );

});


// ==========================================
// LOAD PRODUCTS
// ==========================================

async function loadProducts() {

    try {

        const response =
            await fetch(
                `${API_URL}/api/products`
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to load products"
            );

        }


        products =
            data.products || [];


        displayProducts(products);

        updateDashboard();


    } catch (error) {

        console.error(error);


        productsTableBody.innerHTML = `
            <tr>
                <td colspan="5"
                    class="empty-message">
                    Unable to connect to backend.
                </td>
            </tr>
        `;

    }

}


// ==========================================
// DISPLAY PRODUCTS
// ==========================================

function displayProducts(items) {

    if (!items.length) {

        productsTableBody.innerHTML = `
            <tr>
                <td colspan="5"
                    class="empty-message">
                    No products have been added yet.
                </td>
            </tr>
        `;

        return;

    }


    productsTableBody.innerHTML = "";


    items.forEach(
        (product, index) => {

            const profit =
                Number(
                    product.selling_price
                ) -
                Number(
                    product.purchase_price
                );


            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>

                <td>
                    <strong>
                        ${escapeHTML(
                            product.name
                        )}
                    </strong>
                </td>

                <td>
                    KES
                    ${Number(
                        product.selling_price
                    ).toFixed(2)}
                </td>

                <td>
                    KES
                    ${Number(
                        product.purchase_price
                    ).toFixed(2)}
                </td>

                <td>
                    KES
                    ${profit.toFixed(2)}
                </td>

            `;


            productsTableBody.appendChild(
                row
            );

        }
    );

}


// ==========================================
// ADD PRODUCT
// ==========================================

productForm.addEventListener(
    "submit",
    async (event) => {

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


        try {

            formMessage.textContent =
                "Saving product...";


            const response =
                await fetch(
                    `${API_URL}/api/products`,
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            name,

                            sellingPrice,

                            purchasePrice

                        })

                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message
                );

            }


            formMessage.textContent =
                "Product added successfully.";


            productForm.reset();


            await loadProducts();


        } catch (error) {

            console.error(error);

            formMessage.textContent =
                error.message ||
                "Failed to save product.";

        }

    }
);


// ==========================================
// OPENING STOCK
// ==========================================

async function loadOpeningStock() {

    try {

        const response =
            await fetch(
                `${API_URL}/api/opening-stock?date=${currentDate}`
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message
            );

        }


        const table =
            document.getElementById(
                "openingStockTable"
            );


        table.innerHTML = "";


        data.products.forEach(
            (product) => {

                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>
                        <strong>
                            ${escapeHTML(
                                product.name
                            )}
                        </strong>
                    </td>

                    <td>

                        <input
                            class="stock-input"
                            type="number"
                            min="0"
                            value="${product.opening_quantity}"
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

                `;


                table.appendChild(row);

            }
        );


    } catch (error) {

        console.error(error);

    }

}


async function saveOpeningStock(
    productId
) {

    const input =
        document.getElementById(
            `opening-${productId}`
        );


    const quantity =
        Number(input.value);


    try {

        const response =
            await fetch(
                `${API_URL}/api/opening-stock`,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        date: currentDate,

                        productId,

                        quantity

                    })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message
            );

        }


        alert(
            "Opening stock saved successfully."
        );


    } catch (error) {

        alert(
            error.message
        );

    }

}


// ==========================================
// DAILY STOCK
// ==========================================

async function loadDailyStock() {

    try {

        const date =
            stockDate.value ||
            currentDate;


        const response =
            await fetch(
                `${API_URL}/api/daily-stock?date=${date}`
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message
            );

        }


        const table =
            document.getElementById(
                "dailyStockTable"
            );


        table.innerHTML = "";


        data.products.forEach(
            (product) => {

                const available =
                    Number(
                        product.opening_quantity
                    ) +
                    Number(
                        product.additions
                    );


                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>
                        <strong>
                            ${escapeHTML(
                                product.name
                            )}
                        </strong>
                    </td>

                    <td>
                        ${product.opening_quantity}
                    </td>

                    <td>

                        <input
                            class="stock-input"
                            type="number"
                            min="0"
                            value="${product.additions}"
                            id="additions-${product.id}"
                        >

                    </td>

                    <td>
                        <strong>
                            ${available}
                        </strong>
                    </td>

                    <td>

                        <input
                            class="stock-input"
                            type="number"
                            min="0"
                            value="${product.closing_quantity}"
                            id="closing-${product.id}"
                        >

                    </td>

                    <td>
                        <strong>
                            ${product.units_sold}
                        </strong>
                    </td>

                    <td>
                        <strong>
                            KES
                            ${Number(
                                product.sales
                            ).toFixed(2)}
                        </strong>
                    </td>

                `;


                row.addEventListener(
                    "change",
                    async () => {

                        const additions =
                            Number(
                                document.getElementById(
                                    `additions-${product.id}`
                                ).value
                            );


                        const closing =
                            Number(
                                document.getElementById(
                                    `closing-${product.id}`
                                ).value
                            );


                        await saveDailyStock(
                            date,
                            product.id,
                            additions,
                            closing
                        );

                    }
                );


                table.appendChild(row);

            }
        );


    } catch (error) {

        console.error(error);

    }

}


async function saveDailyStock(
    date,
    productId,
    additions,
    closingQuantity
) {

    try {

        const response =
            await fetch(
                `${API_URL}/api/daily-stock`,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        date,

                        productId,

                        additions,

                        closingQuantity

                    })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message
            );

        }


        await loadDailyStock();

        await updateDashboard();


    } catch (error) {

        alert(
            error.message
        );

    }

}


// ==========================================
// DATE CHANGE
// ==========================================

if (stockDate) {

    stockDate.addEventListener(
        "change",
        async () => {

            currentDate =
                stockDate.value;

            await loadDailyStock();

        }
    );

}


// ==========================================
// SALES
// ==========================================

async function loadSales() {

    try {

        const response =
            await fetch(
                `${API_URL}/api/sales?date=${currentDate}`
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message
            );

        }


        document.getElementById(
            "totalUnitsSold"
        ).textContent =
            data.units;


        document.getElementById(
            "totalSales"
        ).textContent =
            Number(
                data.total
            ).toFixed(2);


        document.getElementById(
            "dashboardSales"
        ).textContent =
            Number(
                data.total
            ).toFixed(2);


    } catch (error) {

        console.error(error);

    }

}


// ==========================================
// PURCHASES
// ==========================================

async function loadPurchases() {

    try {

        const response =
            await fetch(
                `${API_URL}/api/purchases?date=${currentDate}`
            );


        const data =
            await response.json();


        const container =
            document.querySelector(
                "#purchases .empty-state"
            );


        if (!container) {
            return;
        }


        if (!data.purchases.length) {

            container.innerHTML = `
                <strong>
                    No purchases recorded yet.
                </strong>

                <p>
                    Purchase records will appear here.
                </p>
            `;

            return;

        }


        container.innerHTML = "";


        data.purchases.forEach(
            (purchase) => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "expense-item";


                item.innerHTML = `

                    <strong>
                        ${escapeHTML(
                            purchase.name
                        )}
                        ×
                        ${purchase.quantity}
                    </strong>

                    <span>
                        KES
                        ${Number(
                            purchase.amount
                        ).toFixed(2)}
                    </span>

                `;


                container.appendChild(
                    item
                );

            }
        );


    } catch (error) {

        console.error(error);

    }

}


document
    .getElementById(
        "savePurchase"
    )
    .addEventListener(
        "click",
        async () => {

            const productId =
                document.getElementById(
                    "purchaseProduct"
                ).value;


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


            try {

                const response =
                    await fetch(
                        `${API_URL}/api/purchases`,
                        {

                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({

                                date:
                                    currentDate,

                                productId,

                                quantity,

                                amount

                            })

                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.message
                    );

                }


                document.getElementById(
                    "purchaseMessage"
                ).textContent =
                    "Purchase recorded successfully.";


                document.getElementById(
                    "purchaseQuantity"
                ).value = "";


                document.getElementById(
                    "purchaseAmount"
                ).value = "";


                await loadPurchases();

            } catch (error) {

                document.getElementById(
                    "purchaseMessage"
                ).textContent =
                    error.message;

            }

        }
    );


// ==========================================
// PURCHASE PRODUCT DROPDOWN
// ==========================================

function populatePurchaseProducts() {

    const select =
        document.getElementById(
            "purchaseProduct"
        );


    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            Select product
        </option>
    `;


    products.forEach(
        (product) => {

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

}


// ==========================================
// EXPENSES
// ==========================================

async function loadExpenses() {

    try {

        const response =
            await fetch(
                `${API_URL}/api/expenses?date=${currentDate}`
            );


        const data =
            await response.json();


        document.getElementById(
            "expenseTotal"
        ).textContent =
            Number(
                data.total
            ).toFixed(2);


        document.getElementById(
            "dashboardExpenses"
        ).textContent =
            Number(
                data.total
            ).toFixed(2);


        const container =
            document.getElementById(
                "expenseList"
            );


        if (!data.expenses.length) {

            container.innerHTML = `
                <div class="empty-state">
                    No expenses recorded yet.
                </div>
            `;

            return;

        }


        container.innerHTML = "";


        data.expenses.forEach(
            (expense) => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "expense-item";


                item.innerHTML = `

                    <strong>
                        ${escapeHTML(
                            expense.description
                        )}
                    </strong>

                    <span>
                        KES
                        ${Number(
                            expense.amount
                        ).toFixed(2)}
                    </span>

                `;


                container.appendChild(
                    item
                );

            }
        );


    } catch (error) {

        console.error(error);

    }

}


document
    .getElementById(
        "saveExpense"
    )
    .addEventListener(
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


            try {

                const response =
                    await fetch(
                        `${API_URL}/api/expenses`,
                        {

                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({

                                date:
                                    currentDate,

                                description,

                                amount

                            })

                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.message
                    );

                }


                document.getElementById(
                    "expenseMessage"
                ).textContent =
                    "Expense recorded successfully.";


                document.getElementById(
                    "expenseDescription"
                ).value = "";


                document.getElementById(
                    "expenseAmount"
                ).value = "";


                await loadExpenses();

            } catch (error) {

                document.getElementById(
                    "expenseMessage"
                ).textContent =
                    error.message;

            }

        }
    );


// ==========================================
// RECONCILIATION
// ==========================================

document
    .getElementById(
        "calculateReconciliation"
    )
    .addEventListener(
        "click",
        async () => {

            const cashAtHand =
                Number(
                    document.getElementById(
                        "cashAtHand"
                    ).value
                ) || 0;


            const tillAmount =
                Number(
                    document.getElementById(
                        "tillAmount"
                    ).value
                ) || 0;


            try {

                const response =
                    await fetch(
                        `${API_URL}/api/reconciliation`,
                        {

                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({

                                date:
                                    currentDate,

                                cashAtHand,

                                tillAmount

                            })

                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.message
                    );

                }


                const report =
                    data.report;


                document.getElementById(
                    "reconcileSales"
                ).value =
                    report.totalSales.toFixed(2);


                document.getElementById(
                    "reconcileExpenses"
                ).value =
                    report.expenses.toFixed(2);


                document.getElementById(
                    "reconcilePurchases"
                ).value =
                    report.purchases.toFixed(2);


                document.getElementById(
                    "expectedMoney"
                ).textContent =
                    report.expectedMoney.toFixed(2);


                document.getElementById(
                    "actualMoney"
                ).textContent =
                    report.actualMoney.toFixed(2);


                document.getElementById(
                    "moneyDifference"
                ).textContent =
                    report.difference.toFixed(2);


                document.getElementById(
                    "reconciliationStatus"
                ).textContent =
                    report.status;


                document.getElementById(
                    "dashboardDifference"
                ).textContent =
                    report.difference.toFixed(2);


            } catch (error) {

                alert(
                    error.message
                );

            }

        }
    );


// ==========================================
// DAILY REPORT
// ==========================================

async function loadDailyReport() {

    try {

        const response =
            await fetch(
                `${API_URL}/api/reports/daily?date=${currentDate}`
            );


        const data =
            await response.json();


        console.log(
            "Daily report:",
            data
        );


    } catch (error) {

        console.error(error);

    }

}


// ==========================================
// DASHBOARD
// ==========================================

async function updateDashboard() {

    document.getElementById(
        "dashboardProducts"
    ).textContent =
        products.length;


    await loadSales();

    await loadExpenses();

}


// ==========================================
// SECURITY
// ==========================================

function escapeHTML(text) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text;


    return div.innerHTML;

}


// ==========================================
// INITIALIZE
// ==========================================

async function initialize() {

    await loadProducts();

    populatePurchaseProducts();

    await loadSales();

    await loadExpenses();

    console.log(
        "Stock System initialized successfully."
    );

}


initialize();