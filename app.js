// --- DATA STATE ---
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let settings = JSON.parse(localStorage.getItem('settings')) || {
    currency: 'USD',
    language: 'English',
    limitEnabled: false,
    dailyLimit: 0,
    userName: 'Sultan Mujtaba Ahmed Awan'
};
if (!settings.currency) settings.currency = 'USD';
if (!settings.language) settings.language = 'English';

let currentViewMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

// --- DOM ELEMENTS ---
// Navigation
const navItems = document.querySelectorAll('.nav-item');
const tabViews = document.querySelectorAll('.tab-view');
const fabBtn = document.getElementById('fabBtn');
const monthSelector = document.getElementById('monthSelector');

// Home / Summary
const balanceAmount = document.getElementById('balanceAmount');
const incomeAmount = document.getElementById('incomeAmount');
const expenseAmount = document.getElementById('expenseAmount');
const transactionsList = document.getElementById('transactionsList');
const searchInput = document.getElementById('searchInput');
const homeUserName = document.getElementById('homeUserName');

// Modal
const transactionModal = document.getElementById('transactionModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const transactionForm = document.getElementById('transactionForm');
const typeIncome = document.getElementById('typeIncome');
const typeExpense = document.getElementById('typeExpense');
const categorySelect = document.getElementById('category');
const customCategoryGroup = document.getElementById('customCategoryGroup');
const customCategoryInput = document.getElementById('customCategory');
const transactionDateInput = document.getElementById('transactionDate');

// Settings & Profile
const openSettingsBtn = document.getElementById('openSettingsBtn');
const backToProfileBtn = document.getElementById('backToProfileBtn');
const languageSelect = document.getElementById('languageSelect');
const languageValDisplay = document.getElementById('languageValDisplay');
const currencySelect = document.getElementById('currencySelect');
const currencyValDisplay = document.getElementById('currencyValDisplay');
const openLimitBtn = document.getElementById('openLimitBtn');
const deleteDataBtn = document.getElementById('deleteDataBtn');
const exportDataBtn = document.getElementById('exportDataBtn');
const soundEffectToggle = document.getElementById('soundEffectToggle');
const comingSoonItems = document.querySelectorAll('.coming-soon');
const userNameInput = document.getElementById('userNameInput');

// Limits Modal
const limitModal = document.getElementById('limitModal');
const closeLimitBtn = document.getElementById('closeLimitBtn');
const limitToggle = document.getElementById('limitToggle');
const limitInputGroup = document.getElementById('limitInputGroup');
const dailyLimitAmount = document.getElementById('dailyLimitAmount');
const saveLimitBtn = document.getElementById('saveLimitBtn');
const openLimitBtnRep = document.getElementById('openLimitBtnRep');

// Calculator Modal
const openCalculatorBtn = document.getElementById('openCalculatorBtn');
const calcModal = document.getElementById('calcModal');
const closeCalcBtn = document.getElementById('closeCalcBtn');
const calcScreen = document.getElementById('calcScreen');

// Chart Elements
const expenseChartCanvas = document.getElementById('expenseChart');
const chartCenterText = document.getElementById('chartCenterText');
const tabExpenses = document.getElementById('tabExpenses');
const tabIncome = document.getElementById('tabIncome');
const categoryBarsContainer = document.getElementById('categoryBarsContainer');
let expenseChartInstance = null;
let currentChartType = 'expense'; // 'expense' or 'income'

// Reports Elements
const reportMonthLabel = document.getElementById('reportMonthLabel');
const repExpenses = document.getElementById('repExpenses');
const repIncome = document.getElementById('repIncome');
const repBalance = document.getElementById('repBalance');
const repBudgetLimit = document.getElementById('repBudgetLimit');
const repBudgetExpense = document.getElementById('repBudgetExpense');
const repBudgetRem = document.getElementById('repBudgetRem');

// --- CATEGORIES ---
const incomeCategories = [
    { id: 'salary', label: 'Salary', icon: 'bx-briefcase', colorClass: 'cat-icon-salary', colorHex: '#10b981' },
    { id: 'investment', label: 'Investment', icon: 'bx-line-chart', colorClass: 'cat-icon-investment', colorHex: '#3b82f6' },
    { id: 'part-time', label: 'Part-time', icon: 'bx-time', colorClass: 'cat-icon-part-time', colorHex: '#8b5cf6' },
    { id: 'bonus', label: 'Bonus', icon: 'bx-gift', colorClass: 'cat-icon-bonus', colorHex: '#facc15' },
    { id: 'custom', label: 'Custom (+)', icon: 'bx-plus-circle', colorClass: 'cat-icon-custom', colorHex: '#a8a29e' }
];

const expenseCategories = [
    { id: 'food', label: 'Food', icon: 'bx-restaurant', colorClass: 'cat-icon-food', colorHex: '#10b981' },
    { id: 'transport', label: 'Transportation', icon: 'bx-car', colorClass: 'cat-icon-transport', colorHex: '#f472b6' },
    { id: 'utilities', label: 'Utilities', icon: 'bx-bulb', colorClass: 'cat-icon-utilities', colorHex: '#06b6d4' },
    { id: 'entertainment', label: 'Entertainment', icon: 'bx-movie-play', colorClass: 'cat-icon-entertainment', colorHex: '#ec4899' },
    { id: 'custom', label: 'Custom (+)', icon: 'bx-plus-circle', colorClass: 'cat-icon-custom', colorHex: '#a8a29e' }
];

// --- CORE FUNCTIONS ---
const formatCurrency = (amount) => {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: settings.currency }).format(amount);
};

