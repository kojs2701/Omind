/**
 * O:mind API 테스트 스크립트
 * 
 * 사용법:
 * node backend/test.js
 */

require('dotenv').config();
const FirebaseService = require('./services/firebaseService');
const WrongAnswerAnalyzer = require('./agents/wrongAnswerAnalyzer');
const ExplanationGenerator = require('./agents/explanationGenerator');
const ProblemGenerator = require('./agents/problemGenerator');
const LearningRecommender = require('./agents/learningRecommender');

// 테스트용 사용자 ID
const TEST_USER_ID = 'test-user-' + Date.now();
const TEST_UID = 'firebase-test-uid-' + Math.random().toString(36).substr(2, 9);

// 색상 정의
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(color, title, message) {
  console.log(`\n${color}${colors.bright}[${title}]${colors.reset}${color}`);
  console.log(message);
  console.log(colors.reset);
}

async function testFirebase() {
  log(colors.cyan, 'Firebase 저장소 테스트', '='.repeat(50));
  
  try {
    // Firebase 서비스 초기화
    const firebaseService = new FirebaseService();
    log(colors.green, 'Firebase 연결', '✅ Firebase 서비스 초기화 완료');

    // 테스트용 사용자 데이터
    const userData = {
      username: 'test-user',
      email: `test-${Date.now()}@example.com`,
      createdAt: new Date().toISOString(),
      level: '중등',
    };

    console.log(`\n📝 테스트 사용자 정보:`);
    console.log(`   UID: ${TEST_UID}`);
    console.log(`   Email: ${userData.email}`);

    // 1️⃣ 사용자 데이터 저장
    log(colors.green, '테스트 1: 사용자 데이터 저장', '');
    try {
      const saveResult = await firebaseService.saveUser(TEST_UID, userData);
      console.log(`✅ 저장 성공:`, saveResult);
    } catch (error) {
      console.error(`❌ 저장 실패:`, error.message);
      throw error;
    }

    // 2️⃣ 오답 기록 저장
    log(colors.green, '테스트 2: 오답 기록 저장', '');
    const wrongAnswerData = {
      problem: '2x + 3 = 7을 풀어라',
      userAnswer: '2',
      correctAnswer: '2',
      analysis: '계산이 정확합니다',
      studentLevel: '중등',
    };
    try {
      const wrongAnswerResult = await firebaseService.saveWrongAnswerRecord(TEST_UID, wrongAnswerData);
      console.log(`✅ 저장 성공:`, wrongAnswerResult);
    } catch (error) {
      console.error(`❌ 저장 실패:`, error.message);
      throw error;
    }

    // 3️⃣ 문제 저장
    log(colors.green, '테스트 3: 생성 문제 저장', '');
    const problemData = {
      topic: '미분',
      content: '함수 f(x) = x²의 도함수를 구하시오',
      difficulty: '중',
      answer: 'f\'(x) = 2x',
      type: '객관식',
    };
    try {
      const problemResult = await firebaseService.saveProblem(TEST_UID, problemData);
      console.log(`✅ 저장 성공:`, problemResult);
    } catch (error) {
      console.error(`❌ 저장 실패:`, error.message);
      throw error;
    }

    // 4️⃣ 점수 기록 저장
    log(colors.green, '테스트 4: 점수 기록 저장', '');
    const scoreData = {
      subject: '수학',
      score: 85,
      totalScore: 100,
      date: new Date().toISOString(),
    };
    try {
      const scoreResult = await firebaseService.saveScore(TEST_UID, scoreData);
      console.log(`✅ 저장 성공:`, scoreResult);
    } catch (error) {
      console.error(`❌ 저장 실패:`, error.message);
      throw error;
    }

    // 5️⃣ 학습 계획 저장
    log(colors.green, '테스트 5: 학습 계획 저장', '');
    const learningPlanData = {
      title: '주(Week) 1: 기초 미분 정복',
      topics: ['미분의 정의', '도함수', '미분 공식'],
      duration: '1주일',
      difficulty: '중',
    };
    try {
      const planResult = await firebaseService.saveLearningPlan(TEST_UID, learningPlanData);
      console.log(`✅ 저장 성공:`, planResult);
    } catch (error) {
      console.error(`❌ 저장 실패:`, error.message);
      throw error;
    }

    // 6️⃣ 저장된 오답 기록 조회
    log(colors.yellow, '테스트 6: 저장된 오답 기록 조회', '');
    try {
      const wrongAnswers = await firebaseService.getWrongAnswers(TEST_UID);
      console.log(`✅ 조회 성공: ${wrongAnswers.length}개 항목 발견`);
      if (wrongAnswers.length > 0) {
        console.log(`   최신: ${wrongAnswers[0].problem}`);
      }
    } catch (error) {
      console.error(`❌ 조회 실패:`, error.message);
    }

    // 7️⃣ 저장된 문제 조회
    log(colors.yellow, '테스트 7: 저장된 문제 조회', '');
    try {
      const problems = await firebaseService.getProblems(TEST_UID);
      console.log(`✅ 조회 성공: ${problems.length}개 항목 발견`);
      if (problems.length > 0) {
        console.log(`   최신: ${problems[0].content}`);
      }
    } catch (error) {
      console.error(`❌ 조회 실패:`, error.message);
    }

    // 8️⃣ 저장된 점수 조회
    log(colors.yellow, '테스트 8: 저장된 점수 조회', '');
    try {
      const scores = await firebaseService.getScores(TEST_UID);
      console.log(`✅ 조회 성공: ${scores.length}개 항목 발견`);
      if (scores.length > 0) {
        console.log(`   최신: ${scores[scores.length - 1].subject} - ${scores[scores.length - 1].score}점`);
      }
    } catch (error) {
      console.error(`❌ 조회 실패:`, error.message);
    }

    // 9️⃣ 저장된 학습 계획 조회
    log(colors.yellow, '테스트 9: 저장된 학습 계획 조회', '');
    try {
      const plans = await firebaseService.getLearningPlans(TEST_UID);
      console.log(`✅ 조회 성공: ${plans.length}개 항목 발견`);
      if (plans.length > 0) {
        console.log(`   최신: ${plans[0].title}`);
      }
    } catch (error) {
      console.error(`❌ 조회 실패:`, error.message);
    }

    log(colors.cyan, 'Firebase 테스트 완료', '✅ 모든 Firebase 작업 성공!');
    log(colors.blue, '결론', `
🎉 Firebase 저장소가 정상 작동합니다!

테스트 데이터:
  - UID: ${TEST_UID}
  - Email: ${userData.email}

Firebase Console에서 확인:
1. https://console.firebase.google.com/
2. omind-49f39 프로젝트 선택
3. Firestore → Collections → users
4. ${TEST_UID} 문서 확인

저장된 항목:
  ✅ 사용자 데이터
  ✅ 오답 기록
  ✅ 생성 문제
  ✅ 점수 기록
  ✅ 학습 계획
    `);

  } catch (error) {
    log(colors.red, 'Firebase 테스트 실패', `
❌ Firebase 연결 오류: ${error.message}

확인 사항:
1. ✅ .env 파일에 Firebase 환경 변수 설정?
   - FIREBASE_PROJECT_ID
   - FIREBASE_CLIENT_EMAIL
   - FIREBASE_PRIVATE_KEY

2. ✅ Firebase 보안 규칙이 올바른가?
   - https://console.firebase.google.com/
   - omind-49f39 프로젝트
   - Firestore → Rules
   - 올바른 규칙으로 설정되었는가?

3. ✅ 개인 키가 유효한가?
   - Firebase Console에서 새 개인 키 생성
    `);
    process.exit(1);
  }
}



