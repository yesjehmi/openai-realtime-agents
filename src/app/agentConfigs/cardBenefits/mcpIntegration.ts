// OpenAI API는 서버 사이드 API 라우트를 통해 호출

// MCP 서버 연결 함수들
export class MCPCardBenefitService {
  public mcpServerUrl: string; // public으로 변경하여 외부에서 접근 가능

  constructor(mcpServerUrl: string = 'http://localhost:8000') {
    this.mcpServerUrl = mcpServerUrl;
  }

  // MCP 서버에 요청을 보내는 기본 함수 (JSON-RPC 프로토콜 사용)
  private async callMCP(toolName: string, params: any): Promise<any> {
    try {
      const mcpRequest = {
        jsonrpc: "2.0",
        id: Date.now(), // 고유 ID 생성
        method: "tools/call",
        params: {
          name: toolName,
          arguments: params
        }
      };

      const response = await fetch(`${this.mcpServerUrl}/mcp/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        },
        body: JSON.stringify(mcpRequest)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`MCP 서버 응답 오류 (${response.status}):`, errorText);
        throw new Error(`MCP 서버 응답 오류: ${response.status}`);
      }
      
      const result = await response.json();
      
      // JSON-RPC 오류 처리
      if (result.error) {
        console.error('MCP 서버 오류:', result.error);
        throw new Error(`MCP 서버 오류: ${result.error.message}`);
      }
      
      return result.result || result;
    } catch (error) {
      console.error('MCP 서버 연결 오류:', error);
      throw new Error('카드 혜택 서버에 연결할 수 없습니다: ' + (error as Error).message);
    }
  }

  // 모든 카드 목록 가져오기
  async getAllCardListInfo(): Promise<any> {
    return await this.callMCP('GetAllCardListInfo', {});
  }

  // 특정 카드 혜택 정보 조회
  async getCardBenefitInfo(params: {
    card_name: string;
  }): Promise<any> {
    return await this.callMCP('CardBenefitInfo', params);
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
    // 서버 API 라우트를 통해 OpenAI API 호출
    const response = await fetch('/api/card-benefits/supervisor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        relevantContext,
        conversationHistory,
        mcpServerUrl: 'http://localhost:8000'
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