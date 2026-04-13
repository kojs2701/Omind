// ============================================================
// Firebase Configuration
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyBHLhCs5GGmcGAPfuKuc_deEnBOdk1azmw",
    authDomain: "omind-49f39.firebaseapp.com",
    projectId: "omind-49f39",
    storageBucket: "omind-49f39.firebasestorage.app",
    messagingSenderId: "712208723667",
    appId: "1:712208723667:web:61f4e327aee6680a9b6e26"
};

let app, auth, db, firebaseReady = false;
let authConfigurationValid = true;
let firebaseInitAttempts = 0;
const maxInitAttempts = 10;
const MAX_IMAGE_SIZE_MB = 20;
const GEMINI_MAX_IMAGE_BYTES = 18 * 1024 * 1024;
const API_BASE_CANDIDATES = [
    '',
    'http://127.0.0.1:5500',
    'http://localhost:5500'
];

function showAuthConfigGuide(targetErrorDiv) {
    const message = 'Firebase 인증 설정 오류(auth/configuration-not-found). Firebase Console에서 Authentication > 로그인 방법 > 이메일/비밀번호를 활성화하고, 현재 웹앱의 API Key/Auth Domain이 프로젝트와 일치하는지 확인하세요.';
    console.error('❌ ' + message);

    const statusEl = document.getElementById('firebaseInitStatus');
    if (statusEl) {
        statusEl.textContent = '❌ Firebase 인증 설정 오류 - 콘솔 설정 확인 필요';
        statusEl.classList.remove('hidden');
        statusEl.style.color = '#d93025';
    }

    if (targetErrorDiv) {
        targetErrorDiv.textContent = message;
        targetErrorDiv.classList.remove('hidden');
    }
}

function setButtonLoading(button, isLoading, loadingText, defaultText) {
    if (!button) return;
    button.disabled = isLoading;
    button.textContent = isLoading ? loadingText : defaultText;
}

function estimateDataUrlBytes(dataUrl) {
    if (!dataUrl || !dataUrl.includes(',')) return 0;
    const base64 = dataUrl.split(',')[1] || '';
    const padding = (base64.match(/=+$/) || [''])[0].length;
    return Math.floor(base64.length * 0.75) - padding;
}

function dataUrlToImage(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
    });
}

function canvasToJpegDataUrl(canvas, quality) {
    return canvas.toDataURL('image/jpeg', quality);
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiFetch(path, options) {
    let lastResponse = null;
    let lastError = null;

    for (const base of API_BASE_CANDIDATES) {
        const url = base ? `${base}${path}` : path;
        try {
            const response = await fetch(url, options);
            if (response.ok) return response;

            // 잘못된 서버/라우팅으로 인한 실패면 다른 베이스로 재시도
            if (response.status === 404 || response.status === 405) {
                lastResponse = response;
                continue;
            }
            return response;
        } catch (error) {
            lastError = error;
        }
    }

    if (lastResponse) return lastResponse;
    throw lastError || new Error('API 서버에 연결할 수 없습니다.');
}

async function prepareImageForGemini(dataUrl) {
    if (!dataUrl) return { dataUrl: null, partial: false, originalBytes: 0, finalBytes: 0 };
    const originalBytes = estimateDataUrlBytes(dataUrl);
    if (originalBytes <= GEMINI_MAX_IMAGE_BYTES) {
        return { dataUrl, partial: false, originalBytes, finalBytes: originalBytes };
    }

    const img = await dataUrlToImage(dataUrl);
    let width = img.width;
    let height = img.height;
    let bestDataUrl = dataUrl;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    for (let scale = 1.0; scale >= 0.35; scale -= 0.1) {
        width = Math.max(320, Math.floor(img.width * scale));
        height = Math.max(240, Math.floor(img.height * scale));
        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        for (let q = 0.9; q >= 0.5; q -= 0.1) {
            const candidate = canvasToJpegDataUrl(canvas, q);
            const bytes = estimateDataUrlBytes(candidate);
            bestDataUrl = candidate;
            if (bytes <= GEMINI_MAX_IMAGE_BYTES) {
                return { dataUrl: candidate, partial: false, originalBytes, finalBytes: bytes };
            }
        }
    }

    // 초과 시 상단 중심 일부 영역만 잘라 전송
    const cropRatio = 0.45;
    const cropCanvas = document.createElement('canvas');
    const cropCtx = cropCanvas.getContext('2d');
    cropCanvas.width = width;
    cropCanvas.height = Math.floor(height * cropRatio);
    cropCtx.drawImage(canvas, 0, 0, width, cropCanvas.height, 0, 0, width, cropCanvas.height);

    for (let q = 0.85; q >= 0.45; q -= 0.1) {
        const cropped = canvasToJpegDataUrl(cropCanvas, q);
        const bytes = estimateDataUrlBytes(cropped);
        bestDataUrl = cropped;
        if (bytes <= GEMINI_MAX_IMAGE_BYTES) {
            return { dataUrl: cropped, partial: true, originalBytes, finalBytes: bytes };
        }
    }

    return {
        dataUrl: bestDataUrl,
        partial: true,
        originalBytes,
        finalBytes: estimateDataUrlBytes(bestDataUrl)
    };
}

async function validateAuthConfiguration() {
    try {
        // 실제 인증 제공자 구성을 확인하기 위한 경량 검증 호출
        await auth.fetchSignInMethodsForEmail('config-check@omind.local');
        authConfigurationValid = true;
    } catch (error) {
        if (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-allowed') {
            authConfigurationValid = false;
            showAuthConfigGuide();
            return false;
        }
        // 네트워크/일시 오류는 구성 오류로 확정하지 않음
        authConfigurationValid = true;
    }
    return true;
}

// Firebase SDK 로드 대기
function waitForFirebase() {
    console.log(`⏳ Firebase SDK 로드 대기 중... (${firebaseInitAttempts + 1}/${maxInitAttempts})`);
    
    if (typeof firebase !== 'undefined' && firebase.initializeApp) {
        console.log('✅ Firebase SDK 감지됨');
        initializeFirebase();
    } else if (firebaseInitAttempts < maxInitAttempts) {
        firebaseInitAttempts++;
        setTimeout(waitForFirebase, 500);
    } else {
        console.error('❌ Firebase SDK를 로드할 수 없습니다. 페이지를 새로고침해주세요.');
    }
}

// Firebase 초기화
function initializeFirebase() {
    console.log('🔥 Firebase 초기화 중...');
    
    try {
        // 이미 initialized 되었는지 확인
        try {
            app = firebase.app();
            console.log('✅ Firebase가 이미 초기화되어 있습니다');
        } catch (e) {
            app = firebase.initializeApp(firebaseConfig);
            console.log('✅ Firebase 앱 초기화 완료');
        }
        
        auth = firebase.auth();
        console.log('✅ Firebase Auth 준비 완료');
        
        db = firebase.firestore();
        console.log('✅ Firebase Firestore 준비 완료');
        
        firebaseReady = true;
        console.log('✅ Firebase 완전히 초기화됨\n');

        validateAuthConfiguration();
        
        setupAuthListener();
    } catch (error) {
        console.error('❌ Firebase 초기화 실패:', error.message);
        firebaseReady = false;
        setTimeout(initializeFirebase, 2000);
    }
}

// ============================================================
// Global State
// ============================================================

let currentUser = null;
let currentUserId = null;
let currentPage = 'main';
let wrongAnswers = [];
let problems = [];
let scores = [];
let selectedProblems = [];
let currentProblemIndex = 0;
let selectedAnswerIndex = -1;
let uploadedImageData = null;

// ============================================================
// UI Functions
// ============================================================

function showAuthContainer() {
    const container = document.getElementById('authContainer');
    if (container) {
        container.classList.remove('hidden');
        container.classList.add('active');
    }
}

function hideAuthContainer() {
    const container = document.getElementById('authContainer');
    if (container) {
        container.classList.add('hidden');
        container.classList.remove('active');
    }
}

function showAppContainer() {
    const app = document.getElementById('app');
    if (app) app.classList.remove('hidden');
}

function hideAppContainer() {
    const app = document.getElementById('app');
    if (app) app.classList.add('hidden');
}

function switchToSignup() {
    document.getElementById('loginForm')?.classList.add('hidden');
    document.getElementById('signupForm')?.classList.remove('hidden');
    document.getElementById('loginError')?.classList.add('hidden');
}

function switchToLogin() {
    document.getElementById('signupForm')?.classList.add('hidden');
    document.getElementById('loginForm')?.classList.remove('hidden');
    document.getElementById('signupError')?.classList.add('hidden');
}

function updateUserDisplay() {
    const userNameDisplay = document.getElementById('userNameDisplay');
    const logoutBtn = document.getElementById('logoutBtn');

    if (!userNameDisplay || !logoutBtn) return;

    if (currentUser) {
        userNameDisplay.textContent = `👤 ${currentUser.displayName || currentUser.email}`;
        logoutBtn.style.display = 'block';
    } else {
        userNameDisplay.textContent = '';
        logoutBtn.style.display = 'none';
    }
}

// ============================================================
// Authentication
// ============================================================

function setupAuthListener() {
    console.log('🔐 Auth 리스너 설정 중...');
    
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || '사용자'
            };
            currentUserId = user.uid;
            hideAuthContainer();
            showAppContainer();
            loadUserData();
        } else {
            currentUser = null;
            currentUserId = null;
            resetAllData();
            showAuthContainer();
            hideAppContainer();
        }
        updateUserDisplay();
    });
}

