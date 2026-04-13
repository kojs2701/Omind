class GeminiService {
  constructor() {
    this.apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";
    this.apiKey = process.env.GEMINI_API_KEY || "AIzaSyD4T4kXXCuA7ul_3TFuXMj65ElE4sKzJbk";
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
  }

  async requestGemini(prompt) {
    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": this.apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API 오류: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  /**
   * 오답 분석
   * @param {Object} problemData - 문제 데이터
   * @param {string} problemData.problemImage - 문제 이미지 또는 설명
   * @param {string} problemData.userAnswer - 사용자 답변
   * @param {string} problemData.correctAnswer - 정답
   * @param {string} problemData.studentLevel - 학생 수준 (초등/중등/고등/대학)
   * @returns {Promise<Object>} 오답 분석 결과
   */
  async analyzeWrongAnswer(problemData) {
    const prompt = `너는 교육 전문가이다. 다음 학생의 오답을 분석하고 원인을 파악해라.
    
[문제]
${problemData.problemImage}

[학생의 답변]
${problemData.userAnswer}

[정답]
${problemData.correctAnswer}

[학생 수준]
${problemData.studentLevel}

다음 JSON 형식으로 정확히 답변하시오:
{
  "mistakeType": "계산 실수/개념 오해/읽기 오류/부주의",
  "rootCause": "오답의 근본 원인을 한 두 문장으로 설명",
  "mistakeAnalysis": "왜 이런 실수가 나왔는지 자세히 설명",
  "improvementTip": "이를 방지하기 위한 구체적인 조언",
  "similarMistakes": ["비슷한 실수 예시 1", "비슷한 실수 예시 2"]
}`;

    try {
      const response = await this.requestGemini(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { error: response };
    } catch (error) {
      console.error("Error in analyzeWrongAnswer");
      throw error;
    }
  }

  /**
   * 맞춤형 해설 생성
   * @param {Object} explanationData - 해설 데이터
   * @param {string} explanationData.problem - 문제 내용
   * @param {string} explanationData.correctAnswer - 정답
   * @param {string} explanationData.studentLevel - 학생 수준
   * @param {string} explanationData.subject - 과목
   * @returns {Promise<Object>} 해설 생성 결과
   */
  async generateExplanation(explanationData) {
    const prompt = `너는 ${explanationData.studentLevel} 학생을 위한 교육 전문가이다. 
    ${explanationData.subject}에서 다음 문제의 상세한 해설을 작성해라.

[문제]
${explanationData.problem}

[정답]
${explanationData.correctAnswer}

다음 JSON 형식으로 정확히 답변하시오:
{
  "conceptExplanation": "관련 개념을 쉽게 설명",
  "stepByStepSolution": "1단계, 2단계... 형식의 풀이 과정",
  "keyPoints": ["중요한 포인트 1", "중요한 포인트 2", "중요한 포인트 3"],
  "commonMistakes": "흔하게 범하는 실수",
  "practiceProblems": "비슷한 유형의 연습 문제 아이디어 1, 아이디어 2",
  "memoryTip": "더 잘 기억하기 위한 팁"
}`;

    try {
      const response = await this.requestGemini(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { error: response };
    } catch (error) {
      console.error("Error in generateExplanation");
      throw error;
    }
  }

  /**
   * 맞춤형 문제 생성
   * @param {Object} problemGenData - 문제 생성 데이터
   * @param {string} problemGenData.topic - 주제
   * @param {string} problemGenData.studentLevel - 학생 수준
   * @param {string} problemGenData.difficulty - 난이도 (하/중/상)
   * @param {string} problemGenData.problemType - 문제 유형
   * @returns {Promise<Object>} 생성된 문제
   */
  async generateProblem(problemGenData) {
    const prompt = `너는 ${problemGenData.studentLevel} 학생을 위한 교육 전문가이다.
    다음 조건에 맞는 ${problemGenData.difficulty} 난이도의 ${problemGenData.problemType} 문제를 생성해라.

[주제]
${problemGenData.topic}

다음 JSON 형식으로 정확히 답변하시오:
{
  "problem": "문제 내용을 상세히 기술",
  "options": ["선택지 A", "선택지 B", "선택지 C", "선택지 D"],
  "correctAnswer": "정답 (예: A)",
  "answerExplanation": "정답 해설",
  "difficulty": "${problemGenData.difficulty}",
  "objective": "이 문제가 측정하는 학습 목표"
}`;

    try {
      const response = await this.requestGemini(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { error: response };
    } catch (error) {
      console.error("Error in generateProblem");
      throw error;
    }
  }

  /**
   * 학습 추천
   * @param {Object} learningData - 학습 데이터
   * @param {Array} learningData.wrongAnswers - 틀린 문제 분석 데이터
   * @param {string} learningData.studentLevel - 학생 수준
   * @param {Array} learningData.scores - 점수 기록
   * @returns {Promise<Object>} 학습 추천
   */
  async recommendLearningPath(learningData) {
    const prompt = `너는 ${learningData.studentLevel} 학생을 위한 학습 코치이다.
    학생의 오답 패턴과 성적을 분석하여 개인맞춤 학습 계획을 수립해라.

[틀린 문제 분석]
${JSON.stringify(learningData.wrongAnswers, null, 2)}

[최근 점수]
${JSON.stringify(learningData.scores, null, 2)}

다음 JSON 형식으로 정확히 답변하시오:
{
  "weakPoints": ["약점 주제 1", "약점 주제 2", "약점 주제 3"],
  "strongPoints": ["강점 주제 1", "강점 주제 2"],
  "reviewSchedule": {
    "week1": "1주차에 집중할 주제와 풀이량",
    "week2": "2주차에 집중할 주제와 풀이량",
    "week3": "3주차에 집중할 주제와 풀이량",
    "week4": "4주차에 복습 및 최종 점검"
  },
  "studyMethods": ["추천 공부 방법 1", "추천 공부 방법 2", "추천 공부 방법 3"],
  "targetScore": "목표 점수",
  "estimatedTime": "학습에 필요한 예상 시간"
}`;

    try {
      const response = await this.requestGemini(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { error: response };
    } catch (error) {
      console.error("Error in recommendLearningPath");
      throw error;
    }
  }
}

module.exports = GeminiService;
