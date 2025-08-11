// MCP Card Search Server Integration
import { MCPCardBenefitService } from './mcpIntegration';

// 카드 검색 에이전트 서비스 (MCP 기반)
export class CardBenefitAgentService {
  private mcpService: MCPCardBenefitService;

  constructor(mcpServerUrl: string = 'http://localhost:8000') {
    this.mcpService = new MCPCardBenefitService(mcpServerUrl);
  }

  // 사용자 질문을 분석하여 적절한 MCP 도구 호출
  async processCardQuery(userQuery: string): Promise<string> {
    try {
      const queryLower = userQuery.toLowerCase();
      
      // 1. 카드명 기반 검색 (가장 높은 우선순위)
      if (this.isCardNameBasedQuery(queryLower)) {
        return await this.handleCardNameBasedQuery(queryLower);
      }
      
      // 2. 혜택 기반 검색
      if (this.isBenefitBasedQuery(queryLower)) {
        return await this.handleBenefitBasedQuery(userQuery, queryLower);
      }
      
      // 3. 연회비 기반 검색
      if (this.isAnnualFeeBasedQuery(queryLower)) {
        return await this.handleAnnualFeeBasedQuery(queryLower);
      }
      
      // 4. 기타 질문 - 카드명 기반 검색으로 처리
      return await this.handleCardNameBasedQuery(queryLower);
      
    } catch (error) {
      console.error('카드 검색 처리 오류:', error);
      return "죄송합니다. 카드 검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
    }
  }

  // 카드명 기반 질문 확인
  private isCardNameBasedQuery(query: string): boolean {
    const cardNamePatterns = [
      '포인트플러스', '메리어트', '본보이', '더베스트', '구독', '좋아요', '베스트', '포인트', '플랜', 
      '미스터', '라이프', '신한카드', '삼성카드', '현대카드', 'KB국민카드', '롯데카드', 'BC카드', 'NH농협카드'
    ];
    return cardNamePatterns.some(pattern => query.includes(pattern));
  }

  // 혜택 기반 질문 확인
  private isBenefitBasedQuery(query: string): boolean {
    const benefitKeywords = ['혜택', '적립', '할인', '무이자', '캐시백', '포인트', '마일리지', '가맹점', '지하철', '주유', '커피', '쇼핑'];
    return benefitKeywords.some(keyword => query.includes(keyword));
  }

  // 연회비 기반 질문 확인
  private isAnnualFeeBasedQuery(query: string): boolean {
    return query.includes('연회비') || query.includes('수수료') || query.includes('비용');
  }

  // 카드명 기반 검색 처리 (새로운 로직)
  private async handleCardNameBasedQuery(queryLower: string): Promise<string> {
    try {
      console.log('🔍 카드명 기반 검색 시작:', queryLower);
      
      // 1단계: 전체 카드 목록 조회
      const allCardsResult = await this.mcpService.getAllCardsWithName();
      
      if (!allCardsResult.cards || allCardsResult.cards.length === 0) {
        return "현재 이용 가능한 카드 목록이 없습니다.";
      }
      
      // 2단계: 사용자 질문과 매칭되는 카드 찾기
      const matchedCard = allCardsResult.cards.find((card: any) => 
        queryLower.includes(card.name.toLowerCase()) || 
        card.name.toLowerCase().includes(queryLower)
      );
      
      if (matchedCard) {
        console.log('✅ 매칭되는 카드 발견:', matchedCard.name);
        
        // 3단계: 매칭된 카드의 상세 정보 조회
        const cardInfo = await this.mcpService.getCardInfo(matchedCard.url);
        return this.formatCardInfo(cardInfo);
      }
      
      // 매칭되는 카드가 없는 경우 전체 카드 목록 반환
      return this.formatCardList(allCardsResult);
      
    } catch (error) {
      console.error('카드명 기반 검색 오류:', error);
      return "카드 검색 중 오류가 발생했습니다.";
    }
  }

