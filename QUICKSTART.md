# O:mind 빠른 시작 가이드

## 📋 사전 요구사항

- Node.js 14.0.0 이상
- npm 또는 yarn
- Google Gemini API 키 (필수)
- Firebase 프로젝트 (필수)

## 🚀 5분 안에 시작하기

### 1단계: 필수 정보 준비

#### Google Gemini API 키 획득
1. [Google AI Studio](https://aistudio.google.com/apikey) 방문
2. "Get API Key" 클릭
3. API 키 복사

#### Firebase 프로젝트 설정
1. [Firebase Console](https://console.firebase.google.com/) 방문
2. **프로젝트 생성**: "O:mind" 프로젝트명으로 생성
3. **Firestore Database 활성화**:
   - Build → Firestore Database → Create Database
   - 위치: asia-southeast1 (또는 가까운 지역)
   - 보안 규칙: "테스트 모드에서 시작"
   - Create 클릭
4. **Authentication 활성화**:
   - Build → Authentication → Email/Password 활성화
5. **Firebase 설정 정보 확인**: script.js에 이미 설정됨

### 2단계: 프로젝트 설정

```bash
# 프로젝트 폴더로 이동
cd O-mind

# .env 파일 생성
copy .env.example .env  # Windows
# 또는
cp .env.example .env    # macOS/Linux
```

### 3단계: .env 파일 수정

```env
# ⭐ 필수: Google Gemini API 키
GEMINI_API_KEY=your-gemini-api-key-here

# 📱 서버 설정
PORT=3000
NODE_ENV=development

# 🔥 Firebase (선택사항 - 백엔드에서만 필요)
FIREBASE_PROJECT_ID=omind-49f39
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@omind-49f39.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 4단계: 패키지 설치

```bash
npm install
```

### 5단계: 서버 시작

```bash
# 개발 모드 (권장)
npm run dev

# 또는 일반 모드
npm start
```

서버 시작 메시지:
```
╔════════════════════════════════════════╗
║     O:mind - AI Learning Platform      ║
║         Server Started 🚀              ║
╠════════════════════════════════════════╣
║ Server running on: http://localhost:3000
║ Environment: development
║ API Ready: /api/*
╚════════════════════════════════════════╝
```

### 6단계: 웹페이지 열기

**자동 열기**:
```bash
npm run open
```

**수동 접속**:
브라우저 주소창에 입력:
```
http://localhost:3000
```

## 📝 첫 사용

### 1. 회원가입✅ 새로운 방식
1. 웹페이지 로드 시 자동으로 로그인 화면 표시
2. "가입하기" 버튼 클릭
3. 다음 정보 입력:
   - 이메일: 본인 이메일
   - 비밀번호: 6글자 이상
   - 비밀번호 확인: 위와 동일
   - 사용자명: 표시할 이름
4. "가입하기" 버튼 클릭
5. ✅ 계정 생성 및 자동 로그인

### 2. 오답 분석하기
1. "문제 전송" 탭 클릭
2. 다음 정보 입력:
   - 🖼️ **이미지 섹션**: 문제 사진 선택 (또는 텍스트 입력)
   - 📄 **설명 섹션**: 추가 설명 (선택)
   - ✍️ **답변 섹션**: 내 답변 + 정답
   - 📊 **학습 정보**: 학년(중등/고등) + 과목 선택
   - ☑️ **옵션 섹션**: 문제 생성/학습 계획 생성 여부
3. "제출" 버튼 클릭
4. ⏳ AI 분석 대기 (20-30초)
5. ✅ 결과 표시 및 Firebase에 자동 저장

### 3. 오답노트 확인
1. "오답노트" 탭 클릭
2. 제출한 문제 목록 표시
3. 각 항목 클릭 시 상세 분석 표시

### 4. 생성된 문제 풀기
1. "문제" 탭 클릭
2. 문제 선택 후 풀기
3. 정답 선택 후 "제출" 버튼
4. 정오 여부 확인 및 해설 보기

### 5. 점수 기록하기
1. "점수 기록" 탭 클릭
2. 시험 정보 입력:
   - 시험명: "중간고사", "모의고사" 등
   - 점수: 획득한 점수
   - 만점: 만점 (기본값 100)
   - 날짜: 시험 날짜
   - 과목: 과목명
3. "저장" 버튼 클릭
4. ✅ Firebase에 자동 저장

### 6. 학습 계획 확인
1. "학습 추천" 탭 클릭
2. 약점 분석 및 학습 방법 확인
3. 망각 곡선 기반 복습 일정 확인

## 🔍 문제 해결

### "Cannot read properties of undefined" 오류
**원인**: Firebase가 초기화 중일 때 버튼 클릭

**해결**: 
- 1-2초 기다린 후 다시 시도
- 브라우저 F12 콘솔에서 "✅ Firebase 초기화 완료" 메시지 확인

### "Connection refused" 오류
**원인**: 백엔드 서버 미실행

**해결**:
```bash
npm start
# 또는
npm run dev
```

### "Cannot find module" 오류
**원인**: 패키지 미설치

**해결**:
```bash
npm install
```

### API 요청 실패
**원인**: Gemini API 키 누락 또는 무효

**해결**:
1. .env 파일에서 GEMINI_API_KEY 확인
2. [Google AI Studio](https://aistudio.google.com/apikey)에서 키 재확인
3. 서버 재시작

### 회원가입 실패
**원인**: Firebase 설정 누락 또는 인증 규칙 미설정

**해결**:
1. [Firebase Console](https://console.firebase.google.com/) 확인
2. Authentication → Email/Password 활성화 여부 확인
3. Firestore Database → Rules 탭에서 다음 규칙 설정:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      match /{document=**} {
        allow read, write: if request.auth.uid == userId;
      }
    }
  }
}
```

### 데이터가 저장되지 않음
**원인**: Firestore 보안 규칙 미설정

**해결**: 위의 "회원가입 실패" 섹션의 규칙 설정 참고

## 💾 데이터 확인

### Firebase에서 저장된 데이터 확인
1. [Firebase Console](https://console.firebase.google.com/) 로그인
2. 프로젝트 선택
3. Firestore Database → Collections 탭
4. users → {자신의UID} 클릭
5. wrongAnswers, problems, scores 등 확인

### 브라우저 콘솔에서 로그 확인
1. F12 누르기
2. Console 탭 클릭
3. 다음 로그 확인:
   - ✅ Firebase 초기화 완료
   - ✅ 오답 저장 완료: [ID]
   - ✅ 문제 로드 완료: 3개

## 🎯 일반적인 워크플로우

```
1️⃣ 준비 (1분)
   ├─ Node.js 설치
   ├─ Gemini API 키 획득
   └─ Firebase 프로젝트 생성

2️⃣ 설정 (2분)
   ├─ npm install
   ├─ .env 파일 작성
   └─ Firebase 보안 규칙 설정

3️⃣ 실행 (1분)
   ├─ npm start
   └─ http://localhost:3000 접속

4️⃣ 사용 (지속)
   ├─ 회원가입
   ├─ 오답 제출
   ├─ AI 분석 확인
   ├─ 점수 기록
   └─ 학습 계획 확인
```

## 📞 자주 묻는 질문 (FAQ)

**Q: "만약 같은 이메일로 다시 가입하면?"**
A: "이미 가입된 이메일입니다" 메시지 표시. 기존 이메일로 로그인하거나 다른 이메일 사용.

**Q: 포트 3000이 이미 사용 중이면?**
A: `PORT=3001 npm start` 또는 기존 프로세스 종료

**Q: 데이터는 어디에 저장되나?**
A: Firebase Firestore → users/{userId}/{컬렉션명}

**Q: 오프라인에서도 사용 가능한가?**
A: 아니오. Gemin API와 Firebase 사용으로 온라인 필수.

**Q: 브라우저 새로고침 시 데이터는?**
A: 유지됨. Firestore에서 자동 로드.

**Q: 계정을 삭제하려면?**
A: Firebase Console → Authentication → 사용자 클릭 → 삭제

## 🚀 다음 단계

- 📚 [project.md](project.md) - 프로젝트 기술 상세 문서
- 🔥 [FIREBASE_SETUP.md](FIREBASE_SETUP.md) - Firebase 완전 가이드
- 📖 [README.md](README.md) - 프로젝트 기획 및 요구사항

---

**O:mind와 함께 효율적인 복습을 시작하세요! 🎓**