const formatNumber = (amount) => {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(amount);
};

const saveState = () => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('settings', JSON.stringify(settings));
};

const getCategoryData = (type, categoryId, customName = '') => {
    const list = type === 'income' ? incomeCategories : expenseCategories;
    let cat = list.find(c => c.id === categoryId);
    if (categoryId === 'custom') return { label: customName || 'Custom', icon: 'bx-category', colorClass: 'cat-icon-custom', colorHex: '#a8a29e' };
    return cat || { label: 'Other', icon: 'bx-category', colorClass: 'cat-icon-custom', colorHex: '#a8a29e' };
};

// Check Daily Limit
const checkDailyLimit = (dateStr) => {
    if (!settings.limitEnabled || settings.dailyLimit <= 0) return false;
    
    const todayExpenses = transactions
        .filter(t => t.type === 'expense' && t.date === dateStr)
        .reduce((sum, t) => sum + t.amount, 0);
        
    return todayExpenses > settings.dailyLimit;
};

// Month Filtering Logic
const getFilteredTransactions = () => {
    return transactions.filter(t => t.date.startsWith(currentViewMonth));
};

const populateMonthSelector = () => {
    const months = new Set();
    months.add(currentViewMonth); 
    transactions.forEach(t => { months.add(t.date.substring(0, 7)); });
    const sortedMonths = Array.from(months).sort().reverse();
    
    monthSelector.innerHTML = '';
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    sortedMonths.forEach(m => {
        const [year, monthNum] = m.split('-');
        const label = `${monthNames[parseInt(monthNum) - 1]} ${year}`;
        const option = document.createElement('option');
        option.value = m;
        option.innerText = label;
        if (m === currentViewMonth) option.selected = true;
        monthSelector.appendChild(option);
    });
};

monthSelector.addEventListener('change', (e) => {
    currentViewMonth = e.target.value;
    updateAllViews();
});

const updateAllViews = () => {
    updateHomeSummary();
    renderTransactions(searchInput.value);
    renderReports();
    renderChart();
};

// --- UI UPDATES ---
const updateHomeSummary = () => {
    const currentMonthData = getFilteredTransactions();
    const total = currentMonthData.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
    const income = currentMonthData.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = currentMonthData.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

    balanceAmount.innerText = formatCurrency(total);
    incomeAmount.innerText = formatCurrency(income);
    expenseAmount.innerText = formatCurrency(expense);
};