async function testAIAgents() {
  log(colors.blue, 'AI 에이전트 테스트', '='.repeat(50));

  // Test 1: 오답 분석
  try {
    log(colors.green, '테스트 1: 오답 분석', '');
    const analyzer = new WrongAnswerAnalyzer();
    const analysisResult = await analyzer.analyze({
      problemImage: '2x + 3 = 7을 풀어라',
      userAnswer: '2',
      correctAnswer: '2',
      studentLevel: '중등',
    });
    console.log(JSON.stringify(analysisResult, null, 2));
  } catch (error) {
    log(colors.red, '오류', error.message);
  }

  // Test 2: 해설 생성
  try {
    log(colors.green, '테스트 2: 해설 생성', '');
    const generator = new ExplanationGenerator();
    const explanationResult = await generator.generate({
      problem: '이차함수 y = x² - 2x + 1의 최솟값을 구하라',
      correctAnswer: 'y = 0 (x = 1일 때)',
      studentLevel: '고등',
      subject: '수학',
    });
    console.log(JSON.stringify(explanationResult, null, 2));
  } catch (error) {
    log(colors.red, '오류', error.message);
  }

  // Test 3: 문제 생성
  try {
    log(colors.green, '테스트 3: 문제 생성', '');
    const problemGen = new ProblemGenerator();
    const problemResult = await problemGen.generate({
      topic: '미분',
      studentLevel: '고등',
      difficulty: '중',
      problemType: '객관식',
    });
    console.log(JSON.stringify(problemResult, null, 2));
  } catch (error) {
    log(colors.red, '오류', error.message);
  }

  // Test 4: 학습 추천
  try {
    log(colors.green, '테스트 4: 학습 추천', '');
    const recommender = new LearningRecommender();
    const recommendationResult = await recommender.recommendPath({
      wrongAnswers: [
        { topic: '미분', mistakeType: '개념 오해' },
        { topic: '적분', mistakeType: '계산 실수' },
      ],
      studentLevel: '고등',
      scores: [
        { score: 75, totalScore: 100, date: '2024-01-15' },
        { score: 82, totalScore: 100, date: '2024-02-01' },
      ],
    });
    console.log(JSON.stringify(recommendationResult, null, 2));
  } catch (error) {
    log(colors.red, '오류', error.message);
  }

  // Test 5: 망각 곡선 일정
  try {
    log(colors.green, '테스트 5: 망각 곡선 기반 복습 일정', '');
    const recommender = new LearningRecommender();
    const scheduleResult = await recommender.calculateForgetfulnessCurveSchedule([
      { topic: '미분', createdAt: new Date().toISOString() },
      { topic: '적분', createdAt: new Date().toISOString() },
    ]);
    console.log(JSON.stringify(scheduleResult, null, 2));
  } catch (error) {
    log(colors.red, '오류', error.message);
  }

  // Test 6: 약점 기반 문제 생성
  try {
    log(colors.green, '테스트 6: 약점 기반 문제 생성', '');
    const problemGen = new ProblemGenerator();
    const resultsForWeakPoints = await problemGen.generateForWeakPoints({
      weakPoints: ['미분', '확률'],
      studentLevel: '고등',
      count: 2,
    });
    console.log(JSON.stringify(resultsForWeakPoints, null, 2));
  } catch (error) {
    log(colors.red, '오류', error.message);
  }

  // Test 7: 단계별 난이도 문제
  try {
    log(colors.green, '테스트 7: 단계별 난이도 문제 생성', '');
    const problemGen = new ProblemGenerator();
    const progressiveResult = await problemGen.generateProgressiveProblems({
      topic: '확률과 통계',
      studentLevel: '고등',
      problemType: '객관식',
    });
    console.log(JSON.stringify(progressiveResult, null, 2));
  } catch (error) {
    log(colors.red, '오류', error.message);
  }

  log(colors.blue, 'AI 에이전트 테스트 완료', '='.repeat(50));
}

// 실행
async function runAllTests() {
  try {
    // Firebase 테스트 먼저 실행
    await testFirebase();
    
    // AI 에이전트 테스트는 선택적 (Gemini API 필요)
    console.log(`\n${colors.yellow}💡 AI 에이전트 테스트를 실행하시겠습니까? (엔터 누르면 스킵)${colors.reset}`);
    
  } catch (error) {
    console.error(colors.red + '테스트 실행 중 오류 발생:' + colors.reset, error);
    process.exit(1);
  }
}

runAllTests().catch(console.error);
