const GeminiService = require("../services/geminiService");

class WrongAnswerAnalyzer {
  constructor() {
    this.geminiService = new GeminiService();
  }

  /**
   * 오답을 분석하고 원인을 파악
   * @param {Object} problemData - 문제 데이터
   * @returns {Promise<Object>} 분석 결과
   */
  async analyze(problemData) {
    try {
      const analysis = await this.geminiService.analyzeWrongAnswer(problemData);
      
      return {
        success: true,
        analysis: analysis,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error in wrong answer analysis:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 여러 오답 패턴 분석
   * @param {Array} wrongAnswers - 오답 데이터 배열
   * @returns {Promise<Object>} 패턴 분석 결과
   */
  async analyzePatterns(wrongAnswers) {
    try {
      const patterns = {};
      const mistakeTypes = {};

      for (const answer of wrongAnswers) {
        const analysis = await this.geminiService.analyzeWrongAnswer(answer);
        
        if (analysis.mistakeType) {
          mistakeTypes[analysis.mistakeType] = 
            (mistakeTypes[analysis.mistakeType] || 0) + 1;
        }
      }

      return {
        success: true,
        totalWrongAnswers: wrongAnswers.length,
        mistakeTypeDistribution: mistakeTypes,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error analyzing patterns:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = WrongAnswerAnalyzer;
