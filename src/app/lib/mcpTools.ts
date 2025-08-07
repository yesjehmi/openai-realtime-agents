// MCP 도구들을 Realtime SDK 형식으로 변환하는 인터페이스

import { tool } from '@openai/agents/realtime';
import type { FunctionTool } from '@openai/agents/realtime';
import { fastMCPClient } from './mcpClient';

// 카드 관련 도구들
export const getCardTools = (): FunctionTool[] => {
  return [
    tool({
      name: 'get_all_cards_with_name',
      description: '모든 카드 목록과 이름을 조회합니다.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
      execute: async () => {
        return await mcpToolLogic.get_all_cards_with_name({}, [], undefined);
      },
    }),

    tool({
      name: 'get_available_benefit_keywords',
      description: '사용 가능한 혜택 키워드 목록을 조회합니다.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
      execute: async () => {
        return await mcpToolLogic.get_available_benefit_keywords({}, [], undefined);
      },
    }),

    tool({
      name: 'search_cards_by_benefit',
      description: '특정 혜택 키워드로 카드를 검색합니다.',
      parameters: {
        type: 'object',
        properties: {
          benefit_keyword: {
            type: 'string',
            description: '검색할 혜택 키워드 (예: "적립", "할인", "무료", "캐시백")',
          },
        },
        required: ['benefit_keyword'],
      },
      execute: async (args: { benefit_keyword: string }) => {
        return await mcpToolLogic.search_cards_by_benefit(args, [], undefined);
      },
    }),

    tool({
      name: 'search_cards_by_annual_fee',
      description: '연회비 기준으로 카드를 검색합니다.',
      parameters: {
        type: 'object',
        properties: {
          min_fee: {
            type: 'number',
            description: '최소 연회비 (원). 지정하지 않으면 제한 없음',
          },
          max_fee: {
            type: 'number',
            description: '최대 연회비 (원). 지정하지 않으면 제한 없음',
          },
        },
        required: [],
      },
      execute: async (args: { min_fee?: number; max_fee?: number }) => {
        return await mcpToolLogic.search_cards_by_annual_fee(args, [], undefined);
      },
    }),

    tool({
      name: 'get_card_info',
      description: '특정 카드의 상세 정보를 조회합니다.',
      parameters: {
        type: 'object',
        properties: {
          card_id: {
            type: 'string',
            description: '조회할 카드의 ID',
          },
        },
        required: ['card_id'],
      },
      execute: async (args: { card_id: string }) => {
        return await mcpToolLogic.get_card_info(args, [], undefined);
      },
    }),
  ];
};

// 이벤트 관련 도구들
export const getEventTools = (): FunctionTool[] => {
  return [
    tool({
      name: 'get_event_data',
      description: '현재 진행 중인 이벤트 데이터를 조회합니다.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
      execute: async () => {
        return await mcpToolLogic.get_event_data({}, [], undefined);
      },
    }),
  ];
};

