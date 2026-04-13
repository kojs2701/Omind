// ============================================================
// Firebase SDK - 전역 객체 사용 (firebase-app, auth, firestore)
// ============================================================

console.log('✅ Firebase SDK 로드 대기 중...\n');

// Firebase가 로드될 때까지 대기
let app, auth, db, firebaseReady = false;
const firebaseConfig = {
    apiKey: "AIzaSyBHLhCs5GGmcGAPfuKuc_deEnBOdk1azmw",
    authDomain: "omind-49f39.firebaseapp.com",
    projectId: "omind-49f39",
    storageBucket: "omind-49f39.firebasestorage.app",
    messagingSenderId: "712208723667",
    appId: "1:712208723667:web:61f4e327aee6680a9b6e26"
};

function initializeFirebase() {
    console.log('🔥 Firebase 초기화 중...');

    try {
        // Firebase 전역 객체 사용
        app = firebase.initializeApp(firebaseConfig);
        console.log('  ✅ App 초기화 완료:', app.name);
        
        auth = firebase.getAuth(app);
        console.log('  ✅ Auth 초기화 완료');
        
        db = firebase.firestore();
        console.log('  ✅ Firestore 초기화 완료');
        
        firebaseReady = true;
        
        console.log('\n✅ Firebase SDK 완전히 초기화됨!\n');
        
        // Auth 리스너 설정
        setupAuthListener();
    } catch (error) {
        console.error('\n❌ Firebase 초기화 오류!');
        console.error('  - 오류:', error);
        firebaseReady = false;
        // 재시도
        setTimeout(initializeFirebase, 1000);
    }
}

// ============================================================
// Helper Functions - Firebase Firestore
// ============================================================

function docRef(path) {
    return db.collection(path.split('/')[0]).doc(path.split('/')[1]);
}

function setDocData(path, data) {
    const parts = path.split('/');
    return db.collection(parts[0]).doc(parts[1]).set(data);
}

function getDocData(path) {
    const parts = path.split('/');
    return db.collection(parts[0]).doc(parts[1]).get();
}

// ============================================================
// Global State Variables
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
// Authentication State Listener Setup
// ============================================================

function setupAuthListener() {
    console.log('🔐 Auth 리스너 설정 중...');
    
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log('👤 로그인 감지:', user.email);
            currentUser = user;
            currentUserId = user.uid;
            hideAuthContainer();
            showAppContainer();
            loadUserData();
        } else {
            console.log('👤 로그아웃 감지');
            currentUser = null;
            currentUserId = null;
            resetAllData();
            showAuthContainer();
            hideAppContainer();
        }
        updateUserDisplay();
    });
    
    console.log('✅ Auth 리스너 설정 완료\n');
}

// ============================================================
// Authentication Functions
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
    if (app) {
        app.classList.remove('hidden');
    }
}

function hideAppContainer() {
    const app = document.getElementById('app');
    if (app) {
        app.classList.add('hidden');
    }
}

function switchToSignup() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginError = document.getElementById('loginError');
    
    if (loginForm) loginForm.classList.add('hidden');
    if (signupForm) signupForm.classList.remove('hidden');
    if (loginError) loginError.classList.add('hidden');
}

function switchToLogin() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const signupError = document.getElementById('signupError');
    
    if (signupForm) signupForm.classList.add('hidden');
    if (loginForm) loginForm.classList.remove('hidden');
    if (signupError) signupError.classList.add('hidden');
}