const renderTransactions = (filterText = '') => {
    transactionsList.innerHTML = '';
    const currentMonthData = getFilteredTransactions();
    const filtered = currentMonthData.filter(t => t.description.toLowerCase().includes(filterText.toLowerCase()));
    
    if (filtered.length === 0) {
        transactionsList.innerHTML = '<div class="empty-state">No transactions found.</div>';
        return;
    }

    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(transaction => {
        const catData = getCategoryData(transaction.type, transaction.category, transaction.customCategoryName);
        const isLimitExceeded = transaction.type === 'expense' && checkDailyLimit(transaction.date);
        
        const item = document.createElement('div');
        item.className = `transaction-item ${isLimitExceeded ? 'limit-exceeded' : ''}`;
        
        const amountClass = transaction.type === 'income' ? 'income' : (isLimitExceeded ? 'expense exceeded' : 'expense');
        const sign = transaction.type === 'income' ? '+' : '-';

        item.innerHTML = `
            <div class="transaction-info">
                <div class="transaction-icon"><i class='bx ${catData.icon} ${catData.colorClass}'></i></div>
                <div class="transaction-details">
                    <h4>${transaction.description}</h4>
                    <p>${catData.label} • ${transaction.date}</p>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap: 10px;">
                <div class="transaction-amount ${amountClass}">${sign}${formatCurrency(transaction.amount)}</div>
                <button onclick="deleteTransaction(${transaction.id})" style="background:none; border:none; color:var(--text-muted); font-size:1.2rem; cursor:pointer;"><i class='bx bx-trash'></i></button>
            </div>
        `;
        transactionsList.appendChild(item);
    });
};

window.deleteTransaction = (id) => {
    if(confirm("Are you sure you want to delete this transaction?")) {
        transactions = transactions.filter(t => t.id !== id);
        saveState();
        populateMonthSelector();
        updateAllViews();
    }
};

// --- REPORTS VIEW ---
const renderReports = () => {
    const currentMonthData = getFilteredTransactions();
    const income = currentMonthData.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = currentMonthData.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const balance = income - expense;

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthNum = parseInt(currentViewMonth.split('-')[1]);
    reportMonthLabel.innerText = monthNames[monthNum - 1];

    repExpenses.innerText = formatNumber(expense);
    repIncome.innerText = formatNumber(income);
    repBalance.innerText = formatNumber(balance);

    repBudgetLimit.innerText = settings.limitEnabled ? formatNumber(settings.dailyLimit * 30) : '0';
    repBudgetExpense.innerText = formatNumber(expense);
    repBudgetRem.innerText = settings.limitEnabled ? formatNumber((settings.dailyLimit * 30) - expense) : formatNumber(-expense);
};


// --- CHART VIEW ---
tabExpenses.addEventListener('click', () => { currentChartType = 'expense'; tabExpenses.classList.add('active'); tabIncome.classList.remove('active'); renderChart(); });
tabIncome.addEventListener('click', () => { currentChartType = 'income'; tabIncome.classList.add('active'); tabExpenses.classList.remove('active'); renderChart(); });

