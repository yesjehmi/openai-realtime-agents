// JSON-RPC 2.0 기반 MCP 클라이언트

import { v4 as uuidv4 } from 'uuid';
import {
  MCPClientConfig,
  MCPJsonRpcRequest,
  MCPJsonRpcResponse,
  MCPToolCallResponse,
  MCPTool,
  CardTools,
  EventTools,
} from './mcpTypes';

export class FastMCPClient {
  private config: MCPClientConfig;
  private isConnected: boolean = false;
  private availableTools: MCPTool[] = [];
  private requestIdCounter: number = 1;

  constructor(config: MCPClientConfig) {
    this.config = config;
  }

  // FastMCP 서버에 연결하고 초기화
  async initialize(): Promise<void> {
    try {
      console.log(`FastMCP 서버에 연결 중... (${this.config.baseUrl})`);
      
      // 사용 가능한 도구 목록 조회
      await this.fetchAvailableTools();
      
      this.isConnected = true;
      console.log(`FastMCP 서버에 연결되었습니다. 사용 가능한 도구: ${this.availableTools.length}개`);
      console.log('사용 가능한 도구들:', this.availableTools.map(t => t.name));
      
    } catch (error) {
      console.error('FastMCP 서버 연결 실패:', error);
      this.isConnected = false;
      
      // 기본 도구 목록으로 설정하여 에러 상황에서도 UI가 작동하도록 함
      this.availableTools = [
        { name: 'get_all_cards_with_name', description: '모든 카드 목록 조회', inputSchema: {} },
        { name: 'get_available_benefit_keywords', description: '혜택 키워드 조회', inputSchema: {} },
        { name: 'search_cards_by_benefit', description: '혜택별 카드 검색', inputSchema: {} },
        { name: 'search_cards_by_annual_fee', description: '연회비별 카드 검색', inputSchema: {} },
        { name: 'get_card_info', description: '카드 상세 정보 조회', inputSchema: {} },
        { name: 'get_event_data', description: '이벤트 데이터 조회', inputSchema: {} },
      ];
      console.log('기본 도구 목록으로 설정');
    }
  }

  // 사용 가능한 도구 목록 조회 (JSON-RPC 2.0)
  private async fetchAvailableTools(): Promise<void> {
    const request: MCPJsonRpcRequest = {
      jsonrpc: "2.0",
      method: "tools/list",
      id: this.getNextRequestId(),
    };

    try {
      console.log('도구 목록 조회 중...');
      const response = await this.makeJsonRpcRequest(request);
      
      if (response.error) {
        throw new Error(`도구 목록 조회 실패: ${response.error.message}`);
      }

      this.availableTools = response.result?.tools || [];
      console.log('도구 목록 조회 성공:', this.availableTools);
      
    } catch (error) {
      console.error('도구 목록 조회 실패:', error);
      throw error;
    }
  }

  // JSON-RPC 요청 ID 생성
  private getNextRequestId(): number {
    return this.requestIdCounter++;
  }

  // JSON-RPC 요청 실행 (SSE 응답 처리)
  private async makeJsonRpcRequest(request: MCPJsonRpcRequest): Promise<MCPJsonRpcResponse> {
    const url = `${this.config.baseUrl}/mcp/`;
    
    const options: RequestInit = {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/event-stream',
        'Content-Type': 'application/json',
        'mcp-session-id': generateSessionId(), // 매번 새로운 세션 ID 생성
        ...this.config.headers,
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.config.timeout),
    };

    console.log('JSON-RPC 요청:', { url, request });

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // SSE 응답인지 확인
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/event-stream')) {
        // SSE 응답 처리
        const text = await response.text();
        console.log('SSE 응답:', text);
        
