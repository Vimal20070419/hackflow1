import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const host = window.location.hostname;
    socket = io(`http://${host}:5000`, {
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
