# 카드 검색 상담 에이전트

MCP(Model Context Protocol) 카드 검색 서버를 활용한 실시간 음성 카드 정보 상담 에이전트입니다.

## 🎯 특징

- **실시간 음성 대화**: gpt-4o-realtime-preview 모델로 자연스러운 음성 상호작용
- **MCP 카드 검색**: https://2b0e1a284992.ngrok-free.app의 MCP 카드 검색 서버와 연결하여 실시간 카드 정보 조회
- **LLM 기반 도구 선택**: 사용자 질문을 분석하여 적절한 MCP 도구를 직접 선택
- **2단계 검색 플로우**: 복잡한 검색은 단계별로 처리하여 정확성 향상

## 🏗 구조

### 1. Card Search Agent (Realtime)
- **역할**: 사용자와의 실시간 음성 대화 및 도구 선택 담당
- **모델**: gpt-4o-realtime-mini
- **기능**: 
  - 사용자 질문 분석
  - 적절한 MCP 도구 직접 선택 및 호출
  - 2단계 검색 플로우 관리

### 2. MCP Tools
- **역할**: MCP 서버와의 통신 및 도구 실행
- **기능**:
  - 각 도구별 단일 책임 원칙
  - MCP 서버 연결 관리
  - 응답 데이터 처리

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
   - 연회비 기준으로 카드를 검색
   - max_fee 파라미터로 최대 연회비 설정 가능

5. **get_card_info**
   - 특정 카드의 상세 정보(이름, 혜택)을 URL을 통해 가져옵니다
   - 카드명 기반 검색의 마지막 단계

## 🧠 LLM 기반 도구 선택 로직

### 1. 카드명으로 조회하는 경우 (2단계 플로우)
- **1단계**: `get_all_cards_with_name()` → 전체 카드 목록 조회
- **2단계**: LLM이 카드명 매칭하여 URL 반환 → `get_card_info(url)` → 카드 상세 정보

### 2. 혜택으로 조회하는 경우 (2단계 플로우)
- **1단계**: `get_available_benefit_keywords()` → 혜택 키워드 목록 조회
- **2단계**: LLM이 키워드 매칭하여 적절한 키워드 반환 → `search_cards_by_benefit(keyword)` → 해당 혜택 카드 목록

### 3. 연회비로 조회하는 경우 (1단계 플로우)
- **1단계**: `search_cards_by_annual_fee(max_fee: 금액)` → 연회비 기준 카드 목록

## 🔄 사용 플로우 예시

### 카드명 검색 플로우
```
사용자: "포인트플러스 카드 정보 알려줘"
1단계: get_all_cards_with_name() → 전체 카드 목록
2단계: LLM이 "포인트플러스"와 매칭되는 카드 찾기 → get_card_info(해당_URL) → 카드 상세 정보
```

### 혜택 검색 플로우
```
사용자: "지하철 할인 카드 찾아줘"
1단계: get_available_benefit_keywords() → 혜택 키워드 목록
2단계: LLM이 "지하철"과 매칭되는 키워드 찾기 → search_cards_by_benefit("지하철") → 해당 혜택 카드 목록
```

### 연회비 검색 플로우
```
사용자: "연회비 5만원 이하 카드 찾아줘"
1단계: search_cards_by_annual_fee(max_fee: 50000) → 연회비 기준 카드 목록
```

## 🚀 시작하기

1. MCP 서버 실행 (https://2b0e1a284992.ngrok-free.app)
2. 애플리케이션 시작
3. 음성으로 카드 관련 질문하기

모든 도구는 https://2b0e1a284992.ngrok-free.app/mcp/ 엔드포인트에서 사용할 수 있습니다!

## 🎯 개선사항

- **LLM 기반 도구 선택**: 지능적인 질문 분석 및 도구 선택
- **2단계 검색 플로우**: 복잡한 검색을 단계별로 처리하여 정확성 향상
- **단일 책임 원칙**: 각 도구가 명확한 역할을 담당
- **확장성**: 새로운 검색 조건이나 카드 타입 추가가 용이