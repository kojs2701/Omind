require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

// Services
const FirebaseService = require("./services/firebaseService");

// Agents
const WrongAnswerAnalyzer = require("./agents/wrongAnswerAnalyzer");
const ExplanationGenerator = require("./agents/explanationGenerator");
const ProblemGenerator = require("./agents/problemGenerator");
const LearningRecommender = require("./agents/learningRecommender");

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5500;
const DEFAULT_GEMINI_API_KEY = "AIzaSyD4T4kXXCuA7ul_3TFuXMj65ElE4sKzJbk";

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static(path.join(__dirname, "..")));

// Initialize Services
let firebaseService;
let wrongAnswerAnalyzer;
let explanationGenerator;
let problemGenerator;
let learningRecommender;
let geminiQueue = Promise.resolve();
let lastGeminiRequestAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function enqueueGeminiTask(task) {
  const wrapped = async () => {
    const now = Date.now();
    const minGapMs = 1400; // 과도한 호출 방지로 429 최소화
    const waitMs = Math.max(0, minGapMs - (now - lastGeminiRequestAt));
    if (waitMs > 0) await sleep(waitMs);
    const result = await task();
    lastGeminiRequestAt = Date.now();
    return result;
  };
  geminiQueue = geminiQueue.then(wrapped, wrapped);
  return geminiQueue;
}

// Initialize services with error handling
function initializeServices() {
  try {
    console.log("🚀 Firebase 서비스 초기화 중...");
    firebaseService = new FirebaseService();
    console.log("✅ Firebase 서비스 준비 완료");
    
    wrongAnswerAnalyzer = new WrongAnswerAnalyzer();
    explanationGenerator = new ExplanationGenerator();
    problemGenerator = new ProblemGenerator();
    learningRecommender = new LearningRecommender();
    console.log("✅ 모든 AI 에이전트 초기화 완료");
  } catch (error) {
    console.error("❌ Firebase 초기화 실패:", error.message);
    console.error("   원인: 환경 변수 또는 자격증명 확인 필요");
    console.error("   해결: .env 파일에 Firebase 환경 변수를 설정하세요");
    console.log("💡 데모 모드로 실행 중 (Firebase 기능 비활성화)");
  }
}

// ==================== Routes ====================

// 0. Firebase 상태 확인 엔드포인트
app.get("/api/status", (req, res) => {
  try {
    const status = {
      server: "running",
      firebaseReady: firebaseService?.isReady ?? false,
      timestamp: new Date().toISOString(),
      projectId: process.env.FIREBASE_PROJECT_ID ? "✓ 설정됨" : "✗ 설정 안됨",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? "✓ 설정됨" : "✗ 설정 안됨",
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? "✓ 설정됨" : "✗ 설정 안됨",
    };
    
    if (firebaseService?.isReady) {
      res.json({ success: true, ...status });
    } else {
      res.status(503).json({ success: false, ...status });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      firebaseReady: false 
    });
  }
});

// Gemini 프록시 엔드포인트 (클라이언트에 API 키 노출 방지)
app.post("/api/gemini-generate", async (req, res) => {
  try {
    const { prompt, imageDataUrl, generationConfig } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || DEFAULT_GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
    }

    const parts = [{ text: prompt }];
    if (imageDataUrl && typeof imageDataUrl === "string" && imageDataUrl.includes(",")) {
      const [header, base64] = imageDataUrl.split(",");
      const mimeMatch = header.match(/data:(.*?);base64/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64,
        },
      });
    }

    const payload = {
      contents: [{ parts }],
      generationConfig: {
        temperature: generationConfig?.temperature ?? 0.4,
        topP: generationConfig?.topP ?? 0.9,
        maxOutputTokens: generationConfig?.maxOutputTokens ?? 220,
      },
    };

    const callGeminiOnce = async () => {
      return fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify(payload),
      });
    };

    const callGeminiWithRetry = async () => {
      let lastError = null;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const response = await callGeminiOnce();

        if (response.ok) {
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          return { ok: true, text };
        }

        const errText = await response.text();
        lastError = { status: response.status, detail: errText };
        if (response.status === 429) {
          const backoff = 1500 * Math.pow(2, attempt);
          await sleep(backoff);
          continue;
        }
        return { ok: false, ...lastError };
      }
      return { ok: false, ...(lastError || { status: 500, detail: "unknown error" }) };
    };

    const result = await enqueueGeminiTask(callGeminiWithRetry);
    if (!result.ok) {
      return res.status(503).json({
        error: "Gemini temporarily unavailable",
        status: result.status,
        detail: result.detail,
      });
    }

    res.json({ text: result.text });
  } catch (error) {
    console.error("Error in /api/gemini-generate");
    res.status(500).json({ error: "gemini proxy failed" });
  }
});

