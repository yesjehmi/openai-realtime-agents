import { RealtimeItem, tool } from '@openai/agents/realtime';

export const cardBenefitSupervisorInstructions = `
당신은 카드 검색 전문 상담 수퍼바이저입니다. MCP 카드 검색 서버를 활용하여 정확하고 유용한 카드 정보를 제공합니다.

# 핵심 원칙
- MCP 서버(http://localhost:8000)를 통해 카드 정보를 조회합니다
- 사용자 질문 유형에 따라 적절한 MCP 도구를 선택합니다
- 카드 정보를 제공할 때는 카드 정보와 혜택 정보를 함께 제공하며, URL만 제공하지 않습니다

# 질문 유형별 처리 방법

## 1. 카드명으로 조회하는 경우
사용자가 특정 카드명을 언급하면:
- get_all_cards_with_name을 호출하여 전체 카드 목록을 조회합니다
- 사용자 질문과 매칭되는 카드를 찾아서 해당 카드의 URL을 get_card_info에 전달합니다
- get_card_info로 해당 카드의 상세 정보를 조회하여 질문에 답변합니다

## 2. 혜택으로 조회하는 경우
사용자가 혜택 관련 질문을 하면:
- get_available_benefit_keywords를 호출하여 사용 가능한 혜택 키워드를 조회합니다
- 사용자 질문과 매칭되는 혜택 키워드를 찾아서 search_cards_by_benefit에 전달합니다
- search_cards_by_benefit으로 해당 혜택의 카드 목록을 조회하여 질문에 답변합니다

## 3. 연회비로 조회하는 경우
사용자가 연회비 관련 질문을 하면:
- search_cards_by_annual_fee를 호출하여 연회비 기준으로 카드를 검색합니다
- 금액을 파라미터로 넘기면 그에 맞는 카드 목록을 반환받아 질문에 답변합니다

# 응답 지침
- 음성 대화용이므로 간결하고 명확하게 답변합니다
- 불필요한 불렛 포인트나 긴 목록은 피하고 산문체로 작성합니다  
- 중요한 정보만 언급하고 나머지는 요약합니다
- 도구 호출에 필요한 정보가 없으면 반드시 사용자에게 요청합니다
- 빈 값, 플레이스홀더, 기본값으로는 절대 도구를 호출하지 않습니다

# 주의사항
- 카드 정보에 대해서 물을 때에는 get_card_info를 사용하여 상세 정보를 반드시 가져와야 합니다
- 정보를 제공할 때에는 카드 정보와 혜택 정보를 함께 제공해야 하며 URL만 제공하지 마세요
- 메시지는 주니어 에이전트가 그대로 읽어주므로 사용자와 직접 대화하는 것처럼 작성하세요
`;

export const cardBenefitSupervisorTools = [
  {
    type: "function",
    name: "getAllCardsWithName",
    description: "모든 카드의 이름(name), URL, idx를 가져옵니다. 카드명으로 조회할 때 첫 번째 단계로 사용됩니다.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "getAvailableBenefitKeywords",
    description: "사용 가능한 모든 혜택 키워드 목록을 반환합니다. 혜택으로 조회할 때 첫 번째 단계로 사용됩니다.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "searchCardsByBenefit",
    description: "혜택 키워드로 카드를 검색합니다. get_available_benefit_keywords로 확인한 키워드를 사용해야 합니다.",
    parameters: {
      type: "object",
      properties: {
        benefit_keyword: {
          type: "string",
          description: "검색할 혜택 키워드 (예: '지하철', '주유', '쇼핑')"
        }
      },
      required: ["benefit_keyword"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "searchCardsByAnnualFee",
    description: "연회비 기준으로 카드를 검색합니다.",
    parameters: {
      type: "object",
      properties: {
        max_fee: {
          type: "number",
          description: "최대 연회비 (원)"
        }
      },
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "getCardInfo",
    description: "특정 카드의 상세 정보(이름, 혜택)을 URL을 통해 가져옵니다.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "카드 상세 페이지 URL"
        }
      },
      required: ["url"],
      additionalProperties: false
    }
  }
];



export const getCardBenefitResponse = tool({
  name: 'getCardBenefitResponse',
  description: '카드 혜택 수퍼바이저 에이전트로부터 응답을 받습니다.',
  parameters: {
    type: 'object',
    properties: {
      relevantContext: {
        type: 'string',
        description: '최근 사용자 메시지의 핵심 내용 (간단하게)',
      },
    },
    required: ['relevantContext'],
    additionalProperties: false,
  },
  execute: async (input: any, context: any) => {
    const { relevantContext } = input;
    const { transcript } = context;

    console.log('=== getCardBenefitResponse 도구 호출됨! ===');
    console.log('relevantContext:', relevantContext);
    console.log('transcript 길이:', transcript?.length || 0);

    try {
      // 대화 내역 준비
      const conversationHistory = transcript
        ? transcript
            .filter((item: any) => item.type === 'message')
            .map((item: any) => ({
              role: item.role,
              content: item.content?.[0]?.text || item.content?.[0]?.transcript || '',
              timestamp: item.itemId || item.id
            }))
        : [];

      // 수퍼바이저 에이전트 호출
      const supervisorResponse = await generateSupervisorResponse(
        relevantContext,
        conversationHistory
      );

      return {
        message: supervisorResponse
      };
    } catch (error) {
      console.error('카드 혜택 수퍼바이저 오류:', error);
      return {
        message: "죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      };
    }
  },
});

// MCP 서비스는 agentIntegration에서 처리

// 수퍼바이저 응답 생성 함수 (서버 API 라우트를 통해 호출)
async function generateSupervisorResponse(
  relevantContext: string, 
  conversationHistory: any[]
): Promise<string> {
  try {
    // 서버 API 라우트를 통해 카드 검색 실행
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
    console.error('수퍼바이저 응답 생성 오류:', error);
    return "죄송합니다. 카드 검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
}

