import { RealtimeAgent, tool } from '@openai/agents/realtime';

export const cardBenefitAgent = new RealtimeAgent({
  name: 'cardBenefitAgent',
  voice: 'sage',
  instructions: `
당신은 카드 검색 전문 상담사입니다. MCP 카드 검색 서버를 활용하여 정확한 카드 정보를 제공합니다.

# 핵심 원칙
- 모든 카드 관련 질문은 getCardBenefitResponse 도구를 사용합니다
- 추측하거나 부정확한 정보 제공을 금지합니다
- 사용자 질문 유형에 관계없이 도구를 통해 정확한 검색을 수행합니다

# 질문 유형별 처리
1. **카드명 기반 질문**: 특정 카드명 언급시 → get_all_cards_with_name → get_card_info
2. **혜택 기반 질문**: "무이자할부", "적립", "할인", "지하철", "주유" 등 → get_available_benefit_keywords → search_cards_by_benefit
3. **연회비 기반 질문**: "연회비", "수수료" 등 → search_cards_by_annual_fee
4. **일반 카드 질문**: 카드 목록, 추천 등 → get_all_cards_with_name

# 필수 도구 사용 규칙
- 카드 관련 모든 질문 → getCardBenefitResponse 호출
- 혜택, 적립, 할인 관련 질문 → getCardBenefitResponse 호출
- 연회비, 수수료 관련 질문 → getCardBenefitResponse 호출
- 카드 목록, 추천 관련 질문 → getCardBenefitResponse 호출

# 허용된 직접 답변
- 기본 인사 및 서비스 소개만

예시:
사용자: "포인트플러스 카드 정보 알려줘"
즉시 실행: getCardBenefitResponse(relevantContext="포인트플러스 카드 정보 조회")

사용자: "지하철 할인 카드 찾아줘"
즉시 실행: getCardBenefitResponse(relevantContext="지하철 할인 혜택 카드 검색")

사용자: "연회비 5만원 이하 카드 있어?"
즉시 실행: getCardBenefitResponse(relevantContext="연회비 5만원 이하 카드 검색")
`,
  tools: [
    tool({
      name: 'getCardBenefitResponse',
      description: 'MCP 카드 검색 서버를 통해 카드 정보를 조회합니다. 모든 카드 관련 질문에 사용해야 합니다.',
      parameters: {
        type: 'object',
        properties: {
          relevantContext: {
            type: 'string',
            description: '사용자의 카드 관련 요청 내용 (예: "포인트플러스 카드 정보 조회", "지하철 할인 혜택 카드 검색", "연회비 5만원 이하 카드 검색")',
          },
        },
        required: ['relevantContext'],
        additionalProperties: false,
      },
      execute: async (input: any, context: any) => {
        const { relevantContext } = input;
        
        console.log('=== getCardBenefitResponse 도구 호출됨! ===');
        console.log('relevantContext:', relevantContext);
        console.log('context:', context);

        try {
          // 대화 내역 준비
          const conversationHistory = context.transcript
            ? context.transcript
                .filter((item: any) => item.type === 'message')
                .map((item: any) => ({
                  role: item.role,
                  content: item.content?.[0]?.text || '',
                  timestamp: item.id
                }))
            : [];

          // 서버 API를 통한 카드 검색 호출
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
          const supervisorResponse = result.message || "죄송합니다. 응답을 생성할 수 없습니다.";

          return {
            message: supervisorResponse
          };
        } catch (error) {
          console.error('카드 혜택 도구 오류:', error);
          return {
            message: "죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
          };
        }
      },
    }),
  ],
});

export const cardBenefitScenario = [cardBenefitAgent];
export const cardBenefitCompanyName = 'CardBenefit';
export default cardBenefitScenario;