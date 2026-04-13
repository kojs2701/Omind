const GeminiService = require("../services/geminiService");

class ProblemGenerator {
  constructor() {
    this.geminiService = new GeminiService();
  }

  /**
   * 맞춤형 문제 생성
   * @param {Object} problemGenData - 문제 생성 데이터
   * @returns {Promise<Object>} 생성된 문제
   */
  async generate(problemGenData) {
    try {
      const problem = await this.geminiService.generateProblem(problemGenData);
      
      return {
        success: true,
        problem: problem,
        topic: problemGenData.topic,
        difficulty: problemGenData.difficulty,
        studentLevel: problemGenData.studentLevel,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error generating problem:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 약점 주제를 기반으로 문제 생성
   * @param {Object} config - 생성 설정
   * @returns {Promise<Array>} 생성된 문제 배열
   */
  async generateForWeakPoints(config) {
    try {
      const problems = [];
      const { weakPoints, studentLevel, count } = config;

      for (let i = 0; i < count; i++) {
        const topic = weakPoints[i % weakPoints.length];
        const problem = await this.geminiService.generateProblem({
          topic,
          studentLevel,
          difficulty: "중",
          problemType: "객관식",
        });

        problems.push(problem);
      }

      return {
        success: true,
        problems: problems,
        count: problems.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error generating problems for weak points:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 단계별 난이도 문제 생성 (하 -> 중 -> 상)
   * @param {Object} config - 생성 설정
   * @returns {Promise<Object>} 난이도별 문제
   */
  async generateProgressiveProblems(config) {
    try {
      const difficulties = ["하", "중", "상"];
      const problemsByDifficulty = {};

      for (const difficulty of difficulties) {
        const problem = await this.geminiService.generateProblem({
          topic: config.topic,
          studentLevel: config.studentLevel,
          difficulty,
          problemType: config.problemType || "객관식",
        });

        problemsByDifficulty[difficulty] = problem;
      }

      return {
        success: true,
        progressiveProblems: problemsByDifficulty,
        topic: config.topic,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error generating progressive problems:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 배치로 여러 문제 생성
   * @param {Array} configs - 생성 설정 배열
   * @returns {Promise<Object>} 생성된 문제들
   */
  async generateBatch(configs) {
    try {
      const problems = [];
      
      for (const config of configs) {
        const problem = await this.geminiService.generateProblem(config);
        problems.push(problem);
      }

      return {
        success: true,
        problems: problems,
        totalCount: problems.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error generating batch problems:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = ProblemGenerator;
