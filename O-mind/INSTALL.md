# 🚀 O:mind 설치 및 실행 가이드 (한국어)

## ✅ 요구사항

- **Node.js**: 14.0.0 이상
- **npm**: 6.0.0 이상
- **인터넷 연결**
- **Google Gemini API 키** (필수)
- **Firebase 프로젝트** (선택사항)

## 단계별 설치

### 1️⃣ Node.js 설치 확인

```bash
node --version    # v14.0.0 이상 확인
npm --version     # 6.0.0 이상 확인
```

**설치가 필요하면**: https://nodejs.org/ 방문

### 2️⃣ Google Gemini API 키 획득

1. https://makersuite.google.com/app/apikey 접속
2. "API 키 만들기" 클릭
3. 생성된 키를 복사하여 저장

### 3️⃣ 환경 변수 설정

```bash
# O-mind 폴더로 이동
cd O-mind

# Windows
copy .env.example .env

# macOS/Linux
cp .env.example .env
```

### 4️⃣ .env 파일 편집

```env
# 필수 항목
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
NODE_ENV=development

# 선택사항 (Firebase)
# FIREBASE_PROJECT_ID=your_project
# FIREBASE_PRIVATE_KEY=your_key
# FIREBASE_CLIENT_EMAIL=your_email
```

### 5️⃣ 패키지 설치

```bash
npm install
```

설치 완료 후 `node_modules` 폴더가 생성됩니다.

### 6️⃣ 서버 시작

```bash
# 개발 모드 (권장)
npm run dev

# 또는 일반 모드
npm start
```

### 7️⃣ 브라우저에서 접속

```
http://localhost:3000
```

---

## 🎯 기본 사용법

### 사용자 ID 설정
```
1. 우측 상단에 "사용자 ID" 입력
2. "설정" 버튼 클릭
```

### 문제 분석 및 해설 받기
```
1. "문제 전송" 탭 클릭
2. 문제, 답변, 정답 입력
3. "분석 요청" 버튼 클릭
4. AI 분석 결과 확인
```

### 학습 계획 생성
```
1. "문제 전송"에서 여러 문제 분석
2. "학습 추천" 탭 이동
3. "학습 계획 생성" 클릭
4. 개인맞춤 학습 일정 확인
```

### 성적 기록
```
1. "점수 기록" 탭 클릭
2. 시험명, 점수, 날짜 입력
3. "기록하기" 클릭
```

---

## 🧪 API 테스트

### 서버 상태 확인

```bash
curl http://localhost:3000/api/health
```

### 오답 분석 테스트

```bash
curl -X POST http://localhost:3000/api/analyze-wrong-answer \
  -H "Content-Type: application/json" \
  -d '{
    "problemImage": "2x + 3 = 7",
    "userAnswer": "x = 2",
    "correctAnswer": "x = 2",
    "studentLevel": "중등"
  }'
```

### 문제 생성 테스트

```bash
curl -X POST http://localhost:3000/api/generate-problem \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "미분",
    "studentLevel": "고등",
    "difficulty": "중",
    "problemType": "객관식"
  }'
```

### 자동 테스트 실행

```bash
node backend/test.js
```

---

## 🔧 문제 해결

### ❌ "GEMINI_API_KEY is not set"
```
→ .env 파일에 API 키를 입력했는지 확인
→ 서버를 재시작하세요: npm run dev
```

### ❌ "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

### ❌ "Port 3000 already in use"
```bash
# 다른 포트 사용
PORT=3001 npm start

# 또는 기존 프로세스 종료 (Windows)
netstat -ano | findstr :3000
taskkill /PID [PID] /F
```

### ❌ CORS 오류
```
→ 브라우저 개발자 도구 (F12) → Console 확인
→ 네트워크 탭에서 요청 확인
```

---

## 📁 프로젝트 파일 구조