async function handleLogin() {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const errorDiv = document.getElementById('loginError');

    if (!emailInput || !passwordInput || !errorDiv) {
        console.error('❌ 폼 요소를 찾을 수 없습니다');
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!firebaseReady || !db) {
        errorDiv.textContent = '⏳ Firebase 초기화 중... 잠시 후 다시 시도하세요';
        errorDiv.classList.remove('hidden');
        console.warn('⏳ Firebase 준비 중...');
        setTimeout(handleLogin, 500);
        return;
    }

    if (!email || !password) {
        errorDiv.textContent = '이메일과 비밀번호를 입력해주세요.';
        errorDiv.classList.remove('hidden');
        return;
    }

    try {
        console.log('\n' + '='.repeat(50));
        console.log('🔐 로그인 시작');
        console.log('='.repeat(50));
        console.log('이메일:', email);
        console.log('비밀번호:', password);

        // Firestore에서 사용자 찾기
        console.log('\n📌 Firestore에서 사용자 검색');
        const docId = email.replace(/[^a-zA-Z0-9]/g, '_');
        const userRef = doc(db, 'test_users', docId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            console.log('  ❌ 사용자를 찾을 수 없습니다');
            throw new Error('user-not-found');
        }

        const userData = userSnap.data();
        console.log('  ✅ 사용자 데이터 조회 완료');
        console.log('  - 저장된 이메일:', userData.email);
        console.log('  - 저장된 사용자명:', userData.username);

        // 비밀번호 확인
        console.log('\n📌 비밀번호 확인');
        if (userData.password !== password) {
            console.log('  ❌ 비밀번호 불일치');
            throw new Error('wrong-password');
        }
        console.log('  ✅ 비밀번호 일치!');

        // 로그인 성공
        currentUser = {
            uid: docId,
            email: userData.email,
            displayName: userData.username
        };
        currentUserId = docId;

        console.log('\n✅ 로그인 성공!');
        console.log('  - 사용자 UID:', currentUserId);
        console.log('  - 사용자명:', userData.username);
        console.log('='.repeat(50) + '\n');

        errorDiv.classList.add('hidden');
        emailInput.value = '';
        passwordInput.value = '';
        
        hideAuthContainer();
        showAppContainer();
        loadUserData();
        updateUserDisplay();

    } catch (error) {
        console.error('\n' + '='.repeat(50));
        console.error('❌ 로그인 오류:');
        console.error('='.repeat(50));
        console.error('  - 오류:', error.message);
        console.error('='.repeat(50) + '\n');

        let errorMsg = '로그인 실패: ';
        if (error.message === 'user-not-found') {
            errorMsg += '등록된 사용자가 없습니다.';
        } else if (error.message === 'wrong-password') {
            errorMsg += '비밀번호가 일치하지 않습니다.';
        } else {
            errorMsg += error.message;
        }

        errorDiv.textContent = errorMsg;
        errorDiv.classList.remove('hidden');
    }
}