// 1. 오답 분석 엔드포인트
app.post("/api/analyze-wrong-answer", async (req, res) => {
  try {
    const { problemImage, userAnswer, correctAnswer, studentLevel } = req.body;

    if (!problemImage || !userAnswer || !correctAnswer) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await wrongAnswerAnalyzer.analyze({
      problemImage,
      userAnswer,
      correctAnswer,
      studentLevel: studentLevel || "중등",
    });

    // Firebase에 저장
    if (firebaseService && req.query.userId) {
      await firebaseService.saveWrongAnswerRecord(req.query.userId, {
        ...result,
        problemImage,
        userAnswer,
        correctAnswer,
      });
    }

    res.json(result);
  } catch (error) {
    console.error("Error analyzing wrong answer:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. 해설 생성 엔드포인트
app.post("/api/generate-explanation", async (req, res) => {
  try {
    const { problem, correctAnswer, studentLevel, subject } = req.body;

    if (!problem || !correctAnswer) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await explanationGenerator.generate({
      problem,
      correctAnswer,
      studentLevel: studentLevel || "중등",
      subject: subject || "수학",
    });

    res.json(result);
  } catch (error) {
    console.error("Error generating explanation:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. 다층적 해설 생성 엔드포인트
app.post("/api/generate-multi-level-explanation", async (req, res) => {
  try {
    const { problem, correctAnswer, subject } = req.body;

    if (!problem || !correctAnswer) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await explanationGenerator.generateMultiLevelExplanation({
      problem,
      correctAnswer,
      subject: subject || "수학",
    });

    res.json(result);
  } catch (error) {
    console.error("Error generating multi-level explanations:", error);
    res.status(500).json({ error: error.message });
  }
});

// 4. 문제 생성 엔드포인트
app.post("/api/generate-problem", async (req, res) => {
  try {
    const { topic, studentLevel, difficulty, problemType } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const result = await problemGenerator.generate({
      topic,
      studentLevel: studentLevel || "중등",
      difficulty: difficulty || "중",
      problemType: problemType || "객관식",
    });

    // Firebase에 저장
    if (firebaseService && req.query.userId) {
      await firebaseService.saveProblem(req.query.userId, result.problem);
    }

    res.json(result);
  } catch (error) {
    console.error("Error generating problem:", error);
    res.status(500).json({ error: error.message });
  }
});

// 5. 약점 기반 문제 생성 엔드포인트
app.post("/api/generate-problems-for-weakpoints", async (req, res) => {
  try {
    const { weakPoints, studentLevel, count } = req.body;

    if (!weakPoints || !Array.isArray(weakPoints)) {
      return res.status(400).json({ error: "weakPoints array is required" });
    }

    const result = await problemGenerator.generateForWeakPoints({
      weakPoints,
      studentLevel: studentLevel || "중등",
      count: count || 5,
    });

    res.json(result);
  } catch (error) {
    console.error("Error generating problems for weak points:", error);
    res.status(500).json({ error: error.message });
  }
});

// 6. 단계별 난이도 문제 생성 엔드포인트
app.post("/api/generate-progressive-problems", async (req, res) => {
  try {
    const { topic, studentLevel, problemType } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const result = await problemGenerator.generateProgressiveProblems({
      topic,
      studentLevel: studentLevel || "중등",
      problemType: problemType || "객관식",
    });

    res.json(result);
  } catch (error) {
    console.error("Error generating progressive problems:", error);
    res.status(500).json({ error: error.message });
  }
});

// 7. 학습 경로 추천 엔드포인트
app.post("/api/recommend-learning-path", async (req, res) => {
  try {
    const { wrongAnswers, studentLevel, scores } = req.body;

    if (!wrongAnswers || !Array.isArray(wrongAnswers)) {
      return res.status(400).json({ error: "wrongAnswers array is required" });
    }

    const result = await learningRecommender.recommendPath({
      wrongAnswers,
      studentLevel: studentLevel || "중등",
      scores: scores || [],
    });

    // Firebase에 저장
    if (firebaseService && req.query.userId) {
      await firebaseService.saveLearningPlan(req.query.userId, result.recommendation);
    }

    res.json(result);
  } catch (error) {
    console.error("Error recommending learning path:", error);
    res.status(500).json({ error: error.message });
  }
});

// 8. 망각 곡선 기반 복습 일정 엔드포인트
app.post("/api/calculate-review-schedule", async (req, res) => {
  try {
    const { wrongAnswers } = req.body;

    if (!wrongAnswers || !Array.isArray(wrongAnswers)) {
      return res.status(400).json({ error: "wrongAnswers array is required" });
    }

    const result = await learningRecommender.calculateForgetfulnessCurveSchedule(wrongAnswers);

    res.json(result);
  } catch (error) {
    console.error("Error calculating review schedule:", error);
    res.status(500).json({ error: error.message });
  }
});

// 9. 복습 우선순위 결정 엔드포인트
app.post("/api/prioritize-review", async (req, res) => {
  try {
    const { wrongAnswers } = req.body;

    if (!wrongAnswers || !Array.isArray(wrongAnswers)) {
      return res.status(400).json({ error: "wrongAnswers array is required" });
    }

    const result = await learningRecommender.prioritizeReviewItems(wrongAnswers);

    res.json(result);
  } catch (error) {
    console.error("Error prioritizing review items:", error);
    res.status(500).json({ error: error.message });
  }
});

// 10. 점수 기록 저장 엔드포인트
app.post("/api/save-score", async (req, res) => {
  try {
    const { userId, testName, score, totalScore, date, subject } = req.body;

    if (!userId || score === undefined) {
      return res.status(400).json({ error: "userId and score are required" });
    }

    if (firebaseService) {
      await firebaseService.saveScore(userId, {
        testName: testName || "Test",
        score,
        totalScore: totalScore || 100,
        date: date || new Date().toISOString().split("T")[0],
        subject: subject || "General",
        percentage: ((score / (totalScore || 100)) * 100).toFixed(2),
      });

      res.json({ success: true, message: "Score saved successfully" });
    } else {
      res.json({ 
        success: true, 
        message: "Score saved (demo mode - Firebase disabled)" 
      });
    }
  } catch (error) {
    console.error("Error saving score:", error);
    res.status(500).json({ error: error.message });
  }
});

// 11. 사용자 오답 조회 엔드포인트
app.get("/api/user-wrong-answers/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!firebaseService) {
      return res.json({ wrongAnswers: [] });
    }

    const wrongAnswers = await firebaseService.getWrongAnswers(userId);
    res.json({ wrongAnswers });
  } catch (error) {
    console.error("Error fetching wrong answers:", error);
    res.status(500).json({ error: error.message });
  }
});

// 12. 사용자 생성된 문제 조회 엔드포인트
app.get("/api/user-problems/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!firebaseService) {
      return res.json({ problems: [] });
    }

    const problems = await firebaseService.getProblems(userId);
    res.json({ problems });
  } catch (error) {
    console.error("Error fetching problems:", error);
    res.status(500).json({ error: error.message });
  }
});

// 13. 사용자 점수 기록 조회 엔드포인트
app.get("/api/user-scores/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!firebaseService) {
      return res.json({ scores: [] });
    }

    const scores = await firebaseService.getScores(userId);
    res.json({ scores });
  } catch (error) {
    console.error("Error fetching scores:", error);
    res.status(500).json({ error: error.message });
  }
});

