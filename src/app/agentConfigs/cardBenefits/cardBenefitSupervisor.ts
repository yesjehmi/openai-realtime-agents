import { RealtimeItem, tool } from '@openai/agents/realtime';
import { MCPCardBenefitService, executeSupervisorAgent } from './mcpIntegration';

export const cardBenefitSupervisorInstructions = `
당신은 카드 혜택 전문 상담 수퍼바이저입니다. 실시간 채팅 에이전트를 지원하여 정확하고 유용한 카드 혜택 정보를 제공합니다.

# 지침
- MCP 서버(http://localhost:8000)를 통해 카드 혜택 정보를 조회할 수 있습니다
- 먼저 도구를 호출하여 정확한 정보를 얻은 후 답변하거나, 직접 답변할 수 있습니다
- 필요한 정보가 부족하면 주니어 에이전트가 해당 정보를 요청하도록 메시지에 포함하세요
- 메시지는 주니어 에이전트가 그대로 읽어주므로 사용자와 직접 대화하는 것처럼 작성하세요

==== 카드 혜택 상담 전문 지침 ====
당신은 카드 혜택 전문 상담사로서 사용자가 최적의 카드 혜택을 받을 수 있도록 도움을 제공합니다.

# 지침
- 항상 정확한 카드 혜택 정보만 제공하며, 추측하지 않습니다
- 카드 혜택, 포인트, 할인율, 적립률 등에 대한 질문에 답변합니다
- 특정 가맹점에서의 혜택, 카드 추천, 혜택 비교 등을 도와줍니다
- 사용자의 소비 패턴에 맞는 카드를 추천할 수 있습니다

# 응답 지침
- 음성 대화용이므로 간결하고 명확하게 답변합니다
- 불필요한 불렛 포인트나 긴 목록은 피하고 산문체로 작성합니다
- 중요한 정보만 언급하고 나머지는 요약합니다
- 도구 호출에 필요한 정보가 없으면 반드시 사용자에게 요청합니다
- 빈 값, 플레이스홀더, 기본값으로는 절대 도구를 호출하지 않습니다

# 샘플 문구
## 도구 호출 전
- "카드 혜택 정보를 확인해보겠습니다."
- "해당 카드의 혜택을 조회해드리겠습니다."
- "정확한 혜택 정보를 찾아보겠습니다."

## 정보 부족 시
- "정확한 조회를 위해 카드명을 알려주시겠어요?"
- "어떤 카드사의 카드인지 말씀해주시겠어요?"
- "구체적인 가맹점명을 알려주시면 더 정확한 정보를 드릴 수 있습니다."

# 사용자 메시지 형식
- 사용자에게 제공할 최종 답변을 포함해야 합니다
- 조회된 정보를 바탕으로 한 내용에는 출처를 명시합니다: [출처명](ID)
- 이 회사의 카드 혜택 정보에 대해서만 답변하며 범위를 벗어나지 않습니다

# 예시 (도구 호출)
- 사용자: 신한카드 Deep Dream 카드 혜택이 궁금해요
- Supervisor Assistant: searchCardBenefits(card_name="신한카드 Deep Dream")
- searchCardBenefits(): {
    "cards": [
      {
        "id": "SH_DEEP_DREAM",
        "name": "신한카드 Deep Dream",
        "company": "신한카드",
        "benefits": {
          "cafe": "5% 적립",
          "convenience": "3% 적립",
          "online_shopping": "2% 적립"
        }
      }
    ]
  }
- Supervisor Assistant:
# Message
신한카드 Deep Dream 카드는 카페에서 5% 적립, 편의점에서 3% 적립, 온라인쇼핑에서 2% 적립 혜택을 제공합니다. 카페를 자주 이용하시는 분들에게 특히 유용한 카드네요!
`;

export const cardBenefitSupervisorTools = [
  {
    type: "function",
    name: "searchCardBenefits",
    description: "MCP 서버를 통해 카드 혜택 정보를 검색합니다.",
    parameters: {
      type: "object",
      properties: {
        card_name: {
          type: "string",
          description: "검색할 카드명 (선택사항)"
        },
        card_company: {
          type: "string", 
          description: "카드사명 (선택사항)"
        },
        benefit_category: {
          type: "string",
          description: "혜택 카테고리 (쇼핑, 주유, 카페, 마트 등, 선택사항)"
        }
      },
      additionalProperties: false
    }
  },
  {
    type: "function", 
    name: "getSpecificBenefit",
    description: "특정 카드의 상세 혜택 정보를 조회합니다.",
    parameters: {
      type: "object",
      properties: {
        card_id: {
          type: "string",
          description: "카드 ID (필수)"
        },
        merchant: {
          type: "string",
          description: "특정 가맹점명 (선택사항)"
        }
      },
      required: ["card_id"],
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
  execute: async (input: { relevantContext: string }, context: { transcript: RealtimeItem[] }) => {
    const { relevantContext } = input;
    const { transcript } = context;

    console.log('=== getCardBenefitResponse 도구 호출됨! ===');
    console.log('relevantContext:', relevantContext);
    console.log('transcript 길이:', transcript.length);

    try {
      // 대화 내역 준비
      const conversationHistory = transcript
        .filter(item => item.type === 'message')
        .map(item => ({
          role: item.role,
          content: item.content?.[0]?.text || '',
          timestamp: item.id
        }));

      // 수퍼바이저 에이전트 호출 (실제 구현에서는 OpenAI API 호출)
      // 여기서는 MCP 연결을 위한 기본 구조만 제공
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

// MCP 서비스 인스턴스
const mcpService = new MCPCardBenefitService('http://localhost:8000');

// 수퍼바이저 응답 생성 함수 (서버 API 라우트를 통해 호출)
async function generateSupervisorResponse(
  relevantContext: string, 
  conversationHistory: any[]
): Promise<string> {
  try {
    // 서버 API 라우트를 통해 수퍼바이저 에이전트 실행
    return await executeSupervisorAgent(relevantContext, conversationHistory);
  } catch (error) {
    console.error('수퍼바이저 응답 생성 오류:', error);
    return "죄송합니다. 카드 혜택 정보를 조회하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
}

