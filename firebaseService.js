const admin = require("firebase-admin");

class FirebaseService {
  constructor() {
    // Firebase 서비스 계정 정보 확인
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    // 환경 변수 검증
    if (!projectId || !privateKey || !clientEmail) {
      console.error("❌ Firebase 환경 변수 누락:");
      console.error("   FIREBASE_PROJECT_ID:", projectId ? "✓ 설정됨" : "✗ 누락");
      console.error("   FIREBASE_PRIVATE_KEY:", privateKey ? "✓ 설정됨" : "✗ 누락");
      console.error("   FIREBASE_CLIENT_EMAIL:", clientEmail ? "✓ 설정됨" : "✗ 누락");
      throw new Error("Firebase 환경 변수가 없습니다. .env 파일을 확인해주세요.");
    }

    const serviceAccount = {
      projectId: projectId,
      privateKey: privateKey,
      clientEmail: clientEmail,
    };

    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log("✅ Firebase Admin SDK 초기화 성공");
        console.log(`   프로젝트 ID: ${projectId}`);
        console.log(`   클라이언트 이메일: ${clientEmail}`);
      }

      this.db = admin.firestore();
      this.isReady = true;
      console.log("✅ Firestore 연결 성공");
    } catch (error) {
      console.error("❌ Firebase 초기화 실패:", error.message);
      this.isReady = false;
      throw error;
    }
  }

  /**
   * Firebase 연결 상태 확인
   */
  checkStatus() {
    return {
      isReady: this.isReady,
      projectId: process.env.FIREBASE_PROJECT_ID,
      connected: this.db ? true : false,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 사용자 데이터 저장
   */
  async saveUser(userId, userData) {
    try {
      await this.db.collection("users").doc(userId).set(userData, { merge: true });
      return { success: true };
    } catch (error) {
      console.error("Error saving user:", error);
      throw error;
    }
  }

  /**
   * 오답 기록 저장
   */
  async saveWrongAnswerRecord(userId, recordData) {
    try {
      const recordRef = await this.db.collection("users").doc(userId)
        .collection("wrongAnswers").add({
          ...recordData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      return { success: true, recordId: recordRef.id };
    } catch (error) {
      console.error("Error saving wrong answer record:", error);
      throw error;
    }
  }

  /**
   * 생성된 문제 저장
   */
  async saveProblem(userId, problemData) {
    try {
      const problemRef = await this.db.collection("users").doc(userId)
        .collection("problems").add({
          ...problemData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          solved: false,
        });
      return { success: true, problemId: problemRef.id };
    } catch (error) {
      console.error("Error saving problem:", error);
      throw error;
    }
  }

  /**
   * 학습 계획 저장
   */
  async saveLearningPlan(userId, planData) {
    try {
      await this.db.collection("users").doc(userId)
        .collection("learningPlans").add({
          ...planData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      return { success: true };
    } catch (error) {
      console.error("Error saving learning plan:", error);
      throw error;
    }
  }

  /**
   * 점수 기록 저장
   */
  async saveScore(userId, scoreData) {
    try {
      await this.db.collection("users").doc(userId)
        .collection("scores").add({
          ...scoreData,
          recordedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      return { success: true };
    } catch (error) {
      console.error("Error saving score:", error);
      throw error;
    }
  }

  /**
   * 사용자의 오답 기록 조회
   */
  async getWrongAnswers(userId) {
    try {
      const snapshot = await this.db.collection("users").doc(userId)
        .collection("wrongAnswers").orderBy("createdAt", "desc").get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error getting wrong answers:", error);
      throw error;
    }
  }

  /**
   * 사용자의 생성된 문제 조회
   */
  async getProblems(userId) {
    try {
      const snapshot = await this.db.collection("users").doc(userId)
        .collection("problems").orderBy("createdAt", "desc").get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error getting problems:", error);
      throw error;
    }
  }

  /**
   * 사용자의 점수 기록 조회
   */
  async getScores(userId) {
    try {
      const snapshot = await this.db.collection("users").doc(userId)
        .collection("scores").orderBy("recordedAt", "asc").get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error getting scores:", error);
      throw error;
    }
  }

  /**
   * 사용자의 학습 계획 조회
   */
  async getLearningPlans(userId) {
    try {
      const snapshot = await this.db.collection("users").doc(userId)
        .collection("learningPlans").orderBy("createdAt", "desc").limit(1).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error getting learning plans:", error);
      throw error;
    }
  }

  /**
   * 문제 해결 표시
   */
  async markProblemSolved(userId, problemId) {
    try {
      await this.db.collection("users").doc(userId)
        .collection("problems").doc(problemId).update({
          solved: true,
          solvedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      return { success: true };
    } catch (error) {
      console.error("Error marking problem solved:", error);
      throw error;
    }
  }
}

module.exports = FirebaseService;