  // 혜택 기반 검색 처리 (새로운 로직)
  private async handleBenefitBasedQuery(originalQuery: string, queryLower: string): Promise<string> {
    try {
      console.log('🎯 혜택 기반 검색 시작:', queryLower);
      
      // 1단계: 사용 가능한 혜택 키워드 조회
      const keywordsResult = await this.mcpService.getAvailableBenefitKeywords();
      
      if (!keywordsResult.keywords || keywordsResult.keywords.length === 0) {
        return "현재 이용 가능한 혜택 키워드가 없습니다.";
      }
      
      // 2단계: 사용자 질문과 매칭되는 혜택 키워드 찾기
      const matchedKeyword = keywordsResult.keywords.find(keyword => 
        queryLower.includes(keyword.toLowerCase()) || 
        keyword.toLowerCase().includes(queryLower) ||
        this.findSimilarKeyword(queryLower, keyword)
      );
      
      if (matchedKeyword) {
        console.log('✅ 매칭되는 혜택 키워드 발견:', matchedKeyword);
        
        // 3단계: 매칭된 키워드로 카드 검색
        const result = await this.mcpService.searchCardsByBenefit(matchedKeyword);
        return this.formatCardSearchResult(result, `"${matchedKeyword}" 혜택`);
      }
      
      // 매칭되는 키워드가 없는 경우 사용 가능한 키워드 목록 반환
      return `죄송합니다. 해당 혜택에 맞는 키워드를 찾을 수 없습니다.\n\n사용 가능한 혜택 키워드:\n${keywordsResult.keywords.map(k => `• ${k}`).join('\n')}\n\n위 키워드 중 하나로 검색해보세요.`;
      
    } catch (error) {
      console.error('혜택 기반 검색 오류:', error);
      return "혜택 검색 중 오류가 발생했습니다.";
    }
  }

  // 연회비 기반 검색 처리 (새로운 로직)
  private async handleAnnualFeeBasedQuery(queryLower: string): Promise<string> {
    try {
      console.log('💰 연회비 기반 검색 시작:', queryLower);
      
      // 연회비 범위 추출 (간단한 패턴 매칭)
      const feeMatch = queryLower.match(/(\d+).*?원/);
      const fee = feeMatch ? parseInt(feeMatch[1]) : undefined;
      
      // 연회비 기준으로 카드 검색
      const result = await this.mcpService.searchCardsByAnnualFee(undefined, fee);
      return this.formatCardSearchResult(result, `연회비 ${fee ? `${fee}원 이하` : '기준'}`);
      
    } catch (error) {
      console.error('연회비 기반 검색 오류:', error);
      return "연회비 검색 중 오류가 발생했습니다.";
    }
  }

  // 키워드 유사성 검사
  private findSimilarKeyword(query: string, keyword: string): boolean {
    // 간단한 유사성 검사 (예: "무이자할부" -> "무이자")
    return query.includes(keyword.substring(0, 2));
  }

  // 카드 검색 결과 포맷
  private formatCardSearchResult(result: any, searchType: string): string {
    if (!result.cards || result.cards.length === 0) {
      return `${searchType}으로 검색된 카드가 없습니다.`;
    }
    
    const cardList = result.cards.map((card: any) => 
      `• ${card.name} - ${card.description || '상세 정보 확인 가능'}`
    ).join('\n');
    
    return `${searchType}으로 검색된 카드 목록입니다:\n\n${cardList}`;
  }

  // 카드 정보 포맷
  private formatCardInfo(cardInfo: any): string {
    if (!cardInfo.card) {
      return "카드 정보를 찾을 수 없습니다.";
    }
    
    const card = cardInfo.card;
    let result = `${card.name} 정보를 안내해드리겠습니다.\n\n`;
    
    if (card.benefits) {
      result += `주요 혜택:\n${card.benefits}\n\n`;
    }
    
    if (card.annual_fee) {
      result += `연회비: ${card.annual_fee}\n`;
    }
    
    if (card.features) {
      result += `특징: ${card.features}\n`;
    }
    
    return result;
  }

  // 카드 목록 포맷
  private formatCardList(allCards: any): string {
    if (!allCards.cards || allCards.cards.length === 0) {
      return "현재 이용 가능한 카드 목록이 없습니다.";
    }
    
    const cardList = allCards.cards.map((card: any) => 
      `• ${card.name}`
    ).join('\n');
    
    return `이용 가능한 카드 목록입니다:\n\n${cardList}\n\n궁금한 카드명을 말씀해주시면 상세 정보를 안내해드리겠습니다.`;
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