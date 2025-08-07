import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// OpenAI 클라이언트 초기화 (서버 사이드)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 카드혜택 에이전트 호출 함수
async function callCardBenefitAgent(userQuery: string, sessionId?: string) {
  try {
    console.log(`=== 신한카드 에이전트 호출 ===`, userQuery);
    
    // 세션 ID 생성 (전달받지 않은 경우)
    const finalSessionId = sessionId || `shinhan-card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const response = await fetch('https://8f04a771295a.ngrok-free.app/chat', {
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
    
    console.log(`에이전트 응답 상태: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`에이전트 서버 오류 (${response.status}):`, errorText);
      throw new Error(`에이전트 서버 응답 오류: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('신한카드 에이전트 응답:', result);
    
    if (result.error) {
      console.error('에이전트 오류:', result.error);
      throw new Error(`에이전트 오류: ${result.error}`);
    }
    
    // 신한카드 에이전트 응답에서 response 필드 추출
    return result.response || result.message || result;
    
  } catch (error) {
    console.error('카드혜택 에이전트 연결 실패:', error);
    
    // 목업 데이터 반환 (fallback)
    return getMockCardResponse(userQuery);
  }
}

// 목업 데이터 (신한카드 에이전트 연결 실패시 사용)
function getMockCardResponse(userQuery: string) {
  console.log(`=== 신한카드 목업 데이터 사용 ===`, userQuery);
  
  const queryLower = userQuery.toLowerCase();
  
  if (queryLower.includes('카드 목록') || queryLower.includes('전체') || queryLower.includes('list')) {
    return "신한카드 주요 카드 목록을 안내해드릴게요:\n\n**신용카드:**\n• 신한카드 Mr.Life\n• 신한카드 The BEST-X\n• 신한카드 Point Plan+\n• 신한카드 Deep Oil\n• 신한카드 Air One\n\n**체크카드:**\n• 신한카드 Deep Dream 체크\n• 신한카드 SOL트래블 체크\n• 신한카드 Hey Young 체크\n\n더 자세한 카드 정보나 특정 카드 혜택을 알고 싶으시면 카드명을 말씀해 주세요!";
  }
  
  if (queryLower.includes('mr.life') || queryLower.includes('미스터라이프')) {
    return "신한카드 Mr.Life 혜택 정보:\n\n• 연회비: 국내전용 무료, 해외겸용 15,000원\n• 생활: 5% 적립 (월 5만원 한도)\n• 통신: 10% 적립 (월 1만원 한도)\n• 주유: 리터당 100원 할인\n\n생활비 절약에 최적화된 카드입니다.";
  }
  
  if (queryLower.includes('best-x') || queryLower.includes('베스트')) {
    return "신한카드 The BEST-X 혜택 정보:\n\n• 연회비: 300,000원\n• 항공료: 5% 적립\n• 해외: 2% 적립\n• 호텔: 10% 할인\n• 라운지: 무료 이용\n\n프리미엄 여행 특화 카드입니다.";
  }
  
  if (queryLower.includes('point plan') || queryLower.includes('포인트플랜')) {
    return "신한카드 Point Plan+ 혜택 정보:\n\n• 연회비: 15,000원\n• 통신요금: 10% 적립\n• 온라인쇼핑: 5% 적립\n• 대중교통: 20% 적립\n\n포인트 적립에 특화된 카드입니다.";
  }
  
  return "안녕하세요! 신한카드 전문 상담사입니다. 카드 추천, 혜택 조회, 이벤트 정보 등을 안내해드릴 수 있습니다. 궁금한 카드명을 말씀해 주시거나 '카드 목록'이라고 말씀해 주세요!";
}

export async function POST(request: NextRequest) {
  try {
    const { relevantContext, conversationHistory } = await request.json();
    console.log('=== API 호출 시작 ===');
    console.log('relevantContext:', relevantContext);
    console.log('conversationHistory:', conversationHistory.length, '개 메시지');

    // 사용자 요청을 카드혜택 에이전트로 직접 전달
    const agentResponse = await callCardBenefitAgent(relevantContext);

    return NextResponse.json({
      message: agentResponse
    });

  } catch (error) {
    console.error('카드 혜택 수퍼바이저 API 오류:', error);
    return NextResponse.json(
      { message: "죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}