import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const envSocket = (import.meta as any).env?.VITE_SOCKET_URL;
    const envApi = (import.meta as any).env?.VITE_API_URL;
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

    const socketUrl =
      envSocket ||
      (envApi
        ? String(envApi).replace(/\/api\/?$/, '')
        : host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')
        ? `http://${host}:5000`
        : window.location.origin);

    socket = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });

    socket.on('connect', () => {
      console.log(`[Socket Client] Connected to server: ${socket?.id}`);
    });

    socket.on('disconnect', (reason) => {
      console.warn(`[Socket Client] Disconnected: ${reason}`);
    });
  }
  return socket;
};