async function handleSignup() {
    const emailInput = document.getElementById('signupEmail');
    const passwordInput = document.getElementById('signupPassword');
    const passwordConfirmInput = document.getElementById('signupPasswordConfirm');
    const usernameInput = document.getElementById('signupUsername');
    const errorDiv = document.getElementById('signupError');

    if (!emailInput || !passwordInput || !passwordConfirmInput || !usernameInput || !errorDiv) {
        console.error('❌ 폼 요소를 찾을 수 없습니다');
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const passwordConfirm = passwordConfirmInput.value.trim();
    const username = usernameInput.value.trim();

    if (!firebaseReady || !db) {
        errorDiv.textContent = '⏳ Firebase 초기화 중... 잠시 후 다시 시도하세요';
        errorDiv.classList.remove('hidden');
        console.warn('⏳ Firebase 준비 중...');
        setTimeout(handleSignup, 500);
        return;
    }

    if (!email || !password || !passwordConfirm || !username) {
        errorDiv.textContent = '모든 필드를 입력해주세요.';
        errorDiv.classList.remove('hidden');
        return;
    }

    if (!email.includes('@')) {
        errorDiv.textContent = '유효한 이메일을 입력해주세요.';
        errorDiv.classList.remove('hidden');
        return;
    }

    if (password !== passwordConfirm) {
        errorDiv.textContent = '비밀번호가 일치하지 않습니다.';
        errorDiv.classList.remove('hidden');
        return;
    }

    if (password.length < 6) {
        errorDiv.textContent = '비밀번호는 6자 이상이어야 합니다.';
        errorDiv.classList.remove('hidden');
        return;
    }

    if (username.length < 2) {
        errorDiv.textContent = '사용자명은 2자 이상이어야 합니다.';
        errorDiv.classList.remove('hidden');
        return;
    }

    try {
        console.log('\n' + '='.repeat(50));
        console.log('📝 회원가입 시작');
        console.log('='.repeat(50));
        console.log('이메일:', email);
        console.log('사용자명:', username);

        // Firestore에 사용자 저장
        console.log('\n📌 사용자 데이터 저장 중...');
        try {
            const docId = email.replace(/[^a-zA-Z0-9]/g, '_');
            const userRef = doc(db, 'test_users', docId);
            console.log('  - 문서 경로:', userRef.path);
            
            await setDoc(userRef, {
                email: email,
                username: username,
                password: password,
                createdAt: serverTimestamp()
            });
            console.log('  ✅ Firestore 저장 성공!');
            console.log('  - 저장 위치: test_users/' + docId);

            // 자동 로그인 처리
            console.log('\n📌 자동 로그인 진행 중...');
            currentUser = {
                uid: docId,
                email: email,
                displayName: username
            };
            currentUserId = docId;

            console.log('✅ 회원가입 및 자동 로그인 완료!');
            console.log('  - 사용자 UID:', currentUserId);
            console.log('  - 사용자명:', username);
            console.log('='.repeat(50) + '\n');

            // UI 업데이트
            errorDiv.classList.add('hidden');
            emailInput.value = '';
            passwordInput.value = '';
            passwordConfirmInput.value = '';
            usernameInput.value = '';
            
            // 로그인 페이지 숨기고 앱 표시
            hideAuthContainer();
            showAppContainer();
            loadUserData();
            updateUserDisplay();

        } catch (saveError) {
            console.error('  ❌ Firestore 저장 실패:');
            console.error('     - 코드:', saveError.code);
            console.error('     - 메시지:', saveError.message);
            throw saveError;
        }

    } catch (error) {
        console.error('\n' + '='.repeat(50));
        console.error('❌ 회원가입 실패:');
        console.error('='.repeat(50));
        console.error('  - 오류 코드:', error.code);
        console.error('  - 오류 메시지:', error.message);
        console.error('='.repeat(50) + '\n');
        
        errorDiv.textContent = '❌ 회원가입 실패: ' + error.message;
        errorDiv.classList.remove('hidden');
        errorDiv.style.color = 'red';
    }
}

function getErrorMessage(error) {
    const mapErrors = {
        'auth/email-already-in-use': '이미 가입된 이메일입니다.',
        'auth/invalid-email': '유효하지 않은 이메일입니다.',
        'auth/user-not-found': '가입된 계정이 없습니다.',
        'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
        'auth/weak-password': '비밀번호가 너무 약합니다.',
        'auth/operation-not-allowed': 'Firebase 이메일 인증이 비활성화되었습니다.',
        'auth/network-request-failed': '네트워크 연결에 실패했습니다.',
        'permission-denied': 'Firestore 접근 권한이 없습니다.',
        'failed-precondition': 'Firestore가 아직 준비 중입니다.',
    };
    return mapErrors[error.code] || error.message || '알 수 없는 오류';
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

async function handleLogout() {
    try {
        console.log('🚪 로그아웃 중...');
        resetAllData();
        showAuthContainer();
        hideAppContainer();
        console.log('✅ 로그아웃 완료');
    } catch (error) {
        console.error('❌ 로그아웃 실패:', error.message);
        alert('로그아웃 실패: ' + error.message);
    }
}

function resetAllData() {
    currentPage = 'main';
    currentUser = null;
    currentUserId = null;
    wrongAnswers = [];
    problems = [];
    scores = [];
    selectedProblems = [];
    currentProblemIndex = 0;
    selectedAnswerIndex = -1;
    uploadedImageData = null;
}

// ============================================================
// User Data Functions
// ============================================================

async function loadUserData() {
    try {
        console.log('📂 사용자 데이터 로드 중...');

        // 기본 사용자 정보
        try {
            const userRef = doc(db, 'users', currentUserId);
            const userDoc = await getDoc(userRef);
            if (!userDoc.exists()) {
                console.log('⚠️ 신규 사용자 - 문서 생성');
                await setDoc(userRef, {
                    username: currentUser.displayName || currentUser.email,
                    email: currentUser.email,
                    createdAt: serverTimestamp(),
                    lastLoginAt: serverTimestamp(),
                });
            }
        } catch (e) {
            console.error('❌ 사용자 정보 로드 오류:', e.message);
        }

        // 오답 데이터
        try {
            const q = query(collection(db, 'users', currentUserId, 'wrongAnswers'), orderBy('createdAt', 'desc'), limit(50));
            const snapshot = await getDocs(q);
            wrongAnswers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            console.log('  ✅ 오답:', wrongAnswers.length + '개');
        } catch (e) {
            console.error('⚠️ 오답 로드 오류:', e.message);
            wrongAnswers = [];
        }

        // 문제 데이터
        try {
            const q = query(collection(db, 'users', currentUserId, 'problems'), orderBy('createdAt', 'desc'), limit(50));
            const snapshot = await getDocs(q);
            problems = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            console.log('  ✅ 문제:', problems.length + '개');
        } catch (e) {
            console.error('⚠️ 문제 로드 오류:', e.message);
            problems = [];
        }

        // 점수 데이터
        try {
            const q = query(collection(db, 'users', currentUserId, 'scores'), orderBy('recordedAt', 'desc'), limit(100));
            const snapshot = await getDocs(q);
            scores = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            console.log('  ✅ 점수:', scores.length + '개');
        } catch (e) {
            console.error('⚠️ 점수 로드 오류:', e.message);
            scores = [];
        }

        console.log('✅ 사용자 데이터 로드 완료\n');
    } catch (error) {
        console.error('❌ 데이터 로드 오류:', error.message);
    }
}

// ============================================================
// Page Navigation
// ============================================================

function navigateTo(page) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active'));

    const targetPage = document.getElementById(page + '-page');
    if (targetPage) {
        targetPage.classList.add('active');
        currentPage = page;
        updateCurrentPageDisplay();
    }
}

function updateCurrentPageDisplay() {
    const currentPageElement = document.getElementById('currentPage');
    if (!currentPageElement) return;
    
    const pageNames = {
        main: '메인',
        wrong: '오답노트',
        problems: '문제',
        learning: '학습 추천',
        submit: '문제 전송',
        scores: '점수 기록',
    };
    currentPageElement.textContent = pageNames[currentPage] || '메인';
}

// ============================================================
// Image Upload
// ============================================================

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        uploadedImageData = e.target.result;
        const previewImg = document.getElementById('uploadedImagePreview');
        if (previewImg) {
            previewImg.src = uploadedImageData;
            previewImg.style.display = 'block';
        }
    };
    reader.readAsDataURL(file);
}

