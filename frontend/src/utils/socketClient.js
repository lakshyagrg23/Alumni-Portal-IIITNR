import { io } from 'socket.io-client';

let socket = null;

export function initSocket(token) {
  if (socket) {
    return socket;
  }
  socket = io(import.meta.env.VITE_API_WS_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api',''), {
    auth: { token },
    transports: ['websocket'],
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function closeSocket() {
  if (!socket) {
    return;
  }
  socket.disconnect();
  socket = null;
}

export default { initSocket, getSocket, closeSocket };
