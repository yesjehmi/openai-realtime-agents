# 카드 검색 상담 에이전트

MCP(Model Context Protocol) 카드 검색 서버를 활용한 실시간 음성 카드 정보 상담 에이전트입니다.

## 🎯 특징

- **실시간 음성 대화**: gpt-4o-realtime-preview 모델로 자연스러운 음성 상호작용
- **MCP 카드 검색**: localhost:8000의 MCP 카드 검색 서버와 연결하여 실시간 카드 정보 조회
- **지능형 질문 분석**: 사용자 질문 유형을 자동 분석하여 적절한 검색 방법 선택
- **Chat-Supervisor 패턴**: 빠른 응답과 정확한 정보 제공을 위한 이중 에이전트 구조

## 🏗 구조

### 1. Card Search Agent (Realtime)
- **역할**: 사용자와의 실시간 음성 대화 담당
- **모델**: gpt-4o-realtime-mini
- **기능**: 
  - 기본 인사 및 대화
  - 모든 카드 관련 질문을 자동으로 MCP 서버로 전달
  - 질문 유형 자동 분석

### 2. MCP Card Search Service
- **역할**: 질문 유형별 적절한 MCP 도구 선택 및 실행
- **기능**:
  - 카드명 기반 검색 처리
  - 혜택 기반 검색 처리
  - 연회비 기반 검색 처리

## 🔧 MCP 카드 검색 서버 연동

### 지원하는 MCP 도구들:

1. **get_all_cards_with_name**
   - 모든 카드의 이름(name), URL, idx를 가져옵니다
   - 카드명으로 조회할 때 첫 번째 단계로 사용

2. **get_available_benefit_keywords**
   - 사용 가능한 모든 혜택 키워드 목록을 반환합니다
   - 혜택으로 조회할 때 첫 번째 단계로 사용

3. **search_cards_by_benefit**
   - 혜택 키워드를 기반으로 카드 검색
   - get_available_benefit_keywords로 확인한 키워드를 사용

4. **search_cards_by_annual_fee**
   - 연회비 기준으로 카드 검색
   - max_fee 파라미터로 최대 연회비 설정 가능

5. **get_card_info**
   - 특정 카드의 상세 정보(이름, 혜택)을 URL을 통해 가져옵니다
   - 카드명 기반 검색의 마지막 단계

## 🧠 질문 유형별 처리 로직

### 1. 카드명으로 조회하는 경우
- **플로우**: get_all_cards_with_name → LLM이 매칭 → get_card_info
- **예시**: "포인트플러스 카드 정보 알려줘"
- **처리**: 
  1. 전체 카드 목록 조회
  2. 사용자 질문과 매칭되는 카드 찾기
  3. 해당 카드의 URL로 상세 정보 조회

### 2. 혜택으로 조회하는 경우
- **플로우**: get_available_benefit_keywords → LLM이 매칭 → search_cards_by_benefit
- **예시**: "지하철 할인 카드 찾아줘"
- **처리**:
  1. 사용 가능한 혜택 키워드 조회
  2. 사용자 질문과 매칭되는 키워드 찾기
  3. 해당 키워드로 카드 검색

### 3. 연회비로 조회하는 경우
- **플로우**: search_cards_by_annual_fee
- **예시**: "연회비 5만원 이하 카드 찾아줘"
- **처리**:
  1. 연회비 기준으로 카드 검색
  2. 해당 조건의 카드 목록 반환

## 🔄 사용 플로우 예시

### 카드명 검색 플로우
```
사용자: "포인트플러스 카드 정보 알려줘"
1단계: get_all_cards_with_name() → 전체 카드 목록
2단계: LLM이 "포인트플러스"와 매칭되는 카드 찾기
3단계: get_card_info(url) → 해당 카드 상세 정보
```

### 혜택 검색 플로우
```
사용자: "지하철 할인 카드 찾아줘"
1단계: get_available_benefit_keywords() → 혜택 키워드 목록
2단계: LLM이 "지하철"과 매칭되는 키워드 찾기
3단계: search_cards_by_benefit("지하철") → 해당 혜택 카드 목록
```

### 연회비 검색 플로우
```
사용자: "연회비 5만원 이하 카드 찾아줘"
1단계: search_cards_by_annual_fee(max_fee: 50000) → 연회비 기준 카드 목록
```

## 🚀 시작하기

1. MCP 서버 실행 (localhost:8000)
2. 애플리케이션 시작
3. 음성으로 카드 관련 질문하기

모든 도구는 http://127.0.0.1:8000/mcp/ 엔드포인트에서 사용할 수 있습니다!