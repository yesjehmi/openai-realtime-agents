import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// OpenAI 클라이언트 초기화 (서버 사이드)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// MCP 세션 관리
let mcpSessionId: string | null = null;
let mcpInitialized: boolean = false;

// MCP 서버 초기화
async function initializeMCPServer(): Promise<string | null> {
  if (mcpInitialized && mcpSessionId) {
    return mcpSessionId;
  }
  
  try {
    console.log('=== MCP 서버 초기화 시작 ===');
    
    // 1. 초기화 요청
    const initResponse = await fetch('https://7024509b0dc1.ngrok-free.app/chat/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "card-benefit-agent",
            version: "1.0.0"
          }
        }
      })
    });
    
    console.log('초기화 응답 상태:', initResponse.status);
    
    // 세션 ID 추출
    const sessionId = initResponse.headers.get('mcp-session-id');
    const responseText = await initResponse.text();
    console.log('초기화 응답:', responseText);
    
    if (sessionId && initResponse.ok) {
      // 2. initialized 알림 전송 (필요한 경우)
      await fetch('http://localhost:8000/mcp/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'mcp-session-id': sessionId
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized",
          params: {}
        })
      });
      
      mcpSessionId = sessionId;
      mcpInitialized = true;
      console.log('MCP 초기화 완료, 세션 ID:', sessionId);
      return sessionId;
    }
    
    return null;
  } catch (error) {
    console.error('MCP 서버 초기화 실패:', error);
    return null;
  }
}

