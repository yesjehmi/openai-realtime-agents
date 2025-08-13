/**
 * MCP 서버 프록시 API 라우트
 * CORS 문제를 해결하기 위해 서버사이드에서 MCP 서버와 통신
 */

import { NextRequest, NextResponse } from 'next/server';

const MCP_SERVER_URL = 'https://2b0e1a284992.ngrok-free.app';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    console.log('🔄 MCP 프록시 요청:', {
      url: `${MCP_SERVER_URL}/mcp/`,
      body: body.substring(0, 200) + (body.length > 200 ? '...' : '')
    });

    // MCP 서버로 요청 전달
    const response = await fetch(`${MCP_SERVER_URL}/mcp/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        // 원본 요청의 세션 ID가 있으면 전달
        ...(request.headers.get('mcp-session-id') && {
          'mcp-session-id': request.headers.get('mcp-session-id')!
        })
      },
      body: body,
    });

    console.log('📥 MCP 서버 응답:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    // 응답 헤더 처리
    const responseHeaders: Record<string, string> = {
      'Content-Type': response.headers.get('content-type') || 'application/json',
    };

    // 세션 ID가 있으면 클라이언트에 전달
    const sessionId = response.headers.get('mcp-session-id');
    if (sessionId) {
      responseHeaders['mcp-session-id'] = sessionId;
    }

    // 응답 본문
    const responseText = await response.text();
    
    console.log('📄 MCP 서버 응답 본문:', {
      length: responseText.length,
      content: responseText.substring(0, 1000) + (responseText.length > 1000 ? '...[truncated]' : ''),
      fullContent: responseText // 전체 내용도 로그
    });
    
    return new NextResponse(responseText, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('❌ MCP 프록시 오류:', error);
    
    return NextResponse.json(
      { 
        error: 'MCP 서버 연결 실패',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'MCP Proxy is running',
    serverUrl: MCP_SERVER_URL 
  });
}