function clearUploadedImage() {
    uploadedImageData = null;
    const fileInput = document.getElementById('imageFile');
    if (fileInput) fileInput.value = '';
    const previewImg = document.getElementById('uploadedImagePreview');
    if (previewImg) previewImg.style.display = 'none';
}

// ============================================================
// Wrong Answer Functions
// ============================================================

async function addWrongAnswer() {
    const subject = document.getElementById('wrongSubject')?.value.trim() || '';
    const question = document.getElementById('wrongQuestion')?.value.trim() || '';
    const userAnswer = document.getElementById('wrongUserAnswer')?.value.trim() || '';
    const correctAnswer = document.getElementById('wrongCorrectAnswer')?.value.trim() || '';

    if (!subject || !question) {
        alert('과목과 문제는 필수입니다.');
        return;
    }

    try {
        await addDoc(collection(db, 'users', currentUserId, 'wrongAnswers'), {
            subject,
            question,
            userAnswer,
            correctAnswer,
            image: uploadedImageData || null,
            createdAt: serverTimestamp()
        });

        document.getElementById('wrongSubject').value = '';
        document.getElementById('wrongQuestion').value = '';
        document.getElementById('wrongUserAnswer').value = '';
        document.getElementById('wrongCorrectAnswer').value = '';
        clearUploadedImage();

        loadUserData();
        console.log('✅ 오답 추가 완료');
    } catch (error) {
        alert('오답 추가 실패: ' + error.message);
    }
}

async function deleteWrongAnswer(id) {
    if (!confirm('이 오답을 삭제하시겠습니까?')) return;
    
    try {
        await deleteDoc(doc(db, 'users', currentUserId, 'wrongAnswers', id));
        wrongAnswers = wrongAnswers.filter(w => w.id !== id);
        console.log('✅ 오답 삭제 완료');
    } catch (error) {
        alert('삭제 실패: ' + error.message);
    }
}

function loadWrongAnswers() {
    const container = document.getElementById('wrongAnswersContainer');
    if (!container) return;

    if (wrongAnswers.length === 0) {
        container.innerHTML = '<p class="empty-message">오답이 없습니다.</p>';
        return;
    }

    container.innerHTML = wrongAnswers.map(wa => `
        <div class="answer-card">
            <h4>${wa.subject || '과목'}</h4>
            <p>${wa.question || '질문'}</p>
            ${wa.userAnswer ? `<p><strong>내 답:</strong> ${wa.userAnswer}</p>` : ''}
            ${wa.correctAnswer ? `<p><strong>정답:</strong> ${wa.correctAnswer}</p>` : ''}
            <button onclick="deleteWrongAnswer('${wa.id}')">삭제</button>
        </div>
    `).join('');
}

// ============================================================
// Problem Functions
// ============================================================

async function generateProblems() {
    alert('이 기능은 백엔드와 연동이 필요합니다.');
}

async function markProblemSolved(id) {
    try {
        await updateDoc(doc(db, 'users', currentUserId, 'problems', id), {
            solved: true,
            solvedAt: serverTimestamp()
        });
        loadUserData();
        console.log('✅ 문제 완료 표시');
    } catch (error) {
        alert('실패: ' + error.message);
    }
}

