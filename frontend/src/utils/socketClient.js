import { io } from 'socket.io-client';

let socket = null;
let lastToken = null;

export function initSocket(token) {
  // If an existing socket has a different token, reset it to avoid auth issues
  if (socket && lastToken !== token) {
    try { socket.disconnect(); } catch {}
    socket = null;
  }
  if (socket) return socket;
  socket = io(import.meta.env.VITE_API_WS_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api',''), {
    auth: { token },
    transports: ['websocket'],
  });
  lastToken = token;
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
  lastToken = null;
}

export default { initSocket, getSocket, closeSocket };
