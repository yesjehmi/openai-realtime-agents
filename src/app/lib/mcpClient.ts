/**
 * MCP (Model Context Protocol) 클라이언트
 * localhost:8000의 MCP 서버와 연동하는 클린한 TypeScript 클라이언트
 */

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

export class MCPClient {
  private config: MCPClientConfig;
  private isConnected: boolean = false;
  private availableTools: MCPTool[] = [];
  private requestIdCounter: number = 1;
  private sessionId: string | null = null;

  constructor(config: MCPClientConfig) {
    this.config = config;
  }

  /**
   * MCP 서버에 연결하고 초기화
   * Python 테스트 코드의 성공한 흐름을 따름:
   * 1. initialize 요청으로 세션 ID 획득
   * 2. initialized notification 전송
   * 3. tools/list로 사용 가능한 도구 조회
   */
  async initialize(): Promise<void> {
    try {
      console.log(`🔍 MCP 서버 연결 시작: ${this.config.baseUrl}`);
      
      // 서버 연결 가능성 먼저 체크 (빠른 실패)
      await this.checkServerHealth();
      
      // 1. MCP 프로토콜 초기화
      await this.performMCPInitialization();
      
      // 2. 사용 가능한 도구 목록 조회
      await this.fetchAvailableTools();
      
      this.isConnected = true;
      console.log(`✅ MCP 서버 연결 성공! 도구 ${this.availableTools.length}개 사용 가능`);
      console.log('📋 사용 가능한 도구:', this.availableTools.map(t => t.name));
      
    } catch (error) {
      console.warn('⚠️ MCP 서버 연결 실패:', error instanceof Error ? error.message : error);
      this.isConnected = false;
      this.setFallbackTools();
      
      // 앱이 중단되지 않도록 에러를 던지지 않음
      console.log('🛡️ 기본 모드로 작동합니다.');
    }
  }

  /**
   * 서버 상태 빠른 체크 (API 라우트를 통해)
   */
  private async checkServerHealth(): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃
    