const renderChart = () => {
    const ctx = expenseChartCanvas.getContext('2d');
    
    const byCategory = {};
    let totalAmount = 0;
    
    const currentMonthData = getFilteredTransactions();
    currentMonthData.filter(t => t.type === currentChartType).forEach(t => {
        const cat = getCategoryData(currentChartType, t.category, t.customCategoryName);
        if(!byCategory[cat.label]) byCategory[cat.label] = { amount: 0, icon: cat.icon, color: cat.colorHex };
        byCategory[cat.label].amount += t.amount;
        totalAmount += t.amount;
    });

    chartCenterText.innerText = formatNumber(totalAmount);
    categoryBarsContainer.innerHTML = '';

    const sortedCats = Object.keys(byCategory).sort((a,b) => byCategory[b].amount - byCategory[a].amount);
    
    sortedCats.forEach(catLabel => {
        const data = byCategory[catLabel];
        const pct = totalAmount > 0 ? ((data.amount / totalAmount) * 100).toFixed(2) : 0;
        
        categoryBarsContainer.innerHTML += `
            <div class="cat-bar-item">
                <div class="cat-bar-icon" style="color:${data.color};"><i class='bx ${data.icon}'></i></div>
                <div class="cat-bar-content">
                    <div class="cat-bar-header">
                        <span>${catLabel}</span>
                        <div><span>${formatNumber(data.amount)}</span> <span class="cat-bar-pct">${pct}%</span></div>
                    </div>
                    <div class="cat-bar-track">
                        <div class="cat-bar-fill" style="width: ${pct}%; background-color: ${data.color};"></div>
                    </div>
                </div>
            </div>
        `;
    });

    const labels = sortedCats;
    const data = sortedCats.map(l => byCategory[l].amount);
    const colors = sortedCats.map(l => byCategory[l].color);

    if (expenseChartInstance) expenseChartInstance.destroy();

    if (data.length === 0) {
        ctx.clearRect(0,0, expenseChartCanvas.width, expenseChartCanvas.height);
        return;
    }

    expenseChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 0,
                cutout: '75%'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            layout: { padding: 10 }
        }
    });
};

// --- NAVIGATION LOGIC ---
const switchView = (targetId) => {
    tabViews.forEach(view => view.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
};

navItems.forEach(item => {
    item.addEventListener('click', () => {
        // Prevent activation if it's the spacer
        if(item.classList.contains('nav-item-spacer')) return;
        
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        switchView(item.dataset.target);
    });
});

openSettingsBtn.addEventListener('click', () => switchView('view-settings'));
backToProfileBtn.addEventListener('click', () => switchView('view-profile'));

// --- MODAL & FORM LOGIC ---
const updateCategoryOptions = () => {
    const type = typeIncome.checked ? 'income' : 'expense';
    const categories = type === 'income' ? incomeCategories : expenseCategories;
    categorySelect.innerHTML = '';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id; option.innerText = cat.label;
        categorySelect.appendChild(option);
    });
    handleCategoryChange();
};

const handleCategoryChange = () => {
    if (categorySelect.value === 'custom') {
        customCategoryGroup.style.display = 'block'; customCategoryInput.required = true;
    } else {
        customCategoryGroup.style.display = 'none'; customCategoryInput.required = false; customCategoryInput.value = '';
    }
};

fabBtn.addEventListener('click', () => {
    transactionModal.classList.add('active');
    transactionDateInput.valueAsDate = new Date(); 
    updateCategoryOptions();
});

closeModalBtn.addEventListener('click', () => { transactionModal.classList.remove('active'); transactionForm.reset(); customCategoryGroup.style.display = 'none'; });
typeIncome.addEventListener('change', updateCategoryOptions);
typeExpense.addEventListener('change', updateCategoryOptions);
categorySelect.addEventListener('change', handleCategoryChange);
searchInput.addEventListener('input', (e) => renderTransactions(e.target.value));

transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('amount').value);
    const dateStr = transactionDateInput.value;
    const type = typeIncome.checked ? 'income' : 'expense';
    
    const transaction = {
        id: Date.now(),
        date: dateStr,
        type, amount,
        description: document.getElementById('description').value,
        category: categorySelect.value,
        customCategoryName: categorySelect.value === 'custom' ? customCategoryInput.value : null
    };

    transactions.push(transaction);
    saveState();
    
    if (type === 'expense' && checkDailyLimit(dateStr)) {
        alert('⚠️ WARNING: You have exceeded your daily expense limit!');
    }

    populateMonthSelector();
    
    const newTxMonth = dateStr.substring(0, 7);
    if (newTxMonth !== currentViewMonth) {
        currentViewMonth = newTxMonth;
        monthSelector.value = currentViewMonth;
    }

    updateAllViews();
    
    transactionModal.classList.remove('active');
    transactionForm.reset();
});