function loadProblems() {
    const container = document.getElementById('problemsContainer');
    if (!container) return;

    if (problems.length === 0) {
        container.innerHTML = '<p class="empty-message">문제가 없습니다.</p>';
        return;
    }

    container.innerHTML = problems.map(p => `
        <div class="problem-card">
            <h4>${p.title || '문제'}</h4>
            <p>${p.description || ''}</p>
            <button onclick="markProblemSolved('${p.id}')">완료</button>
        </div>
    `).join('');
}

// ============================================================
// Score Functions
// ============================================================

function loadScores() {
    const container = document.getElementById('scoresContainer');
    if (!container) return;

    if (scores.length === 0) {
        container.innerHTML = '<p class="empty-message">점수 기록이 없습니다.</p>';
        return;
    }

    container.innerHTML = scores.map(s => `
        <div class="score-card">
            <h4>${s.subject || '과목'}</h4>
            <p>점수: ${s.score || 0}점</p>
            <p>${new Date(s.recordedAt?.seconds * 1000 || Date.now()).toLocaleDateString()}</p>
        </div>
    `).join('');
}

// ============================================================
// Problem Submission (문제 전송)
// ============================================================

async function submitProblem() {
    const problemText = document.getElementById('problemImage')?.value.trim() || '';
    const description = document.getElementById('problemDescription')?.value.trim() || '';
    const userAnswer = document.getElementById('userAnswer')?.value.trim() || '';
    const correctAnswer = document.getElementById('correctAnswerInput')?.value.trim() || '';
    const studentLevel = document.getElementById('studentLevel')?.value || '중등';
    const subject = document.getElementById('subject')?.value || '수학';
    const generateProblemsChecked = document.getElementById('generateProblems')?.checked || false;
    const generatePlanChecked = document.getElementById('generatePlan')?.checked || false;
    const submitResult = document.getElementById('submitResult');

    if (!problemText && !uploadedImageData) {
        alert('문제 이미지 또는 텍스트를 입력해주세요.');
        return;
    }

    try {
        console.log('\n📤 문제 전송 중...');
        console.log('  - 과목:', subject);
        console.log('  - 수준:', studentLevel);
        console.log('  - 설명 여부:', !!description);
        console.log('  - 문제 생성:', generateProblemsChecked);
        console.log('  - 계획 생성:', generatePlanChecked);

        // Firestore에 문제 저장
        const submittedProblem = {
            problemText: problemText,
            description: description,
            userAnswer: userAnswer,
            correctAnswer: correctAnswer,
            image: uploadedImageData || null,
            studentLevel: studentLevel,
            subject: subject,
            generateProblems: generateProblemsChecked,
            generatePlan: generatePlanChecked,
            submittedAt: serverTimestamp(),
            status: 'pending',
        };

        // 
        const docRef = await addDoc(collection(db, 'submitted_problems'), submittedProblem);
        console.log('  ✅ 문제 저장 완료:', docRef.id);

        // UI 업데이트
        if (submitResult) {
            submitResult.classList.remove('hidden');
            submitResult.innerHTML = `
                <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; color: #155724;">
                    <h4>✅ 문제 전송 완료!</h4>
                    <p>문제가 AI 분석을 위해 제출되었습니다.</p>
                    <p style="font-size: 0.9em; margin-top: 10px;">
                        분석 결과는 '오답노트' 페이지에서 확인할 수 있습니다.<br>
                        ${generateProblemsChecked ? '• 유사 문제가 \"문제\" 페이지에 추가됩니다<br>' : ''}
                        ${generatePlanChecked ? '• 학습 계획이 \"학습 추천\" 페이지에 추가됩니다<br>' : ''}
                    </p>
                </div>
            `;
        }

        // 폼 초기화
        document.getElementById('problemImage').value = '';
        document.getElementById('problemDescription').value = '';
        document.getElementById('userAnswer').value = '';
        document.getElementById('correctAnswerInput').value = '';
        removeImage();

        console.log('✅ 문제 전송 완료!\n');

    } catch (error) {
        console.error('❌ 문제 전송 실패:', error.message);
        if (submitResult) {
            submitResult.classList.remove('hidden');
            submitResult.innerHTML = `<div style="color: #721c24; background: #f8d7da; padding: 10px; border-radius: 5px;">❌ 전송 실패: ${error.message}</div>`;
        }
    }
}

// ============================================================
// Score Recording (점수 기록)
// ============================================================