    try {
      // API 라우트 헬스체크
      const response = await fetch(this.config.baseUrl, { 
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      console.log(`🏥 MCP 프록시 헬스체크: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 프록시 상태:', data);
        return; // 정상
      }
      
      throw new Error(`프록시 서버 응답 오류: ${response.status} ${response.statusText}`);
      
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('MCP 프록시 응답 타임아웃 (5초): Next.js 서버가 응답하지 않습니다.');
      }
      
      // 네트워크 에러인 경우
      if (error instanceof Error && (
        error.message.includes('Failed to fetch') || 
        error.message.includes('NetworkError')
      )) {
        throw new Error('MCP 프록시에 연결할 수 없습니다.');
      }
      
      throw error;
    }
  }

  /**
   * MCP 프로토콜에 따른 정확한 초기화 수행
   */
  private async performMCPInitialization(): Promise<void> {
    console.log('📨 MCP 초기화 요청 전송...');
    
    // initialize 요청
    const initRequest: MCPJsonRpcRequest = {
      jsonrpc: "2.0",
      id: this.getNextRequestId(),
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {}
        },
        clientInfo: {
          name: "openai-realtime-agents",
          version: "1.0.0"
        }
      }
    };

    console.log('🔄 Initialize 요청 내용:', initRequest);
    const initResponse = await this.makeHttpRequest(initRequest);
    console.log('📥 Initialize 응답:', initResponse);
    
    // 응답 헤더에서 세션 ID 추출
    if (initResponse.sessionId) {
      this.sessionId = initResponse.sessionId;
      console.log(`🔑 세션 ID 획득: ${this.sessionId}`);
    } else {
      console.warn('⚠️ 세션 ID를 받지 못했습니다.');
    }

    // initialized notification 전송 (MCP 프로토콜 필수)
    if (this.sessionId) {
      console.log('📨 초기화 완료 알림 전송...');
      await this.sendInitializedNotification();
      console.log('✅ 초기화 완료 알림 전송됨');
    } else {
      console.warn('⚠️ 세션 ID가 없어서 초기화 완료 알림을 전송하지 않습니다.');
    }
  }

  /**
   * MCP 프로토콜의 initialized notification 전송
   */
  private async sendInitializedNotification(): Promise<void> {
    const notificationRequest = {
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {}
    };

    await this.makeHttpRequest(notificationRequest, false);
  }

  /**
   * HTTP 요청을 수행하고 응답을 처리하는 통합 메서드
   */
  private async makeHttpRequest(
    request: MCPJsonRpcRequest | { jsonrpc: string; method: string; params: any },
    expectResponse: boolean = true
  ): Promise<{ data?: MCPJsonRpcResponse; sessionId?: string }> {
    const url = this.config.baseUrl; // API 라우트 직접 사용
    
    const headers: Record<string, string> = {
      'Accept': 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...this.config.headers,
    };

    // 세션 ID가 있으면 헤더에 추가
    if (this.sessionId) {
      headers['mcp-session-id'] = this.sessionId;
    }

    // AbortController를 사용하여 타임아웃 구현 (브라우저 호환성 개선)
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, this.config.timeout);

    const options: RequestInit = {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      signal: abortController.signal,
    };

    console.log('🌐 HTTP 요청:', { 
      url,
      method: request.method, 
      sessionId: this.sessionId,
      timeout: this.config.timeout 
    });

    try {
      const response = await fetch(url, options);
      clearTimeout(timeoutId); // 성공 시 타임아웃 클리어
      
      // 응답에서 세션 ID 추출
      const sessionId = response.headers.get('mcp-session-id');
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      if (!expectResponse) {
        return { sessionId: sessionId || undefined };
      }

      // 응답 파싱
      const contentType = response.headers.get('content-type');
      let data: MCPJsonRpcResponse;

      if (contentType?.includes('text/event-stream')) {
        const text = await response.text();
        data = this.parseSSEResponse(text);
      } else {
        data = await response.json();
      }

      console.log('📥 응답 수신:', { method: request.method, success: !data.error });

      return { data, sessionId: sessionId || undefined };
      
    } catch (error) {
      clearTimeout(timeoutId); // 에러 시에도 타임아웃 클리어
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('❌ HTTP 요청 타임아웃:', this.config.timeout + 'ms');
          throw new Error(`요청 타임아웃 (${this.config.timeout}ms): MCP 서버가 응답하지 않습니다.`);
        }
        
        // 네트워크 연결 오류
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          console.error('❌ 네트워크 연결 실패:', error.message);
          throw new Error('MCP 서버에 연결할 수 없습니다. localhost:8000이 실행 중인지 확인해주세요.');
        }
      }
      
      console.error('❌ HTTP 요청 실패:', error);
      throw error;
    }
  }

  /**
   * 사용 가능한 도구 목록 조회
   */
  private async fetchAvailableTools(): Promise<void> {
    console.log('📋 사용 가능한 도구 목록 요청...');
    
    const request: MCPJsonRpcRequest = {
      jsonrpc: "2.0",
      method: "tools/list",
      params: {},
      id: this.getNextRequestId(),
    };

    try {
      const response = await this.makeHttpRequest(request);
      
      if (response.data?.error) {
        throw new Error(`도구 목록 조회 실패: ${response.data.error.message}`);
      }

      this.availableTools = response.data?.result?.tools || [];
      console.log(`📋 도구 ${this.availableTools.length}개 발견:`, this.availableTools.map(t => t.name));
      
    } catch (error) {
      console.error('❌ 도구 목록 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 에러 상황에서 사용할 기본 도구 목록 설정
   */
  private setFallbackTools(): void {
    this.availableTools = [
      { name: 'get_all_cards_with_name', description: '모든 카드 목록 조회', inputSchema: {} },
      { name: 'get_available_benefit_keywords', description: '혜택 키워드 조회', inputSchema: {} },
      { name: 'search_cards_by_benefit', description: '혜택별 카드 검색', inputSchema: {} },
      { name: 'search_cards_by_annual_fee', description: '연회비별 카드 검색', inputSchema: {} },
      { name: 'get_card_info', description: '카드 상세 정보 조회', inputSchema: {} },
      { name: 'get_event_data', description: '이벤트 데이터 조회', inputSchema: {} },
    ];
    console.log('🛡️ 기본 도구 목록으로 설정');
  }

  /**
   * JSON-RPC 요청 ID 생성
   */
  private getNextRequestId(): number {
    return this.requestIdCounter++;
  }

  /**
   * SSE (Server-Sent Events) 응답 파싱
   */
  private parseSSEResponse(sseText: string): MCPJsonRpcResponse {
    console.log('🔍 SSE 응답 파싱 시작, 전체 길이:', sseText.length);
    
    const lines = sseText.split(/\r?\n/);
    console.log('📄 SSE 라인 수:', lines.length);
    
    // 모든 data 라인을 찾아서 가장 큰(완전한) 응답을 찾습니다
    const dataLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('data: ')) {
        const data = line.substring(6); // 'data: ' 제거
        console.log(`📋 Data 라인 ${i}:`, data.substring(0, 200) + (data.length > 200 ? '...' : ''));
        dataLines.push(data);
      }
    }
    
    if (dataLines.length === 0) {
      throw new Error('SSE 응답에서 데이터를 찾을 수 없습니다.');
    }
    
    console.log(`🔢 총 ${dataLines.length}개의 data 라인 발견`);
    
    // 가장 큰 응답(보통 실제 결과)을 찾습니다
    let largestResponse = '';
    let selectedIndex = -1;
    
    for (let i = 0; i < dataLines.length; i++) {
      const dataLine = dataLines[i];
      try {
        const parsed = JSON.parse(dataLine);
        // result가 있고 content가 있는 응답을 우선 선택
        if (parsed.result && parsed.result.content) {
          console.log(`✅ 유효한 result 응답 발견 (라인 ${i}):`, {
            hasContent: !!parsed.result.content,
            contentLength: parsed.result.content?.length || 0
          });
          largestResponse = dataLine;
          selectedIndex = i;
          break;
        }
        // 그 외에는 길이가 긴 것을 선택
        if (dataLine.length > largestResponse.length) {
          largestResponse = dataLine;
          selectedIndex = i;
        }
      } catch (e) {
        console.warn(`⚠️ Data 라인 ${i} JSON 파싱 실패:`, e);
      }
    }
    
    console.log(`🎯 선택된 응답 (라인 ${selectedIndex}):`, largestResponse.substring(0, 500) + '...');
    
    try {
      const parsed = JSON.parse(largestResponse) as MCPJsonRpcResponse;
      console.log('✅ SSE 파싱 성공:', {
        hasResult: !!parsed.result,
        hasError: !!parsed.error,
        resultKeys: parsed.result ? Object.keys(parsed.result) : [],
      });
      return parsed;
    } catch (error) {
      console.error('❌ 최종 SSE 데이터 파싱 실패:', largestResponse);
      throw new Error(`SSE 데이터 파싱 실패: ${error}`);
    }
  }

  /**
   * MCP 도구 호출
   */
  async callTool(
    toolName: string,
    parameters: Record<string, any> = {}
  ): Promise<MCPToolCallResponse> {
    if (!this.isConnected) {
      return {
        success: false,
        error: 'MCP 서버에 연결되어 있지 않습니다.',
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
      console.log(`🔧 도구 호출: ${toolName}`, parameters);
      const response = await this.makeHttpRequest(request);
      
      if (response.data?.error) {
        return {
          success: false,
          error: response.data.error.message,
        };
      }

      return {
        success: true,
        content: response.data?.result?.content || [],
        data: response.data?.result,
      };
      
    } catch (error) {
      console.error(`❌ 도구 호출 실패 (${toolName}):`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      };
    }
  }

  /**
   * 카드 관련 도구들에 대한 타입 안전 래퍼
   */
  async callCardTool<T extends keyof CardTools>(
    toolName: T,
    parameters: CardTools[T]['parameters']
  ): Promise<MCPToolCallResponse> {
    return this.callTool(toolName, parameters);
  }

  /**
   * 이벤트 관련 도구들에 대한 타입 안전 래퍼
   */
  async callEventTool<T extends keyof EventTools>(
    toolName: T,
    parameters: EventTools[T]['parameters']
  ): Promise<MCPToolCallResponse> {
    return this.callTool(toolName, parameters);
  }

  /**
   * 연결 상태 확인
   */
  isServerConnected(): boolean {
    return this.isConnected;
  }

  /**
   * 연결 테스트 (도구 목록 조회로 서버 상태 확인)
   */
  async testConnection(): Promise<{ success: boolean; message: string; tools?: string[] }> {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }
      
      if (this.isConnected && this.availableTools.length > 0) {
        return {
          success: true,
          message: `✅ MCP 서버 연결 성공 (${this.config.baseUrl})`,
          tools: this.availableTools.map(t => t.name)
        };
      } else {
        return {
          success: false,
          message: '⚠️ 서버에 연결되었지만 사용 가능한 도구가 없습니다.'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `❌ 연결 테스트 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      };
    }
  }

  /**
   * 사용 가능한 도구 목록 반환
   */
  getAvailableTools(): MCPTool[] {
    return [...this.availableTools];
  }

  /**
   * 서버 재연결 시도
   */
  async reconnect(): Promise<boolean> {
    try {
      this.isConnected = false;
      this.sessionId = null; // 재연결 시 세션 ID 리셋
      await this.initialize();
      return this.isConnected;
    } catch (error) {
      console.error('❌ MCP 서버 재연결 실패:', error);
      return false;
    }
  }

  /**
   * 연결 해제
   */
  disconnect(): void {
    this.isConnected = false;
    this.availableTools = [];
    this.sessionId = null;
    console.log('🔌 MCP 서버 연결이 해제되었습니다.');
  }

  /**
   * 응답에서 텍스트 내용 추출 헬퍼
   */
  extractTextFromResponse(response: MCPToolCallResponse): string {
    console.log('🔍 응답 텍스트 추출 시작:', {
      success: response.success,
      hasContent: !!response.content,
      contentLength: response.content?.length || 0,
      hasData: !!response.data,
      error: response.error
    });

    if (!response.success) {
      console.log('❌ 응답 실패로 에러 메시지 반환');
      return response.error || '응답 처리 중 오류가 발생했습니다.';
    }

    if (!response.content || response.content.length === 0) {
      console.log('📄 content가 없음, data에서 텍스트 추출 시도');
      // content가 없으면 data에서 텍스트 추출 시도
      if (response.data) {
        console.log('📊 data 내용:', response.data);
        const jsonString = JSON.stringify(response.data, null, 2);
        console.log('🔤 JSON으로 변환된 data:', jsonString);
        return jsonString;
      }
      console.log('⚠️ content와 data 모두 없음');
      return '응답 내용이 없습니다.';
    }

    console.log('📋 content 배열에서 텍스트 추출:', response.content);
    
    // content가 배열인 경우 텍스트 추출
    const textItems = response.content.filter(item => item.type === 'text' && item.text);
    console.log('✅ 텍스트 아이템들:', textItems);
    
    let extractedText = textItems.map(item => item.text).join('\n');
    
    if (extractedText) {
      console.log('📝 원본 추출된 텍스트 (처음 500자):', extractedText.substring(0, 500));
      
      // JSON 문자열인지 확인하고 파싱 시도
      try {
        // 이스케이프된 JSON 문자열인 경우 파싱
        if (extractedText.startsWith('[') || extractedText.startsWith('{')) {
          const parsed = JSON.parse(extractedText);
          console.log('🎯 JSON 파싱 성공:', parsed);
          
          // 이벤트 배열인 경우 가독성 있게 포맷팅
          if (Array.isArray(parsed)) {
            const formattedEvents = parsed.map((event: any, index: number) => {
              if (event.mobWbEvtNm) {
                return `${index + 1}. ${event.mobWbEvtNm} (${event.mobWbEvtStd} ~ ${event.mobWbEvtEdd})`;
              }
              return `${index + 1}. ${JSON.stringify(event)}`;
            }).join('\n');
            
            console.log('🎉 포맷팅된 이벤트 목록:', formattedEvents);
            return `현재 진행 중인 이벤트 목록:\n\n${formattedEvents}`;
          } else {
            return JSON.stringify(parsed, null, 2);
          }
        }
      } catch (parseError) {
        console.log('⚠️ JSON 파싱 실패, 원본 텍스트 사용:', parseError);
      }
      
      console.log('📝 최종 추출된 텍스트:', extractedText);
      return extractedText;
    } else {
      console.log('🔄 텍스트 추출 실패, content를 JSON으로 변환');
      const fallbackJson = JSON.stringify(response.content, null, 2);
      console.log('📄 fallback JSON:', fallbackJson);
      return fallbackJson;
    }
  }
}

/**
 * 기본 MCP 클라이언트 설정
 * CORS 문제 해결을 위해 Next.js API 라우트를 통해 프록시 사용
 */
export const defaultMCPConfig: MCPClientConfig = {
  baseUrl: '/api/mcp', // Next.js API 라우트 사용
  sessionId: '', // 동적으로 생성됨
  timeout: 15000, // 15초
  retryAttempts: 3,
  headers: {
    'User-Agent': 'OpenAI-Realtime-Agents/1.0',
  },
};

/**
 * 전역 MCP 클라이언트 인스턴스
 */
export const mcpClient = new MCPClient(defaultMCPConfig);

// 이전 버전과의 호환성을 위한 alias
export const fastMCPClient = mcpClient;