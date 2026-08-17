import { useEffect, useRef } from 'react';
import { getAccessToken, streamingApiBaseUrl } from 'mastodon/initial_state';

export const useChatSocket = (
  conversationId: number | null,
  onMessage: (event: string, payload: unknown) => void,
) => {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!conversationId || !streamingApiBaseUrl) return;
    if (!streamingApiBaseUrl.startsWith('ws')) return;

    const accessToken = getAccessToken();
    if (!accessToken) return;

    const url = `${streamingApiBaseUrl}/api/v1/streaming/?stream=chat&conversation_id=${conversationId}&access_token=${accessToken}`;
    const socket = new WebSocket(url);

    socket.onmessage = (e: MessageEvent<string>) => {
        try {
            const data = JSON.parse(e.data) as { event: string; payload: string };
            if (!data.payload || !data.event) return;

            const payload: unknown = JSON.parse(data.payload);
            onMessageRef.current(data.event, payload);
        } catch {
            // 파싱 실패한 메시지는 무시
        }
    };

    return () => {
      socket.close();
    };
  }, [conversationId]);
};