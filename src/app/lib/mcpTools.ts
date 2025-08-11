/**
 * MCP 도구들을 Realtime SDK 형식으로 변환하는 인터페이스
 * 새로운 클린한 MCP 클라이언트 사용
 */

import { tool } from '@openai/agents/realtime';
import type { FunctionTool } from '@openai/agents/realtime';
import { mcpClient } from './mcpClient';

// 질문 유형 분석 타입
interface QueryAnalysis {
  type: 'card_name' | 'benefit' | 'annual_fee' | 'general';
  extractedKeyword?: string;
  extractedFee?: number;
  extractedCardName?: string;
  confidence: number;
}

// 질문 유형 분석 함수
function analyzeQueryType(query: string): QueryAnalysis {
  const queryLower = query.toLowerCase();
  
  // 1. 카드명 기반 질문 확인 (가장 높은 우선순위)
  const cardNamePatterns = [
    /포인트플러스/,
    /메리어트[\s]*본보이[\s]*더베스트/,
    /구독[\s]*좋아요/,
    /베스트[\s]*x/i,
    /포인트[\s]*플랜/,
    /미스터[\s]*라이프/,
    /더[\s]*베스트/,
    /신한카드/,
    /삼성카드/,
    /현대카드/,
    /KB국민카드/,
    /롯데카드/,
    /BC카드/,
    /NH농협카드/
  ];
  
  const foundCardPattern = cardNamePatterns.find(pattern => pattern.test(queryLower));
  
  if (foundCardPattern) {
    const extractedName = query.match(foundCardPattern)?.[0] || '';
    return {
      type: 'card_name',
      extractedCardName: extractedName,
      confidence: 0.95
    };
  }
  
  // 2. 연회비 기반 질문 확인
  const annualFeePattern = /연회비[\s]*(\d+)[\s]*원/;
  const feeMatch = queryLower.match(annualFeePattern);
  
  if (feeMatch || queryLower.includes('연회비')) {
    return {
      type: 'annual_fee',
      extractedFee: feeMatch ? parseInt(feeMatch[1]) : undefined,
      confidence: 0.9
    };
  }
  
  // 3. 혜택 기반 질문 확인
  const benefitKeywords = ['적립', '할인', '무이자', '캐시백', '포인트', '마일리지', '가맹점', '고속버스', '지하철', '커피', '카페', '주유', '마트', '온라인쇼핑', '혜택'];
  const foundBenefitKeyword = benefitKeywords.find(keyword => queryLower.includes(keyword));
  
  if (foundBenefitKeyword) {
    return {
      type: 'benefit',
      extractedKeyword: foundBenefitKeyword,
      confidence: 0.9
    };
  }
  
  // 4. 일반적인 카드 관련 질문
  if (queryLower.includes('카드')) {
    return {
      type: 'card_name',
      extractedCardName: query,
      confidence: 0.5
    };
  }
  
  return {
    type: 'general',
    confidence: 0.3
  };
}

// 카드명 기반 검색 핸들러 (새로운 로직)
async function handleCardNameBasedSearch(cardName: string, addTranscriptBreadcrumb?: (title: string, data?: any) => void) {
  try {
    addTranscriptBreadcrumb?.('카드명 검색 시작', { cardName });
    
    // 1단계: 전체 카드 목록 조회
    const allCardsResult = await mcpClient.callCardTool('get_all_cards_with_name', {});
    
    if (!allCardsResult.success) {
      throw new Error('전체 카드 목록 조회 실패');
    }
    
    addTranscriptBreadcrumb?.('전체 카드 목록 조회 완료');
    
    // 2단계: LLM에게 카드 목록과 사용자 질문을 전달하여 매칭되는 카드 찾기
    // 여기서는 간단한 문자열 매칭으로 대체 (실제로는 LLM이 처리)
    const allCards = mcpClient.extractTextFromResponse(allCardsResult);
    
    // 3단계: 매칭되는 카드의 URL로 상세 정보 조회
    // 실제 구현에서는 LLM이 매칭된 카드의 URL을 반환해야 함
    return {
      success: true,
      content: `카드명 "${cardName}" 검색 결과:\n\n${allCards}\n\n매칭되는 카드의 URL을 제공해주시면 상세 정보를 조회할 수 있습니다.`,
      data: { allCards, searchType: 'card_name', cardName }
    };
    
  } catch (error) {
    console.error('카드명 기반 검색 실패:', error);
    return {
      success: false,
      error: `카드명 검색 실패: ${error}`
    };
  }
}

// 혜택 기반 검색 핸들러 (새로운 로직)
async function handleBenefitBasedSearch(keyword: string, addTranscriptBreadcrumb?: (title: string, data?: any) => void) {
  try {
    addTranscriptBreadcrumb?.('혜택 검색 시작', { keyword });
    
    // 1단계: 사용 가능한 혜택 키워드 조회
    const keywordsResult = await mcpClient.callCardTool('get_available_benefit_keywords', {});
    
    if (!keywordsResult.success) {
      throw new Error('혜택 키워드 조회 실패');
    }
    
    addTranscriptBreadcrumb?.('혜택 키워드 조회 완료');
    
    // 2단계: LLM에게 혜택 키워드 목록과 사용자 질문을 전달하여 매칭되는 키워드 찾기
    const availableKeywords = mcpClient.extractTextFromResponse(keywordsResult);
    
    // 3단계: 매칭되는 키워드로 카드 검색
    // 실제 구현에서는 LLM이 매칭된 키워드를 반환해야 함
    return {
      success: true,
      content: `혜택 "${keyword}" 검색 결과:\n\n사용 가능한 혜택 키워드:\n${availableKeywords}\n\n매칭되는 혜택 키워드를 제공해주시면 해당 혜택의 카드를 검색할 수 있습니다.`,
      data: { availableKeywords, searchType: 'benefit', keyword }
    };
    
  } catch (error) {
    console.error('혜택 기반 검색 실패:', error);
    return {
      success: false,
      error: `혜택 검색 실패: ${error}`
    };
  }
}

// 연회비 기반 검색 핸들러 (새로운 로직)
async function handleAnnualFeeBasedSearch(fee?: number, addTranscriptBreadcrumb?: (title: string, data?: any) => void) {
  try {
    addTranscriptBreadcrumb?.('연회비 검색 시작', { fee });
    
    const params = fee ? { max_fee: fee } : {};
    const result = await mcpClient.callCardTool('search_cards_by_annual_fee', params);
    
    if (!result.success) {
      throw new Error('연회비 기반 카드 검색 실패');
    }
    
    addTranscriptBreadcrumb?.('연회비 검색 완료');
    
    const textResponse = mcpClient.extractTextFromResponse(result);
    return {
      success: true,
      content: textResponse,
      data: { searchType: 'annual_fee', fee }
    };
    
  } catch (error) {
    console.error('연회비 기반 검색 실패:', error);
    return {
      success: false,
      error: `연회비 검색 실패: ${error}`
    };
  }
}

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