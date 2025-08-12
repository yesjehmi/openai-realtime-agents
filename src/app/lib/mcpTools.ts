/**
 * MCP 도구들을 Realtime SDK 형식으로 변환하는 인터페이스
 * 새로운 클린한 MCP 클라이언트 사용
 */

import { tool } from '@openai/agents/realtime';
import type { FunctionTool } from '@openai/agents/realtime';
import { mcpClient } from './mcpClient';

// 카드 관련 도구들
export const getCardTools = (): FunctionTool[] => {
  return [
    tool({
      name: 'get_all_cards_with_name',
      description: '모든 카드의 이름(name), URL, idx를 가져옵니다. 카드명으로 조회할 때 첫 번째 단계로 사용됩니다.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false,
      },
      execute: async () => {
        return await mcpToolLogic.get_all_cards_with_name({}, [], undefined);
      },
    }),

    tool({
      name: 'get_available_benefit_keywords',
      description: '사용 가능한 모든 혜택 키워드 목록을 반환합니다. 혜택으로 조회할 때 첫 번째 단계로 사용됩니다.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false,
      },
      execute: async () => {
        return await mcpToolLogic.get_available_benefit_keywords({}, [], undefined);
      },
    }),

    tool({
      name: 'search_cards_by_benefit',
      description: '혜택 키워드로 카드를 검색합니다. get_available_benefit_keywords로 확인한 키워드를 사용해야 합니다.',
      parameters: {
        type: 'object',
        properties: {
          benefit_keyword: {
            type: 'string',
            description: '검색할 혜택 키워드 (예: "지하철", "주유", "쇼핑")',
          },
        },
        required: ['benefit_keyword'],
        additionalProperties: false,
      },
      execute: async (args: any) => {
        return await mcpToolLogic.search_cards_by_benefit(args, [], undefined);
      },
    }),

    tool({
      name: 'search_cards_by_annual_fee',
      description: '연회비 기준으로 카드를 검색합니다.',
      parameters: {
        type: 'object',
        properties: {
          max_fee: {
            type: 'number',
            description: '최대 연회비 (원)',
          },
        },
        required: [],
        additionalProperties: false,
      },
      execute: async (args: any) => {
        return await mcpToolLogic.search_cards_by_annual_fee(args, [], undefined);
      },
    }),

    tool({
      name: 'get_card_info',
      description: '특정 카드의 상세 정보(이름, 혜택)을 URL을 통해 가져옵니다.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: '카드 상세 페이지 URL',
          },
        },
        required: ['url'],
        additionalProperties: false,
      },
      execute: async (args: any) => {
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
        additionalProperties: false,
      },
      execute: async () => {
        return await mcpToolLogic.get_event_data({}, [], undefined);
      },
    }),
  ];
};