// MCP 도구 실행 로직
export const mcpToolLogic = {
  // 카드 관련 도구들
  get_all_cards_with_name: async (args: any, transcriptLogsFiltered: any[], addTranscriptBreadcrumb?: (title: string, data?: any) => void) => {
    console.log('모든 카드 목록 조회 중...');
    
    addTranscriptBreadcrumb?.('카드 목록 조회 시작');
    
    // MCP 서버 연결 상태 확인
    if (!fastMCPClient.isServerConnected()) {
      const errorMsg = 'MCP 서버에 연결되어 있지 않습니다. 서버가 실행 중인지 확인해주세요.';
      addTranscriptBreadcrumb?.('MCP 서버 연결 오류', { error: errorMsg });
      return {
        message: errorMsg,
        data: '현재 MCP 서버가 오프라인 상태입니다. 서버를 시작하거나 관리자에게 문의해주세요.',
        serverStatus: 'disconnected'
      };
    }
    
    const result = await fastMCPClient.callCardTool('get_all_cards_with_name', {});
    
    if (!result.success) {
      const errorMsg = `카드 목록 조회 실패: ${result.error}`;
      addTranscriptBreadcrumb?.('카드 목록 조회 실패', { error: result.error });
      return {
        message: errorMsg,
        data: 'MCP 서버에서 카드 목록을 가져올 수 없습니다. 잠시 후 다시 시도해주세요.',
        serverStatus: 'error'
      };
    }

    const textResponse = fastMCPClient.extractTextFromResponse(result);
    addTranscriptBreadcrumb?.('카드 목록 조회 완료', { response: textResponse });
    
    return {
      message: '카드 목록을 성공적으로 조회했습니다.',
      data: textResponse,
      serverStatus: 'connected'
    };
  },

  get_available_benefit_keywords: async (args: any, transcriptLogsFiltered: any[], addTranscriptBreadcrumb?: (title: string, data?: any) => void) => {
    console.log('사용 가능한 혜택 키워드 조회 중...');
    
    addTranscriptBreadcrumb?.('혜택 키워드 조회 시작');
    
    if (!fastMCPClient.isServerConnected()) {
      const errorMsg = 'MCP 서버에 연결되어 있지 않습니다.';
      addTranscriptBreadcrumb?.('MCP 서버 연결 오류', { error: errorMsg });
      return {
        message: errorMsg,
        data: '서버 연결 문제로 혜택 키워드를 조회할 수 없습니다.',
        serverStatus: 'disconnected'
      };
    }
    
    const result = await fastMCPClient.callCardTool('get_available_benefit_keywords', {});
    
    if (!result.success) {
      const errorMsg = `혜택 키워드 조회 실패: ${result.error}`;
      addTranscriptBreadcrumb?.('혜택 키워드 조회 실패', { error: result.error });
      return {
        message: errorMsg,
        data: 'MCP 서버에서 혜택 키워드를 가져올 수 없습니다.',
        serverStatus: 'error'
      };
    }

    const textResponse = fastMCPClient.extractTextFromResponse(result);
    addTranscriptBreadcrumb?.('혜택 키워드 조회 완료', { response: textResponse });
    
    return {
      message: '사용 가능한 혜택 키워드를 성공적으로 조회했습니다.',
      data: textResponse,
      serverStatus: 'connected'
    };
  },

  search_cards_by_benefit: async (args: { benefit_keyword: string }, transcriptLogsFiltered: any[], addTranscriptBreadcrumb?: (title: string, data?: any) => void) => {
    console.log(`혜택 키워드 "${args.benefit_keyword}"로 카드 검색 중...`);
    
    addTranscriptBreadcrumb?.('혜택별 카드 검색 시작', { keyword: args.benefit_keyword });
    
    if (!fastMCPClient.isServerConnected()) {
      const errorMsg = 'MCP 서버에 연결되어 있지 않습니다.';
      addTranscriptBreadcrumb?.('MCP 서버 연결 오류', { error: errorMsg });
      return {
        message: errorMsg,
        data: '서버 연결 문제로 카드를 검색할 수 없습니다.',
        serverStatus: 'disconnected'
      };
    }
    
    const result = await fastMCPClient.callCardTool('search_cards_by_benefit', {
      benefit_keyword: args.benefit_keyword,
    });
    
    if (!result.success) {
      const errorMsg = `카드 검색 실패: ${result.error}`;
      addTranscriptBreadcrumb?.('혜택별 카드 검색 실패', { error: result.error });
      return {
        message: errorMsg,
        data: `"${args.benefit_keyword}" 혜택으로 카드를 검색할 수 없습니다.`,
        serverStatus: 'error'
      };
    }

    const textResponse = fastMCPClient.extractTextFromResponse(result);
    addTranscriptBreadcrumb?.('혜택별 카드 검색 완료', { keyword: args.benefit_keyword, response: textResponse });
    
    return {
      message: `"${args.benefit_keyword}" 혜택으로 카드 검색을 완료했습니다.`,
      data: textResponse,
      serverStatus: 'connected'
    };
  },

  search_cards_by_annual_fee: async (args: { min_fee?: number; max_fee?: number }, transcriptLogsFiltered: any[], addTranscriptBreadcrumb?: (title: string, data?: any) => void) => {
    console.log(`연회비 기준으로 카드 검색 중... (최소: ${args.min_fee || '제한없음'}, 최대: ${args.max_fee || '제한없음'})`);
    
    addTranscriptBreadcrumb?.('연회비별 카드 검색 시작', { min_fee: args.min_fee, max_fee: args.max_fee });
    
    if (!fastMCPClient.isServerConnected()) {
      const errorMsg = 'MCP 서버에 연결되어 있지 않습니다.';
      addTranscriptBreadcrumb?.('MCP 서버 연결 오류', { error: errorMsg });
      return {
        message: errorMsg,
        data: '서버 연결 문제로 카드를 검색할 수 없습니다.',
        serverStatus: 'disconnected'
      };
    }
    
    const result = await fastMCPClient.callCardTool('search_cards_by_annual_fee', {
      min_fee: args.min_fee,
      max_fee: args.max_fee,
    });
    
    if (!result.success) {
      const errorMsg = `카드 검색 실패: ${result.error}`;
      addTranscriptBreadcrumb?.('연회비별 카드 검색 실패', { error: result.error });
      return {
        message: errorMsg,
        data: '연회비 기준으로 카드를 검색할 수 없습니다.',
        serverStatus: 'error'
      };
    }

    const textResponse = fastMCPClient.extractTextFromResponse(result);
    addTranscriptBreadcrumb?.('연회비별 카드 검색 완료', { min_fee: args.min_fee, max_fee: args.max_fee, response: textResponse });
    
    const feeRange = args.min_fee || args.max_fee 
      ? `연회비 ${args.min_fee || 0}원 ~ ${args.max_fee || '제한없음'}원 범위의 `
      : '';

    return {
      message: `${feeRange}카드 검색을 완료했습니다.`,
      data: textResponse,
      serverStatus: 'connected'
    };
  },

  get_card_info: async (args: { card_id: string }, transcriptLogsFiltered: any[], addTranscriptBreadcrumb?: (title: string, data?: any) => void) => {
    console.log(`카드 ID "${args.card_id}"의 상세 정보 조회 중...`);
    
    addTranscriptBreadcrumb?.('카드 상세 정보 조회 시작', { card_id: args.card_id });
    
    if (!fastMCPClient.isServerConnected()) {
      const errorMsg = 'MCP 서버에 연결되어 있지 않습니다.';
      addTranscriptBreadcrumb?.('MCP 서버 연결 오류', { error: errorMsg });
      return {
        message: errorMsg,
        data: '서버 연결 문제로 카드 정보를 조회할 수 없습니다.',
        serverStatus: 'disconnected'
      };
    }
    
    const result = await fastMCPClient.callCardTool('get_card_info', {
      card_id: args.card_id,
    });
    
    if (!result.success) {
      const errorMsg = `카드 정보 조회 실패: ${result.error}`;
      addTranscriptBreadcrumb?.('카드 상세 정보 조회 실패', { error: result.error });
      return {
        message: errorMsg,
        data: `카드 ID "${args.card_id}"의 정보를 조회할 수 없습니다.`,
        serverStatus: 'error'
      };
    }

    const textResponse = fastMCPClient.extractTextFromResponse(result);
    addTranscriptBreadcrumb?.('카드 상세 정보 조회 완료', { card_id: args.card_id, response: textResponse });

    return {
      message: `카드 ID "${args.card_id}"의 상세 정보를 조회했습니다.`,
      data: textResponse,
      serverStatus: 'connected'
    };
  },

  // 이벤트 관련 도구들
  get_event_data: async (args: any, transcriptLogsFiltered: any[], addTranscriptBreadcrumb?: (title: string, data?: any) => void) => {
    console.log('진행 중인 이벤트 데이터 조회 중...');
    
    addTranscriptBreadcrumb?.('이벤트 데이터 조회 시작');
    
    if (!fastMCPClient.isServerConnected()) {
      const errorMsg = 'MCP 서버에 연결되어 있지 않습니다.';
      addTranscriptBreadcrumb?.('MCP 서버 연결 오류', { error: errorMsg });
      return {
        message: errorMsg,
        data: '서버 연결 문제로 이벤트 데이터를 조회할 수 없습니다.',
        serverStatus: 'disconnected'
      };
    }
    
    const result = await fastMCPClient.callEventTool('get_event_data', {});
    
    if (!result.success) {
      const errorMsg = `이벤트 데이터 조회 실패: ${result.error}`;
      addTranscriptBreadcrumb?.('이벤트 데이터 조회 실패', { error: result.error });
      return {
        message: errorMsg,
        data: 'MCP 서버에서 이벤트 데이터를 가져올 수 없습니다.',
        serverStatus: 'error'
      };
    }

    const textResponse = fastMCPClient.extractTextFromResponse(result);
    addTranscriptBreadcrumb?.('이벤트 데이터 조회 완료', { response: textResponse });

    return {
      message: '현재 진행 중인 이벤트 데이터를 조회했습니다.',
      data: textResponse,
      serverStatus: 'connected'
    };
  },
};

// 모든 MCP 도구들을 하나로 합치는 함수
export const getAllMCPTools = (): FunctionTool[] => {
  return [
    ...getCardTools(),
    ...getEventTools(),
  ];
};

// FastMCP 클라이언트 초기화 함수
export const initializeMCPClient = async (): Promise<void> => {
  try {
    if (!fastMCPClient.isServerConnected()) {
      console.log('FastMCP 클라이언트 초기화를 시작합니다...');
      await fastMCPClient.initialize();
      console.log('FastMCP 클라이언트가 성공적으로 초기화되었습니다.');
    }
  } catch (error) {
    console.warn('FastMCP 클라이언트 초기화 실패:', error);
    console.log('MCP 서버가 실행되지 않았을 수 있습니다. 기본 모드로 작동합니다.');
    // 에러가 발생해도 앱이 중단되지 않도록 처리
  }
};