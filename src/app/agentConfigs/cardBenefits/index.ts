import { RealtimeAgent, tool } from '@openai/agents/realtime'
import { executeSupervisorAgent } from './agentIntegration';

export const cardBenefitAgent = new RealtimeAgent({
  name: 'cardBenefitAgent',
  voice: 'sage',
  instructions: `
당신은 카드 혜택 전문 상담사입니다.

절대 규칙:
- 카드 이름이 언급되면 즉시 getCardBenefitResponse 도구 호출
- 카드 관련 질문은 모두 getCardBenefitResponse 도구 사용  
- 도구 없이 카드 정보 제공 금지
- 추측하거나 일반적인 답변 금지

허용된 직접 답변:
- 기본 인사만

필수 도구 사용:
- "더모아카드" → getCardBenefitResponse 호출
- "포인트플러스카드" → getCardBenefitResponse 호출
- "카드 목록" → getCardBenefitResponse 호출
- 모든 카드 관련 질문 → getCardBenefitResponse 호출

예시:
사용자: "더모아카드 알려줘"
즉시 실행: getCardBenefitResponse(relevantContext="더모아카드 정보 요청")
`,
  tools: [
    tool({
      name: 'getCardBenefitResponse',
      description: '카드 혜택 정보를 조회합니다. 카드 관련 모든 질문에 사용해야 합니다.',
      parameters: {
        type: 'object',
        properties: {
          relevantContext: {
            type: 'string',
            description: '사용자의 카드 관련 요청 내용 (예: "더모아카드 정보 요청", "카드 목록 조회")',
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

          // 수퍼바이저 에이전트 호출
          const supervisorResponse = await executeSupervisorAgent(
            relevantContext,
            conversationHistory
          );

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