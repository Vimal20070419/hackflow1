import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      (import.meta.env.VITE_API_URL
        ? String(import.meta.env.VITE_API_URL).replace(/\/api\/?$/, '')
        : `http://${window.location.hostname}:5000`);

    socket = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
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
