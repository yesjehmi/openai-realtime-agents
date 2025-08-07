// OpenAI API는 서버 사이드 API 라우트를 통해 호출

// 신한카드 에이전트 서비스
export class CardBenefitAgentService {
  public agentUrl: string; // public으로 변경하여 외부에서 접근 가능

  constructor(agentUrl: string = 'https://8f04a771295a.ngrok-free.app/chat') {
    this.agentUrl = agentUrl;
  }

  // 신한카드 에이전트에 요청을 보내는 기본 함수
  private async callAgent(userQuery: string, sessionId?: string): Promise<any> {
    try {
      // 세션 ID 생성 (전달받지 않은 경우)
      const finalSessionId = sessionId || `shinhan-card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await fetch(this.agentUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          message: userQuery,
          session_id: finalSessionId
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`에이전트 서버 응답 오류 (${response.status}):`, errorText);
        throw new Error(`에이전트 서버 응답 오류: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        console.error('에이전트 오류:', result.error);
        throw new Error(`에이전트 오류: ${result.error}`);
      }
      
      // 신한카드 에이전트 응답에서 response 필드 추출
      return result.response || result.message || result;
    } catch (error) {
      console.error('신한카드 에이전트 연결 오류:', error);
      throw new Error('신한카드 에이전트에 연결할 수 없습니다: ' + (error as Error).message);
    }
  }

  // 모든 카드 목록 가져오기
  async getAllCardListInfo(sessionId?: string): Promise<any> {
    return await this.callAgent('신한카드 전체 목록을 알려주세요', sessionId);
  }

  // 특정 카드 혜택 정보 조회
  async getCardBenefitInfo(cardName: string, sessionId?: string): Promise<any> {
    return await this.callAgent(`${cardName}의 혜택 정보를 자세히 알려주세요`, sessionId);
  }

  // 일반 카드 관련 질의
  async queryCardInfo(query: string, sessionId?: string): Promise<any> {
    return await this.callAgent(query, sessionId);
  }
}

// 수퍼바이저 에이전트 실행 함수 (서버 API를 통해 호출)
export async function executeSupervisorAgent(
  relevantContext: string,
  conversationHistory: any[]
): Promise<string> {
  console.log('=== executeSupervisorAgent 호출됨! ===');
  console.log('relevantContext:', relevantContext);
  
  try {
    // 서버 API 라우트를 통해 카드혜택 에이전트 호출
    const response = await fetch('/api/card-benefits/supervisor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        relevantContext,
        conversationHistory
      })
    });

    if (!response.ok) {
      throw new Error(`서버 응답 오류: ${response.status}`);
    }

    const result = await response.json();
    return result.message || "죄송합니다. 응답을 생성할 수 없습니다.";

  } catch (error) {
    console.error('수퍼바이저 에이전트 실행 오류:', error);
    return "죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
}