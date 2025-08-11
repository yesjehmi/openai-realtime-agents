// MCP Card Search Server Integration
export class MCPCardBenefitService {
  private serverUrl: string;

  constructor(serverUrl: string = 'http://localhost:8000') {
    this.serverUrl = serverUrl;
  }

  // 혜택 기반 검색용 키워드 목록 가져오기
  async getAvailableBenefitKeywords(): Promise<{ keywords: string[] }> {
    try {
      const response = await fetch(`${this.serverUrl}/get_available_benefit_keywords`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
      }
      
      const result = await response.json();
      return { keywords: result.keywords || [] };
    } catch (error) {
      console.error('혜택 키워드 조회 오류:', error);
      return { keywords: [] };
    }
  }

  // 혜택 기반 카드 검색
  async searchCardsByBenefit(benefitKeyword: string): Promise<any> {
    try {
      const response = await fetch(`${this.serverUrl}/search_cards_by_benefit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          benefit_keyword: benefitKeyword
        })
      });
      
      if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('혜택 기반 카드 검색 오류:', error);
      return { cards: [] };
    }
  }

  // 연회비 기반 카드 검색 (새로운 로직)
  async searchCardsByAnnualFee(minFee?: number, maxFee?: number): Promise<any> {
    try {
      const response = await fetch(`${this.serverUrl}/search_cards_by_annual_fee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          max_fee: maxFee
        })
      });
      
      if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('연회비 기반 카드 검색 오류:', error);
      return { cards: [] };
    }
  }

  // 모든 카드의 이름과 URL 가져오기 (새로운 로직)
  async getAllCardsWithName(): Promise<{ cards: Array<{ name: string; url: string; idx: string; }> }> {
    try {
      const response = await fetch(`${this.serverUrl}/get_all_cards_with_name`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
      }
      
      const result = await response.json();
      return { cards: result.cards || [] };
    } catch (error) {
      console.error('전체 카드 목록 조회 오류:', error);
      return { cards: [] };
    }
  }

  // 특정 카드의 상세 정보 가져오기 (새로운 로직)
  async getCardInfo(url: string): Promise<any> {
    try {
      const response = await fetch(`${this.serverUrl}/get_card_info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url
        })
      });
      
      if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('카드 정보 조회 오류:', error);
      return { card: null };
    }
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