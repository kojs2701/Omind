# O:mind 프로젝트 구현 설명서

## 📋 프로젝트 개요

O:mind는 AI를 활용한 지능형 오답 복습 시스템입니다. 학생들이 틀린 문제를 쉽게 관리하고, AI가 분석한 오답 원인을 파악하며, 맞춤형 복습 계획을 받을 수 있습니다.

## ✨ 주요 기능

### 1. **AI 오답 분석**
- AI가 틀린 문제의 원인을 정확히 분석
- 계산 실수, 개념 오해, 읽기 오류 등 분류
- 실수 유형별 개선 팁 제공

### 2. **맞춤형 해설 생성**
- 학생 수준에 맞는 상세한 설명
- 단계별 풀이 과정
- 자주 하는 실수 및 기억 팁 포함

### 3. **문제 자동 생성**
- 학생의 약점 주제를 기반한 문제 생성
- 난이도별 단계적 문제 제공
- 문제 유형 맞춤 생성

### 4. **스마트 학습 추천**
- Ebbinghaus 망각 곡선 기반 복습 일정
- 약점 분석 및 우선순위 결정
- 개인맞춤 학습 경로 제안

### 5. **성적 관리**
- 시험 성적 기록 및 저장
- 시각적 성적 추이 분석
- 과목별 성적 관리

### 6. **Firebase 통합**
- 사용자 계정 관리 (이메일/비밀번호 인증)
- 오답 기록 자동 저장
- 생성된 문제 저장
- 점수 기록 저장
- 학습 계획 저장

## 🏗️ 프로젝트 구조

```
O-mind/
├── backend/
│   ├── server.js              # Express 서버 (15 API 엔드포인트)
│   ├── agents/
│   │   ├── wrongAnswerAnalyzer.js    # 오답 분석 에이전트
│   │   ├── explanationGenerator.js   # 해설 생성 에이전트
│   │   ├── problemGenerator.js       # 문제 생성 에이전트
│   │   └── learningRecommender.js    # 학습 추천 에이전트
│   └── services/
│       ├── geminiService.js          # Google Gemini API
│       └── firebaseService.js        # Firebase 데이터베이스
├── frontend/
│   └── public/
│       ├── index.html         # 메인 HTML (6개 페이지 통합)
│       ├── style.css          # 반응형 CSS (1162줄)
│       └── script.js          # 프론트엔드 JS (1029줄)
├── package.json               # Node.js 의존성
├── .env                       # 환경 변수 설정
├── README.md                  # 초기 프로젝트 기획
├── project.md                 # 이 파일 (구현 설명서)
├── FIREBASE_SETUP.md          # Firebase 설정 가이드
└── QUICKSTART.md              # 빠른 시작 가이드
```

## 🚀 시작하기

### 1. 필수 설정

