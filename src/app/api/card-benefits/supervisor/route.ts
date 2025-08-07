import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// OpenAI 클라이언트 초기화 (서버 사이드)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 카드혜택 에이전트 호출 함수
async function callCardBenefitAgent(userQuery: string) {
  try {
    console.log(`=== 카드혜택 에이전트 호출 ===`, userQuery);
    
    const response = await fetch('https://7024509b0dc1.ngrok-free.app/chat/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        message: userQuery,
        conversation_id: `card-benefit-${Date.now()}`
      })
    });
    
    console.log(`에이전트 응답 상태: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`에이전트 서버 오류 (${response.status}):`, errorText);
      throw new Error(`에이전트 서버 응답 오류: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('에이전트 응답:', result);
    
    if (result.error) {
      console.error('에이전트 오류:', result.error);
      throw new Error(`에이전트 오류: ${result.error}`);
    }
    
    return result.response || result.message || result;
    
  } catch (error) {
    console.error('카드혜택 에이전트 연결 실패:', error);
    
    // 목업 데이터 반환 (fallback)
    return getMockCardResponse(userQuery);
  }
}

// 목업 데이터 (에이전트 연결 실패시 사용)
function getMockCardResponse(userQuery: string) {
  console.log(`=== 목업 데이터 사용 ===`, userQuery);
  
  const queryLower = userQuery.toLowerCase();
  
  if (queryLower.includes('카드 목록') || queryLower.includes('전체') || queryLower.includes('list')) {
    return "현재 이용 가능한 카드는 다음과 같습니다:\n\n1. 더모아카드 - 일상생활 적립 특화\n2. 포인트플러스카드 - 통신/주유 적립 특화\n3. 캐시백카드 - 즉시 현금 적립\n\n자세한 혜택을 알고 싶은 카드가 있으시면 말씀해 주세요.";
  }
  
  if (queryLower.includes('더모아') || queryLower.includes('deomoa')) {
    return "더모아카드 혜택 정보:\n\n• 연회비: 무료\n• 카페: 5% 적립\n• 편의점: 3% 적립\n• 온라인쇼핑: 2% 적립\n\n일상생활에서 더 많이 적립할 수 있는 카드입니다.";
  }
  
  if (queryLower.includes('포인트플러스') || queryLower.includes('pointplus')) {
    return "포인트플러스카드 혜택 정보:\n\n• 연회비: 15,000원\n• 통신요금: 10% 적립\n• 주유소: 3% 적립\n• 마트: 2% 적립\n\n포인트 적립에 특화된 프리미엄 카드입니다.";
  }
  
  if (queryLower.includes('캐시백') || queryLower.includes('cashback')) {
    return "캐시백카드 혜택 정보:\n\n• 연회비: 5,000원\n• 모든 가맹점: 1% 즉시 캐시백\n• 온라인쇼핑: 2% 캐시백\n• 해외결제: 1.5% 캐시백\n\n즉시 현금으로 적립되는 간편한 카드입니다.";
  }
  
  return "카드 혜택 정보를 조회하려면 구체적인 카드명을 말씀해 주세요. (예: 더모아카드, 포인트플러스카드 등) 또는 '카드 목록'이라고 말씀하시면 전체 카드 목록을 안내해드립니다.";
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