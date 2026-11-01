import { Server as SocketIOServer } from 'socket.io';

let ioInstance: SocketIOServer | null = null;

export function initSocketIO(httpServer: any): SocketIOServer {
  ioInstance = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH'],
    },
  });
  return ioInstance;
}

export function getIO(): SocketIOServer | null {
  return ioInstance;
}

