# 카드 혜택 상담 에이전트

MCP(Model Context Protocol)를 활용한 실시간 음성 카드 혜택 상담 에이전트입니다.

## 🎯 특징

- **실시간 음성 대화**: gpt-4o-realtime-preview 모델로 자연스러운 음성 상호작용
- **MCP 연결**: localhost:8000의 MCP 서버와 연결하여 실시간 카드 혜택 정보 조회
- **Chat-Supervisor 패턴**: 빠른 응답과 정확한 정보 제공을 위한 이중 에이전트 구조

## 🏗 구조

### 1. Card Benefit Agent (Realtime)
- **역할**: 사용자와의 실시간 음성 대화 담당
- **모델**: gpt-4o-realtime-mini
- **기능**: 
  - 기본 인사 및 대화
  - 사용자 정보 수집
  - 간단한 질문 직접 응답

### 2. Supervisor Agent (Text-based)
- **역할**: 복잡한 카드 혜택 조회 및 분석
- **모델**: gpt-4o
- **기능**:
  - MCP 서버와 연결하여 카드 정보 조회
  - 상세 혜택 분석 및 추천
  - 정확한 답변 생성

## 🔧 MCP 연결 기능

### 지원하는 MCP 도구들:

1. **searchCardBenefits**
   - 카드명, 카드사, 혜택 카테고리로 카드 검색
   - 예: "신한카드", "카페 혜택", "주유 할인" 등

2. **getSpecificBenefit**
   - 특정 카드의 상세 혜택 정보 조회
   - 카드 ID와 선택적 가맹점 정보로 조회

3. **recommendCards**
   - 사용자 소비 패턴 기반 카드 추천
   - 월 사용액, 선호 카테고리 등을 고려

## 🚀 사용 방법

### 1. MCP 서버 준비
```bash
# MCP 서버가 http://localhost:8000에서 실행 중이어야 합니다
# MCP 서버는 다음 엔드포인트를 제공해야 합니다:
# - POST /search-card-benefits
# - POST /get-specific-benefit  
# - POST /recommend-cards
```

### 2. 에이전트 사용
1. 브라우저에서 http://localhost:3000 접속
2. "Scenario" 드롭다운에서 "cardBenefit" 선택
3. 마이크 권한 허용 후 음성으로 대화 시작

### 3. 예시 대화
```
사용자: "안녕하세요"
에이전트: "안녕하세요! 카드 혜택 상담사입니다. 어떤 카드 혜택에 대해 궁금하신가요?"

사용자: "신한카드 Deep Dream 카드 혜택이 궁금해요"
에이전트: "카드 혜택 정보를 조회해보겠습니다."
→ MCP 서버 조회 후 상세 혜택 정보 제공

사용자: "카페에서 할인 받을 수 있는 카드 추천해주세요"
에이전트: "카페 혜택 카드를 찾아보겠습니다."
→ MCP 서버에서 카페 할인 카드들 조회 후 추천
```

## 🔧 설정 및 커스터마이징

### 환경 변수
```bash
OPENAI_API_KEY=your_openai_api_key
```

### MCP 서버 URL 변경
`mcpIntegration.ts`에서 MCP 서버 URL을 변경할 수 있습니다:
```typescript
const mcpService = new MCPCardBenefitService('http://your-mcp-server:port');
```

### 에이전트 톤 및 스타일 수정
`index.ts`의 `instructions` 부분을 수정하여 에이전트의 톤과 대화 스타일을 커스터마이징할 수 있습니다.

## 📝 참고사항

- MCP 서버가 실행 중이지 않으면 에러 메시지가 표시됩니다
- 복잡한 카드 혜택 조회는 약 2-3초의 지연이 있을 수 있습니다
- 음성 인식 품질을 위해 조용한 환경에서 사용하세요

## 🐛 문제 해결

### MCP 연결 오류
- MCP 서버가 localhost:8000에서 실행 중인지 확인
- 방화벽 설정 확인
- 콘솔 로그에서 자세한 오류 메시지 확인

### 음성 인식 문제  
- 마이크 권한이 허용되었는지 확인
- 브라우저 호환성 확인 (Chrome, Edge 권장)
- 네트워크 연결 상태 확인