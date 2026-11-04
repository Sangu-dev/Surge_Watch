import { Server as SocketIOServer } from 'socket.io';
import { isTrustedOrigin } from './middleware/csrfMiddleware.js';

let ioInstance: SocketIOServer | null = null;

export function initSocketIO(httpServer: any): SocketIOServer {
  ioInstance = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || isTrustedOrigin(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Socket.IO CORS origin denied'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH'],
    },
  });
  return ioInstance;
}

export function getIO(): SocketIOServer | null {
  return ioInstance;
}