async function handleSignup() {
    const email = document.getElementById('signupEmail')?.value.trim();
    const password = document.getElementById('signupPassword')?.value.trim();
    const passwordConfirm = document.getElementById('signupPasswordConfirm')?.value.trim();
    const username = document.getElementById('signupUsername')?.value.trim();
    const errorDiv = document.getElementById('signupError');

    if (!email || !password || !passwordConfirm || !username) {
        if (errorDiv) errorDiv.textContent = '모든 필드를 입력해주세요.';
        return;
    }

    if (password !== passwordConfirm) {
        if (errorDiv) errorDiv.textContent = '비밀번호가 일치하지 않습니다.';
        return;
    }

    try {
        if (!firebaseReady || !auth || !db) {
            throw new Error('firebase-not-ready');
        }
        if (!authConfigurationValid) {
            throw new Error('auth-config-invalid');
        }

        console.log('📝 회원가입 중...');

        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        await user.updateProfile({ displayName: username });
        await user.reload();

        // 회원가입 직후 이름이 즉시 보이도록 로컬 상태를 선반영
        currentUser = {
            uid: user.uid,
            email: user.email,
            displayName: username
        };
        currentUserId = user.uid;
        hideAuthContainer();
        showAppContainer();
        updateUserDisplay();

        await db.collection('users').doc(user.uid).set({
            email: user.email,
            username: username,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        await loadUserData();

        console.log('✅ 회원가입 및 인증 계정 생성 완료');

        document.getElementById('signupEmail').value = '';
        document.getElementById('signupPassword').value = '';
        document.getElementById('signupPasswordConfirm').value = '';
        document.getElementById('signupUsername').value = '';
        if (errorDiv) {
            errorDiv.textContent = '';
            errorDiv.classList.add('hidden');
        }
    } catch (error) {
        console.error('❌ 회원가입 실패');
        if (errorDiv) {
            if (error.code === 'auth/email-already-in-use') {
                errorDiv.textContent = '이미 가입된 이메일입니다.';
            } else if (error.code === 'auth/invalid-email') {
                errorDiv.textContent = '유효한 이메일을 입력해주세요.';
            } else if (error.code === 'auth/weak-password') {
                errorDiv.textContent = '비밀번호는 6자 이상이어야 합니다.';
            } else if (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-allowed' || error.message === 'auth-config-invalid') {
                showAuthConfigGuide(errorDiv);
            } else if (error.message === 'firebase-not-ready') {
                errorDiv.textContent = 'Firebase 초기화 중입니다. 잠시 후 다시 시도해주세요.';
            } else {
                errorDiv.textContent = '회원가입 실패: ' + error.message;
            }
            errorDiv.classList.remove('hidden');
        }
    }
}

async function handleLogin() {
    const email = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value.trim();
    const errorDiv = document.getElementById('loginError');

    if (!email || !password) {
        if (errorDiv) errorDiv.textContent = '이메일과 비밀번호를 입력해주세요.';
        return;
    }

    try {
        if (!firebaseReady || !auth || !db) {
            throw new Error('firebase-not-ready');
        }
        if (!authConfigurationValid) {
            throw new Error('auth-config-invalid');
        }

        console.log('🔐 로그인 중...');

        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        await db.collection('users').doc(user.uid).set({
            email: user.email,
            username: user.displayName || user.email,
            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log('✅ 로그인 성공');

        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        if (errorDiv) {
            errorDiv.textContent = '';
            errorDiv.classList.add('hidden');
        }
    } catch (error) {
        console.error('❌ 로그인 실패');
        if (errorDiv) {
            if (error.code === 'auth/user-not-found') {
                errorDiv.textContent = '등록된 사용자가 없습니다.';
            } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                errorDiv.textContent = '이메일 또는 비밀번호가 올바르지 않습니다.';
            } else if (error.code === 'auth/invalid-email') {
                errorDiv.textContent = '유효한 이메일을 입력해주세요.';
            } else if (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-allowed' || error.message === 'auth-config-invalid') {
                showAuthConfigGuide(errorDiv);
            } else if (error.message === 'firebase-not-ready') {
                errorDiv.textContent = 'Firebase 초기화 중입니다. 잠시 후 다시 시도해주세요.';
            } else {
                errorDiv.textContent = '로그인 실패: ' + error.message;
            }
            errorDiv.classList.remove('hidden');
        }
    }
}

async function handleLogout() {
    console.log('🚪 로그아웃 중...');
    try {
        await auth.signOut();
    } catch (e) {
        // 수동 로그아웃
    }
    
    currentUser = null;
    currentUserId = null;
    resetAllData();
    showAuthContainer();
    hideAppContainer();
    updateUserDisplay();
}

function resetAllData() {
    wrongAnswers = [];
    problems = [];
    scores = [];
    selectedProblems = [];
    currentProblemIndex = 0;
    selectedAnswerIndex = -1;
    uploadedImageData = null;
}

// ============================================================
// Data Management
// ============================================================

async function loadUserData() {
    if (!currentUserId) return;
    
    try {
        console.log('📂 사용자 데이터 로드 중...');

        // 오답 데이터
        try {
            const wrongSnap = await db.collection('users').doc(currentUserId).collection('wrongAnswers').orderBy('createdAt', 'desc').limit(50).get();
            wrongAnswers = wrongSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch(e) {
            wrongAnswers = [];
        }

        // 문제 데이터
        try {
            const problemSnap = await db.collection('users').doc(currentUserId).collection('problems').orderBy('createdAt', 'desc').limit(50).get();
            problems = problemSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch(e) {
            problems = [];
        }

        // 점수 데이터
        try {
            const scoreSnap = await db.collection('users').doc(currentUserId).collection('scores').orderBy('recordedAt', 'desc').limit(100).get();
            scores = scoreSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch(e) {
            scores = [];
        }

        console.log(`✅ 데이터 로드 완료 (오답: ${wrongAnswers.length}, 문제: ${problems.length}, 점수: ${scores.length})`);

        if (currentPage === 'wrong') displayWrongAnswers();
        else if (currentPage === 'problems') displayProblems();
        else if (currentPage === 'scores') displayScores();

    } catch(error) {
        console.error('❌ 데이터 로드 실패');
    }
}

// ============================================================
// Navigation
// ============================================================

function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(page + '-page');
    if (targetPage) {
        targetPage.classList.add('active');
        currentPage = page;
    }

    const pageNames = {
        main: '메인',
        wrong: '오답노트',
        problems: '문제',
        learning: '학습 추천',
        submit: '문제 전송',
        scores: '점수 기록'
    };
    const pageDisplay = document.getElementById('currentPage');
    if (pageDisplay) pageDisplay.textContent = pageNames[page] || '메인';

    if (page === 'wrong') displayWrongAnswers();
    else if (page === 'problems') displayProblems();
    else if (page === 'scores') displayScores();
}

function parseDateValue(value) {
    if (!value) return new Date();
    if (typeof value.toDate === 'function') return value.toDate();
    if (value.seconds) return new Date(value.seconds * 1000);
    return new Date(value);
}

function sanitizeAiText(rawText) {
    if (!rawText || typeof rawText !== 'string') return '';
    let text = rawText.trim();
    text = text.replace(/^```(?:json|markdown|text)?/i, '').replace(/```$/i, '').trim();
    text = text.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    text = text.replace(/\*\*(.*?)\*\*/g, '$1');
    text = text.replace(/\*(.*?)\*/g, '$1');
    text = text.replace(/`([^`]+)`/g, '$1');
    text = text.replace(/\$([^$]+)\$/g, '$1');
    text = text.replace(/\\\((.*?)\\\)/g, '$1');
    text = text.replace(/\\\[(.*?)\\\]/g, '$1');
    text = text.replace(/^\s*#{1,6}\s*/gm, '');
    return text;
}

function extractJsonObject(rawText) {
    const cleaned = sanitizeAiText(rawText);
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (!match) return null;
        try {
            return JSON.parse(match[0]);
        } catch (err) {
            return null;
        }
    }
}

function normalizeAnalysisText(rawText) {
    const cleaned = sanitizeAiText(rawText);
    const asJson = extractJsonObject(cleaned);
    if (!asJson) return cleaned;

    const orderedKeys = ['오답 원인', '개념 설명', '해결 방법', '유사 문제 팁', 'analysis', 'reason', 'concept', 'solution', 'tip'];
    const lines = [];
    orderedKeys.forEach((key) => {
        if (asJson[key]) lines.push(`${key}: ${asJson[key]}`);
    });

    if (lines.length > 0) return lines.join('\n');
    return Object.entries(asJson).map(([k, v]) => `${k}: ${v}`).join('\n');
}

function renderScoreVisuals() {
    const summaryEl = document.getElementById('scoreSummaryCards');
    const insightEl = document.getElementById('scoreGrowthInsights');
    const tableBody = document.getElementById('scoresHistoryBody');
    const chart = document.getElementById('scoresChart');

    if (!summaryEl || !insightEl || !tableBody || !chart) return;

    if (!scores || scores.length === 0) {
        summaryEl.innerHTML = '';
        summaryEl.classList.add('hidden');
        insightEl.innerHTML = '';
        insightEl.classList.add('hidden');
        tableBody.innerHTML = '';
        chart.classList.add('chart-hidden');
        return;
    }

    const sorted = [...scores].sort((a, b) => parseDateValue(a.recordedAt || a.testDate) - parseDateValue(b.recordedAt || b.testDate));
    const percentages = sorted.map((s) => Number(s.percentage || ((Number(s.score || 0) / Number(s.totalScore || 100)) * 100)));
    const latest = percentages[percentages.length - 1];
    const first = percentages[0];
    const avg = percentages.reduce((acc, value) => acc + value, 0) / percentages.length;
    const growth = latest - first;
    const best = Math.max(...percentages);

    summaryEl.innerHTML = `
        <div class="score-summary-card"><div class="score-summary-label">최근 점수</div><div class="score-summary-value">${latest.toFixed(1)}%</div></div>
        <div class="score-summary-card"><div class="score-summary-label">평균 점수</div><div class="score-summary-value">${avg.toFixed(1)}%</div></div>
        <div class="score-summary-card"><div class="score-summary-label">최고 점수</div><div class="score-summary-value">${best.toFixed(1)}%</div></div>
        <div class="score-summary-card"><div class="score-summary-label">성장률</div><div class="score-summary-value">${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%</div></div>
    `;
    summaryEl.classList.remove('hidden');

    const trendText = growth > 0 ? '상승 추세입니다.' : (growth < 0 ? '하락 추세입니다. 복습이 필요합니다.' : '유지 중입니다.');
    insightEl.textContent = `총 ${scores.length}회 기록 | 시작 대비 ${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%p 변화 | ${trendText}`;
    insightEl.classList.remove('hidden');

    tableBody.innerHTML = [...sorted].reverse().map((s) => {
        const score = Number(s.score || 0);
        const total = Number(s.totalScore || 100);
        const pct = Number(s.percentage || ((score / total) * 100));
        const date = s.testDate || parseDateValue(s.recordedAt).toLocaleDateString();
        return `<tr><td>${s.testName || '시험'}</td><td>${s.subject || '-'}</td><td>${score}/${total}</td><td>${pct.toFixed(1)}%</td><td>${date}</td></tr>`;
    }).join('');

    chart.classList.remove('chart-hidden');
    const ctx = chart.getContext('2d');
    const width = chart.width;
    const height = chart.height;
    ctx.clearRect(0, 0, width, height);

    const padLeft = 44;
    const padRight = 14;
    const padTop = 20;
    const padBottom = 36;
    const graphW = width - padLeft - padRight;
    const graphH = height - padTop - padBottom;

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i += 1) {
        const y = padTop + (graphH * i) / 5;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(width - padRight, y);
        ctx.stroke();
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '12px Segoe UI';
    [100, 80, 60, 40, 20, 0].forEach((label, idx) => {
        const y = padTop + (graphH * idx) / 5 + 4;
        ctx.fillText(String(label), 10, y);
    });

    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    percentages.forEach((value, idx) => {
        const x = padLeft + (percentages.length === 1 ? graphW / 2 : (graphW * idx) / (percentages.length - 1));
        const y = padTop + ((100 - Math.max(0, Math.min(100, value))) / 100) * graphH;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = '#ec4899';
    percentages.forEach((value, idx) => {
        const x = padLeft + (percentages.length === 1 ? graphW / 2 : (graphW * idx) / (percentages.length - 1));
        const y = padTop + ((100 - Math.max(0, Math.min(100, value))) / 100) * graphH;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = '#334155';
    const startLabel = sorted[0].testName || '시작';
    const endLabel = sorted[sorted.length - 1].testName || '최근';
    ctx.fillText(startLabel, padLeft, height - 12);
    ctx.fillText(endLabel, width - padRight - ctx.measureText(endLabel).width, height - 12);
}

// ============================================================
// Gemini API Calls
// ============================================================

async function callGeminiAPI(prompt, imageDataUrl = null, generationConfig = {}) {
    const maxRetries = 3;
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
        try {
        const parts = [{ text: prompt }];
        if (imageDataUrl && imageDataUrl.includes(',')) {
            const [header, base64] = imageDataUrl.split(',');
            const mimeMatch = header.match(/data:(.*?);base64/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            parts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: base64
                }
            });
        }

        const response = await apiFetch('/api/gemini-generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt,
                imageDataUrl,
                generationConfig
            })
        });

        if (!response.ok) {
            let detail = '';
            try {
                const errJson = await response.json();
                detail = errJson?.detail || errJson?.error || '';
            } catch (e) {
                detail = '';
            }
            const err = new Error(`Gemini API 오류: ${response.status}${detail ? ` - ${detail}` : ''}`);
            err.status = response.status;
            if (response.status === 405) {
                err.message = 'Gemini API 오류: 405 - 현재 접속 서버가 /api POST를 처리하지 않습니다. 백엔드를 127.0.0.1:5500에서 실행하세요.';
            }
            throw err;
        }

        const data = await response.json();
        return data.text || '';
        } catch (error) {
            lastError = error;
            const isRetryable =
                error.status === 429 ||
                error.status === 503 ||
                String(error.message).includes('429') ||
                String(error.message).includes('temporarily unavailable');
            if (isRetryable && attempt < maxRetries - 1) {
                const delay = 1200 * Math.pow(2, attempt);
                console.warn(`⚠️ Gemini 429 발생, ${delay}ms 후 재시도 (${attempt + 1}/${maxRetries})`);
                await wait(delay);
                continue;
            }
            break;
        }
    }
    console.error('❌ Gemini API 호출 실패:', lastError);
    throw lastError || new Error('Gemini API 호출 실패');
}

async function generateProblemFromBackend(topic, studentLevel) {
    const response = await apiFetch('/api/generate-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            topic: topic || '기본 문제',
            studentLevel: studentLevel || '중등',
            difficulty: '중',
            problemType: '객관식'
        })
    });

    if (!response.ok) {
        if (response.status === 405) {
            throw new Error('문제 생성 API 실패: 405 - 백엔드 POST 라우트가 없는 서버에 연결됨');
        }
        throw new Error(`문제 생성 API 실패: ${response.status}`);
    }
    const data = await response.json();
    return data.problem || null;
}

function renderLearningVisuals() {
    const tableBody = document.getElementById('reviewScheduleBody');
    const canvas = document.getElementById('learningProgressChart');
    if (!tableBody || !canvas) return;

    const baseDate = new Date();
    const schedule = [
        { step: '1차', offset: 0, retention: 100, action: '개념 재확인 및 대표문제 2개 풀이' },
        { step: '2차', offset: 1, retention: 85, action: '틀린 유형 중심 복습' },
        { step: '3차', offset: 3, retention: 72, action: '유사 문제 3개 풀이' },
        { step: '4차', offset: 7, retention: 60, action: '오답노트 재풀이 및 설명 말하기' },
        { step: '5차', offset: 14, retention: 48, action: '실전형 미니 테스트' }
    ];

    tableBody.innerHTML = schedule.map((item) => {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() + item.offset);
        return `<tr><td>${item.step}</td><td>${date.toLocaleDateString()}</td><td>${item.retention}%</td><td>${item.action}</td></tr>`;
    }).join('');

    canvas.classList.remove('chart-hidden');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const padLeft = 50;
    const padRight = 14;
    const padTop = 18;
    const padBottom = 34;
    const graphW = width - padLeft - padRight;
    const graphH = height - padTop - padBottom;

    ctx.strokeStyle = '#e2e8f0';
    for (let i = 0; i <= 5; i += 1) {
        const y = padTop + (graphH * i) / 5;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(width - padRight, y);
        ctx.stroke();
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '12px Segoe UI';
    [100, 80, 60, 40, 20, 0].forEach((value, idx) => {
        ctx.fillText(String(value), 14, padTop + (graphH * idx) / 5 + 4);
    });

    const points = schedule.map((item, idx) => ({
        x: padLeft + (graphW * idx) / (schedule.length - 1),
        y: padTop + ((100 - item.retention) / 100) * graphH
    }));

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i += 1) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    ctx.quadraticCurveTo(prev.x, prev.y, last.x, last.y);
    ctx.stroke();

    ctx.fillStyle = '#6366f1';
    schedule.forEach((item, idx) => {
        const x = points[idx].x;
        const y = points[idx].y;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText(item.step, x - 10, height - 12);
    });
}

// ============================================================
// Wrong Answers
// ============================================================

function displayWrongAnswers() {
    const container = document.getElementById('wrongAnswersList');
    if (!container) return;

    if (!wrongAnswers || wrongAnswers.length === 0) {
        container.innerHTML = '<p class="empty-message">오답 기록이 없습니다.</p>';
        return;
    }

    container.innerHTML = wrongAnswers.map(wa => `
        <div class="wrong-answer-item" style="padding: 15px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px; cursor: pointer;" onclick="showWrongAnswerDetail('${wa.id}')">
            <div style="display: flex; justify-content: space-between;">
                <div style="flex-grow: 1;">
                    ${wa.subject ? `<strong style="color: #007bff;">${wa.subject}</strong>` : ''}
                    <p style="margin: 8px 0; color: #666;">${wa.question || wa.problemText || '문제 없음'}</p>
                </div>
                <div style="color: #999; font-size: 0.9em;">
                    ${parseDateValue(wa.createdAt).toLocaleDateString()}
                </div>
            </div>
        </div>
    `).join('');
}

function showWrongAnswerDetail(id) {
    const wa = wrongAnswers.find(w => w.id === id);
    if (!wa) return;

    document.getElementById('detailProblem').textContent = wa.question || '문제 없음';
    document.getElementById('detailUserAnswer').textContent = wa.userAnswer || '답변 없음';
    document.getElementById('detailCorrectAnswer').textContent = wa.correctAnswer || '정답 없음';
    document.getElementById('detailAnalysis').innerHTML = `<p style="white-space: pre-wrap;">${normalizeAnalysisText(wa.analysis || '분석 준비 중입니다.')}</p>`;
    document.getElementById('wrongAnswerDetail').classList.remove('hidden');
}

// ============================================================
// Problems
// ============================================================

function displayProblems() {
    const container = document.getElementById('problemsList');
    if (!container) return;

    if (!problems || problems.length === 0) {
        container.innerHTML = '<p class="empty-message">문제가 없습니다.</p>';
        return;
    }

    container.innerHTML = problems.map((p, idx) => `
        <div class="problem-item" style="padding: 15px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px; cursor: pointer;" onclick="showProblemDetail(${idx})">
            <div style="display: flex; justify-content: space-between;">
                <div style="flex-grow: 1;">
                    ${p.subject ? `<strong>${p.subject}</strong>` : ''} - ${p.difficulty || '난이도 미정'}
                    <p style="margin: 8px 0; color: #666;">${p.title || p.problemText || '문제 없음'}</p>
                </div>
                <div style="color: #999; font-size: 0.9em;">
                    ${p.solved ? '✅ 완료' : '○ 미풀기'}
                </div>
            </div>
        </div>
    `).join('');
}

function showProblemDetail(idx) {
    if (idx < 0 || idx >= problems.length) return;
    
    currentProblemIndex = idx;
    const p = problems[idx];

    document.getElementById('problemTitle').textContent = p.title || '문제';
    document.getElementById('problem').textContent = p.problemText || p.question || '문제 없음';
    
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    
    if (p.options && Array.isArray(p.options)) {
        p.options.forEach((opt, i) => {
            const optionDiv = document.createElement('div');
            optionDiv.style.cssText = 'padding: 10px; margin: 10px 0; border: 2px solid #ddd; border-radius: 5px; cursor: pointer;';
            optionDiv.innerHTML = `<input type="radio" name="option" value="${i}" style="margin-right: 10px;"> <span>${opt}</span>`;
            optionDiv.onclick = () => {
                selectedAnswerIndex = i;
                optionsContainer.querySelectorAll('div').forEach(d => d.style.borderColor = '#ddd');
                optionDiv.style.borderColor = '#007bff';
            };
            optionsContainer.appendChild(optionDiv);
        });
    }

    document.getElementById('problemDetail').classList.remove('hidden');
    document.getElementById('resultContainer').classList.add('hidden');
}

async function submitAnswer() {
    if (selectedAnswerIndex < 0) {
        alert('답을 선택해주세요.');
        return;
    }

    const p = problems[currentProblemIndex];
    const isCorrect = selectedAnswerIndex === p.correctAnswerIndex;

    document.getElementById('resultMessage').textContent = isCorrect ? '✅ 정답입니다!' : '❌ 오답입니다.';
    document.getElementById('resultExplanation').innerHTML = `<p>${p.explanation || '설명이 없습니다.'}</p>`;
    document.getElementById('resultContainer').classList.remove('hidden');
}

function nextProblem() {
    currentProblemIndex++;
    if (currentProblemIndex < problems.length) {
        selectedAnswerIndex = -1;
        showProblemDetail(currentProblemIndex);
    } else {
        alert('모든 문제를 다 풀었습니다!');
        document.getElementById('problemDetail').classList.add('hidden');
    }
}

// ============================================================
// Problem Submission
// ============================================================

async function submitProblem() {
    const problemText = document.getElementById('problemImage')?.value.trim() || '';
    const description = document.getElementById('problemDescription')?.value.trim() || '';
    const userAnswer = document.getElementById('userAnswer')?.value.trim() || '';
    const correctAnswer = document.getElementById('correctAnswerInput')?.value.trim() || '';
    const subject = document.getElementById('subject')?.value || '수학';
    const level = document.getElementById('studentLevel')?.value || '중등';
    const generatePlanChecked = document.getElementById('generatePlan')?.checked;

    if (!problemText && !uploadedImageData) {
        alert('문제를 입력해주세요.');
        return;
    }

    const submitBtn = document.querySelector('#submit-page .submit-problem-btn');
    const originalBtnText = submitBtn?.textContent || '🚀 분석 요청';
    let problemGenerationWarning = '';

    try {
        if (!currentUserId) {
            alert('로그인 후 이용해주세요.');
            return;
        }

        setButtonLoading(submitBtn, true, '⏳ AI 분석 중...', originalBtnText);

        console.log('🚀 문제 분석 중...');
        
        // Gemini로 오답 분석하기
        const analysisPrompt = `
역할: 한국어 학습 코치
입력:
- 과목: ${subject}
- 수준: ${level}
- 문제: ${problemText || '이미지 문제'}
- 학생답: ${userAnswer || '없음'}
- 정답: ${correctAnswer || '미입력'}
출력 규칙:
- 아래 4줄만 출력(마크다운/코드블록 금지)
오답 원인: ...
개념 설명: ...
해결 방법: ...
유사 문제 팁: ...`;

        const imageForGemini = uploadedImageData ? await prepareImageForGemini(uploadedImageData) : null;
        const rawAnalysis = await callGeminiAPI(
            analysisPrompt,
            imageForGemini?.dataUrl || null,
            { maxOutputTokens: 240, temperature: 0.3 }
        );
        const analysis = normalizeAnalysisText(rawAnalysis);

        // 해설은 문제 생성/저장 실패와 분리하여 먼저 표시
        const resultDiv = document.getElementById('submitResult');
        if (resultDiv) {
            resultDiv.classList.remove('hidden');
            resultDiv.innerHTML = `
                <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; color: #155724;">
                    <h4>✅ 분석 완료!</h4>
                    <p><strong>AI 분석:</strong></p>
                    <p style="white-space: pre-wrap;">${analysis || '분석 결과가 비어 있습니다.'}</p>
                    ${imageForGemini?.partial ? `<p style="margin-top: 10px; color: #0c5460; background: #d1ecf1; padding: 8px; border-radius: 6px;">ℹ️ 이미지가 Gemini 최대 용량을 초과하여 일부 영역만 전송했습니다.</p>` : ''}
                </div>
            `;
        }

        // 비슷한 문제 생성 (선택)
        let generatedProblem = null;
        if (document.getElementById('generateProblems')?.checked) {
            try {
                const backendProblem = await generateProblemFromBackend(description || problemText || subject, level);
                if (!backendProblem) throw new Error('backend-problem-empty');
                generatedProblem = {
                    title: backendProblem.title || backendProblem.question || '생성 문제',
                    problemText: backendProblem.problemText || backendProblem.question || '',
                    options: Array.isArray(backendProblem.options) ? backendProblem.options : [],
                    correctAnswerIndex: Number.isInteger(backendProblem.correctAnswerIndex)
                        ? backendProblem.correctAnswerIndex
                        : (Number.isInteger(backendProblem.correctIndex) ? backendProblem.correctIndex : 0),
                    explanation: backendProblem.explanation || '설명이 없습니다.',
                    subject: backendProblem.subject || subject,
                    difficulty: backendProblem.difficulty || '중',
                    solved: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
            } catch (backendError) {
                console.warn('⚠️ 백엔드 문제 생성 실패, 직접 생성으로 폴백');

                try {
                    const problemPrompt = `
역할: ${subject} 문제 출제기
주제: ${description || problemText || '기본 개념'}
수준: ${level}
관련 유형 객관식 1문항을 JSON 1개로만 출력.
필수 키: question, options(5개), correctIndex(0~4), explanation
코드블록/설명문 금지.`;

                    const problemJson = await callGeminiAPI(problemPrompt, null, { maxOutputTokens: 180, temperature: 0.5 });
                    const parsed = extractJsonObject(problemJson);
                    if (!parsed) {
                        problemGenerationWarning = '유사 문제 자동 생성은 실패했지만, 오답 분석 결과는 정상 저장되었습니다.';
                    } else {
                        generatedProblem = {
                            title: parsed.title || parsed.question || '생성 문제',
                            problemText: parsed.question || parsed.problemText || '',
                            options: Array.isArray(parsed.options) ? parsed.options : [],
                            correctAnswerIndex: Number.isInteger(parsed.correctIndex) ? parsed.correctIndex : 0,
                            explanation: parsed.explanation || '설명이 없습니다.',
                            subject: subject,
                            difficulty: ['하', '중', '상'][Math.floor(Math.random() * 3)],
                            solved: false,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        };
                    }
                } catch (fallbackError) {
                    console.warn('⚠️ 직접 생성 폴백도 실패');
                    generatedProblem = null;
                    problemGenerationWarning = 'AI 유사 문제 생성에 실패했습니다. 잠시 후 다시 시도해주세요.';
                }
            }
        }

        try {
            await db.collection('users').doc(currentUserId).collection('wrongAnswers').add({
                subject,
                question: problemText || description || '이미지 문제',
                problemText: problemText || '',
                description,
                userAnswer,
                correctAnswer,
                analysis,
                image: uploadedImageData || null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (saveErr) {
            console.warn('⚠️ wrongAnswers 저장 실패');
        }

        try {
            await db.collection('users').doc(currentUserId).collection('submittedProblems').add({
                subject,
                studentLevel: level,
                question: problemText || description || '이미지 문제',
                userAnswer,
                correctAnswer,
                analysis,
                hasGeneratedProblem: !!generatedProblem,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (saveErr) {
            console.warn('⚠️ submittedProblems 저장 실패');
        }

        if (generatedProblem) {
            await db.collection('users').doc(currentUserId).collection('problems').add(generatedProblem);
        }

        if (resultDiv && problemGenerationWarning) {
            resultDiv.innerHTML = resultDiv.innerHTML.replace(
                '</div>',
                `<p style="margin-top: 10px; color: #856404; background: #fff3cd; padding: 8px; border-radius: 6px;">⚠️ ${problemGenerationWarning}</p></div>`
            );
        }

        console.log('✅ 문제 분석 완료');
        document.getElementById('problemImage').value = '';
        document.getElementById('problemDescription').value = '';
        document.getElementById('userAnswer').value = '';
        document.getElementById('correctAnswerInput').value = '';
        removeImage();
        await loadUserData();
        if (generatePlanChecked) {
            await generateLearningPlan({ silent: true });
        }

    } catch(error) {
        console.error('❌ 문제 분석 실패');
        const resultDiv = document.getElementById('submitResult');
        if (resultDiv) {
            resultDiv.classList.remove('hidden');
            resultDiv.innerHTML = `<div style="color: #721c24; background: #f8d7da; padding: 12px; border-radius: 8px;">❌ 문제 분석 실패: ${error.message}</div>`;
        }
    } finally {
        setButtonLoading(submitBtn, false, '⏳ AI 분석 중...', originalBtnText);
    }
}

// ============================================================
// Scores
// ============================================================

function displayScores() {
    const container = document.getElementById('scoresList');
    if (!container) return;

    if (!scores || scores.length === 0) {
        container.innerHTML = '<p class="empty-message">기록된 점수가 없습니다.</p>';
        renderScoreVisuals();
        return;
    }

    container.innerHTML = scores.map(s => {
        const numericScore = Number(s.score || 0);
        const numericTotal = Number(s.totalScore || 100);
        const percentage = ((numericScore / numericTotal) * 100).toFixed(1);
        return `
            <div style="padding: 15px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${s.testName}</strong> - ${s.subject}
                        <p style="margin: 5px 0; color: #666; font-size: 0.9em;">${s.testDate || parseDateValue(s.recordedAt).toLocaleDateString()}</p>
                    </div>
                    <div style="text-align: right;">
                        <h3 style="margin: 0; color: #007bff;">${numericScore}/${numericTotal}</h3>
                        <p style="margin: 5px 0; color: #28a745; font-weight: bold;">${percentage}%</p>
                    </div>
                </div>
                <div style="margin-top: 10px; text-align: right;">
                    <button onclick="deleteScore('${s.id}')" style="background:#ef4444;color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;">삭제</button>
                </div>
            </div>
        `;
    }).join('');
    renderScoreVisuals();
}

async function addScore() {
    const testName = document.getElementById('testName')?.value.trim();
    const testScore = parseFloat(document.getElementById('testScore')?.value) || 0;
    const totalScore = parseFloat(document.getElementById('totalScore')?.value) || 100;
    const testDate = document.getElementById('testDate')?.value;
    const subject = document.getElementById('testSubject')?.value;

    if (!testName || testScore < 0 || testScore > totalScore) {
        alert('유효한 정보를 입력해주세요.');
        return;
    }

    try {
        if (!currentUserId) {
            alert('로그인 후 점수를 기록해주세요.');
            return;
        }

        console.log('📊 점수 기록 중...');
        await db.collection('users').doc(currentUserId).collection('scores').add({
            testName,
            subject,
            score: testScore,
            totalScore,
            percentage: Number((testScore / totalScore * 100).toFixed(1)),
            testDate,
            recordedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        document.getElementById('testName').value = '';
        document.getElementById('testScore').value = '';
        document.getElementById('totalScore').value = '100';
        document.getElementById('testDate').value = new Date().toISOString().split('T')[0];

        await loadUserData();
        console.log('✅ 점수 기록 완료');

    } catch(error) {
        console.error('❌ 점수 기록 실패');
    }
}

async function deleteScore(scoreId) {
    if (!scoreId || !currentUserId) return;
    if (!confirm('이 점수 기록을 삭제하시겠습니까?')) return;

    try {
        await db.collection('users').doc(currentUserId).collection('scores').doc(scoreId).delete();
        await loadUserData();
        alert('점수 기록이 삭제되었습니다.');
    } catch (error) {
        console.error('❌ 점수 삭제 실패');
        alert('점수 삭제 실패: ' + error.message);
    }
}

// ============================================================
// Learning Plan
// ============================================================

async function generateLearningPlan(options = {}) {
    const planBtn = document.querySelector('#learning-page .generate-plan-btn');
    const originalText = planBtn?.textContent || '학습 계획 생성';
    try {
        if (!options.silent) {
            setButtonLoading(planBtn, true, '⏳ 학습 계획 생성 중...', originalText);
        }
        console.log('📅 학습 계획 생성 중...');
        
        const prompt = `
역할: 학습 플래너
입력:
- 오답수=${wrongAnswers.length}
- 문제수=${problems.length}
- 평균=${scores.length > 0 ? (scores.reduce((a, b) => a + Number(b.percentage || 0), 0) / scores.length).toFixed(1) : '미정'}
출력규칙:
1) 아래 4줄만 출력
2) 각 줄은 실행 가능한 행동/수치 포함
약점 부분: 핵심개념3개, 우선순위
복습 일정: 오늘/1일/3일/7일 계획
학습 방법: 1회 학습 루틴(시간,문항수)
목표 점수: 다음 시험 목표와 달성조건`;

        const plan = sanitizeAiText(await callGeminiAPI(prompt, null, { maxOutputTokens: 160, temperature: 0.3 }));
        const lines = plan.split('\n').map((line) => line.trim()).filter(Boolean);
        
        document.getElementById('weakPoints').innerHTML = `<p>${lines[0] || '약점 분석 결과가 없습니다.'}</p>`;
        document.getElementById('reviewSchedule').innerHTML = `<p>${lines[1] || '복습 일정이 없습니다.'}</p>`;
        document.getElementById('studyMethods').innerHTML = `<p>${lines[2] || '학습 방법이 없습니다.'}</p>`;
        document.getElementById('targetScore').innerHTML = `<p>${lines[3] || '목표 점수가 없습니다.'}</p>`;
        renderLearningVisuals();

        if (currentUserId) {
            await db.collection('users').doc(currentUserId).collection('learningPlans').add({
                rawPlan: plan,
                weakPoints: lines[0] || '',
                reviewSchedule: lines[1] || '',
                studyMethods: lines[2] || '',
                targetScore: lines[3] || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        console.log('✅ 학습 계획 생성 완료');

    } catch(error) {
        console.error('❌ 학습 계획 생성 실패');
    } finally {
        if (!options.silent) {
            setButtonLoading(planBtn, false, '⏳ 학습 계획 생성 중...', originalText);
        }
    }
}

// ============================================================
// Image Upload
// ============================================================

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드할 수 있습니다.');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        uploadedImageData = e.target.result;
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
            const processed = await prepareImageForGemini(uploadedImageData);
            uploadedImageData = processed.dataUrl;
            alert(`원본 이미지가 너무 커서 AI 전송용으로 자동 축소${processed.partial ? '/부분 전송' : ''} 처리했습니다.`);
        }
        const preview = document.getElementById('previewImage');
        const previewBox = document.getElementById('imagePreview');
        const placeholder = document.getElementById('uploadPlaceholder');
        if (preview) preview.src = uploadedImageData;
        previewBox?.classList.remove('hidden');
        placeholder?.classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    uploadedImageData = null;
    document.getElementById('problemImageFile').value = '';
    const preview = document.getElementById('previewImage');
    const previewBox = document.getElementById('imagePreview');
    const placeholder = document.getElementById('uploadPlaceholder');
    if (preview) preview.src = '';
    previewBox?.classList.add('hidden');
    placeholder?.classList.remove('hidden');
}

// ============================================================
// Event Listeners Setup
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('\n🔨 페이지 초기화 중...\n');

    // 주소 진입 직후 즉시 로그인 화면 표시
    showAuthContainer();
    hideAppContainer();
    navigateTo('main');
    
    // Firebase SDK 로드 대기
    waitForFirebase();
    
    // 날짜 기본값
    const testDateInput = document.getElementById('testDate');
    if (testDateInput) {
        testDateInput.value = new Date().toISOString().split('T')[0];
    }

    // 전역 함수 등록 (onclick 핸들러용)
    window.handleLogin = handleLogin;
    window.handleSignup = handleSignup;
    window.handleLogout = handleLogout;
    window.switchToLogin = switchToLogin;
    window.switchToSignup = switchToSignup;
    window.navigateTo = navigateTo;
    window.submitProblem = submitProblem;
    window.addScore = addScore;
    window.deleteScore = deleteScore;
    window.generateLearningPlan = generateLearningPlan;
    window.submitAnswer = submitAnswer;
    window.nextProblem = nextProblem;
    window.showProblemDetail = showProblemDetail;
    window.showWrongAnswerDetail = showWrongAnswerDetail;
    window.handleImageUpload = handleImageUpload;
    window.removeImage = removeImage;

    console.log('✅ 페이지 초기화 완료\n');
});
