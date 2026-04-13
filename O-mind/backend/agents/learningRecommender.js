const GeminiService = require("../services/geminiService");

class LearningRecommender {
  constructor() {
    this.geminiService = new GeminiService();
  }

  /**
   * 학습 경로 추천
   * @param {Object} learningData - 학습 데이터
   * @returns {Promise<Object>} 추천 학습 경로
   */
  async recommendPath(learningData) {
    try {
      const recommendation = await this.geminiService.recommendLearningPath(learningData);
      
      return {
        success: true,
        recommendation: recommendation,
        studentLevel: learningData.studentLevel,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error recommending learning path:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 망각 곡선 기반 복습 일정 계산
   * @param {Array} wrongAnswers - 틀린 문제 기록
   * @returns {Promise<Object>} 복습 일정
   */
  async calculateForgetfulnessCurveSchedule(wrongAnswers) {
    try {
      const now = new Date();
      const schedule = {};

      // Ebbinghaus의 망각 곡선 기반
      const reviewIntervals = [1, 3, 7, 14, 30]; // 일 단위

      wrongAnswers.forEach((answer, index) => {
        const baseDate = answer.createdAt ? new Date(answer.createdAt) : now;
        const topic = answer.topic || `주제 ${index}`;

        schedule[topic] = reviewIntervals.map((days) => {
          const reviewDate = new Date(baseDate);
          reviewDate.setDate(reviewDate.getDate() + days);
          return {
            days: days,
            reviewDate: reviewDate.toISOString().split("T")[0],
            interval: `${days}일 후`,
          };
        });
      });

      return {
        success: true,
        schedule: schedule,
        basis: "Ebbinghaus 망각 곡선",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error calculating forgetfulness curve:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 장점/약점 분석 기반 추천
   * @param {Object} analysisData - 분석 데이터
   * @returns {Promise<Object>} 상세 추천
   */
  async generateDetailedRecommendation(analysisData) {
    try {
      const recommendation = await this.geminiService.recommendLearningPath(analysisData);

      // 상세 정보 추가
      const detailedRecommendation = {
        ...recommendation,
        focusAreas: recommendation.weakPoints,
        maintainAreas: recommendation.strongPoints,
        progressMetrics: {
          startDate: new Date().toISOString().split("T")[0],
          estimatedDays: this.estimateLearningDays(recommendation.estimatedTime),
          checkpointCount: 4, // 주 단위 체크포인트
        },
      };

      return {
        success: true,
        detailedRecommendation: detailedRecommendation,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error generating detailed recommendation:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 예상 학습 시간을 일 수로 변환
   */
  estimateLearningDays(estimatedTimeStr) {
    if (!estimatedTimeStr) return 30;
    
    const match = estimatedTimeStr.match(/(\d+)\s*(일|시간|주)/);
    if (!match) return 30;

    const [, num, unit] = match;
    const days = {
      "일": parseInt(num),
      "시간": Math.ceil(parseInt(num) / 3),
      "주": parseInt(num) * 7,
    };

    return days[unit] || 30;
  }

  /**
   * 복습 우선순위 결정
   * @param {Array} wrongAnswers - 틀린 문제들
   * @returns {Promise<Object>} 우선순위 정렬된 복습 목록
   */
  async prioritizeReviewItems(wrongAnswers) {
    try {
      const prioritized = wrongAnswers
        .map(answer => ({
          ...answer,
          priority: this.calculatePriority(answer),
        }))
        .sort((a, b) => b.priority - a.priority);

      return {
        success: true,
        prioritizedList: prioritized,
        topicBreakdown: this.getTopicBreakdown(prioritized),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error prioritizing review items:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 우선순위 점수 계산
   */
  calculatePriority(answer) {
    let priority = 0;

    // 1. 오답 빈도 (높을수록 높은 우선순위)
    priority += (answer.mistakeCount || 1) * 10;

    // 2. 최근 오답 여부 (최근일수록 높은 우선순위)
    if (answer.createdAt) {
      const daysSince = Math.floor(
        (new Date() - new Date(answer.createdAt)) / (1000 * 60 * 60 * 24)
      );
      priority += Math.max(0, 30 - daysSince);
    }

    // 3. 중요도 (개념 오해가 계산 실수보다 중요)
    if (answer.mistakeType === "개념 오해") {
      priority += 15;
    } else if (answer.mistakeType === "부주의") {
      priority += 5;
    }

    return priority;
  }

  /**
   * 주제별 분석
   */
  getTopicBreakdown(prioritizedList) {
    const breakdown = {};

    prioritizedList.forEach(item => {
      const topic = item.topic || "기타";
      if (!breakdown[topic]) {
        breakdown[topic] = { count: 0, totalPriority: 0 };
      }
      breakdown[topic].count += 1;
      breakdown[topic].totalPriority += item.priority;
    });

    return breakdown;
  }
}

module.exports = LearningRecommender;
