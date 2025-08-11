import { NextRequest, NextResponse } from 'next/server';
import { CardBenefitAgentService } from '../../../agentConfigs/cardBenefits/agentIntegration';

// MCP 카드 검색 서비스 인스턴스
const cardService = new CardBenefitAgentService();

// MCP 기반 카드 검색 함수
async function processCardQuery(userQuery: string): Promise<string> {
  try {
    console.log(`=== MCP 카드 검색 처리 ===`, userQuery);
    
    // MCP 기반 카드 검색 서비스 사용
    const result = await cardService.processCardQuery(userQuery);
    console.log('MCP 카드 검색 결과:', result);
    
    return result;
    
  } catch (error) {
    console.error('MCP 카드 검색 실패:', error);
    
    // 폴백 응답
    return getFallbackResponse(userQuery);
  }
}

// 폴백 응답 (MCP 서버 연결 실패시 사용)
function getFallbackResponse(userQuery: string): string {
  console.log(`=== 폴백 응답 사용 ===`, userQuery);
  
  const queryLower = userQuery.toLowerCase();
  
  if (queryLower.includes('카드') && (queryLower.includes('목록') || queryLower.includes('전체'))) {
    return "현재 카드 목록 조회 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
  
  if (queryLower.includes('혜택')) {
    return "혜택 정보 조회 서비스에 일시적인 문제가 발생했습니다. 구체적인 카드명을 알려주시면 더 나은 도움을 드릴 수 있습니다.";
  }
  
  if (queryLower.includes('연회비')) {
    return "연회비 정보 조회 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
  
  return "카드 검색 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주시거나, 구체적인 카드명을 말씀해주세요.";
}

export async function POST(request: NextRequest) {
  try {
    const { relevantContext, conversationHistory } = await request.json();
    console.log('=== MCP 카드 검색 API 호출 시작 ===');
    console.log('relevantContext:', relevantContext);
    console.log('conversationHistory:', conversationHistory?.length || 0, '개 메시지');

    // MCP 기반 카드 검색 처리
    const searchResponse = await processCardQuery(relevantContext);

    return NextResponse.json({
      message: searchResponse
    });

  } catch (error) {
    console.error('카드 검색 API 오류:', error);
    return NextResponse.json(
      { message: "죄송합니다. 카드 검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}