async function addScore() {
    const testName = document.getElementById('testName')?.value.trim() || '';
    const testScore = parseFloat(document.getElementById('testScore')?.value) || 0;
    const totalScore = parseFloat(document.getElementById('totalScore')?.value) || 100;
    const testDate = document.getElementById('testDate')?.value || new Date().toISOString().split('T')[0];
    const subject = document.getElementById('testSubject')?.value || '수학';

    if (!testName) {
        alert('시험명을 입력해주세요.');
        return;
    }

    if (testScore < 0 || testScore > totalScore) {
        alert('유효한 점수를 입력해주세요.');
        return;
    }

    try {
        console.log('\n📊 점수 기록 중...');
        
        const scorePercentage = (testScore / totalScore) * 100;
        
        await addDoc(collection(db, 'users', currentUserId, 'scores'), {
            testName: testName,
            subject: subject,
            score: testScore,
            totalScore: totalScore,
            percentage: scorePercentage,
            testDate: testDate,
            recordedAt: serverTimestamp()
        });

        console.log('  ✅ 점수 저장 완료');
        console.log('  - 시험명:', testName);
        console.log('  - 과목:', subject);
        console.log('  - 점수:', testScore + '/' + totalScore);
        console.log('  - 비율:', scorePercentage.toFixed(1) + '%');

        // 폼 초기화
        document.getElementById('testName').value = '';
        document.getElementById('testScore').value = '';
        document.getElementById('totalScore').value = '100';
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('testDate').value = today;

        // 데이터 재로드
        await loadUserData();
        displayScores();

        console.log('✅ 점수 기록 완료!\n');

    } catch (error) {
        console.error('❌ 점수 기록 실패:', error.message);
        alert('점수 기록 실패: ' + error.message);
    }
}

// ============================================================
// Display Functions (UI 업데이트)
// ============================================================