// MCP 도구 실행 로직
export const mcpToolLogic = {
  get_all_cards_with_name: async (args: any, transcriptLogsFiltered: any[], addTranscriptBreadcrumb?: (title: string, data?: any) => void) => {
    console.log('모든 카드 목록 조회 중...');
    
    addTranscriptBreadcrumb?.('카드 목록 조회 시작');
    
    // MCP 서버 연결 상태 확인
    if (!mcpClient.isServerConnected()) {
      const errorMsg = 'MCP 서버에 연결되어 있지 않습니다. 서버가 실행 중인지 확인해주세요. 현재 MCP 서버가 오프라인 상태입니다.';
      addTranscriptBreadcrumb?.('MCP 서버 연결 오류', { error: errorMsg });
      return errorMsg;
    }
    
    const result = await mcpClient.callCardTool('get_all_cards_with_name', {});
    
    if (!result.success) {
      const errorMsg = `카드 목록 조회 실패: ${result.error}. MCP 서버에서 카드 목록을 가져올 수 없습니다. 잠시 후 다시 시도해주세요.`;
      addTranscriptBreadcrumb?.('카드 목록 조회 실패', { error: result.error });
      return errorMsg;
    }

    const textResponse = mcpClient.extractTextFromResponse(result);
    addTranscriptBreadcrumb?.('카드 목록 조회 완료', { response: textResponse });
    
    // OpenAI Realtime SDK 호환을 위해 실제 카드 목록을 직접 반환
    console.log('✅ LLM에게 전달할 카드 목록:', textResponse);
    return textResponse;
  },

  get_available_benefit_keywords: async (args: any, transcriptLogsFiltered: any[], addTranscriptBreadcrumb?: (title: string, data?: any) => void) => {
    console.log('사용 가능한 혜택 키워드 조회 중...');
    
    addTranscriptBreadcrumb?.('혜택 키워드 조회 시작');
    
    if (!mcpClient.isServerConnected()) {
      const errorMsg = 'MCP 서버에 연결되어 있지 않습니다. 서버 연결 문제로 혜택 키워드를 조회할 수 없습니다.';
      addTranscriptBreadcrumb?.('MCP 서버 연결 오류', { error: errorMsg });
      return errorMsg;
    }
    
    const result = await mcpClient.callCardTool('get_available_benefit_keywords', {});
    
    if (!result.success) {
      const errorMsg = `혜택 키워드 조회 실패: ${result.error}. MCP 서버에서 혜택 키워드를 가져올 수 없습니다.`;
      addTranscriptBreadcrumb?.('혜택 키워드 조회 실패', { error: result.error });
      return errorMsg;
    }

    const textResponse = mcpClient.extractTextFromResponse(result);
    addTranscriptBreadcrumb?.('혜택 키워드 조회 완료', { response: textResponse });
    
    // OpenAI Realtime SDK 호환을 위해 실제 혜택 키워드 목록을 직접 반환
    console.log('✅ LLM에게 전달할 혜택 키워드 목록:', textResponse);
    return textResponse;
  },

  search_cards_by_benefit: async (args: { benefit_keyword: string }, transcriptLogsFiltered: any[], addTranscriptBreadcrumb?: (title: string, data?: any) => void) => {
    console.log(`혜택 키워드 "${args.benefit_keyword}"로 카드 검색 중...`);
    
    addTranscriptBreadcrumb?.('혜택별 카드 검색 시작', { keyword: args.benefit_keyword });
    
    if (!mcpClient.isServerConnected()) {
      const errorMsg = 'MCP 서버에 연결되어 있지 않습니다. 서버 연결 문제로 카드를 검색할 수 없습니다.';
      addTranscriptBreadcrumb?.('MCP 서버 연결 오류', { error: errorMsg });
      return errorMsg;
    }
    
    const result = await mcpClient.callCardTool('search_cards_by_benefit', {
      benefit_keyword: args.benefit_keyword,
    });
    
    if (!result.success) {
      const errorMsg = `카드 검색 실패: ${result.error}. "${args.benefit_keyword}" 혜택으로 카드를 검색할 수 없습니다.`;
      addTranscriptBreadcrumb?.('혜택별 카드 검색 실패', { error: result.error });
      return errorMsg;
    }

    const textResponse = mcpClient.extractTextFromResponse(result);
    addTranscriptBreadcrumb?.('혜택별 카드 검색 완료', { keyword: args.benefit_keyword, response: textResponse });
    
    // OpenAI Realtime SDK 호환을 위해 실제 검색 결과를 직접 반환
    console.log('✅ LLM에게 전달할 혜택별 카드 검색 결과:', textResponse);
    return textResponse;
  },

  search_cards_by_annual_fee: async (args: { max_fee?: number }, transcriptLogsFiltered: any[], addTranscriptBreadcrumb?: (title: string, data?: any) => void) => {
    console.log(`연회비 기준으로 카드 검색 중... (최대: ${args.max_fee || '제한없음'})`);
    
    addTranscriptBreadcrumb?.('연회비별 카드 검색 시작', { max_fee: args.max_fee });
    
    if (!mcpClient.isServerConnected()) {
      const errorMsg = 'MCP 서버에 연결되어 있지 않습니다. 서버 연결 문제로 카드를 검색할 수 없습니다.';
      addTranscriptBreadcrumb?.('MCP 서버 연결 오류', { error: errorMsg });
      return errorMsg;
    }
    
    const result = await mcpClient.callCardTool('search_cards_by_annual_fee', {
      max_fee: args.max_fee,
    });
    
    if (!result.success) {
      const errorMsg = `카드 검색 실패: ${result.error}. 연회비 기준으로 카드를 검색할 수 없습니다.`;
      addTranscriptBreadcrumb?.('연회비별 카드 검색 실패', { error: result.error });
      return errorMsg;
    }

    const textResponse = mcpClient.extractTextFromResponse(result);
    addTranscriptBreadcrumb?.('연회비별 카드 검색 완료', { max_fee: args.max_fee, response: textResponse });
    
    // OpenAI Realtime SDK 호환을 위해 실제 검색 결과를 직접 반환
    console.log('✅ LLM에게 전달할 연회비별 카드 검색 결과:', textResponse);
    return textResponse;
  },

  get_card_info: async (args: { url: string }, transcriptLogsFiltered: any[], addTranscriptBreadcrumb?: (title: string, data?: any) => void) => {
    console.log(`🔍 카드고릴라 URL "${args.url}"의 카드 정보 조회 중...`);
    console.log('🔧 MCP 클라이언트 연결 상태:', mcpClient.isServerConnected());
    console.log('🔧 사용 가능한 도구들:', mcpClient.getAvailableTools().map(t => t.name));
    
    addTranscriptBreadcrumb?.('카드 상세 정보 조회 시작', { url: args.url });
    
    if (!mcpClient.isServerConnected()) {
      console.log('🔄 MCP 서버 연결이 끊어짐. 재연결 시도...');
      try {
        await mcpClient.reconnect();
        if (!mcpClient.isServerConnected()) {
          const errorMsg = 'MCP 서버에 연결되어 있지 않습니다. 서버 연결 문제로 카드 정보를 조회할 수 없습니다.';
          console.error('❌ MCP 서버 연결 오류:', errorMsg);
          addTranscriptBreadcrumb?.('MCP 서버 연결 오류', { error: errorMsg });
          return errorMsg;
        } else {
          console.log('✅ MCP 재연결 성공! 카드 정보 조회를 계속합니다.');
        }
      } catch (error) {
        const errorMsg = 'MCP 서버 재연결에 실패했습니다. 서버 연결 문제로 카드 정보를 조회할 수 없습니다.';
        console.error('❌ MCP 재연결 오류:', error);
        addTranscriptBreadcrumb?.('MCP 서버 연결 오류', { error: errorMsg });
        return errorMsg;
      }
    }
    
    // MCP 서버가 요구하는 올바른 파라미터 형식으로 전송
    const requestParams = {
      url: args.url
    };
    
    console.log('🔧 get_card_info MCP 서버 호출 파라미터:', requestParams);
    
    const result = await mcpClient.callCardTool('get_card_info', requestParams as any);
    
    if (!result.success) {
      const errorMsg = `카드 정보 조회 실패: ${result.error}. URL "${args.url}"의 정보를 조회할 수 없습니다.`;
      addTranscriptBreadcrumb?.('카드 상세 정보 조회 실패', { error: result.error });
      return errorMsg;
    }

    const textResponse = mcpClient.extractTextFromResponse(result);
    addTranscriptBreadcrumb?.('카드 상세 정보 조회 완료', { url: args.url, response: textResponse });

    // OpenAI Realtime SDK 호환을 위해 실제 카드 정보를 직접 반환
    console.log('✅ LLM에게 전달할 카드 상세 정보:', textResponse);
    return textResponse;
  },

  // 이벤트 관련 도구들
  get_event_data: async (args: any, transcriptLogsFiltered: any[], addTranscriptBreadcrumb?: (title: string, data?: any) => void) => {
    console.log('🎉 진행 중인 이벤트 데이터 조회 중...');
    
    addTranscriptBreadcrumb?.('이벤트 데이터 조회 시작');
    
    if (!mcpClient.isServerConnected()) {
      const errorMsg = 'MCP 서버에 연결되어 있지 않습니다. 서버 연결 문제로 이벤트 데이터를 조회할 수 없습니다.';
      console.error('❌ MCP 서버 연결 오류:', errorMsg);
      addTranscriptBreadcrumb?.('MCP 서버 연결 오류', { error: errorMsg });
      return errorMsg; // OpenAI SDK 호환을 위해 문자열 직접 반환
    }
    
    console.log('🔧 get_event_data 도구 호출 시작...');
    const result = await mcpClient.callEventTool('get_event_data', {});
    
    console.log('📥 get_event_data 원시 응답:', {
      success: result.success,
      content: result.content,
      data: result.data,
      error: result.error
    });
    
    if (!result.success) {
      const errorMsg = `이벤트 데이터 조회 실패: ${result.error}. MCP 서버에서 이벤트 데이터를 가져올 수 없습니다.`;
      console.error('❌ get_event_data 실패:', errorMsg);
      addTranscriptBreadcrumb?.('이벤트 데이터 조회 실패', { error: result.error });
      return errorMsg; // OpenAI SDK 호환을 위해 문자열 직접 반환
    }

    const textResponse = mcpClient.extractTextFromResponse(result);
    console.log('📝 추출된 텍스트 응답:', textResponse);
    
    // 원시 데이터도 함께 로그
    if (result.data) {
      console.log('🔍 MCP 서버 원시 데이터:', JSON.stringify(result.data, null, 2));
    }
    
    addTranscriptBreadcrumb?.('이벤트 데이터 조회 완료', { 
      response: textResponse,
      rawData: result.data 
    });

    // OpenAI Realtime SDK 호환을 위해 실제 이벤트 데이터를 직접 반환
    // LLM이 이 데이터를 직접 참조할 수 있도록 함
    console.log('✅ LLM에게 전달할 최종 이벤트 데이터:', textResponse);
    return textResponse;
  },
};

// 모든 MCP 도구들을 하나로 합치는 함수
export const getAllMCPTools = (): FunctionTool[] => {
  return [
    ...getCardTools(),
    ...getEventTools(),
  ];
};

/**
 * MCP 클라이언트 초기화 함수
 * localhost:8000의 MCP 서버에 연결
 */
export const initializeMCPClient = async (): Promise<void> => {
  try {
    if (!mcpClient.isServerConnected()) {
      console.log('🔍 MCP 클라이언트 초기화 시작...');
      await mcpClient.initialize();
      console.log('✅ MCP 클라이언트 초기화 완료!');
      console.log('🔧 연결된 도구들:', mcpClient.getAvailableTools().map(t => t.name));
    } else {
      console.log('ℹ️ MCP 클라이언트는 이미 연결되어 있습니다.');
      console.log('🔧 연결된 도구들:', mcpClient.getAvailableTools().map(t => t.name));
    }
  } catch (error) {
    console.warn('⚠️ MCP 클라이언트 초기화 실패:', error);
    console.log('💡 MCP 서버(localhost:8000)가 실행되지 않았을 수 있습니다. 기본 모드로 작동합니다.');
    // 에러가 발생해도 앱이 중단되지 않도록 처리
  }
};