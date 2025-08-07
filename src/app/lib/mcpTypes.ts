// MCP (Model Context Protocol) 타입 정의 - JSON-RPC 2.0 기반

export interface MCPServerConfig {
  name: string;
  url: string;
  enabled: boolean;
  sessionId?: string;
}

export interface MCPJsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  id: number | string;
  params?: Record<string, any>;
}

export interface MCPJsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

export interface MCPToolCallResponse {
  success: boolean;
  content?: Array<{
    type: string;
    text?: string;
  }>;
  data?: any;
  error?: string;
}

// 카드 관련 도구 타입들
export interface CardTools {
  get_all_cards_with_name: {
    parameters: Record<string, never>; // 매개변수 없음
    response: {
      cards: Array<{ id: string; name: string; }>;
    };
  };
  get_available_benefit_keywords: {
    parameters: Record<string, never>; // 매개변수 없음
    response: {
      keywords: string[];
    };
  };
  search_cards_by_benefit: {
    parameters: {
      benefit_keyword: string;
    };
    response: {
      cards: Array<{ id: string; name: string; benefits: string[]; }>;
    };
  };
  search_cards_by_annual_fee: {
    parameters: {
      min_fee?: number;
      max_fee?: number;
    };
    response: {
      cards: Array<{ id: string; name: string; annual_fee: number; }>;
    };
  };
  get_card_info: {
    parameters: {
      card_id: string;
    };
    response: {
      card: {
        id: string;
        name: string;
        annual_fee: number;
        benefits: string[];
        details: string;
      };
    };
  };
}

// 이벤트 관련 도구 타입들
export interface EventTools {
  get_event_data: {
    parameters: Record<string, never>; // 매개변수 없음
    response: {
      events: Array<{
        id: string;
        title: string;
        description: string;
        start_date: string;
        end_date: string;
        status: 'active' | 'upcoming' | 'ended';
      }>;
    };
  };
}

export type AllMCPTools = CardTools & EventTools;
export type MCPToolName = keyof AllMCPTools;

export interface MCPClientConfig {
  baseUrl: string;
  sessionId: string;
  timeout: number;
  retryAttempts: number;
  headers?: Record<string, string>;
}