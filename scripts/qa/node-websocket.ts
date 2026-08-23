import { WebSocket as WsWebSocket } from 'ws';

export type QaWebSocket = Pick<WsWebSocket, 'addEventListener' | 'send' | 'close'>;

type QaWebSocketConstructor = new (url: string) => QaWebSocket;

const QaWebSocketConstructor: QaWebSocketConstructor =
  typeof globalThis.WebSocket === 'function' ? globalThis.WebSocket : WsWebSocket;

export function openQaWebSocket(url: string): QaWebSocket {
  return new QaWebSocketConstructor(url);
}

export function describeQaWebSocketRuntime(): {
  readonly globalType: string;
  readonly constructorName: string;
} {
  return {
    globalType: typeof globalThis.WebSocket,
    constructorName: QaWebSocketConstructor.name,
  };
}