#### Node.js 설치
- [Node.js 공식 사이트](https://nodejs.org/)에서 14.0.0 이상 버전을 설치하세요.

#### Google Gemini API 키 획득
1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새로운 프로젝트 생성
3. Generative AI API 활성화
4. API 키 생성

#### Firebase 설정 (필수)
**✅ 모든 사용자 데이터, 오답 기록, 제출된 문제, 해설이 Firebase에 저장됩니다.**

1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트 생성
2. Firestore Database 활성화
3. 인증 활성화 (이메일/비밀번호)
4. Firebase SDK 설정
5. (선택) 서비스 계정 키는 백엔드에서만 필요

**자세한 설정 방법은 [FIREBASE_SETUP.md](FIREBASE_SETUP.md)를 참고하세요.**

### 2. 설치 및 환경 설정

```bash
# 프로젝트 디렉토리로 이동
cd O-mind

# 패키지 설치
npm install

# .env 파일 생성 및 설정
copy .env.example .env
```

### 3. .env 파일 수정

```env
# Gemini API Configuration (필수)
GEMINI_API_KEY=your_gemini_api_key

# Firebase Admin SDK Configuration (선택사항)
FIREBASE_PROJECT_ID=omind-49f39
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@omind-49f39.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 4. 서버 실행

```bash
# 개발 모드 (nodemon 필요)
npm run dev

# 또는 일반 실행
npm start
```

서버가 http://localhost:3000 에서 시작됩니다.

## 📖 사용 방법

### 로그인 및 회원가입
1. **회원가입**: 이메일, 비밀번호, 이름 입력
2. **로그인**: 가입한 이메일과 비밀번호 입력
3. ✅ 모든 데이터가 **Firebase에 자동 저장**됩니다

### 오답노트 페이지
1. 문제 전송 페이지에서 틀린 문제 업로드
2. AI가 분석한 오답 정보 확인
3. 해설과 분석 결과 검토
4. ✅ **Firestore `wrongAnswers` 컬렉션에 저장**

### 문제 페이지
1. 자동 생성된 문제 선택
2. 문제 풀기
3. 답 제출 및 자동 채점
4. 해설 확인
5. ✅ **Firestore `problems` 컬렉션에 저장**

### 학습 추천 페이지
1. 약점 분석 결과 확인
2. 망각 곡선 기반 복습 일정 확인
3. 추천된 학습 방법 실천
4. ✅ **Firestore `learningPlans` 컬렉션에 저장**

### 성적 관리 페이지
1. 새로운 시험 성적 기록
2. 과목별/시간별 성적 추이 확인
3. 목표 점수 설정 및 추적
4. ✅ **Firestore `scores` 컬렉션에 저장**

## 🔌 API 엔드포인트

### 1. 오답 분석
```
POST /api/analyze-wrong-answer?userId={userId}
```
**요청**:
```json
{
  "problemImage": "문제 또는 이미지 경로",
  "userAnswer": "사용자의 답변",
  "correctAnswer": "정답",
  "studentLevel": "중등|고등"
}
```

**응답**:
```json
{
  "success": true,
  "analysis": {
    "mistakeType": "계산 실수",
    "rootCause": "...",
    "mistakeAnalysis": "...",
    "improvementTip": "..."
  }
}
```

### 2. 해설 생성
```
POST /api/generate-explanation
```
**요청**:
```json
{
  "problem": "문제",
  "correctAnswer": "정답",
  "studentLevel": "중등|고등",
  "subject": "수학"
}
```

**응답**:
```json
{
  "success": true,
  "explanation": {
    "conceptExplanation": "...",
    "stepByStepSolution": "...",
    "commonMistakes": "...",
    "tips": "..."
  }
}
```

### 3. 다층적 해설 생성
```
POST /api/generate-multi-level-explanation
```
초급, 중급, 고급 수준의 해설을 모두 제공합니다.

### 4. 문제 생성
```
POST /api/generate-problem?userId={userId}
```
**요청**:
```json
{
  "topic": "미분",
  "studentLevel": "고등",
  "difficulty": "중",
  "problemType": "객관식"
}
```

**응답**: 생성된 문제 데이터 + Firebase 저장

### 5. 약점 기반 문제 생성
```
POST /api/generate-problems-for-weakpoints
```
약점으로 식별된 주제에 대한 문제를 여러 개 생성합니다.

### 6. 단계별 난이도 문제 생성
```
POST /api/generate-progressive-problems
```
쉬움 → 중간 → 어려움 순서로 단계적 문제를 생성합니다.

### 7. 학습 경로 추천
```
POST /api/recommend-learning-path?userId={userId}
```
**요청**:
```json
{
  "wrongAnswers": [...],
  "studentLevel": "고등",
  "scores": [...]
}
```

**응답**: 약점 분석, 학습 방법 추천, 목표 점수 등

### 8. 복습 일정 계산
```
POST /api/calculate-review-schedule
```
Ebbinghaus 망각 곡선 기반 최적 복습 일정을 계산합니다.

### 9. 복습 우선순위 결정
```
POST /api/prioritize-review
```
복습할 항목들의 우선순위를 결정합니다.

### 10. 점수 저장
```
POST /api/save-score
```
**요청**:
```json
{
  "userId": "user_id",
  "testName": "모의고사",
  "score": 85,
  "totalScore": 100,
  "date": "2024-04-12",
  "subject": "수학"
}
```

### 11-15. 데이터 조회
```
GET /api/user-wrong-answers/:userId
GET /api/user-problems/:userId
GET /api/user-scores/:userId
GET /api/user-learning-plans/:userId
PUT /api/mark-problem-solved
```

## 🎯 주요 기술 스택

- **프론트엔드**: HTML5, CSS3, Vanilla JavaScript
- **백엔드**: Node.js, Express.js
- **AI**: Google Gemini API
- **데이터베이스**: Firebase Firestore + Firebase Authentication
- **패키지 관리**: npm
- **추가 라이브러리**: 
  - firebase-admin (서버)
  - @google/generative-ai (Gemini API)
  - cors, body-parser (Express 미들웨어)

## 📋 AI 에이전트 상세 설명

### 1. 오답 분석 에이전트 (Wrong Answer Analyzer)

**파일**: `backend/agents/wrongAnswerAnalyzer.js`

**역할**: 틀린 문제의 원인을 분석하고 분류

**기능**:
- 실수 유형 분류 (계산 실수, 개념 오해, 읽기 오류, 부주의)
- 근본 원인 파악
- 유사한 실수 예시 제공
- Firebase에 자동 저장

**프롬프트 형식**:
```
문제를 분석하고 다음 JSON 형식으로 응답하세요:
{
  "mistakeType": "계산 실수|개념 오해|읽기 오류|부주의",
  "rootCause": "주 원인",
  "mistakeAnalysis": "상세 분석",
  "improvementTip": "개선 방법"
}
```

### 2. 해설 생성 에이전트 (Explanation Generator)

**파일**: `backend/agents/explanationGenerator.js`

**역할**: 학생 수준에 맞는 맞춤형 해설 생성

**기능**:
- 개념 설명
- 단계별 풀이 과정
- 핵심 포인트 강조
- 자주 하는 실수 안내
- 기억 팁 제공
- 수준별 다중 해설 (초급/중급/고급)

**프롬프트 형식**:
```
학생 수준을 고려하여 다음 형식으로 응답하세요:
{
  "conceptExplanation": "기본 개념 설명",
  "stepByStepSolution": "단계별 풀이",
  "commonMistakes": "자주 하는 실수",
  "tips": "기억 팁"
}
```

### 3. 문제 생성 에이전트 (Problem Generator)

**파일**: `backend/agents/problemGenerator.js`

**역할**: 학생의 약점을 보완하는 맞춤형 문제 생성

**기능**:
- 주제별 문제 생성
- 난이도별 단계적 문제 (쉬움/중간/어려움)
- 약점 기반 문제 배치
- 다양한 문제 유형 (객관식/주관식/서술형)
- Firebase에 자동 저장

**프롬프트 형식**:
```
{
  "problem": "문제 내용",
  "options": ["선택지1", "선택지2", ...],
  "correctAnswer": "A",
  "answerExplanation": "풀이 설명",
  "difficulty": "하|중|상",
  "problemType": "객관식"
}
```

### 4. 학습 추천 에이전트 (Learning Recommender)

**파일**: `backend/agents/learningRecommender.js`

**역할**: 망각 곡선 기반 개인맞춤 학습 계획 제공

**기능**:
- 약점/강점 분석
- 망각 곡선 기반 복습 일정
- 학습 방법 추천
- 복습 우선순위 결정
- 목표 점수 설정
- Firebase에 자동 저장

**복습 일정** (Ebbinghaus 망각 곡선):
- 1일 후: 첫 번째 복습
- 3일 후: 두 번째 복습
- 7일 후: 세 번째 복습
- 14일 후: 네 번째 복습
- 30일 후: 최종 복습

**프롬프트 형식**:
```
{
  "weakPoints": ["미분", "확률"],
  "studyMethods": ["개념 정리", "문제풀이", "오답 분석"],
  "targetScore": "95점",
  "reviewSchedule": {
    "미분": [
      {"interval": "1일", "reviewDate": "2024-04-13"},
      ...
    ]
  }
}
```

## 🔐 Firebase 데이터 구조

```
users/
  ├── {userId}
  │   ├── username: string
  │   ├── email: string
  │   ├── createdAt: timestamp
  │   ├── lastLoginAt: timestamp
  │   │
  │   ├── wrongAnswers/
  │   │   └── {answerId}
  │   │       ├── problemImage: string
  │   │       ├── userAnswer: string
  │   │       ├── correctAnswer: string
  │   │       ├── analysis: object
  │   │       ├── explanation: object
  │   │       └── createdAt: timestamp
  │   │
  │   ├── problems/
  │   │   └── {problemId}
  │   │       ├── problem: string
  │   │       ├── options: array
  │   │       ├── correctAnswer: string
  │   │       ├── difficulty: string
  │   │       ├── solved: boolean
  │   │       └── createdAt: timestamp
  │   │
  │   ├── scores/
  │   │   └── {scoreId}
  │   │       ├── testName: string
  │   │       ├── score: number
  │   │       ├── totalScore: number
  │   │       ├── date: string
  │   │       ├── subject: string
  │   │       └── recordedAt: timestamp
  │   │
  │   └── learningPlans/
  │       └── {planId}
  │           ├── recommendation: object
  │           └── createdAt: timestamp
```

## 🛠️ 개발 가이드

### 새로운 에이전트 추가

```javascript
// backend/agents/newAgent.js
const GeminiService = require("../services/geminiService");

class NewAgent {
  constructor() {
    this.geminiService = new GeminiService();
  }

  async process(data) {
    const systemPrompt = "에이전트 지시사항";
    const userMessage = "사용자 입력";
    
    const response = await this.geminiService.generateContent(
      systemPrompt,
      userMessage
    );
    
    return JSON.parse(response);
  }
}

module.exports = NewAgent;
```

### 새로운 API 엔드포인트 추가

```javascript
// backend/server.js
app.post("/api/new-endpoint", async (req, res) => {
  try {
    const { userId, data } = req.body;
    
    // 에이전트 처리
    const result = await newAgent.process(data);
    
    // Firebase에 저장 (선택사항)
    if (firebaseService && userId) {
      await firebaseService.saveNewData(userId, result);
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});
```

## 📱 반응형 디자인

- **모바일** (< 768px): 클릭 친화적 + 터치 최적화
- **태블릿** (768px - 1024px): 2단 레이아웃
- **데스크톱** (> 1024px): 3단 이상 레이아웃
- 빠른 로딩 속도 (이미지 최적화)

## 🔒 보안 주의사항

- `.env` 파일을 `.gitignore`에 추가하세요
- API 키를 절대 공개하지 마세요
- Firebase 보안 규칙을 설정하세요
- HTTPS 사용 권장

## 🐛 문제 해결

### Gemini API 오류
- API 키가 올바른지 확인
- API 할당량을 확인
- 네트워크 연결 확인

### Firebase 연결 오류
- 서비스 계정 키의 형식 확인
- Firebase 프로젝트 설정 확인
- Firestore 권한 확인

### 포트 충돌
```bash
PORT=3001 npm start
```

## 📚 참고 자료

- [Express.js 공식 문서](https://expressjs.com/)
- [Google Gemini API 문서](https://ai.google.dev/)
- [Firebase 공식 문서](https://firebase.google.com/docs)
- [Ebbinghaus 망각 곡선](https://en.wikipedia.org/wiki/Forgetting_curve)

## 📊 코드 통계

- **총 라인 수**: 3,000+ 줄
- **프론트엔드**: 1,500+ 줄 (HTML + CSS + JS)
- **백엔드**: 1,500+ 줄 (Server + Agents + Services)
- **API 엔드포인트**: 15개
- **AI 에이전트**: 4개

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 👥 기여하기

개선 사항이나 버그 리포트는 이슈로 등록해주세요.

---

**자세한 Firebase 설정은 [FIREBASE_SETUP.md](FIREBASE_SETUP.md)를 참고하세요.**

**빠른 시작은 [QUICKSTART.md](QUICKSTART.md)를 참고하세요.**

**O:mind와 함께 효율적인 복습을 시작하세요! 🚀**
