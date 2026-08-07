// --- DATA STATE ---
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let proSettings = JSON.parse(localStorage.getItem('proSettings')) || {
    isPro: false,
    dailyLimit: 0,
    limitEnabled: false,
    userData: null,
    currency: 'USD'
};
if (!proSettings.currency) proSettings.currency = 'USD';

let currentOtp = null;
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

// Calendar
const calendarGrid = document.getElementById('calendarGrid');
const currentMonthYear = document.getElementById('currentMonthYear');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const calendarTransactions = document.getElementById('calendarTransactions');
let currentDate = new Date(); // Only used for Calendar view navigation now

// Chart
const expenseChartCanvas = document.getElementById('expenseChart');
let expenseChartInstance = null;

// Pro & Profile
const proLockedState = document.getElementById('proLockedState');
const proUnlockedState = document.getElementById('proUnlockedState');
const proVerificationForm = document.getElementById('proVerificationForm');
const otpSection = document.getElementById('otpSection');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
const proCountryCode = document.getElementById('proCountryCode');
const limitToggle = document.getElementById('limitToggle');
const limitInputGroup = document.getElementById('limitInputGroup');
const dailyLimitAmount = document.getElementById('dailyLimitAmount');
const emailReportBtn = document.getElementById('emailReportBtn');
const currencySelect = document.getElementById('currencySelect');

// --- CATEGORIES ---
const incomeCategories = [
    { id: 'salary', label: 'Salary', icon: 'bx-briefcase', colorClass: 'cat-icon-salary' },
    { id: 'investment', label: 'Investment', icon: 'bx-line-chart', colorClass: 'cat-icon-investment' },
    { id: 'part-time', label: 'Part-time', icon: 'bx-time', colorClass: 'cat-icon-part-time' },
    { id: 'bonus', label: 'Bonus', icon: 'bx-gift', colorClass: 'cat-icon-bonus' },
    { id: 'custom', label: 'Custom (+)', icon: 'bx-plus-circle', colorClass: 'cat-icon-custom' }
];

const expenseCategories = [
    { id: 'food', label: 'Food & Dining', icon: 'bx-restaurant', colorClass: 'cat-icon-food' },
    { id: 'transport', label: 'Transport', icon: 'bx-car', colorClass: 'cat-icon-transport' },
    { id: 'utilities', label: 'Utilities', icon: 'bx-bulb', colorClass: 'cat-icon-utilities' },
    { id: 'entertainment', label: 'Entertainment', icon: 'bx-movie-play', colorClass: 'cat-icon-entertainment' },
    { id: 'custom', label: 'Custom (+)', icon: 'bx-plus-circle', colorClass: 'cat-icon-custom' }
];

// --- CORE FUNCTIONS ---
const formatCurrency = (amount) => {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: proSettings.currency }).format(amount);
};

const saveState = () => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('proSettings', JSON.stringify(proSettings));
};

const getCategoryData = (type, categoryId, customName = '') => {
    const list = type === 'income' ? incomeCategories : expenseCategories;
    let cat = list.find(c => c.id === categoryId);
    if (categoryId === 'custom') return { label: customName || 'Custom', icon: 'bx-category', colorClass: 'cat-icon-custom' };
    return cat || { label: 'Other', icon: 'bx-category', colorClass: 'cat-icon-custom' };
};

// Check Daily Limit (Pro Feature)
const checkDailyLimit = (dateStr) => {
    if (!proSettings.isPro || !proSettings.limitEnabled || proSettings.dailyLimit <= 0) return false;
    
    const todayExpenses = transactions
        .filter(t => t.type === 'expense' && t.date === dateStr)
        .reduce((sum, t) => sum + t.amount, 0);
        
    return todayExpenses > proSettings.dailyLimit;
};

// Month Filtering Logic
const getFilteredTransactions = () => {
    return transactions.filter(t => t.date.startsWith(currentViewMonth));
};

const populateMonthSelector = () => {
    const months = new Set();
    months.add(currentViewMonth); // Ensure current month is always an option
    
    transactions.forEach(t => {
        months.add(t.date.substring(0, 7)); // Extract YYYY-MM
    });
    
    const sortedMonths = Array.from(months).sort().reverse();
    
    monthSelector.innerHTML = '';
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
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
    
    // Sync Calendar View to selected month
    const [year, monthNum] = currentViewMonth.split('-');
    currentDate.setFullYear(parseInt(year));
    currentDate.setMonth(parseInt(monthNum) - 1);
    
    updateAllViews();
});