// 14. 사용자 학습 계획 조회 엔드포인트
app.get("/api/user-learning-plans/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!firebaseService) {
      return res.json({ learningPlans: [] });
    }

    const learningPlans = await firebaseService.getLearningPlans(userId);
    res.json({ learningPlans });
  } catch (error) {
    console.error("Error fetching learning plans:", error);
    res.status(500).json({ error: error.message });
  }
});

// 15. 문제 해결 표시 엔드포인트
app.put("/api/mark-problem-solved", async (req, res) => {
  try {
    const { userId, problemId } = req.body;

    if (!userId || !problemId) {
      return res.status(400).json({ error: "userId and problemId are required" });
    }

    if (firebaseService) {
      await firebaseService.markProblemSolved(userId, problemId);
    }

    res.json({ success: true, message: "Problem marked as solved" });
  } catch (error) {
    console.error("Error marking problem solved:", error);
    res.status(500).json({ error: error.message });
  }
});

// Health check 엔드포인트
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    services: {
      gemini: "ready",
      firebase: firebaseService ? "connected" : "demo",
    }
  });
});

// 메인 페이지 제공
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║     O:mind - AI Learning Platform      ║
  ║         Server Started 🚀              ║
  ╠════════════════════════════════════════╣
  ║ Server running on: http://localhost:${PORT}
  ║ Environment: ${process.env.NODE_ENV || 'development'}
  ║ API Ready: /api/*
  ╚════════════════════════════════════════╝
  `);
  initializeServices();
});

module.exports = app;