```
O-mind/
├── backend/
│   ├── server.js              # 메인 서버
│   ├── test.js                # 테스트 스크립트
│   ├── agents/                # AI 에이전트
│   │   ├── wrongAnswerAnalyzer.js
│   │   ├── explanationGenerator.js
│   │   ├── problemGenerator.js
│   │   └── learningRecommender.js
│   └── services/              # 외부 서비스
│       ├── geminiService.js
│       └── firebaseService.js
├── frontend/
│   └── public/
│       ├── index.html         # 웹 페이지
│       ├── style.css          # 스타일
│       └── script.js          # JavaScript
├── package.json               # 의존성
├── .env.example               # 환경 변수 템플릿
├── README.md                  # 상세 설명
├── QUICKSTART.md              # 빠른 시작
└── PROJECT_STRUCTURE.md       # 프로젝트 구조
```

---

## 🌐 API 엔드포인트

| 메서드 | 엔드포인트 | 기능 |
|--------|-----------|------|
| POST | `/api/analyze-wrong-answer` | 오답 분석 |
| POST | `/api/generate-explanation` | 해설 생성 |
| POST | `/api/generate-problem` | 문제 생성 |
| POST | `/api/recommend-learning-path` | 학습 추천 |
| POST | `/api/calculate-review-schedule` | 복습 일정 |
| POST | `/api/save-score` | 점수 저장 |
| GET | `/api/user-wrong-answers/:userId` | 오답 조회 |
| GET | `/api/user-problems/:userId` | 문제 조회 |
| GET | `/api/user-scores/:userId` | 점수 조회 |
| GET | `/api/health` | 서버 상태 |

---

## 💡 팁과 권장사항

### 개발 모드 사용
```bash
npm run dev  # nodemon으로 자동 재시작
```

### 로깅 활성화
```bash
DEBUG=o-mind:* npm start
```

### 다른 포트에서 실행
```bash
PORT=8080 npm start
```

### Firebase 없이 테스트
```
→ .env에서 Firebase 항목 주석 처리
→ 데모 모드로 실행됨 (로컬 메모리 사용)
```

---

## 📚 학습 자료

- [Express.js 공식 문서](https://expressjs.com/)
- [Google Gemini API 가이드](https://ai.google.dev/)
- [Firebase 공식 문서](https://firebase.google.com/docs)
- [Ebbinghaus 망각 곡선](https://ko.wikipedia.org/wiki/망각곡선)

---

## 🎓 예제: 오답 분석부터 학습까지

```javascript
// 1. 오답을 AI에게 분석
{
  "problemImage": "x² - 3x + 2 = 0 풀기",
  "userAnswer": "x = 1 또는 0",
  "correctAnswer": "x = 1 또는 2",
  "studentLevel": "고등"
}

// 2. AI 응답
{
  "mistakeType": "계산 실수",
  "rootCause": "인수분해 과정에서 실수",
  "improvementTip": "인수분해 공식을 다시 확인하세요"
}

// 3. 해설 요청
{
  "problem": "x² - 3x + 2 = 0 풀기",
  "correctAnswer": "x = 1 또는 2",
  "studentLevel": "고등",
  "subject": "수학"
}

// 4. 학습 계획 생성
{
  "weakPoints": ["인수분해", "이차방정식"],
  "reviewSchedule": {
    "day1": "오늘 복습",
    "day3": "3일 후 복습",
    ...
  }
}
```

---

## 🔐 보안 체크리스트

- [ ] `.env` 파일이 `.gitignore`에 있는가
- [ ] API 키가 코드에 하드코드되지 않았는가
- [ ] GitHu에 민감한 정보를 푸시하지 않았는가
- [ ] 환경 변수를 사용하여 설정을 관리하는가

---

## 📞 추가 도움

문제가 발생하면:

1. **로그 확인**: 콘솔에 출력된 오류 메시지 읽기
2. **README.md 확인**: 상세 문서 참고
3. **GitHub Issues**: 비슷한 이슈 검색
4. **환경 재설정**: `.env` 파일과 의존성 다시 확인

---

## 🎉 축하합니다!

이제 O:mind를 사용할 준비가 완료되었습니다!
**http://localhost:3000** 에서 AI 기반 오답 복습을 시작하세요.

**효율적인 복습을 위해 O:mind와 함께 공부하세요!** 📚✨