// MCP 서버 연결 함수 (초기화된 세션 사용)
async function callMCPServer(toolName: string, params: any) {
  try {
    console.log(`=== MCP 서버 호출: ${toolName} ===`, params);
    
    // MCP 서버 초기화 및 세션 ID 가져오기
    const sessionId = await initializeMCPServer();
    
    // JSON-RPC 2.0 요청 생성
    const request = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: toolName,
        arguments: params
      }
    };
    
    console.log('MCP 요청:', request);
    console.log('세션 ID:', sessionId);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    };
    
    if (sessionId) {
      headers['mcp-session-id'] = sessionId;
    }
    
    const response = await fetch('http://localhost:8000/mcp/', {
      method: 'POST',
      headers,
      body: JSON.stringify(request)
    });
    
    console.log(`MCP 응답 상태: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`MCP 서버 오류 (${response.status}):`, errorText);
      throw new Error(`MCP 서버 응답 오류: ${response.status}`);
    }
    
    // SSE 응답 처리
    const responseText = await response.text();
    console.log('MCP 원본 응답:', responseText);
    
    // SSE에서 JSON 추출
    const lines = responseText.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.substring(6);
        try {
          const result = JSON.parse(jsonStr);
          console.log('파싱된 MCP 응답:', result);
          
          if (result.error) {
            console.error('MCP JSON-RPC 오류:', result.error);
            throw new Error(`MCP 오류: ${result.error.message}`);
          }
          
          return result.result;
        } catch (parseError) {
          console.error('JSON 파싱 오류:', parseError, 'JSON:', jsonStr);
        }
      }
    }
    
    throw new Error('유효한 응답을 찾을 수 없습니다');
    
  } catch (error) {
    console.error('MCP 서버 연결 실패:', error);
    
    // 목업 데이터 반환 (fallback)
    return getMockCardData(toolName, params);
  }
}

// 목업 데이터 (MCP 서버 연결 실패시 사용)
function getMockCardData(toolName: string, params: any) {
  console.log(`=== 목업 데이터 사용: ${toolName} ===`, params);
  
  if (toolName === 'GetAllCardListInfo') {
    return {
      cards: [
        {
          name: "더모아카드",
          url: "https://example.com/cards/deomoa"
        },
        {
          name: "포인트플러스카드", 
          url: "https://example.com/cards/pointplus"
        },
        {
          name: "캐시백카드",
          url: "https://example.com/cards/cashback"
        }
      ]
    };
  }
  
  if (toolName === 'CardBenefitInfo') {
    const cardUrl = params.url;
    const mockBenefits = {
      "https://example.com/cards/deomoa": {
        name: "더모아카드",
        url: cardUrl,
        benefits: {
          "연회비": "무료",
          "카페": "5% 적립",
          "편의점": "3% 적립",
          "온라인쇼핑": "2% 적립"
        },
        description: "일상생활에서 더 많이 적립할 수 있는 카드"
      },
      "https://example.com/cards/pointplus": {
        name: "포인트플러스카드",
        url: cardUrl,
        benefits: {
          "연회비": "15,000원",
          "통신요금": "10% 적립",
          "주유소": "3% 적립",
          "마트": "2% 적립"
        },
        description: "포인트 적립에 특화된 프리미엄 카드"
      }
    };
    
    return mockBenefits[cardUrl as keyof typeof mockBenefits] || { 
      error: `해당 URL의 카드 정보를 찾을 수 없습니다: ${cardUrl}` 
    };
  }
  
  return { error: "지원하지 않는 도구입니다." };
}

export async function POST(request: NextRequest) {
  try {
    const { relevantContext, conversationHistory, mcpServerUrl } = await request.json();
    console.log('=== API 호출 시작 ===');
    console.log('relevantContext:', relevantContext);
    console.log('conversationHistory:', conversationHistory.length, '개 메시지');

    const supervisorInstructions = `
당신은 카드 혜택 전문 상담 수퍼바이저입니다. 실시간 채팅 에이전트를 지원하여 정확하고 유용한 카드 혜택 정보를 제공합니다.

# 사용 가능한 도구들:
1. GetAllCardListInfo - 전체 카드 목록을 가져옵니다 (매개변수 없음)
   - 반환: 모든 카드의 이름과 URL 목록
   
2. CardBenefitInfo - 특정 카드의 상세 혜택 정보를 가져옵니다 (url 필수)
   - 매개변수: url (string) - 카드 상세 페이지 URL
   - 반환: 카드 이름, URL, 혜택 정보

# 작업 흐름:
1. 사용자가 특정 카드에 대해 질문하면:
   - 먼저 GetAllCardListInfo로 카드 목록과 URL을 가져옵니다
   - 사용자가 언급한 카드와 일치하는 카드의 URL을 찾습니다
   - 해당 URL로 CardBenefitInfo를 호출하여 상세 정보를 가져옵니다

2. 사용자가 전체 카드 목록을 물어보면:
   - GetAllCardListInfo만 호출합니다

# 지침:
- 음성 대화용이므로 간결하고 자연스럽게 답변하세요
- CardBenefitInfo는 반드시 유효한 카드 URL과 함께 호출해야 합니다
- GetAllCardListInfo에서 얻은 URL만 사용하세요
- 정확한 정보만 제공하고 추측하지 마세요

최근 사용자 요청: ${relevantContext}

대화 내역:
${conversationHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}

**중요: 반드시 도구를 사용해야 합니다. 도구 없이 직접 답변하지 마세요.**

카드와 관련된 모든 요청에 대해:
1. 먼저 GetAllCardListInfo를 호출하세요
2. 특정 카드 정보가 필요하면 CardBenefitInfo를 호출하세요
3. 도구 결과를 바탕으로만 답변하세요

지금 즉시 GetAllCardListInfo 도구를 호출하세요.
`;

    // OpenAI 함수 호출 도구 정의 (MCP 서버 스펙에 맞게 설정)
    const tools = [
      {
        type: "function" as const,
        function: {
          name: "GetAllCardListInfo",
          description: "전체 카드 목록을 가져오는 도구입니다. 파라미터는 필요하지 않습니다.",
          parameters: {
            type: "object",
            properties: {},
            additionalProperties: false
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "CardBenefitInfo",
          description: "특정 카드의 상세 혜택 정보를 가져오는 도구입니다. 카드 URL이 필요합니다.",
          parameters: {
            type: "object",
            properties: {
              url: { 
                type: "string", 
                description: "카드 상세 페이지 URL (GetAllCardListInfo에서 얻은 URL 사용)" 
              }
            },
            required: ["url"],
            additionalProperties: false
          }
        }
      }
    ];

    // OpenAI API 호출
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: supervisorInstructions
        },
        {
          role: "user", 
          content: `사용자 요청을 처리해주세요: ${relevantContext}`
        }
      ],
      tools: tools,
      tool_choice: {
        type: "function",
        function: { name: "GetAllCardListInfo" }
      }
    });

    const message = completion.choices[0].message;

    // 도구 호출이 있는 경우 처리
    if (message.tool_calls && message.tool_calls.length > 0) {
      console.log('=== 도구 호출 감지 ===', message.tool_calls.length, '개');
      const toolResults = [];
      
      for (const toolCall of message.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        
        console.log(`도구 호출: ${functionName}`, functionArgs);
        
        let result;
        switch (functionName) {
          case 'GetAllCardListInfo':
            // 파라미터 없이 호출
            result = await callMCPServer('GetAllCardListInfo', {});
            break;
          case 'CardBenefitInfo':
            // URL 파라미터로 호출
            result = await callMCPServer('CardBenefitInfo', functionArgs);
            break;
          default:
            result = { error: "지원하지 않는 함수입니다." };
        }
        
        console.log(`도구 결과 (${functionName}):`, result);
        
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool" as const,
          content: JSON.stringify(result)
        });
      }

      // 토큰 절약을 위한 간소화 처리 (카드 목록은 유지하되 응답만 최적화)
      let processedResults = toolResults;

      // 도구 호출 결과를 포함한 최종 응답 생성
      const finalCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // 더 저렴하고 빠른 모델 사용
        messages: [
          {
            role: "system",
            content: "카드 혜택 전문가로서 제공된 정보를 바탕으로 간결하게 답변하세요."
          },
          {
            role: "user",
            content: relevantContext
          },
          message, // 도구 호출이 포함된 원본 메시지
          ...processedResults // 도구 결과들
        ],
        max_tokens: 500
      });

      return NextResponse.json({
        message: finalCompletion.choices[0].message.content || "죄송합니다. 응답을 생성할 수 없습니다."
      });
    }

    return NextResponse.json({
      message: message.content || "죄송합니다. 응답을 생성할 수 없습니다."
    });

  } catch (error) {
    console.error('카드 혜택 수퍼바이저 API 오류:', error);
    return NextResponse.json(
      { message: "죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}