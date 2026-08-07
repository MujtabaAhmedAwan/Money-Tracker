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

// --- DOM ELEMENTS ---
// Navigation
const navItems = document.querySelectorAll('.nav-item');
const tabViews = document.querySelectorAll('.tab-view');
const fabBtn = document.getElementById('fabBtn');

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
let currentDate = new Date();

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

// --- UI UPDATES ---
const updateHomeSummary = () => {
    const total = transactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

    balanceAmount.innerText = formatCurrency(total);
    incomeAmount.innerText = formatCurrency(income);
    expenseAmount.innerText = formatCurrency(expense);
};

const renderTransactions = (filterText = '') => {
    transactionsList.innerHTML = '';
    const filtered = transactions.filter(t => t.description.toLowerCase().includes(filterText.toLowerCase()));
    
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
            <div class="transaction-amount ${amountClass}">${sign}${formatCurrency(transaction.amount)}</div>
        `;
        transactionsList.appendChild(item);
    });
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
        const dayData = transactions.filter(t => t.date === dateStr);
        
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
    transactions.filter(t => t.type === 'expense').forEach(t => {
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

        // Trigger view-specific refreshes
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
    
    // Check limit warning (if expense and pro)
    if (type === 'expense' && checkDailyLimit(dateStr)) {
        alert('⚠️ WARNING: You have exceeded your daily expense limit!');
    }

    updateHomeSummary();
    renderTransactions(searchInput.value);
    if(document.getElementById('view-calendar').classList.contains('active')) renderCalendar();
    
    transactionModal.classList.remove('active');
    transactionForm.reset();
});

// --- PRO VERSION LOGIC (Serverless API Call) ---
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

// Send an email securely using the Vercel Backend API
const sendEmailAPI = async (to, subject, html) => {
    const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, html })
    });
    
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to connect to backend API');
    }
    return data;
};

proVerificationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('proEmail').value;
    const sendBtn = document.getElementById('sendOtpBtn');
    
    sendBtn.innerText = 'Sending...';
    sendBtn.disabled = true;
    
    // Generate 6 digit OTP
    currentOtp = Math.floor(100000 + Math.random() * 900000).toString();
    
    try {
        await sendEmailAPI(email, "Money Tracker Pro - Verification Code", `Your verification code is: <b>${currentOtp}</b>`);
        
        sendBtn.innerText = 'Send Verification Code';
        sendBtn.disabled = false;
        alert("Verification code sent to your email!");
        
        proVerificationForm.style.display = 'none';
        otpSection.style.display = 'block';
    } catch (error) {
        sendBtn.innerText = 'Send Verification Code';
        sendBtn.disabled = false;
        alert("Email Error: " + error.message);
    }
});

verifyOtpBtn.addEventListener('click', async () => {
    const inputOtp = document.getElementById('otpInput').value;
    const verifyBtn = document.getElementById('verifyOtpBtn');
    
    if (inputOtp === currentOtp) {
        verifyBtn.innerText = 'Verifying...';
        verifyBtn.disabled = true;
        
        const userData = {
            name: document.getElementById('proName').value,
            phone: document.getElementById('proCountryCode').value + ' ' + document.getElementById('proPhone').value,
            email: document.getElementById('proEmail').value
        };
        
        try {
            // We notify admin by passing a special keyword or just sending it to the user's email with a note.
            // Since we don't have ADMIN_EMAIL on frontend anymore, we just send it back to the user's email 
            // OR the backend could inherently bcc the admin. For simplicity, we just unlock.
            
            alert("Pro version unlocked successfully!");
            proSettings.isPro = true;
            proSettings.userData = userData;
            saveState();
            initProState();
        } catch (error) {
            alert("Error finalizing verification: " + error.message);
            verifyBtn.innerText = 'Verify & Unlock Pro';
            verifyBtn.disabled = false;
        }
    } else {
        alert("Incorrect code. Try again.");
    }
});

// Profile Settings Limit Logic
limitToggle.addEventListener('change', (e) => {
    proSettings.limitEnabled = e.target.checked;
    limitInputGroup.style.display = e.target.checked ? 'block' : 'none';
    saveState();
});

dailyLimitAmount.addEventListener('input', (e) => {
    proSettings.dailyLimit = parseFloat(e.target.value) || 0;
    saveState();
    renderTransactions();
});

currencySelect.addEventListener('change', (e) => {
    proSettings.currency = e.target.value;
    saveState();
    updateHomeSummary();
    renderTransactions(searchInput.value);
    if(document.getElementById('view-calendar').classList.contains('active')) renderCalendar();
});

emailReportBtn.addEventListener('click', async () => {
    if (!proSettings.userData) return;
    
    const expenses = transactions.filter(t=>t.type==='expense').reduce((a,b)=>a+b.amount,0);
    const income = transactions.filter(t=>t.type==='income').reduce((a,b)=>a+b.amount,0);
    const btn = document.getElementById('emailReportBtn');
    
    btn.innerText = 'Sending Report...';
    btn.disabled = true;
    
    try {
        await sendEmailAPI(
            proSettings.userData.email, 
            "Money Tracker - Monthly Report", 
            `<h2>Your Financial Report</h2><p>Total Income: $${income}</p><p>Total Expenses: $${expenses}</p>`
        );
        alert("Report sent successfully to your email!");
    } catch (error) {
        alert("Email Error: " + error.message);
    }
    
    btn.innerText = 'Email Monthly Report';
    btn.disabled = false;
});

// Calendar Controls
prevMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
nextMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });

// Init
initProState();
updateHomeSummary();
renderTransactions();