const updateAllViews = () => {
    updateHomeSummary();
    renderTransactions(searchInput.value);
    if(document.getElementById('view-calendar').classList.contains('active')) renderCalendar();
    if(document.getElementById('view-chart').classList.contains('active')) renderChart();
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
        transactionsList.innerHTML = '<div class="empty-state">No transactions found for this month.</div>';
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
                <button onclick="deleteTransaction(${transaction.id})" style="background:none; border:none; color:var(--accent-expense); font-size:1.2rem; cursor:pointer;"><i class='bx bx-trash'></i></button>
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

// --- CALENDAR VIEW ---
const renderCalendar = () => {
    calendarGrid.innerHTML = '';
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    currentMonthYear.innerText = `${monthNames[month]} ${year}`;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    daysOfWeek.forEach(day => {
        calendarGrid.innerHTML += `<div class="cal-day-header">${day}</div>`;
    });

    for (let i = 0; i < firstDayIndex; i++) {
        calendarGrid.innerHTML += `<div class="cal-day empty"></div>`;
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayData = transactions.filter(t => t.date === dateStr); // Still filters ALL transactions for this date
        
        const hasDataClass = dayData.length > 0 ? 'has-data' : '';
        const indicator = dayData.length > 0 ? `<div class="cal-indicator"></div>` : '';

        calendarGrid.innerHTML += `
            <div class="cal-day ${hasDataClass}" data-date="${dateStr}">
                ${i}
                ${indicator}
            </div>
        `;
    }

    document.querySelectorAll('.cal-day.has-data').forEach(day => {
        day.addEventListener('click', () => {
            document.querySelectorAll('.cal-day').forEach(d => d.classList.remove('active'));
            day.classList.add('active');
            renderCalendarDayTransactions(day.dataset.date);
        });
    });
};

const renderCalendarDayTransactions = (dateStr) => {
    const dayData = transactions.filter(t => t.date === dateStr);
    calendarTransactions.innerHTML = `<h3>${dateStr}</h3>`;
    
    if (dayData.length === 0) {
        calendarTransactions.innerHTML += '<p class="empty-state">No transactions.</p>';
        return;
    }

    dayData.forEach(transaction => {
        const catData = getCategoryData(transaction.type, transaction.category, transaction.customCategoryName);
        const isLimitExceeded = transaction.type === 'expense' && checkDailyLimit(transaction.date);
        const color = transaction.type === 'income' ? 'var(--accent-income)' : (isLimitExceeded ? 'var(--accent-expense)' : 'var(--text-main)');
        
        calendarTransactions.innerHTML += `
            <div style="display:flex; justify-content:space-between; margin-top:10px; padding:10px; background:var(--surface-dark); border-radius:8px;">
                <div><strong>${transaction.description}</strong><br><small>${catData.label}</small></div>
                <div style="color:${color}; font-weight:bold;">${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}</div>
            </div>
        `;
    });
};

// --- CHART VIEW ---
const renderChart = () => {
    const ctx = expenseChartCanvas.getContext('2d');
    
    const expensesByCategory = {};
    const currentMonthData = getFilteredTransactions();
    currentMonthData.filter(t => t.type === 'expense').forEach(t => {
        const cat = getCategoryData('expense', t.category, t.customCategoryName).label;
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + t.amount;
    });

    const labels = Object.keys(expensesByCategory);
    const data = Object.values(expensesByCategory);

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
                backgroundColor: ['#ef4444', '#f97316', '#06b6d4', '#ec4899', '#a8a29e'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#f8fafc' } }
            }
        }
    });
};

// --- NAVIGATION LOGIC ---
navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        const targetId = item.dataset.target;
        tabViews.forEach(view => view.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');

        if (targetId === 'view-calendar') renderCalendar();
        if (targetId === 'view-chart') renderChart();
    });
});

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
    transactionDateInput.valueAsDate = new Date(); // default to today
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
    
    // Auto-switch to the month of the newly added transaction
    const newTxMonth = dateStr.substring(0, 7);
    if (newTxMonth !== currentViewMonth) {
        currentViewMonth = newTxMonth;
        monthSelector.value = currentViewMonth;
        const [year, monthNum] = currentViewMonth.split('-');
        currentDate.setFullYear(parseInt(year));
        currentDate.setMonth(parseInt(monthNum) - 1);
    }

    updateAllViews();
    
    transactionModal.classList.remove('active');
    transactionForm.reset();
});

// --- PRO VERSION LOGIC ---
const DOCUMIND_API = 'https://documind-ai-puce.vercel.app/api';
let pollingInterval = null;
let currentEmail = null;

const initProState = () => {
    if (proSettings.isPro) {
        proLockedState.style.display = 'none';
        proUnlockedState.style.display = 'block';
        limitToggle.disabled = false;
        limitToggle.checked = proSettings.limitEnabled;
        if(proSettings.limitEnabled) limitInputGroup.style.display = 'block';
        dailyLimitAmount.value = proSettings.dailyLimit;
    } else {
        proCountryCode.innerHTML = fullCountryCodes.map(c => `<option value="${c.code}">${c.name} (${c.code})</option>`).join('');
    }
    
    currencySelect.innerHTML = allCurrencies.map(c => `<option value="${c}">${c}</option>`).join('');
    currencySelect.value = proSettings.currency;
};

proVerificationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('proEmail').value;
    const name = document.getElementById('proName').value;
    const phone = document.getElementById('proCountryCode').value + ' ' + document.getElementById('proPhone').value;
    const sendBtn = document.getElementById('sendOtpBtn');
    
    if(!email || !phone) return;
    
    sendBtn.innerText = 'Sending...';
    sendBtn.disabled = true;
    
    try {
        const res = await fetch(`${DOCUMIND_API}/request-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, name: name || 'MoneyTracker User', phone: phone })
        });
        
        const data = await res.json();
        if (res.ok) {
            currentEmail = email;
            sendBtn.innerText = 'Send Verification Code';
            sendBtn.disabled = false;
            proVerificationForm.style.display = 'none';
            document.getElementById('otpSection').style.display = 'block';
        } else {
            throw new Error(data.error || "Failed to send code");
        }
    } catch (error) {
        sendBtn.innerText = 'Send Verification Code';
        sendBtn.disabled = false;
        alert("Error: " + error.message);
    }
});

document.getElementById('verifyOtpBtn').addEventListener('click', async () => {
    const codeInput = document.getElementById('otpInput').value;
    const verifyBtn = document.getElementById('verifyOtpBtn');
    
    if (!codeInput) return;
    
    verifyBtn.innerText = 'Verifying...';
    verifyBtn.disabled = true;
    
    try {
        const res = await fetch(`${DOCUMIND_API}/verify-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentEmail, code: codeInput })
        });
        
        const data = await res.json();
        if (res.ok) {
            document.getElementById('otpSection').style.display = 'none';
            document.getElementById('waitingSection').style.display = 'block';
            startAdminPolling();
        } else {
            throw new Error(data.error || "Invalid code");
        }
    } catch (error) {
        verifyBtn.innerText = 'Verify Email';
        verifyBtn.disabled = false;
        alert("Error: " + error.message);
    }
});

const startAdminPolling = () => {
    if (pollingInterval) clearInterval(pollingInterval);
    
    pollingInterval = setInterval(async () => {
        try {
            const res = await fetch(`${DOCUMIND_API}/status?email=${encodeURIComponent(currentEmail)}`);
            const data = await res.json();
            
            if (data.status === 'approved') {
                clearInterval(pollingInterval);
                
                alert("Access granted! Pro version unlocked successfully.");
                proSettings.isPro = true;
                proSettings.userData = {
                    name: document.getElementById('proName').value,
                    phone: document.getElementById('proCountryCode').value + ' ' + document.getElementById('proPhone').value,
                    email: document.getElementById('proEmail').value
                };
                saveState();
                initProState();
            } else if (data.status === 'denied') {
                clearInterval(pollingInterval);
                alert("Access Denied by Admin.");
                document.getElementById('waitingSection').style.display = 'none';
                proVerificationForm.style.display = 'block';
            }
        } catch (error) {
            console.error("Polling error:", error);
        }
    }, 3000);
};

// ... limit toggle logic follows ...

limitToggle.addEventListener('change', (e) => {
    proSettings.limitEnabled = e.target.checked;
    limitInputGroup.style.display = e.target.checked ? 'block' : 'none';
    saveState();
});

dailyLimitAmount.addEventListener('input', (e) => {
    proSettings.dailyLimit = parseFloat(e.target.value) || 0;
    saveState();
    updateAllViews();
});

currencySelect.addEventListener('change', (e) => {
    proSettings.currency = e.target.value;
    saveState();
    updateAllViews();
});

emailReportBtn.addEventListener('click', () => {
    if (!proSettings.userData) return;
    const currentMonthData = getFilteredTransactions();
    const expenses = currentMonthData.filter(t=>t.type==='expense').reduce((a,b)=>a+b.amount,0);
    const income = currentMonthData.filter(t=>t.type==='income').reduce((a,b)=>a+b.amount,0);
    
    const [year, monthNum] = currentViewMonth.split('-');
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthName = monthNames[parseInt(monthNum) - 1];
    
    alert(`Report for ${monthName} ${year} Generated Locally!\n\nTotal Income: $${income}\nTotal Expenses: $${expenses}\n\n(Email sending disabled for security)`);
});

// Calendar Controls
prevMonthBtn.addEventListener('click', () => { 
    currentDate.setMonth(currentDate.getMonth() - 1); 
    // Auto sync dropdown
    currentViewMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    populateMonthSelector();
    monthSelector.value = currentViewMonth;
    updateAllViews();
});

nextMonthBtn.addEventListener('click', () => { 
    currentDate.setMonth(currentDate.getMonth() + 1); 
    // Auto sync dropdown
    currentViewMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    populateMonthSelector();
    monthSelector.value = currentViewMonth;
    updateAllViews();
});

// Init
initProState();
populateMonthSelector();
updateAllViews();
