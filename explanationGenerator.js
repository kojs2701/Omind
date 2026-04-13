const GeminiService = require("../services/geminiService");

class ExplanationGenerator {
  constructor() {
    this.geminiService = new GeminiService();
  }

  /**
   * 학생 수준에 맞는 해설 생성
   * @param {Object} explanationData - 해설 데이터
   * @returns {Promise<Object>} 생성된 해설
   */
  async generate(explanationData) {
    try {
      const explanation = await this.geminiService.generateExplanation(explanationData);
      
      return {
        success: true,
        explanation: explanation,
        subject: explanationData.subject,
        studentLevel: explanationData.studentLevel,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error generating explanation:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 다양한 난이도의 해설 생성
   * @param {Object} explanationData - 해설 데이터
   * @returns {Promise<Object>} 다층적 해설
   */
  async generateMultiLevelExplanation(explanationData) {
    try {
      const levels = ["초등", "중등", "고등"];
      const explanations = {};

      for (const level of levels) {
        const data = { ...explanationData, studentLevel: level };
        const explanation = await this.geminiService.generateExplanation(data);
        explanations[level] = explanation;
      }

      return {
        success: true,
        multiLevelExplanations: explanations,
        subject: explanationData.subject,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error generating multi-level explanations:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 시각적 자료와 함께 해설 생성
   * @param {Object} explanationData - 해설 데이터
   * @returns {Promise<Object>} 풍부한 해설
   */
  async generateRichExplanation(explanationData) {
    try {
      const explanation = await this.geminiService.generateExplanation(explanationData);
      
      // 해설에서 키포인트를 강조 요소로 변환
      const richContent = {
        explanation: explanation,
        visualHints: this.generateVisualHints(explanation),
        timestamp: new Date().toISOString(),
      };

      return {
        success: true,
        richExplanation: richContent,
      };
    } catch (error) {
      console.error("Error generating rich explanation:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 해설로부터 시각적 힌트 생성
   */
  generateVisualHints(explanation) {
    const hints = [];

    if (explanation.keyPoints) {
      hints.push({
        type: "highlight",
        content: explanation.keyPoints,
        title: "중요 포인트",
      });
    }

    if (explanation.commonMistakes) {
      hints.push({
        type: "warning",
        content: explanation.commonMistakes,
        title: "자주 하는 실수",
      });
    }

    if (explanation.memoryTip) {
      hints.push({
        type: "tip",
        content: explanation.memoryTip,
        title: "기억 팁",
      });
    }

    return hints;
  }
}

module.exports = ExplanationGenerator;