        const data = this.parseSSEResponse(text);
        console.log('파싱된 JSON-RPC 응답:', data);
        return data;
      } else {
        // 일반 JSON 응답 처리
        const data: MCPJsonRpcResponse = await response.json();
        console.log('JSON-RPC 응답:', data);
        return data;
      }
    } catch (error) {
      console.error('JSON-RPC 요청 실패:', error);
      throw error;
    }
  }

  // SSE 응답 파싱
  private parseSSEResponse(sseText: string): MCPJsonRpcResponse {
    const lines = sseText.split('\n');
    let dataLine = '';
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        dataLine = line.substring(6); // 'data: ' 제거
        break;
      }
    }
    
    if (!dataLine) {
      throw new Error('SSE 응답에서 데이터를 찾을 수 없습니다.');
    }
    
    try {
      return JSON.parse(dataLine) as MCPJsonRpcResponse;
    } catch (error) {
      console.error('SSE 데이터 파싱 실패:', dataLine);
      throw new Error(`SSE 데이터 파싱 실패: ${error}`);
    }
  }

  // MCP 도구 호출
  async callTool(
    toolName: string,
    parameters: Record<string, any> = {}
  ): Promise<MCPToolCallResponse> {
    if (!this.isConnected) {
      return {
        success: false,
        error: 'FastMCP 서버에 연결되어 있지 않습니다.',
      };
    }

    const tool = this.availableTools.find(t => t.name === toolName);
    if (!tool) {
      return {
        success: false,
        error: `도구 '${toolName}'을 찾을 수 없습니다. 사용 가능한 도구: ${this.availableTools.map(t => t.name).join(', ')}`,
      };
    }

    const request: MCPJsonRpcRequest = {
      jsonrpc: "2.0",
      method: "tools/call",
      id: this.getNextRequestId(),
      params: {
        name: toolName,
        arguments: parameters,
      },
    };

    try {
      console.log(`MCP 도구 호출: ${toolName}`, parameters);
      const response = await this.makeJsonRpcRequest(request);
      
      if (response.error) {
        return {
          success: false,
          error: response.error.message,
        };
      }

      return {
        success: true,
        content: response.result?.content || [],
        data: response.result,
      };
      
    } catch (error) {
      console.error(`도구 호출 실패 (${toolName}):`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      };
    }
  }

  // 카드 관련 도구들에 대한 타입 안전 래퍼
  async callCardTool<T extends keyof CardTools>(
    toolName: T,
    parameters: CardTools[T]['parameters']
  ): Promise<MCPToolCallResponse> {
    return this.callTool(toolName, parameters);
  }

  // 이벤트 관련 도구들에 대한 타입 안전 래퍼
  async callEventTool<T extends keyof EventTools>(
    toolName: T,
    parameters: EventTools[T]['parameters']
  ): Promise<MCPToolCallResponse> {
    return this.callTool(toolName, parameters);
  }

  // 연결 상태 확인
  isServerConnected(): boolean {
    return this.isConnected;
  }

  // 사용 가능한 도구 목록 반환
  getAvailableTools(): MCPTool[] {
    return [...this.availableTools];
  }

  // 서버 재연결 시도
  async reconnect(): Promise<boolean> {
    try {
      this.isConnected = false;
      await this.initialize();
      return this.isConnected;
    } catch (error) {
      console.error('FastMCP 서버 재연결 실패:', error);
      return false;
    }
  }

  // 연결 해제
  disconnect(): void {
    this.isConnected = false;
    this.availableTools = [];
    console.log('FastMCP 서버 연결이 해제되었습니다.');
  }

  // 응답에서 텍스트 내용 추출 헬퍼
  extractTextFromResponse(response: MCPToolCallResponse): string {
    if (!response.success) {
      return response.error || '응답 처리 중 오류가 발생했습니다.';
    }

    if (!response.content || response.content.length === 0) {
      // content가 없으면 data에서 텍스트 추출 시도
      if (response.data) {
        return JSON.stringify(response.data, null, 2);
      }
      return '응답 내용이 없습니다.';
    }

    // content가 배열인 경우 텍스트 추출
    return response.content
      .filter(item => item.type === 'text' && item.text)
      .map(item => item.text)
      .join('\n') || JSON.stringify(response.content, null, 2);
  }
}



// 세션 ID 생성 함수
function generateSessionId(): string {
  return uuidv4().replace(/-/g, ''); // UUID에서 하이픈 제거
}

// 기본 FastMCP 클라이언트 설정
export const defaultFastMCPConfig: MCPClientConfig = {
  baseUrl: 'https://07fa71deebe2.ngrok-free.app',
  sessionId: 'dynamic', // 실제로는 매 요청마다 generateSessionId() 사용
  timeout: 15000, // 15초
  retryAttempts: 3,
  headers: {
    'User-Agent': 'OpenAI-Realtime-Agents/1.0',
    'ngrok-skip-browser-warning': 'true',
  },
};

// 전역 FastMCP 클라이언트 인스턴스
export const fastMCPClient = new FastMCPClient(defaultFastMCPConfig);