function displayScores() {
    const scoresList = document.getElementById('scoresList');
    if (!scoresList) return;

    if (!scores || scores.length === 0) {
        scoresList.innerHTML = '<p class="empty-message">기록된 점수가 없습니다.</p>';
        return;
    }

    scoresList.innerHTML = scores.map(s => {
        const percentage = ((s.score / s.totalScore) * 100).toFixed(1);
        return `
            <div class="score-item" style="padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${s.testName}</strong> - ${s.subject || '과목'}
                        <p style="margin: 5px 0; color: #666; font-size: 0.9em;">${new Date(s.testDate || Date.now()).toLocaleDateString()}</p>
                    </div>
                    <div style="text-align: right;">
                        <h3 style="margin: 0; color: #007bff;">${s.score}/${s.totalScore}</h3>
                        <p style="margin: 5px 0; color: #28a745; font-weight: bold;">${percentage}%</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function displayWrongAnswers() {
    const wrongAnswersList = document.getElementById('wrongAnswersList');
    if (!wrongAnswersList) return;

    if (!wrongAnswers || wrongAnswers.length === 0) {
        wrongAnswersList.innerHTML = '<p class="empty-message">오답 기록이 없습니다. 문제를 풀고 오답을 등록해주세요.</p>';
        return;
    }

    wrongAnswersList.innerHTML = wrongAnswers.map(wa => `
        <div class="wrong-answer-item" style="padding: 15px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px; cursor: pointer;" onclick="showWrongAnswerDetail('${wa.id}')">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="flex-grow: 1;">
                    ${wa.subject ? `<strong style="color: #007bff;">${wa.subject}</strong>` : ''}
                    <p style="margin: 5px 0;">${(wa.question || wa.problemText || '').substring(0, 100)}...</p>
                </div>
                <div style="text-align: right; color: #999; font-size: 0.9em;">
                    ${new Date(wa.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}
                </div>
            </div>
        </div>
    `).join('');
}

function displayProblems() {
    const problemsList = document.getElementById('problemsList');
    if (!problemsList) return;

    if (!problems || problems.length === 0) {
        problemsList.innerHTML = '<p class="empty-message">문제가 없습니다. 문제를 생성해주세요.</p>';
        return;
    }

    problemsList.innerHTML = problems.map((p, idx) => `
        <div class="problem-item" style="padding: 15px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px; cursor: pointer;" onclick="showProblemDetail(${idx})">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="flex-grow: 1;">
                    ${p.subject ? `<strong>${p.subject}</strong> - ` : ''}
                    <span style="color: #666;">${p.difficulty || '?'} 난이도</span>
                    <p style="margin: 8px 0;">${(p.title || p.problemText || '문제').substring(0, 100)}...</p>
                </div>
                <div style="text-align: right;">
                    ${p.solved ? '<span style="color: #28a745;">✅ 완료</span>' : '<span style="color: #dc3545;">○ 미풀기</span>'}
                </div>
            </div>
        </div>
    `).join('');
}

function showWrongAnswerDetail(id) {
    const wa = wrongAnswers.find(w => w.id === id);
    if (!wa) return;

    document.getElementById('detailProblem').textContent = wa.question || wa.problemText || '문제 없음';
    document.getElementById('detailUserAnswer').textContent = wa.userAnswer || '답변 없음';
    document.getElementById('detailCorrectAnswer').textContent = wa.correctAnswer || '정답 없음';
    document.getElementById('detailAnalysis').innerHTML = `<p>${wa.analysis || 'AI 분석이 아직 준비 중입니다.'}</p>`;

    document.getElementById('wrongAnswerDetail').classList.remove('hidden');
}

function showProblemDetail(idx) {
    if (idx < 0 || idx >= problems.length) return;
    
    currentProblemIndex = idx;
    const p = problems[idx];

    document.getElementById('problemTitle').textContent = p.title || '문제';
    document.getElementById('problem').textContent = p.problemText || p.question || '문제 없음';
    
    // 선택지 표시
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    
    if (p.options && Array.isArray(p.options)) {
        p.options.forEach((opt, i) => {
            const optionDiv = document.createElement('div');
            optionDiv.style.cssText = 'padding: 10px; margin: 10px 0; border: 2px solid #ddd; border-radius: 5px; cursor: pointer; display: flex; align-items: center;';
            optionDiv.innerHTML = `
                <input type="radio" name="option" value="${i}" style="margin-right: 10px;"> 
                <span>${opt}</span>
            `;
            optionDiv.onclick = () => {
                selectedAnswerIndex = i;
                optionDiv.parentElement.querySelectorAll('div').forEach(d => d.style.borderColor = '#ddd');
                optionDiv.style.borderColor = '#007bff';
            };
            optionsContainer.appendChild(optionDiv);
        });
    }

    document.getElementById('problemDetail').classList.remove('hidden');
    document.getElementById('resultContainer').classList.add('hidden');
    document.getElementById('submitAnswerBtn').classList.remove('hidden');
    document.getElementById('nextProblemBtn').classList.add('hidden');
}

// ============================================================
// Problem Solving (문제 풀기)
// ============================================================

async function submitAnswer() {
    if (selectedAnswerIndex < 0) {
        alert('답을 선택해주세요.');
        return;
    }

    const p = problems[currentProblemIndex];
    const isCorrect = selectedAnswerIndex === p.correctAnswerIndex;

    document.getElementById('resultMessage').textContent = isCorrect ? '✅ 정답입니다!' : '❌ 오답입니다.';
    document.getElementById('resultExplanation').innerHTML = `
        <p><strong>설명:</strong> ${p.explanation || '설명이 없습니다.'}</p>
        ${!isCorrect && p.correctAnswer ? `<p><strong>정답:</strong> ${p.correctAnswer}</p>` : ''}
    `;

    document.getElementById('resultContainer').classList.remove('hidden');
    document.getElementById('submitAnswerBtn').classList.add('hidden');
    document.getElementById('nextProblemBtn').classList.remove('hidden');

    // 정답이면 Firestore에 기록
    if (isCorrect) {
        try {
            await updateDoc(doc(db, 'users', currentUserId, 'problems', p.id), {
                solved: true,
                solvedAt: serverTimestamp(),
                userAnswer: selectedAnswerIndex
            });
        } catch (e) {
            console.error('⚠️ 문제 완료 저장 실패:', e.message);
        }
    }
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
// Learning Plan Generation (학습 계획)
// ============================================================

async function generateLearningPlan() {
    try {
        console.log('\n📅 학습 계획 생성 중...');

        // 간단한 학습 계획 생성 (서버 연동 전)
        const learningPlan = {
            generatedAt: new Date().toLocaleDateString(),
            weakPoints: [
                '방정식 풀이',
                '함수 개념',
                '도형의 성질'
            ],
            reviewSchedule: ['오늘', '3일 후', '1주 후', '2주 후'],
            studyMethods: [
                '약점 부분 반복 학습',
                '유사 문제 풀이',
                '개념 정리 및 요약'
            ],
            targetScore: 80
        };

        const weakPoints = document.getElementById('weakPoints');
        if (weakPoints) {
            weakPoints.innerHTML = learningPlan.weakPoints.map(wp => `
                <div style="padding: 10px; margin: 5px 0; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
                    📌 ${wp}
                </div>
            `).join('');
        }

        const reviewSchedule = document.getElementById('reviewSchedule');
        if (reviewSchedule) {
            reviewSchedule.innerHTML = learningPlan.reviewSchedule.map(rs => `
                <div style="padding: 10px; margin: 5px 0; background: #e7f3ff; border-radius: 5px; border-left: 4px solid #007bff;">
                    📅 ${rs}
                </div>
            `).join('');
        }

        const studyMethods = document.getElementById('studyMethods');
        if (studyMethods) {
            studyMethods.innerHTML = learningPlan.studyMethods.map(sm => `
                <div style="padding: 10px; margin: 5px 0; background: #d4edda; border-radius: 5px; border-left: 4px solid #28a745;">
                    ✅ ${sm}
                </div>
            `).join('');
        }

        const targetScore = document.getElementById('targetScore');
        if (targetScore) {
            targetScore.innerHTML = `
                <div style="padding: 15px; background: #f0f0f0; border-radius: 5px; text-align: center;">
                    <h4 style="margin: 0 0 10px 0;">목표 점수</h4>
                    <div style="font-size: 2.5em; color: #007bff; font-weight: bold;">${learningPlan.targetScore}점</div>
                    <p style="margin: 10px 0 0 0; color: #666;">현재 추세에 기반한 예상 도달 점수</p>
                </div>
            `;
        }

        console.log('✅ 학습 계획 생성 완료\n');

    } catch (error) {
        console.error('❌ 학습 계획 생성 실패:', error.message);
        alert('학습 계획 생성 실패: ' + error.message);
    }
}

// ============================================================
// Image Handling
// ============================================================

function removeImage() {
    const imagePreview = document.getElementById('imagePreview');
    const fileInput = document.getElementById('problemImageFile');
    
    uploadedImageData = null;
    
    if (imagePreview) {
        imagePreview.classList.add('hidden');
    }
    if (fileInput) {
        fileInput.value = '';
    }
}

// ============================================================
// Navigation Page Update
// ============================================================

function updatePageContent() {
    switch(currentPage) {
        case 'wrong':
            displayWrongAnswers();
            break;
        case 'problems':
            displayProblems();
            break;
        case 'scores':
            displayScores();
            break;
    }
}

// Refresh displays when navigating
const originalNavigateTo = navigateTo;
navigateTo = function(page) {
    originalNavigateTo(page);
    setTimeout(updatePageContent, 100);
};

// ============================================================
// Initialize Page
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
    console.log('\n🔨 DOM 초기화 중...\n');
    
    // 날짜 초기화
    const today = new Date().toISOString().split('T')[0];
    const testDateInput = document.getElementById('testDate');
    if (testDateInput) {
        testDateInput.value = today;
    }
    updateCurrentPageDisplay();
    
    // 모든 로그인/가입 버튼에 이벤트 리스너 연결
    console.log('📌 버튼 이벤트 리스너 등록 중...');
    
    const loginBtn = document.getElementById('loginBtnMain');
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🔐 로그인 버튼 클릭');
            handleLogin();
        });
        console.log('  ✅ 로그인 버튼 등록 완료');
    }
    
    const signupBtn = document.getElementById('signupBtnMain');
    if (signupBtn) {
        signupBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('📝 회원가입 버튼 클릭');
            handleSignup();
        });
        console.log('  ✅ 회원가입 버튼 등록 완료');
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🚪 로그아웃 버튼 클릭');
            handleLogout();
        });
        console.log('  ✅ 로그아웃 버튼 등록 완료');
    }
    
    console.log('✅ 페이지 초기화 완료\n');
});

// Export to global scope
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.handleLogout = handleLogout;
window.switchToLogin = switchToLogin;
window.switchToSignup = switchToSignup;
window.navigateTo = navigateTo;
window.loadUserData = loadUserData;
window.deleteWrongAnswer = deleteWrongAnswer;
window.generateProblems = generateProblems;
window.markProblemSolved = markProblemSolved;
window.addWrongAnswer = addWrongAnswer;
window.clearUserData = clearUserData;
window.handleImageUpload = handleImageUpload;
window.clearUploadedImage = clearUploadedImage;
window.submitProblem = submitProblem;
window.addScore = addScore;
window.generateLearningPlan = generateLearningPlan;
window.submitAnswer = submitAnswer;
window.nextProblem = nextProblem;
window.showProblemDetail = showProblemDetail;
window.showWrongAnswerDetail = showWrongAnswerDetail;
window.removeImage = removeImage;

console.log('✅ Script 완전히 로드됨 - 모든 함수가 전역 스코프에 할당됨\n');