// --- SETTINGS LOGIC ---
const initSettings = () => {
    if (!settings.userName) settings.userName = 'Sultan Mujtaba Ahmed Awan';
    userNameInput.value = settings.userName;
    homeUserName.innerText = settings.userName;
    if (settings.soundEnabled === undefined) settings.soundEnabled = true;
    soundEffectToggle.checked = settings.soundEnabled;
    
    currencySelect.innerHTML = allCurrencies.map(c => `<option value="${c}">${c}</option>`).join('');
    currencySelect.value = settings.currency;
    currencyValDisplay.innerText = settings.currency;
    
    languageSelect.innerHTML = allLanguages.map(l => `<option value="${l}">${l}</option>`).join('');
    languageSelect.value = settings.language;
    languageValDisplay.innerText = settings.language;
};

userNameInput.addEventListener('input', (e) => {
    settings.userName = e.target.value || 'User';
    homeUserName.innerText = settings.userName;
    saveState();
});

languageSelect.addEventListener('change', (e) => {
    settings.language = e.target.value;
    languageValDisplay.innerText = settings.language;
    saveState();
    updateAllViews();
});

currencySelect.addEventListener('change', (e) => {
    settings.currency = e.target.value;
    currencyValDisplay.innerText = settings.currency;
    saveState();
    updateAllViews();
});

// Limit Modal Events
const showLimitModal = () => {
    limitModal.classList.add('active');
    limitToggle.checked = settings.limitEnabled;
    limitInputGroup.style.display = settings.limitEnabled ? 'block' : 'none';
    dailyLimitAmount.value = settings.dailyLimit || '';
};

if (openLimitBtn) openLimitBtn.addEventListener('click', showLimitModal);
if (openLimitBtnRep) openLimitBtnRep.addEventListener('click', showLimitModal);

closeLimitBtn.addEventListener('click', () => limitModal.classList.remove('active'));

limitToggle.addEventListener('change', (e) => {
    limitInputGroup.style.display = e.target.checked ? 'block' : 'none';
});

saveLimitBtn.addEventListener('click', () => {
    settings.limitEnabled = limitToggle.checked;
    settings.dailyLimit = parseFloat(dailyLimitAmount.value) || 0;
    saveState();
    updateAllViews();
    limitModal.classList.remove('active');
});

// Delete Data
deleteDataBtn.addEventListener('click', () => {
    if(confirm("Are you sure you want to delete ALL data? This cannot be undone.")) {
        transactions = [];
        saveState();
        populateMonthSelector();
        updateAllViews();
        alert("Data cleared successfully.");
    }
});

// Export Data
exportDataBtn.addEventListener('click', () => {
    if (transactions.length === 0) return alert("No data to export.");
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transactions, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = "money_tracker_backup.json";
    a.click();
});

// Sound Effect
soundEffectToggle.addEventListener('change', (e) => {
    settings.soundEnabled = e.target.checked;
    saveState();
});

// Coming Soon Alerts
comingSoonItems.forEach(item => {
    item.addEventListener('click', () => {
        alert("This feature is coming soon!");
    });
});

// Calculator Logic
let calcValue = '0';
window.calcInput = (val) => {
    if (val === 'C') {
        calcValue = '0';
    } else if (val === '=') {
        try {
            calcValue = eval(calcValue).toString();
        } catch(e) {
            calcValue = 'Error';
        }
    } else {
        if (calcValue === '0' || calcValue === 'Error') {
            if (['/', '*', '-', '+'].includes(val)) {
                calcValue = '0' + val;
            } else {
                calcValue = val;
            }
        } else {
            calcValue += val;
        }
    }
    calcScreen.innerText = calcValue;
};

if (openCalculatorBtn) {
    openCalculatorBtn.addEventListener('click', () => {
        calcModal.classList.add('active');
        calcValue = '0';
        calcScreen.innerText = calcValue;
    });
}
if (closeCalcBtn) {
    closeCalcBtn.addEventListener('click', () => {
        calcModal.classList.remove('active');
    });
}

// Init
initSettings();
populateMonthSelector();
updateAllViews();
